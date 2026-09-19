/** Study Hours / Consistency — heatmap, trends, streaks and habit tracking. */
import React, { useMemo, useState } from 'react';
import { useStore } from '../store/store';
import { Card, CardHead, Empty, Confirm } from '../ui/components';
import { Heatmap, ColumnsChart, Sparkline } from '../ui/charts';
import { fmtDuration, todayKey, addDays, startOfWeek, WEEKDAY_LABELS, computeStreak, dateFromKey } from '../lib/date';
import { useToast } from '../ui/toast';

const HABIT_COLORS = ['#6d8cff', '#2dd4bf', '#fbbf24', '#f87171', '#ec4899', '#38bdf8'];

export function StudyHours() {
  const { db, addHabit, deleteHabit, toggleHabit } = useStore();
  const { push } = useToast();
  const [habitName, setHabitName] = useState('');
  const [deletingHabit, setDeletingHabit] = useState<string | null>(null);

  const today = todayKey();

  const minutesByDay = useMemo(() => {
    const m = new Map<string, number>();
    for (const s of db.focusSessions) {
      if (s.sessionType !== 'focus' || !s.completed) continue;
      const key = todayKey(new Date(s.startedAt));
      m.set(key, (m.get(key) ?? 0) + s.durationMinutes);
    }
    return m;
  }, [db.focusSessions]);

  const days30 = useMemo(() => Array.from({ length: 30 }, (_, i) => {
    const key = addDays(today, -(29 - i));
    return { key, minutes: minutesByDay.get(key) ?? 0 };
  }), [minutesByDay, today]);

  const activeDays = useMemo(() => {
    const s = new Set<string>();
    for (const k of minutesByDay.keys()) if (minutesByDay.get(k)! > 0) s.add(k);
    for (const t of db.tasks) if (t.completedAt) s.add(todayKey(new Date(t.completedAt)));
    return s;
  }, [minutesByDay, db.tasks]);

  const streak = computeStreak(activeDays, today);
  const bestStreak = useMemo(() => {
    const sorted = [...activeDays].sort();
    let best = 0, cur = 0, prev = '';
    for (const d of sorted) {
      if (prev && addDays(prev, 1) === d) cur++;
      else cur = 1;
      best = Math.max(best, cur);
      prev = d;
    }
    return best;
  }, [activeDays]);

  const weekStart = startOfWeek(today);
  const thisWeekMin = days30.filter((d) => d.key >= weekStart).reduce((a, d) => a + d.minutes, 0);
  const lastWeekMin = Array.from({ length: 7 }, (_, i) => minutesByDay.get(addDays(weekStart, -(7 - i))) ?? 0).reduce((a, b) => a + b, 0);
  const activeLast30 = days30.filter((d) => d.minutes > 0).length;
  const avgPerActiveDay = activeLast30 ? Math.round(days30.reduce((a, d) => a + d.minutes, 0) / activeLast30) : 0;
  const targetHit30 = days30.filter((d) => d.minutes >= db.settings.dailyTargetMinutes).length;

  const weekBars = useMemo(() => {
    const start = startOfWeek(today);
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(start);
      d.setDate(d.getDate() + i);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      return { label: WEEKDAY_LABELS[d.getDay()], values: [{ name: 'hrs', value: Math.round(((minutesByDay.get(key) ?? 0) / 60) * 10) / 10 }] };
    });
  }, [minutesByDay, today]);

  const last7 = days30.slice(-7).map((d) => d.minutes);

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Study Hours & Consistency</h1>
          <div className="sub">Focus time comes from the Study Timer · consistency beats intensity</div>
        </div>
      </div>

      <div className="grid cols-5" style={{ marginBottom: 14 }}>
        <Card className="stat-card"><div><div className="stat-value" style={{ color: 'var(--bad)' }}>{streak}d</div><div className="stat-label">Current streak</div><div className="stat-extra">best {bestStreak}d</div></div></Card>
        <Card className="stat-card"><div><div className="stat-value">{fmtDuration(thisWeekMin)}</div><div className="stat-label">This week</div><div className="stat-extra">{lastWeekMin ? `${thisWeekMin >= lastWeekMin ? '+' : ''}${Math.round(((thisWeekMin - lastWeekMin) / lastWeekMin) * 100)}% vs last week` : 'fresh week'}</div></div></Card>
        <Card className="stat-card"><div><div className="stat-value">{fmtDuration(avgPerActiveDay)}</div><div className="stat-label">Avg / active day</div><div className="stat-extra">last 30 days</div></div></Card>
        <Card className="stat-card"><div><div className="stat-value">{activeLast30}/30</div><div className="stat-label">Active days</div></div></Card>
        <Card className="stat-card"><div><div className="stat-value">{targetHit30}</div><div className="stat-label">Target hit</div><div className="stat-extra">days ≥ {fmtDuration(db.settings.dailyTargetMinutes)}</div></div></Card>
      </div>

      <div className="grid" style={{ gridTemplateColumns: '1.6fr 1fr', marginBottom: 14 }}>
        <Card>
          <CardHead title="Consistency heatmap" hint="focus minutes per day" />
          <div className="card-pad" style={{ paddingTop: 14 }}>
            {minutesByDay.size === 0 ? <Empty icon="▥" title="No focus data yet" hint="Run the Study Timer — sessions appear here" /> : <Heatmap minutesByDay={minutesByDay} />}
          </div>
        </Card>
        <Card>
          <CardHead title="Last 7 days trend" />
          <div className="card-pad" style={{ paddingTop: 14 }}>
            <Sparkline points={last7} color="var(--geo)" height={60} />
            <div className="row small soft" style={{ justifyContent: 'space-between', marginTop: 6 }}>
              <span>min: {Math.round(Math.min(...last7))}m</span>
              <span>max: {Math.round(Math.max(...last7))}m</span>
            </div>
            <hr className="divider" />
            <ColumnsChart data={weekBars} height={110} />
          </div>
        </Card>
      </div>

      <Card>
        <CardHead title="Daily habits" hint="rituals that compound" right={
          <form className="row" style={{ gap: 6 }} onSubmit={(e) => { e.preventDefault(); if (habitName.trim()) { addHabit(habitName.trim(), HABIT_COLORS[db.habits.length % HABIT_COLORS.length]); setHabitName(''); push('Habit added', 'ok'); } }}>
            <input className="input input-sm" style={{ width: 170 }} placeholder="New habit…" value={habitName} onChange={(e) => setHabitName(e.target.value)} />
            <button className="btn sm" type="submit">+ Add</button>
          </form>
        } />
        <div className="card-pad" style={{ paddingTop: 10 }}>
          {db.habits.length === 0 ? <Empty icon="⚑" title="No habits yet" hint="e.g. Newspaper, 2 answers, Map practice, Revision hour" /> : (
            <div className="table-wrap">
              <table className="tbl">
                <thead>
                  <tr>
                    <th>Habit</th>
                    {Array.from({ length: 7 }, (_, i) => <th key={i} style={{ textAlign: 'center' }}>{WEEKDAY_LABELS[dateFromKey(addDays(startOfWeek(today), i)).getDay()]}</th>)}
                    <th style={{ textAlign: 'center' }}>30d</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {db.habits.map((h) => {
                    const last7done = Array.from({ length: 7 }, (_, i) => db.habitCompletions.some((c) => c.habitId === h.id && c.date === addDays(startOfWeek(today), i)));
                    const done30 = Array.from({ length: 30 }, (_, i) => db.habitCompletions.some((c) => c.habitId === h.id && c.date === addDays(today, -i))).filter(Boolean).length;
                    return (
                      <tr key={h.id}>
                        <td><span className="row" style={{ gap: 8 }}><span style={{ width: 10, height: 10, borderRadius: 3, background: h.color }} /><b>{h.name}</b></span></td>
                        {last7done.map((d, i) => (
                          <td key={i} style={{ textAlign: 'center' }}>
                            <button onClick={() => toggleHabit(h.id, addDays(startOfWeek(today), i))}
                              style={{ width: 22, height: 22, borderRadius: 7, border: d ? 'none' : '2px solid var(--line-strong)', background: d ? h.color : 'transparent', cursor: 'pointer', color: '#fff', fontSize: 11 }}>
                              {d ? '✓' : ''}
                            </button>
                          </td>
                        ))}
                        <td style={{ textAlign: 'center' }}><b className="mono">{done30}</b></td>
                        <td><div className="actions"><button className="icon-btn" style={{ width: 27, height: 27, fontSize: 12 }} onClick={() => setDeletingHabit(h.id)}>🗑</button></div></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </Card>

      <Confirm open={!!deletingHabit} onClose={() => setDeletingHabit(null)} onConfirm={() => deletingHabit && deleteHabit(deletingHabit)} title="Delete habit?" body="The habit and its completion history will be removed." />
    </>
  );
}
