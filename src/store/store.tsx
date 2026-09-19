/** Central app store: React context wrapping the local DB with mutation actions.
 * Every action produces a new DB object; persistence is debounced in db.ts. */
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type {
  MupDatabase, ItemProgress, ItemType, ItemStatus, Confidence, Task,
  PrelimsTest, MainsTest, FocusSession, Habit, HabitCompletion, Lecture,
  CurrentAffairItem, AnswerEntry, PYQ, RevisionLog, Settings,
} from '../types';
import { loadDb, saveDb } from './db';
import { uid, clamp } from '../lib/id';
import { todayKey } from '../lib/date';
import { MAX_REVISION, nextRevisionDate, revisionBucket } from '../lib/revision';

export interface StoreValue {
  db: MupDatabase;
  setDb: React.Dispatch<React.SetStateAction<MupDatabase>>;
  // progress
  getProgress: (itemId: string) => ItemProgress | undefined;
  setItemStatus: (itemId: string, itemType: ItemType, status: ItemStatus) => void;
  setItemNotes: (itemId: string, itemType: ItemType, notes: string) => void;
  reviseItem: (itemId: string, itemType: ItemType, confidence: Confidence) => void;
  resetRevision: (itemId: string, itemType: ItemType) => void;
  bulkSetStatus: (itemIds: string[], itemType: ItemType, status: ItemStatus) => void;
  // tasks
  addTask: (t: Partial<Task> & { name: string; deadline: string }) => void;
  updateTask: (id: string, patch: Partial<Task>) => void;
  toggleTask: (id: string, completed: boolean) => void;
  deleteTask: (id: string) => void;
  // tests
  addPrelimsTest: (t: Omit<PrelimsTest, 'id' | 'createdAt'>) => void;
  deletePrelimsTest: (id: string) => void;
  addMainsTest: (t: Omit<MainsTest, 'id' | 'createdAt'>) => void;
  deleteMainsTest: (id: string) => void;
  // focus
  addFocusSession: (s: Omit<FocusSession, 'id'>) => void;
  // habits
  addHabit: (name: string, color: string) => void;
  deleteHabit: (id: string) => void;
  toggleHabit: (habitId: string, date: string) => void;
  // lectures
  addLecture: (l: Partial<Lecture> & { title: string; subject: string }) => void;
  updateLecture: (id: string, patch: Partial<Lecture>) => void;
  deleteLecture: (id: string) => void;
  // current affairs
  addCurrentAffair: (c: Partial<CurrentAffairItem> & { title: string }) => void;
  updateCurrentAffair: (id: string, patch: Partial<CurrentAffairItem>) => void;
  deleteCurrentAffair: (id: string) => void;
  // answers
  addAnswer: (a: Partial<AnswerEntry> & { question: string }) => void;
  updateAnswer: (id: string, patch: Partial<AnswerEntry>) => void;
  deleteAnswer: (id: string) => void;
  // pyqs
  addPYQ: (p: Partial<PYQ> & { question: string; exam: string; year: number }) => void;
  updatePYQ: (id: string, patch: Partial<PYQ>) => void;
  deletePYQ: (id: string) => void;
  // settings & meta
  updateSettings: (patch: Partial<Settings>) => void;
  replaceDb: (next: MupDatabase) => void;
  resetProgressOnly: () => void;
}

const StoreContext = createContext<StoreValue | null>(null);

