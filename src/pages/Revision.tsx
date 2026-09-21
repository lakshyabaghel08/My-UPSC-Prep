/** Revision System R1–R5 — spaced repetition queue across the syllabus. */
import React, { useMemo, useState } from 'react';
import { useStore } from '../store/store';
import { Card, CardHead, Empty, RChip, Seg } from '../ui/components';
import { Donut } from '../ui/charts';
import { revisionQueue, confidenceSplit } from '../store/selectors';
import { syllabus, itemTitle } from '../data/syllabus';
import { ReviseModal } from './Syllabus';
import { rLabel } from '../lib/revision';
import { addDays, todayKey, relDay, formatDate } from '../lib/date';
import type { ItemProgress } from '../types';

export function Revision() {
  const { db } = useStore();
  const [tab, setTab] = useState<'queue' | 'log' | 'method'>('queue');
  const [revItem, setRevItem] = useState<{ id: string; type: string; title: string } | null>(null);
  const q = useMemo(() => revisionQueue(db), [db]);
  const conf = useMemo(() => confidenceSplit(db), [db]);

  const titleFor = (p: ItemProgress) => {
    if (syllabus.subtopicById.has(p.itemId)) return { title: syllabus.subtopicById.get(p.itemId)!.title, type: 'subtopic', path: pathLabel(p.itemId, 'subtopic') };
    if (syllabus.topicById.has(p.itemId)) return { title: syllabus.topicById.get(p.itemId)!.title, type: 'topic', path: pathLabel(p.itemId, 'topic') };
    if (syllabus.chapterById.has(p.itemId)) return { title: syllabus.chapterById.get(p.itemId)!.title, type: 'chapter', path: pathLabel(p.itemId, 'chapter') };
    return { title: itemTitle(p.itemId, 'subtopic'), type: 'subtopic', path: '' };
  };

  const logs = useMemo(() => [...db.revisionLogs].sort((a, b) => b.revisedAt.localeCompare(a.revisedAt)).slice(0, 60), [db.revisionLogs]);
  const today = todayKey();

  const pendingCount = q.overdue.length + q.dueToday.length;
  const completedToday = db.revisionLogs.filter((l) => todayKey(new Date(l.revisedAt)) === today).length;

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Revision R1–R5</h1>
          <div className="sub">Spaced repetition: R1 3d → R2 7d → R3 21d → R4 45d → R5 45d · scaled by recall confidence</div>
        </div>
        <div className="seg">
          <button className={tab === 'queue' ? 'active' : ''} onClick={() => setTab('queue')}>Queue</button>
          <button className={tab === 'log' ? 'active' : ''} onClick={() => setTab('log')}>Log</button>
          <button className={tab === 'method' ? 'active' : ''} onClick={() => setTab('method')}>Method</button>
        </div>
      </div>

      <div className="grid cols-4" style={{ marginBottom: 14 }}>
        <Card className="stat-card"><div><div className="stat-value" style={{ color: 'var(--bad)' }}>{q.overdue.length}</div><div className="stat-label">Overdue</div></div></Card>
        <Card className="stat-card"><div><div className="stat-value" style={{ color: 'var(--warn)' }}>{q.dueToday.length}</div><div className="stat-label">Due today</div></div></Card>
        <Card className="stat-card"><div><div className="stat-value" style={{ color: 'var(--ok)' }}>{q.upcoming.length}</div><div className="stat-label">Upcoming</div></div></Card>
        <Card className="stat-card"><div><div className="stat-value">{completedToday}</div><div className="stat-label">Revised today</div></div></Card>
      </div>

      {tab === 'queue' && (
        <div className="grid" style={{ gridTemplateColumns: '1.5fr 1fr' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <QueueList title="⏰ Overdue — revise first" tone="bad" items={q.overdue} onRevise={setRevItem} titleFor={titleFor} emptyText="Nothing overdue. Excellent discipline." />
            <QueueList title="◉ Due today" tone="warn" items={q.dueToday} onRevise={setRevItem} titleFor={titleFor} emptyText="Nothing due today." />
            <QueueList title="→ Upcoming (next 14 days)" tone="geo" items={q.upcoming.filter((p) => p.nextRevisionAt && todayKey(new Date(p.nextRevisionAt)) <= addDays(today, 14))} onRevise={setRevItem} titleFor={titleFor} emptyText="Queue is clear beyond today." />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <Card>
              <CardHead title="Confidence split" hint="items in revision cycle" />
              <div className="card-pad" style={{ paddingTop: 16 }}>
                {conf.low + conf.medium + conf.high === 0
                  ? <Empty icon="◐" title="No revisions yet" hint="Mark topics completed, then log R1" />
                  : <Donut
                      segments={[
                        { label: 'High (×1.5)', value: conf.high, color: 'var(--ok)' },
                        { label: 'Medium (×1)', value: conf.medium, color: 'var(--warn)' },
                        { label: 'Low (×0.5)', value: conf.low, color: 'var(--bad)' },
                      ]}
                      centerLabel={`${conf.high + conf.medium + conf.low}`} centerSub="items" />}
              </div>
            </Card>
            <Card>
              <CardHead title="Never revised" hint="completed units outside the cycle" />
              <div className="card-pad" style={{ paddingTop: 10, display: 'flex', flexDirection: 'column', gap: 6 }}>
                <p className="small soft">Units completed but not yet in the revision cycle: <b style={{ color: 'var(--text)' }}>{q.notStarted}</b></p>
              </div>
            </Card>
            <Card>
              <CardHead title="Revision by R-stage" />
              <div className="card-pad" style={{ paddingTop: 10, display: 'flex', flexDirection: 'column', gap: 7 }}>
                {[1, 2, 3, 4, 5].map((r) => {
                  const n = Object.values(db.progress).filter((p) => p.revisionCount === r).length;
                  const maxN = Math.max(1, ...[1, 2, 3, 4, 5].map((x) => Object.values(db.progress).filter((p) => p.revisionCount === x).length));
                  return (
                    <div key={r} className="row" style={{ gap: 10 }}>
                      <RChip count={r} />
                      <div className="grow"><div className="bar"><div style={{ width: `${(n / maxN) * 100}%`, background: 'var(--geo)' }} /></div></div>
                      <span className="tiny mono muted" style={{ width: 30, textAlign: 'right' }}>{n}</span>
                    </div>
                  );
                })}
              </div>
            </Card>
          </div>
        </div>
      )}

      {tab === 'log' && (
        <Card>
          <CardHead title="Revision log" hint={`last ${logs.length} entries`} />
          <div className="card-pad" style={{ paddingTop: 6 }}>
            {logs.length === 0 ? <Empty icon="↻" title="No revisions logged yet" hint="Use ↻ on any topic/subtopic or the Queue" /> : (
              <div className="table-wrap">
                <table className="tbl">
                  <thead><tr><th>Item</th><th>Where</th><th>R</th><th>Confidence</th><th>When</th></tr></thead>
                  <tbody>
                    {logs.map((l) => {
                      const t = titleForProgress(l.itemId);
                      return (
                        <tr key={l.id}>
                          <td style={{ fontWeight: 600 }}>{t}</td>
                          <td className="muted small">{pathLabel(l.itemId, 'subtopic')}</td>
                          <td><RChip count={l.revisionNumber} /></td>
                          <td><span className={`conf-dot c${l.confidence}`} /> {['', 'Low', 'Medium', 'High'][l.confidence]}</td>
                          <td className="num muted small">{new Date(l.revisedAt).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </Card>
      )}

      {tab === 'method' && (
        <div className="grid cols-2">
          <Card className="card-pad">
            <h2 style={{ marginBottom: 8 }}>The R1–R5 method</h2>
            <p className="small soft">Every completed subtopic enters a spaced repetition cycle. Each pass strengthens recall and expands the interval:</p>
            <div className="table-wrap" style={{ marginTop: 10 }}>
              <table className="tbl">
                <thead><tr><th>Pass</th><th>Base gap</th><th>Low recall</th><th>Medium</th><th>High</th></tr></thead>
                <tbody>
                  <tr><td><RChip count={1} /></td><td>3 days</td><td>1 day</td><td>3 days</td><td>4 days</td></tr>
                  <tr><td><RChip count={2} /></td><td>7 days</td><td>3 days</td><td>7 days</td><td>10 days</td></tr>
                  <tr><td><RChip count={3} /></td><td>21 days</td><td>10 days</td><td>21 days</td><td>31 days</td></tr>
                  <tr><td><RChip count={4} /></td><td>45 days</td><td>22 days</td><td>45 days</td><td>67 days</td></tr>
                  <tr><td><RChip count={5} /></td><td>45 days</td><td colSpan={3} className="muted">Mastered — stays available for maintenance</td></tr>
                </tbody>
              </table>
            </div>
          </Card>
          <Card className="card-pad">
            <h2 style={{ marginBottom: 8 }}>How to revise well</h2>
            <ul className="small soft" style={{ paddingLeft: 18, display: 'flex', flexDirection: 'column', gap: 8 }}>
              <li><b style={{ color: 'var(--text)' }}>Active recall first</b> — attempt to reconstruct the topic from memory before opening notes.</li>
              <li><b style={{ color: 'var(--text)' }}>Be honest with confidence</b> — low confidence shortens the loop and protects you from illusions of coverage.</li>
              <li><b style={{ color: 'var(--text)' }}>Pair revisions with PYQs</b> — after R2, attempt the topic's PYQs to convert recall into marks.</li>
              <li><b style={{ color: 'var(--text)' }}>Weekly sweep</b> — clear the overdue bucket every Sunday; overdue revisions compound like debt.</li>
              <li><b style={{ color: 'var(--text)' }}>Geography optional</b> — keep paper-specific diagrams in short notes; revise diagrams separately during R3+.</li>
            </ul>
          </Card>
        </div>
      )}

      {revItem && <ReviseModal item={revItem} onClose={() => setRevItem(null)} />}
    </>
  );
}

function titleForProgress(itemId: string): string {
  return syllabus.subtopicById.get(itemId)?.title ?? syllabus.topicById.get(itemId)?.title ?? syllabus.chapterById.get(itemId)?.title ?? itemId;
}

export function pathLabel(itemId: string, type: 'subtopic' | 'topic' | 'chapter'): string {
  const path = syllabus.pathOf(itemId, type);
  const parts = [path.paper?.title, path.subject?.title, path.chapter?.title, path.topic?.title].filter(Boolean) as string[];
  return parts.join(' › ');
}

function QueueList({ title, tone, items, onRevise, titleFor, emptyText }: {
  title: string; tone: string; items: ItemProgress[]; emptyText: string;
  onRevise: (i: { id: string; type: string; title: string }) => void;
  titleFor: (p: ItemProgress) => { title: string; type: string; path: string };
}) {
  return (
    <Card>
      <div className="card-head"><h3>{title}</h3><span className="hint">{items.length} items</span></div>
      <div className="card-pad" style={{ paddingTop: 10, display: 'flex', flexDirection: 'column', gap: 7 }}>
        {items.length === 0 && <p className="small muted">{emptyText}</p>}
        {items.slice(0, 40).map((p) => {
          const t = titleFor(p);
          return (
            <div key={p.itemId} className="row" style={{ gap: 10 }}>
              <RChip count={p.revisionCount} />
              <div className="grow" style={{ minWidth: 0 }}>
                <div className="small" style={{ fontWeight: 650, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.title}</div>
                <div className="tiny muted" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.path}</div>
              </div>
              <span className={`chip ${p.nextRevisionAt && todayKey(new Date(p.nextRevisionAt)) < todayKey() ? 'bad' : 'geo'}`}>
                {p.nextRevisionAt ? relDay(todayKey(new Date(p.nextRevisionAt))) : '—'}
              </span>
              <button className="btn sm geo" onClick={() => onRevise({ id: p.itemId, type: t.type, title: t.title })}>Revise</button>
            </div>
          );
        })}
        {items.length > 40 && <p className="tiny muted">+ {items.length - 40} more…</p>}
      </div>
    </Card>
  );
}

export { rLabel, formatDate };
