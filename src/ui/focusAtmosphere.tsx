/** Focus Workspace atmosphere — visual theme layer.
 *
 * The palette itself lives in styles.css and is app-native (every `--fc-*`
 * surface and tint derives from the shared design tokens). This layer supplies
 * each atmosphere's signature motion:
 *  - woodland: drifting leaves in three token-green tones across three depth
 *    layers (far ones blurred and slower) with a gentle sway mid-fall,
 *  - rain: two parallax drop layers (thin slow far drops + the original veil)
 *    and a slow mist drift near the ground,
 *  - night: a quiet twinkling starfield plus the occasional shooting star —
 *    a lone streak or a short meteor-shower burst of 2–5.
 *
 * Deliberately scoped: everything renders inside `.focus-workspace` (absolute,
 * not fixed) so no other page is affected, and it stays independent of the
 * soundscape setting — atmosphere is visual, sound is audio.
 */
import React, { useEffect, useMemo, useRef, useState } from 'react';
import type { FocusEnvironment } from './focusTimer';

/* Deterministic-ish pseudo random so re-renders do not reshuffle the sky. */
function seeded(seedBase: number): () => number {
  let seed = seedBase;
  return () => { seed = (seed * 1103515245 + 12345) % 2147483648; return seed / 2147483648; };
}

interface Leaf {
  left: number;
  size: number;
  duration: number;
  delay: number;
  opacity: number;
  drift: number;
  rotation: number;
  sway: number;
  tone: 0 | 1 | 2;
  depth: 0 | 1 | 2;
}

function makeLeaves(count: number, seedBase: number): Leaf[] {
  const rand = seeded(seedBase);
  return Array.from({ length: count }, () => {
    const depth = (Math.floor(rand() * 3) as 0 | 1 | 2); // 0 far → 2 near
    const scale = depth === 0 ? 0.7 : depth === 2 ? 1.15 : 1;
    return {
      left: rand() * 100,
      size: (4 + rand() * 3) * scale,
      duration: (1.9 + rand() * 1.9) * (depth === 0 ? 1.3 : depth === 2 ? 0.85 : 1),
      delay: -rand() * 4,
      opacity: (0.2 + rand() * 0.24) * (depth === 0 ? 0.65 : 1),
      drift: (rand() - 0.5) * 120,
      rotation: 360 + rand() * 720,
      sway: 8 + rand() * 14,
      tone: (Math.floor(rand() * 3) as 0 | 1 | 2),
      depth,
    };
  });
}

interface Raindrop {
  left: number;
  height: number;
  duration: number;
  delay: number;
  opacity: number;
  far: boolean;
}

function makeRaindrops(seedBase: number): Raindrop[] {
  const rand = seeded(seedBase);
  const drop = (far: boolean): Raindrop => ({
    left: rand() * 100,
    height: far ? 16 + rand() * 14 : 30 + rand() * 30,
    duration: far ? 2.8 + rand() * 1.8 : 1.9 + rand() * 1.2,
    delay: -rand() * 4,
    opacity: far ? 0.12 + rand() * 0.1 : 0.2 + rand() * 0.22,
    far,
  });
  return [
    ...Array.from({ length: 55 }, () => drop(true)),
    ...Array.from({ length: 35 }, () => drop(false)),
  ];
}

/** Quiet background stars so the night sky is never empty between meteors. */
interface StarDot {
  left: number;
  top: number;
  size: number;
  opacity: number;
  twinkle: number;
  delay: number;
}

function makeStarfield(count: number, seedBase: number): StarDot[] {
  const rand = seeded(seedBase);
  return Array.from({ length: count }, () => ({
    left: rand() * 100,
    top: rand() * 68,
    size: 1 + rand() * 1.4,
    opacity: 0.12 + rand() * 0.38,
    twinkle: 3 + rand() * 4,
    delay: -rand() * 6,
  }));
}

/** Occasional shooting star for the night theme. */
interface Star {
  key: number;
  left: number;
  top: number;
  width: number;
  duration: number;
  glow: number;
  opacity: number;
  angle: number;
  travelX: number;
  travelY: number;
  color: string;
  /** Stagger inside a meteor-shower burst. */
  delayMs: number;
}

function makeStar(key: number): Star {
  const roll = Math.random();
  const profile = roll < 0.65
    ? { width: 30 + Math.random() * 40, duration: 0.5 + Math.random() * 0.4, glow: 1 + Math.random() * 2, opacity: 0.12 + Math.random() * 0.14, color: '255, 255, 255' }
    : roll < 0.95
      ? { width: 80 + Math.random() * 60, duration: 0.9 + Math.random() * 0.6, glow: 4 + Math.random() * 4, opacity: 0.3 + Math.random() * 0.22, color: '220, 230, 255' }
      : { width: 170 + Math.random() * 140, duration: 1.6 + Math.random() * 1.3, glow: 14 + Math.random() * 10, opacity: 0.62 + Math.random() * 0.18, color: '255, 230, 200' };
  const angle = 10 + Math.random() * 35;
  const distance = 760 + Math.random() * 380;
  return {
    key,
    left: Math.random() * 90 - 10,
    top: Math.random() * 55 - 10,
    angle,
    travelX: distance * Math.cos((angle * Math.PI) / 180),
    travelY: distance * Math.sin((angle * Math.PI) / 180),
    ...profile,
    delayMs: 0,
  };
}

