/** Manual study logging — the "I forgot to start the timer" path.
 *
 * A manual log becomes an ordinary completed focus session, so it flows into
 * Study Hours, Today's Study and the weekly/daily analytics without any extra
 * wiring. The application day it lands on follows the shared 4:00 AM rule:
 * `composeManualStartedAt` shifts the instant forward one calendar day when the
 * chosen clock time falls before the boundary, so the log always belongs to the
 * application day the user picked.
 */
import { addDays, applicationDayKey, dateFromKey } from './date';

export interface ManualStudyInput {
  /** Application day the study belongs to (yyyy-MM-dd). */
  date: string;
  /** Optional clock time `HH:MM`; defaults to now (today) or 09:00 (past day). */
  time: string | null;
  durationMinutes: number;
  taskName: string;
}

const TIME_RE = /^([01]?\d|2[0-3]):([0-5]\d)$/;

export function parseClockTime(time: string | null): [number, number] | null {
  if (!time) return null;
  const match = TIME_RE.exec(time.trim());
  if (!match) return null;
  return [Number(match[1]), Number(match[2])];
}

/** Instant whose application day is exactly `day`, at `time` (or a sensible default). */
export function composeManualStartedAt(day: string, time: string | null, now: Date = new Date()): string {
  const parsed = parseClockTime(time);
  const hours = parsed ? parsed[0] : (applicationDayKey(now) === day ? now.getHours() : 9);
  const minutes = parsed ? parsed[1] : (applicationDayKey(now) === day ? now.getMinutes() : 0);

  const build = (key: string): Date => {
    const d = dateFromKey(key);
    d.setHours(hours, minutes, 0, 0);
    return d;
  };
  const candidate = build(day);
  // 00:00–03:59 belongs to the previous application day — move to the next
  // calendar date so the record is filed under the day the user selected.
  return (applicationDayKey(candidate) === day ? candidate : build(addDays(day, 1))).toISOString();
}

/** Human label for the application day a manual log will be filed under. */
export function manualLogApplicationDay(day: string, time: string | null, now: Date = new Date()): string {
  return applicationDayKey(new Date(composeManualStartedAt(day, time, now)));
}
