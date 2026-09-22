/** Geography Optional — inclusive lecture ranges with per-lecture completion. */
import React, { useMemo, useRef, useState } from 'react';
import { useStore } from '../store/store';
import { Bar, Card, Confirm, Empty, Field, Modal } from '../ui/components';
import { useToast } from '../ui/toast';
import { lectureSummary } from '../store/selectors';
import { syllabus } from '../data/syllabus';
import type { Lecture } from '../types';
import { completedLectureNumbers, lectureProgress, lectureSeriesLabel, parseLectureRange } from '../lib/lectures';

export function Lectures() {
  const { db, updateLecture, deleteLecture } = useStore();
  const [showAdd, setShowAdd] = useState(false);
  const [editing, setEditing] = useState<Lecture | null>(null);
  const [deleting, setDeleting] = useState<Lecture | null>(null);
  const [filterSubject, setFilterSubject] = useState('all');
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const summary = lectureSummary(db);
  const geoSubjects = useMemo(() => {
    const bundled = syllabus.papers
      .filter((paper) => paper.category === 'optional')
      .flatMap((paper) => (syllabus.subjectsOf.get(paper.id) ?? []).map((subject) => subject.title));
    return [...new Set([...bundled, ...db.lectures.map((lecture) => lecture.subject)])].sort();
  }, [db.lectures]);

  const subjects = useMemo(() => {
    const grouped = new Map<string, Lecture[]>();
    for (const lecture of db.lectures) {
      const list = grouped.get(lecture.subject) ?? [];
      list.push(lecture);
      grouped.set(lecture.subject, list);
    }
    // First-added series stay at the top: creation order, not range/subject
    // alphabetical (which let a freshly created series jump above older ones).
    const byFirstAdded = (a: Lecture, b: Lecture) =>
      (a.createdAt ?? '').localeCompare(b.createdAt ?? '')
      || a.rangeStart - b.rangeStart
      || a.id.localeCompare(b.id);
    return [...grouped.entries()]
      .map(([subject, raw]) => {
        const list = [...raw].sort(byFirstAdded);
        return { subject, list, createdAt: list[0].createdAt ?? '' };
      })
      .filter((group) => filterSubject === 'all' || group.subject === filterSubject)
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt) || a.subject.localeCompare(b.subject));
  }, [db.lectures, filterSubject]);

  const toggleExpanded = (id: string) => setExpanded((current) => {
    const next = new Set(current);
    if (next.has(id)) next.delete(id); else next.add(id);
    return next;
  });

  const toggleLecture = (series: Lecture, number: number) => {
    const progress = lectureProgress(series);
    const completed = new Set(progress.completed);
    if (completed.has(number)) completed.delete(number); else completed.add(number);
    const nextCompleted = [...completed].sort((a, b) => a - b);
    const nextNumber = progress.numbers.find((item) => !completed.has(item)) ?? series.rangeEnd;
    const status: Lecture['status'] = nextCompleted.length === 0
      ? 'not_started'
      : nextCompleted.length === progress.total ? 'completed' : 'in_progress';
    const now = new Date().toISOString();
    updateLecture(series.id, {
      completedLectures: nextCompleted,
      lectureNo: nextNumber,
      status,
      lastWatchedAt: now,
      completedAt: status === 'completed' ? now : null,
    });
  };

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Geography Optional — Lecture Series</h1>
          <div className="sub">{summary.completed}/{summary.total} lectures complete across {summary.series} series</div>
        </div>
        <button className="btn primary" onClick={() => setShowAdd(true)}>+ Add lecture series</button>
      </div>

      <div className="grid cols-4 lecture-summary-grid">
        <Card className="stat-card"><div><div className="stat-value">{summary.total - summary.completed}</div><div className="stat-label">Remaining</div><div className="stat-extra">{summary.completed} of {summary.total} lectures complete</div></div></Card>
        <Card className="stat-card"><div><div className="stat-value">{summary.pct}%</div><div className="stat-label">Overall progress</div><div className="stat-extra">real lecture completion</div></div></Card>
        <Card className="stat-card"><div><div className="stat-value">{summary.lecturesDone}/{summary.series}</div><div className="stat-label">Series completed</div></div></Card>
        <Card className="stat-card"><div><div className="stat-value">{summary.revised}</div><div className="stat-label">Series revised</div><div className="stat-extra">{summary.pyqs} linked PYQs attempted</div></div></Card>
      </div>

      {db.lectures.length === 0 ? (
        <Card><Empty icon="▶" title="No lecture series yet" hint="Add a subject and inclusive range such as 98-113."
          action={<button className="btn primary" onClick={() => setShowAdd(true)}>+ Add your first series</button>} /></Card>
      ) : (
        <>
          <div className="filters lecture-filters">
            <span className="tiny muted">Subject</span>
            <div className="seg">
              <button className={filterSubject === 'all' ? 'active' : ''} onClick={() => setFilterSubject('all')}>All</button>
              {[...new Set(db.lectures.map((lecture) => lecture.subject))].sort().map((subject) => (
                <button key={subject} className={filterSubject === subject ? 'active' : ''} onClick={() => setFilterSubject(subject)}>{subject}</button>
              ))}
            </div>
          </div>

          <div className="lecture-subjects">
            {subjects.map(({ subject, list }) => {
              const subjectTotal = list.reduce((sum, item) => sum + lectureProgress(item).total, 0);
              const subjectDone = list.reduce((sum, item) => sum + lectureProgress(item).count, 0);
              const subjectPct = subjectTotal ? Math.round(subjectDone / subjectTotal * 100) : 0;
              return (
                <Card key={subject} className="lecture-subject-card">
                  <div className="card-head lecture-subject-head">
                    <div><h2>{subject}</h2><div className="hint">{list.length} series · {subjectDone}/{subjectTotal} lectures</div></div>
                    <div className="lecture-subject-progress"><Bar value={subjectPct} tone="geo" /><b className="mono small">{subjectPct}%</b></div>
                  </div>
                  <div className="lecture-series-list">
                    {list.map((series) => {
                      const progress = lectureProgress(series);
                      const open = expanded.has(series.id);
                      const completed = new Set(completedLectureNumbers(series));
                      return (
                        <article key={series.id} className={`lecture-series ${open ? 'open' : ''}`}>
                          <div className="lecture-series-row">
                            <button className="lecture-expand" onClick={() => toggleExpanded(series.id)} aria-expanded={open} aria-label={`${open ? 'Collapse' : 'Expand'} ${series.subject} ${lectureSeriesLabel(series)}`}>›</button>
                            <button className="lecture-series-main" onClick={() => toggleExpanded(series.id)}>
                              <span className="lecture-series-title">{lectureSeriesLabel(series)}</span>
                              <span className="lecture-series-meta">
                                {progress.count}/{progress.total} completed · {progress.pct}%
                                {progress.next != null && <strong> · Next: Lecture {progress.next}</strong>}
                              </span>
                            </button>
                            <div className="lecture-series-bar"><Bar value={progress.pct} tone="geo" /></div>
                            <button className="icon-btn" title="Edit series" onClick={() => setEditing(series)}>✎</button>
                            <button className="icon-btn" title="Delete series" onClick={() => setDeleting(series)}>🗑</button>
                          </div>
                          {open && (
                            <div className="lecture-checklist">
                              {progress.numbers.map((number) => {
                                const done = completed.has(number);
                                return (
                                  <button key={number} className={`lecture-check ${done ? 'done' : ''}`} onClick={() => toggleLecture(series, number)}>
                                    <span>{done ? '✓' : ''}</span>
                                    Lecture {number}
                                  </button>
                                );
                              })}
                            </div>
                          )}
                        </article>
                      );
                    })}
                  </div>
                </Card>
              );
            })}
          </div>
        </>
      )}

      <LectureForm key={showAdd ? 'add-open' : 'add-closed'} open={showAdd} onClose={() => setShowAdd(false)} subjects={geoSubjects} />
      {editing && <LectureForm key={editing.id} open editing={editing} onClose={() => setEditing(null)} subjects={geoSubjects} />}
      <Confirm open={!!deleting} onClose={() => setDeleting(null)} onConfirm={() => deleting && deleteLecture(deleting.id)} title="Delete lecture series?" body={`“${deleting ? `${deleting.subject} · ${lectureSeriesLabel(deleting)}` : ''}” and its lecture completion will be removed.`} />
    </>
  );
}

