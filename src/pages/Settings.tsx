/** Settings — personalization, backup/restore, data management. Fully local. */
import React, { useRef, useState } from 'react';
import { useStore } from '../store/store';
import { Card, CardHead, Confirm, Field } from '../ui/components';
import { useToast } from '../ui/toast';
import { downloadBackup, parseBackup, newDatabase, DB_VERSION } from '../store/db';
import type { MupDatabase } from '../types';
import { syllabus } from '../data/syllabus';
import { fmtDuration } from '../lib/date';

export function Settings() {
  const { db, updateSettings, replaceDb, resetProgressOnly } = useStore();
  const { push } = useToast();
  const fileRef = useRef<HTMLInputElement>(null);
  const [confirmRestore, setConfirmRestore] = useState<string | null>(null);
  const [confirmReset, setConfirmReset] = useState(false);
  const [confirmWipe, setConfirmWipe] = useState(false);

  const stats = {
    tasks: db.tasks.length,
    progress: Object.keys(db.progress).length,
    logs: db.revisionLogs.length,
    tests: db.prelimsTests.length + db.mainsTests.length,
    pyqs: db.pyqs.length,
    lectures: db.lectures.length,
    ca: db.currentAffairs.length,
    answers: db.answers.length,
    sessions: db.focusSessions.length,
  };

  const toggleTheme = (t: 'dark' | 'light') => {
    updateSettings({ theme: t });
    document.documentElement.dataset.theme = t;
    try { localStorage.setItem('mup.theme', t); } catch { /* ignore */ }
  };

  const handleFile = (f: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const restored = parseBackup(String(reader.result));
        setConfirmRestore(JSON.stringify(restored));
        // peek summary for the confirm dialog
      } catch (e) {
        push(e instanceof Error ? e.message : 'Invalid backup file', 'bad');
      }
    };
    reader.readAsText(f);
  };

  const doRestore = () => {
    if (!confirmRestore) return;
    try {
      replaceDb(parseBackup(confirmRestore));
      push('Backup restored ✓', 'ok');
    } catch (e) {
      push('Restore failed', 'bad');
    } finally {
      setConfirmRestore(null);
    }
  };

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Settings & Backup</h1>
          <div className="sub">Everything lives on this device. No account, no cloud, no tracking.</div>
        </div>
      </div>

      <div className="grid cols-2">
        <Card>
          <CardHead title="Personalization" />
          <div className="card-pad" style={{ paddingTop: 12, display: 'flex', flexDirection: 'column', gap: 13 }}>
            <div className="form-grid">
              <Field label="Target exam year">
                <select className="input" value={db.settings.targetExamYear} onChange={(e) => updateSettings({ targetExamYear: Number(e.target.value) })}>
                  {[2026, 2027, 2028].map((y) => <option key={y} value={y}>{y}</option>)}
                </select>
              </Field>
              <Field label="Optional subject">
                <input className="input" value={db.settings.optional} onChange={(e) => updateSettings({ optional: e.target.value })} />
              </Field>
              <Field label="Daily focus target (minutes)">
                <input type="number" min={60} step={30} className="input" value={db.settings.dailyTargetMinutes} onChange={(e) => updateSettings({ dailyTargetMinutes: Math.max(0, Number(e.target.value) || 0) })} />
              </Field>
              <Field label="Theme">
                <div className="seg">
                  <button className={db.settings.theme === 'dark' ? 'active' : ''} onClick={() => toggleTheme('dark')}>☾ Dark</button>
                  <button className={db.settings.theme === 'light' ? 'active' : ''} onClick={() => toggleTheme('light')}>☀ Light</button>
                </div>
              </Field>
            </div>
            <label className="checkbox-row">
              <input type="checkbox" checked={db.settings.autoRevisionSchedule} onChange={(e) => updateSettings({ autoRevisionSchedule: e.target.checked })} />
              Auto-schedule next revision when completing topics (recommended)
            </label>
            <p className="tiny muted">Current target: {fmtDuration(db.settings.dailyTargetMinutes)} of focus per day · {syllabus.subtopics.length} subtopics indexed · DB v{DB_VERSION}</p>
          </div>
        </Card>

        <Card>
          <CardHead title="Backup & restore" hint="portable JSON — works across devices/browsers" />
          <div className="card-pad" style={{ paddingTop: 12, display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div className="row" style={{ gap: 9 }}>
              <button className="btn primary" onClick={() => { downloadBackup(db); push('Backup downloaded ⤓', 'ok'); }}>⤓ Download backup</button>
              <button className="btn" onClick={() => fileRef.current?.click()}>⤒ Restore from file</button>
              <input ref={fileRef} type="file" accept="application/json,.json" style={{ display: 'none' }} onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); e.target.value = ''; }} />
            </div>
            <div className="card card-pad small soft" style={{ background: 'var(--surface-2)', border: 'none' }}>
              <b style={{ color: 'var(--text)' }}>What's inside a backup:</b> syllabus progress & notes, tasks, revision logs, PYQs, tests, focus sessions, habits, lecture tracker, current affairs, answer log, settings.
              <div className="tiny muted" style={{ marginTop: 6 }}>
                {stats.progress} progress records · {stats.tasks} tasks · {stats.logs} revision logs · {stats.tests} tests · {stats.pyqs} PYQs · {stats.lectures} lecture series · {stats.ca} CA items · {stats.answers} answers · {stats.sessions} sessions
              </div>
            </div>
            <p className="tiny muted">Tip: take a backup every Sunday. Restore replaces everything on this device with the file's contents.</p>
          </div>
        </Card>

        <Card>
          <CardHead title="Install as app (PWA)" hint="works offline after first load" />
          <div className="card-pad" style={{ paddingTop: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
            <p className="small soft">
              <b style={{ color: 'var(--text)' }}>Chrome / Edge (desktop):</b> click the ⊕ install icon in the address bar, or ⋮ menu → "Install My UPSC Prep".<br />
              <b style={{ color: 'var(--text)' }}>Android:</b> ⋮ menu → "Add to Home screen".<br />
              <b style={{ color: 'var(--text)' }}>iOS Safari:</b> Share → "Add to Home Screen".
            </p>
            <p className="tiny muted">Installed, the app runs fully offline — your data stays in the device's local storage. Keep regular backups.</p>
          </div>
        </Card>

        <Card>
          <CardHead title="Danger zone" hint="irreversible — take a backup first" />
          <div className="card-pad" style={{ paddingTop: 12, display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div className="row" style={{ justifyContent: 'space-between' }}>
              <div>
                <b className="small">Reset study progress</b>
                <div className="tiny muted">Clears all statuses, notes & revision logs. Keeps tasks/tests/etc.</div>
              </div>
              <button className="btn bad" onClick={() => setConfirmReset(true)}>Reset</button>
            </div>
            <hr className="divider" />
            <div className="row" style={{ justifyContent: 'space-between' }}>
              <div>
                <b className="small">Wipe entire database</b>
                <div className="tiny muted">Start completely fresh. All modules cleared.</div>
              </div>
              <button className="btn bad" onClick={() => setConfirmWipe(true)}>Wipe</button>
            </div>
          </div>
        </Card>
      </div>

      <Confirm
        open={!!confirmRestore}
        onClose={() => setConfirmRestore(null)}
        onConfirm={doRestore}
        title="Restore this backup?"
        body="Restoring replaces ALL current data on this device with the backup's contents. This cannot be undone."
        confirmLabel="Restore backup"
      />
      <Confirm open={confirmReset} onClose={() => setConfirmReset(false)} onConfirm={() => { resetProgressOnly(); push('Study progress reset'); }}
        title="Reset study progress?" body="All topic statuses, notes and revision history will be cleared. Tasks, tests and other modules are kept." confirmLabel="Reset progress" />
      <Confirm open={confirmWipe} onClose={() => setConfirmWipe(false)} onConfirm={() => { replaceDb(newDatabase()); push('Database wiped — fresh start'); }}
        title="Wipe entire database?" body="Every module — tasks, tests, progress, tracker data — will be permanently deleted from this device." confirmLabel="Wipe everything" />
    </>
  );
}

export type { MupDatabase };
