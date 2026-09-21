/** Core domain types for PREPTRACK. */

// ---------- Syllabus hierarchy ----------
export interface Paper {
  id: string;
  title: string;
  code: string | null;
  description: string;
  category: 'prelims' | 'mains' | 'optional';
  isOptional: boolean;
  weightage: number;
  order: number;
}
export interface Subject {
  id: string;
  paperId: string;
  title: string;
  description: string;
  weightage: number;
  order: number;
}
export interface Chapter {
  id: string;
  subjectId: string;
  title: string;
  description: string;
  weightage: number;
  order: number;
}
export interface Topic {
  id: string;
  chapterId: string;
  title: string;
  description: string;
  weightage: number;
  order: number;
}
export interface Subtopic {
  id: string;
  topicId: string;
  title: string;
  description: string;
  weightage: number;
  order: number;
}

export type ItemType = 'paper' | 'subject' | 'chapter' | 'topic' | 'subtopic';

/** Per-item user progress record. */
export type ItemStatus = 'not_started' | 'in_progress' | 'completed';
export type Confidence = 1 | 2 | 3;

export interface ItemProgress {
  itemId: string;
  itemType: ItemType;
  status: ItemStatus;
  /** R-count: 0..5 (R1..R5). */
  revisionCount: number;
  confidence: Confidence | 0;
  lastRevisedAt: string | null;
  nextRevisionAt: string | null;
  /** Short notes in markdown-ish plain text. */
  notes: string;
  /** Comma tags for cross-linking (e.g. "prelims,mains"). */
  tags: string[];
  updatedAt: string;
}

// ---------- Tasks ----------
export type TaskStatus = 'upcoming' | 'in_progress' | 'completed';
export type Priority = 'low' | 'normal' | 'high' | 'critical';
export type PriorityBucket =
  | 'prelims_critical'
  | 'prelims_mains'
  | 'mains_heavy'
  | 'csat'
  | 'optional'
  | 'current_affairs'
  | 'general'
  | null;

export interface Task {
  id: string;
  name: string;
  /** Paper/subject mapping label e.g. "GS-I", "Geography Optional". */
  subjectMapping: string;
  syllabusContext: string | null;
  /** R0..R5 study stage. */
  studyStage: 'R0' | 'R1' | 'R2' | 'R3' | 'R4' | 'R5';
  source: string | null;
  priority: Priority;
  priorityBucket: PriorityBucket;
  deadline: string; // yyyy-MM-dd
  completedAt: string | null;
  status: TaskStatus;
  /** Planned start time HH:MM. */
  startTime: string | null;
  endTime: string | null;
  /** Estimated minutes. */
  estimateMin: number | null;
  linkedTopicId: string | null;
  linkedSubtopicId: string | null;
  notes: string;
  createdAt: string;
  /** Google-calendar style event, shows in Calendar. */
  isEvent?: boolean;
}

// ---------- Revision ----------
export interface RevisionLog {
  id: string;
  itemId: string;
  itemType: ItemType;
  /** R number performed (1..5). */
  revisionNumber: number;
  confidence: Confidence;
  revisedAt: string;
  notes: string;
}

// ---------- PYQs ----------
export interface PYQ {
  id: string;
  /** e.g. "Prelims 2024", "Mains GS1 2023". */
  exam: string;
  year: number;
  paper: string;
  question: string;
  /** Attempt state: not_attempted | attempted | mastered */
  result: 'not_attempted' | 'attempted' | 'mastered';
  topicId: string | null;
  notes: string;
  attemptedAt: string | null;
  createdAt: string;
}

// ---------- Tests ----------
export interface PrelimsTest {
  id: string;
  testName: string;
  testDate: string; // yyyy-MM-dd
  totalQuestions: number;
  attempted: number;
  correct: number;
  incorrect: number;
  score: number;
  maxScore: number;
  timeTakenMinutes: number | null;
  testType: 'Full Mock' | 'Sectional' | 'PYQ' | 'CSAT' | 'Mini';
  notes: string;
  createdAt: string;
}

