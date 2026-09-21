/**
 * Functional verification of every SQL file in supabase/migrations/
 * against a REAL local Postgres (npm embedded-postgres), emulating Supabase:
 *   - auth.users table + auth.uid() reading request.jwt.claims (like Supabase)
 *   - two test users; asserts RLS isolation and CRUD under user context
 */
import EmbeddedPostgres from 'embedded-postgres';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Client } from 'pg';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const MIGRATIONS_DIR = path.join(ROOT, 'supabase', 'migrations');
const MIGRATIONS = fs.readdirSync(MIGRATIONS_DIR).filter((file) => file.endsWith('.sql')).sort();

const pg = new EmbeddedPostgres({
  databaseDir: '/tmp/pgtest/data',
  user: 'postgres',
  password: 'postgres',
  port: 54329,
  persistent: false,
});

let failed = 0;
const check = (name, cond, extra = '') => {
  console.log(`  ${cond ? '✓' : '✗'} ${name}${extra ? ` — ${extra}` : ''}`);
  if (!cond) failed++;
};

async function main() {
  await pg.initialise();
  await pg.start();
  await pg.createDatabase('mup');

  const admin = new Client({ connectionString: 'postgres://postgres:postgres@localhost:54329/mup' });
  await admin.connect();

  // ---- emulate Supabase auth scaffolding ----
  await admin.query(`create schema if not exists auth;`);
  // Supabase projects always ship these roles — recreate for the local harness:
  await admin.query(`do $$ begin
    if not exists (select from pg_roles where rolname='anon') then create role anon nologin; end if;
    if not exists (select from pg_roles where rolname='authenticated') then create role authenticated nologin; end if;
    if not exists (select from pg_roles where rolname='service_role') then create role service_role nologin; end if;
  end $$;`);
  await admin.query(`create table if not exists auth.users (id uuid primary key default gen_random_uuid());`);
  await admin.query(`
    create or replace function auth.uid() returns uuid language sql stable as $$
      select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid;
    $$;`);

  // seed two users (alice = owner, mallory = attacker)
  const { rows } = await admin.query(`insert into auth.users default values returning id;`);
  await admin.query(`insert into auth.users default values returning id;`);
  const alice = rows[0].id;
  const { rows: r2 } = await admin.query(`select id from auth.users offset 1 limit 1;`);
  const mallory = r2[0].id;

  // ---- run every migration in order ----
  const migrationSql = MIGRATIONS.map((file) => [file, fs.readFileSync(path.join(MIGRATIONS_DIR, file), 'utf8')]);
  const sql = migrationSql.map(([, contents]) => contents).join('\n\n');
  let legacyLectureId = '';
  try {
    for (let index = 0; index < migrationSql.length; index++) {
      if (index === 1) {
        const { rows: legacy } = await admin.query(`
          insert into public.lectures (user_id,title,subject,lecture_no,total_lectures,status)
          values ($1,'Legacy series','Geography',4,8,'in_progress') returning id
        `, [alice]);
        legacyLectureId = legacy[0].id;
      }
      await admin.query(migrationSql[index][1]);
    }
    check(`${MIGRATIONS.length} migrations execute cleanly on real Postgres`, true);
  } catch (e) {
    check('migrations execute cleanly on real Postgres', false, e.message);
    throw e;
  }

  if (legacyLectureId) {
    const { rows: legacy } = await admin.query(`select range_start, range_end, completed_lectures from public.lectures where id=$1`, [legacyLectureId]);
    check('lecture migration preserves legacy progress', legacy[0]?.range_start === 1 && legacy[0]?.range_end === 8 && JSON.stringify(legacy[0]?.completed_lectures) === JSON.stringify([1, 2, 3]));
  }

  // idempotency: run again — must not fail
  try {
    await admin.query(sql);
    check('migrations are re-runnable (idempotent)', true);
  } catch (e) {
    check('migrations are re-runnable (idempotent)', false, e.message);
  }
  const { rows: lectureColumns } = await admin.query(`
    select column_name from information_schema.columns
    where table_schema='public' and table_name='lectures'
      and column_name in ('range_start','range_end','completed_lectures')
  `);
  check('lecture range columns exist', lectureColumns.length === 3);

  const asUser = async (userId, fn) => {
    const c = new Client({ connectionString: 'postgres://postgres:postgres@localhost:54329/mup' });
    await c.connect();
    await c.query(`select set_config('request.jwt.claim.sub', $1, false)`, [userId]);
    await c.query(`select set_config('role', 'authenticated', false)`);
    try { return await fn(c); } finally { await c.end(); }
  };
  const asAnon = async (fn) => {
    const c = new Client({ connectionString: 'postgres://postgres:postgres@localhost:54329/mup' });
    await c.connect();
    await c.query(`select set_config('role', 'anon', false)`);
    try { return await fn(c); } finally { await c.end(); }
  };

  // ---- CRUD as alice ----
  await asUser(alice, async (c) => {
    await c.query(`insert into public.profiles (id) values ($1)`, [alice]);
    const { rows: p } = await c.query(`select * from public.profiles where id = $1`, [alice]);
    check('profiles: user can insert/select own settings row', p.length === 1 && p[0].target_exam_year === 2027 && p[0].optional === 'Geography');

    await c.query(`insert into public.tasks (user_id, name, deadline, priority) values ($1,'Read Laxmikanth Ch.1', current_date, 'high')`, [alice]);
    await c.query(`insert into public.syllabus_progress (user_id, item_id, item_type, status, revision_count, confidence)
                   values ($1,'p:prelims-gs1:s0:history:c0:ancient-india:t0:prehistoric-cultures:st0:paleolithic-age','subtopic','completed',1,2)`, [alice]);
    await c.query(`insert into public.revision_logs (user_id, item_id, item_type, revision_number, confidence) values ($1,'item-x','subtopic',1,2)`, [alice]);
    await c.query(`insert into public.pyqs (user_id, exam, year, question) values ($1,'Prelims',2024,'Which of the following…')`, [alice]);
    await c.query(`insert into public.prelims_tests (user_id, test_name, test_date, score) values ($1,'Vision Mock 1',current_date,126.8)`, [alice]);
    await c.query(`insert into public.mains_tests (user_id, test_name, test_date, marks_obtained) values ($1,'GS2 Sectional',current_date,108)`, [alice]);
    await c.query(`insert into public.focus_sessions (user_id, started_at, duration_minutes) values ($1, now(), 90)`, [alice]);
    const { rows: h } = await c.query(`insert into public.habits (user_id, name) values ($1,'Newspaper') returning id`, [alice]);
    await c.query(`insert into public.habit_completions (user_id, habit_id, date) values ($1,$2,current_date) on conflict do nothing`, [alice, h[0].id]);
    await c.query(`insert into public.lectures (user_id, title, subject, total_lectures) values ($1,'Plate Tectonics L1','Geomorphology',12)`, [alice]);
    await c.query(`insert into public.current_affairs (user_id, date, title) values ($1,current_date,'GIB recovery plan')`, [alice]);
    await c.query(`insert into public.answers (user_id, date, question, strengths, improvements) values ($1,current_date,'Discuss…', '{"Good intro"}', '{"No data"}')`, [alice]);

    const { rows: upd } = await c.query(
      `update public.syllabus_progress set revision_count = 2 where user_id = $1 and item_id like '%paleolithic%' returning revision_count`, [alice]);
    check('all 13 user tables accept inserts; updates work under RLS', upd.length === 1 && upd[0].revision_count === 2);

    const { rows: dup } = await c.query(
      `insert into public.habit_completions (user_id, habit_id, date) values ($1,$2,current_date) on conflict (habit_id, date) do nothing returning id`, [alice, h[0].id]);
    check('habit_completions unique(habit_id, date) constraint holds', dup.length === 0);

    try {
      const rr = await c.query(
        `insert into public.syllabus_progress (user_id, item_id, item_type, revision_count) values ($1,'x','subtopic',9) returning revision_count, item_id`, [alice]);
      check('revision_count check (0..5) enforced', false, `unexpectedly inserted item_id=${rr.rows[0]?.item_id} rc=${rr.rows[0]?.revision_count}`);
    } catch (e) {
      check('revision_count check (0..5) enforced', String(e.message).toLowerCase().includes('revision_count'), e.message.slice(0, 80));
    }
  }).catch((e) => {
    check('user CRUD flow', false, String(e.message).slice(0, 120));
  });

  // ---- RLS isolation: mallory must not see alice's data ----
  await asUser(mallory, async (c) => {
    for (const [tbl, minRows] of [['tasks', 1], ['syllabus_progress', 1], ['revision_logs', 1], ['pyqs', 1], ['prelims_tests', 1], ['mains_tests', 1], ['focus_sessions', 1], ['habits', 1], ['habit_completions', 1], ['lectures', 1], ['current_affairs', 1], ['answers', 1], ['profiles', 0]]) {
      const { rows } = await c.query(`select * from public.${tbl}`);
      const leaked = tbl === 'profiles' ? rows.length > 0 : rows.length >= minRows;
      check(`RLS: ${tbl} invisible to other authenticated user`, !leaked);
    }
    // cross-user write must be rejected
    let blocked = false;
    try { await c.query(`insert into public.tasks (user_id, name, deadline) values ($1, 'evil', current_date)`, [alice]); }
    catch { blocked = true; }
    check('RLS: cannot INSERT rows owned by another user', blocked);
    let blocked2 = false;
    try { await c.query(`update public.tasks set name = 'hacked' where user_id = $1`, [alice]); }
    catch { blocked2 = true; }
    let still = [{ n: 0 }];
    try {
      const cc = new Client({ connectionString: 'postgres://postgres:postgres@localhost:54329/mup' });
      await cc.connect();
      const r = await cc.query(`select count(*)::int as n from public.tasks where name='hacked'`);
      still = r.rows; cc.end();
    } catch {}
    check('RLS: cannot UPDATE another user\u2019s rows', blocked2 || still[0].n === 0);
  }).catch((e) => { check('RLS isolation (mallory)', false, String(e.message).slice(0, 120)); });

  // ---- anon must see nothing ----
  await asAnon(async (c) => {
    for (const tbl of ['tasks', 'syllabus_progress', 'profiles', 'lectures']) {
      try {
        const { rows } = await c.query(`select * from public.${tbl}`);
        check(`RLS: anon sees nothing in ${tbl}`, rows.length === 0);
      } catch (e) {
        // no table grants for anon at all — even stricter than empty RLS result
        check(`RLS: anon sees nothing in ${tbl}`, /permission denied/i.test(String(e.message)));
      }
    }
    let blocked = false;
    try { await c.query(`insert into public.tasks (user_id, name, deadline) values (gen_random_uuid(), 'anon', current_date)`); }
    catch { blocked = true; }
    check('RLS: anon cannot INSERT', blocked);
  }).catch((e) => { check('RLS anon phase', false, String(e.message).slice(0, 120)); });

  await admin.end();
  await pg.stop();
  console.log(failed === 0 ? '\nMIGRATION VERIFICATION PASSED' : `\nMIGRATION VERIFICATION FAILED (${failed})`);
  process.exit(failed ? 1 : 0);
}

main().catch(async (e) => {
  console.error('FATAL:', e.message);
  try { await pg.stop(); } catch {}
  process.exit(1);
});
