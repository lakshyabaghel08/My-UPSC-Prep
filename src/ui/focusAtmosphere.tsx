/** Focus Workspace atmosphere — visual theme layer.
 *
 * Adapted from the reference theme implementation in
 * `reference/witherwood/index`: a per-theme gradient + ambient glow on the
 * workspace, drifting particles (woodland), a soft rain veil (rain) and the
 * occasional shooting star (night), plus the `--fc-*` custom properties that
 * dress the flip clock's top/bottom cards, split line, border and shadow.
 *
 * Deliberately scoped: everything renders inside `.focus-workspace` (absolute,
 * not fixed) so no other page is affected, and it stays independent of the
 * soundscape setting — atmosphere is visual, sound is audio.
 */
import React, { useEffect, useMemo, useRef } from 'react';
import type { FocusEnvironment } from './focusTimer';

interface Particle {
  left: number;
  height: number;
  duration: number;
  delay: number;
  opacity: number;
  /** woodland only */
  drift: number;
  rotation: number;
  size: number;
}

function makeParticles(count: number, seedBase: number): Particle[] {
  // Deterministic-ish pseudo random so re-renders do not reshuffle the sky.
  let seed = seedBase;
  const rand = () => { seed = (seed * 1103515245 + 12345) % 2147483648; return seed / 2147483648; };
  return Array.from({ length: count }, () => ({
    left: rand() * 100,
    height: 26 + rand() * 34,
    duration: 1.9 + rand() * 1.9,
    delay: -rand() * 4,
    opacity: 0.2 + rand() * 0.24,
    drift: (rand() - 0.5) * 120,
    rotation: 360 + rand() * 720,
    size: 4 + rand() * 3,
  }));
}

/** Rare, calm shooting star for the night theme. */
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
  };
}

export function FocusAtmosphere({ environment }: { environment: FocusEnvironment }) {
  const particles = useMemo(
    () => (environment === 'rain' ? makeParticles(90, 20260521) : environment === 'woodland' ? makeParticles(14, 7717) : []),
    [environment],
  );
  const [star, setStar] = React.useState<Star | null>(null);
  const timer = useRef<number | undefined>(undefined);
  const reduceMotion = useRef(false);

  useEffect(() => {
    reduceMotion.current = typeof window.matchMedia === 'function'
      && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }, []);

  useEffect(() => {
    if (environment !== 'night' || reduceMotion.current) { setStar(null); return; }
    let cancelled = false;
    const schedule = () => {
      timer.current = window.setTimeout(() => {
        if (cancelled) return;
        const next = makeStar(Date.now());
        setStar(next);
        window.setTimeout(() => { if (!cancelled) setStar(null); }, next.duration * 1000 + 220);
        schedule();
      }, 14000 + Math.random() * 11000);
    };
    timer.current = window.setTimeout(() => {
      if (!cancelled) { const first = makeStar(Date.now()); setStar(first); window.setTimeout(() => { if (!cancelled) setStar(null); }, first.duration * 1000 + 220); }
      schedule();
    }, 1600 + Math.random() * 2400);
    return () => {
      cancelled = true;
      if (timer.current) window.clearTimeout(timer.current);
    };
  }, [environment]);

  return (
    <div className="focus-atmosphere-layer" data-environment={environment} aria-hidden="true">
      <div className="focus-glow" />
      {environment === 'rain' && (
        <div className="rain-veil">
          {particles.map((drop, index) => (
            <span
              key={index}
              className="rain-drop"
              style={{
                left: `${drop.left}%`,
                height: `${drop.height}px`,
                animationDuration: `${drop.duration}s`,
                animationDelay: `${drop.delay}s`,
                opacity: drop.opacity,
              }}
            />
          ))}
        </div>
      )}
      {environment === 'woodland' && (
        <div className="leaf-veil">
          {particles.map((leaf, index) => (
            <span
              key={index}
              className="particle-leaf"
              style={{
                ['--sx' as string]: `${leaf.left}vw`,
                ['--ex' as string]: `${leaf.drift}vw`,
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
      {environment === 'night' && star && (
        <div className="night-sky">
          <span
            className="shooting-star"
            style={{
              left: `${star.left}%`,
              top: `${star.top}%`,
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
        </div>
      )}
    </div>
  );
}
