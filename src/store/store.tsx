/** Central app store: React context wrapping the local DB with mutation actions.
 *
 * Architecture (local-first with cloud sync):
 *  - Every mutation updates local state immediately (optimistic, offline-safe).
 *  - When signed in (Supabase), the same mutation is pushed via the centralized
 *    repository (`src/data/repository.ts`); failures queue for retry (online
 *    event / interval) — no silent data loss.
 *  - On sign-in the cloud is pulled and merged (union by id, local wins on
 *    conflicts). First sign-in offers a one-time migration of existing
 *    localStorage data; local data is never deleted.
 */
import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import type {
  MupDatabase, ItemProgress, ItemType, ItemStatus, Confidence, Task,
  PrelimsTest, MainsTest, FocusSession, Habit, HabitCompletion, Lecture,
  CurrentAffairItem, AnswerEntry, PYQ, RevisionLog, Settings,
} from '../types';
import { loadDb, saveDb, newDatabase } from './db';
import { uid, clamp } from '../lib/id';
import { todayKey } from '../lib/date';
import { MAX_REVISION, nextRevisionDate, revisionBucket } from '../lib/revision';
import { getSupabase, isCloudConfigured } from '../lib/supabase';
import { Repository } from '../data/repository';

export type AuthState = 'loading' | 'gate' | 'signed-in' | 'local';
export interface SyncStatus {
  /** queued pushes awaiting retry */
  pending: number;
  syncing: boolean;
  lastError: string | null;
  lastSyncAt: string | null;
}

export interface StoreValue {
  db: MupDatabase;
  setDb: React.Dispatch<React.SetStateAction<MupDatabase>>;
  // cloud / auth
  authState: AuthState;
  syncStatus: SyncStatus;
  accountEmail: string | null;
  migrationPrompt: boolean;
  dismissMigrationPrompt: () => void;
  continueLocal: () => void;
  signIn: (email: string, password: string) => Promise<{ error?: string; needsConfirmation?: boolean }>;
  signUp: (email: string, password: string) => Promise<{ error?: string; needsConfirmation?: boolean }>;
  logout: () => Promise<void>;
  migrateLocalToCloud: (onStep?: (msg: string, pct: number) => void) => Promise<{ ok: boolean; error?: string }>;
  flushSync: () => Promise<void>;
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

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const isUuid = (id: string) => UUID_RE.test(id);
const migratedFlagKey = (userId: string) => `mup.migrated.${userId}`;

function emptyProgress(itemId: string, itemType: ItemType, now: string): ItemProgress {
  return {
    itemId, itemType, status: 'not_started', revisionCount: 0, confidence: 0,
    lastRevisedAt: null, nextRevisionAt: null, notes: '', tags: [], updatedAt: now,
  };
}

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [db, setDb] = useState<MupDatabase>(() => loadDb());
  const dbRef = useRef(db);
  useEffect(() => { dbRef.current = db; saveDb(db); }, [db]);

  const [authState, setAuthState] = useState<AuthState>(() => (isCloudConfigured ? 'loading' : 'local'));
  const [accountEmail, setAccountEmail] = useState<string | null>(null);
  const [migrationPrompt, setMigrationPrompt] = useState(false);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>({ pending: 0, syncing: false, lastError: null, lastSyncAt: null });

  const repoRef = useRef<Repository | null>(null);
  const userIdRef = useRef<string | null>(null);
  const pendingOps = useRef<Map<string, () => Promise<void>>>(new Map());
  const progressDirty = useRef<Set<string>>(new Set());
  const progressTimer = useRef<number | undefined>(undefined);
  const settingsTimer = useRef<number | undefined>(undefined);

  const repo = useCallback((): Repository | null => {
    if (authState !== 'signed-in' || !isCloudConfigured || !userIdRef.current) return null;
    if (!repoRef.current) repoRef.current = new Repository(getSupabase(), userIdRef.current);
    return repoRef.current;
  }, [authState]);

  const markSynced = () => setSyncStatus((s) => ({ ...s, syncing: false, lastError: null, lastSyncAt: new Date().toISOString() }));

