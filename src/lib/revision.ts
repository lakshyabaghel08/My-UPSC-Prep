/** Revision spaced-repetition engine — preserves the reference R1–R5 behaviour.
 *
 * Base intervals by revision count (R1..R4+): 3, 7, 21, 45 days.
 * Confidence scales the interval: Low = 50%, Medium = 100%, High = 150%.
 */
export const CONFIDENCE_LABELS = { 1: 'Low', 2: 'Medium', 3: 'High' } as const;

export function baseInterval(revisionCount: number): number {
  switch (revisionCount) {
    case 0: return 0;
    case 1: return 3;
    case 2: return 7;
    case 3: return 21;
    default: return 45;
  }
}

export function scaledInterval(revisionCount: number, confidence: 0 | 1 | 2 | 3): number {
  const base = baseInterval(revisionCount);
  switch (confidence) {
    case 1: return Math.max(1, Math.floor(base * 0.5));
    case 3: return Math.floor(base * 1.5);
    default: return base;
  }
}

export const MAX_REVISION = 5;

export function nextRevisionDate(lastRevised: Date, revisionCount: number, confidence: 0 | 1 | 2 | 3): Date {
  const d = new Date(lastRevised);
  d.setDate(d.getDate() + scaledInterval(revisionCount, confidence));
  d.setHours(0, 0, 0, 0);
  return d;
}

export type RevisionBucket = 'overdue' | 'due_today' | 'upcoming' | 'not_started';

export function revisionBucket(nextRevisionAt: string | null, revisionCount: number, today: Date): RevisionBucket {
  if (revisionCount === 0 || !nextRevisionAt) return 'not_started';
  const t = new Date(today); t.setHours(0, 0, 0, 0);
  const n = new Date(nextRevisionAt); n.setHours(0, 0, 0, 0);
  const diff = Math.floor((n.getTime() - t.getTime()) / 86400000);
  if (diff < 0) return 'overdue';
  if (diff === 0) return 'due_today';
  return 'upcoming';
}

export function rLabel(count: number): string {
  return count === 0 ? 'Not revised' : `R${Math.min(count, MAX_REVISION)}`;
}
