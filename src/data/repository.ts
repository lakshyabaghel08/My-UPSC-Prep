/** ============================================================================
 * Centralized Supabase repository — the ONLY module with cloud I/O.
 * Maps the app's MupDatabase model <-> PostgreSQL tables (snake_case).
 * The store keeps optimistic local state; pushes happen through here.
 * ==========================================================================*/
import type { SupabaseClient } from '@supabase/supabase-js';
import type {
  MupDatabase, Settings, ItemProgress, Task, RevisionLog, PYQ,
  PrelimsTest, MainsTest, FocusSession, Habit, HabitCompletion,
  Lecture, CurrentAffairItem, AnswerEntry, ItemType,
} from '../types';

type Row = Record<string, unknown>;

const iso = (v: unknown): string | null => (typeof v === 'string' && v ? v : null);
const str = (v: unknown, d = ''): string => (typeof v === 'string' ? v : d);
const num = (v: unknown): number | null => (typeof v === 'number' && Number.isFinite(v) ? v : null);
const dateKey = (v: unknown, fallback: string): string => (typeof v === 'string' && v.length >= 10 ? v.slice(0, 10) : fallback);

// ---------------------------------------------------------------- settings
export function settingsToDb(userId: string, s: Settings): Row {
  return {
    id: userId,
    target_exam_year: s.targetExamYear,
    optional: s.optional,
    theme: s.theme,
    daily_target_minutes: s.dailyTargetMinutes,
    auto_revision_schedule: s.autoRevisionSchedule,
    default_paper_filter: s.defaultPaperFilter,
    updated_at: new Date().toISOString(),
  };
}
export function settingsFromDb(r: Row): Partial<Settings> {
  return {
    targetExamYear: (r.target_exam_year as number) ?? 2027,
    optional: str(r.optional, 'Geography'),
    theme: (r.theme as 'dark' | 'light') ?? 'dark',
    dailyTargetMinutes: (r.daily_target_minutes as number) ?? 480,
    autoRevisionSchedule: r.auto_revision_schedule !== false,
    defaultPaperFilter: (r.default_paper_filter as string | null) ?? null,
  };
}

// ---------------------------------------------------------------- progress
export function progressToDb(userId: string, p: ItemProgress): Row {
  return {
    user_id: userId, item_id: p.itemId, item_type: p.itemType, status: p.status,
    revision_count: p.revisionCount, confidence: p.confidence,
    last_revised_at: p.lastRevisedAt, next_revision_at: p.nextRevisionAt,
    notes: p.notes ?? '', tags: p.tags ?? [],
  };
}
export function progressFromDb(r: Row): ItemProgress {
  return {
    itemId: str(r.item_id), itemType: str(r.item_type, 'subtopic') as ItemType,
    status: (str(r.status, 'not_started') as ItemProgress['status']),
    revisionCount: (r.revision_count as number) ?? 0,
    confidence: ((r.confidence as number) ?? 0) as ItemProgress['confidence'],
    lastRevisedAt: iso(r.last_revised_at), nextRevisionAt: iso(r.next_revision_at),
    notes: str(r.notes), tags: Array.isArray(r.tags) ? (r.tags as string[]) : [],
    updatedAt: iso(r.updated_at) ?? new Date().toISOString(),
  };
}