function emptyProgress(itemId: string, itemType: ItemType, now: string): ItemProgress {
  return {
    itemId, itemType, status: 'not_started', revisionCount: 0, confidence: 0,
    lastRevisedAt: null, nextRevisionAt: null, notes: '', tags: [], updatedAt: now,
  };
}

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [db, setDb] = useState<MupDatabase>(() => loadDb());

  useEffect(() => { saveDb(db); }, [db]);

  const getProgress = useCallback((itemId: string) => db.progress[itemId], [db.progress]);

  const upsertProgress = useCallback((itemId: string, itemType: ItemType, patch: Partial<ItemProgress>) => {
    const now = new Date().toISOString();
    setDb((d) => {
      const prev = d.progress[itemId] ?? emptyProgress(itemId, itemType, now);
      return { ...d, progress: { ...d.progress, [itemId]: { ...prev, ...patch, updatedAt: now } } };
    });
  }, []);

  const setItemStatus = useCallback((itemId: string, itemType: ItemType, status: ItemStatus) => {
    const patch: Partial<ItemProgress> = { status };
    // completing a subject/chapter/topic marks the whole branch completed
    upsertProgress(itemId, itemType, patch);
  }, [upsertProgress]);

  const bulkSetStatus = useCallback((itemIds: string[], itemType: ItemType, status: ItemStatus) => {
    const now = new Date().toISOString();
    setDb((d) => {
      const progress = { ...d.progress };
      for (const id of itemIds) {
        const prev = progress[id] ?? emptyProgress(id, itemType, now);
        progress[id] = { ...prev, status, updatedAt: now };
      }
      return { ...d, progress };
    });
  }, []);

  const setItemNotes = useCallback((itemId: string, itemType: ItemType, notes: string) => {
    upsertProgress(itemId, itemType, { notes });
  }, [upsertProgress]);

  const reviseItem = useCallback((itemId: string, itemType: ItemType, confidence: Confidence) => {
    const now = new Date();
    const prevCount = db.progress[itemId]?.revisionCount ?? 0;
    const count = Math.min(MAX_REVISION, prevCount + 1);
    const next = nextRevisionDate(now, count, confidence);
    upsertProgress(itemId, itemType, {
      status: 'completed',
      revisionCount: count,
      confidence,
      lastRevisedAt: now.toISOString(),
      nextRevisionAt: next.toISOString(),
    });
    const log: RevisionLog = {
      id: uid('rev'),
      itemId, itemType, revisionNumber: count, confidence,
      revisedAt: now.toISOString(), notes: '',
    };
    setDb((d) => ({ ...d, revisionLogs: [...d.revisionLogs, log] }));
  }, [db.progress, upsertProgress]);

  const resetRevision = useCallback((itemId: string, itemType: ItemType) => {
    upsertProgress(itemId, itemType, {
      revisionCount: 0, confidence: 0, lastRevisedAt: null, nextRevisionAt: null, status: 'not_started',
    });
  }, [upsertProgress]);

  // ---------- tasks ----------
  const addTask = useCallback((t: Partial<Task> & { name: string; deadline: string }) => {
    const task: Task = {
      id: uid('task'),
      name: t.name,
      subjectMapping: t.subjectMapping ?? '',
      syllabusContext: t.syllabusContext ?? null,
      studyStage: t.studyStage ?? 'R0',
      source: t.source ?? null,
      priority: t.priority ?? 'normal',
      priorityBucket: t.priorityBucket ?? null,
      deadline: t.deadline,
      completedAt: null,
      status: 'upcoming',
      startTime: t.startTime ?? null,
      endTime: t.endTime ?? null,
      estimateMin: t.estimateMin ?? null,
      linkedTopicId: t.linkedTopicId ?? null,
      linkedSubtopicId: t.linkedSubtopicId ?? null,
      notes: t.notes ?? '',
      createdAt: new Date().toISOString(),
      isEvent: t.isEvent ?? false,
    };
    setDb((d) => ({ ...d, tasks: [...d.tasks, task] }));
  }, []);

  const updateTask = useCallback((id: string, patch: Partial<Task>) => {
    setDb((d) => ({ ...d, tasks: d.tasks.map((t) => (t.id === id ? { ...t, ...patch } : t)) }));
  }, []);

  const toggleTask = useCallback((id: string, completed: boolean) => {
    setDb((d) => ({
      ...d,
      tasks: d.tasks.map((t) => (t.id === id ? { ...t, status: completed ? 'completed' : 'upcoming', completedAt: completed ? new Date().toISOString() : null } : t)),
    }));
  }, []);

  const deleteTask = useCallback((id: string) => {
    setDb((d) => ({ ...d, tasks: d.tasks.filter((t) => t.id !== id) }));
  }, []);

  // ---------- tests ----------
  const addPrelimsTest = useCallback((t: Omit<PrelimsTest, 'id' | 'createdAt'>) => {
    const test: PrelimsTest = { ...t, id: uid('pt'), createdAt: new Date().toISOString() };
    setDb((d) => ({ ...d, prelimsTests: [...d.prelimsTests, test] }));
  }, []);
  const deletePrelimsTest = useCallback((id: string) => {
    setDb((d) => ({ ...d, prelimsTests: d.prelimsTests.filter((t) => t.id !== id) }));
  }, []);
  const addMainsTest = useCallback((t: Omit<MainsTest, 'id' | 'createdAt'>) => {
    const test: MainsTest = { ...t, id: uid('mt'), createdAt: new Date().toISOString() };
    setDb((d) => ({ ...d, mainsTests: [...d.mainsTests, test] }));
  }, []);
  const deleteMainsTest = useCallback((id: string) => {
    setDb((d) => ({ ...d, mainsTests: d.mainsTests.filter((t) => t.id !== id) }));
  }, []);

  // ---------- focus ----------
  const addFocusSession = useCallback((s: Omit<FocusSession, 'id'>) => {
    const session: FocusSession = { ...s, id: uid('fs') };
    setDb((d) => ({ ...d, focusSessions: [...d.focusSessions, session] }));
  }, []);

  // ---------- habits ----------
  const addHabit = useCallback((name: string, color: string) => {
    const habit: Habit = { id: uid('hb'), name, color, createdAt: new Date().toISOString() };
    setDb((d) => ({ ...d, habits: [...d.habits, habit] }));
  }, []);
  const deleteHabit = useCallback((id: string) => {
    setDb((d) => ({
      ...d,
      habits: d.habits.filter((h) => h.id !== id),
      habitCompletions: d.habitCompletions.filter((c) => c.habitId !== id),
    }));
  }, []);
  const toggleHabit = useCallback((habitId: string, date: string) => {
    setDb((d) => {
      const existing = d.habitCompletions.find((c) => c.habitId === habitId && c.date === date);
      if (existing) return { ...d, habitCompletions: d.habitCompletions.filter((c) => c.id !== existing.id) };
      const comp: HabitCompletion = { id: uid('hc'), habitId, date };
      return { ...d, habitCompletions: [...d.habitCompletions, comp] };
    });
  }, []);

  // ---------- lectures ----------
  const addLecture = useCallback((l: Partial<Lecture> & { title: string; subject: string }) => {
    const lec: Lecture = {
      id: uid('lec'),
      title: l.title,
      subject: l.subject,
      chapter: l.chapter ?? '',
      lectureNo: l.lectureNo ?? 1,
      totalLectures: l.totalLectures ?? 1,
      source: l.source ?? '',
      pdfFollowed: l.pdfFollowed ?? '',
      shortNotesMade: l.shortNotesMade ?? false,
      notesLink: l.notesLink ?? '',
      revised: l.revised ?? false,
      revisionCount: l.revisionCount ?? 0,
      pyqsAttempted: l.pyqsAttempted ?? 0,
      status: l.status ?? 'not_started',
      lastWatchedAt: l.lastWatchedAt ?? null,
      completedAt: l.completedAt ?? null,
      notes: l.notes ?? '',
      createdAt: new Date().toISOString(),
    };
    setDb((d) => ({ ...d, lectures: [...d.lectures, lec] }));
  }, []);
  const updateLecture = useCallback((id: string, patch: Partial<Lecture>) => {
    setDb((d) => ({ ...d, lectures: d.lectures.map((l) => (l.id === id ? { ...l, ...patch } : l)) }));
  }, []);
  const deleteLecture = useCallback((id: string) => {
    setDb((d) => ({ ...d, lectures: d.lectures.filter((l) => l.id !== id) }));
  }, []);

  // ---------- current affairs ----------
  const addCurrentAffair = useCallback((c: Partial<CurrentAffairItem> & { title: string }) => {
    const item: CurrentAffairItem = {
      id: uid('ca'),
      date: c.date ?? todayKey(),
      source: c.source ?? '',
      category: c.category ?? 'Other',
      title: c.title,
      summary: c.summary ?? '',
      relevance: c.relevance ?? 'both',
      revised: c.revised ?? false,
      revisionCount: c.revisionCount ?? 0,
      topicId: c.topicId ?? null,
      notes: c.notes ?? '',
      createdAt: new Date().toISOString(),
    };
    setDb((d) => ({ ...d, currentAffairs: [...d.currentAffairs, item] }));
  }, []);
  const updateCurrentAffair = useCallback((id: string, patch: Partial<CurrentAffairItem>) => {
    setDb((d) => ({ ...d, currentAffairs: d.currentAffairs.map((c) => (c.id === id ? { ...c, ...patch } : c)) }));
  }, []);
  const deleteCurrentAffair = useCallback((id: string) => {
    setDb((d) => ({ ...d, currentAffairs: d.currentAffairs.filter((c) => c.id !== id) }));
  }, []);

  // ---------- answer writing ----------
  const addAnswer = useCallback((a: Partial<AnswerEntry> & { question: string }) => {
    const entry: AnswerEntry = {
      id: uid('ans'),
      date: a.date ?? todayKey(),
      question: a.question,
      paper: a.paper ?? 'GS1',
      wordCount: a.wordCount ?? null,
      marksObtained: a.marksObtained ?? null,
      maxMarks: a.maxMarks ?? null,
      timeTakenMinutes: a.timeTakenMinutes ?? null,
      strengths: a.strengths ?? [],
      improvements: a.improvements ?? [],
      notes: a.notes ?? '',
      createdAt: new Date().toISOString(),
    };
    setDb((d) => ({ ...d, answers: [...d.answers, entry] }));
  }, []);
  const updateAnswer = useCallback((id: string, patch: Partial<AnswerEntry>) => {
    setDb((d) => ({ ...d, answers: d.answers.map((a) => (a.id === id ? { ...a, ...patch } : a)) }));
  }, []);
  const deleteAnswer = useCallback((id: string) => {
    setDb((d) => ({ ...d, answers: d.answers.filter((a) => a.id !== id) }));
  }, []);

  // ---------- pyqs ----------
  const addPYQ = useCallback((p: Partial<PYQ> & { question: string; exam: string; year: number }) => {
    const pyq: PYQ = {
      id: uid('pyq'),
      exam: p.exam,
      year: clamp(p.year, 1979, 2100),
      paper: p.paper ?? '',
      question: p.question,
      result: p.result ?? 'not_attempted',
      topicId: p.topicId ?? null,
      notes: p.notes ?? '',
      attemptedAt: p.attemptedAt ?? null,
      createdAt: new Date().toISOString(),
    };
    setDb((d) => ({ ...d, pyqs: [...d.pyqs, pyq] }));
  }, []);
  const updatePYQ = useCallback((id: string, patch: Partial<PYQ>) => {
    setDb((d) => ({ ...d, pyqs: d.pyqs.map((p) => (p.id === id ? { ...p, ...patch } : p)) }));
  }, []);
  const deletePYQ = useCallback((id: string) => {
    setDb((d) => ({ ...d, pyqs: d.pyqs.filter((p) => p.id !== id) }));
  }, []);

  // ---------- settings & meta ----------
  const updateSettings = useCallback((patch: Partial<Settings>) => {
    setDb((d) => ({ ...d, settings: { ...d.settings, ...patch } }));
  }, []);
  const replaceDb = useCallback((next: MupDatabase) => setDb(next), []);
  const resetProgressOnly = useCallback(() => {
    setDb((d) => ({ ...d, progress: {}, revisionLogs: [] }));
  }, []);

  const value = useMemo<StoreValue>(() => ({
    db, setDb,
    getProgress, setItemStatus, setItemNotes, reviseItem, resetRevision, bulkSetStatus,
    addTask, updateTask, toggleTask, deleteTask,
    addPrelimsTest, deletePrelimsTest, addMainsTest, deleteMainsTest,
    addFocusSession,
    addHabit, deleteHabit, toggleHabit,
    addLecture, updateLecture, deleteLecture,
    addCurrentAffair, updateCurrentAffair, deleteCurrentAffair,
    addAnswer, updateAnswer, deleteAnswer,
    addPYQ, updatePYQ, deletePYQ,
    updateSettings, replaceDb, resetProgressOnly,
  }), [db, getProgress, setItemStatus, setItemNotes, reviseItem, resetRevision, bulkSetStatus,
    addTask, updateTask, toggleTask, deleteTask,
    addPrelimsTest, deletePrelimsTest, addMainsTest, deleteMainsTest,
    addFocusSession, addHabit, deleteHabit, toggleHabit,
    addLecture, updateLecture, deleteLecture,
    addCurrentAffair, updateCurrentAffair, deleteCurrentAffair,
    addAnswer, updateAnswer, deleteAnswer,
    addPYQ, updatePYQ, deletePYQ,
    updateSettings, replaceDb, resetProgressOnly]);

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore(): StoreValue {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error('useStore must be used within StoreProvider');
  return ctx;
}

/** Convenience: revision bucket for an item, given progress. */
export function itemBucket(itemId: string, db: MupDatabase) {
  const p = db.progress[itemId];
  return revisionBucket(p?.nextRevisionAt ?? null, p?.revisionCount ?? 0, new Date());
}