  /** Run a push now; on failure queue it for retry. */
  const push = useCallback(async (key: string, fn: (r: Repository) => Promise<void>) => {
    const r = repo();
    if (!r) return;
    setSyncStatus((s) => ({ ...s, syncing: true }));
    try {
      await fn(r);
      if (pendingOps.current.has(key)) { pendingOps.current.delete(key); setSyncStatus((s) => ({ ...s, pending: pendingOps.current.size })); }
      markSynced();
    } catch (e) {
      pendingOps.current.set(key, () => fn(r));
      setSyncStatus((s) => ({ ...s, pending: pendingOps.current.size, syncing: false, lastError: e instanceof Error ? e.message : String(e) }));
    }
  }, [repo]);

  const flushProgressNow = useCallback(async () => {
    const r = repo();
    if (!r || progressDirty.current.size === 0) return;
    const items = [...progressDirty.current]
      .map((id) => dbRef.current.progress[id])
      .filter(Boolean) as ItemProgress[];
    progressDirty.current.clear();
    try {
      await r.upsertProgress(items);
      markSynced();
    } catch (e) {
      for (const it of items) progressDirty.current.add(it.itemId);
      setSyncStatus((s) => ({ ...s, lastError: e instanceof Error ? e.message : String(e) }));
    }
  }, [repo]);

  const flushSync = useCallback(async () => {
    const r = repo();
    if (!r) return;
    await flushProgressNow();
    if (pendingOps.current.size === 0) return;
    setSyncStatus((s) => ({ ...s, syncing: true }));
    const ops = [...pendingOps.current.entries()];
    for (const [key, run] of ops) {
      try { await run(); pendingOps.current.delete(key); }
      catch (e) { setSyncStatus((s) => ({ ...s, lastError: e instanceof Error ? e.message : String(e) })); }
    }
    setSyncStatus((s) => ({ ...s, pending: pendingOps.current.size, syncing: false, lastError: pendingOps.current.size ? s.lastError : null, lastSyncAt: new Date().toISOString() }));
  }, [repo, flushProgressNow]);

  // retry: on network back + periodically when items are pending
  useEffect(() => {
    const onOnline = () => { void flushSync(); };
    window.addEventListener('online', onOnline);
    const t = window.setInterval(() => { if (pendingOps.current.size > 0) void flushSync(); }, 60000);
    return () => { window.removeEventListener('online', onOnline); window.clearInterval(t); };
  }, [flushSync]);

  /** Rewrite local entity ids after cloud inserts return real uuids. */
  const applyIdMap = useCallback((entity: string, map: Record<string, string>) => {
    if (!Object.keys(map).length) return;
    setDb((d) => {
      const swap = <T extends { id: string }>(arr: T[]) => arr.map((x) => (map[x.id] ? { ...x, id: map[x.id] } : x));
      switch (entity) {
        case 'tasks': return { ...d, tasks: swap(d.tasks) };
        case 'pyqs': return { ...d, pyqs: swap(d.pyqs) };
        case 'prelimsTests': return { ...d, prelimsTests: swap(d.prelimsTests) };
        case 'mainsTests': return { ...d, mainsTests: swap(d.mainsTests) };
        case 'lectures': return { ...d, lectures: swap(d.lectures) };
        case 'currentAffairs': return { ...d, currentAffairs: swap(d.currentAffairs) };
        case 'answers': return { ...d, answers: swap(d.answers) };
        case 'habits': return {
          ...d,
          habits: swap(d.habits),
          habitCompletions: d.habitCompletions.map((c) => (map[c.habitId] ? { ...c, habitId: map[c.habitId] } : c)),
        };
        default: return d;
      }
    });
  }, []);

  // ---------------------------------------------------------------- progress
  const getProgress = useCallback((itemId: string) => dbRef.current.progress[itemId], []);

  const scheduleProgressFlush = useCallback(() => {
    if (progressTimer.current) window.clearTimeout(progressTimer.current);
    progressTimer.current = window.setTimeout(() => { void flushProgressNow(); }, 800);
  }, [flushProgressNow]);

