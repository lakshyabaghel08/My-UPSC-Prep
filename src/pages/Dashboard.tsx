/** Dashboard — your UPSC preparation at a glance. */
import React, { useMemo } from 'react';
import { useStore } from '../store/store';
import { navigate } from '../ui/router';
import { dashboardStats, paperStats, taskTrend, confidenceSplit } from '../store/selectors';
import { Card, CardHead, Bar, Empty, RChip } from '../ui/components';
import { ColumnsChart, HBars, LineChart, Donut } from '../ui/charts';
import { WEEKDAY_LABELS, todayKey, relDay, fmtDuration } from '../lib/date';
import { syllabus, itemTitle } from '../data/syllabus';

export function Dashboard() {
  const { db } = useStore();
  const stats = useMemo(() => dashboardStats(db), [db]);
  const trend = useMemo(() => taskTrend(db, 14), [db]);
  const conf = useMemo(() => confidenceSplit(db), [db]);
  const papers = useMemo(() => paperStats(db), [db]);
  const today = todayKey();

  const todaysTasks = db.tasks
    .filter((t) => t.deadline <= today && t.status !== 'completed')
    .sort((a, b) => a.deadline.localeCompare(b.deadline) || (a.startTime?.localeCompare(b.startTime ?? '') ?? 0))
    .slice(0, 7);

  const revisionDue = Object.values(db.progress)
    .filter((p) => p.revisionCount > 0 && p.nextRevisionAt && p.nextRevisionAt.slice(0, 10) <= today && p.revisionCount < 5)
    .sort((a, b) => (a.nextRevisionAt ?? '').localeCompare(b.nextRevisionAt ?? ''))
    .slice(0, 6);

  const hoursThisWeek = stats.days7.map((d, i) => ({
    label: WEEKDAY_LABELS[new Date(d.day + 'T00:00:00').getDay()],
    values: [{ name: 'Study hrs', value: Math.round((d.minutes / 60) * 10) / 10 }],
  }));

  const paperRows = papers
    .filter((p) => p.total > 0)
    .map((p) => ({ label: p.paper.title.replace('Geography Optional — ', 'Geo Opt '), pct: p.pct }));

  const upcomingTests = [
    ...db.prelimsTests.map((t) => ({ name: t.testName, date: t.testDate, kind: 'Prelims' })),
    ...db.mainsTests.map((t) => ({ name: t.testName, date: t.testDate, kind: 'Mains' })),
  ].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 4);

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Dashboard</h1>
          <div className="sub">UPSC CSE {db.settings.targetExamYear} · {db.settings.optional} Optional · your preparation at a glance</div>
        </div>
      </div>

      <div className="grid cols-5" style={{ marginBottom: 14 }}>
        <Stat onClick={() => navigate('/tasks')} icon="✓" tone="ok" value={`${stats.tasks.done}/${stats.tasks.today}`} label="Today's tasks" extra={stats.tasks.overdue ? `${stats.tasks.overdue} overdue` : 'on track'} />
        <Stat onClick={() => navigate('/syllabus')} icon="☰" tone="accent" value={`${stats.syllabus.pct}%`} label="Syllabus" extra={`${stats.syllabus.done}/${stats.syllabus.total} subtopics`} />
        <Stat onClick={() => navigate('/revision')} icon="↻" tone={stats.revision.overdue ? 'bad' : 'geo'} value={`${stats.revision.dueToday + stats.revision.overdue}`} label="Revisions due" extra={stats.revision.overdue ? `${stats.revision.overdue} overdue` : `${stats.revision.revisedItems} items in cycle`} />
        <Stat onClick={() => navigate('/tests')} icon="A" tone="warn" value={stats.tests.count ? `${stats.tests.avg}%` : '—'} label="Test avg" extra={stats.tests.count ? `${stats.tests.count} tests` : 'no tests yet'} />
        <Stat onClick={() => navigate('/hours')} icon="🔥" tone="bad" value={`${stats.streak}d`} label="Streak" extra={`${fmtDuration(stats.weekMinutes)} this week`} />
      </div>

      <div className="grid" style={{ gridTemplateColumns: '1.05fr 1.4fr', marginBottom: 14 }}>
        <Card>
          <CardHead title="Study hours" icon="⏱" hint="last 7 days" right={<span style={{ fontWeight: 800 }}>{fmtDuration(stats.weekMinutes)}</span>} />
          <div className="card-pad" style={{ paddingTop: 10 }}>
            {stats.weekMinutes > 0 ? <ColumnsChart data={hoursThisWeek} height={150} /> : <Empty icon="⏱" title="No sessions this week" hint="Log focus time from the Study Timer" action={<button className="btn sm" onClick={() => navigate('/timer')}>Open timer</button>} />}
            <hr className="divider" />
            <div className="row small soft" style={{ justifyContent: 'space-between' }}>
              <span>Today: <b style={{ color: 'var(--text)' }}>{fmtDuration(stats.todayMinutes)}</b> / target {fmtDuration(db.settings.dailyTargetMinutes)}</span>
              <span>{Math.round((stats.todayMinutes / db.settings.dailyTargetMinutes) * 100)}%</span>
            </div>
          </div>
        </Card>

        <Card>
          <CardHead title="Paper progress" icon="☰" hint="leaf-unit completion" right={<span style={{ fontWeight: 800 }}>{stats.syllabus.pct}% overall</span>} />
          <div className="card-pad" style={{ paddingTop: 14 }}>
            {paperRows.length ? <HBars rows={paperRows} /> : <Empty title="Syllabus loads automatically" hint="Progress appears as you complete topics" />}
          </div>
        </Card>
      </div>

      <div className="grid" style={{ gridTemplateColumns: '1.3fr 1fr 1fr' }}>
        <Card>
          <CardHead title="Task trend" icon="◫" hint="last 14 days" right={
            <span className="legend">
              <span><span className="dot" style={{ background: 'var(--ok)' }} /> completed</span>
              <span><span className="dot" style={{ background: 'var(--accent)' }} /> planned</span>
            </span>} />
          <div className="card-pad" style={{ paddingTop: 8 }}>
            <LineChart
              height={175}
              series={[
                { name: 'planned', color: 'var(--accent)', points: trend.map((t) => t.created) },
                { name: 'completed', color: 'var(--ok)', points: trend.map((t) => t.completed) },
              ]}
              xLabels={trend.map((t) => `${t.day.slice(8)}/${t.day.slice(5, 7)}`)}
            />
          </div>
        </Card>

        <Card>
          <CardHead title="Today & overdue" icon="✓" right={<button className="link-btn" onClick={() => navigate('/tasks')}>Planner →</button>} />
          <div className="card-pad" style={{ paddingTop: 8, display: 'flex', flexDirection: 'column', gap: 7 }}>
            {todaysTasks.length === 0 && <Empty icon="🌤" title="Nothing pending" hint="Add tasks in the Daily Planner" />}
            {todaysTasks.map((t) => (
              <div key={t.id} className="row" style={{ gap: 9 }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', flexShrink: 0, background: t.deadline < today ? 'var(--bad)' : t.priority === 'critical' ? 'var(--warn)' : 'var(--accent)' }} />
                <span className="small grow" style={{ fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.name}</span>
                <span className="tiny muted" style={{ flexShrink: 0 }}>{relDay(t.deadline)}</span>
              </div>
            ))}
          </div>
        </Card>

        <Card>
          <CardHead title="Revision due" icon="↻" right={<button className="link-btn" onClick={() => navigate('/revision')}>Revise →</button>} />
          <div className="card-pad" style={{ paddingTop: 8, display: 'flex', flexDirection: 'column', gap: 8 }}>
            {revisionDue.length === 0 && <Empty icon="✨" title="Queue clear" hint="Mark topics completed to feed the R1–R5 cycle" />}
            {revisionDue.map((p) => {
              const title = syllabus.subtopicById.get(p.itemId)?.title ?? syllabus.topicById.get(p.itemId)?.title ?? itemTitle(p.itemId, 'subtopic');
              return (
                <div key={p.itemId} className="row" style={{ gap: 9 }}>
                  <RChip count={p.revisionCount} />
                  <span className="small grow" style={{ fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={title}>{title}</span>
                  <span className="tiny muted" style={{ flexShrink: 0 }}>{p.nextRevisionAt!.slice(0, 10) < today ? 'overdue' : relDay(p.nextRevisionAt!.slice(0, 10))}</span>
                </div>
              );
            })}
          </div>
        </Card>
      </div>

      <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', marginTop: 14 }}>
        <Card>
          <CardHead title="Confidence split" icon="◐" hint="revised items by confidence" />
          <div className="card-pad" style={{ paddingTop: 14 }}>
            {conf.low + conf.medium + conf.high === 0
              ? <Empty icon="◐" title="No revisions yet" hint="Run your first R1 from the Revision page" />
              : <Donut
                  segments={[
                    { label: 'High', value: conf.high, color: 'var(--ok)' },
                    { label: 'Medium', value: conf.medium, color: 'var(--warn)' },
                    { label: 'Low', value: conf.low, color: 'var(--bad)' },
                  ]}
                  centerLabel={`${conf.high + conf.medium + conf.low}`}
                  centerSub="items"
                />}
          </div>
        </Card>
        <Card>
          <CardHead title="Recent tests" icon="A" right={<button className="link-btn" onClick={() => navigate('/tests')}>All tests →</button>} />
          <div className="card-pad" style={{ paddingTop: 8 }}>
            {upcomingTests.length === 0 ? <Empty icon="A" title="No tests logged" hint="Track mocks in the Test Tracker" /> : (
              <div className="table-wrap">
                <table className="tbl">
                  <thead><tr><th>Test</th><th>Type</th><th>Date</th></tr></thead>
                  <tbody>
                    {upcomingTests.map((t, i) => (
                      <tr key={i}>
                        <td style={{ fontWeight: 600, maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.name}</td>
                        <td><span className={`chip ${t.kind === 'Prelims' ? 'info' : 'accent'}`}>{t.kind}</span></td>
                        <td className="num muted">{t.date}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </Card>
      </div>
    </>
  );
}

function Stat({ icon, value, label, extra, tone = 'accent', onClick }: { icon: string; value: string; label: string; extra?: string; tone?: 'accent' | 'ok' | 'warn' | 'bad' | 'geo'; onClick?: () => void }) {
  const toneVar = { accent: 'var(--accent)', ok: 'var(--ok)', warn: 'var(--warn)', bad: 'var(--bad)', geo: 'var(--geo)' }[tone];
  const toneSoft = { accent: 'var(--accent-soft)', ok: 'var(--ok-soft)', warn: 'var(--warn-soft)', bad: 'var(--bad-soft)', geo: 'var(--geo-soft)' }[tone];
  return (
    <Card className="stat-card" >
      <div onClick={onClick}>
        <div className="stat-top">
          <span className="stat-ico" style={{ background: toneSoft, color: toneVar }}>{icon}</span>
        </div>
        <div className="stat-value">{value}</div>
        <div className="stat-label">{label}</div>
        {extra && <div className="stat-extra">{extra}</div>}
      </div>
    </Card>
  );
}