// ---------------------------------------------------------------- tasks
export function taskToDb(userId: string, t: Task): Row {
  return {
    user_id: userId, name: t.name, subject_mapping: t.subjectMapping,
    syllabus_context: t.syllabusContext, study_stage: t.studyStage, source: t.source,
    priority: t.priority, priority_bucket: t.priorityBucket, deadline: t.deadline,
    completed_at: t.completedAt, status: t.status, start_time: t.startTime,
    end_time: t.endTime, estimate_min: t.estimateMin,
    linked_topic_id: t.linkedTopicId, linked_subtopic_id: t.linkedSubtopicId,
    notes: t.notes ?? '', is_event: Boolean(t.isEvent),
    created_at: t.createdAt,
  };
}
export function taskFromDb(r: Row, id: string): Task {
  return {
    id, name: str(r.name), subjectMapping: str(r.subject_mapping),
    syllabusContext: (r.syllabus_context as string | null) ?? null,
    studyStage: (str(r.study_stage, 'R0') as Task['studyStage']),
    source: (r.source as string | null) ?? null,
    priority: (str(r.priority, 'normal') as Task['priority']),
    priorityBucket: (r.priority_bucket as Task['priorityBucket']) ?? null,
    deadline: dateKey(r.deadline, ''), completedAt: iso(r.completed_at),
    status: (str(r.status, 'upcoming') as Task['status']),
    startTime: (r.start_time as string | null) ?? null,
    endTime: (r.end_time as string | null) ?? null,
    estimateMin: num(r.estimate_min),
    linkedTopicId: (r.linked_topic_id as string | null) ?? null,
    linkedSubtopicId: (r.linked_subtopic_id as string | null) ?? null,
    notes: str(r.notes), createdAt: iso(r.created_at) ?? new Date().toISOString(),
    isEvent: Boolean(r.is_event),
  };
}

// ---------------------------------------------------------------- revision logs
export function revLogToDb(userId: string, l: RevisionLog): Row {
  return {
    user_id: userId, item_id: l.itemId, item_type: l.itemType,
    revision_number: l.revisionNumber, confidence: l.confidence,
    revised_at: l.revisedAt, notes: l.notes ?? '',
  };
}
export function revLogFromDb(r: Row, id: string): RevisionLog {
  return {
    id, itemId: str(r.item_id), itemType: str(r.item_type) as RevisionLog['itemType'],
    revisionNumber: (r.revision_number as number) ?? 0,
    confidence: ((r.confidence as number) ?? 2) as RevisionLog['confidence'],
    revisedAt: iso(r.revised_at) ?? new Date().toISOString(), notes: str(r.notes),
  };
}

// ---------------------------------------------------------------- pyqs
export function pyqToDb(userId: string, p: PYQ): Row {
  return {
    user_id: userId, exam: p.exam, year: p.year, paper: p.paper ?? '',
    question: p.question, result: p.result, topic_id: p.topicId,
    notes: p.notes ?? '', attempted_at: p.attemptedAt, created_at: p.createdAt,
  };
}
export function pyqFromDb(r: Row, id: string): PYQ {
  return {
    id, exam: str(r.exam), year: (r.year as number) ?? new Date().getFullYear(),
    paper: str(r.paper), question: str(r.question),
    result: (str(r.result, 'not_attempted') as PYQ['result']),
    topicId: (r.topic_id as string | null) ?? null, notes: str(r.notes),
    attemptedAt: iso(r.attempted_at), createdAt: iso(r.created_at) ?? new Date().toISOString(),
  };
}

// ---------------------------------------------------------------- tests
export function prelimsTestToDb(userId: string, t: PrelimsTest): Row {
  return {
    user_id: userId, test_name: t.testName, test_date: t.testDate,
    total_questions: t.totalQuestions, attempted: t.attempted, correct: t.correct,
    incorrect: t.incorrect, score: t.score, max_score: t.maxScore,
    time_taken_minutes: t.timeTakenMinutes, test_type: t.testType,
    notes: t.notes ?? '', created_at: t.createdAt,
  };
}
export function prelimsTestFromDb(r: Row, id: string): PrelimsTest {
  return {
    id, testName: str(r.test_name), testDate: dateKey(r.test_date, ''),
    totalQuestions: (r.total_questions as number) ?? 100,
    attempted: (r.attempted as number) ?? 0, correct: (r.correct as number) ?? 0,
    incorrect: (r.incorrect as number) ?? 0,
    score: Number(r.score ?? 0), maxScore: Number(r.max_score ?? 200),
    timeTakenMinutes: num(r.time_taken_minutes),
    testType: (str(r.test_type, 'Full Mock') as PrelimsTest['testType']),
    notes: str(r.notes), createdAt: iso(r.created_at) ?? new Date().toISOString(),
  };
}

