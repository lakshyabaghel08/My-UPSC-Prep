/** Flip Clock — split top/bottom digit cards that physically flip.
 *
 * Ported from the reference implementation in `reference/witherwood/index`
 * (`FlipClock` class + `.flip-clock` styles): the same DOM structure
 * (`.flip-digit` > `.flip-half.top/.bottom` > `.val`, plus two transient
 * `.flip-flap` halves), the same layering and transform origins, the same
 * 300ms + 300ms staged rotateX sequence with `cubic-bezier(0.37, 0, 0.63, 1)`,
 * the same brightness shading and 600ms flap teardown.
 *
 * Only digits whose value actually changed animate; when the clock is not
 * running (paused, reset, phase change, completion) values snap instantly so
 * nothing flips backwards or glitches.
 */
import React, { useEffect, useRef } from 'react';

const DIGIT_IDS = ['h1', 'h0', 'm1', 'm0', 's1', 's0'] as const;
type DigitId = (typeof DIGIT_IDS)[number];
/** Total flip duration: 300ms top flap + 300ms bottom flap. */
const FLAP_MS = 600;

interface DigitHandle {
  root: HTMLDivElement;
  top: HTMLElement;
  bottom: HTMLElement;
  value: string;
  timeout: number | null;
}

function clockDigits(totalSeconds: number): { digits: string; showHours: boolean } {
  const s = Math.max(0, Math.round(totalSeconds));
  const hours = Math.floor(s / 3600);
  const mm = String(Math.floor((s % 3600) / 60)).padStart(2, '0');
  const ss = String(s % 60).padStart(2, '0');
  return hours > 0
    ? { digits: String(hours).padStart(2, '0') + mm + ss, showHours: true }
    : { digits: mm + ss, showHours: false };
}

export function FlipClock({ seconds, animate, label }: { seconds: number; animate: boolean; label: string }) {
  const { digits, showHours } = clockDigits(seconds);
  const rootRef = useRef<HTMLDivElement>(null);
  const handles = useRef<Partial<Record<DigitId, DigitHandle>>>({});
  const rendered = useRef('');

  // Stable ref callbacks: a fresh identity every render would detach/reattach
  // each digit and lose the value we compare against, killing the animation.
  const binders = useRef<Partial<Record<DigitId, (node: HTMLDivElement | null) => void>>>({});
  const bindDigit = (id: DigitId) => {
    if (!binders.current[id]) {
      binders.current[id] = (node: HTMLDivElement | null) => {
        if (!node) { delete handles.current[id]; return; }
        handles.current[id] = {
          root: node,
          top: node.querySelector('.flip-half.top .val') as HTMLElement,
          bottom: node.querySelector('.flip-half.bottom .val') as HTMLElement,
          value: '',
          timeout: null,
        };
      };
    }
    return binders.current[id];
  };

  /** Physical flip: old value on the falling top flap, new value on the rising
   * bottom flap; the static halves hold the target values underneath. */
  const flip = (id: DigitId, next: string) => {
    const digit = handles.current[id];
    if (!digit) return;
    const previous = digit.value;
    digit.value = next;
    if (digit.timeout) { window.clearTimeout(digit.timeout); digit.timeout = null; }
    digit.root.querySelectorAll('.flip-flap').forEach((node) => node.remove());

    digit.top.textContent = next;
    digit.bottom.textContent = previous;

    const flapTop = document.createElement('div');
    flapTop.className = 'flip-half top flip-flap';
    flapTop.innerHTML = `<div class="val">${previous}</div>`;
    const flapBottom = document.createElement('div');
    flapBottom.className = 'flip-half bottom flip-flap';
    flapBottom.innerHTML = `<div class="val">${next}</div>`;
    digit.root.appendChild(flapTop);
    digit.root.appendChild(flapBottom);

    digit.timeout = window.setTimeout(() => {
      digit.bottom.textContent = next;
      flapTop.remove();
      flapBottom.remove();
      digit.timeout = null;
    }, FLAP_MS);
  };

  const setInstant = (id: DigitId, next: string) => {
    const digit = handles.current[id];
    if (!digit) return;
    if (digit.timeout) { window.clearTimeout(digit.timeout); digit.timeout = null; }
    digit.root.querySelectorAll('.flip-flap').forEach((node) => node.remove());
    digit.top.textContent = next;
    digit.bottom.textContent = next;
    digit.value = next;
  };

  useEffect(() => {
    const ids = showHours ? DIGIT_IDS : DIGIT_IDS.slice(2);
    // Structure changed (hours appeared/disappeared): repaint without animating.
    const structural = rendered.current.length !== digits.length;
    ids.forEach((id, index) => {
      const next = digits[index] ?? '0';
      const digit = handles.current[id];
      if (!digit) return;
      if (structural || digit.value === '' || digit.value === next || !animate) setInstant(id, next);
      else flip(id, next);
    });
    rendered.current = digits;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [digits, animate, showHours]);

  // Never leave flaps behind when the component unmounts mid-flip.
  useEffect(() => () => {
    Object.values(handles.current).forEach((digit) => { if (digit?.timeout) window.clearTimeout(digit.timeout); });
  }, []);

  const digit = (id: DigitId) => (
    <div className="flip-digit" ref={bindDigit(id)} aria-hidden="true">
      <div className="flip-half top"><div className="val">0</div></div>
      <div className="flip-half bottom"><div className="val">0</div></div>
    </div>
  );

  return (
    <div ref={rootRef} className={`flip-clock${showHours ? ' with-hours' : ''}`} role="timer" aria-live="off" aria-label={label}>
      {showHours && <div className="flip-group">{digit('h1')}{digit('h0')}</div>}
      {showHours && <span className="flip-colon" aria-hidden="true">:</span>}
      <div className="flip-group">{digit('m1')}{digit('m0')}</div>
      <span className="flip-colon" aria-hidden="true">:</span>
      <div className="flip-group">{digit('s1')}{digit('s0')}</div>
    </div>
  );
}
