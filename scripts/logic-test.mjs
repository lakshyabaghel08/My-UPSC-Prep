/**
 * Functional tests for the local data layer & engine logic.
 * Bundles src/lib + src/store + src/data with esbuild (from vite's deps),
 * runs against a fresh jsdom localStorage, and asserts core behaviours.
 */
import { build } from 'esbuild';
import { JSDOM } from 'jsdom';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');

// browser-ish globals first (modules touch localStorage/document)
const dom = new JSDOM('<!doctype html><html><body></body></html>', { url: 'http://localhost/' });
global.window = dom.window;
global.document = dom.window.document;
Object.defineProperty(global, 'navigator', { value: dom.window.navigator, configurable: true });
global.localStorage = dom.window.localStorage;
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

const outfile = path.join(ROOT, '.test-bundle.mjs');
await build({
  entryPoints: [path.join(ROOT, 'scripts/test-entry.ts')],
  bundle: true,
  format: 'esm',
  platform: 'browser',
  outfile,
  logLevel: 'silent',
  external: ['react', 'react-dom', 'react/jsx-runtime', 'react-dom/client', 'react-dom/test-utils'],
  jsx: 'automatic',
  define: {
      'import.meta.env.VITE_SUPABASE_URL': 'undefined',
      'import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY': 'undefined',
      'import.meta.env.PROD': 'true',
      'import.meta.env.DEV': 'false',
      'import.meta.env.MODE': '"production"',
      'import.meta.env.BASE_URL': '"/"', 'import.meta.env.PROD': 'true' },
});

let failed = 0;
const check = (name, cond) => {
  console.log(`  ${cond ? '✓' : '✗'} ${name}`);
  if (!cond) failed++;
};

const mod = await import(outfile);

// ---------- revision engine ----------
const { baseInterval, scaledInterval, nextRevisionDate, revisionBucket, rLabel } = mod;
check('R1 base interval = 3d', baseInterval(1) === 3);
check('R2 base = 7d', baseInterval(2) === 7);
check('R3 base = 21d', baseInterval(3) === 21);
check('R4+ base = 45d', baseInterval(4) === 45 && baseInterval(9) === 45);
check('confidence Low scales ×0.5', scaledInterval(4, 1) === 22);
check('confidence High scales ×1.5', scaledInterval(4, 3) === 67);
check('confidence Medium ×1', scaledInterval(2, 2) === 7);
const next = nextRevisionDate(new Date('2026-01-01T10:00:00'), 1, 2);
check('next revision = +3d at midnight', next.toISOString().slice(0, 10) === '2026-01-04');
check('bucket: not started', revisionBucket(null, 0, new Date()) === 'not_started');
const future = new Date(Date.now() + 5 * 86400000).toISOString();
const past = new Date(Date.now() - 5 * 86400000).toISOString();
check('bucket: upcoming', revisionBucket(future, 1, new Date()) === 'upcoming');
check('bucket: overdue', revisionBucket(past, 1, new Date()) === 'overdue');
check('rLabel', rLabel(0) === 'Not revised' && rLabel(3) === 'R3');

// ---------- date utils ----------
const { todayKey, addDays, daysBetween, computeStreak, fmtDuration } = mod;
const t = todayKey();
check('todayKey format', /^\d{4}-\d{2}-\d{2}$/.test(t));
check('addDays across month', addDays('2026-01-30', 3) === '2026-02-02');
check('daysBetween', daysBetween('2026-01-01', '2026-01-31') === 30);
check('fmtDuration', fmtDuration(225) === '3h 45m' && fmtDuration(45) === '45m');
const streakSet = new Set([t, addDays(t, -1), addDays(t, -2)]);
check('streak counts consecutive incl. today', computeStreak(streakSet, t) === 3);
check('streak survives inactive today', computeStreak(new Set([addDays(t, -1), addDays(t, -2)]), t) === 2);

// ---------- store: full workflow ----------
const { StoreProvider, useStore } = mod;
const React = (await import('react')).default;
const { createRoot } = await import('react-dom/client');
const { act: reactAct } = await import('react-dom/test-utils');
const act = (fn) => reactAct(fn);

let storeRef = null;
function Probe() {
  const store = useStore();
  storeRef = store;
  return React.createElement('div', null, 'probe');
}

localStorage.clear();
const container = dom.window.document.createElement('div');
dom.window.document.body.appendChild(container);
const root = createRoot(container);
await act(async () => {
  root.render(React.createElement(StoreProvider, null, React.createElement(Probe)));
});
await act(async () => { await Promise.resolve(); });