export function mainsTestToDb(userId: string, t: MainsTest): Row {
  return {
    user_id: userId, test_name: t.testName, test_date: t.testDate, paper: t.paper,
    question_number: t.questionNumber, marks_obtained: t.marksObtained,
    max_marks: t.maxMarks, time_taken_minutes: t.timeTakenMinutes,
    word_count: t.wordCount, test_type: t.testType, notes: t.notes ?? '',
    created_at: t.createdAt,
  };
}
export function mainsTestFromDb(r: Row, id: string): MainsTest {
  return {
    id, testName: str(r.test_name), testDate: dateKey(r.test_date, ''),
    paper: str(r.paper, 'GS1'), questionNumber: (r.question_number as string | null) ?? null,
    marksObtained: Number(r.marks_obtained ?? 0), maxMarks: Number(r.max_marks ?? 250),
    timeTakenMinutes: num(r.time_taken_minutes), wordCount: num(r.word_count),
    testType: (str(r.test_type, 'Sectional') as MainsTest['testType']),
    notes: str(r.notes), createdAt: iso(r.created_at) ?? new Date().toISOString(),
  };
}

// ---------------------------------------------------------------- focus sessions
export function focusToDb(userId: string, s: FocusSession): Row {
  return {
    user_id: userId, started_at: s.startedAt, duration_minutes: s.durationMinutes,
    task_name: s.taskName, session_type: s.sessionType, completed: s.completed,
  };
}
export function focusFromDb(r: Row, id: string): FocusSession {
  return {
    id, startedAt: iso(r.started_at) ?? new Date().toISOString(),
    durationMinutes: Number(r.duration_minutes ?? 0), taskName: str(r.task_name, 'Focus study'),
    sessionType: (str(r.session_type, 'focus') as FocusSession['sessionType']),
    completed: r.completed !== false,
  };
}

// ---------------------------------------------------------------- habits
export function habitToDb(userId: string, h: Habit): Row {
  return { user_id: userId, name: h.name, color: h.color, archived: Boolean(h.archived), created_at: h.createdAt };
}
export function habitFromDb(r: Row, id: string): Habit {
  return { id, name: str(r.name), color: str(r.color, '#6d8cff'), createdAt: iso(r.created_at) ?? new Date().toISOString(), archived: Boolean(r.archived) };
}
export function habitCompToDb(userId: string, c: HabitCompletion): Row {
  return { user_id: userId, habit_id: c.habitId, date: c.date };
}
export function habitCompFromDb(r: Row, id: string): HabitCompletion {
  return { id, habitId: str(r.habit_id), date: dateKey(r.date, '') };
}

// ---------------------------------------------------------------- lectures
export function lectureToDb(userId: string, l: Lecture): Row {
  return {
    user_id: userId, title: l.title, subject: l.subject, chapter: l.chapter ?? '',
    lecture_no: l.lectureNo, total_lectures: l.totalLectures, source: l.source ?? '',
    pdf_followed: l.pdfFollowed ?? '', short_notes_made: l.shortNotesMade,
    notes_link: l.notesLink ?? '', revised: l.revised, revision_count: l.revisionCount,
    pyqs_attempted: l.pyqsAttempted, status: l.status,
    last_watched_at: l.lastWatchedAt, completed_at: l.completedAt,
    notes: l.notes ?? '', created_at: l.createdAt,
  };
}
export function lectureFromDb(r: Row, id: string): Lecture {
  return {
    id, title: str(r.title), subject: str(r.subject), chapter: str(r.chapter),
    lectureNo: (r.lecture_no as number) ?? 1, totalLectures: (r.total_lectures as number) ?? 1,
    source: str(r.source), pdfFollowed: str(r.pdf_followed),
    shortNotesMade: Boolean(r.short_notes_made), notesLink: str(r.notes_link),
    revised: Boolean(r.revised), revisionCount: (r.revision_count as number) ?? 0,
    pyqsAttempted: (r.pyqs_attempted as number) ?? 0,
    status: (str(r.status, 'not_started') as Lecture['status']),
    lastWatchedAt: iso(r.last_watched_at), completedAt: iso(r.completed_at),
    notes: str(r.notes), createdAt: iso(r.created_at) ?? new Date().toISOString(),
  };
}