export function FocusAtmosphere({ environment }: { environment: FocusEnvironment }) {
  const leaves = useMemo(() => (environment === 'woodland' ? makeLeaves(22, 7717) : []), [environment]);
  const drops = useMemo(() => (environment === 'rain' ? makeRaindrops(20260521) : []), [environment]);
  const starfield = useMemo(() => (environment === 'night' ? makeStarfield(46, 5150) : []), [environment]);
  const [stars, setStars] = useState<Star[]>([]);
  const reduceMotion = useRef(false);

  useEffect(() => {
    reduceMotion.current = typeof window.matchMedia === 'function'
      && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }, []);

  useEffect(() => {
    if (environment !== 'night' || reduceMotion.current) { setStars([]); return; }
    let cancelled = false;
    const timeouts: number[] = [];
    const later = (fn: () => void, ms: number) => { timeouts.push(window.setTimeout(fn, ms)); };
    const spawn = () => {
      // Alternate lone streaks with short shower bursts of 2–5 meteors.
      const count = Math.random() < 0.5 ? 2 + Math.floor(Math.random() * 4) : 1;
      const batch = Array.from({ length: count }, (_, index) => {
        const star = makeStar(Date.now() + index);
        if (index > 0) {
          star.left = Math.min(92, star.left + index * (4 + Math.random() * 6));
          star.top = Math.min(48, star.top + index * (1 + Math.random() * 3));
          star.delayMs = index * (90 + Math.random() * 220);
        }
        return star;
      });
      setStars(batch);
      const span = Math.max(...batch.map((star) => star.delayMs + star.duration * 1000)) + 220;
      later(() => { if (!cancelled) setStars([]); }, span);
    };
    later(() => { if (!cancelled) { spawn(); } }, 1600 + Math.random() * 2400);
    const loop = () => {
      later(() => {
        if (cancelled) return;
        spawn();
        loop();
      }, 9000 + Math.random() * 7000);
    };
    loop();
    return () => {
      cancelled = true;
      timeouts.forEach((id) => window.clearTimeout(id));
    };
  }, [environment]);

  return (
    <div className="focus-atmosphere-layer" data-environment={environment} aria-hidden="true">
      <div className="focus-glow"><div className="focus-glow-inner" /></div>
      {environment === 'rain' && (
        <div className="rain-veil">
          {drops.map((drop, index) => (
            <span
              key={index}
              className={`rain-drop${drop.far ? ' layer-far' : ''}`}
              style={{
                left: `${drop.left}%`,
                height: `${drop.height}px`,
                animationDuration: `${drop.duration}s`,
                animationDelay: `${drop.delay}s`,
                opacity: drop.opacity,
              }}
            />
          ))}
          <div className="rain-mist">
            <span className="mist-band" />
            <span className="mist-band b" />
          </div>
        </div>
      )}
      {environment === 'woodland' && (
        <div className="leaf-veil">
          {leaves.map((leaf, index) => (
            <span
              key={index}
              className={`particle-leaf tone-${'abc'[leaf.tone]} depth-${leaf.depth}`}
              style={{
                ['--sx' as string]: `${leaf.left}vw`,
                ['--ex' as string]: `${leaf.drift}vw`,
                ['--sway' as string]: `${leaf.sway}px`,
                ['--dur' as string]: `${leaf.duration * 11}s`,
                ['--op' as string]: String(leaf.opacity),
                ['--rot' as string]: `${leaf.rotation}deg`,
                width: `${leaf.size}px`,
                height: `${leaf.size}px`,
                animationDelay: `${-leaf.duration * 9}s`,
              }}
            />
          ))}
        </div>
      )}
      {environment === 'night' && (
        <div className="night-sky">
          {starfield.map((dot, index) => (
            <span
              key={index}
              className="star-dot"
              style={{
                left: `${dot.left}%`,
                top: `${dot.top}%`,
                width: `${dot.size}px`,
                height: `${dot.size}px`,
                ['--tw-op' as string]: String(dot.opacity),
                ['--tw-dur' as string]: `${dot.twinkle}s`,
                ['--tw-delay' as string]: `${dot.delay}s`,
              }}
            />
          ))}
          {stars.map((star) => (
            <span
              key={star.key}
              className="shooting-star"
              style={{
                left: `${star.left}%`,
                top: `${star.top}%`,
                animationDelay: `${star.delayMs}ms`,
                ['--star-width' as string]: `${star.width}px`,
                ['--star-duration' as string]: `${star.duration}s`,
                ['--star-glow' as string]: `${star.glow}px`,
                ['--star-opacity' as string]: String(star.opacity),
                ['--star-angle' as string]: `${star.angle}deg`,
                ['--star-travel-x' as string]: `${star.travelX}px`,
                ['--star-travel-y' as string]: `${star.travelY}px`,
                ['--star-color' as string]: star.color,
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}
