/**
 * "Re-import local data" removal regression test.
 *
 * The old Settings → "⤒ Re-import local data" action (and the first-sign-in
 * import popup that kept coming back on every app open) deleted the whole cloud
 * copy and re-uploaded the device copy. Whenever a delete silently matched no
 * rows, that appended a second copy of everything — the duplication users hit.
 *
 * This test bundles the real store + the real Settings page
 * (`scripts/test-entry.ts`) against the in-memory fake Supabase and asserts:
 *   A. local-mode data still reaches an empty account on first sign-in (once,
 *      silently, with ids remapped to their cloud uuids),
 *   B. reopening the app never shows an import prompt / re-import button and
 *      never duplicates a record (locally or in the cloud),
 *   C. a device that already has the data re-syncing into an account that
 *      already has it touches nothing at all — no uploads, no deletes.
 */
import { build } from 'esbuild';
import { JSDOM } from 'jsdom';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import fs from 'node:fs';
import React from 'react';
import { createRoot } from 'react-dom/client';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');

const dom = new JSDOM('<!doctype html><html><body><div id="root"></div></body></html>', { url: 'http://localhost/' });
global.window = dom.window;
global.document = dom.window.document;
Object.defineProperty(global, 'navigator', { value: dom.window.navigator, configurable: true });
global.localStorage = dom.window.localStorage;
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

const outfile = path.join(ROOT, '.test-reimport-bundle.mjs');
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
const { act: reactAct } = await import('react-dom/test-utils');
const act = (fn) => reactAct(fn);
const flush = () => act(async () => { await new Promise((r) => setTimeout(r, 30)); });

let failed = 0;
const check = (name, cond) => {
  console.log(`  ${cond ? '✓' : '✗'} ${name}`);
  if (!cond) failed++;
};

const USER = 'user-test-1';
const MIGRATED_FLAG = `mup.migrated.${USER}`;
const TABLES = [
  'tasks', 'syllabus_progress', 'revision_logs', 'focus_sessions', 'lectures',
  'current_affairs', 'answers', 'habits', 'habit_completions', 'pyqs',
  'prelims_tests', 'mains_tests',
];
const cloudCount = (tables = TABLES) => tables.reduce((sum, table) => sum + fake.__count(table, USER), 0);
const cloudIds = () => TABLES
  .flatMap((table) => (fake.__store.tables[table] ?? []).filter((row) => row.user_id === USER || row.id === USER).map((row) => `${table}:${row.id}`))
  .sort();
const recordCount = (db) => db.tasks.length + Object.keys(db.progress).length + db.revisionLogs.length +
  db.focusSessions.length + db.lectures.length + db.currentAffairs.length + db.answers.length +
  db.habits.length + db.habitCompletions.length + db.pyqs.length + db.prelimsTests.length + db.mainsTests.length;
/** Entity ids that a device-local record carries before its first cloud insert. */
const allIds = (db) => [
  ...db.tasks.map((x) => x.id), ...db.revisionLogs.map((x) => x.id), ...db.focusSessions.map((x) => x.id),
  ...db.lectures.map((x) => x.id), ...db.currentAffairs.map((x) => x.id), ...db.answers.map((x) => x.id),
];
const isCloudId = (id) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);

let storeRef = null;
function Probe() { storeRef = mod.useStore(); return null; }

const container = document.createElement('div');
document.body.appendChild(container);
let root = createRoot(container);

/** StoreProvider > ToastProvider > (Probe [+ real Settings page]). */
const mount = async (withSettings = false) => {
  root = createRoot(container);
  await act(async () => {
    root.render(React.createElement(mod.StoreProvider, null,
      React.createElement(mod.ToastProvider, null,
        React.createElement(Probe),
        withSettings ? React.createElement(mod.Settings) : null)));
  });
  await flush();
};
const unmount = async () => { await act(async () => { root.unmount(); }); };
const settle = async (ms = 120) => { await act(async () => { await new Promise((r) => setTimeout(r, ms)); }); };
const waitFor = async (cond, ms = 3000) => {
  const deadline = Date.now() + ms;
  while (Date.now() < deadline) {
    if (cond()) return true;
    await settle(25);
  }
  return cond();
};

// ------------------------------------------------- A. local mode → first sign-in
fake.__resetFakeCloud(null);
localStorage.clear();

