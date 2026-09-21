/** Daily Planner / Tasks — day-focused planner with time blocks and quick add. */
import React, { useMemo, useRef, useState } from 'react';
import { useStore } from '../store/store';
import { Card, Empty, Modal, Field, Confirm } from '../ui/components';
import { useToast } from '../ui/toast';
import type { Task, Priority, PriorityBucket } from '../types';
import { todayKey, addDays, dateFromKey, formatDateLong, fmtTime, relDay, nowTimeKey } from '../lib/date';
import { syllabus } from '../data/syllabus';
import { parseQuickTasks } from '../lib/tasks';

const SUBJECT_MAPPINGS = ['Prelims GS1', 'CSAT', 'GS-I', 'GS-II', 'GS-III', 'GS-IV', 'Essay', 'Optional', 'Current Affairs'];
const PRIORITY_CHIPS: { value: Priority; label: string; cls: string }[] = [
  { value: 'critical', label: 'Critical', cls: 'bad' },
  { value: 'high', label: 'High', cls: 'warn' },
  { value: 'normal', label: 'Normal', cls: '' },
  { value: 'low', label: 'Low', cls: '' },
];

export function Tasks() {
  const { db, addTask, addTasks, updateTask, toggleTask, deleteTask } = useStore();
  const { push } = useToast();
  const [date, setDate] = useState(todayKey());
  const [showAdd, setShowAdd] = useState(false);
  const [editing, setEditing] = useState<Task | null>(null);
  const [deleting, setDeleting] = useState<Task | null>(null);
  const [quick, setQuick] = useState('');
  const quickAddLock = useRef(false);

  const dayTasks = useMemo(() => db.tasks.filter((t) => t.deadline === date), [db.tasks, date]);
  const scheduled = dayTasks.filter((t) => t.startTime && t.status !== 'completed').sort((a, b) => (a.startTime ?? '').localeCompare(b.startTime ?? ''));
  const anytime = dayTasks.filter((t) => !t.startTime && t.status !== 'completed');
  const done = dayTasks.filter((t) => t.status === 'completed');
  const overdueElsewhere = db.tasks.filter((t) => t.status !== 'completed' && t.deadline < date);

  const weekStrip = useMemo(() => {
    const start = addDays(date, -((dateFromKey(date).getDay() + 7 - 1) % 7)); // Monday start
    return Array.from({ length: 7 }, (_, i) => addDays(start, i));
  }, [date]);

  const addQuick = () => {
    if (quickAddLock.current) return;
    const names = parseQuickTasks(quick);
    if (!names.length) return;
    quickAddLock.current = true;
    addTasks(names.map((name) => ({ name, deadline: date, subjectMapping: guessMapping(name) })));
    setQuick('');
    push(`${names.length} task${names.length === 1 ? '' : 's'} added`, 'ok');
    window.setTimeout(() => { quickAddLock.current = false; }, 0);
  };

  const toggleDone = (t: Task) => {
    toggleTask(t.id, t.status !== 'completed');
    if (t.status !== 'completed') push('Task completed 🎯', 'ok');
  };

  const progressPct = dayTasks.length ? Math.round((done.length / dayTasks.length) * 100) : 0;

  return (
    <>
      <div className="page-head planner-head">
        <div>
          <h1>Daily Planner</h1>
          <div className="sub">{formatDateLong(date)} · {dayTasks.length} tasks · {done.length} done · {progressPct}%</div>
        </div>
        <div className="page-actions">
          <button className="btn" onClick={() => setDate(addDays(date, -1))}>‹</button>
          <input type="date" className="input input-sm" value={date} onChange={(e) => setDate(e.target.value || todayKey())} />
          <button className="btn" onClick={() => setDate(addDays(date, 1))}>›</button>
          <button className="btn" onClick={() => setDate(todayKey())}>Today</button>
          <button className="btn primary" onClick={() => setShowAdd(true)}>+ New task</button>
        </div>
      </div>

      {/* week strip */}
      <div className="planner-week-strip">
        {weekStrip.map((d) => {
          const count = db.tasks.filter((t) => t.deadline === d && t.status !== 'completed').length;
          const isSel = d === date;
          const isToday = d === todayKey();
          const dw = dateFromKey(d).toLocaleDateString('en-IN', { weekday: 'short' });
          return (
            <button key={d} onClick={() => setDate(d)} className={`planner-day ${isSel ? 'selected' : ''} ${isToday ? 'today' : ''}`}>
              <div className="tiny" style={{ fontWeight: 700, color: isSel ? 'var(--accent)' : 'var(--text-faint)' }}>{dw}</div>
              <div style={{ fontWeight: 800, fontSize: 15 }}>{dateFromKey(d).getDate()}</div>
              <div className="tiny muted">{count ? `${count} due` : '—'}</div>
            </button>
          );
        })}
      </div>

      <div className="grid planner-layout">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {/* quick add */}
          <Card className="card-pad planner-quick-add">
            <div className="quick-add-heading">
              <div><b>Quick Add</b><span>One task per line</span></div>
              <span className="kbd">Ctrl ↵</span>
            </div>
            <div className="quick-add-input">
              <textarea className="input" rows={3} placeholder={`Add one or several tasks for ${formatDateLong(date)}…`} value={quick} onChange={(e) => setQuick(e.target.value)}
                onKeyDown={(e) => {
                  const submitShortcut = e.key === 'Enter' && (e.ctrlKey || e.metaKey || (!e.shiftKey && !quick.includes('\n')));
                  if (submitShortcut) { e.preventDefault(); addQuick(); }
                }} />
              <button className="btn primary" onClick={addQuick}>Add {parseQuickTasks(quick).length > 1 ? `${parseQuickTasks(quick).length} tasks` : 'task'}</button>
            </div>
            <div className="row wrap" style={{ marginTop: 10, gap: 6 }}>
              <span className="tiny muted">Templates:</span>
              {['📰 Newspaper + notes (60m)', '✍️ 2 answers (45m)', '↻ Revision hour (60m)', '🧮 CSAT practice (45m)', '🗺 Map practice (20m)'].map((tpl) => (
                <button key={tpl} className="chip click" onClick={() => addTask({ name: tpl.replace(/^[^ ]+ /, ''), deadline: date, subjectMapping: guessMapping(tpl), estimateMin: Number(tpl.match(/\((\d+)m\)/)?.[1] ?? 0) || null })}>{tpl}</button>
              ))}
            </div>
          </Card>

          {overdueElsewhere.length > 0 && (
            <Card className="card-pad" style={{ borderColor: 'var(--bad)', background: 'var(--bad-soft)' }}>
              <div className="row wrap">
                <b style={{ color: 'var(--bad)' }}>⏰ {overdueElsewhere.length} overdue task{overdueElsewhere.length > 1 ? 's' : ''}</b>
                <span className="small soft grow">Carry them forward to today.</span>
                <button className="btn sm" onClick={() => {
                  overdueElsewhere.forEach((t) => updateTask(t.id, { deadline: date }));
                  push('Overdue tasks moved to today', 'ok');
                }}>Reschedule all to {formatDateLong(date).split(',')[0]}</button>
              </div>
            </Card>
          )}

          {scheduled.length > 0 && (
            <Card>
              <div className="card-head"><h3>◷ Time blocks</h3><span className="hint">{scheduled.length} scheduled</span></div>
              <div className="card-pad" style={{ paddingTop: 10, display: 'flex', flexDirection: 'column', gap: 8 }}>
                {scheduled.map((t) => <TaskRow key={t.id} t={t} onToggle={() => toggleDone(t)} onEdit={() => setEditing(t)} onDelete={() => setDeleting(t)} showTime />)}
              </div>
            </Card>
          )}

          <Card>
            <div className="card-head"><h3>☰ Anytime</h3><span className="hint">{anytime.length} pending</span></div>
            <div className="card-pad" style={{ paddingTop: 10, display: 'flex', flexDirection: 'column', gap: 8 }}>
              {anytime.length === 0 && <Empty icon="✓" title="No pending tasks" hint="Enjoy the calm — or plan ahead" />}
              {anytime.map((t) => <TaskRow key={t.id} t={t} onToggle={() => toggleDone(t)} onEdit={() => setEditing(t)} onDelete={() => setDeleting(t)} />)}
            </div>
          </Card>

          {done.length > 0 && (
            <Card>
              <div className="card-head"><h3>✓ Completed</h3><span className="hint">{done.length} done</span></div>
              <div className="card-pad" style={{ paddingTop: 10, display: 'flex', flexDirection: 'column', gap: 8 }}>
                {done.map((t) => <TaskRow key={t.id} t={t} onToggle={() => toggleDone(t)} onEdit={() => setEditing(t)} onDelete={() => setDeleting(t)} />)}
              </div>
            </Card>
          )}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <Card>
            <div className="card-head"><h3>◎ Day summary</h3></div>
            <div className="card-pad" style={{ paddingTop: 10, display: 'flex', flexDirection: 'column', gap: 9 }}>
              <SummaryRow label="Planned minutes" value={String(dayTasks.reduce((a, t) => a + (t.estimateMin ?? 0), 0))} />
              <SummaryRow label="Scheduled blocks" value={String(scheduled.length)} />
              <SummaryRow label="Completion" value={`${progressPct}%`} />
              <SummaryRow label="High priority pending" value={String(dayTasks.filter((t) => t.status !== 'completed' && (t.priority === 'critical' || t.priority === 'high')).length)} />
              <div className="bar ok"><div style={{ width: `${progressPct}%` }} /></div>
            </div>
          </Card>
          <Card>
            <div className="card-head"><h3>⚑ Linked syllabus</h3><span className="hint">tasks ↔ topics</span></div>
            <div className="card-pad" style={{ paddingTop: 10, display: 'flex', flexDirection: 'column', gap: 7 }}>
              {dayTasks.filter((t) => t.linkedTopicId || t.linkedSubtopicId).length === 0 && <p className="small muted">No syllabus-linked tasks today. Link topics from the Syllabus page (＋ button) or while editing a task.</p>}
              {dayTasks.filter((t) => t.linkedTopicId || t.linkedSubtopicId).map((t) => (
                <div key={t.id} className="row small">
                  <span className="chip geo">link</span>
                  <span className="grow" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.name}</span>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>

      <TaskForm open={showAdd} onClose={() => setShowAdd(false)} defaultDeadline={date} />
      {editing && <TaskForm open editing={editing} onClose={() => setEditing(null)} defaultDeadline={editing.deadline} />}
      <Confirm open={!!deleting} onClose={() => setDeleting(null)} onConfirm={() => deleting && deleteTask(deleting.id)} title="Delete task?" body={`"${deleting?.name}" will be removed permanently.`} />
    </>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="row small" style={{ justifyContent: 'space-between' }}>
      <span className="soft">{label}</span>
      <b className="mono">{value}</b>
    </div>
  );
}

function TaskRow({ t, onToggle, onEdit, onDelete, showTime }: { t: Task; onToggle: () => void; onEdit: () => void; onDelete: () => void; showTime?: boolean }) {
  const done = t.status === 'completed';
  const prioChip = t.priority === 'critical' ? <span className="chip bad">critical</span> : t.priority === 'high' ? <span className="chip warn">high</span> : null;
  return (
    <div className={`task-item ${done ? 'done' : ''}`}>
      <button className="tick" onClick={onToggle} title={done ? 'Mark pending' : 'Mark done'}>✓</button>
      <div className="grow" style={{ minWidth: 0 }}>
        <div className="row" style={{ gap: 8 }}>
          {showTime && t.startTime && <span className="tiny mono" style={{ color: 'var(--accent)', fontWeight: 700, flexShrink: 0 }}>{fmtTime(t.startTime)}{t.endTime ? `–${fmtTime(t.endTime)}` : ''}</span>}
          <span className="t-name" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.name}</span>
        </div>
        <div className="t-meta">
          {t.subjectMapping && <span className="chip accent">{t.subjectMapping}</span>}
          {t.studyStage !== 'R0' && <span className="chip geo">{t.studyStage}</span>}
          {t.source && <span className="chip">{t.source}</span>}
          {t.estimateMin ? <span className="chip">{t.estimateMin}m</span> : null}
          {prioChip}
        </div>
      </div>
      <div className="t-actions">
        <button className="icon-btn" style={{ width: 28, height: 28, fontSize: 13 }} title="Edit" onClick={onEdit}>✎</button>
        <button className="icon-btn" style={{ width: 28, height: 28, fontSize: 13 }} title="Delete" onClick={onDelete}>🗑</button>
      </div>
    </div>
  );
}

function guessMapping(name: string): string {
  const n = name.toLowerCase();
  if (n.includes('newspaper') || n.includes('current')) return 'Current Affairs';
  if (n.includes('csat') || n.includes('aptitude')) return 'CSAT';
  if (n.includes('answer') || n.includes('essay') || n.includes('mains')) return 'GS-I';
  if (n.includes('map') || n.includes('geo')) return 'Optional';
  if (n.includes('revise') || n.includes('revision')) return 'Prelims GS1';
  return 'Prelims GS1';
}

export function TaskForm({ open, onClose, editing, defaultDeadline }: { open: boolean; onClose: () => void; editing?: Task | null; defaultDeadline: string }) {
  const { addTask, updateTask } = useStore();
  const { push } = useToast();
  const [name, setName] = useState(editing?.name ?? '');
  const [subjectMapping, setSubjectMapping] = useState(editing?.subjectMapping ?? 'Prelims GS1');
  const [deadline, setDeadline] = useState(editing?.deadline ?? defaultDeadline);
  const [startTime, setStartTime] = useState(editing?.startTime ?? '');
  const [endTime, setEndTime] = useState(editing?.endTime ?? '');
  const [estimate, setEstimate] = useState(editing?.estimateMin ? String(editing.estimateMin) : '');
  const [priority, setPriority] = useState<Priority>(editing?.priority ?? 'normal');
  const [stage, setStage] = useState(editing?.studyStage ?? 'R0');
  const [source, setSource] = useState(editing?.source ?? '');
  const [notes, setNotes] = useState(editing?.notes ?? '');
  const [isEvent, setIsEvent] = useState(editing?.isEvent ?? false);
  const [topicQuery, setTopicQuery] = useState('');
  const [linkedTopicId, setLinkedTopicId] = useState(editing?.linkedTopicId ?? null);
  const [linkedSubtopicId, setLinkedSubtopicId] = useState(editing?.linkedSubtopicId ?? null);

  const topicMatches = useMemo(() => {
    const q = topicQuery.trim().toLowerCase();
    if (q.length < 2) return [];
    return syllabus.topics.filter((t) => t.title.toLowerCase().includes(q)).slice(0, 6);
  }, [topicQuery]);

  const submit = () => {
    if (!name.trim()) { push('Task name is required', 'bad'); return; }
    const payload = {
      name: name.trim(), subjectMapping, deadline, startTime: startTime || null, endTime: endTime || null,
      estimateMin: estimate ? Number(estimate) : null, priority, studyStage: stage as Task['studyStage'],
      source: source || null, notes, isEvent,
      linkedTopicId, linkedSubtopicId,
    };
    if (editing) { updateTask(editing.id, payload); push('Task updated', 'ok'); }
    else { addTask(payload); push('Task added', 'ok'); }
    onClose();
  };

  return (
    <Modal open={open} onClose={onClose} title={editing ? 'Edit task' : 'New task'} wide footer={
      <>
        <button className="btn ghost" onClick={onClose}>Cancel</button>
        <button className="btn primary" onClick={submit}>{editing ? 'Save changes' : 'Add task'}</button>
      </>
    }>
      <Field label="What needs to be done?"><input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Read Laxmikanth Ch.1 — Historical Background" autoFocus /></Field>
      <div className="form-grid">
        <Field label="Subject mapping">
          <select className="input" value={subjectMapping} onChange={(e) => setSubjectMapping(e.target.value)}>
            {SUBJECT_MAPPINGS.map((m) => <option key={m}>{m}</option>)}
          </select>
        </Field>
        <Field label="Study stage">
          <select className="input" value={stage} onChange={(e) => setStage(e.target.value as Task['studyStage'])}>
            {['R0', 'R1', 'R2', 'R3', 'R4', 'R5'].map((r) => <option key={r}>{r}</option>)}
          </select>
        </Field>
        <Field label="Deadline"><input type="date" className="input" value={deadline} onChange={(e) => setDeadline(e.target.value)} /></Field>
        <Field label="Priority">
          <select className="input" value={priority} onChange={(e) => setPriority(e.target.value as Priority)}>
            {PRIORITY_CHIPS.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
          </select>
        </Field>
        <Field label="Start time"><input type="time" className="input" value={startTime} onChange={(e) => setStartTime(e.target.value)} /></Field>
        <Field label="End time"><input type="time" className="input" value={endTime} onChange={(e) => setEndTime(e.target.value)} /></Field>
        <Field label="Estimate (min)"><input type="number" min={0} step={5} className="input" value={estimate} onChange={(e) => setEstimate(e.target.value)} /></Field>
        <Field label="Source / book"><input className="input" value={source} onChange={(e) => setSource(e.target.value)} placeholder="Laxmikanth, NCERT, The Hindu…" /></Field>
      </div>
      <Field label="Link to syllabus topic (optional)">
        <input className="input" value={topicQuery} onChange={(e) => setTopicQuery(e.target.value)} placeholder="Search topics — e.g. Monsoon" />
      </Field>
      {topicMatches.length > 0 && (
        <div className="row wrap" style={{ gap: 6 }}>
          {topicMatches.map((t) => (
            <button key={t.id} className={`chip click ${linkedTopicId === t.id ? 'geo' : ''}`} onClick={() => { setLinkedTopicId(t.id); setLinkedSubtopicId(null); setTopicQuery(t.title); }}>
              {t.title}
            </button>
          ))}
        </div>
      )}
      <label className="checkbox-row"><input type="checkbox" checked={isEvent} onChange={(e) => setIsEvent(e.target.checked)} /> This is an event (appears in Calendar as an event block)</label>
      <Field label="Notes"><textarea className="input" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Details, page numbers, links…" /></Field>
    </Modal>
  );
}
