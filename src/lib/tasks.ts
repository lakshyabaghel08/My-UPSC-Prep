/** Split Quick Add text into trimmed, non-empty task names. */
export function parseQuickTasks(value: string): string[] {
  return value
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
}
