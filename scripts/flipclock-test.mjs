/**
 * Flip Clock behaviour test.
 *
 * Mounts the real `src/ui/FlipClock.tsx` in jsdom and asserts the ported
 * transition semantics: split top/bottom cards, flaps only for digits that
 * actually changed, instant repaints while paused, staged teardown, and a
 * glitch-free structure change when hours appear.
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
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

const outfile = path.join(ROOT, '.test-flipclock-bundle.mjs');
await build({
  entryPoints: [path.join(ROOT, 'scripts/flipclock-entry.ts')],
  bundle: true, format: 'esm', platform: 'browser', outfile, logLevel: 'silent',
  external: ['react', 'react-dom', 'react/jsx-runtime', 'react-dom/client'],
  jsx: 'automatic',
  define: { 'import.meta.env.BASE_URL': '"/"' },
});

const { FlipClock } = await import(outfile);
const React = (await import('react')).default;
const { createRoot } = await import('react-dom/client');
const { act } = await import('react');

let failed = 0;
const check = (name, cond) => { console.log(`  ${cond ? '✓' : '✗'} ${name}`); if (!cond) failed++; };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const host = document.getElementById('root');
const root = createRoot(host);
const render = (seconds, animate) => act(async () => {
  root.render(React.createElement(FlipClock, { seconds, animate, label: 'timer' }));
});

const digits = () => [...host.querySelectorAll('.flip-digit')];
const digitValues = () => digits().map((d) => d.querySelector('.flip-half.top .val').textContent + '/' + d.querySelector('.flip-half.bottom .val').textContent);
const flaps = () => host.querySelectorAll('.flip-flap');

await render(1500, false); // 25:00
check('split top/bottom cards render per digit', digits().length === 4
  && digits().every((d) => d.querySelectorAll('.flip-half.top .val').length === 1 && d.querySelectorAll('.flip-half.bottom .val').length === 1));
check('first paint shows 25:00 with no flaps', digitValues().join(' ') === '2/2 5/5 0/0 0/0' && flaps().length === 0);

await render(1499, true); // 24:59 — three digits change
check('only the digits that changed get flaps', flaps().length === 6);
check('flaps only exist on the three digits that changed',
  digits().map((d) => d.querySelectorAll('.flip-flap').length).join(',') === '0,2,2,2');
const secondsDigit = digits()[3];
check('seconds digit flips 0 → 9 (old on the falling flap, new on the rising flap)',
  secondsDigit.querySelector('.flip-flap.top .val').textContent === '0'
  && secondsDigit.querySelector('.flip-flap.bottom .val').textContent === '9'
  && secondsDigit.querySelector('.flip-half.top:not(.flip-flap) .val').textContent === '9'
  && secondsDigit.querySelector('.flip-half.bottom:not(.flip-flap) .val').textContent === '0');
check('unchanged minutes-tens digit stays put', digits()[0].querySelectorAll('.flip-flap').length === 0);

await act(async () => { await sleep(700); });
check('flaps are torn down after the staged 600ms sequence', flaps().length === 0
  && digitValues().join(' ') === '2/2 4/4 5/5 9/9');

await render(1498, false); // paused: instant repaint, no animation
check('a paused clock repaints instantly with no flaps', flaps().length === 0
  && digitValues().join(' ') === '2/2 4/4 5/5 8/8');

await render(1497, true);
const midFlip = flaps().length;
await render(25 * 60, false); // reset while a flip is in flight
check('reset mid-flip clears pending flaps instead of glitching', midFlip > 0 && flaps().length === 0
  && digitValues().join(' ') === '2/2 5/5 0/0 0/0');

await render(3600, false); // 01:00:00 — structure grows
check('hours add a digit group without animating', digits().length === 6
  && flaps().length === 0 && host.querySelectorAll('.flip-colon').length === 2
  && digitValues().join(' ') === '0/0 1/1 0/0 0/0 0/0 0/0');
check('aria label exposes the time for screen readers',
  host.querySelector('.flip-clock')?.getAttribute('role') === 'timer'
  && host.querySelector('.flip-clock')?.getAttribute('aria-label') === 'timer');

await act(async () => { root.unmount(); });
fs.rmSync(outfile, { force: true });
console.log(failed === 0 ? '\nFLIP CLOCK TEST PASSED' : `\nFLIP CLOCK TEST FAILED (${failed})`);
process.exit(failed === 0 ? 0 : 1);