// ---------------------------------------------------------------- current affairs
export function caToDb(userId: string, c: CurrentAffairItem): Row {
  return {
    user_id: userId, date: c.date, source: c.source ?? '', category: c.category,
    title: c.title, summary: c.summary ?? '', relevance: c.relevance,
    revised: c.revised, revision_count: c.revisionCount, topic_id: c.topicId,
    notes: c.notes ?? '', created_at: c.createdAt,
  };
}
export function caFromDb(r: Row, id: string): CurrentAffairItem {
  return {
    id, date: dateKey(r.date, ''), source: str(r.source),
    category: (str(r.category, 'Other') as CurrentAffairItem['category']),
    title: str(r.title), summary: str(r.summary),
    relevance: (str(r.relevance, 'both') as CurrentAffairItem['relevance']),
    revised: Boolean(r.revised), revisionCount: (r.revision_count as number) ?? 0,
    topicId: (r.topic_id as string | null) ?? null, notes: str(r.notes),
    createdAt: iso(r.created_at) ?? new Date().toISOString(),
  };
}

// ---------------------------------------------------------------- answers
export function answerToDb(userId: string, a: AnswerEntry): Row {
  return {
    user_id: userId, date: a.date, question: a.question, paper: a.paper ?? 'GS1',
    word_count: a.wordCount, marks_obtained: a.marksObtained, max_marks: a.maxMarks,
    time_taken_minutes: a.timeTakenMinutes, strengths: a.strengths ?? [],
    improvements: a.improvements ?? [], notes: a.notes ?? '', created_at: a.createdAt,
  };
}
export function answerFromDb(r: Row, id: string): AnswerEntry {
  return {
    id, date: dateKey(r.date, ''), question: str(r.question), paper: str(r.paper, 'GS1'),
    wordCount: num(r.word_count), marksObtained: num(r.marks_obtained), maxMarks: num(r.max_marks),
    timeTakenMinutes: num(r.time_taken_minutes),
    strengths: Array.isArray(r.strengths) ? (r.strengths as string[]) : [],
    improvements: Array.isArray(r.improvements) ? (r.improvements as string[]) : [],
    notes: str(r.notes), createdAt: iso(r.created_at) ?? new Date().toISOString(),
  };
}

// ============================================================================
// Repository
// ============================================================================
export interface EntityCounts { [entity: string]: number }

export class Repository {
  constructor(private sb: SupabaseClient, private userId: string) {}

  private async selectAll(table: string, order?: string): Promise<Row[]> {
    let q = this.sb.from(table).select('*');
    if (order) q = q.order(order, { ascending: false });
    q = q.limit(10000);
    const { data, error } = await q;
    if (error) throw new Error(`${table}: ${error.message}`);
    return (data ?? []) as Row[];
  }

