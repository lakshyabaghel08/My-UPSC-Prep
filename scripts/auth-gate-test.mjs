/**
 * Auth-gate test (Phase 4): builds the app WITH Supabase env vars pointing at a
 * dummy project, boots it in jsdom, and asserts that:
 *  - the sign-in gate is shown (no dashboard/preparation data is accessible)
 *  - "Continue on this device" local-mode escape hatch exists
 * Run: npm run build (with VITE_ env set) then node scripts/auth-gate-test.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { JSDOM, VirtualConsole } from 'jsdom';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');

const errors = [];
const vc = new VirtualConsole();
vc.on('jsdomError', (e) => { if (!/scrollTo/.test(e.message)) errors.push(e.message); });
vc.on('error', (...a) => errors.push(a.join(' ')));

const dom = new JSDOM('<!doctype html><html><body><div id="root"></div></body></html>', {
  url: 'http://localhost:5173/',
  runScripts: 'outside-only',
  pretendToBeVisual: true,
  virtualConsole: vc,
});
global.window = dom.window;
global.document = dom.window.document;
global.localStorage = dom.window.localStorage;
global.location = dom.window.location;
global.requestAnimationFrame = (cb) => setTimeout(() => cb(Date.now()), 16);
global.cancelAnimationFrame = (id) => clearTimeout(id);
window.requestAnimationFrame = global.requestAnimationFrame;
window.cancelAnimationFrame = global.cancelAnimationFrame;
window.scrollTo = () => {};
window.matchMedia = window.matchMedia || (() => ({ matches: false, addEventListener() {}, removeEventListener() {} }));

// A module worker/IndexedDB shim is unnecessary — supabase-js getSession is localStorage-only.

const assets = path.join(ROOT, 'dist', 'assets');
const jsBundle = fs.readdirSync(assets).find((f) => f.endsWith('.js'));
if (!jsBundle) throw new Error('Run the env build first (see script header)');
dom.window.eval(fs.readFileSync(path.join(assets, jsBundle), 'utf8'));

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
await sleep(600);
const text = () => document.body.textContent || '';

let failed = 0;
const check = (name, cond) => { console.log(`  ${cond ? '✓' : '✗'} ${name}`); if (!cond) failed++; };

const t = text();
check('auth gate is displayed', t.includes('Sign in to sync'));
check('sign in / create account tabs present', t.includes('Sign in') && t.includes('Create account'));
check('local-mode escape hatch offered', t.includes('Continue on this device'));
check('dashboard is NOT accessible pre-auth', !t.includes('preparation at a glance'));
check('syllabus module is NOT accessible pre-auth', !t.includes('Operational Syllabus'));

// Remember-me option: present on the sign-in tab, checked by default, hidden
// on the create-account tab (signup flow is unchanged).
const rememberRow = () => [...document.querySelectorAll('label.checkbox-row')]
  .find((el) => /remember me/i.test(el.textContent || ''));
check('remember me checkbox present on sign-in tab', Boolean(rememberRow()));
check('remember me checked by default', rememberRow()?.querySelector('input[type="checkbox"]')?.checked === true);
const signupTab = [...document.querySelectorAll('.seg button')].find((b) => b.textContent?.includes('Create account'));
if (signupTab) { signupTab.click(); await sleep(150); }
check('remember me hidden on create-account tab', !rememberRow());

check('no page errors', errors.length === 0, errors[0] ?? '');

console.log(failed === 0 ? '\nAUTH GATE TEST PASSED' : `\nAUTH GATE TEST FAILED (${failed})`);
process.exit(failed ? 1 : 0);
