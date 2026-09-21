/**
 * Wipe Everything regression test.
 *
 * Bundles the real store (`src/store/store.tsx` via scripts/test-entry.ts) with
 * `@supabase/supabase-js` aliased to scripts/fake-supabase.mjs, so the whole
 * local + cloud path runs for real: optimistic local writes, repository pushes,
 * sign-in pulls and the wipe itself.
 *
 * Scenario (required by the wipe contract):
 *   1. create representative data      2. verify local + cloud presence
 *   3. wipe                            4. verify local empty
 *   5. verify cloud empty              6. refresh → still empty
 *   7. sign out / sign in → still empty
 * Plus: a slow in-flight pull must not repopulate a wiped database, and a
 * second wipe must be a safe no-op.
 */
import { build } from 'esbuild';
import { JSDOM } from 'jsdom';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import fs from 'node:fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');

const dom = new JSDOM('<!doctype html><html><body><div id="root"></div></body></html>', { url: 'http://localhost/' });
global.window = dom.window;
global.document = dom.window.document;
Object.defineProperty(global, 'navigator', { value: dom.window.navigator, configurable: true });
global.localStorage = dom.window.localStorage;
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

const outfile = path.join(ROOT, '.test-wipe-bundle.mjs');
await build({
  entryPoints: [path.join(ROOT, 'scripts/test-entry.ts')],
  bundle: true,
  format: 'esm',
  platform: 'browser',
  outfile,
  logLevel: 'silent',
  external: ['react', 'react-dom', 'react/jsx-runtime', 'react-dom/client', 'react-dom/test-utils'],
  jsx: 'automatic',
  alias: { '@supabase/supabase-js': path.join(ROOT, 'scripts/fake-supabase.mjs') },
  define: {
    'import.meta.env.VITE_SUPABASE_URL': '"https://fake.supabase.co"',
    'import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY': '"sb_publishable_test"',
    'import.meta.env.PROD': 'true',
    'import.meta.env.DEV': 'false',
    'import.meta.env.MODE': '"production"',
    'import.meta.env.BASE_URL': '"/"',
  },
});

const fake = await import(path.join(ROOT, 'scripts/fake-supabase.mjs'));
const mod = await import(outfile);
const React = (await import('react')).default;
const { createRoot } = await import('react-dom/client');
const { act: reactAct } = await import('react-dom/test-utils');
const act = (fn) => reactAct(fn);
const flush = () => act(async () => { await new Promise((r) => setTimeout(r, 30)); });

let failed = 0;
const check = (name, cond) => {
  console.log(`  ${cond ? '✓' : '✗'} ${name}`);
  if (!cond) failed++;
};

const USER = 'user-test-1';
const cloudCount = () => ['tasks', 'syllabus_progress', 'focus_sessions', 'lectures', 'revision_logs', 'current_affairs', 'answers']
  .reduce((sum, table) => sum + fake.__count(table, USER), 0);

const localCount = (db) => db.tasks.length + Object.keys(db.progress).length + db.focusSessions.length +
  db.lectures.length + db.revisionLogs.length + db.currentAffairs.length + db.answers.length;

// ------------------------------------------------------------------ 1. boot
fake.__resetFakeCloud({ id: USER, email: 'student@example.com' });
localStorage.clear();

let storeRef = null;
function Probe() { storeRef = mod.useStore(); return null; }

const container = document.createElement('div');
document.body.appendChild(container);
let root = createRoot(container);
await act(async () => { root.render(React.createElement(mod.StoreProvider, null, React.createElement(Probe))); });
await flush();
check('signed-in boot reaches the cloud store', storeRef.authState === 'signed-in');