  /** Pull every cloud record for this user as a partial MupDatabase. */
  async pullAll(): Promise<Partial<MupDatabase> & { counts: EntityCounts }> {
    const [profiles, progressRows, revRows, taskRows, pyqRows, pTestRows, mTestRows, focusRows, habitRows, hcRows, lectureRows, caRows, answerRows] =
      await Promise.all([
        this.sb.from('profiles').select('*').eq('id', this.userId).maybeSingle(),
        this.selectAll('syllabus_progress'),
        this.selectAll('revision_logs', 'revised_at'),
        this.selectAll('tasks', 'created_at'),
        this.selectAll('pyqs', 'created_at'),
        this.selectAll('prelims_tests', 'created_at'),
        this.selectAll('mains_tests', 'created_at'),
        this.selectAll('focus_sessions', 'started_at'),
        this.selectAll('habits'),
        this.selectAll('habit_completions'),
        this.selectAll('lectures', 'created_at'),
        this.selectAll('current_affairs', 'created_at'),
        this.selectAll('answers', 'created_at'),
      ]);

    const progress: Record<string, ItemProgress> = {};
    for (const r of progressRows) { const p = progressFromDb(r); progress[p.itemId] = p; }

    const out: Partial<MupDatabase> & { counts: EntityCounts } = {
      counts: {
        progress: progressRows.length, revisionLogs: revRows.length, tasks: taskRows.length,
        pyqs: pyqRows.length, prelimsTests: pTestRows.length, mainsTests: mTestRows.length,
        focusSessions: focusRows.length, habits: habitRows.length, habitCompletions: hcRows.length,
        lectures: lectureRows.length, currentAffairs: caRows.length, answers: answerRows.length,
      },
      progress,
      revisionLogs: revRows.map((r, i) => revLogFromDb(r, String(r.id ?? i))),
      tasks: taskRows.map((r) => taskFromDb(r, String(r.id))),
      pyqs: pyqRows.map((r) => pyqFromDb(r, String(r.id))),
      prelimsTests: pTestRows.map((r) => prelimsTestFromDb(r, String(r.id))),
      mainsTests: mTestRows.map((r) => mainsTestFromDb(r, String(r.id))),
      focusSessions: focusRows.map((r) => focusFromDb(r, String(r.id))),
      habits: habitRows.map((r) => habitFromDb(r, String(r.id))),
      habitCompletions: hcRows.map((r) => habitCompFromDb(r, String(r.id))),
      lectures: lectureRows.map((r) => lectureFromDb(r, String(r.id))),
      currentAffairs: caRows.map((r) => caFromDb(r, String(r.id))),
      answers: answerRows.map((r) => answerFromDb(r, String(r.id))),
    };
    if (profiles.data) {
      out.settings = settingsFromDb(profiles.data as Row) as Settings;
    }
    return out;
  }

  // ------------------------------------------------------------ single pushes
  async upsertSettings(s: Settings) {
    const { error } = await this.sb.from('profiles').upsert(settingsToDb(this.userId, s));
    if (error) throw new Error(`profiles: ${error.message}`);
  }

  async upsertProgress(items: ItemProgress[]) {
    if (!items.length) return;
    const { error } = await this.sb.from('syllabus_progress')
      .upsert(items.map((p) => progressToDb(this.userId, p)), { onConflict: 'user_id,item_id' });
    if (error) throw new Error(`syllabus_progress: ${error.message}`);
  }

  async insertRevisionLogs(logs: RevisionLog[]) {
    if (!logs.length) return;
    const { error } = await this.sb.from('revision_logs').insert(logs.map((l) => revLogToDb(this.userId, l)));
    if (error) throw new Error(`revision_logs: ${error.message}`);
  }

  /** Insert rows and return server-generated ids in the same order. */
  private async insertReturningIds(table: string, rows: Row[]): Promise<string[]> {
    if (!rows.length) return [];
    const { data, error } = await this.sb.from(table).insert(rows).select('id');
    if (error) throw new Error(`${table}: ${error.message}`);
    return (data ?? []).map((d: Row) => String(d.id));
  }

