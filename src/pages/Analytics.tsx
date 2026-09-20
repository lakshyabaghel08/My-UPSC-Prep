/** Preparation Analytics — cross-module insights: coverage, velocity, revision health, tests. */
import React, { useMemo } from 'react';
import { useStore } from '../store/store';
import { Card, CardHead, Empty, Bar } from '../ui/components';
import { HBars, LineChart, Donut } from '../ui/charts';
import {
  dashboardStats, treeStats, paperStats, prelimsAnalytics, mainsAnalytics,
  confidenceSplit, taskTrend, subjectProgressForPaper,
} from '../store/selectors';
import { syllabus } from '../data/syllabus';
import { fmtDuration } from '../lib/date';
import { navigate } from '../ui/router';
import { daysUntilExam, examDatesFor } from '../config/exams';
import { leafNodes } from '../lib/syllabusProgress';

export function Analytics() {
  const { db } = useStore();
  const stats = useMemo(() => dashboardStats(db), [db]);
  const papers = useMemo(() => paperStats(db), [db]);
  const pa = useMemo(() => prelimsAnalytics(db), [db]);
  const ma = useMemo(() => mainsAnalytics(db), [db]);
  const conf = useMemo(() => confidenceSplit(db), [db]);
  const trend = useMemo(() => taskTrend(db, 21), [db]);
  const geo = syllabus.papers.filter((p) => p.category === 'optional');

  // Official dates are centralized; years without a configured official
  // calendar deliberately show no speculative countdown.
  const examYear = db.settings.targetExamYear;
  const examDates = examDatesFor(examYear);
  const daysLeft = examDates ? daysUntilExam(examDates.prelims) : null;
  const weeksLeft = daysLeft == null ? null : Math.max(0, Math.floor(daysLeft / 7));

  // pace model: completed subtopics per active week over last 8 weeks (by updatedAt)
  const velocity = useMemo(() => {
    const weeks = 8;
    const now = Date.now();
    const buckets = Array.from({ length: weeks }, () => 0);
    const leaves = new Set(leafNodes().map((node) => node.id));
    for (const p of Object.values(db.progress)) {
      if (p.status !== 'completed' || !leaves.has(p.itemId)) continue;
      const t = new Date(p.updatedAt).getTime();
      const wks = Math.floor((now - t) / (7 * 86400000));
      if (wks < weeks) buckets[weeks - 1 - wks]++;
    }
    const recent = buckets.slice(2);
    const avgPerWeek = recent.length ? Math.round(recent.reduce((a, b) => a + b, 0) / recent.length) : 0;
    const remaining = stats.syllabus.total - stats.syllabus.done;
    const weeksNeeded = avgPerWeek > 0 ? Math.ceil(remaining / avgPerWeek) : null;
    return { buckets, avgPerWeek, remaining, weeksNeeded };
  }, [db.progress, stats.syllabus]);

  // weakest subjects (lowest completion with meaningful size)
  const weakest = useMemo(() => {
    const rows: { label: string; pct: number; hint: string }[] = [];
    for (const p of syllabus.papers) {
      for (const s of subjectProgressForPaper(p.id, db)) {
        if (s.total >= 8) rows.push({ label: `${p.title.replace('Geography Optional — ', 'Geo ')} · ${s.subject.title}`, pct: s.pct, hint: `${s.completed}/${s.total}` });
      }
    }
    return rows.sort((a, b) => a.pct - b.pct).slice(0, 8);
  }, [db]);

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Preparation Analytics</h1>
          <div className="sub">The honest picture — coverage, pace, revision health and test performance</div>
        </div>
      </div>

      <div className="grid cols-4" style={{ marginBottom: 14 }}>
        <Card className="stat-card"><div><div className="stat-value" style={{ color: daysLeft != null && daysLeft > 0 ? 'var(--accent)' : 'var(--text-faint)' }}>{daysLeft != null && daysLeft > 0 ? daysLeft : '—'}</div><div className="stat-label">Days to Prelims {examYear}</div><div className="stat-extra">{examDates ? `${weeksLeft} weeks · official 23 May` : 'official date not configured'}</div></div></Card>
        <Card className="stat-card"><div><div className="stat-value">{stats.syllabus.pct}%</div><div className="stat-label">Syllabus covered</div><div className="stat-extra">{stats.syllabus.done} of {stats.syllabus.total} units</div></div></Card>
        <Card className="stat-card"><div><div className="stat-value">{velocity.avgPerWeek}</div><div className="stat-label">Units / week pace</div><div className="stat-extra">{velocity.weeksNeeded ? `~${velocity.weeksNeeded}w to finish` : 'log progress to estimate'}</div></div></Card>
        <Card className="stat-card"><div><div className="stat-value">{stats.streak}d</div><div className="stat-label">Streak</div><div className="stat-extra">{fmtDuration(stats.weekMinutes)} this week</div></div></Card>
      </div>

      <div className="grid" style={{ gridTemplateColumns: '1.4fr 1fr', marginBottom: 14 }}>
        <Card>
          <CardHead title="Completion velocity" hint="units marked completed per week (last 8)" />
          <div className="card-pad" style={{ paddingTop: 10 }}>
            {velocity.buckets.every((b) => b === 0)
              ? <Empty icon="◭" title="No completion history yet" hint="Mark subtopics completed in the Syllabus" />
              : (
                <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, height: 150 }}>
                  {velocity.buckets.map((v, i) => {
                    const max = Math.max(1, ...velocity.buckets);
                    return (
                      <div key={i} className="grow" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                        <b className="tiny mono">{v || ''}</b>
                        <div style={{ width: '100%', maxWidth: 34, height: `${Math.max(2, (v / max) * 100)}%`, background: 'var(--accent)', borderRadius: 6, opacity: 0.9 }} />
                        <span className="tiny muted">{i === velocity.buckets.length - 1 ? 'now' : `-${velocity.buckets.length - 1 - i}w`}</span>
                      </div>
                    );
                  })}
                </div>
              )}
          </div>
        </Card>
        <Card>
          <CardHead title="Revision health" hint="items in the R1–R5 cycle" right={<button className="link-btn" onClick={() => navigate('/revision')}>Open →</button>} />
          <div className="card-pad" style={{ paddingTop: 14 }}>
            {conf.low + conf.medium + conf.high === 0
              ? <Empty icon="↻" title="No revisions logged" />
              : <Donut segments={[
                { label: 'High confidence', value: conf.high, color: 'var(--ok)' },
                { label: 'Medium', value: conf.medium, color: 'var(--warn)' },
                { label: 'Low', value: conf.low, color: 'var(--bad)' },
              ]} centerLabel={`${stats.revision.revisedItems}`} centerSub="in cycle" />}
            <hr className="divider" />
            <div className="row small" style={{ justifyContent: 'space-between' }}>
              <span className="soft">Due today</span><b style={{ color: 'var(--warn)' }}>{stats.revision.dueToday}</b>
            </div>
            <div className="row small" style={{ justifyContent: 'space-between', marginTop: 4 }}>
              <span className="soft">Overdue</span><b style={{ color: 'var(--bad)' }}>{stats.revision.overdue}</b>
            </div>
            <div className="row small" style={{ justifyContent: 'space-between', marginTop: 4 }}>
              <span className="soft">Mastered (R5)</span><b style={{ color: 'var(--ok)' }}>{stats.revision.maxedItems}</b>
            </div>
          </div>
        </Card>
      </div>

      <div className="grid" style={{ gridTemplateColumns: '1.4fr 1fr', marginBottom: 14 }}>
        <Card>
          <CardHead title="Weakest areas" hint="lowest completion subjects (≥8 units)" right={<button className="link-btn" onClick={() => navigate('/syllabus')}>Syllabus →</button>} />
          <div className="card-pad" style={{ paddingTop: 14 }}>
            {weakest.length === 0 ? <p className="small muted">Progress data appears as you study.</p> : <HBars rows={weakest} tone="var(--warn)" />}
          </div>
        </Card>
        <Card>
          <CardHead title="Task discipline" hint="last 21 days" />
          <div className="card-pad" style={{ paddingTop: 8 }}>
            <LineChart height={165} series={[
              { name: 'planned', color: 'var(--accent)', points: trend.map((t) => t.created) },
              { name: 'completed', color: 'var(--ok)', points: trend.map((t) => t.completed) },
            ]} xLabels={trend.map((t) => t.day.slice(8))} />
            <hr className="divider" />
            <div className="row small" style={{ justifyContent: 'space-between' }}>
              <span className="soft">Overdue tasks</span>
              <b style={{ color: stats.tasks.overdue ? 'var(--bad)' : 'var(--ok)' }}>{stats.tasks.overdue}</b>
            </div>
          </div>
        </Card>
      </div>

      <div className="grid" style={{ gridTemplateColumns: '1fr 1fr' }}>
        <Card>
          <CardHead title="Test performance" hint={`${pa.count + ma.count} tests logged`} right={<button className="link-btn" onClick={() => navigate('/tests')}>Test tracker →</button>} />
          <div className="card-pad" style={{ paddingTop: 12 }}>
            {pa.count === 0 && ma.count === 0 ? <Empty icon="A" title="No tests yet" hint="Mock data powers the strongest analytics" /> : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div className="row small" style={{ justifyContent: 'space-between' }}>
                  <span className="soft">Prelims avg score</span><b>{pa.avgScore}% <span className="tiny muted">(acc {pa.avgAccuracy}%)</span></b>
                </div>
                <Bar value={pa.avgScore} tone={pa.avgScore >= 50 ? 'ok' : 'warn'} />
                <div className="row small" style={{ justifyContent: 'space-between' }}>
                  <span className="soft">Mains avg marks</span><b>{ma.avgMarks}%</b>
                </div>
                <Bar value={ma.avgMarks} tone={ma.avgMarks >= 50 ? 'ok' : 'warn'} />
                <p className="tiny muted">Safe-zone reference: Prelims cutoffs have historically hovered near 45–50% of max marks; Mains selection typically needs ~50%+ per paper.</p>
              </div>
            )}
          </div>
        </Card>
        <Card>
          <CardHead title="Geography Optional coverage" hint="your scoring edge" right={<button className="link-btn" onClick={() => navigate('/lectures')}>Lectures →</button>} />
          <div className="card-pad" style={{ paddingTop: 14 }}>
            <HBars rows={papers.filter((p) => p.paper.category === 'optional').map((p) => ({ label: p.paper.title.replace('Geography Optional — ', 'Paper '), pct: p.pct, hint: `${p.completed}/${p.total}` }))} tone="var(--geo)" />
            <hr className="divider" />
            <div className="row small" style={{ justifyContent: 'space-between' }}>
              <span className="soft">Lecture series tracked</span><b>{stats.lectures.series}</b>
            </div>
            <div className="row small" style={{ justifyContent: 'space-between', marginTop: 4 }}>
              <span className="soft">Lectures completed</span><b>{stats.lectures.completed}/{stats.lectures.total}</b>
            </div>
            <div className="row small" style={{ justifyContent: 'space-between', marginTop: 4 }}>
              <span className="soft">PYQs attempted (lectures)</span><b>{stats.lectures.pyqs}</b>
            </div>
          </div>
        </Card>
      </div>
    </>
  );
}
