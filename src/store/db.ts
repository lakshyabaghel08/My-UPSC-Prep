/** Local-first persistence: a typed database persisted to localStorage with
 * debounced saves, import/export (backup/restore), and reactive subscriptions. */
import type { MupDatabase } from '../types';
import { todayKey } from '../lib/date';
import { normalizeLectureProgress } from '../lib/lectures';

const DB_KEY = 'mup.db.v1';
export const DB_VERSION = 2;

function defaultDb(): MupDatabase {
  return {
    version: DB_VERSION,
    settings: {
      targetExamYear: 2027,
      optional: 'Geography',
      theme: (document.documentElement.dataset.theme as 'dark' | 'light') || 'dark',
      dailyTargetMinutes: 480,
      autoRevisionSchedule: true,
      defaultPaperFilter: null,
    },
    progress: {},
    tasks: [],
    revisionLogs: [],
    pyqs: [],
    prelimsTests: [],
    mainsTests: [],
    focusSessions: [],
    habits: [],
    habitCompletions: [],
    lectures: [],
    currentAffairs: [],
    answers: [],
  };
}

export function newDatabase(): MupDatabase {
  return defaultDb();
}

/** Migrations: bump version chain here. */
export function migrate(raw: unknown): MupDatabase {
  const def = defaultDb();
  if (!raw || typeof raw !== 'object') return def;
  const db = raw as Partial<MupDatabase>;
  return {
    ...def,
    ...db,
    settings: { ...def.settings, ...(db.settings ?? {}) },
    progress: db.progress ?? {},
    tasks: db.tasks ?? [],
    revisionLogs: db.revisionLogs ?? [],
    pyqs: db.pyqs ?? [],
    prelimsTests: db.prelimsTests ?? [],
    mainsTests: db.mainsTests ?? [],
    focusSessions: db.focusSessions ?? [],
    habits: db.habits ?? [],
    habitCompletions: db.habitCompletions ?? [],
    lectures: (db.lectures ?? []).map((lecture) => normalizeLectureProgress(lecture)),
    currentAffairs: db.currentAffairs ?? [],
    answers: db.answers ?? [],
    version: DB_VERSION,
  };
}

export function loadDb(): MupDatabase {
  try {
    const raw = localStorage.getItem(DB_KEY);
    if (!raw) return newDatabase();
    return migrate(JSON.parse(raw));
  } catch (e) {
    console.error('Failed to load database, starting fresh.', e);
    return newDatabase();
  }
}

let saveTimer: number | undefined;
export function saveDb(db: MupDatabase) {
  if (saveTimer) window.clearTimeout(saveTimer);
  saveTimer = window.setTimeout(() => {
    try {
      localStorage.setItem(DB_KEY, JSON.stringify(db));
    } catch (e) {
      console.error('Failed to persist database', e);
    }
  }, 150);
}

export function exportDb(db: MupDatabase): string {
  return JSON.stringify({ ...db, exportedAt: new Date().toISOString(), app: 'My UPSC Prep' }, null, 2);
}

export function downloadBackup(db: MupDatabase) {
  const blob = new Blob([exportDb(db)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `my-upsc-prep-backup-${todayKey()}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

export function parseBackup(jsonText: string): MupDatabase {
  const parsed = JSON.parse(jsonText);
  if (!parsed || typeof parsed !== 'object' || !('tasks' in parsed)) {
    throw new Error('This file does not look like a My UPSC Prep backup.');
  }
  return migrate(parsed);
}
