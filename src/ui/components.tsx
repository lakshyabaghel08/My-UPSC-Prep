/** Shared UI primitives. */
import React from 'react';

export function Card({ children, className = '', style }: { children: React.ReactNode; className?: string; style?: React.CSSProperties }) {
  return <div className={`card ${className}`} style={style}>{children}</div>;
}

export function CardHead({ title, icon, hint, right }: { title: string; icon?: string; hint?: string; right?: React.ReactNode }) {
  return (
    <div className="card-head">
      <div className="row" style={{ gap: 9 }}>
        {icon && <span className="stat-ico" style={{ width: 26, height: 26, fontSize: 13 }}>{icon}</span>}
        <div>
          <h3>{title}</h3>
          {hint && <div className="hint">{hint}</div>}
        </div>
      </div>
      {right}
    </div>
  );
}

export function Modal({ open, onClose, title, children, footer, wide }: {
  open: boolean; onClose: () => void; title: React.ReactNode;
  children: React.ReactNode; footer?: React.ReactNode; wide?: boolean;
}) {
  if (!open) return null;
  return (
    <div className="overlay" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className={`modal ${wide ? 'wide' : ''}`}>
        <div className="modal-head">
          <h2>{title}</h2>
          <button className="icon-btn" onClick={onClose} aria-label="Close">✕</button>
        </div>
        <div className="modal-body">{children}</div>
        {footer && <div className="modal-foot">{footer}</div>}
      </div>
    </div>
  );
}

export function Confirm({ open, onClose, onConfirm, title, body, confirmLabel = 'Delete' }: {
  open: boolean; onClose: () => void; onConfirm: () => void; title: string; body: string; confirmLabel?: string;
}) {
  return (
    <Modal open={open} onClose={onClose} title={title} footer={
      <>
        <button className="btn ghost" onClick={onClose}>Cancel</button>
        <button className="btn bad" onClick={() => { onConfirm(); onClose(); }}>{confirmLabel}</button>
      </>
    }>
      <p className="soft">{body}</p>
    </Modal>
  );
}

export function Empty({ icon = '📋', title, hint, action }: { icon?: string; title: string; hint?: string; action?: React.ReactNode }) {
  return (
    <div className="empty">
      <div className="big">{icon}</div>
      <div className="title">{title}</div>
      {hint && <div className="small">{hint}</div>}
      {action}
    </div>
  );
}

export function Bar({ value, tone = 'accent', thin }: { value: number; tone?: 'accent' | 'ok' | 'warn' | 'bad' | 'geo'; thin?: boolean }) {
  return (
    <div className={`bar ${tone === 'accent' ? '' : tone} ${thin ? 'thin' : ''}`}>
      <div style={{ width: `${Math.max(0, Math.min(100, value))}%` }} />
    </div>
  );
}

export function Seg<T extends string>({ options, value, onChange }: { options: { value: T; label: string }[]; value: T; onChange: (v: T) => void }) {
  return (
    <div className="seg">
      {options.map((o) => (
        <button key={o.value} className={o.value === value ? 'active' : ''} onClick={() => onChange(o.value)}>{o.label}</button>
      ))}
    </div>
  );
}

export function RChip({ count }: { count: number }) {
  if (count <= 0) return <span className="chip">R0</span>;
  return <span className={`r-chip r${Math.min(count, 5)}`}>R{Math.min(count, 5)}</span>;
}

export function Field({ label, children, className = '' }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={`field ${className}`}>
      <label>{label}</label>
      {children}
    </div>
  );
}

export function StatusChip({ status }: { status: string }) {
  if (status === 'completed') return <span className="chip ok">● Completed</span>;
  if (status === 'in_progress') return <span className="chip info">◐ In Progress</span>;
  return <span className="chip">○ To Do</span>;
}

export function todayInput(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