await mount();
check('A1. app starts on the sign-in gate', storeRef.authState === 'gate');
await act(async () => { storeRef.continueLocal(); });
check('A2. local mode entered', storeRef.authState === 'local');

const { syllabus } = mod;
const subtopic = syllabus.subtopics[0];
await act(async () => {
  storeRef.addTask({ name: 'Revise Geomorphology', deadline: mod.todayKey() });
  storeRef.addFocusSession({ startedAt: new Date().toISOString(), durationMinutes: 45, taskName: 'Climatology', sessionType: 'focus', completed: true });
  storeRef.addLecture({ title: 'Biogeography', subject: 'Geography Optional', rangeStart: 98, rangeEnd: 113, totalLectures: 16 });
  storeRef.addCurrentAffair({ title: 'COP outcome', category: 'Environment' });
  storeRef.addAnswer({ question: 'Discuss the role of the WTO in global trade.' });
  storeRef.setItemStatus(subtopic.id, 'subtopic', 'completed');
  storeRef.reviseItem(subtopic.id, 'subtopic', 2);
});
await settle(400); // local save debounce
const localRecords = recordCount(storeRef.db);
check('A3. device data stays local until sign-in', localRecords >= 8 && cloudCount() === 0);
await unmount();

// First sign-in, account still empty → one silent, additive import.
fake.__resetFakeCloud({ id: USER, email: 'student@example.com' });
localStorage.removeItem(MIGRATED_FLAG);
await mount(true);
await waitFor(() => storeRef.authState === 'signed-in' && cloudCount() > 0);

check('B1. empty account receives the device data exactly once', cloudCount() === localRecords);
check('B2. local records adopted their cloud ids', allIds(storeRef.db).every(isCloudId));
check('B3. no duplicate local records', new Set(allIds(storeRef.db)).size === allIds(storeRef.db).length);
check('B4. the re-import API is gone from the store',
  storeRef.migrateLocalToCloud === undefined && storeRef.migrationPrompt === undefined && storeRef.dismissMigrationPrompt === undefined);
const seeded = { local: recordCount(storeRef.db), cloud: cloudCount() };

// --------------------------------------------- B. reopening the app (the bug)
for (let i = 1; i <= 3; i++) {
  await unmount();
  await mount(true);
  await waitFor(() => storeRef.authState === 'signed-in');
  await settle(150);
  const text = document.body.textContent || '';
  check(`C${i}a. reopen ${i}: no import prompt, no re-import button`,
    !text.includes('Import your local data') && !text.includes('Import local data') && !text.includes('Re-import'));
  check(`C${i}b. reopen ${i}: nothing duplicated locally or in the cloud`,
    recordCount(storeRef.db) === seeded.local && cloudCount() === seeded.cloud);
}

// ------------------------------- C. synced account + stale device copy (no-op)
await unmount();
const snapshot = JSON.parse(localStorage.getItem('mup.db.v1'));
const rekey = (rows, prefix) => rows.map((row, index) => ({ ...row, id: `${prefix}-restored-${index}` }));
snapshot.tasks = rekey(snapshot.tasks, 'task');
snapshot.revisionLogs = rekey(snapshot.revisionLogs, 'rev');
snapshot.focusSessions = rekey(snapshot.focusSessions, 'fs');
snapshot.lectures = rekey(snapshot.lectures, 'lec');
snapshot.currentAffairs = rekey(snapshot.currentAffairs, 'ca');
snapshot.answers = rekey(snapshot.answers, 'ans');
localStorage.setItem('mup.db.v1', JSON.stringify(snapshot));
localStorage.removeItem(MIGRATED_FLAG);

const cloudIdsBefore = cloudIds();
const cloudBefore = cloudCount();
await mount(true);
await waitFor(() => storeRef.authState === 'signed-in');
await settle(200);
const text = document.body.textContent || '';
check('D1. a populated account is never re-imported into', cloudCount() === cloudBefore);
check('D2. no cloud row was deleted or duplicated', JSON.stringify(cloudIds()) === JSON.stringify(cloudIdsBefore));
check('D3. the settings page offers no import action',
  text.includes('Sign out') && !text.includes('Re-import') && !text.includes('Import local data'));

fs.rmSync(outfile, { force: true });
console.log(failed === 0 ? '\nRE-IMPORT REGRESSION TEST PASSED' : `\nRE-IMPORT REGRESSION TEST FAILED (${failed})`);
process.exit(failed === 0 ? 0 : 1);
