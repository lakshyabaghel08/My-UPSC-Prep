/** Calendar — month grid of tasks, events, revision dues and tests. */
import React, { useMemo, useState } from 'react';
import { useStore } from '../store/store';
import { calendarEntries, type CalendarEntry } from '../store/selectors';
import { Card, Modal, Field } from '../ui/components';
import { monthLabel, todayKey, dateFromKey, formatDateLong, fmtTime } from '../lib/date';
import { TaskForm } from './Tasks';
import { useToast } from '../ui/toast';

export function CalendarPage() {
  const { db, toggleTask, updateTask } = useStore();
  const today = todayKey();
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth());
  const [selected, setSelected] = useState<string | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const { push } = useToast();

  const entries = useMemo(() => calendarEntries(db, year, month), [db, year, month]);

  const first = new Date(year, month, 1);
  const startPad = first.getDay(); // Sunday-first grid
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: (string | null)[] = [
    ...Array.from({ length: startPad }, () => null),
    ...Array.from({ length: daysInMonth }, (_, i) => `${year}-${String(month + 1).padStart(2, '0')}-${String(i + 1).padStart(2, '0')}`),
  ];
  while (cells.length % 7 !== 0) cells.push(null);

  const prev = () => (month === 0 ? (setYear(year - 1), setMonth(11)) : setMonth(month - 1));
  const nextM = () => (month === 11 ? (setYear(year + 1), setMonth(0)) : setMonth(month + 1));

  const dayEntries: CalendarEntry[] = selected ? entries[selected] ?? [] : [];
  const monthTaskCount = Object.values(entries).flat().filter((e) => e.kind === 'task' || e.kind === 'event').length;

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Calendar</h1>
          <div className="sub">{monthLabel(year, month)} · {monthTaskCount} tasks & events · revision dues shown in teal</div>
        </div>
        <div className="page-actions">
          <button className="btn" onClick={prev}>‹</button>
          <button className="btn" onClick={() => { setYear(now.getFullYear()); setMonth(now.getMonth()); }}>This month</button>
          <button className="btn" onClick={nextM}>›</button>
          <button className="btn primary" onClick={() => setShowAdd(true)}>+ New task / event</button>
        </div>
      </div>

      <Card className="card-pad">
        <div className="cal-grid">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => <div key={d} className="cal-dow">{d}</div>)}
          {cells.map((key, i) => {
            if (!key) return <div key={`x${i}`} />;
            const evs = entries[key] ?? [];
            const isToday = key === today;
            const dnum = dateFromKey(key).getDate();
            return (
              <div key={key} className={`cal-cell ${isToday ? 'today' : ''}`} onClick={() => setSelected(key)} style={{ cursor: 'pointer' }}>
                <span className="d-num">{dnum}</span>
                {evs.slice(0, 3).map((e, j) => (
                  <span key={j} className={`cal-ev ${e.kind} ${e.done ? 'done' : ''}`} title={e.label}
                    onClick={(ev) => { ev.stopPropagation(); if (e.kind === 'task' || e.kind === 'event') { toggleTask(e.id!, !e.done); } else setSelected(key); }}>
                    {e.label}
                  </span>
                ))}
                {evs.length > 3 && <span className="cal-more">+{evs.length - 3} more</span>}
              </div>
            );
          })}
        </div>
        <div className="legend" style={{ marginTop: 12 }}>
          <span><span className="dot" style={{ background: 'var(--accent)' }} /> Task</span>
          <span><span className="dot" style={{ background: 'var(--ok)' }} /> Done</span>
          <span><span className="dot" style={{ background: 'var(--warn)' }} /> Event</span>
          <span><span className="dot" style={{ background: 'var(--geo)' }} /> Revision due</span>
          <span><span className="dot" style={{ background: 'var(--bad)' }} /> Test</span>
        </div>
      </Card>

      {selected && (
        <Modal open onClose={() => setSelected(null)} title={formatDateLong(selected)} wide footer={
          <>
            <button className="btn ghost" onClick={() => setSelected(null)}>Close</button>
            <button className="btn primary" onClick={() => setShowAdd(true)}>+ Add on this day</button>
          </>
        }>
          {dayEntries.length === 0 ? <p className="soft small">Nothing scheduled. A calm day — plan something meaningful.</p> : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {dayEntries.sort((a, b) => a.kind.localeCompare(b.kind)).map((e, i) => (
                <div key={i} className="task-item" style={{ opacity: e.done ? 0.6 : 1 }}>
                  <span style={{ width: 9, height: 9, borderRadius: 3, background: dotFor(e.kind), flexShrink: 0 }} />
                  <div className="grow">
                    <div className="small" style={{ fontWeight: 650, textDecoration: e.done ? 'line-through' : 'none' }}>{e.label}</div>
                    <div className="tiny muted">{kindLabel(e.kind)}</div>
                  </div>
                  {(e.kind === 'task' || e.kind === 'event') && e.id && (
                    <button className="btn xs" onClick={() => { toggleTask(e.id!, !e.done); push(e.done ? 'Marked pending' : 'Marked done 🎯', 'ok'); }}>
                      {e.done ? 'Undo' : 'Done'}
                    </button>
                  )}
                  {(e.kind === 'task' || e.kind === 'event') && e.id && (
                    <button className="btn xs" onClick={() => {
                      const t = db.tasks.find((x) => x.id === e.id);
                      if (!t) return;
                      const newDate = window.prompt('Move to date (YYYY-MM-DD)', t.deadline);
                      if (newDate && /^\d{4}-\d{2}-\d{2}$/.test(newDate)) { updateTask(t.id, { deadline: newDate }); push('Task moved', 'ok'); setSelected(null); }
                    }}>Move</button>
                  )}
                </div>
              ))}
            </div>
          )}
        </Modal>
      )}

      {showAdd && <TaskForm open onClose={() => setShowAdd(false)} defaultDeadline={selected ?? today} />}
    </>
  );
}

function dotFor(kind: CalendarEntry['kind']): string {
  return { task: 'var(--accent)', event: 'var(--warn)', revision: 'var(--geo)', test: 'var(--bad)' }[kind];
}
function kindLabel(kind: CalendarEntry['kind']): string {
  return { task: 'Task', event: 'Event', revision: 'Scheduled revision', test: 'Test' }[kind];
}

export { fmtTime, Field };
