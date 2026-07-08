import type { MonthlyPoint, Severity } from '../api/types';

/**
 * Dependency-free inline-SVG charts. No charting library and no external assets —
 * keeps the bundle small and stays within a strict CSP. Colors come from the
 * shared severity/accent CSS variables so light and dark themes track the rest of
 * the app.
 */

const SEV_ORDER: Severity[] = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'];
const SEV_VAR: Record<Severity, string> = {
  CRITICAL: 'var(--sev-critical-fg)',
  HIGH: 'var(--sev-high-fg)',
  MEDIUM: 'var(--sev-medium-fg)',
  LOW: 'var(--sev-low-fg)',
};

/** Donut of OPEN issues by severity, with the total called out in the middle. */
export function SeverityDonut({ counts }: { counts: Record<Severity, number> }) {
  const total = SEV_ORDER.reduce((n, s) => n + counts[s], 0);
  const r = 52;
  const c = 2 * Math.PI * r;
  const stroke = 16;

  let offset = 0;
  const segments = SEV_ORDER.filter((s) => counts[s] > 0).map((s) => {
    const frac = counts[s] / total;
    const seg = { s, dash: frac * c, offset };
    offset += frac * c;
    return seg;
  });

  return (
    <div className="donut-wrap">
      <svg viewBox="0 0 140 140" className="donut" role="img"
        aria-label={`Open issues by severity, ${total} total`}>
        <g transform="translate(70,70) rotate(-90)">
          <circle r={r} fill="none" stroke="var(--line)" strokeWidth={stroke} />
          {total > 0 &&
            segments.map((seg) => (
              <circle
                key={seg.s}
                r={r}
                fill="none"
                stroke={SEV_VAR[seg.s]}
                strokeWidth={stroke}
                strokeDasharray={`${seg.dash} ${c - seg.dash}`}
                strokeDashoffset={-seg.offset}
              />
            ))}
        </g>
        <text x="70" y="66" className="donut-total">{total}</text>
        <text x="70" y="84" className="donut-label">issues</text>
      </svg>
      <ul className="donut-legend">
        {SEV_ORDER.map((s) => (
          <li key={s}>
            <span className="dot" style={{ background: SEV_VAR[s] }} aria-hidden="true" />
            <span className="lg-name">{s[0] + s.slice(1).toLowerCase()}</span>
            <span className="lg-num">{counts[s]}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Line chart of shipments created per month across the trend window. */
export function TrendChart({ points }: { points: MonthlyPoint[] }) {
  const W = 320;
  const H = 130;
  const padX = 8;
  const padY = 14;
  const max = Math.max(1, ...points.map((p) => p.count));
  const innerW = W - padX * 2;
  const innerH = H - padY * 2;

  const x = (i: number) =>
    points.length <= 1 ? padX : padX + (innerW * i) / (points.length - 1);
  const y = (v: number) => padY + innerH - (innerH * v) / max;

  const line = points.map((p, i) => `${x(i)},${y(p.count)}`).join(' ');
  const area = `${padX},${padY + innerH} ${line} ${padX + innerW},${padY + innerH}`;

  return (
    <div className="trend">
      <svg viewBox={`0 0 ${W} ${H + 18}`} className="trend-svg" role="img"
        aria-label="Shipments created per month">
        <polygon points={area} className="trend-area" />
        <polyline points={line} className="trend-line" />
        {points.map((p, i) => (
          <g key={p.month}>
            <circle cx={x(i)} cy={y(p.count)} r={3} className="trend-dot" />
            <text x={x(i)} y={H + 12} className="trend-x">{p.label}</text>
          </g>
        ))}
      </svg>
    </div>
  );
}
