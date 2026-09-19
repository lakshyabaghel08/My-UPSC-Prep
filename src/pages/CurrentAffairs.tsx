/** Current Affairs Tracker — daily capture with subject categories, relevance and revision flags. */
import React, { useMemo, useState } from 'react';
import { useStore } from '../store/store';
import { Card, Empty, Modal, Field, Confirm } from '../ui/components';
import { useToast } from '../ui/toast';
import type { CurrentAffairItem } from '../types';
import { todayKey, dateFromKey, formatDate } from '../lib/date';

const CATEGORIES: CurrentAffairItem['category'][] = ['Polity', 'Economy', 'Environment', 'S&T', 'IR', 'Geography', 'Society', 'Security', 'Art & Culture', 'Other'];
const CAT_ICON: Record<string, string> = {
  Polity: '⚖️', Economy: '📈', Environment: '🌿', 'S&T': '🔬', IR: '🌍', Geography: '🗺️', Society: '👥', Security: '🛡️', 'Art & Culture': '🏛️', Other: '📌',
};

export function CurrentAffairs() {
  const { db, addCurrentAffair, updateCurrentAffair, deleteCurrentAffair } = useStore();
  const { push } = useToast();
  const [showAdd, setShowAdd] = useState(false);
  const [deleting, setDeleting] = useState<CurrentAffairItem | null>(null);
  const [catFilter, setCatFilter] = useState('all');
  const [relFilter, setRelFilter] = useState('all');
  const [query, setQuery] = useState('');

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return [...db.currentAffairs]
      .sort((a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt))
      .filter((c) => (catFilter === 'all' ? true : c.category === catFilter))
      .filter((c) => (relFilter === 'all' ? true : c.relevance === relFilter || (relFilter === 'prelims+mains' && c.relevance === 'both')))
      .filter((c) => !q || c.title.toLowerCase().includes(q) || c.summary.toLowerCase().includes(q));
  }, [db.currentAffairs, catFilter, relFilter, query]);

  const byDate = useMemo(() => {
    const m = new Map<string, CurrentAffairItem[]>();
    for (const c of filtered) {
      const arr = m.get(c.date) ?? [];
      arr.push(c);
      m.set(c.date, arr);
    }
    return [...m.entries()];
  }, [filtered]);

  const unrev = db.currentAffairs.filter((c) => !c.revised).length;

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Current Affairs</h1>
          <div className="sub">{db.currentAffairs.length} items captured · {unrev} not revised · grouped by day</div>
        </div>
        <button className="btn primary" onClick={() => setShowAdd(true)}>+ Capture item</button>
      </div>

      <div className="filters">
        <input className="input input-sm" style={{ width: 240 }} placeholder="Search items…" value={query} onChange={(e) => setQuery(e.target.value)} />
        <select className="input input-sm" value={catFilter} onChange={(e) => setCatFilter(e.target.value)}>
          <option value="all">All subjects</option>
          {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
        </select>
        <select className="input input-sm" value={relFilter} onChange={(e) => setRelFilter(e.target.value)}>
          <option value="all">All relevance</option>
          <option value="prelims">Prelims</option>
          <option value="mains">Mains</option>
          <option value="prelims+mains">Both</option>
        </select>
      </div>

      {db.currentAffairs.length === 0 ? (
        <Card><Empty icon="☾" title="No current affairs captured" hint="Log 5–8 items daily from The Hindu / PIB / Down To Earth with one-line summaries"
          action={<button className="btn primary" onClick={() => setShowAdd(true)}>+ Capture your first item</button>} /></Card>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {byDate.map(([date, items]) => (
            <Card key={date}>
              <div className="card-head">
                <h3>{date === todayKey() ? 'Today' : formatDate(date)}</h3>
                <span className="hint">{items.length} items</span>
              </div>
              <div className="card-pad" style={{ paddingTop: 10, display: 'flex', flexDirection: 'column', gap: 8 }}>
                {items.map((c) => (
                  <div key={c.id} className="task-item">
                    <span style={{ fontSize: 16, flexShrink: 0 }}>{CAT_ICON[c.category]}</span>
                    <div className="grow" style={{ minWidth: 0 }}>
                      <div className="small" style={{ fontWeight: 650 }}>{c.title}</div>
                      {c.summary && <div className="tiny soft" style={{ marginTop: 2 }}>{c.summary}</div>}
                      <div className="t-meta">
                        <span className="chip">{c.category}</span>
                        {c.source && <span className="chip">{c.source}</span>}
                        {c.relevance !== 'none' && <span className={`chip ${c.relevance === 'both' ? 'accent' : c.relevance === 'prelims' ? 'info' : 'geo'}`}>{c.relevance === 'both' ? 'P + M' : c.relevance}</span>}
                        <button className={`chip click ${c.revised ? 'ok' : ''}`} onClick={() => updateCurrentAffair(c.id, { revised: !c.revised, revisionCount: c.revised ? c.revisionCount : c.revisionCount + 1 })}>
                          {c.revised ? `✓ Revised ×${c.revisionCount}` : 'Mark revised'}
                        </button>
                      </div>
                    </div>
                    <div className="t-actions">
                      <button className="icon-btn" style={{ width: 27, height: 27, fontSize: 12 }} title="Delete" onClick={() => setDeleting(c)}>🗑</button>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          ))}
        </div>
      )}

      <CAForm open={showAdd} onClose={() => setShowAdd(false)} onSave={(c) => { addCurrentAffair(c); push('Captured 📌', 'ok'); }} />
      <Confirm open={!!deleting} onClose={() => setDeleting(null)} onConfirm={() => deleting && deleteCurrentAffair(deleting.id)} title="Delete item?" body="This current affairs entry will be removed." />
    </>
  );
}

function CAForm({ open, onClose, onSave }: { open: boolean; onClose: () => void; onSave: (c: Partial<CurrentAffairItem> & { title: string }) => void }) {
  const [title, setTitle] = useState('');
  const [date, setDate] = useState(todayKey());
  const [source, setSource] = useState('');
  const [category, setCategory] = useState<CurrentAffairItem['category']>('Polity');
  const [summary, setSummary] = useState('');
  const [relevance, setRelevance] = useState<CurrentAffairItem['relevance']>('both');

  const submit = () => {
    if (!title.trim()) return;
    onSave({ title: title.trim(), date, source, category, summary, relevance });
    setTitle(''); setSummary('');
    onClose();
  };

  return (
    <Modal open={open} onClose={onClose} title="Capture current affairs item" wide footer={
      <>
        <button className="btn ghost" onClick={onClose}>Cancel</button>
        <button className="btn primary" onClick={submit}>Save</button>
      </>
    }>
      <Field label="Headline"><input className="input" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Great Indian Bustard recovery plan approved" autoFocus /></Field>
      <div className="form-grid">
        <Field label="Date"><input type="date" className="input" value={date} onChange={(e) => setDate(e.target.value)} /></Field>
        <Field label="Source"><input className="input" value={source} onChange={(e) => setSource(e.target.value)} placeholder="The Hindu / PIB / Down To Earth…" /></Field>
        <Field label="Subject">
          <select className="input" value={category} onChange={(e) => setCategory(e.target.value as CurrentAffairItem['category'])}>
            {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
          </select>
        </Field>
        <Field label="Relevance">
          <select className="input" value={relevance} onChange={(e) => setRelevance(e.target.value as CurrentAffairItem['relevance'])}>
            <option value="both">Prelims + Mains</option>
            <option value="prelims">Prelims only</option>
            <option value="mains">Mains only</option>
            <option value="none">General reading</option>
          </select>
        </Field>
      </div>
      <Field label="One-line summary + why it matters"><textarea className="input" value={summary} onChange={(e) => setSummary(e.target.value)} placeholder="Facts, data points, link to static syllabus…" /></Field>
    </Modal>
  );
}

export { dateFromKey };
