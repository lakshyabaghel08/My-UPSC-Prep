import type { Lecture } from '../types';

export interface LectureRange {
  start: number;
  end: number;
  numbers: number[];
}

/** Parse a strict inclusive numeric range such as `98-113` or `98–113`. */
export function parseLectureRange(value: string): LectureRange | null {
  const match = value.trim().match(/^(\d+)\s*[-–—]\s*(\d+)$/);
  if (!match) return null;
  const start = Number(match[1]);
  const end = Number(match[2]);
  if (!Number.isSafeInteger(start) || !Number.isSafeInteger(end) || start < 0 || end < start) return null;
  // Prevent an accidental malformed input from locking the UI with a huge list.
  if (end - start + 1 > 1000) return null;
  return { start, end, numbers: Array.from({ length: end - start + 1 }, (_, i) => start + i) };
}

export function lectureNumbers(lecture: Lecture): number[] {
  const start = Number.isFinite(lecture.rangeStart) ? lecture.rangeStart : 1;
  const end = Number.isFinite(lecture.rangeEnd) ? lecture.rangeEnd : start + Math.max(1, lecture.totalLectures) - 1;
  return Array.from({ length: Math.max(0, end - start + 1) }, (_, i) => start + i);
}

export function completedLectureNumbers(lecture: Lecture): number[] {
  const numbers = lectureNumbers(lecture);
  const valid = new Set(numbers);
  const explicit = [...new Set(lecture.completedLectures ?? [])].filter((n) => valid.has(n)).sort((a, b) => a - b);
  if (explicit.length) return explicit;
  if (lecture.status === 'completed') return numbers;
  if (lecture.status === 'in_progress') return numbers.slice(0, Math.max(0, (lecture.lectureNo || lecture.rangeStart) - lecture.rangeStart));
  return [];
}

/** Preserve progress for records created before ranges existed. */
export function normalizeLectureProgress<T extends Partial<Lecture>>(lecture: T): T & Pick<Lecture, 'rangeStart' | 'rangeEnd' | 'completedLectures'> {
  const rangeStart = Number.isFinite(lecture.rangeStart) ? Number(lecture.rangeStart) : 1;
  const total = Math.max(1, Number(lecture.totalLectures) || 1);
  const rangeEnd = Number.isFinite(lecture.rangeEnd) && Number(lecture.rangeEnd) >= rangeStart
    ? Number(lecture.rangeEnd)
    : rangeStart + total - 1;
  const all = Array.from({ length: rangeEnd - rangeStart + 1 }, (_, i) => rangeStart + i);
  let completedLectures = Array.isArray(lecture.completedLectures)
    ? [...new Set(lecture.completedLectures.map(Number))].filter((n) => all.includes(n))
    : [];
  if (!completedLectures.length && lecture.status === 'completed') completedLectures = all;
  else if (!completedLectures.length && lecture.status === 'in_progress') {
    const watched = Math.max(0, Math.min(total, (Number(lecture.lectureNo) || 1) - 1));
    completedLectures = all.slice(0, watched);
  }
  return { ...lecture, rangeStart, rangeEnd, completedLectures: completedLectures.sort((a, b) => a - b) };
}

export function lectureProgress(lecture: Lecture) {
  const numbers = lectureNumbers(lecture);
  const completed = completedLectureNumbers(lecture);
  const total = numbers.length;
  const count = completed.length;
  return {
    numbers,
    completed,
    count,
    total,
    remaining: Math.max(0, total - count),
    pct: total ? Math.round((count / total) * 100) : 0,
    next: numbers.find((number) => !completed.includes(number)) ?? null,
  };
}