export interface MainsTest {
  id: string;
  testName: string;
  testDate: string; // yyyy-MM-dd
  paper: string;
  questionNumber: string | null;
  marksObtained: number;
  maxMarks: number;
  timeTakenMinutes: number | null;
  wordCount: number | null;
  testType: 'Full Mock' | 'Sectional' | 'Practice' | 'Essay';
  notes: string;
  createdAt: string;
}

// ---------- Focus sessions ----------
export interface FocusSession {
  id: string;
  startedAt: string;
  /** minutes (fractional ok). */
  durationMinutes: number;
  taskName: string;
  /** pomodoro | deep | revision */
  sessionType: 'focus' | 'break';
  completed: boolean;
}

// ---------- Habits ----------
export interface Habit {
  id: string;
  name: string;
  color: string;
  createdAt: string;
  archived?: boolean;
}
export interface HabitCompletion {
  id: string;
  habitId: string;
  date: string; // yyyy-MM-dd
}

// ---------- Geography Optional lecture tracker ----------
export interface Lecture {
  id: string;
  title: string;
  /** maps to Geography Optional chapter/subject title. */
  subject: string;
  chapter: string;
  /** Current/next lecture pointer retained for backwards compatibility. */
  lectureNo: number;
  totalLectures: number;
  /** Inclusive lecture-number range for this series. */
  rangeStart: number;
  rangeEnd: number;
  /** Individual lecture numbers completed inside the range. */
  completedLectures: number[];
  /** source platform/institute e.g. "Unacademy — Sumit Sir" */
  source: string;
  /** PDF/booklet followed. */
  pdfFollowed: string;
  shortNotesMade: boolean;
  notesLink: string;
  revised: boolean;
  revisionCount: number;
  pyqsAttempted: number;
  status: 'not_started' | 'in_progress' | 'completed';
  lastWatchedAt: string | null;
  completedAt: string | null;
  notes: string;
  createdAt: string;
}

// ---------- Current Affairs ----------
export interface CurrentAffairItem {
  id: string;
  date: string; // yyyy-MM-dd
  source: string;
  category: 'Polity' | 'Economy' | 'Environment' | 'S&T' | 'IR' | 'Geography' | 'Society' | 'Security' | 'Art & Culture' | 'Other';
  title: string;
  summary: string;
  /** prelims relevant / mains relevant / both */
  relevance: 'prelims' | 'mains' | 'both' | 'none';
  revised: boolean;
  revisionCount: number;
  topicId: string | null;
  notes: string;
  createdAt: string;
}

// ---------- Answer writing ----------
export interface AnswerEntry {
  id: string;
  date: string;
  question: string;
  paper: string;
  /** words written. */
  wordCount: number | null;
  /** self/peer score. */
  marksObtained: number | null;
  maxMarks: number | null;
  timeTakenMinutes: number | null;
  /** intro | body | conclusion | structure | examples | data */
  strengths: string[];
  improvements: string[];
  notes: string;
  createdAt: string;
}

// ---------- Settings ----------
export interface Settings {
  targetExamYear: number;
  optional: string;
  theme: 'dark' | 'light';
  dailyTargetMinutes: number;
  autoRevisionSchedule: boolean;
  defaultPaperFilter: string | null;
}

/** Root database shape persisted in localStorage. */
export interface MupDatabase {
  version: number;
  settings: Settings;
  progress: Record<string, ItemProgress>;
  tasks: Task[];
  revisionLogs: RevisionLog[];
  pyqs: PYQ[];
  prelimsTests: PrelimsTest[];
  mainsTests: MainsTest[];
  focusSessions: FocusSession[];
  habits: Habit[];
  habitCompletions: HabitCompletion[];
  lectures: Lecture[];
  currentAffairs: CurrentAffairItem[];
  answers: AnswerEntry[];
}
