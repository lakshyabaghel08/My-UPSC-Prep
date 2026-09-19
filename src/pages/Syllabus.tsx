/** Operational Syllabus — Paper → Subject → Chapter → Topic → Subtopic with
 * per-item status, notes, and R1–R5 revision controls. */
import React, { useMemo, useState } from 'react';
import { useStore } from '../store/store';
import { syllabus } from '../data/syllabus';
import { treeStats, type NodeStat } from '../store/selectors';
import { Card, Modal, Field, RChip, StatusChip } from '../ui/components';
import { useToast } from '../ui/toast';
import type { ItemStatus, Confidence } from '../types';
import { CONFIDENCE_LABELS, nextRevisionDate, rLabel } from '../lib/revision';
import { todayKey, addDays, fmtTime } from '../lib/date';
import { navigate } from '../ui/router';

type Cat = 'all' | 'prelims' | 'mains' | 'optional';

export function Syllabus() {
  const { db } = useStore();
  const stats = useMemo(() => treeStats(db), [db]);
  const [cat, setCat] = useState<Cat>('all');
  const [query, setQuery] = useState('');
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set([syllabus.papers[0]?.id ?? '']));
  const [notesItem, setNotesItem] = useState<{ id: string; type: string; title: string } | null>(null);
  const [reviseItem, setReviseItem] = useState<{ id: string; type: string; title: string } | null>(null);
  const [taskItem, setTaskItem] = useState<{ id: string; type: string; title: string } | null>(null);

  const { setItemStatus, bulkSetStatus, getProgress } = useStore();
  const { push } = useToast();

  const papers = syllabus.papers.filter((p) => (cat === 'all' ? true : p.category === cat));

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return null;
    const hit = new Set<string>();
    const test = (id: string, title: string, desc: string, parents: string[]) => {
      if (title.toLowerCase().includes(q) || desc.toLowerCase().includes(q)) {
        hit.add(id);
        parents.forEach((p) => hit.add(p));
      }
    };
    for (const st of syllabus.subtopics) {
      const t = syllabus.topicById.get(st.topicId)!;
      const c = syllabus.chapterById.get(t.chapterId)!;
      const s = syllabus.subjectById.get(c.subjectId)!;
      test(st.id, st.title, st.description, [t.id, c.id, s.id, s.paperId]);
    }
    for (const t of syllabus.topics) {
      const c = syllabus.chapterById.get(t.chapterId)!;
      const s = syllabus.subjectById.get(c.subjectId)!;
      test(t.id, t.title, t.description, [c.id, s.id, s.paperId]);
    }
    for (const c of syllabus.chapters) {
      const s = syllabus.subjectById.get(c.subjectId)!;
      test(c.id, c.title, c.description, [s.id, s.paperId]);
    }
    for (const s of syllabus.subjects) test(s.id, s.title, s.description, [s.paperId]);
    for (const p of syllabus.papers) test(p.id, p.title, p.description, []);
    return hit;
  }, [query]);

  const toggle = (id: string) => {
    setExpanded((e) => {
      const n = new Set(e);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  };

  const expandedFor = (id: string) => (matches ? matches.has(id) : expanded.has(id));

  const setStatus = (id: string, isLeaf: boolean, status: ItemStatus) => {
    if (isLeaf) setItemStatus(id, 'subtopic', status);
    else {
      const ids = subtreeLeafIds(id);
      bulkSetStatus(ids, 'subtopic', status);
      push(`${status === 'completed' ? 'Marked' : 'Set'} ${ids.length} units · ${status.replace('_', ' ')}`, 'ok');
    }
  };

  const isExpanded = (id: string) => expandedFor(id);

  const renderRow = (id: string, type: string, title: string, desc: string, depth: number, stat?: NodeStat, isLeaf = false) => {
    const hasChildren = !isLeaf;
    const open = hasChildren && isExpanded(id);
    const st = getProgress(id)?.status ?? 'not_started';
    const p = getProgress(id);
    return (
      <div key={id + type} className="tree-row" style={{ paddingLeft: 6 }}>
        {hasChildren ? (
          <button className={`tw ${open ? 'open' : ''}`} style={{ background: 'none', border: 'none', cursor: 'pointer' }} onClick={() => toggle(id)}>▶</button>
        ) : <span style={{ width: 18, flexShrink: 0 }} />}
        <div className="grow" style={{ minWidth: 0, cursor: hasChildren ? 'pointer' : 'default' }} onClick={() => hasChildren && toggle(id)}>
          <span className="t-title">
            {title}
            {desc && depth <= 1 && <span className="desc">{desc}</span>}
          </span>
        </div>
        <div className="t-right">
          {p && p.revisionCount > 0 && <RChip count={p.revisionCount} />}
          {stat && stat.total > 0 && (
            <div className="row" style={{ gap: 7 }}>
              <div style={{ width: 90 }}><div className="bar thin"><div style={{ width: `${stat.pct}%` }} /></div></div>
              <span className="t-pct">{stat.pct}%</span>
            </div>
          )}
          <StatusToggle status={st} onSet={(s) => setStatus(id, isLeaf, s)} />
          <button className="icon-btn" style={{ width: 27, height: 27, fontSize: 13 }} title="Short notes" onClick={() => setNotesItem({ id, type, title })}>✎</button>
          {(type === 'topic' || type === 'subtopic') && (
            <button className="icon-btn" style={{ width: 27, height: 27, fontSize: 13 }} title="Log revision" onClick={() => setReviseItem({ id, type, title })}>↻</button>
          )}
          {(type === 'topic' || type === 'subtopic' || type === 'chapter') && (
            <button className="icon-btn" style={{ width: 27, height: 27, fontSize: 13 }} title="Plan a study task" onClick={() => setTaskItem({ id, type, title })}>+</button>
          )}
        </div>
      </div>
    );
  };

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Operational Syllabus</h1>
          <div className="sub">{syllabus.papers.length} papers · {syllabus.subjects.length} subjects · {syllabus.chapters.length} chapters · {syllabus.topics.length} topics · {syllabus.subtopics.length} subtopics</div>
        </div>
        <div className="page-actions">
          <input className="input input-sm" style={{ width: 230 }} placeholder="Search topics, subtopics…" value={query} onChange={(e) => setQuery(e.target.value)} />
          <div className="seg">
            {(['all', 'prelims', 'mains', 'optional'] as Cat[]).map((c) => (
              <button key={c} className={cat === c ? 'active' : ''} onClick={() => setCat(c)}>
                {c === 'all' ? 'All' : c === 'optional' ? 'Geo Optional' : c[0].toUpperCase() + c.slice(1)}
              </button>
            ))}
          </div>
        </div>
      </div>

      {papers.map((paper) => {
        const ps = stats.get(paper.id)!;
        const open = expandedFor(paper.id);
        return (
          <Card key={paper.id} className="tree-paper">
            {renderRow(paper.id, 'paper', paper.title, paper.description, 0, ps)}
            {open && (
              <div className="tree-children">
                {(syllabus.subjectsOf.get(paper.id) ?? []).map((subject) => {
                  const ss = stats.get(subject.id)!;
                  const sOpen = expandedFor(subject.id);
                  return (
                    <div key={subject.id}>
                      {renderRow(subject.id, 'subject', subject.title, subject.description, 1, ss)}
                      {sOpen && (
                        <div className="tree-children">
                          {(syllabus.chaptersOf.get(subject.id) ?? []).map((chapter) => {
                            const cs = stats.get(chapter.id)!;
                            const cOpen = expandedFor(chapter.id);
                            return (
                              <div key={chapter.id}>
                                {renderRow(chapter.id, 'chapter', chapter.title, chapter.description, 2, cs)}
                                {cOpen && (
                                  <div className="tree-children">
                                    {(syllabus.topicsOf.get(chapter.id) ?? []).map((topic) => {
                                      const tOpen = expandedFor(topic.id);
                                      const subCount = (syllabus.subtopicsOf.get(topic.id) ?? []).length;
                                      return (
                                        <div key={topic.id}>
                                          {renderRow(topic.id, 'topic', topic.title, topic.description, 3, subCount > 0 ? stats.get(topic.id) : undefined, subCount === 0)}
                                          {tOpen && subCount > 0 && (
                                            <div className="tree-children">
                                              {(syllabus.subtopicsOf.get(topic.id) ?? []).map((st) =>
                                                renderRow(st.id, 'subtopic', st.title, st.description, 4, undefined, true))}
                                            </div>
                                          )}
                                        </div>
                                      );
                                    })}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </Card>
        );
      })}

      {notesItem && <NotesModal item={notesItem} onClose={() => setNotesItem(null)} />}
      {reviseItem && <ReviseModal item={reviseItem} onClose={() => setReviseItem(null)} />}
      {taskItem && <QuickTaskModal item={taskItem} onClose={() => setTaskItem(null)} />}
    </>
  );
}

function subtreeLeafIds(rootId: string): string[] {
  // paper -> subjects -> chapters -> topics -> subtopics (or topic-as-leaf)
  const out: string[] = [];
  const paper = syllabus.paperById.get(rootId);
  if (paper) {
    for (const s of syllabus.subjectsOf.get(paper.id) ?? []) for (const c of syllabus.chaptersOf.get(s.id) ?? []) for (const t of syllabus.topicsOf.get(c.id) ?? []) {
      const subs = syllabus.subtopicsOf.get(t.id) ?? [];
      if (subs.length) out.push(...subs.map((x) => x.id));
      else out.push(t.id);
    }
    return out;
  }
  const subject = syllabus.subjectById.get(rootId);
  if (subject) {
    for (const c of syllabus.chaptersOf.get(subject.id) ?? []) for (const t of syllabus.topicsOf.get(c.id) ?? []) {
      const subs = syllabus.subtopicsOf.get(t.id) ?? [];
      if (subs.length) out.push(...subs.map((x) => x.id));
      else out.push(t.id);
    }
    return out;
  }
  const chapter = syllabus.chapterById.get(rootId);
  if (chapter) {
    for (const t of syllabus.topicsOf.get(chapter.id) ?? []) {
      const subs = syllabus.subtopicsOf.get(t.id) ?? [];
      if (subs.length) out.push(...subs.map((x) => x.id));
      else out.push(t.id);
    }
    return out;
  }
  const topic = syllabus.topicById.get(rootId);
  if (topic) {
    const subs = syllabus.subtopicsOf.get(topic.id) ?? [];
    return subs.length ? subs.map((x) => x.id) : [topic.id];
  }
  return [rootId];
}

export function StatusToggle({ status, onSet }: { status: ItemStatus; onSet: (s: ItemStatus) => void }) {
  const next: Record<ItemStatus, ItemStatus> = { not_started: 'in_progress', in_progress: 'completed', completed: 'not_started' };
  const color = status === 'completed' ? 'var(--ok)' : status === 'in_progress' ? 'var(--warn)' : 'var(--text-faint)';
  const glyph = status === 'completed' ? '●' : status === 'in_progress' ? '◐' : '○';
  return (
    <button
      className="chip click"
      style={{ color, borderColor: 'var(--line-strong)', fontWeight: 700 }}
      title={`Status: ${status.replace('_', ' ')} (click to change)`}
      onClick={() => onSet(next[status])}
    >
      {glyph} {status === 'completed' ? 'Done' : status === 'in_progress' ? 'WIP' : 'To do'}
    </button>
  );
}

function NotesModal({ item, onClose }: { item: { id: string; type: string; title: string }; onClose: () => void }) {
  const { getProgress, setItemNotes } = useStore();
  const { push } = useToast();
  const [text, setText] = useState(getProgress(item.id)?.notes ?? '');
  return (
    <Modal open onClose={onClose} title={`Short notes — ${item.title}`} wide footer={
      <>
        <button className="btn ghost" onClick={onClose}>Close</button>
        <button className="btn primary" onClick={() => { setItemNotes(item.id, item.type as never, text); push('Notes saved', 'ok'); onClose(); }}>Save notes</button>
      </>
    }>
      <Field label="Your notes (source references, mnemonics, map pointers…)">
        <textarea className="notes-area" style={{ minHeight: 200 }} value={text} onChange={(e) => setText(e.target.value)} placeholder={`Key points for ${item.title}…`} autoFocus />
      </Field>
      <p className="tiny muted">Notes are saved locally on this device and included in backups.</p>
    </Modal>
  );
}

export function ReviseModal({ item, onClose }: { item: { id: string; type: string; title: string }; onClose: () => void }) {
  const { getProgress, reviseItem, resetRevision } = useStore();
  const { push } = useToast();
  const p = getProgress(item.id);
  const count = p?.revisionCount ?? 0;
  const revise = (conf: Confidence) => {
    reviseItem(item.id, item.type as never, conf);
    const next = nextRevisionDate(new Date(), Math.min(5, count + 1), conf);
    push(`R${Math.min(5, count + 1)} logged · next on ${next.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}`, 'ok');
    onClose();
  };
  return (
    <Modal open onClose={onClose} title={`Log revision — ${item.title}`} footer={
      p && p.revisionCount > 0 ? (
        <button className="btn bad" onClick={() => { resetRevision(item.id, item.type as never); push('Revision progress reset'); onClose(); }}>Reset to R0</button>
      ) : undefined
    }>
      <div className="row" style={{ gap: 8 }}>
        <RChip count={count} />
        <span className="soft small">{rLabel(count)}</span>
        {p?.nextRevisionAt && <span className="tiny muted">next: {new Date(p.nextRevisionAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</span>}
        {p?.confidence ? <span className={`conf-dot c${p.confidence}`} title={`Confidence: ${CONFIDENCE_LABELS[p.confidence]}`} /> : null}
      </div>
      <hr className="divider" />
      <p className="small soft">How well did you recall it? Interval: R1 3d → R2 7d → R3 21d → R4/R5 45d, scaled by confidence (×0.5 / ×1 / ×1.5).</p>
      <div className="row" style={{ gap: 8 }}>
        <button className="btn bad grow block" onClick={() => revise(1)}>:( Low<br /><span className="tiny">×0.5 interval</span></button>
        <button className="btn grow block" onClick={() => revise(2)}>🙂 Medium<br /><span className="tiny">×1 interval</span></button>
        <button className="btn ok grow block" onClick={() => revise(3)}>😃 High<br /><span className="tiny">×1.5 interval</span></button>
      </div>
    </Modal>
  );
}

function QuickTaskModal({ item, onClose }: { item: { id: string; type: string; title: string }; onClose: () => void }) {
  const { addTask } = useStore();
  const { push } = useToast();
  const [name, setName] = useState(`Study: ${item.title}`);
  const [deadline, setDeadline] = useState(addDays(todayKey(), 1));
  const [startTime, setStartTime] = useState('');
  const [estimate, setEstimate] = useState('60');
  const submit = () => {
    addTask({
      name: name.trim() || item.title,
      deadline,
      startTime: startTime || null,
      estimateMin: estimate ? Number(estimate) : null,
      subjectMapping: subjectMappingFor(item.id),
      syllabusContext: item.title,
      linkedTopicId: item.type === 'topic' || item.type === 'subtopic' ? (item.type === 'topic' ? item.id : syllabus.subtopicById.get(item.id)?.topicId ?? null) : null,
      linkedSubtopicId: item.type === 'subtopic' ? item.id : null,
    });
    push('Task added to planner', 'ok');
    onClose();
    navigate('/tasks');
  };
  return (
    <Modal open onClose={onClose} title="Plan study task" footer={
      <>
        <button className="btn ghost" onClick={onClose}>Cancel</button>
        <button className="btn primary" onClick={submit}>Add task</button>
      </>
    }>
      <Field label="Task"><input className="input" value={name} onChange={(e) => setName(e.target.value)} autoFocus /></Field>
      <div className="form-grid">
        <Field label="Deadline"><input type="date" className="input" value={deadline} onChange={(e) => setDeadline(e.target.value)} /></Field>
        <Field label="Start time (optional)"><input type="time" className="input" value={startTime} onChange={(e) => setStartTime(e.target.value)} /></Field>
        <Field label="Estimate (minutes)"><input type="number" min={5} step={5} className="input" value={estimate} onChange={(e) => setEstimate(e.target.value)} /></Field>
      </div>
      <p className="tiny muted">Maps to: {subjectMappingFor(item.id)}</p>
    </Modal>
  );
}

export function subjectMappingFor(itemId: string): string {
  const st = syllabus.subtopicById.get(itemId);
  if (st) return paperShort(syllabus.topicById.get(st.topicId)!);
  const t = syllabus.topicById.get(itemId);
  if (t) return paperShort(t);
  const c = syllabus.chapterById.get(itemId);
  if (c) return paperShort({ chapterId: c.id } as never);
  return '';
}

function paperShort(x: { chapterId: string }): string {
  const chapter = syllabus.chapterById.get(x.chapterId);
  if (!chapter) return '';
  const subject = syllabus.subjectById.get(chapter.subjectId);
  if (!subject) return '';
  const paper = syllabus.paperById.get(subject.paperId);
  if (!paper) return '';
  if (paper.category === 'optional') return 'Optional';
  if (paper.title === 'Prelims CSAT') return 'CSAT';
  if (paper.category === 'prelims') return 'Prelims GS1';
  return paper.title;
}

export { fmtTime };
