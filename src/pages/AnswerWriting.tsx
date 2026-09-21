/** Answer Writing Tracker — daily mains answer practice with self-evaluation. */
import React, { useMemo, useState } from 'react';
import { useStore } from '../store/store';
import { Card, CardHead, Empty, Modal, Field, Confirm } from '../ui/components';
import { useToast } from '../ui/toast';
import type { AnswerEntry } from '../types';
import { addDays, todayKey, dateFromKey } from '../lib/date';
import { LineChart } from '../ui/charts';

const STRENGTH_TAGS = ['Good intro', 'Data used', 'Diagram/map', 'Balanced view', 'Crisp structure', 'Examples', 'Committee/ARC', 'Strong conclusion'];
const IMPROVE_TAGS = ['Weak intro', 'No data', 'Over-length', 'Under-length', 'Missed directive', 'Generic content', 'Poor conclusion', 'Time overrun'];

export function AnswerWriting() {
  const { db, addAnswer, deleteAnswer } = useStore();
  const { push } = useToast();
  const [showAdd, setShowAdd] = useState(false);
  const [deleting, setDeleting] = useState<AnswerEntry | null>(null);

  const sorted = useMemo(() => [...db.answers].sort((a, b) => b.date.localeCompare(a.date)), [db.answers]);
  const last20 = useMemo(() => [...db.answers].sort((a, b) => a.date.localeCompare(b.date)).slice(-20), [db.answers]);
  const avgPct = (() => {
    const withMarks = db.answers.filter((a) => a.marksObtained != null && a.maxMarks);
    return withMarks.length ? Math.round(withMarks.reduce((s, a) => s + (a.marksObtained! / a.maxMarks!) * 100, 0) / withMarks.length) : 0;
  })();
  const thisWeek = db.answers.filter((a) => a.date >= addDays(todayKey(), -6)).length;

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Answer Writing</h1>
          <div className="sub">{db.answers.length} answers practised · {thisWeek} this week · avg {avgPct}% of max marks</div>
        </div>
        <button className="btn primary" onClick={() => setShowAdd(true)}>+ Log answer</button>
      </div>

      <div className="grid" style={{ gridTemplateColumns: '1.4fr 1fr', marginBottom: 14 }}>
        <Card>
          <CardHead title="Score trend" hint="last 20 answers (% of max marks)" />
          <div className="card-pad" style={{ paddingTop: 10 }}>
            {last20.length < 2 ? <Empty icon="✎" title="Log 2+ answers to see the trend" hint="Daily answer practice is among the highest-leverage Mains exercises" /> : (
              <LineChart yMax={100} suffix="%" series={[{ name: 'Score %', color: 'var(--geo)', points: last20.map((a) => Math.round((a.marksObtained ?? 0) / (a.maxMarks || 1) * 100)) }]} xLabels={last20.map((a) => a.date.slice(5))} />
            )}
          </div>
        </Card>
        <Card>
          <CardHead title="Improvement themes" hint="most frequent tags" />
          <div className="card-pad" style={{ paddingTop: 12 }}>
            {db.answers.length === 0 ? <p className="small muted">Tags appear as you log answers.</p> : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {[
                  { label: '✅ Strengths shown', tags: STRENGTH_TAGS, field: 'strengths' as const, color: 'var(--ok)' },
                  { label: '⚠️ Improvements needed', tags: IMPROVE_TAGS, field: 'improvements' as const, color: 'var(--warn)' },
                ].map((grp) => {
                  const counts = grp.tags.map((t) => ({ t, n: db.answers.filter((a) => a[grp.field].includes(t)).length })).filter((x) => x.n > 0).sort((a, b) => b.n - a.n).slice(0, 4);
                  const max = Math.max(1, ...counts.map((c) => c.n));
                  return (
                    <div key={grp.label}>
                      <div className="tiny" style={{ fontWeight: 700, marginBottom: 5 }}>{grp.label}</div>
                      {counts.length === 0 && <p className="tiny muted">none tagged yet</p>}
                      {counts.map((c) => (
                        <div key={c.t} className="row" style={{ gap: 8, marginBottom: 4 }}>
                          <span className="tiny soft" style={{ width: 130 }}>{c.t}</span>
                          <div className="grow"><div className="bar thin"><div style={{ width: `${(c.n / max) * 100}%`, background: grp.color }} /></div></div>
                          <span className="tiny mono muted">{c.n}</span>
                        </div>
                      ))}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </Card>
      </div>

      <Card>
        <CardHead title="Answer log" />
        <div className="card-pad" style={{ paddingTop: 6 }}>
          {sorted.length === 0 ? (
            <Empty icon="✎" title="No answers yet" hint='"Mains is written, not read." Log every practice answer with marks and tags.'
              action={<button className="btn primary" onClick={() => setShowAdd(true)}>+ Log your first answer</button>} />
          ) : (
            <div className="table-wrap">
              <table className="tbl">
                <thead><tr><th>Date</th><th>Question</th><th>Paper</th><th className="num">Marks</th><th className="num">Words</th><th className="num">Time</th><th>Tags</th><th></th></tr></thead>
                <tbody>
                  {sorted.map((a) => (
                    <tr key={a.id}>
                      <td className="num muted">{dateFromKey(a.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</td>
                      <td style={{ fontWeight: 600, maxWidth: 340 }}>
                        <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.question}</div>
                        {a.notes && <div className="tiny muted" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.notes}</div>}
                      </td>
                      <td><span className="chip accent">{a.paper}</span></td>
                      <td className="num" style={{ fontWeight: 800 }}>{a.marksObtained ?? '—'}{a.maxMarks ? <span className="tiny muted">/{a.maxMarks}</span> : null}</td>
                      <td className="num">{a.wordCount ?? '—'}</td>
                      <td className="num">{a.timeTakenMinutes ? `${a.timeTakenMinutes}m` : '—'}</td>
                      <td>
                        <div className="row wrap" style={{ gap: 4, maxWidth: 220 }}>
                          {a.strengths.slice(0, 2).map((s) => <span key={s} className="chip ok">{s}</span>)}
                          {a.improvements.slice(0, 2).map((s) => <span key={s} className="chip warn">{s}</span>)}
                        </div>
                      </td>
                      <td><div className="actions"><button className="icon-btn" style={{ width: 27, height: 27, fontSize: 12 }} onClick={() => setDeleting(a)}>🗑</button></div></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </Card>

      <AnswerForm open={showAdd} onClose={() => setShowAdd(false)} onSave={(a) => { addAnswer(a); push('Answer logged — keep the streak!', 'ok'); }} />
      <Confirm open={!!deleting} onClose={() => setDeleting(null)} onConfirm={() => deleting && deleteAnswer(deleting.id)} title="Delete answer entry?" body="This practice record will be removed." />
    </>
  );
}

function AnswerForm({ open, onClose, onSave }: { open: boolean; onClose: () => void; onSave: (a: Omit<AnswerEntry, 'id' | 'createdAt'>) => void }) {
  const [question, setQuestion] = useState('');
  const [paper, setPaper] = useState('GS1');
  const [marks, setMarks] = useState('');
  const [maxMarks, setMaxMarks] = useState('15');
  const [words, setWords] = useState('');
  const [time, setTime] = useState('9');
  const [strengths, setStrengths] = useState<string[]>([]);
  const [improvements, setImprovements] = useState<string[]>([]);
  const [notes, setNotes] = useState('');

  const toggle = (arr: string[], set: (v: string[]) => void, tag: string) =>
    set(arr.includes(tag) ? arr.filter((x) => x !== tag) : [...arr, tag]);

  const submit = () => {
    if (!question.trim()) return;
    onSave({
      date: todayKey(), question: question.trim(), paper,
      marksObtained: marks ? Number(marks) : null, maxMarks: Number(maxMarks) || null,
      wordCount: words ? Number(words) : null, timeTakenMinutes: Number(time) || null,
      strengths, improvements, notes,
    });
    onClose();
  };

  return (
    <Modal open={open} onClose={onClose} title="Log practice answer" wide footer={
      <>
        <button className="btn ghost" onClick={onClose}>Cancel</button>
        <button className="btn primary" onClick={submit}>Save</button>
      </>
    }>
      <Field label="Question"><textarea className="input" value={question} onChange={(e) => setQuestion(e.target.value)} placeholder="Paste the question + directive (discuss / critically examine…)" autoFocus /></Field>
      <div className="form-grid">
        <Field label="Paper">
          <select className="input" value={paper} onChange={(e) => setPaper(e.target.value)}>
            {['GS1', 'GS2', 'GS3', 'GS4', 'Essay', 'Optional P1', 'Optional P2'].map((p) => <option key={p}>{p}</option>)}
          </select>
        </Field>
        <Field label="Time taken (min)"><input type="number" className="input" value={time} onChange={(e) => setTime(e.target.value)} /></Field>
        <Field label="Marks obtained"><input type="number" className="input" value={marks} onChange={(e) => setMarks(e.target.value)} /></Field>
        <Field label="Out of"><input type="number" className="input" value={maxMarks} onChange={(e) => setMaxMarks(e.target.value)} /></Field>
        <Field label="Word count"><input type="number" className="input" value={words} onChange={(e) => setWords(e.target.value)} /></Field>
      </div>
      <Field label="What worked?"><TagPicker tags={STRENGTH_TAGS} selected={strengths} onToggle={(t) => toggle(strengths, setStrengths, t)} tone="ok" /></Field>
      <Field label="What to improve?"><TagPicker tags={IMPROVE_TAGS} selected={improvements} onToggle={(t) => toggle(improvements, setImprovements, t)} tone="warn" /></Field>
      <Field label="Notes — model answer gaps, sources to add"><textarea className="input" value={notes} onChange={(e) => setNotes(e.target.value)} /></Field>
    </Modal>
  );
}

function TagPicker({ tags, selected, onToggle, tone }: { tags: string[]; selected: string[]; onToggle: (t: string) => void; tone: string }) {
  return (
    <div className="row wrap" style={{ gap: 6 }}>
      {tags.map((t) => (
        <button key={t} className={`chip click ${selected.includes(t) ? tone : ''}`} onClick={() => onToggle(t)}>{t}</button>
      ))}
    </div>
  );
}
