/** Three-state preparation progress.
 *
 * Every preparation/progress control in the app stores one of three real
 * states — `todo`, `in_progress`, `completed` — and cycles
 * To Do → In Progress → Completed → To Do. Nothing here is cosmetic: the value
 * is what gets persisted (localStorage and `syllabus_progress.status`).
 *
 * Storage compatibility: `not_started` is the token already used by the shipped
 * schema (its CHECK constraint lists `not_started`), so `todo` and
 * `not_started` are the same state. `normalizeItemStatus` accepts both plus the
 * legacy binary values (false → todo, true → completed) so older records and
 * backups migrate without losing meaning. Unrelated boolean settings elsewhere
 * in the app are untouched.
 */
import type { ItemProgress, ItemStatus } from '../types';

/** Canonical stored tokens. `todo` is written as `not_started` for schema parity. */
export const PROGRESS_STATES: ItemStatus[] = ['not_started', 'in_progress', 'completed'];

export const PROGRESS_LABEL: Record<ItemStatus, string> = {
  not_started: 'To Do',
  in_progress: 'In Progress',
  completed: 'Completed',
};

/** Next state in the To Do → In Progress → Completed → To Do cycle. */
export function nextProgressState(status: ItemStatus | undefined): ItemStatus {
  if (status === 'not_started') return 'in_progress';
  if (status === 'in_progress') return 'completed';
  return 'not_started';
}

/** Map any persisted/legacy value onto one of the three real states. */
export function normalizeItemStatus(value: unknown): ItemStatus {
  if (value === true || value === 'completed' || value === 'complete' || value === 'done') return 'completed';
  if (value === 'in_progress' || value === 'partial' || value === 'started') return 'in_progress';
  if (value === false || value === 'todo' || value === 'not_started' || value == null) return 'not_started';
  return 'not_started';
}

/** Migrate a whole progress map (binary-era records → three-state). */
export function migrateProgress(progress: Record<string, ItemProgress> | undefined): Record<string, ItemProgress> {
  const out: Record<string, ItemProgress> = {};
  for (const [itemId, record] of Object.entries(progress ?? {})) {
    if (!record || typeof record !== 'object') continue;
    out[itemId] = { ...record, status: normalizeItemStatus(record.status) };
  }
  return out;
}
