/** Dashboard — a calm, action-first command centre backed only by real data. */
import React, { useMemo } from 'react';
import { useStore } from '../store/store';
import { navigate } from '../ui/router';
import { confidenceSplit, dashboardStats, lectureSummary, paperStats, taskTrend } from '../store/selectors';
import { Bar, Card, CardHead, Empty, RChip } from '../ui/components';
import { ColumnsChart, Donut, HBars, LineChart } from '../ui/charts';
import { fmtDuration, relDay, todayKey, WEEKDAY_LABELS } from '../lib/date';
import { itemTitle, syllabus } from '../data/syllabus';
import { lectureProgress } from '../lib/lectures';
import { daysUntilExam, examDatesFor } from '../config/exams';

export function Dashboard() {
  const { db } = useStore();
  const stats = useMemo(() => dashboardStats(db), [db]);
  const trend = useMemo(() => taskTrend(db, 14), [db]);
  const confidence = useMemo(() => confidenceSplit(db), [db]);
  const papers = useMemo(() => paperStats(db), [db]);
  const lectures = useMemo(() => lectureSummary(db), [db]);
  const today = todayKey();

  const todaysTasks = db.tasks
    .filter((task) => task.deadline <= today && task.status !== 'completed')
    .sort((a, b) => a.deadline.localeCompare(b.deadline) || (a.startTime ?? '99:99').localeCompare(b.startTime ?? '99:99'));
  const todaysDone = db.tasks.filter((task) => task.deadline === today && task.status === 'completed');

  const revisions = Object.values(db.progress)
    .filter((progress) => progress.revisionCount > 0 && progress.nextRevisionAt && todayKey(new Date(progress.nextRevisionAt)) <= today && progress.revisionCount < 5)
    .sort((a, b) => (a.nextRevisionAt ?? '').localeCompare(b.nextRevisionAt ?? ''));

  const activeLecture = [...db.lectures]
    .filter((lecture) => lectureProgress(lecture).remaining > 0)
    .sort((a, b) => (b.lastWatchedAt ?? b.createdAt).localeCompare(a.lastWatchedAt ?? a.createdAt))[0] ?? null;
  const activeLectureProgress = activeLecture ? lectureProgress(activeLecture) : null;
  const activeSyllabus = Object.values(db.progress)
    .filter((progress) => progress.status === 'in_progress')
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))[0] ?? null;

  const hoursThisWeek = stats.days7.map((day) => ({
    label: WEEKDAY_LABELS[new Date(`${day.day}T00:00:00`).getDay()],
    values: [{ name: 'Study hrs', value: Math.round(day.minutes / 6) / 10 }],
  }));
  const paperRows = papers.filter((paper) => paper.total > 0).map((paper) => ({
    label: paper.paper.title.replace('Geography Optional — ', 'Geo · '), pct: paper.pct,
  }));
  const geoPapers = papers.filter((paper) => paper.paper.category === 'optional');
  const geoDone = geoPapers.reduce((sum, paper) => sum + paper.completed, 0);
  const geoTotal = geoPapers.reduce((sum, paper) => sum + paper.total, 0);
  const geoPct = geoTotal ? Math.round(geoDone / geoTotal * 100) : 0;

  const upcomingTests = [
    ...db.prelimsTests.map((test) => ({ name: test.testName, date: test.testDate, kind: 'Prelims' })),
    ...db.mainsTests.map((test) => ({ name: test.testName, date: test.testDate, kind: 'Mains' })),
  ].filter((test) => test.date >= today).sort((a, b) => a.date.localeCompare(b.date)).slice(0, 5);

  const examDates = examDatesFor(db.settings.targetExamYear);
  const prelimsDays = examDates ? daysUntilExam(examDates.prelims, today) : null;
  const needsAttention = stats.tasks.overdue + stats.revision.overdue;

  return (
    <>
      <div className="page-head dashboard-head">
        <div>
          <span className="eyebrow">YOUR PREPARATION COMMAND CENTRE</span>
          <h1>Today, with intention.</h1>
          <div className="sub">UPSC CSE {db.settings.targetExamYear} · {db.settings.optional} Optional · application day resets at 4:00 AM</div>
        </div>
        {examDates && (
          <div className="exam-date-strip">
            <span><b>{prelimsDays != null && prelimsDays >= 0 ? prelimsDays : '—'}</b> days to Prelims</span>
            <span>23 May 2027</span>
            <i />
            <span>Mains · 20 Aug 2027</span>
          </div>
        )}
      </div>

      <section className="dashboard-primary-grid">
        <Card className="today-study-card">
          <div className="action-card-kicker">TODAY'S STUDY</div>
          <div className="today-study-value">{fmtDuration(stats.todayMinutes)}</div>
          <div className="soft small">of {fmtDuration(db.settings.dailyTargetMinutes)} daily focus target</div>
          <Bar value={db.settings.dailyTargetMinutes ? stats.todayMinutes / db.settings.dailyTargetMinutes * 100 : 0} tone="ok" />
          <div className="today-study-meta">
            <span><b>{db.focusSessions.filter((session) => session.completed && session.sessionType === 'focus' && todayKey(new Date(session.startedAt)) === today).length}</b> sessions</span>
            <span><b>{todaysDone.length}</b> tasks done</span>
            <span><b>{stats.streak}d</b> streak</span>
          </div>
          <button className="btn primary" onClick={() => navigate('/timer')}>Start a focus session →</button>
        </Card>

        <Card className="continue-study-card">
          <div className="action-card-kicker">CONTINUE STUDYING</div>
          {activeLecture && activeLectureProgress ? (
            <>
              <div className="continue-icon">▶</div>
              <div className="continue-context">GEOGRAPHY OPTIONAL · {activeLecture.subject}</div>
              <h2>{activeLecture.title}</h2>
              <p className="soft">Next: Lecture {activeLectureProgress.next} · {activeLectureProgress.remaining} remaining</p>
              <Bar value={activeLectureProgress.pct} tone="geo" />
              <button className="btn geo" onClick={() => navigate('/lectures')}>Continue lecture series →</button>
            </>
          ) : activeSyllabus ? (
            <>
              <div className="continue-icon">☰</div>
              <div className="continue-context">OPERATIONAL SYLLABUS</div>
              <h2>{itemTitle(activeSyllabus.itemId, activeSyllabus.itemType)}</h2>
              <p className="soft">Last updated {new Date(activeSyllabus.updatedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</p>
              <button className="btn" onClick={() => navigate('/syllabus')}>Open syllabus →</button>
            </>
          ) : (
            <Empty icon="◇" title="No active study item" hint="Start a lecture or mark a syllabus item in progress and it will appear here."
              action={<button className="btn" onClick={() => navigate('/syllabus')}>Open syllabus</button>} />
          )}
        </Card>

        <Card className="todays-plan-card">
          <CardHead title="Today's Plan" hint={`${todaysTasks.length} pending · ${todaysDone.length} complete`} right={<button className="link-btn" onClick={() => navigate('/tasks')}>Planner →</button>} />
          <div className="dashboard-list">
            {todaysTasks.length === 0 && <Empty icon="✓" title="Plan is clear" hint="Add the next meaningful task." />}
            {todaysTasks.slice(0, 5).map((task) => (
              <button key={task.id} className="dashboard-task-row" onClick={() => navigate('/tasks')}>
                <span className={`priority-dot ${task.deadline < today ? 'overdue' : task.priority}`} />
                <span><b>{task.name}</b><small>{task.startTime || relDay(task.deadline)}{task.subjectMapping ? ` · ${task.subjectMapping}` : ''}</small></span>
                {task.estimateMin && <em>{task.estimateMin}m</em>}
              </button>
            ))}
          </div>
        </Card>
      </section>

      <section className="dashboard-support-grid">
        <Card className="geo-priority-card">
          <div className="geo-card-heading">
            <div><span className="action-card-kicker">FIRST-CLASS PRIORITY</span><h2>Geography Optional</h2></div>
            <div className="geo-overall"><b>{geoPct}%</b><span>syllabus</span></div>
          </div>
          <div className="geo-card-content">
            <div>
              <span className="tiny muted">CURRENT LECTURE POSITION</span>
              {activeLecture && activeLectureProgress ? (
                <><strong>{activeLecture.title}</strong><p>Lecture {activeLectureProgress.next ?? activeLecture.rangeEnd} · {activeLectureProgress.count}/{activeLectureProgress.total} complete</p></>
              ) : <><strong>No active series</strong><p>Add an inclusive lecture range to begin.</p></>}
            </div>
            <div>
              <span className="tiny muted">LECTURE COVERAGE</span>
              <strong>{lectures.completed}/{lectures.total}</strong>
              <p>{lectures.pct}% complete · {lectures.total - lectures.completed} remaining</p>
            </div>
          </div>
          <div className="row wrap"><button className="btn geo" onClick={() => navigate('/lectures')}>Open lectures</button><button className="btn ghost" onClick={() => navigate('/syllabus')}>Geo syllabus →</button></div>
        </Card>

        <Card className="attention-card">
          <CardHead title="Needs Attention" hint={needsAttention ? `${needsAttention} items` : 'all clear'} />
          <div className="attention-items">
            <button onClick={() => navigate('/tasks')}><span className="attention-icon bad">!</span><span><b>{stats.tasks.overdue} overdue tasks</b><small>{stats.tasks.upcomingWeek} due in the next week</small></span></button>
            <button onClick={() => navigate('/revision')}><span className="attention-icon warn">↻</span><span><b>{stats.revision.overdue} overdue revisions</b><small>{stats.revision.dueToday} due today</small></span></button>
            <button onClick={() => navigate('/syllabus')}><span className="attention-icon geo">☰</span><span><b>{stats.syllabus.total - stats.syllabus.done} syllabus units remain</b><small>{stats.syllabus.pct}% overall coverage</small></span></button>
          </div>
        </Card>

        <Card className="quick-actions-card">
          <CardHead title="Quick Actions" hint="move the work forward" />
          <div className="quick-action-grid">
            <button onClick={() => navigate('/tasks')}><span>＋</span>Add task</button>
            <button onClick={() => navigate('/timer')}><span>◷</span>Focus</button>
            <button onClick={() => navigate('/revision')}><span>↻</span>Revise</button>
            <button onClick={() => navigate('/lectures')}><span>▶</span>Lecture</button>
          </div>
        </Card>
      </section>

      <div className="dashboard-section-title"><div><span>ANALYTICS</span><h2>Progress at a glance</h2></div><p>Useful signals, below today's work.</p></div>

      <section className="dashboard-analytics-grid">
        <Card className="study-hours-chart">
          <CardHead title="Study Hours" icon="◷" hint="last 7 application days" right={<b>{fmtDuration(stats.weekMinutes)}</b>} />
          <div className="card-pad dashboard-chart-pad">
            {stats.weekMinutes > 0 ? <ColumnsChart data={hoursThisWeek} height={170} /> : <Empty icon="◷" title="No sessions this week" hint="Focus sessions appear here automatically." />}
          </div>
        </Card>
        <Card>
          <CardHead title="Paper Progress" icon="☰" hint="leaf-unit completion" right={<b>{stats.syllabus.pct}%</b>} />
          <div className="card-pad dashboard-chart-pad">{paperRows.length ? <HBars rows={paperRows} /> : <Empty title="No progress yet" hint="Complete syllabus units to build this view." />}</div>
        </Card>
        <Card>
          <CardHead title="Confidence Split" icon="◐" hint="revised items" />
          <div className="card-pad dashboard-chart-pad">
            {confidence.low + confidence.medium + confidence.high === 0 ? <Empty icon="◐" title="No revisions yet" hint="Log R1 to begin." /> : <Donut segments={[
              { label: 'High', value: confidence.high, color: 'var(--ok)' },
              { label: 'Medium', value: confidence.medium, color: 'var(--warn)' },
              { label: 'Low', value: confidence.low, color: 'var(--bad)' },
            ]} centerLabel={`${confidence.low + confidence.medium + confidence.high}`} centerSub="items" />}
          </div>
        </Card>
        <Card className="task-trend-card">
          <CardHead title="Task Trend" icon="◫" hint="last 14 application days" right={<span className="legend"><span><i className="dot ok-dot" /> completed</span><span><i className="dot accent-dot" /> planned</span></span>} />
          <div className="card-pad dashboard-chart-pad"><LineChart height={170} series={[
            { name: 'planned', color: 'var(--accent)', points: trend.map((point) => point.created) },
            { name: 'completed', color: 'var(--ok)', points: trend.map((point) => point.completed) },
          ]} xLabels={trend.map((point) => point.day.slice(8))} /></div>
        </Card>
        <Card className="upcoming-tests-card">
          <CardHead title="Upcoming Tests" icon="A" right={<button className="link-btn" onClick={() => navigate('/tests')}>Tests →</button>} />
          <div className="dashboard-list tests-list">
            {upcomingTests.length === 0 && <Empty icon="A" title="No upcoming tests" hint="Future-dated tests will appear here." />}
            {upcomingTests.map((test) => <div key={`${test.kind}-${test.date}-${test.name}`}><span className={`chip ${test.kind === 'Prelims' ? 'info' : 'accent'}`}>{test.kind}</span><b>{test.name}</b><time>{relDay(test.date)}</time></div>)}
          </div>
        </Card>
        <Card className="revision-preview-card">
          <CardHead title="Revision Queue" icon="↻" right={<button className="link-btn" onClick={() => navigate('/revision')}>Review →</button>} />
          <div className="dashboard-list revision-list">
            {revisions.length === 0 && <Empty icon="◇" title="Queue clear" hint="No revision is due today." />}
            {revisions.slice(0, 5).map((progress) => (
              <div key={progress.itemId}><RChip count={progress.revisionCount} /><b>{itemTitle(progress.itemId, progress.itemType)}</b><time>{todayKey(new Date(progress.nextRevisionAt!)) < today ? 'overdue' : 'today'}</time></div>
            ))}
          </div>
        </Card>
      </section>
    </>
  );
}
