/**
 * Date helpers — all day keys are local `yyyy-MM-dd` strings.
 *
 * PREPTRACK uses a 4:00 AM application-day boundary. `todayKey` (and its
 * explicit alias `applicationDayKey`) is the single source of truth for that
 * rule: 00:00–03:59 belongs to the previous application day. Calendar-key
 * arithmetic deliberately does not apply the shift a second time.
 */
export const MS_DAY = 86400000;
export const APPLICATION_DAY_START_HOUR = 4;

function localCalendarKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** Return the application day containing this instant (4:00 AM → 3:59 AM). */
export function applicationDayKey(d: Date = new Date()): string {
  const shifted = new Date(d);
  shifted.setHours(shifted.getHours() - APPLICATION_DAY_START_HOUR);
  return localCalendarKey(shifted);
}

/** Backwards-compatible name used throughout the app; now follows 4:00 AM. */
export const todayKey = applicationDayKey;

/** The local instant at which an application day starts. */
export function applicationDayStart(key: string = todayKey()): Date {
  const d = dateFromKey(key);
  d.setHours(APPLICATION_DAY_START_HOUR, 0, 0, 0);
  return d;
}

export function dateFromKey(key: string): Date {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, (m ?? 1) - 1, d ?? 1);
}

export function addDays(key: string | Date, days: number): string {
  const d = typeof key === 'string' ? dateFromKey(key) : new Date(key);
  d.setDate(d.getDate() + days);
  // `d` represents a calendar day here, not an instant to classify.
  return localCalendarKey(d);
}

export function startOfWeek(key: string): string {
  const d = dateFromKey(key);
  d.setDate(d.getDate() - d.getDay()); // week starts Sunday
  return localCalendarKey(d);
}

export function startOfMonth(key: string): string {
  const d = dateFromKey(key);
  return localCalendarKey(new Date(d.getFullYear(), d.getMonth(), 1));
}

export function daysBetween(fromKey: string, toKey: string): number {
  const a = dateFromKey(fromKey).getTime();
  const b = dateFromKey(toKey).getTime();
  return Math.round((b - a) / MS_DAY);
}

export function relDay(key: string, today: string = todayKey()): string {
  const diff = daysBetween(today, key);
  if (diff === 0) return 'Today';
  if (diff === 1) return 'Tomorrow';
  if (diff === -1) return 'Yesterday';
  if (diff < 0) return `${-diff}d overdue`;
  if (diff < 7) return `in ${diff}d`;
  return formatDate(key);
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export function formatDate(key: string): string {
  const d = dateFromKey(key);
  return `${d.getDate()} ${MONTHS[d.getMonth()]}`;
}

export function formatDateLong(key: string): string {
  const d = dateFromKey(key);
  return `${WEEKDAYS[d.getDay()]}, ${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

export const WEEKDAY_LABELS = WEEKDAYS;

export function monthLabel(year: number, month: number): string {
  const FULL = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  return `${FULL[month]} ${year}`;
}

/** Time-of-day greeting for the dashboard header. */
export function greetingFor(d: Date = new Date()): string {
  const hour = d.getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

/** Minutes -> "3h 45m" */
export function fmtDuration(min: number): string {
  const m = Math.round(min);
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  const rem = m % 60;
  return rem ? `${h}h ${rem}m` : `${h}h`;
}

export function fmtClock(totalSec: number): string {
  const s = Math.max(0, Math.round(totalSec));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const mm = String(m).padStart(2, '0');
  const ss = String(sec).padStart(2, '0');
  return h ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
}

/** "HH:MM" -> "9:05 AM" */
export function fmtTime(t: string | null): string {
  if (!t) return '';
  const [h, m] = t.split(':').map(Number);
  const ampm = h >= 12 ? 'PM' : 'AM';
  const hh = h % 12 === 0 ? 12 : h % 12;
  return `${hh}:${String(m ?? 0).padStart(2, '0')} ${ampm}`;
}

export function nowTimeKey(): string {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

/** Streak of consecutive application days with >=1 logged activity. */
export function computeStreak(activeDays: Set<string>, today: string = todayKey()): number {
  let streak = 0;
  let cursor = today;
  // allow the current application day to be inactive without breaking yesterday's streak
  if (!activeDays.has(cursor)) cursor = addDays(cursor, -1);
  while (activeDays.has(cursor)) {
    streak++;
    cursor = addDays(cursor, -1);
  }
  return streak;
}