  async insertTasksAndGetIds(tasks: Task[]) { return this.insertReturningIds('tasks', tasks.map((t) => taskToDb(this.userId, t))); }
  async insertPyqsAndGetIds(pyqs: PYQ[]) { return this.insertReturningIds('pyqs', pyqs.map((p) => pyqToDb(this.userId, p))); }
  async insertPrelimsTestsAndGetIds(tests: PrelimsTest[]) { return this.insertReturningIds('prelims_tests', tests.map((t) => prelimsTestToDb(this.userId, t))); }
  async insertMainsTestsAndGetIds(tests: MainsTest[]) { return this.insertReturningIds('mains_tests', tests.map((t) => mainsTestToDb(this.userId, t))); }
  async insertLecturesAndGetIds(lects: Lecture[]) { return this.insertReturningIds('lectures', lects.map((l) => lectureToDb(this.userId, l))); }
  async insertCurrentAffairsAndGetIds(items: CurrentAffairItem[]) { return this.insertReturningIds('current_affairs', items.map((c) => caToDb(this.userId, c))); }
  async insertAnswersAndGetIds(items: AnswerEntry[]) { return this.insertReturningIds('answers', items.map((a) => answerToDb(this.userId, a))); }
  async insertHabitsAndGetIds(habits: Habit[]) { return this.insertReturningIds('habits', habits.map((h) => habitToDb(this.userId, h))); }
  async insertFocusSessionsAndGetIds(sessions: FocusSession[]) { return this.insertReturningIds('focus_sessions', sessions.map((s) => focusToDb(this.userId, s))); }

  async updateTask(id: string, t: Task) {
    const { error } = await this.sb.from('tasks').update(taskToDb(this.userId, t)).eq('id', id);
    if (error) throw new Error(`tasks: ${error.message}`);
  }
  async deleteRow(table: string, id: string) {
    const { error } = await this.sb.from(table).delete().eq('id', id);
    if (error) throw new Error(`${table}: ${error.message}`);
  }
  async upsertHabitCompletion(c: HabitCompletion) {
    const { error } = await this.sb.from('habit_completions').upsert(habitCompToDb(this.userId, c), { onConflict: 'habit_id,date' });
    if (error) throw new Error(`habit_completions: ${error.message}`);
  }
  async deleteHabitCompletion(c: HabitCompletion) {
    const { error } = await this.sb.from('habit_completions')
      .delete().eq('habit_id', c.habitId).eq('date', c.date);
    if (error) throw new Error(`habit_completions: ${error.message}`);
  }
  async updateLecture(id: string, l: Lecture) {
    const { error } = await this.sb.from('lectures').update(lectureToDb(this.userId, l)).eq('id', id);
    if (error) throw new Error(`lectures: ${error.message}`);
  }
  async updatePYQ(id: string, p: PYQ) {
    const { error } = await this.sb.from('pyqs').update(pyqToDb(this.userId, p)).eq('id', id);
    if (error) throw new Error(`pyqs: ${error.message}`);
  }
  async updateCurrentAffair(id: string, c: CurrentAffairItem) {
    const { error } = await this.sb.from('current_affairs').update(caToDb(this.userId, c)).eq('id', id);
    if (error) throw new Error(`current_affairs: ${error.message}`);
  }
  async updateAnswer(id: string, a: AnswerEntry) {
    const { error } = await this.sb.from('answers').update(answerToDb(this.userId, a)).eq('id', id);
    if (error) throw new Error(`answers: ${error.message}`);
  }
  async updatePrelimsTest(id: string, t: PrelimsTest) {
    const { error } = await this.sb.from('prelims_tests').update(prelimsTestToDb(this.userId, t)).eq('id', id);
    if (error) throw new Error(`prelims_tests: ${error.message}`);
  }
  async updateMainsTest(id: string, t: MainsTest) {
    const { error } = await this.sb.from('mains_tests').update(mainsTestToDb(this.userId, t)).eq('id', id);
    if (error) throw new Error(`mains_tests: ${error.message}`);
  }

