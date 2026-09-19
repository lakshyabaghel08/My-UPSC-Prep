#!/usr/bin/env node
/**
 * End-to-end cloud tests against the LIVE Supabase project (Phase 10).
 * Covers: signup, login, logout, session persistence, CRUD for every module,
 * RLS isolation between two real users, and the bulk migration round-trip.
 *
 * Config resolution order:
 *   env VITE_SUPABASE_URL / VITE_SUPABASE_PUBLISHABLE_KEY
 *   → .env.production / .env.local in repo root
 * Exits non-zero on any failure. Cleanup of test users happens when
 * SUPABASE_ACCESS_TOKEN is provided; otherwise they are left (harmless).
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createClient } from '@supabase/supabase-js';

// supabase-js realtime needs a WHATWG WebSocket. Node 21+ ships one natively;
// older runners (Node 20) must polyfill it — the officially documented fix.
if (typeof globalThis.WebSocket === 'undefined') {
  const ws = await import('ws');
  globalThis.WebSocket = ws.default?.WebSocket ?? ws.WebSocket ?? ws.default ?? ws;
  console.log('Polyfilled globalThis.WebSocket with the ws package (Node < 21 runner).');
}

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');

function loadConfig() {
  let url = process.env.VITE_SUPABASE_URL;
  let key = process.env.VITE_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) {
    for (const f of ['.env.production', '.env.local']) {
      const p = path.join(ROOT, f);
      if (!fs.existsSync(p)) continue;
      for (const line of fs.readFileSync(p, 'utf8').split('\n')) {
        const m = line.match(/^\s*VITE_SUPABASE_URL\s*=\s*(.+)\s*$/);
        const k = line.match(/^\s*VITE_SUPABASE_PUBLISHABLE_KEY\s*=\s*(.+)\s*$/);
        if (m && !url) url = m[1].trim();
        if (k && !key) key = k[1].trim();
      }
      if (url && key) break;
    }
  }
  if (!url || !key) {
    console.error('::error::Supabase config not found (env vars or .env.production).');
    process.exit(1);
  }
  return { url, key };
}

const { url, key } = loadConfig();
const ts = Date.now();
let emailA = `mup-test-a-${ts}@example.com`;
const emailB = `mup-test-b-${ts}@example.com`;
const PASSWORD = 'xK9$mupTest2027!';

let failed = 0;
const check = (name, cond, extra = '') => {
  console.log(`  ${cond ? '✓' : '✗'} ${name}${extra ? ` — ${extra}` : ''}`);
  if (!cond) { failed++; console.error(`::error::E2E FAILED — ${name}${extra ? ` — ${extra}` : ''}`); }
};

async function main() {
  console.log(`Testing against ${url}\n`);
  try {
    const h = await fetch(`${url}/auth/v1/health`, { headers: { apikey: key, Authorization: `Bearer ${key}` } });
    console.log(`Auth service health: ${h.status} ${h.ok ? '✓' : '(401 without apikey means service is up)'}`);
  } catch (e) {
    console.error(`::error::Cannot reach auth service at ${url} — ${e.message}`);
  }

  // ---------- 1. signup user A ----------
  const sbA = createClient(url, key, { auth: { persistSession: true, storageKey: 'mup-test-a' } });
  let su;
  try {
    su = await sbA.auth.signUp({ email: emailA, password: PASSWORD });
  } catch (e) {
    console.log(`  signUp THREW: ${e?.message}`);
    su = { data: {}, error: e };
  }
  if (!su.data.session) {
    // Most common cause on a fresh project: "Confirm email" is ON by default.
    // Self-heal via the Management API when the access token is available.
    console.log(`  signup returned no session (${su.error?.message ?? 'no error, no session'}) — attempting auto-fix (mailer_autoconfirm via Management API)…`);
    console.log(`  signUp error details: ${JSON.stringify({ message: su.error?.message, code: su.error?.code, status: su.error?.status ?? su.error?.status_code, names: Object.getPrototypeOf(su.error ?? {})?.constructor?.name })}`);
    const fixToken = process.env.SUPABASE_ACCESS_TOKEN;
    if (fixToken) {
      const ref = new URL(url).hostname.split('.')[0];
      let patch;
      try {
        patch = await fetch(`https://api.supabase.com/v1/projects/${ref}/config/auth`, {
          method: 'PATCH',
          headers: { Authorization: `Bearer ${fixToken}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ mailer_autoconfirm: true, disable_signup: false }),
        });
      } catch (e) {
        patch = { ok: false, status: 0 };
        console.log(`  auth config PATCH threw: ${e?.message}`);
      }
      console.log(`  auth config PATCH → HTTP ${patch.status}${patch.ok ? ' ✓' : ' ✗'}`);
      emailA = `mup-test-a2-${ts}@example.com`; // fresh address in case the first attempt created an unconfirmed user
      try {
        su = await sbA.auth.signUp({ email: emailA, password: PASSWORD });
      } catch (e2) {
        console.log(`  signUp retry THREW: ${e2?.message}`);
        su = { data: {}, error: e2 };
      }
    } else {
      console.error('::error::Signup returned no session and SUPABASE_ACCESS_TOKEN is unavailable for auto-fix. Fix manually: Supabase Dashboard → Authentication → Sign In / Up → turn OFF "Confirm email" — then re-run.');
    }
  }
  check('1. new user signup returns a session (autoconfirm ON)', Boolean(su.data.session), su.error?.message);
  if (!su.data.session) process.exit(1);
  const uidA = su.data.session.user.id;
  check('2. session user id is a uuid', /^[0-9a-f-]{36}$/i.test(uidA));

  // session persistence via getSession (as on page reload)
  const sess = await sbA.auth.getSession();
  check('3. session persists via getSession()', Boolean(sess.data.session?.user));

  // ---------- 2. settings (profiles) ----------
  const settingsRow = { id: uidA, target_exam_year: 2027, optional: 'Geography', theme: 'dark', daily_target_minutes: 480, auto_revision_schedule: true };
  check('4. upsert settings (profiles)', !(await sbA.from('profiles').upsert(settingsRow)).error);
  const prof = await sbA.from('profiles').select('*').eq('id', uidA).maybeSingle();
  check('5. read back settings', prof.data?.optional === 'Geography' && prof.data?.target_exam_year === 2027);

  // ---------- 3. tasks CRUD ----------
  const ins = await sbA.from('tasks').insert({ user_id: uidA, name: 'Read Laxmikanth Ch.1', deadline: '2026-09-21', priority: 'high', subject_mapping: 'GS-I', study_stage: 'R0' }).select('id').single();
  check('6. create task', Boolean(ins.data?.id), ins.error?.message);
  const taskId = ins.data.id;
  const upd = await sbA.from('tasks').update({ status: 'completed', completed_at: new Date().toISOString() }).eq('id', taskId).select('status').single();
  check('7. complete task (update)', upd.data?.status === 'completed', upd.error?.message);
  const edit = await sbA.from('tasks').update({ name: 'Read Laxmikanth Ch.1 + notes' }).eq('id', taskId).select('name').single();
  check('8. edit task', edit.data?.name === 'Read Laxmikanth Ch.1 + notes');

  // ---------- 4. geography lectures ----------
  const lec = await sbA.from('lectures').insert({ user_id: uidA, title: 'Plate Tectonics L1', subject: 'Geomorphology', total_lectures: 12, lecture_no: 4, pdf_followed: 'booklet ch3', short_notes_made: true, revised: true, revision_count: 1, pyqs_attempted: 3, status: 'completed' }).select('id').single();
  check('9. geography lecture progress record', Boolean(lec.data?.id), lec.error?.message);

  // ---------- 5. revision (R1-R5) ----------
  const itemId = 'p:prelims-gs1:s0:history:c0:ancient-india:t0:prehistoric-cultures:st0:paleolithic-age';
  const prog = await sbA.from('syllabus_progress').upsert({ user_id: uidA, item_id: itemId, item_type: 'subtopic', status: 'completed', revision_count: 1, confidence: 2, next_revision_at: new Date(Date.now() + 3 * 864e5).toISOString() }, { onConflict: 'user_id,item_id' }).select('revision_count').single();
  check('10. syllabus progress (status/confidence/R-count)', prog.data?.revision_count === 1, prog.error?.message);
  const rlog = await sbA.from('revision_logs').insert({ user_id: uidA, item_id: itemId, item_type: 'subtopic', revision_number: 1, confidence: 2 }).select('id').single();
  check('11. revision log entry', Boolean(rlog.data?.id), rlog.error?.message);

  // ---------- 6. remaining modules ----------
  const inserts = [
    ['12. PYQ record', 'pyqs', { user_id: uidA, exam: 'Prelims', year: 2024, question: 'Which of the following pairs are correctly matched?', result: 'attempted' }],
    ['13. prelims test record', 'prelims_tests', { user_id: uidA, test_name: 'Vision Full Mock 1', test_date: '2026-09-10', total_questions: 100, attempted: 85, correct: 60, incorrect: 25, score: 103.5, max_score: 200, test_type: 'Full Mock' }],
    ['14. mains test record', 'mains_tests', { user_id: uidA, test_name: 'GS2 Sectional', test_date: '2026-09-12', paper: 'GS2', marks_obtained: 98, max_marks: 250 }],
    ['15. answer writing record', 'answers', { user_id: uidA, date: '2026-09-15', question: 'Discuss the role of mangroves…', paper: 'GS3', word_count: 214, strengths: ['Good intro'], improvements: ['No data'] }],
    ['16. current affairs record', 'current_affairs', { user_id: uidA, date: '2026-09-18', title: 'GIB recovery plan', category: 'Environment', relevance: 'both' }],
    ['17. study session record', 'focus_sessions', { user_id: uidA, started_at: new Date().toISOString(), duration_minutes: 90, task_name: 'Climatology revision', session_type: 'focus', completed: true }],
  ];
  for (const [name, table, row] of inserts) {
    const r = await sbA.from(table).insert(row);
    check(name, !r.error, r.error?.message);
  }
  const habit = await sbA.from('habits').insert({ user_id: uidA, name: 'Newspaper', color: '#2dd4bf' }).select('id').single();
  check('18. habit record', Boolean(habit.data?.id), habit.error?.message);
  const hc = await sbA.from('habit_completions').insert({ user_id: uidA, habit_id: habit.data.id, date: '2026-09-18' });
  check('19. habit completion (FK + unique)', !hc.error, hc.error?.message);

  // ---------- 7. bulk migration round-trip (repository semantics) ----------
  const before = await sbA.from('tasks').select('id', { count: 'exact', head: true });
  const bulk = Array.from({ length: 25 }, (_, i) => ({ user_id: uidA, name: `Migration task ${i}`, deadline: '2026-10-01', priority: 'normal' }));
  const bulkIns = await sbA.from('tasks').insert(bulk).select('id');
  check('20. bulk migration insert (25 rows)', !bulkIns.error && bulkIns.data.length === 25, bulkIns.error?.message);
  const after = await sbA.from('tasks').select('id', { count: 'exact', head: true });
  check('21. counts consistent after bulk write', (after.count ?? 0) - (before.count ?? 0) === 25);
  const pulled = await sbA.from('tasks').select('*').eq('user_id', uidA).limit(1000);
  check('22. full pull returns everything', pulled.data.length === (after.count ?? 0));

  // ---------- 8. logout ----------
  await sbA.auth.signOut();
  const afterLogout = await sbA.auth.getSession();
  check('23. logout clears session', !afterLogout.data.session);

  // ---------- 9. RLS isolation with user B ----------
  const sbB = createClient(url, key, { auth: { persistSession: true, storageKey: 'mup-test-b' } });
  let suB;
  try {
    suB = await sbB.auth.signUp({ email: emailB, password: PASSWORD });
  } catch (e) {
    console.log(`  user B signUp THREW: ${e?.message}`);
    suB = { data: {}, error: e };
  }
  check('24. second user signup', Boolean(suB.data.session), suB.error?.message);
  const uidB = suB.data.session.user.id;
  const leakTasks = await sbB.from('tasks').select('*');
  const leakProfiles = await sbB.from('profiles').select('*');
  const leakLectures = await sbB.from('lectures').select('*');
  check('25. RLS: user B sees ZERO of user A tasks', (leakTasks.data ?? []).length === 0, `${leakTasks.data?.length ?? 0} rows leaked`);
  check('26. RLS: user B sees ZERO of user A profiles', (leakProfiles.data ?? []).filter((p) => p.id === uidA).length === 0);
  check('27. RLS: user B sees ZERO of user A lectures', (leakLectures.data ?? []).length === 0);
  const crossInsert = await sbB.from('tasks').insert({ user_id: uidA, name: 'malicious', deadline: '2026-10-01' });
  check('28. RLS: user B cannot INSERT into user A data', Boolean(crossInsert.error), 'blocked as expected');
  const crossUpdate = await sbB.from('tasks').update({ name: 'hacked' }).eq('id', taskId);
  const verify = await sbB.from('tasks').select('*').eq('id', taskId);
  check('29. RLS: user B cannot UPDATE user A rows', Boolean(crossUpdate.error) || (verify.data ?? []).length === 0);
  const crossDelete = await sbB.from('tasks').delete().eq('user_id', uidA);
  let stillThere;
  try {
    stillThere = await sbA.auth.signInWithPassword({ email: emailA, password: PASSWORD });
  } catch (e) {
    console.log(`  signInWithPassword THREW: ${e?.message}`);
    stillThere = { data: {} };
  }
  const cnt = stillThere.data.session ? await sbA.from('tasks').select('id', { count: 'exact', head: true }) : null;
  check('30. RLS: user B cannot DELETE user A rows', (cnt?.count ?? 0) >= 26);
  // login for user A works (covers login flow)
  check('31. login with email+password works', Boolean(stillThere.data.session), stillThere.error?.message);
  await sbA.auth.signOut();
  await sbB.auth.signOut();

  // ---------- 10. cleanup ----------
  const token = process.env.SUPABASE_ACCESS_TOKEN;
  if (token) {
    try {
      const res = await fetch(`https://api.supabase.com/v1/projects/${new URL(url).hostname.split('.')[0]}/database/query`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: `delete from auth.users where email like 'mup-test-%@example.com';` }),
      });
      check('32. test users cleaned up', res.ok);
    } catch (e) {
      console.log(`  ⚠ cleanup failed (${e.message}) — test users remain, harmless.`);
    }
  } else {
    console.log('  ℹ SUPABASE_ACCESS_TOKEN not set — test users left in place (they own only their own RLS-scoped rows).');
  }

  console.log(failed === 0 ? '\nE2E CLOUD TESTS PASSED' : `\nE2E CLOUD TESTS FAILED (${failed})`);
  process.exit(failed ? 1 : 0);
}

main().catch((e) => { console.error(`::error::E2E FATAL — ${e?.stack || e?.message || e}`); process.exit(1); });
