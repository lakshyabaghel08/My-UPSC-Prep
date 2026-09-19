/** App shell: sidebar navigation + topbar. */
import React, { useEffect, useState } from 'react';
import { navigate, useRoute } from './router';
import { useStore } from '../store/store';
import { dashboardStats } from '../store/selectors';
import { downloadBackup } from '../store/db';
import { useToast } from './toast';

const NAV: { section: string; items: { to: string; icon: string; label: string; badge?: 'revision' | 'tasks' }[] }[] = [
  {
    section: 'Overview',
    items: [
      { to: '/dashboard', icon: '◉', label: 'Dashboard' },
      { to: '/calendar', icon: '▦', label: 'Calendar' },
    ],
  },
  {
    section: 'Syllabus & Memory',
    items: [
      { to: '/syllabus', icon: '☰', label: 'Operational Syllabus' },
      { to: '/revision', icon: '↻', label: 'Revision R1–R5', badge: 'revision' },
      { to: '/pyq', icon: '?', label: 'PYQ Tracker' },
    ],
  },
  {
    section: 'Daily Practice',
    items: [
      { to: '/tasks', icon: '✓', label: 'Daily Planner', badge: 'tasks' },
      { to: '/timer', icon: '⏱', label: 'Study Timer' },
      { to: '/tests', icon: 'A', label: 'Test Tracker' },
      { to: '/answers', icon: '✎', label: 'Answer Writing' },
      { to: '/current-affairs', icon: '☾', label: 'Current Affairs' },
      { to: '/lectures', icon: '▶', label: 'Geo Lectures' },
    ],
  },
  {
    section: 'Insights',
    items: [
      { to: '/hours', icon: '▥', label: 'Study Hours' },
      { to: '/analytics', icon: '◭', label: 'Prep Analytics' },
    ],
  },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const [route, navigateTo] = useRoute();
  const { db, updateSettings } = useStore();
  const { push } = useToast();
  const [open, setOpen] = useState(false);
  const stats = dashboardStats(db);

  useEffect(() => { setOpen(false); }, [route]);

  const theme = db.settings.theme;
  const toggleTheme = () => {
    const next = theme === 'dark' ? 'light' : 'dark';
    updateSettings({ theme: next });
    document.documentElement.dataset.theme = next;
    try { localStorage.setItem('mup.theme', next); } catch { /* ignore */ }
  };

  const badge = (b?: 'revision' | 'tasks') => {
    if (!b) return null;
    if (b === 'revision') {
      const n = stats.revision.dueToday + stats.revision.overdue;
      return n > 0 ? <span className="nav-badge">{n}</span> : null;
    }
    const n = stats.tasks.today - stats.tasks.done;
    return n > 0 ? <span className="nav-badge neutral">{n}</span> : null;
  };

  const titleFor = (r: string) => NAV.flatMap((s) => s.items).find((i) => i.to === r)?.label ?? 'Dashboard';

  return (
    <div className="shell">
      {open && <div className="sidebar-backdrop show" onClick={() => setOpen(false)} />}
      <aside className={`sidebar ${open ? 'open' : ''}`}>
        <div className="brand">
          <div className="brand-mark">M</div>
          <div>
            <div>My UPSC Prep</div>
            <div className="brand-sub">CSE {db.settings.targetExamYear} · {db.settings.optional}</div>
          </div>
        </div>
        {NAV.map((sec) => (
          <React.Fragment key={sec.section}>
            <div className="nav-section">{sec.section}</div>
            <nav className="nav">
              {sec.items.map((item) => (
                <button key={item.to} className={`nav-item ${route === item.to ? 'active' : ''}`} onClick={() => navigateTo(item.to)}>
                  <span className="ico">{item.icon}</span>
                  {item.label}
                  {badge(item.badge)}
                </button>
              ))}
            </nav>
          </React.Fragment>
        ))}
        <div className="nav-section">System</div>
        <nav className="nav" style={{ paddingBottom: 6 }}>
          <button className={`nav-item ${route === '/settings' ? 'active' : ''}`} onClick={() => navigateTo('/settings')}>
            <span className="ico">⚙</span>Settings & Backup
          </button>
        </nav>
        <div className="sidebar-foot">
          <div className="card card-pad" style={{ padding: '10px 12px' }}>
            <div className="row" style={{ justifyContent: 'space-between' }}>
              <span className="tiny" style={{ fontWeight: 700, color: 'var(--text-faint)', letterSpacing: '0.06em' }}>TODAY</span>
              <span className="tiny mono" style={{ fontWeight: 700, color: 'var(--ok)' }}>{Math.round(stats.todayMinutes)}m / {Math.round(db.settings.dailyTargetMinutes / 60 * 100) / 100}h</span>
            </div>
            <div className="bar ok thin" style={{ marginTop: 6 }}>
              <div style={{ width: `${Math.min(100, (stats.todayMinutes / db.settings.dailyTargetMinutes) * 100)}%` }} />
            </div>
            <div className="tiny muted" style={{ marginTop: 6 }}>🔥 {stats.streak}-day streak · {stats.revision.dueToday} revisions due</div>
          </div>
          <div className="row" style={{ marginTop: 8, gap: 6 }}>
            <button className="btn sm ghost grow" onClick={toggleTheme} title="Toggle theme">{theme === 'dark' ? '☾ Dark' : '☀ Light'}</button>
            <button className="btn sm ghost" onClick={() => { downloadBackup(db); push('Backup downloaded', 'ok'); }} title="Download backup">⤓</button>
          </div>
        </div>
      </aside>
      <div className="main">
        <header className="topbar">
          <button className="icon-btn menu-btn" onClick={() => setOpen(true)} aria-label="Menu">☰</button>
          <span className="crumb">{titleFor(route)}</span>
          <span className="spacer" />
          <span className="tiny muted mono">{new Date().toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}</span>
          <button className="icon-btn" onClick={toggleTheme} aria-label="Toggle theme">{theme === 'dark' ? '☀' : '☾'}</button>
        </header>
        <main className="page">{children}</main>
      </div>
    </div>
  );
}