check('db boots with 2027 + Geography', storeRef.db.settings.targetExamYear === 2027 && storeRef.db.settings.optional === 'Geography');

// task lifecycle
await act(async () => { storeRef.addTask({ name: 'Read Laxmikanth Ch.1', deadline: t, subjectMapping: 'GS-I', priority: 'high' }); });
check('task added', storeRef.db.tasks.length === 1 && storeRef.db.tasks[0].status === 'upcoming');
await act(async () => { storeRef.toggleTask(storeRef.db.tasks[0].id, true); });
check('task completed', storeRef.db.tasks[0].status === 'completed' && storeRef.db.tasks[0].completedAt);

// progress + revision flow
const { syllabus } = mod;
const someSub = syllabus.subtopics[0];
check('syllabus indexed', syllabus.subtopics.length === 1000 && syllabus.papers.length === 9);
await act(async () => { storeRef.setItemStatus(someSub.id, 'subtopic', 'completed'); });
check('status stored', storeRef.db.progress[someSub.id]?.status === 'completed');
await act(async () => { storeRef.reviseItem(someSub.id, 'subtopic', 2); });
const p = storeRef.db.progress[someSub.id];
check('revision R1 logged', p.revisionCount === 1 && p.confidence === 2 && p.nextRevisionAt);
check('revision log entry created', storeRef.db.revisionLogs.length === 1 && storeRef.db.revisionLogs[0].revisionNumber === 1);
{
  const p2 = storeRef.db.progress[someSub.id];
  const a = new Date(p2.lastRevisedAt); a.setHours(0, 0, 0, 0);
  const b = new Date(p2.nextRevisionAt); b.setHours(0, 0, 0, 0);
  check('R1 schedules +3d', Math.round((b.getTime() - a.getTime()) / 86400000) === 3);
}

// hierarchy rollup via selectors
const { statusOf, treeStats, dashboardStats, revisionQueue } = mod;
await act(async () => {
  for (const st of syllabus.subtopicsOf.get(someSub.topicId) ?? []) s2Set(st.id);
});
function s2Set(id) { storeRef.setItemStatus(id, 'subtopic', 'completed'); }
check('rollup: topic completed when all subs done', statusOf(someSub.topicId, storeRef.db) === 'completed');

// focus session + streak
await act(async () => { storeRef.addFocusSession({ startedAt: new Date().toISOString(), durationMinutes: 90, taskName: 'Geo P1', sessionType: 'focus', completed: true }); });
const dash = dashboardStats(storeRef.db);
check('focus session counted', dash.days7[6].minutes === 90);
check('streak >= 1 after activity', dash.streak >= 1);
check('revision queue has due item', revisionQueue(storeRef.db).dueToday.length === 0 && revisionQueue(storeRef.db).overdue.length === 0);

// tests & analytics
await act(async () => {
  storeRef.addPrelimsTest({ testName: 'Mock 1', testDate: t, totalQuestions: 100, attempted: 80, correct: 60, incorrect: 20, score: 60 * 2 - 20 * 0.66, maxScore: 200, timeTakenMinutes: 120, testType: 'Full Mock', notes: '' });
});
const { prelimsAnalytics } = mod;
const pa = prelimsAnalytics(storeRef.db);
check('prelims analytics computed', pa.count === 1 && pa.avgScore === Math.round(((120 - 13.2) / 200) * 100));

// lectures
await act(async () => { storeRef.addLecture({ title: 'Plate Tectonics L1', subject: 'Geomorphology', totalLectures: 12, lectureNo: 1 }); });
await act(async () => { storeRef.updateLecture(storeRef.db.lectures[0].id, { status: 'completed', shortNotesMade: true }); });
const { lectureSummary } = mod;
const ls = lectureSummary(storeRef.db);
check('lecture tracker summary', ls.total === 12 && ls.completed === 12 && ls.notes === 1);

// persistence round-trip
await act(async () => { await new Promise((r) => setTimeout(r, 250)); }); // allow debounced save
const saved = JSON.parse(localStorage.getItem('mup.db.v1'));
check('db persisted to localStorage', saved && saved.tasks.length === 1 && saved.progress[someSub.id]?.revisionCount === 1);

// migration
const { migrate } = mod;
const mig = migrate({ version: 0, tasks: [{ id: 'x', name: 'legacy' }] });
check('migrate fills defaults', mig.settings.targetExamYear === 2027 && mig.tasks.length === 1 && mig.version === 1);

fs.rmSync(outfile, { force: true });
console.log(failed === 0 ? '\nLOGIC TESTS PASSED' : `\nLOGIC TESTS FAILED (${failed})`);
process.exit(failed ? 1 : 0);
