/** PYQ Tracker — previous year questions linked to syllabus topics. */
import React, { useMemo, useState } from 'react';
import { useStore } from '../store/store';
import { Card, Empty, Modal, Field, Confirm } from '../ui/components';
import { useToast } from '../ui/toast';
import { groupBy } from '../store/selectors';
import { syllabus } from '../data/syllabus';
import type { PYQ } from '../types';
import { todayKey } from '../lib/date';

const EXAMS = ['Prelims', 'Mains GS1', 'Mains GS2', 'Mains GS3', 'Mains GS4', 'Essay', 'Optional P1', 'Optional P2'];

export function PYQTracker() {
  const { db, addPYQ, updatePYQ, deletePYQ } = useStore();
  const { push } = useToast();
  const [showAdd, setShowAdd] = useState(false);
  const [deleting, setDeleting] = useState<PYQ | null>(null);
  const [query, setQuery] = useState('');
  const [examFilter, setExamFilter] = useState('all');
  const [resultFilter, setResultFilter] = useState('all');

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return [...db.pyqs]
      .sort((a, b) => b.year - a.year || b.createdAt.localeCompare(a.createdAt))
      .filter((p) => (examFilter === 'all' ? true : p.exam === examFilter))
      .filter((p) => (resultFilter === 'all' ? true : p.result === resultFilter))
      .filter((p) => !q || p.question.toLowerCase().includes(q) || p.notes.toLowerCase().includes(q));
  }, [db.pyqs, query, examFilter, resultFilter]);

  const byExam = groupBy(db.pyqs, (p) => p.exam);
  const mastered = db.pyqs.filter((p) => p.result === 'mastered').length;
  const attempted = db.pyqs.filter((p) => p.result !== 'not_attempted').length;

  return (
    <>
      <div className="page-head">
        <div>
          <h1>PYQ Tracker</h1>
          <div className="sub">{db.pyqs.length} questions banked · {attempted} attempted · {mastered} mastered</div>
        </div>
        <button className="btn primary" onClick={() => setShowAdd(true)}>+ Add PYQ</button>
      </div>

      <div className="grid cols-3" style={{ marginBottom: 14 }}>
        {EXAMS.slice(0, 3).map((ex) => {
          const arr = byExam[ex] ?? [];
          const m = arr.filter((p) => p.result === 'mastered').length;
          return (
            <Card key={ex} className="stat-card">
              <div>
                <div className="stat-top"><span className="stat-ico" style={{ background: 'var(--accent-soft)', color: 'var(--accent)' }}>?</span></div>
                <div className="stat-value">{arr.length}</div>
                <div className="stat-label">{ex}</div>
                <div className="stat-extra">{m} mastered · {arr.length - m} pending</div>
              </div>
            </Card>
          );
        })}
      </div>

      <div className="filters">
        <input className="input input-sm" style={{ width: 260 }} placeholder="Search questions & notes…" value={query} onChange={(e) => setQuery(e.target.value)} />
        <select className="input input-sm" value={examFilter} onChange={(e) => setExamFilter(e.target.value)}>
          <option value="all">All exams</option>
          {EXAMS.map((e) => <option key={e}>{e}</option>)}
        </select>
        <select className="input input-sm" value={resultFilter} onChange={(e) => setResultFilter(e.target.value)}>
          <option value="all">All results</option>
          <option value="not_attempted">Not attempted</option>
          <option value="attempted">Attempted</option>
          <option value="mastered">Mastered</option>
        </select>
      </div>

      <Card>
        <div className="card-pad" style={{ paddingTop: 6 }}>
          {filtered.length === 0 ? (
            <Empty icon="?" title="No PYQs found" hint="Log previous year questions and tag them to syllabus topics — revise them with the topic."
              action={<button className="btn primary" onClick={() => setShowAdd(true)}>+ Add your first PYQ</button>} />
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {filtered.map((p) => (
                <div key={p.id} className="task-item">
                  <span style={{
                    width: 10, height: 10, borderRadius: '50%', flexShrink: 0, marginTop: 4,
                    background: p.result === 'mastered' ? 'var(--ok)' : p.result === 'attempted' ? 'var(--warn)' : 'var(--line-strong)',
                  }} />
                  <div className="grow" style={{ minWidth: 0 }}>
                    <div className="small" style={{ fontWeight: 600 }}>{p.question}</div>
                    <div className="t-meta">
                      <span className="chip accent">{p.exam} {p.year}</span>
                      {p.paper && <span className="chip">{p.paper}</span>}
                      {p.topicId && <span className="chip geo">{syllabus.topicById.get(p.topicId)?.title ?? 'topic'}</span>}
                      {p.notes && <span className="tiny muted" title={p.notes}>{p.notes.slice(0, 60)}{p.notes.length > 60 ? '…' : ''}</span>}
                    </div>
                  </div>
                  <div className="t-actions">
                    {p.result !== 'attempted' && <button className="btn xs" onClick={() => { updatePYQ(p.id, { result: 'attempted', attemptedAt: new Date().toISOString() }); push('Marked attempted'); }}>Attempted</button>}
                    {p.result !== 'mastered' && <button className="btn xs ok" onClick={() => { updatePYQ(p.id, { result: 'mastered', attemptedAt: p.attemptedAt ?? new Date().toISOString() }); push('Mastered 💪', 'ok'); }}>Mastered</button>}
                    <button className="icon-btn" style={{ width: 27, height: 27, fontSize: 12 }} onClick={() => setDeleting(p)}>🗑</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </Card>

      <PYQForm open={showAdd} onClose={() => setShowAdd(false)} />
      <Confirm open={!!deleting} onClose={() => setDeleting(null)} onConfirm={() => deleting && deletePYQ(deleting.id)} title="Delete PYQ?" body="This question will be removed from your bank." />
    </>
  );
}

function PYQForm({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { addPYQ } = useStore();
  const { push } = useToast();
  const [question, setQuestion] = useState('');
  const [exam, setExam] = useState(EXAMS[0]);
  const [year, setYear] = useState('2024');
  const [paper, setPaper] = useState('');
  const [notes, setNotes] = useState('');
  const [topicQuery, setTopicQuery] = useState('');
  const [topicId, setTopicId] = useState<string | null>(null);

  const topicMatches = useMemo(() => {
    const q = topicQuery.trim().toLowerCase();
    if (q.length < 2) return [];
    return syllabus.topics.filter((t) => t.title.toLowerCase().includes(q)).slice(0, 6);
  }, [topicQuery]);

  const submit = () => {
    if (!question.trim()) { push('Question text required', 'bad'); return; }
    addPYQ({ question: question.trim(), exam, year: Number(year) || new Date().getFullYear(), paper: paper || undefined, notes, topicId });
    push('PYQ added', 'ok');
    setQuestion(''); setNotes(''); setTopicQuery(''); setTopicId(null);
    onClose();
  };

  return (
    <Modal open={open} onClose={onClose} title="Add PYQ" wide footer={
      <>
        <button className="btn ghost" onClick={onClose}>Cancel</button>
        <button className="btn primary" onClick={submit}>Add PYQ</button>
      </>
    }>
      <Field label="Question"><textarea className="input" value={question} onChange={(e) => setQuestion(e.target.value)} placeholder="Paste or summarize the question…" autoFocus /></Field>
      <div className="form-grid">
        <Field label="Exam">
          <select className="input" value={exam} onChange={(e) => setExam(e.target.value)}>{EXAMS.map((e) => <option key={e}>{e}</option>)}</select>
        </Field>
        <Field label="Year"><input type="number" min={1979} max={2100} className="input" value={year} onChange={(e) => setYear(e.target.value)} /></Field>
        <Field label="Paper / section"><input className="input" value={paper} onChange={(e) => setPaper(e.target.value)} placeholder="e.g. Paper 1 A Q2(b)" /></Field>
        <Field label="Result (later)">not attempted by default</Field>
      </div>
      <Field label="Link to syllabus topic">
        <input className="input" value={topicQuery} onChange={(e) => setTopicQuery(e.target.value)} placeholder="Search topics…" />
      </Field>
      {topicMatches.length > 0 && (
        <div className="row wrap" style={{ gap: 6 }}>
          {topicMatches.map((t) => (
            <button key={t.id} className={`chip click ${topicId === t.id ? 'geo' : ''}`} onClick={() => { setTopicId(t.id); setTopicQuery(t.title); }}>{t.title}</button>
          ))}
        </div>
      )}
      <Field label="Model answer pointers / mistakes"><textarea className="input" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Keywords, sources, diagrams used in toppers' answers…" /></Field>
    </Modal>
  );
}

export { todayKey };