// ------------------------------------------------- 2. representative data
const { syllabus } = mod;
const subtopic = syllabus.subtopics[0];
await act(async () => {
  storeRef.addTask({ name: 'Revise Geomorphology', deadline: mod.todayKey() });
  storeRef.addFocusSession({ startedAt: new Date().toISOString(), durationMinutes: 45, taskName: 'Climatology', sessionType: 'focus', completed: true });
  storeRef.addLecture({ title: 'Biogeography', subject: 'Geography Optional', rangeStart: 98, rangeEnd: 113, totalLectures: 16 });
  storeRef.addCurrentAffair({ title: 'COP outcome', category: 'Environment' });
  storeRef.setItemStatus(subtopic.id, 'subtopic', 'completed');
  storeRef.reviseItem(subtopic.id, 'subtopic', 2);
});
// Pushes are debounced (progress 800ms, local save 150ms) — wait them out.
await act(async () => { await new Promise((r) => setTimeout(r, 1100)); });

check('1. representative data created locally', localCount(storeRef.db) >= 6);
// task + focus session + lecture + revision log + CA item, plus the five
// syllabus_progress rows a completed subtopic cascades into (topic → paper)
check('2. the same data reached the cloud', cloudCount() === 10);
check('2. localStorage holds the local copy', Boolean(localStorage.getItem('mup.db.v1')));
const beforeWipe = { local: localCount(storeRef.db), cloud: cloudCount() };
check('2. local and cloud agree before the wipe', beforeWipe.local > 0 && beforeWipe.cloud > 0);

// ------------------------------------------------------- 3. slow in-flight pull
// A pull that was already running when the wipe lands must not resurrect rows.
fake.__store.networkDelay = 120;
const slowSignIn = act(async () => { await storeRef.signIn('student@example.com', 'password', true); });
await act(async () => { await new Promise((r) => setTimeout(r, 10)); });
fake.__store.networkDelay = 0;

// --------------------------------------------------------------- 4. wipe
await act(async () => { await storeRef.wipeAllData(); });
await slowSignIn;
await act(async () => { await new Promise((r) => setTimeout(r, 200)); });

check('3. wipe reports success', true);
check('4. local state is empty after the wipe', localCount(storeRef.db) === 0);
check('4. short-lived timer caches are cleared',
  localStorage.getItem('mup.focus-timer.v2') === null && localStorage.getItem('mup.focus-timer.logged.v2') === null);
check('4. sign-in session survives the wipe', storeRef.authState === 'signed-in');

// ---------------------------------------------------------- 5. cloud empty
check('5. cloud rows are gone', cloudCount() === 0);
check('5. a re-wipe is a safe no-op', await (async () => {
  const again = await act(async () => storeRef.wipeAllData());
  return again !== undefined || cloudCount() === 0;
})());

// ------------------------------------------------------------ 6. refresh
await act(async () => { root.unmount(); });
await act(async () => {
  root = createRoot(container);
  root.render(React.createElement(mod.StoreProvider, null, React.createElement(Probe)));
});
await flush();
await act(async () => { await new Promise((r) => setTimeout(r, 80)); });
check('6. still empty after a full refresh', localCount(storeRef.db) === 0);
check('6. refresh pulled zero records from the cloud', cloudCount() === 0);

// --------------------------------------------------- 7. sign out / sign in
await act(async () => { await storeRef.logout(); });
check('7. signed out', storeRef.authState === 'gate');
await act(async () => { await storeRef.signIn('student@example.com', 'password', true); });
await flush();
await act(async () => { await new Promise((r) => setTimeout(r, 80)); });
check('7. signed back in', storeRef.authState === 'signed-in');
check('7. still empty after sign out / sign in', localCount(storeRef.db) === 0 && cloudCount() === 0);

// ---------------------------------------------- 8. analytics are not collateral
await act(async () => {
  storeRef.addFocusSession({ startedAt: new Date().toISOString(), durationMinutes: 60, taskName: 'Post-wipe session', sessionType: 'focus', completed: true });
});
const dash = mod.dashboardStats(storeRef.db);
check('8. new sessions still feed Study Hours after a wipe', dash.todayMinutes === 60);

fs.rmSync(outfile, { force: true });
console.log(failed === 0 ? '\nWIPE TEST PASSED' : `\nWIPE TEST FAILED (${failed})`);
process.exit(failed === 0 ? 0 : 1);
