/** Study Timer — pomodoro + stopwatch with focus session logging. */
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useStore } from '../store/store';
import { Card, CardHead, Empty, Field, Seg } from '../ui/components';
import { useToast } from '../ui/toast';
import { fmtClock, fmtDuration, todayKey, startOfWeek, WEEKDAY_LABELS, dateFromKey } from '../lib/date';
import { ColumnsChart } from '../ui/charts';

type Mode = 'pomodoro' | 'stopwatch';
type Phase = 'focus' | 'short' | 'long';

const BREAK_MIN: Record<'short' | 'long', number> = { short: 5, long: 15 };
const PHASE_LABEL: Record<Phase, string> = { focus: 'Focus', short: 'Short break', long: 'Long break' };

export function Timer() {
  const { db, addFocusSession } = useStore();
  const { push } = useToast();
  const [mode, setMode] = useState<Mode>('pomodoro');
  const [phase, setPhase] = useState<Phase>('focus');
  const [running, setRunning] = useState(false);
  const [elapsed, setElapsed] = useState(0); // seconds in current phase
  const [pomosDone, setPomosDone] = useState(0);
  const [taskName, setTaskName] = useState('');
  const [cycle, setCycle] = useState(4);
  const [focusMin, setFocusMin] = useState(25);
  const raf = useRef<number | null>(null);
  const lastTick = useRef<number>(0);

  const phaseSeconds = (phase === 'focus' ? focusMin : BREAK_MIN[phase === 'short' ? 'short' : 'long']) * 60;

  // restore today's pomodoro count
  useEffect(() => {
    const today = todayKey();
    const n = db.focusSessions.filter((s) => s.completed && s.sessionType === 'focus' && todayKey(new Date(s.startedAt)) === today).length;
    setPomosDone(n);
  }, [db.focusSessions]);

  useEffect(() => {
    if (!running) return;
    lastTick.current = performance.now();
    const tick = () => {
      const now = performance.now();
      const dt = (now - lastTick.current) / 1000;
      lastTick.current = now;
      setElapsed((e) => e + dt);
      raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
    return () => { if (raf.current) cancelAnimationFrame(raf.current); };
  }, [running]);

  // phase completion (pomodoro)
  useEffect(() => {
    if (mode !== 'pomodoro' || !running) return;
    if (elapsed >= phaseSeconds) {
      completePhase();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [elapsed, running, mode]);

  const logSession = (minutes: number, type: 'focus' | 'break') => {
    if (minutes < 0.2) return;
    addFocusSession({
      startedAt: new Date(Date.now() - minutes * 60000).toISOString(),
      durationMinutes: Math.round(minutes * 10) / 10,
      taskName: taskName.trim() || 'Focus study',
      sessionType: type,
      completed: true,
    });
  };

  const completePhase = () => {
    setRunning(false);
    const minutes = elapsed / 60;
    if (phase === 'focus') {
      logSession(minutes, 'focus');
      const n = pomosDone + 1;
      setPomosDone(n);
      push(`🍅 Pomodoro ${n} done — ${fmtDuration(minutes)} logged`, 'ok');
      const nextPhase: Phase = n % cycle === 0 ? 'long' : 'short';
      setPhase(nextPhase);
    } else {
      logSession(minutes, 'break');
      push('Break over — back to focus', 'ok');
      setPhase('focus');
    }
    setElapsed(0);
  };

  const stopAndLog = () => {
    setRunning(false);
    const minutes = elapsed / 60;
    if (mode === 'stopwatch') {
      if (minutes >= 0.2) { logSession(minutes, 'focus'); push(`Logged ${fmtDuration(minutes)} of focus`, 'ok'); }
      setElapsed(0);
    } else {
      if (minutes >= 0.2) { logSession(minutes, phase === 'focus' ? 'focus' : 'break'); push(`Logged ${fmtDuration(minutes)}`, 'ok'); }
      setElapsed(0);
    }
  };

  const display = mode === 'pomodoro' ? Math.max(0, phaseSeconds - elapsed) : elapsed;
  const progress = mode === 'pomodoro' ? elapsed / phaseSeconds : 0;
  const R = 110;
  const C = 2 * Math.PI * R;

  // today's sessions
  const today = todayKey();
  const todaySessions = db.focusSessions.filter((s) => todayKey(new Date(s.startedAt)) === today);
  const focusMinutesToday = todaySessions.filter((s) => s.sessionType === 'focus').reduce((a, s) => a + s.durationMinutes, 0);
  const breakMin = todaySessions.filter((s) => s.sessionType === 'break').reduce((a, s) => a + s.durationMinutes, 0);

  const weekData = useMemo(() => {
    const start = startOfWeek(today);
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(start);
      d.setDate(d.getDate() + i);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      const minutes = db.focusSessions.filter((s) => s.sessionType === 'focus' && todayKey(new Date(s.startedAt)) === key).reduce((a, s) => a + s.durationMinutes, 0);
      return { label: WEEKDAY_LABELS[d.getDay()], values: [{ name: 'Focus hrs', value: Math.round((minutes / 60) * 10) / 10 }] };
    });
  }, [db.focusSessions, today]);

  const recent = [...db.focusSessions].sort((a, b) => b.startedAt.localeCompare(a.startedAt)).slice(0, 12);

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Study Timer</h1>
          <div className="sub">Pomodoro cycles or open stopwatch · every completed session is logged to Study Hours</div>
        </div>
        <Seg options={[{ value: 'pomodoro', label: 'Pomodoro' }, { value: 'stopwatch', label: 'Stopwatch' }]} value={mode} onChange={(m) => { setRunning(false); setElapsed(0); setMode(m); }} />
      </div>

      <div className="grid" style={{ gridTemplateColumns: '1.2fr 1fr' }}>
        <Card className="card-pad">
          <div className="timer-ring">
            <svg width="250" height="250" viewBox="0 0 250 250">
              <circle cx="125" cy="125" r={R} fill="none" stroke="var(--surface-3)" strokeWidth="13" />
              <circle cx="125" cy="125" r={R} fill="none"
                stroke={phase === 'focus' ? 'var(--accent)' : 'var(--ok)'}
                strokeWidth="13" strokeLinecap="round"
                strokeDasharray={mode === 'pomodoro' ? `${progress * C} ${C}` : undefined}
                transform="rotate(-90 125 125)"
                opacity={0.9} />
            </svg>
            <div className="t-center">
              <span className="t-mode">{mode === 'pomodoro' ? PHASE_LABEL[phase] : 'Stopwatch'}</span>
              <span className="t-time">{fmtClock(display)}</span>
              <span className="tiny muted">{taskName.trim() || 'unnamed session'}</span>
            </div>
          </div>

          <div className="row" style={{ justifyContent: 'center', gap: 9, marginTop: 8 }}>
            {!running ? (
              <button className="btn primary" style={{ padding: '10px 26px', fontSize: 14 }} onClick={() => setRunning(true)}>▶ Start</button>
            ) : (
              <button className="btn" style={{ padding: '10px 26px', fontSize: 14 }} onClick={() => setRunning(false)}>❚❚ Pause</button>
            )}
            <button className="btn" onClick={stopAndLog} disabled={elapsed < 5}>■ Stop & log</button>
            {mode === 'pomodoro' && elapsed > 5 && phase === 'focus' && (
              <button className="btn ok" onClick={completePhase}>✓ Complete pomodoro</button>
            )}
            <button className="btn ghost" onClick={() => { setRunning(false); setElapsed(0); }}>Reset</button>
          </div>

          {mode === 'pomodoro' && (
            <div className="form-row" style={{ justifyContent: 'center', marginTop: 14 }}>
              <Field label="Focus phase length">
                <div className="seg">
                  {[25, 30, 45, 50, 90].map((m) => (
                    <button key={m} className={focusMin === m ? 'active' : ''} onClick={() => { setFocusMin(m); setPhase('focus'); setElapsed(0); setRunning(false); }}>{m}m</button>
                  ))}
                </div>
              </Field>
              <Field label="Long break every">
                <div className="seg">
                  {[3, 4, 5].map((n) => (
                    <button key={n} className={cycle === n ? 'active' : ''} onClick={() => setCycle(n)}>{n} 🍅</button>
                  ))}
                </div>
              </Field>
            </div>
          )}

          <div style={{ marginTop: 14 }}>
            <Field label="What are you working on?">
              <input className="input" value={taskName} onChange={(e) => setTaskName(e.target.value)} placeholder="e.g. Climatology — Jet Streams revision" />
            </Field>
          </div>
        </Card>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div className="grid cols-3">
            <Card className="stat-card"><div><div className="stat-value">{fmtDuration(focusMinutesToday)}</div><div className="stat-label">Focus today</div></div></Card>
            <Card className="stat-card"><div><div className="stat-value">{pomosDone}</div><div className="stat-label">Pomodoros</div></div></Card>
            <Card className="stat-card"><div><div className="stat-value">{fmtDuration(breakMin)}</div><div className="stat-label">Breaks</div></div></Card>
          </div>
          <Card>
            <CardHead title="This week" hint="focus hours per day" />
            <div className="card-pad" style={{ paddingTop: 12 }}>
              <ColumnsChart data={weekData} height={130} />
            </div>
          </Card>
          <Card>
            <CardHead title="Recent sessions" />
            <div className="card-pad" style={{ paddingTop: 8, display: 'flex', flexDirection: 'column', gap: 6 }}>
              {recent.length === 0 && <Empty icon="⏱" title="No sessions yet" hint="Start your first pomodoro" />}
              {recent.map((s) => (
                <div key={s.id} className="row small">
                  <span style={{ color: s.sessionType === 'focus' ? 'var(--accent)' : 'var(--ok)' }}>{s.sessionType === 'focus' ? '◐' : '◇'}</span>
                  <span className="grow" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontWeight: 600 }}>{s.taskName}</span>
                  <span className="tiny muted">{new Date(s.startedAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</span>
                  <b className="mono tiny">{fmtDuration(s.durationMinutes)}</b>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </>
  );
}

export { dateFromKey };
