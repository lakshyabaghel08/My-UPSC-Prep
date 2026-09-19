let counter = 0;

/** Time-sortable unique id, prefixed per entity. */
export function uid(prefix = 'id'): string {
  counter = (counter + 1) % 100000;
  return `${prefix}-${Date.now().toString(36)}-${counter.toString(36)}${Math.random().toString(36).slice(2, 6)}`;
}

export function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}

export function pct(part: number, total: number): number {
  return total > 0 ? Math.round((part / total) * 100) : 0;
}

export function dedupe<T>(arr: T[]): T[] {
  return [...new Set(arr)];
}
