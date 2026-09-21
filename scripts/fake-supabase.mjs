/** In-memory stand-in for `@supabase/supabase-js`.
 *
 * Used only by the wipe regression test (`scripts/wipe-test.mjs`), which is
 * bundled with esbuild aliasing `@supabase/supabase-js` to this file. It
 * implements just the query surface the repository touches — enough to prove
 * that local state and "cloud" rows really do agree before and after a wipe.
 */
/** The bundle under test inlines this module, so the test file and the bundle
 * each get their own module record. State therefore lives on `globalThis` and
 * both see exactly the same "cloud". */
const globalStore = globalThis;
if (!globalStore.__fakeSupabase) {
  globalStore.__fakeSupabase = { tables: {}, session: null, listeners: [], networkDelay: 0 };
}
export const __store = globalStore.__fakeSupabase;

export function __resetFakeCloud(sessionUser = null) {
  __store.tables = {};
  __store.session = sessionUser;
  __store.listeners = [];
  __store.networkDelay = 0;
}

/** Row count for a table, optionally filtered to one user. */
export function __count(table, userId) {
  const rows = __store.tables[table] ?? [];
  return userId ? rows.filter((row) => row.user_id === userId || row.id === userId).length : rows.length;
}

let uuidCounter = 0;
const uuid = () => {
  uuidCounter += 1;
  const hex = uuidCounter.toString(16).padStart(12, '0');
  return `00000000-0000-4000-8000-${hex}`;
};

const wait = () => new Promise((resolve) => setTimeout(resolve, __store.networkDelay));

class QueryBuilder {
  constructor(table) {
    this.table = table;
    this.filters = [];
    this.mode = 'select';
    this.payload = null;
    this.upsertConflict = null;
    this.then = (resolve, reject) => this.execute().then(resolve, reject);
  }

  #rows() {
    if (!__store.tables[this.table]) __store.tables[this.table] = [];
    return __store.tables[this.table];
  }

  #matches(row) {
    return this.filters.every(({ column, op, value }) => {
      if (op === 'eq') return row[column] === value;
      if (op === 'in') return value.includes(row[column]);
      return true;
    });
  }

  eq(column, value) { this.filters.push({ column, op: 'eq', value }); return this; }
  in(column, value) { this.filters.push({ column, op: 'in', value }); return this; }
  order() { return this; }
  limit() { return this; }
  select() { if (this.mode === 'insert' || this.mode === 'upsert') this.returning = true; return this; }
  maybeSingle() { this.single = 'maybe'; return this; }
  single() { this.single = 'one'; return this; }

  insert(rows) { this.mode = 'insert'; this.payload = Array.isArray(rows) ? rows : [rows]; return this; }
  upsert(rows, options) { this.mode = 'upsert'; this.payload = Array.isArray(rows) ? rows : [rows]; this.upsertConflict = options?.onConflict ?? null; return this; }
  update(row) { this.mode = 'update'; this.payload = row; return this; }
  delete() { this.mode = 'delete'; return this; }

  async execute() {
    await wait();
    if (!__store.session) return { data: null, error: { message: 'not authenticated (RLS)' } };
    const rows = this.#rows();
    try {
      if (this.mode === 'insert') {
        const inserted = this.payload.map((row) => ({ id: row.id ?? uuid(), ...row }));
        rows.push(...inserted);
        return { data: this.returning ? inserted : null, error: null };
      }
      if (this.mode === 'upsert') {
        const keys = (this.upsertConflict ?? 'id').split(',');
        const out = [];
        for (const row of this.payload) {
          const index = rows.findIndex((existing) => keys.every((key) => existing[key.trim()] === row[key.trim()]));
          const merged = index >= 0 ? { ...rows[index], ...row } : { id: row.id ?? uuid(), ...row };
          if (index >= 0) rows[index] = merged; else rows.push(merged);
          out.push(merged);
        }
        return { data: this.returning ? out : null, error: null };
      }
      if (this.mode === 'update') {
        const matched = rows.filter((row) => this.#matches(row));
        matched.forEach((row, index) => { matched[index] = Object.assign(row, this.payload); });
        return { data: this.returning ? matched : null, error: null };
      }
      if (this.mode === 'delete') {
        const before = rows.length;
        __store.tables[this.table] = rows.filter((row) => !this.#matches(row));
        return { data: null, error: null, count: before - __store.tables[this.table].length };
      }
      const matched = rows.filter((row) => this.#matches(row));
      if (this.single === 'maybe') return { data: matched[0] ?? null, error: null };
      if (this.single === 'one') return { data: matched[0] ?? null, error: matched[0] ? null : { message: 'no rows' } };
      return { data: matched.map((row) => ({ ...row })), error: null };
    } catch (e) {
      return { data: null, error: { message: e.message } };
    }
  }
}

export function createClient() {
  return {
    from: (table) => new QueryBuilder(table),
    auth: {
      async getSession() {
        await wait();
        return { data: { session: __store.session ? { user: __store.session } : null }, error: null };
      },
      async signInWithPassword({ email }) {
        await wait();
        __store.session = { id: 'user-test-1', email };
        __store.listeners.forEach((fn) => fn('SIGNED_IN', { session: { user: __store.session } }));
        return { data: { session: { user: __store.session } }, error: null };
      },
      async signUp({ email }) {
        await wait();
        __store.session = { id: 'user-test-1', email };
        return { data: { session: { user: __store.session } }, error: null };
      },
      async signOut() {
        await wait();
        __store.session = null;
        __store.listeners.forEach((fn) => fn('SIGNED_OUT', { session: null }));
        return { error: null };
      },
      onAuthStateChange(callback) {
        __store.listeners.push(callback);
        return { data: { subscription: { unsubscribe: () => {} } } };
      },
    },
  };
}
