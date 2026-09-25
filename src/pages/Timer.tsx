/** Focus Workspace — persistent Pomodoro/Stopwatch with the Flip Clock. */
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useStore } from '../store/store';
import { Card, CardHead, Empty, Field, Modal } from '../ui/components';
import { ColumnsChart } from '../ui/charts';
import { addDays, applicationDayKey, dateFromKey, fmtClock, fmtDuration, startOfWeek, todayKey, WEEKDAY_LABELS } from '../lib/date';
import { useFocusTimer } from '../ui/focusTimer';
import { FlipClock } from '../ui/FlipClock';
import { FocusAtmosphere } from '../ui/focusAtmosphere';
import { focusMinutesByApplicationDay } from '../store/selectors';
import { useToast } from '../ui/toast';
import { manualLogApplicationDay } from '../lib/studyLog';

const PHASE_LABEL = { focus: 'FOCUS', short: 'BREAK', long: 'LONG BREAK' } as const;

export function Timer() {
  const { db } = useStore();
  const timer = useFocusTimer();
  const focusRoot = useRef<HTMLDivElement>(null);
  const [fullscreen, setFullscreen] = useState(false);
  const [manualOpen, setManualOpen] = useState(false);
  const today = todayKey();

  useEffect(() => {
    const onFullscreen = () => setFullscreen(document.fullscreenElement === focusRoot.current);
    document.addEventListener('fullscreenchange', onFullscreen);
    return () => document.removeEventListener('fullscreenchange', onFullscreen);
  }, []);

  const focusSessionsToday = db.focusSessions.filter((session) => session.completed && session.sessionType === 'focus' && applicationDayKey(new Date(session.startedAt)) === today);
  const focusMinutesToday = focusSessionsToday.reduce((sum, session) => sum + session.durationMinutes, 0);
  const longestToday = focusSessionsToday.reduce((max, session) => Math.max(max, session.durationMinutes), 0);
  const targetPct = db.settings.dailyTargetMinutes ? Math.round(focusMinutesToday / db.settings.dailyTargetMinutes * 100) : 0;

  const weekData = useMemo(() => {
    const start = startOfWeek(today);
    const minutesByDay = focusMinutesByApplicationDay(db);
    return Array.from({ length: 7 }, (_, index) => {
      const key = addDays(start, index);
      const minutes = minutesByDay.get(key) ?? 0;
      return { label: WEEKDAY_LABELS[dateFromKey(key).getDay()], values: [{ name: 'Focus hrs', value: Math.round(minutes / 6) / 10 }] };
    });
  }, [db.focusSessions, today]);

  const recent = useMemo(() => db.focusSessions
    .filter((session) => applicationDayKey(new Date(session.startedAt)) === today)
    .sort((a, b) => b.startedAt.localeCompare(a.startedAt))
    .slice(0, 8), [db.focusSessions, today]);

  const phase = timer.state.mode === 'stopwatch' ? 'STOPWATCH' : PHASE_LABEL[timer.state.phase];
  const progress = timer.state.mode === 'pomodoro' && timer.phaseSeconds ? Math.min(100, timer.elapsed / timer.phaseSeconds * 100) : 0;
  const clockLabel = timer.state.mode === 'stopwatch' ? `${fmtClock(timer.displaySeconds)} elapsed` : `${fmtClock(timer.displaySeconds)} remaining`;

  const toggleFullscreen = async () => {
    if (document.fullscreenElement) await document.exitFullscreen().catch(() => undefined);
    else await focusRoot.current?.requestFullscreen().catch(() => undefined);
  };

  return (
    <div ref={focusRoot} className={`focus-workspace environment-${timer.settings.environment} ${fullscreen ? 'fullscreen' : ''}`}>
      <FocusAtmosphere environment={timer.settings.environment} />

      {fullscreen ? (
        <button
          type="button"
          className="focus-clock-stage"
          onClick={timer.state.running ? timer.pause : timer.start}
          aria-label={timer.state.running ? 'Pause timer' : 'Start timer'}
          title={timer.state.running ? 'Pause' : 'Start'}
        >
          <FlipClock seconds={timer.displaySeconds} animate={timer.state.running} label={clockLabel} />
        </button>
      ) : (
        <>
          <div className="page-head focus-page-head">
            <div>
              <h1>Study Timer</h1>
            </div>
            <div className="page-actions">
              <button className="btn sm" onClick={() => setManualOpen(true)}>＋ Log study manually</button>
              <button className="btn sm" onClick={timer.openMini}>▣ Mini player</button>
              <button className="btn sm" onClick={toggleFullscreen}>⛶ Fullscreen focus</button>
            </div>
          </div>

          <Card className="focus-stage">
            <div className="focus-stage-top">
              <div className="seg focus-mode-switch">
                <button className={timer.state.mode === 'pomodoro' ? 'active' : ''} onClick={() => timer.setMode('pomodoro')}>Pomodoro</button>
                <button className={timer.state.mode === 'stopwatch' ? 'active' : ''} onClick={() => timer.setMode('stopwatch')}>Stopwatch</button>
              </div>
              <span className={`focus-phase phase-${timer.state.phase}`}>{phase}</span>
              <span className="focus-sound-state">{timer.settings.soundEnabled ? `♫ ${timer.settings.soundscape}` : 'Sound off'}</span>
            </div>

            <FlipClock seconds={timer.displaySeconds} animate={timer.state.running} label={clockLabel} />
            <div className="focus-clock-caption">
              {timer.state.running ? 'Session in progress' : timer.elapsed > 0 ? 'Paused — your place is held' : timer.state.phase === 'focus' ? 'Ready when you are' : 'A deliberate pause before the next block'}
            </div>
            {timer.state.mode === 'pomodoro' && <div className="focus-progress"><div style={{ width: `${progress}%` }} /></div>}

            <div className="focus-current-work">
              <label htmlFor="current-work">What are you working on? <span>optional</span></label>
              <input id="current-work" value={timer.state.taskName} onChange={(event) => timer.setTaskName(event.target.value)} placeholder="Geography Optional — Geomorphology Lecture 98" />
            </div>

            <div className="focus-controls">
              {!timer.state.running
                ? <button className="focus-primary-control" onClick={timer.start}>▶ {timer.elapsed > 0 ? 'Resume' : timer.state.phase === 'focus' ? 'Start focus' : 'Start break'}</button>
                : <button className="focus-primary-control pause" onClick={timer.pause}>❚❚ Pause</button>}
              <button className="btn quiet" disabled={timer.elapsed < 12} onClick={timer.finish}>
                {timer.state.phase === 'focus' ? timer.state.mode === 'stopwatch' ? '■ Stop & log' : '✓ Finish & log' : 'End break'}
              </button>
              {timer.state.phase !== 'focus' && <button className="btn quiet" onClick={timer.skipBreak}>Skip break</button>}
              <button className="btn quiet" disabled={timer.elapsed === 0 && !timer.state.running} onClick={timer.reset}>Reset</button>
            </div>
          </Card>

          <section className="focus-metrics-grid">
            <Card className="focus-today-card">
              <CardHead title="Today's Focus" />
              <div className="card-pad focus-today-content">
                <div className="focus-today-total"><b>{fmtDuration(focusMinutesToday)}</b><span>of {fmtDuration(db.settings.dailyTargetMinutes)} target</span></div>
                <div className="bar ok"><div style={{ width: `${Math.min(100, targetPct)}%` }} /></div>
                <div className="focus-today-stats"><span><b>{focusSessionsToday.length}</b> sessions</span><span><b>{fmtDuration(longestToday)}</b> longest</span><span><b>{targetPct}%</b> target</span></div>
              </div>
            </Card>
            <Card className="focus-week-card">
              <CardHead title="Weekly Focus" />
              <div className="card-pad"><ColumnsChart data={weekData} height={145} /></div>
            </Card>
          </section>

          <section className="focus-support-grid">
            <Card className="focus-settings-card">
              <CardHead title="Environment & durations" />
              <div className="card-pad focus-settings-groups">
                <SettingsGroup title="Timer">
                  {timer.state.mode === 'pomodoro' && (
                    <>
                      <Field label="Focus duration">
                        <div className="seg wrap-seg">{[25, 30, 45, 50, 90].map((minutes) => <button key={minutes} className={timer.settings.focusMinutes === minutes ? 'active' : ''} onClick={() => { timer.reset(); timer.setSettings({ focusMinutes: minutes }); }}>{minutes}m</button>)}</div>
                      </Field>
                      <label className="setting-switch"><input type="checkbox" checked={timer.settings.breaksEnabled} onChange={(event) => timer.setSettings({ breaksEnabled: event.target.checked })} /><span>Breaks enabled</span></label>
                      <div className="settings-inline">
                        <Field label="Break (min)"><input className="input input-sm" type="number" min={1} max={60} value={timer.settings.breakMinutes} onChange={(event) => timer.setSettings({ breakMinutes: Math.max(1, Number(event.target.value) || 1) })} /></Field>
                        <Field label="Long break"><input className="input input-sm" type="number" min={1} max={90} value={timer.settings.longBreakMinutes} onChange={(event) => timer.setSettings({ longBreakMinutes: Math.max(1, Number(event.target.value) || 1) })} /></Field>
                        <Field label="Long break every"><select className="input input-sm" value={timer.settings.sessionsBeforeLongBreak} onChange={(event) => timer.setSettings({ sessionsBeforeLongBreak: Number(event.target.value) })}>{[2, 3, 4, 5, 6].map((count) => <option key={count} value={count}>{count} sessions</option>)}</select></Field>
                      </div>
                    </>
                  )}
                </SettingsGroup>

                <SettingsGroup title="Atmosphere & sound">
                  <div className="settings-inline">
                    <Field label="Atmosphere"><select className="input input-sm" value={timer.settings.environment} onChange={(event) => timer.setSettings({ environment: event.target.value as 'woodland' | 'night' | 'rain' })}><option value="woodland">Woodland</option><option value="night">Night</option><option value="rain">Rain</option></select></Field>
                    <Field label="Soundscape"><select className="input input-sm" value={timer.settings.soundscape} onChange={(event) => timer.setSettings({ soundscape: event.target.value as 'woodland' | 'night' | 'rain' })}><option value="woodland">Woodland</option><option value="night">Night fire</option><option value="rain">Rainfall</option></select></Field>
                  </div>
                  <label className="setting-switch"><input type="checkbox" checked={timer.settings.soundEnabled} onChange={(event) => timer.setSettings({ soundEnabled: event.target.checked })} /><span>Ambient sound</span></label>
                  <Field label={`Volume · ${timer.settings.volume}%`}><input className="focus-volume" type="range" min={0} max={100} value={timer.settings.volume} onChange={(event) => timer.setSettings({ volume: Number(event.target.value) })} /></Field>
                  <label className="setting-switch"><input type="checkbox" checked={timer.settings.mindfulnessEnabled} onChange={(event) => timer.setSettings({ mindfulnessEnabled: event.target.checked })} /><span>Mindfulness bell</span></label>
                  <Field label="Bell interval"><select className="input input-sm" value={timer.settings.mindfulnessInterval} onChange={(event) => timer.setSettings({ mindfulnessInterval: Number(event.target.value) })}>{[5, 10, 15, 20, 30].map((minutes) => <option key={minutes} value={minutes}>Every {minutes} minutes</option>)}</select></Field>
                </SettingsGroup>
              </div>
            </Card>

            <Card className="recent-sessions-card">
              <CardHead title="Recent Sessions" right={<button className="link-btn" onClick={() => setManualOpen(true)}>Log manually</button>} />
              <div className="recent-session-list">
                {recent.length === 0 && <Empty icon="◷" title="No sessions today" hint="Finish focus work or log a session manually." />}
                {recent.map((session) => (
                  <div key={session.id} className="recent-session-row">
                    <span className={`session-kind ${session.sessionType}`}>{session.sessionType === 'focus' ? '◷' : '◇'}</span>
                    <span><b>{session.taskName || 'Focus study'}</b><small>{new Date(session.startedAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</small></span>
                    <span className="chip">{session.sessionType === 'focus' ? 'Focus' : 'Break'}</span>
                    <b className="mono">{fmtDuration(session.durationMinutes)}</b>
                    <span className={`session-status ${session.completed ? 'complete' : ''}`}>{session.completed ? 'Completed' : 'Incomplete'}</span>
                  </div>
                ))}
              </div>
            </Card>
          </section>

          <ManualStudyModal open={manualOpen} onClose={() => setManualOpen(false)} />
        </>
      )}
    </div>
  );
}

function ManualStudyModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { logManualStudy } = useStore();
  const { push } = useToast();
  const [date, setDate] = useState(todayKey());
  const [time, setTime] = useState('');
  const [hours, setHours] = useState(0);
  const [minutes, setMinutes] = useState(30);
  const [taskName, setTaskName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => { if (open) { setError(null); setSubmitting(false); setDate(todayKey()); } }, [open]);

  const durationMinutes = (Number(hours) || 0) * 60 + (Number(minutes) || 0);
  const filedUnder = manualLogApplicationDay(date, time || null);

  const submit = () => {
    if (submitting) return;
    if (durationMinutes <= 0) { setError('Enter a duration of at least 1 minute.'); return; }
    setSubmitting(true);
    const result = logManualStudy(
      { date, time: time || null, durationMinutes, taskName },
      `${date}|${time}|${durationMinutes}|${taskName.trim()}|${Date.now()}`,
    );
    setSubmitting(false);
    if (!result.ok) { setError(result.error ?? 'Could not save that log.'); return; }
    push(`${fmtDuration(durationMinutes)} logged to study hours`, 'ok');
    setTaskName(''); setTime(''); setHours(0); setMinutes(30);
    onClose();
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Log study manually"
      footer={<>
        <button className="btn ghost" onClick={onClose}>Cancel</button>
        <button className="btn primary" onClick={submit} disabled={submitting}>Save {durationMinutes > 0 ? fmtDuration(durationMinutes) : ''}</button>
      </>}
    >
      <div className="form-grid">
        <Field label="Date">
          <input className="input" type="date" value={date} max={applicationDayKey()} onChange={(event) => setDate(event.target.value || todayKey())} />
        </Field>
        <Field label="Start time (optional)">
          <input className="input" type="time" value={time} onChange={(event) => setTime(event.target.value)} />
        </Field>
        <Field label="Hours">
          <input className="input" type="number" min={0} max={24} value={hours} onChange={(event) => setHours(Math.max(0, Math.min(24, Number(event.target.value) || 0)))} />
        </Field>
        <Field label="Minutes">
          <input className="input" type="number" min={0} max={59} value={minutes} onChange={(event) => setMinutes(Math.max(0, Math.min(59, Number(event.target.value) || 0)))} />
        </Field>
        <Field label="Work (optional)" className="full">
          <input className="input" value={taskName} onChange={(event) => setTaskName(event.target.value)} placeholder="Geography Optional — Climatology revision" />
        </Field>
      </div>
      {error && <p className="small bad-text">{error}</p>}
      {filedUnder !== date && <p className="small soft">Filed under {filedUnder}</p>}
    </Modal>
  );
}

function SettingsGroup({ title, children }: { title: string; children: React.ReactNode }) {
  return <section className="focus-settings-group"><h3>{title}</h3>{children}</section>;
}
