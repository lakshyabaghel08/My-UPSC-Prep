/** Premium Focus Workspace — persistent Pomodoro/Stopwatch, Flip Clock only. */
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useStore } from '../store/store';
import { Card, CardHead, Empty, Field } from '../ui/components';
import { ColumnsChart } from '../ui/charts';
import { addDays, dateFromKey, fmtClock, fmtDuration, startOfWeek, todayKey, WEEKDAY_LABELS } from '../lib/date';
import { useFocusTimer } from '../ui/focusTimer';
import { focusMinutesByApplicationDay } from '../store/selectors';

const PHASE_LABEL = { focus: 'FOCUS', short: 'BREAK', long: 'LONG BREAK' } as const;

export function Timer() {
  const { db } = useStore();
  const timer = useFocusTimer();
  const focusRoot = useRef<HTMLDivElement>(null);
  const [fullscreen, setFullscreen] = useState(false);
  const today = todayKey();

  useEffect(() => {
    const onFullscreen = () => setFullscreen(document.fullscreenElement === focusRoot.current);
    document.addEventListener('fullscreenchange', onFullscreen);
    return () => document.removeEventListener('fullscreenchange', onFullscreen);
  }, []);

  const focusSessionsToday = db.focusSessions.filter((session) => session.completed && session.sessionType === 'focus' && todayKey(new Date(session.startedAt)) === today);
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

  const recent = useMemo(() => [...db.focusSessions].sort((a, b) => b.startedAt.localeCompare(a.startedAt)).slice(0, 10), [db.focusSessions]);
  const phase = timer.state.mode === 'stopwatch' ? 'STOPWATCH' : PHASE_LABEL[timer.state.phase];
  const progress = timer.state.mode === 'pomodoro' && timer.phaseSeconds ? Math.min(100, timer.elapsed / timer.phaseSeconds * 100) : 0;

  const toggleFullscreen = async () => {
    if (document.fullscreenElement) await document.exitFullscreen();
    else await focusRoot.current?.requestFullscreen().catch(() => undefined);
  };

  return (
    <div ref={focusRoot} className={`focus-workspace environment-${timer.settings.environment} ${fullscreen ? 'fullscreen' : ''}`}>
      <div className="focus-atmosphere" aria-hidden="true" />
      <div className="page-head focus-page-head">
        <div>
          <span className="eyebrow">STUDY WORKSPACE</span>
          <h1>Focus deeply.</h1>
          <div className="sub">Let My UPSC Prep track the work — completed focus flows into Study Hours and Analytics.</div>
        </div>
        <div className="page-actions">
          <button className="btn" onClick={timer.openMini}>▣ Mini player</button>
          <button className="btn" onClick={toggleFullscreen}>{fullscreen ? '↙ Exit fullscreen' : '⛶ Fullscreen focus'}</button>
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

        <FlipClock seconds={timer.displaySeconds} />
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
          <button className="btn" disabled={timer.elapsed < 12} onClick={timer.finish}>
            {timer.state.phase === 'focus' ? timer.state.mode === 'stopwatch' ? '■ Stop & log' : '✓ Finish & log' : 'End break'}
          </button>
          {timer.state.phase !== 'focus' && <button className="btn ghost" onClick={timer.skipBreak}>Skip break</button>}
          <button className="btn ghost" disabled={timer.elapsed === 0 && !timer.state.running} onClick={timer.reset}>Reset</button>
        </div>
        <p className="focus-logging-note">Starting, pausing or resetting never creates a record. Only finished focus is logged; break time never counts.</p>
      </Card>

      {!fullscreen && (
        <>
          <section className="focus-metrics-grid">
            <Card className="focus-today-card">
              <CardHead title="Today's Focus" hint="4:00 AM application day" />
              <div className="card-pad focus-today-content">
                <div className="focus-today-total"><b>{fmtDuration(focusMinutesToday)}</b><span>of {fmtDuration(db.settings.dailyTargetMinutes)} target</span></div>
                <div className="bar ok"><div style={{ width: `${Math.min(100, targetPct)}%` }} /></div>
                <div className="focus-today-stats"><span><b>{focusSessionsToday.length}</b> sessions</span><span><b>{fmtDuration(longestToday)}</b> longest</span><span><b>{targetPct}%</b> target</span></div>
              </div>
            </Card>
            <Card className="focus-week-card">
              <CardHead title="Weekly Focus" hint="hours per application day" />
              <div className="card-pad"><ColumnsChart data={weekData} height={145} /></div>
            </Card>
          </section>

          <section className="focus-support-grid">
            <Card className="focus-settings-card">
              <CardHead title="Focus Environment" hint="calm, optional and locally controlled" />
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
                  {timer.state.mode === 'stopwatch' && <p className="small soft">The stopwatch starts empty and logs only when you choose Stop &amp; log.</p>}
                </SettingsGroup>

                <SettingsGroup title="Environment">
                  <div className="settings-inline">
                    <Field label="Atmosphere"><select className="input input-sm" value={timer.settings.environment} onChange={(event) => timer.setSettings({ environment: event.target.value as 'woodland' | 'night' | 'rain' })}><option value="woodland">Woodland</option><option value="night">Night</option><option value="rain">Rain</option></select></Field>
                    <Field label="Soundscape"><select className="input input-sm" value={timer.settings.soundscape} onChange={(event) => timer.setSettings({ soundscape: event.target.value as 'woodland' | 'night' | 'rain' })}><option value="woodland">Woodland</option><option value="night">Night fire</option><option value="rain">Rainfall</option></select></Field>
                  </div>
                  <label className="setting-switch"><input type="checkbox" checked={timer.settings.soundEnabled} onChange={(event) => timer.setSettings({ soundEnabled: event.target.checked })} /><span>Ambient sound</span></label>
                  <Field label={`Volume · ${timer.settings.volume}%`}><input className="focus-volume" type="range" min={0} max={100} value={timer.settings.volume} onChange={(event) => timer.setSettings({ volume: Number(event.target.value) })} /></Field>
                  <label className="setting-switch"><input type="checkbox" checked={timer.settings.mindfulnessEnabled} onChange={(event) => timer.setSettings({ mindfulnessEnabled: event.target.checked })} /><span>Mindfulness bell</span></label>
                  <Field label="Bell interval"><select className="input input-sm" value={timer.settings.mindfulnessInterval} onChange={(event) => timer.setSettings({ mindfulnessInterval: Number(event.target.value) })}>{[5, 10, 15, 20, 30].map((minutes) => <option key={minutes} value={minutes}>Every {minutes} minutes</option>)}</select></Field>
                </SettingsGroup>

                <SettingsGroup title="Display">
                  <div className="display-setting"><span><b>Flip Clock</b><small>The only timer display</small></span><span className="chip ok">Active</span></div>
                  <button className="btn block" onClick={toggleFullscreen}>⛶ Enter fullscreen focus</button>
                </SettingsGroup>
              </div>
            </Card>

            <Card className="recent-sessions-card">
              <CardHead title="Recent Sessions" hint="existing focus-session history" />
              <div className="recent-session-list">
                {recent.length === 0 && <Empty icon="◷" title="No sessions yet" hint="Finish focus work to build your history." />}
                {recent.map((session) => (
                  <div key={session.id} className="recent-session-row">
                    <span className={`session-kind ${session.sessionType}`}>{session.sessionType === 'focus' ? '◷' : '◇'}</span>
                    <span><b>{session.taskName || 'Focus study'}</b><small>{new Date(session.startedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })} · {new Date(session.startedAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</small></span>
                    <span className="chip">{session.sessionType === 'focus' ? 'Focus' : 'Break'}</span>
                    <b className="mono">{fmtDuration(session.durationMinutes)}</b>
                    <span className={`session-status ${session.completed ? 'complete' : ''}`}>{session.completed ? 'Completed' : 'Incomplete'}</span>
                  </div>
                ))}
              </div>
            </Card>
          </section>
        </>
      )}
    </div>
  );
}

function FlipClock({ seconds }: { seconds: number }) {
  const value = fmtClock(seconds);
  return (
    <div className="flip-clock" role="timer" aria-label={`${value} remaining`}>
      {value.split('').map((character, index) => character === ':'
        ? <span key={`colon-${index}`} className="flip-colon">:</span>
        : <span key={`${index}-${character}`} className="flip-digit"><span>{character}</span><i /></span>)}
    </div>
  );
}

function SettingsGroup({ title, children }: { title: string; children: React.ReactNode }) {
  return <section className="focus-settings-group"><h3>{title}</h3>{children}</section>;
}
