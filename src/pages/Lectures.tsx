/** Geography Optional Lecture Tracker — series-level lecture tracking with
 * PDF followed, short notes, revision and PYQ flags. */
import React, { useMemo, useState } from 'react';
import { useStore } from '../store/store';
import { Card, Empty, Modal, Field, Confirm, Bar } from '../ui/components';
import { useToast } from '../ui/toast';
import { lectureSummary } from '../store/selectors';
import { syllabus } from '../data/syllabus';
import type { Lecture } from '../types';
import { todayKey } from '../lib/date';

export function Lectures() {
  const { db, addLecture, updateLecture, deleteLecture } = useStore();
  const { push } = useToast();
  const [showAdd, setShowAdd] = useState(false);
  const [editing, setEditing] = useState<Lecture | null>(null);
  const [deleting, setDeleting] = useState<Lecture | null>(null);
  const [filterSubject, setFilterSubject] = useState('all');

  const sum = lectureSummary(db);
  const geoSubjects = useMemo(() => {
    const ids = syllabus.papers.filter((p) => p.category === 'optional').flatMap((p) => (syllabus.subjectsOf.get(p.id) ?? []).map((s) => s.title));
    return [...new Set([...ids, ...db.lectures.map((l) => l.subject)])].sort();
  }, [db.lectures]);

  const lectures = useMemo(() => {
    const arr = [...db.lectures].sort((a, b) => a.subject.localeCompare(b.subject) || a.lectureNo - b.lectureNo || a.title.localeCompare(b.title));
    return filterSubject === 'all' ? arr : arr.filter((l) => l.subject === filterSubject);
  }, [db.lectures, filterSubject]);

  const bySubject = useMemo(() => {
    const m = new Map<string, Lecture[]>();
    for (const l of db.lectures) {
      const arr = m.get(l.subject) ?? [];
      arr.push(l);
      m.set(l.subject, arr);
    }
    return [...m.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  }, [db.lectures]);

  const toggleFlag = (l: Lecture, patch: Partial<Lecture>) => {
    updateLecture(l.id, patch);
  };

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Geography Optional — Lecture Tracker</h1>
          <div className="sub">{sum.series} series · {sum.completed}/{sum.total} lectures completed ({sum.pct}%) · {sum.notes} with short notes · {sum.revised} revised · {sum.pyqs} PYQs attempted</div>
        </div>
        <button className="btn primary" onClick={() => setShowAdd(true)}>+ Add lecture series</button>
      </div>

      <div className="grid cols-4" style={{ marginBottom: 14 }}>
        <Card className="stat-card"><div><div className="stat-value">{sum.total - sum.completed}</div><div className="stat-label">Lectures remaining</div><div className="stat-extra">{sum.completed} of {sum.total} done</div></div></Card>
        <Card className="stat-card"><div><div className="stat-value">{sum.notes}</div><div className="stat-label">Short notes made</div></div></Card>
        <Card className="stat-card"><div><div className="stat-value">{sum.revised}</div><div className="stat-label">Revised</div></div></Card>
        <Card className="stat-card"><div><div className="stat-value">{sum.pyqs}</div><div className="stat-label">PYQs attempted</div></div></Card>
      </div>

      {db.lectures.length === 0 ? (
        <Card><Empty icon="▶" title="No lecture series yet" hint="Add your coaching/YouTube lecture series and track completion, PDFs, notes, revisions & PYQs"
          action={<button className="btn primary" onClick={() => setShowAdd(true)}>+ Add your first series</button>} /></Card>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div className="filters">
            <span className="tiny muted">Filter:</span>
            <div className="seg">
              <button className={filterSubject === 'all' ? 'active' : ''} onClick={() => setFilterSubject('all')}>All subjects</button>
              {bySubject.map(([s]) => (
                <button key={s} className={filterSubject === s ? 'active' : ''} onClick={() => setFilterSubject(s)}>{s}</button>
              ))}
            </div>
          </div>
          {bySubject.filter(([s]) => filterSubject === 'all' || s === filterSubject).map(([subject, list]) => {
            const doneLect = list.filter((l) => l.status === 'completed').reduce((a, l) => a + l.totalLectures, 0);
            const totalLect = list.reduce((a, l) => a + l.totalLectures, 0);
            const p = totalLect ? Math.round((doneLect / totalLect) * 100) : 0;
            return (
              <Card key={subject}>
                <div className="card-head">
                  <div className="row" style={{ gap: 9 }}>
                    <span className="stat-ico" style={{ background: 'var(--geo-soft)', color: 'var(--geo)' }}>◈</span>
                    <div><h3>{subject}</h3><div className="hint">{list.length} series</div></div>
                  </div>
                  <div className="row" style={{ gap: 10 }}>
                    <div style={{ width: 130 }}><Bar value={p} tone="geo" /></div>
                    <span className="small mono" style={{ fontWeight: 700, color: 'var(--geo)' }}>{p}%</span>
                  </div>
                </div>
                <div className="card-pad" style={{ paddingTop: 10 }}>
                  <div className="table-wrap">
                    <table className="tbl">
                      <thead>
                        <tr>
                          <th>Series</th><th>Lec #</th><th>PDF followed</th><th>Notes</th><th>Revised</th><th>PYQs</th><th>Status</th><th></th>
                        </tr>
                      </thead>
                      <tbody>
                        {list.map((l) => (
                          <tr key={l.id}>
                            <td style={{ fontWeight: 600, minWidth: 160 }}>
                              {l.title}
                              {l.source && <div className="tiny muted">{l.source}</div>}
                            </td>
                            <td className="num">{l.lectureNo}/{l.totalLectures}</td>
                            <td>{l.pdfFollowed ? <span className="chip geo" title={l.pdfFollowed}>PDF ✓</span> : <span className="chip">—</span>}</td>
                            <td>
                              <button className={`chip click ${l.shortNotesMade ? 'ok' : ''}`} onClick={() => toggleFlag(l, { shortNotesMade: !l.shortNotesMade })}>{l.shortNotesMade ? '✓ Made' : 'Make'}</button>
                            </td>
                            <td>
                              <button className={`chip click ${l.revised ? 'ok' : ''}`} onClick={() => toggleFlag(l, { revised: !l.revised, revisionCount: l.revised ? l.revisionCount : l.revisionCount + 1 })}>
                                {l.revised ? `✓ R${l.revisionCount}` : 'Revise'}
                              </button>
                            </td>
                            <td>
                              <span className="row" style={{ gap: 4 }}>
                                <button className="btn xs" onClick={() => toggleFlag(l, { pyqsAttempted: Math.max(0, l.pyqsAttempted - 1) })}>−</button>
                                <b className="mono">{l.pyqsAttempted}</b>
                                <button className="btn xs" onClick={() => toggleFlag(l, { pyqsAttempted: l.pyqsAttempted + 1 })}>+</button>
                              </span>
                            </td>
                            <td>
                              <select className="input input-sm" value={l.status} onChange={(e) => {
                                const status = e.target.value as Lecture['status'];
                                updateLecture(l.id, { status, completedAt: status === 'completed' ? new Date().toISOString() : null, lastWatchedAt: new Date().toISOString() });
                              }}>
                                <option value="not_started">Not started</option>
                                <option value="in_progress">In progress</option>
                                <option value="completed">Completed</option>
                              </select>
                            </td>
                            <td>
                              <div className="actions">
                                <button className="icon-btn" style={{ width: 27, height: 27, fontSize: 12 }} title="Edit" onClick={() => setEditing(l)}>✎</button>
                                <button className="icon-btn" style={{ width: 27, height: 27, fontSize: 12 }} title="Delete" onClick={() => setDeleting(l)}>🗑</button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      <LectureForm open={showAdd} onClose={() => setShowAdd(false)} subjects={geoSubjects} />
      {editing && <LectureForm open editing={editing} onClose={() => setEditing(null)} subjects={geoSubjects} />}
      <Confirm open={!!deleting} onClose={() => setDeleting(null)} onConfirm={() => deleting && deleteLecture(deleting.id)} title="Delete lecture series?" body={`"${deleting?.title}" will be removed permanently.`} />
    </>
  );
}

function LectureForm({ open, onClose, editing, subjects }: { open: boolean; onClose: () => void; editing?: Lecture | null; subjects: string[] }) {
  const { addLecture, updateLecture } = useStore();
  const { push } = useToast();
  const [title, setTitle] = useState(editing?.title ?? '');
  const [subject, setSubject] = useState(editing?.subject ?? subjects[0] ?? 'Geomorphology');
  const [chapter, setChapter] = useState(editing?.chapter ?? '');
  const [lectureNo, setLectureNo] = useState(String(editing?.lectureNo ?? 1));
  const [totalLectures, setTotalLectures] = useState(String(editing?.totalLectures ?? 10));
  const [source, setSource] = useState(editing?.source ?? '');
  const [pdfFollowed, setPdfFollowed] = useState(editing?.pdfFollowed ?? '');
  const [shortNotesMade, setShortNotes] = useState(editing?.shortNotesMade ?? false);
  const [notesLink, setNotesLink] = useState(editing?.notesLink ?? '');

  const submit = () => {
    if (!title.trim()) { push('Title required', 'bad'); return; }
    const payload = {
      title: title.trim(), subject, chapter,
      lectureNo: Number(lectureNo) || 1, totalLectures: Number(totalLectures) || 1,
      source, pdfFollowed, shortNotesMade, notesLink,
    };
    if (editing) { updateLecture(editing.id, payload); push('Series updated', 'ok'); }
    else { addLecture(payload); push('Lecture series added', 'ok'); }
    onClose();
  };

  return (
    <Modal open={open} onClose={onClose} title={editing ? 'Edit lecture series' : 'Add lecture series'} wide footer={
      <>
        <button className="btn ghost" onClick={onClose}>Cancel</button>
        <button className="btn primary" onClick={submit}>{editing ? 'Save' : 'Add series'}</button>
      </>
    }>
      <Field label="Series / lecture title"><input className="input" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Geomorphology — Lecture 4: Plate Tectonics" autoFocus /></Field>
      <div className="form-grid">
        <Field label="Subject">
          <select className="input" value={subject} onChange={(e) => setSubject(e.target.value)}>
            {subjects.map((s) => <option key={s}>{s}</option>)}
          </select>
        </Field>
        <Field label="Chapter (optional)"><input className="input" value={chapter} onChange={(e) => setChapter(e.target.value)} placeholder="e.g. Earth's Interior" /></Field>
        <Field label="Lectures watched / in series #"><input type="number" min={1} className="input" value={lectureNo} onChange={(e) => setLectureNo(e.target.value)} /></Field>
        <Field label="Total lectures in series"><input type="number" min={1} className="input" value={totalLectures} onChange={(e) => setTotalLectures(e.target.value)} /></Field>
        <Field label="Source / faculty"><input className="input" value={source} onChange={(e) => setSource(e.target.value)} placeholder="e.g. Unacademy — Sumit Sir / YouTube" /></Field>
        <Field label="PDF / booklet followed"><input className="input" value={pdfFollowed} onChange={(e) => setPdfFollowed(e.target.value)} placeholder="e.g. coaching booklet Ch. 3" /></Field>
        <Field label="Short notes link (optional)"><input className="input" value={notesLink} onChange={(e) => setNotesLink(e.target.value)} placeholder="local folder or note app link" /></Field>
      </div>
      <label className="checkbox-row"><input type="checkbox" checked={shortNotesMade} onChange={(e) => setShortNotes(e.target.checked)} /> Short notes made for this series</label>
    </Modal>
  );
}
