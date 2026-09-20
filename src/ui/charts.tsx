/** Hand-rolled SVG charts — zero dependencies, theme-aware. */
import React from 'react';
import { WEEKDAY_LABELS, dateFromKey, fmtDuration, todayKey } from '../lib/date';

const GRID = 'var(--chart-grid)';

// ---------- Grouped column chart (weekly hours) ----------
export function ColumnsChart({ data, height = 180, unit = 'h', colors }: {
  data: { label: string; values: { name: string; value: number }[] }[];
  height?: number; unit?: string; colors?: string[];
}) {
  const palette = colors ?? ['var(--accent)', 'var(--geo)', 'var(--warn)'];
  const names = data[0]?.values.map((v) => v.name) ?? [];
  const max = Math.max(1, ...data.flatMap((d) => d.values.map((v) => v.value)));
  const W = 100; // percentage-based using flex bars instead for responsiveness
  return (
    <div>
      <div style={{ display: 'flex', gap: 14, marginBottom: 8 }}>
        {names.map((n, i) => (
          <span key={n} className="tiny soft" style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <span style={{ width: 9, height: 9, borderRadius: 3, background: palette[i % palette.length], display: 'inline-block' }} />
            {n}
          </span>
        ))}
      </div>
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, height }}>
        {data.map((d) => (
          <div key={d.label} className="grow" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5, minWidth: 0 }}>
            <div style={{ display: 'flex', gap: 3, alignItems: 'flex-end', height: height - 22, width: '100%', justifyContent: 'center' }}>
              {d.values.map((v, i) => (
                <div key={v.name} title={`${v.name}: ${v.value}${unit}`}
                  style={{
                    width: Math.max(10, 100 / (d.values.length + 1)) + '%',
                    maxWidth: 16,
                    height: `${Math.max(2, (v.value / max) * 100)}%`,
                    background: palette[i % palette.length],
                    borderRadius: 5,
                    opacity: 0.92,
                  }} />
              ))}
            </div>
            <span className="tiny muted">{d.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ---------- Multi-series line chart ----------
export function LineChart({ series, height = 190, yMax, yMin = 0, suffix = '', xLabels }: {
  series: { name: string; color: string; points: number[] }[];
  height?: number; yMax?: number; yMin?: number; suffix?: string; xLabels?: string[];
}) {
  const n = Math.max(...series.map((s) => s.points.length), 1);
  const max = yMax ?? Math.max(1, ...series.flatMap((s) => s.points));
  const min = yMin;
  const W = 600, H = height;
  const padL = 30, padR = 10, padT = 10, padB = 18;
  const iw = W - padL - padR, ih = H - padT - padB;
  const x = (i: number) => padL + (n === 1 ? iw / 2 : (i / (n - 1)) * iw);
  const y = (v: number) => padT + ih - ((v - min) / (max - min || 1)) * ih;
  const ticks = 4;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: 'auto', display: 'block' }}>
      {Array.from({ length: ticks + 1 }, (_, i) => {
        const v = min + ((max - min) / ticks) * i;
        return (
          <g key={i}>
            <line x1={padL} x2={W - padR} y1={y(v)} y2={y(v)} stroke={GRID} strokeWidth="1" />
            <text x={padL - 6} y={y(v) + 3} textAnchor="end" fontSize="9" fill="var(--text-faint)">{Math.round(v)}{suffix}</text>
          </g>
        );
      })}
      {series.map((s) => {
        const d = s.points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${x(i).toFixed(1)} ${y(p).toFixed(1)}`).join(' ');
        return (
          <g key={s.name}>
            <path d={d} fill="none" stroke={s.color} strokeWidth="2.2" strokeLinejoin="round" strokeLinecap="round" />
            {s.points.map((p, i) => <circle key={i} cx={x(i)} cy={y(p)} r="2.6" fill={s.color} />)}
          </g>
        );
      })}
      {xLabels && xLabels.map((l, i) =>
        i % Math.ceil(xLabels.length / 7) === 0 ? (
          <text key={i} x={x(i)} y={H - 4} textAnchor="middle" fontSize="9" fill="var(--text-faint)">{l}</text>
        ) : null
      )}
    </svg>
  );
}

// ---------- Horizontal bars (subject progress) ----------
export function HBars({ rows, tone }: { rows: { label: string; pct: number; hint?: string }[]; tone?: string }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {rows.map((r) => (
        <div key={r.label} className="row" style={{ gap: 12 }}>
          <span className="small soft" style={{ width: 170, flexShrink: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={r.label}>{r.label}</span>
          <div className="grow"><div className="bar"><div style={{ width: `${r.pct}%`, background: tone ?? 'var(--accent-strong)' }} /></div></div>
          <span className="tiny mono muted" style={{ width: 56, textAlign: 'right' }}>{r.pct}%{r.hint ? ` · ${r.hint}` : ''}</span>
        </div>
      ))}
    </div>
  );
}

// ---------- Donut ----------
export function Donut({ segments, size = 130, thickness = 14, centerLabel, centerSub }: {
  segments: { label: string; value: number; color: string }[]; size?: number; thickness?: number;
  centerLabel?: string; centerSub?: string;
}) {
  const total = segments.reduce((a, s) => a + s.value, 0);
  const r = (size - thickness) / 2;
  const c = 2 * Math.PI * r;
  let offset = 0;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
      <div style={{ position: 'relative', width: size, height: size, flexShrink: 0 }}>
        <svg width={size} height={size}>
          <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--surface-3)" strokeWidth={thickness} />
          {total > 0 && segments.map((s) => {
            const frac = s.value / total;
            const el = (
              <circle key={s.label} cx={size / 2} cy={size / 2} r={r} fill="none" stroke={s.color}
                strokeWidth={thickness} strokeDasharray={`${frac * c} ${c}`} strokeDashoffset={-offset * c}
                strokeLinecap="butt" transform={`rotate(-90 ${size / 2} ${size / 2})`} />
            );
            offset += frac;
            return el;
          })}
        </svg>
        <div style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', textAlign: 'center' }}>
          <div>
            <div style={{ fontWeight: 800, fontSize: 18 }}>{centerLabel}</div>
            {centerSub && <div className="tiny muted">{centerSub}</div>}
          </div>
        </div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {segments.map((s) => (
          <span key={s.label} className="tiny soft" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ width: 9, height: 9, borderRadius: 3, background: s.color, display: 'inline-block' }} />
            {s.label} · <b style={{ color: 'var(--text)' }}>{s.value}</b>
          </span>
        ))}
      </div>
    </div>
  );
}

// ---------- Study heatmap (last 26 weeks) ----------
export function Heatmap({ minutesByDay, weeks = 26 }: { minutesByDay: Map<string, number>; weeks?: number }) {
  const today = dateFromKey(todayKey());
  const end = new Date(today);
  end.setDate(end.getDate() + (6 - end.getDay())); // end of current week (Sat)
  const cells: { key: string; minutes: number }[] = [];
  const totalDays = weeks * 7;
  const start = new Date(end);
  start.setDate(start.getDate() - (totalDays - 1));
  for (let i = 0; i < totalDays; i++) {
    const d = new Date(start);
    d.setDate(d.getDate() + i);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    cells.push({ key, minutes: minutesByDay.get(key) ?? 0 });
  }
  const level = (m: number) => (m === 0 ? '' : m < 60 ? 'l1' : m < 150 ? 'l2' : m < 300 ? 'l3' : 'l4');
  const monthTicks: string[] = [];
  cells.forEach((c, i) => {
    if (i % 7 === 0) {
      const d = dateFromKey(c.key);
      if (d.getDate() <= 7) monthTicks.push(String(i));
    }
  });
  return (
    <div>
      <div className="heatmap">
        {cells.map((c) => (
          <div key={c.key} className={`hm-cell ${level(c.minutes)}`} title={`${c.key}: ${fmtDuration(c.minutes)}`} />
        ))}
      </div>
      <div className="row" style={{ justifyContent: 'space-between', marginTop: 6 }}>
        <span className="tiny muted">Last {weeks} weeks</span>
        <span className="row tiny muted" style={{ gap: 4 }}>
          Less
          <span className="hm-cell" /><span className="hm-cell l1" /><span className="hm-cell l2" /><span className="hm-cell l3" /><span className="hm-cell l4" />
          More
        </span>
      </div>
    </div>
  );
}

// ---------- Area sparkline ----------
export function Sparkline({ points, color = 'var(--accent)', height = 46, fill = true }: { points: number[]; color?: string; height?: number; fill?: boolean }) {
  const n = Math.max(points.length, 1);
  const max = Math.max(1, ...points);
  const W = 120, H = height;
  const x = (i: number) => (i / (n - 1 || 1)) * W;
  const y = (v: number) => H - 3 - (v / max) * (H - 8);
  const d = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${x(i).toFixed(1)} ${y(p).toFixed(1)}`).join(' ');
  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: 'auto', display: 'block' }} preserveAspectRatio="none">
      {fill && <path d={`${d} L ${W} ${H} L 0 ${H} Z`} fill={color} opacity="0.14" />}
      <path d={d} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

export { WEEKDAY_LABELS };
