/** Study Hours / Consistency — focus-session heatmap, trends and streaks. */
import React, { useMemo } from 'react';
import { useStore } from '../store/store';
import { Card, CardHead, Empty } from '../ui/components';
import { Heatmap, ColumnsChart, Sparkline } from '../ui/charts';
import { fmtDuration, todayKey, addDays, startOfWeek, WEEKDAY_LABELS, computeStreak, dateFromKey } from '../lib/date';
import { focusMinutesByApplicationDay } from '../store/selectors';

export function StudyHours() {
  const { db } = useStore();

  const today = todayKey();

  const minutesByDay = useMemo(() => focusMinutesByApplicationDay(db), [db.focusSessions]);

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

    </>
  );
}