function LectureForm({ open, onClose, editing, subjects }: { open: boolean; onClose: () => void; editing?: Lecture | null; subjects: string[] }) {
  const { addLecture, updateLecture } = useStore();
  const { push } = useToast();
  const saving = useRef(false);
  const [subject, setSubject] = useState(editing?.subject ?? subjects[0] ?? 'Geography Optional');
  const [range, setRange] = useState(editing ? `${editing.rangeStart}-${editing.rangeEnd}` : '');
  const parsed = parseLectureRange(range);

  const submit = () => {
    if (saving.current) return;
    if (!subject.trim()) { push('Subject is required', 'bad'); return; }
    if (!parsed) { push('Enter a valid range such as 98-113 (end must be at least start)', 'bad'); return; }
    saving.current = true;
    const previousCompleted = editing ? completedLectureNumbers(editing) : [];
    const completedLectures = previousCompleted.filter((number) => parsed.numbers.includes(number));
    const payload = {
      subject,
      rangeStart: parsed.start, rangeEnd: parsed.end, totalLectures: parsed.numbers.length,
      completedLectures,
      lectureNo: parsed.numbers.find((number) => !completedLectures.includes(number)) ?? parsed.end,
      status: (completedLectures.length === 0 ? 'not_started' : completedLectures.length === parsed.numbers.length ? 'completed' : 'in_progress') as Lecture['status'],
    };
    if (editing) { updateLecture(editing.id, payload); push('Lecture series updated', 'ok'); }
    else { addLecture(payload); push(`${parsed.numbers.length} lectures created`, 'ok'); }
    onClose();
  };

  return (
    <Modal open={open} onClose={onClose} title={editing ? 'Edit lecture series' : 'Add lecture series'} wide footer={
      <>
        <button className="btn ghost" onClick={onClose}>Cancel</button>
        <button className="btn primary" onClick={submit}>{editing ? 'Save changes' : 'Create series'}</button>
      </>
    }>
      <div className="form-grid">
        <Field label="Subject">
          <select className="input" value={subject} onChange={(event) => setSubject(event.target.value)} autoFocus>
            {subjects.map((item) => <option key={item}>{item}</option>)}
            {!subjects.includes(subject) && <option>{subject}</option>}
          </select>
        </Field>
        <Field label="Lecture range">
          <input className={`input ${range && !parsed ? 'invalid' : ''}`} value={range} onChange={(event) => setRange(event.target.value)} placeholder="98-113" inputMode="numeric" />
          <span className={`field-help ${range && !parsed ? 'bad-text' : ''}`}>
            {parsed ? `${parsed.start}–${parsed.end} · ${parsed.numbers.length} lectures will be generated` : 'Inclusive numeric range, for example 98-113'}
          </span>
        </Field>
      </div>
    </Modal>
  );
}