  // ------------------------------------------------------------ bulk migration
  /** One-shot import of a local database into the account (Phase 6).
   * Habits are created first; completions are re-pointed to the new uuids.
   * Returns localId -> remoteId maps for every uuid-keyed entity so the store
   * can remap local records to their cloud identity after a successful run. */
  async migrateFromLocal(db: MupDatabase, onStep?: (msg: string, pct: number) => void): Promise<{
    habitIdMap: Record<string, string>;
    taskIdMap: Record<string, string>;
    pyqIdMap: Record<string, string>;
    prelimsTestIdMap: Record<string, string>;
    mainsTestIdMap: Record<string, string>;
    lectureIdMap: Record<string, string>;
    currentAffairIdMap: Record<string, string>;
    answerIdMap: Record<string, string>;
  }> {
    const zip = (keys: string[], ids: string[]) => {
      const map: Record<string, string> = {};
      keys.forEach((k, i) => { if (ids[i]) map[k] = ids[i]; });
      return map;
    };
    const step = (msg: string, pct: number) => onStep?.(msg, pct);

    step('Uploading settings…', 4);
    await this.upsertSettings(db.settings);

    step('Uploading syllabus progress…', 10);
    const progressItems = Object.values(db.progress);
    for (let i = 0; i < progressItems.length; i += 200) {
      await this.upsertProgress(progressItems.slice(i, i + 200));
      step(`Syllabus progress ${Math.min(i + 200, progressItems.length)}/${progressItems.length}…`, 10 + (i / Math.max(1, progressItems.length)) * 20);
    }

    step('Uploading revision log…', 30);
    await this.insertRevisionLogs(db.revisionLogs);

    step('Uploading habits…', 38);
    const habitIdMap = zip(db.habits.map((h) => h.id), await this.insertHabitsAndGetIds(db.habits));

    step('Uploading habit completions…', 46);
    const completions = db.habitCompletions
      .map((c) => ({ ...c, habitId: habitIdMap[c.habitId] ?? c.habitId }))
      .filter((c) => habitIdMap[c.habitId]);
    for (let i = 0; i < completions.length; i += 200) {
      const { error } = await this.sb.from('habit_completions')
        .insert(completions.slice(i, i + 200).map((c) => habitCompToDb(this.userId, c)));
      if (error) throw new Error(`habit_completions: ${error.message}`);
    }

    step('Uploading tasks…', 54);
    const taskIdMap = zip(db.tasks.map((t) => t.id), await this.insertTasksAndGetIds(db.tasks));
    step('Uploading PYQs…', 62);
    const pyqIdMap = zip(db.pyqs.map((p) => p.id), await this.insertPyqsAndGetIds(db.pyqs));
    step('Uploading tests…', 70);
    const prelimsTestIdMap = zip(db.prelimsTests.map((t) => t.id), await this.insertPrelimsTestsAndGetIds(db.prelimsTests));
    const mainsTestIdMap = zip(db.mainsTests.map((t) => t.id), await this.insertMainsTestsAndGetIds(db.mainsTests));
    step('Uploading focus sessions…', 78);
    await this.insertFocusSessionsAndGetIds(db.focusSessions);
    step('Uploading Geography lectures…', 84);
    const lectureIdMap = zip(db.lectures.map((l) => l.id), await this.insertLecturesAndGetIds(db.lectures));
    step('Uploading current affairs…', 90);
    const currentAffairIdMap = zip(db.currentAffairs.map((c) => c.id), await this.insertCurrentAffairsAndGetIds(db.currentAffairs));
    step('Uploading answer log…', 96);
    const answerIdMap = zip(db.answers.map((a) => a.id), await this.insertAnswersAndGetIds(db.answers));

    step('Migration complete ✓', 100);
    return { habitIdMap, taskIdMap, pyqIdMap, prelimsTestIdMap, mainsTestIdMap, lectureIdMap, currentAffairIdMap, answerIdMap };
  }
}