  const upsertProgressLocal = useCallback((itemId: string, itemType: ItemType, patch: Partial<ItemProgress>) => {
    const now = new Date().toISOString();
    setDb((d) => {
      const prev = d.progress[itemId] ?? emptyProgress(itemId, itemType, now);
      return { ...d, progress: { ...d.progress, [itemId]: { ...prev, ...patch, updatedAt: now } } };
    });
    if (authState === 'signed-in') {
      progressDirty.current.add(itemId);
      scheduleProgressFlush();
    }
  }, [authState, scheduleProgressFlush]);

  const setItemStatus = useCallback((itemId: string, itemType: ItemType, status: ItemStatus) => {
    upsertProgressLocal(itemId, itemType, { status });
  }, [upsertProgressLocal]);

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
    if (authState === 'signed-in') {
      for (const id of itemIds) progressDirty.current.add(id);
      scheduleProgressFlush();
    }
  }, [authState, scheduleProgressFlush]);

  const setItemNotes = useCallback((itemId: string, itemType: ItemType, notes: string) => {
    upsertProgressLocal(itemId, itemType, { notes });
  }, [upsertProgressLocal]);

  const reviseItem = useCallback((itemId: string, itemType: ItemType, confidence: Confidence) => {
    const now = new Date();
    const prevCount = dbRef.current.progress[itemId]?.revisionCount ?? 0;
    const count = Math.min(MAX_REVISION, prevCount + 1);
    const next = nextRevisionDate(now, count, confidence);
    upsertProgressLocal(itemId, itemType, {
      status: 'completed', revisionCount: count, confidence,
      lastRevisedAt: now.toISOString(), nextRevisionAt: next.toISOString(),
    });
    const log: RevisionLog = {
      id: uid('rev'), itemId, itemType, revisionNumber: count, confidence,
      revisedAt: now.toISOString(), notes: '',
    };
    setDb((d) => ({ ...d, revisionLogs: [...d.revisionLogs, log] }));
    void push(`revlog:${log.id}`, async (r) => r.insertRevisionLogs([log]));
  }, [upsertProgressLocal, push]);

  const resetRevision = useCallback((itemId: string, itemType: ItemType) => {
    upsertProgressLocal(itemId, itemType, {
      revisionCount: 0, confidence: 0, lastRevisedAt: null, nextRevisionAt: null, status: 'not_started',
    });
  }, [upsertProgressLocal]);

  // ---------------------------------------------------------------- tasks
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
    void push(`task:${task.id}`, async (r) => {
      const ids = await r.insertTasksAndGetIds([task]);
      if (ids[0]) applyIdMap('tasks', { [task.id]: ids[0] });
    });
  }, [push, applyIdMap]);

  const updateTask = useCallback((id: string, patch: Partial<Task>) => {
    // compute the merged record from current state so the push is never stale
    const current = dbRef.current.tasks.find((t) => t.id === id);
    const merged: Task | null = current ? { ...current, ...patch } : null;
    setDb((d) => ({ ...d, tasks: d.tasks.map((t) => (t.id === id ? { ...t, ...patch } : t)) }));
    if (!merged) return;
    void push(`task:${id}`, async (r) => {
      if (isUuid(id)) await r.updateTask(id, merged);
      else { const ids = await r.insertTasksAndGetIds([merged]); if (ids[0]) applyIdMap('tasks', { [id]: ids[0] }); }
    });
  }, [push, applyIdMap]);

  const toggleTask = useCallback((id: string, completed: boolean) => {
    updateTask(id, { status: completed ? 'completed' : 'upcoming', completedAt: completed ? new Date().toISOString() : null });
  }, [updateTask]);

  const deleteTask = useCallback((id: string) => {
    setDb((d) => ({ ...d, tasks: d.tasks.filter((t) => t.id !== id) }));
    if (isUuid(id)) void push(`task:${id}`, async (r) => r.deleteRow('tasks', id));
  }, [push]);

  // ---------------------------------------------------------------- tests
  const addPrelimsTest = useCallback((t: Omit<PrelimsTest, 'id' | 'createdAt'>) => {
    const test: PrelimsTest = { ...t, id: uid('pt'), createdAt: new Date().toISOString() };
    setDb((d) => ({ ...d, prelimsTests: [...d.prelimsTests, test] }));
    void push(`pt:${test.id}`, async (r) => {
      const ids = await r.insertPrelimsTestsAndGetIds([test]);
      if (ids[0]) applyIdMap('prelimsTests', { [test.id]: ids[0] });
    });
  }, [push, applyIdMap]);
  const deletePrelimsTest = useCallback((id: string) => {
    setDb((d) => ({ ...d, prelimsTests: d.prelimsTests.filter((t) => t.id !== id) }));
    if (isUuid(id)) void push(`pt:${id}`, async (r) => r.deleteRow('prelims_tests', id));
  }, [push]);
  const addMainsTest = useCallback((t: Omit<MainsTest, 'id' | 'createdAt'>) => {
    const test: MainsTest = { ...t, id: uid('mt'), createdAt: new Date().toISOString() };
    setDb((d) => ({ ...d, mainsTests: [...d.mainsTests, test] }));
    void push(`mt:${test.id}`, async (r) => {
      const ids = await r.insertMainsTestsAndGetIds([test]);
      if (ids[0]) applyIdMap('mainsTests', { [test.id]: ids[0] });
    });
  }, [push, applyIdMap]);
  const deleteMainsTest = useCallback((id: string) => {
    setDb((d) => ({ ...d, mainsTests: d.mainsTests.filter((t) => t.id !== id) }));
    if (isUuid(id)) void push(`mt:${id}`, async (r) => r.deleteRow('mains_tests', id));
  }, [push]);

  // ---------------------------------------------------------------- focus
  const addFocusSession = useCallback((s: Omit<FocusSession, 'id'>) => {
    const session: FocusSession = { ...s, id: uid('fs') };
    setDb((d) => ({ ...d, focusSessions: [...d.focusSessions, session] }));
    void push(`fs:${session.id}`, async (r) => { await r.insertFocusSessionsAndGetIds([session]); });
  }, [push]);

  // ---------------------------------------------------------------- habits
  const addHabit = useCallback((name: string, color: string) => {
    const habit: Habit = { id: uid('hb'), name, color, createdAt: new Date().toISOString() };
    setDb((d) => ({ ...d, habits: [...d.habits, habit] }));
    void push(`hb:${habit.id}`, async (r) => {
      const ids = await r.insertHabitsAndGetIds([habit]);
      if (ids[0]) applyIdMap('habits', { [habit.id]: ids[0] });
    });
  }, [push, applyIdMap]);
  const deleteHabit = useCallback((id: string) => {
    setDb((d) => ({
      ...d,
      habits: d.habits.filter((h) => h.id !== id),
      habitCompletions: d.habitCompletions.filter((c) => c.habitId !== id),
    }));
    if (isUuid(id)) void push(`hb:${id}`, async (r) => r.deleteRow('habits', id));
  }, [push]);
  const toggleHabit = useCallback((habitId: string, date: string) => {
    // decide the resulting state synchronously from pre-toggle truth
    const existsBefore = dbRef.current.habitCompletions.some((c) => c.habitId === habitId && c.date === date);
    setDb((d) => {
      const existing = d.habitCompletions.find((c) => c.habitId === habitId && c.date === date);
      if (existing) return { ...d, habitCompletions: d.habitCompletions.filter((c) => c.id !== existing.id) };
      return { ...d, habitCompletions: [...d.habitCompletions, { id: uid('hc'), habitId, date }] };
    });
    void push(`hc:${habitId}:${date}`, async (r) => {
      const nowExists = !existsBefore; // toggle outcome
      if (nowExists && isUuid(habitId)) await r.upsertHabitCompletion({ id: 'x', habitId, date });
      else if (!nowExists && isUuid(habitId)) await r.deleteHabitCompletion({ id: 'x', habitId, date });
    });
  }, [push]);

  // ---------------------------------------------------------------- lectures
  const addLecture = useCallback((l: Partial<Lecture> & { title: string; subject: string }) => {
    const lec: Lecture = {
      id: uid('lec'), title: l.title, subject: l.subject, chapter: l.chapter ?? '',
      lectureNo: l.lectureNo ?? 1, totalLectures: l.totalLectures ?? 1, source: l.source ?? '',
      pdfFollowed: l.pdfFollowed ?? '', shortNotesMade: l.shortNotesMade ?? false,
      notesLink: l.notesLink ?? '', revised: l.revised ?? false, revisionCount: l.revisionCount ?? 0,
      pyqsAttempted: l.pyqsAttempted ?? 0, status: l.status ?? 'not_started',
      lastWatchedAt: l.lastWatchedAt ?? null, completedAt: l.completedAt ?? null,
      notes: l.notes ?? '', createdAt: new Date().toISOString(),
    };
    setDb((d) => ({ ...d, lectures: [...d.lectures, lec] }));
    void push(`lec:${lec.id}`, async (r) => {
      const ids = await r.insertLecturesAndGetIds([lec]);
      if (ids[0]) applyIdMap('lectures', { [lec.id]: ids[0] });
    });
  }, [push, applyIdMap]);
  const updateLecture = useCallback((id: string, patch: Partial<Lecture>) => {
    const current = dbRef.current.lectures.find((l) => l.id === id);
    const merged: Lecture | null = current ? { ...current, ...patch } : null;
    setDb((d) => ({ ...d, lectures: d.lectures.map((l) => (l.id === id ? { ...l, ...patch } : l)) }));
    if (!merged) return;
    void push(`lec:${id}`, async (r) => {
      if (isUuid(id)) await r.updateLecture(id, merged);
      else { const ids = await r.insertLecturesAndGetIds([merged]); if (ids[0]) applyIdMap('lectures', { [id]: ids[0] }); }
    });
  }, [push, applyIdMap]);
  const deleteLecture = useCallback((id: string) => {
    setDb((d) => ({ ...d, lectures: d.lectures.filter((l) => l.id !== id) }));
    if (isUuid(id)) void push(`lec:${id}`, async (r) => r.deleteRow('lectures', id));
  }, [push]);

  // ---------------------------------------------------------------- current affairs
  const addCurrentAffair = useCallback((c: Partial<CurrentAffairItem> & { title: string }) => {
    const item: CurrentAffairItem = {
      id: uid('ca'), date: c.date ?? todayKey(), source: c.source ?? '',
      category: c.category ?? 'Other', title: c.title, summary: c.summary ?? '',
      relevance: c.relevance ?? 'both', revised: c.revised ?? false,
      revisionCount: c.revisionCount ?? 0, topicId: c.topicId ?? null, notes: c.notes ?? '',
      createdAt: new Date().toISOString(),
    };
    setDb((d) => ({ ...d, currentAffairs: [...d.currentAffairs, item] }));
    void push(`ca:${item.id}`, async (r) => {
      const ids = await r.insertCurrentAffairsAndGetIds([item]);
      if (ids[0]) applyIdMap('currentAffairs', { [item.id]: ids[0] });
    });
  }, [push, applyIdMap]);
  const updateCurrentAffair = useCallback((id: string, patch: Partial<CurrentAffairItem>) => {
    const current = dbRef.current.currentAffairs.find((c) => c.id === id);
    const merged: CurrentAffairItem | null = current ? { ...current, ...patch } : null;
    setDb((d) => ({ ...d, currentAffairs: d.currentAffairs.map((c) => (c.id === id ? { ...c, ...patch } : c)) }));
    if (!merged) return;
    void push(`ca:${id}`, async (r) => {
      if (isUuid(id)) await r.updateCurrentAffair(id, merged);
      else { const ids = await r.insertCurrentAffairsAndGetIds([merged]); if (ids[0]) applyIdMap('currentAffairs', { [id]: ids[0] }); }
    });
  }, [push, applyIdMap]);
  const deleteCurrentAffair = useCallback((id: string) => {
    setDb((d) => ({ ...d, currentAffairs: d.currentAffairs.filter((c) => c.id !== id) }));
    if (isUuid(id)) void push(`ca:${id}`, async (r) => r.deleteRow('current_affairs', id));
  }, [push]);

  // ---------------------------------------------------------------- answers
  const addAnswer = useCallback((a: Partial<AnswerEntry> & { question: string }) => {
    const entry: AnswerEntry = {
      id: uid('ans'), date: a.date ?? todayKey(), question: a.question, paper: a.paper ?? 'GS1',
      wordCount: a.wordCount ?? null, marksObtained: a.marksObtained ?? null,
      maxMarks: a.maxMarks ?? null, timeTakenMinutes: a.timeTakenMinutes ?? null,
      strengths: a.strengths ?? [], improvements: a.improvements ?? [], notes: a.notes ?? '',
      createdAt: new Date().toISOString(),
    };
    setDb((d) => ({ ...d, answers: [...d.answers, entry] }));
    void push(`ans:${entry.id}`, async (r) => {
      const ids = await r.insertAnswersAndGetIds([entry]);
      if (ids[0]) applyIdMap('answers', { [entry.id]: ids[0] });
    });
  }, [push, applyIdMap]);
  const updateAnswer = useCallback((id: string, patch: Partial<AnswerEntry>) => {
    const current = dbRef.current.answers.find((a) => a.id === id);
    const merged: AnswerEntry | null = current ? { ...current, ...patch } : null;
    setDb((d) => ({ ...d, answers: d.answers.map((a) => (a.id === id ? { ...a, ...patch } : a)) }));
    if (!merged) return;
    void push(`ans:${id}`, async (r) => {
      if (isUuid(id)) await r.updateAnswer(id, merged);
      else { const ids = await r.insertAnswersAndGetIds([merged]); if (ids[0]) applyIdMap('answers', { [id]: ids[0] }); }
    });
  }, [push, applyIdMap]);
  const deleteAnswer = useCallback((id: string) => {
    setDb((d) => ({ ...d, answers: d.answers.filter((a) => a.id !== id) }));
    if (isUuid(id)) void push(`ans:${id}`, async (r) => r.deleteRow('answers', id));
  }, [push]);

  // ---------------------------------------------------------------- pyqs
  const addPYQ = useCallback((p: Partial<PYQ> & { question: string; exam: string; year: number }) => {
    const pyq: PYQ = {
      id: uid('pyq'), exam: p.exam, year: clamp(p.year, 1979, 2100), paper: p.paper ?? '',
      question: p.question, result: p.result ?? 'not_attempted', topicId: p.topicId ?? null,
      notes: p.notes ?? '', attemptedAt: p.attemptedAt ?? null, createdAt: new Date().toISOString(),
    };
    setDb((d) => ({ ...d, pyqs: [...d.pyqs, pyq] }));
    void push(`pyq:${pyq.id}`, async (r) => {
      const ids = await r.insertPyqsAndGetIds([pyq]);
      if (ids[0]) applyIdMap('pyqs', { [pyq.id]: ids[0] });
    });
  }, [push, applyIdMap]);
  const updatePYQ = useCallback((id: string, patch: Partial<PYQ>) => {
    const current = dbRef.current.pyqs.find((p) => p.id === id);
    const merged: PYQ | null = current ? { ...current, ...patch } : null;
    setDb((d) => ({ ...d, pyqs: d.pyqs.map((p) => (p.id === id ? { ...p, ...patch } : p)) }));
    if (!merged) return;
    void push(`pyq:${id}`, async (r) => {
      if (isUuid(id)) await r.updatePYQ(id, merged);
      else { const ids = await r.insertPyqsAndGetIds([merged]); if (ids[0]) applyIdMap('pyqs', { [id]: ids[0] }); }
    });
  }, [push, applyIdMap]);
  const deletePYQ = useCallback((id: string) => {
    setDb((d) => ({ ...d, pyqs: d.pyqs.filter((p) => p.id !== id) }));
    if (isUuid(id)) void push(`pyq:${id}`, async (r) => r.deleteRow('pyqs', id));
  }, [push]);

  // ---------------------------------------------------------------- settings
  const updateSettings = useCallback((patch: Partial<Settings>) => {
    setDb((d) => ({ ...d, settings: { ...d.settings, ...patch } }));
    if (authState === 'signed-in') {
      if (settingsTimer.current) window.clearTimeout(settingsTimer.current);
      settingsTimer.current = window.setTimeout(() => {
        void push('settings', async (r) => r.upsertSettings(dbRef.current.settings));
      }, 600);
    }
  }, [authState, push]);

  const replaceDb = useCallback((next: MupDatabase) => setDb(next), []);
  const resetProgressOnly = useCallback(() => {
    setDb((d) => ({ ...d, progress: {}, revisionLogs: [] }));
    void push('reset-progress', async () => {
      const sb = getSupabase();
      const userId = userIdRef.current;
      if (!userId) return;
      await sb.from('syllabus_progress').delete().eq('user_id', userId);
      await sb.from('revision_logs').delete().eq('user_id', userId);
    });
  }, [push]);

  // ---------------------------------------------------------------- auth flows
  const mergeRemoteIntoLocal = useCallback((remote: Partial<MupDatabase> & { counts?: Record<string, number> }) => {
    setDb((d) => {
      const union = <T extends { id: string }>(localArr: T[], remoteArr: T[] = []) => {
        const byId = new Map(localArr.map((x) => [x.id, x]));
        for (const r2 of remoteArr) if (!byId.has(r2.id)) byId.set(r2.id, r2);
        return [...byId.values()];
      };
      const progress = { ...d.progress };
      for (const [id, p] of Object.entries(remote.progress ?? {})) {
        const local = progress[id];
        if (!local) progress[id] = p;
        else if (p.revisionCount > local.revisionCount || (local.status !== 'completed' && p.status === 'completed')) progress[id] = p;
      }
      return {
        ...d,
        settings: remote.settings ? { ...d.settings, ...remote.settings, theme: d.settings.theme } : d.settings,
        progress,
        tasks: union(d.tasks, remote.tasks),
        revisionLogs: union(d.revisionLogs, remote.revisionLogs),
        pyqs: union(d.pyqs, remote.pyqs),
        prelimsTests: union(d.prelimsTests, remote.prelimsTests),
        mainsTests: union(d.mainsTests, remote.mainsTests),
        focusSessions: union(d.focusSessions, remote.focusSessions),
        habits: union(d.habits, remote.habits),
        habitCompletions: union(d.habitCompletions, remote.habitCompletions),
        lectures: union(d.lectures, remote.lectures),
        currentAffairs: union(d.currentAffairs, remote.currentAffairs),
        answers: union(d.answers, remote.answers),
      };
    });
  }, []);

  const afterSignIn = useCallback(async (userId: string, email: string) => {
    userIdRef.current = userId;
    setAccountEmail(email);
    const r = new Repository(getSupabase(), userId);
    repoRef.current = r;
    try {
      const remote = await r.pullAll();
      const remoteCount = Object.values(remote.counts).reduce((a, b) => a + (b as number), 0);
      const d = dbRef.current;
      const localCount = d.tasks.length + Object.keys(d.progress).length + d.pyqs.length + d.lectures.length +
        d.answers.length + d.currentAffairs.length + d.prelimsTests.length + d.mainsTests.length +
        d.focusSessions.length + d.habits.length + d.revisionLogs.length;
      const alreadyMigrated = Boolean(localStorage.getItem(migratedFlagKey(userId)));
      mergeRemoteIntoLocal(remote);
      if (!alreadyMigrated && localCount > 0) {
        setMigrationPrompt(true); // offer one-time import of this device's data
      } else if (!alreadyMigrated && localCount === 0 && remoteCount === 0) {
        // brand-new account on a fresh device — seed profile with current settings
        void r.upsertSettings(d.settings).catch(() => {});
      }
      setSyncStatus((s) => ({ ...s, lastSyncAt: new Date().toISOString(), lastError: null }));
    } catch (e) {
      setSyncStatus((s) => ({ ...s, lastError: e instanceof Error ? e.message : String(e) }));
    }
    setAuthState('signed-in');
  }, [mergeRemoteIntoLocal]);

  const signIn = useCallback(async (email: string, password: string) => {
    if (!isCloudConfigured) return { error: 'Cloud sync is not configured.' };
    try {
      const { data, error } = await getSupabase().auth.signInWithPassword({ email, password });
      if (error) return { error: error.message };
      if (!data.session) return { needsConfirmation: true };
      await afterSignIn(data.session.user.id, data.session.user.email ?? email);
      return {};
    } catch (e) {
      return { error: e instanceof Error ? e.message : 'Network error — check your connection.' };
    }
  }, [afterSignIn]);

  const signUp = useCallback(async (email: string, password: string) => {
    if (!isCloudConfigured) return { error: 'Cloud sync is not configured.' };
    try {
      const { data, error } = await getSupabase().auth.signUp({ email, password });
      if (error) return { error: error.message };
      if (!data.session) return { needsConfirmation: true };
      await afterSignIn(data.session.user.id, data.session.user.email ?? email);
      return {};
    } catch (e) {
      return { error: e instanceof Error ? e.message : 'Network error — check your connection.' };
    }
  }, [afterSignIn]);

  const logout = useCallback(async () => {
    if (isCloudConfigured) { try { await getSupabase().auth.signOut(); } catch { /* ignore */ } }
    repoRef.current = null;
    userIdRef.current = null;
    pendingOps.current.clear();
    setSyncStatus((s) => ({ ...s, pending: 0 }));
    setAccountEmail(null);
    setMigrationPrompt(false);
    setAuthState(isCloudConfigured ? 'gate' : 'local');
  }, []);

  const continueLocal = useCallback(() => setAuthState('local'), []);
  const dismissMigrationPrompt = useCallback(() => setMigrationPrompt(false), []);

  const migrateLocalToCloud = useCallback(async (onStep?: (msg: string, pct: number) => void) => {
    const r = repo();
    if (!r || !userIdRef.current) return { ok: false, error: 'Not signed in.' };
    const userId = userIdRef.current;
    try {
      const sb = getSupabase();
      // Wipe cloud data first so (re)runs never create duplicates.
      // Local data is NEVER touched — the device remains the safe copy.
      onStep?.('Preparing cloud account…', 2);
      for (const table of ['tasks', 'pyqs', 'prelims_tests', 'mains_tests', 'focus_sessions',
        'lectures', 'current_affairs', 'answers', 'habit_completions', 'habits', 'revision_logs']) {
        await sb.from(table).delete().eq('user_id', userId);
      }
      const maps = await r.migrateFromLocal(dbRef.current, onStep);
      applyIdMap('tasks', maps.taskIdMap);
      applyIdMap('pyqs', maps.pyqIdMap);
      applyIdMap('prelimsTests', maps.prelimsTestIdMap);
      applyIdMap('mainsTests', maps.mainsTestIdMap);
      applyIdMap('lectures', maps.lectureIdMap);
      applyIdMap('currentAffairs', maps.currentAffairIdMap);
      applyIdMap('answers', maps.answerIdMap);
      applyIdMap('habits', maps.habitIdMap);
      localStorage.setItem(migratedFlagKey(userId), new Date().toISOString());
      setMigrationPrompt(false);
      return { ok: true };
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setSyncStatus((s) => ({ ...s, lastError: msg }));
      return { ok: false, error: msg };
    }
  }, [repo, applyIdMap]);

  // ---------------------------------------------------------------- boot
  useEffect(() => {
    if (!isCloudConfigured) { setAuthState('local'); return; }
    const sb = getSupabase();
    let cancelled = false;
    (async () => {
      try {
        const { data } = await sb.auth.getSession();
        if (cancelled) return;
        const session = data.session;
        if (session?.user) await afterSignIn(session.user.id, session.user.email ?? 'you');
        else setAuthState('gate');
      } catch {
        if (!cancelled) setAuthState('gate');
      }
    })();
    const { data: sub } = sb.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_OUT') {
        repoRef.current = null; userIdRef.current = null;
        setAccountEmail(null); setMigrationPrompt(false);
        setAuthState('gate');
      }
    });
    return () => { cancelled = true; sub.subscription.unsubscribe(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const value = useMemo<StoreValue>(() => ({
    db, setDb,
    authState, syncStatus, accountEmail, migrationPrompt,
    dismissMigrationPrompt, continueLocal, signIn, signUp, logout, migrateLocalToCloud, flushSync,
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
  }), [db, authState, syncStatus, accountEmail, migrationPrompt,
    dismissMigrationPrompt, continueLocal, signIn, signUp, logout, migrateLocalToCloud, flushSync,
    getProgress, setItemStatus, setItemNotes, reviseItem, resetRevision, bulkSetStatus,
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

export { newDatabase };
