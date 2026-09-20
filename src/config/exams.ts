import { daysBetween, todayKey } from '../lib/date';

export interface ExamDates {
  prelims: string;
  mainsCommencement: string;
  sourceLabel: string;
}

/**
 * Official dates from the UPSC Annual Calendar 2027.
 * Keep exam-day configuration here so countdowns and planning never diverge.
 */
export const UPSC_CSE_EXAM_DATES: Readonly<Record<number, ExamDates>> = Object.freeze({
  2027: Object.freeze({
    prelims: '2027-05-23',
    mainsCommencement: '2027-08-20',
    sourceLabel: 'Official UPSC Annual Calendar 2027',
  }),
});

export function examDatesFor(year: number): ExamDates | null {
  return UPSC_CSE_EXAM_DATES[year] ?? null;
}

export function daysUntilExam(date: string, fromDay = todayKey()): number {
  return daysBetween(fromDay, date);
}
