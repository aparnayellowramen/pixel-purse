import type { MonthRecord } from "@/lib/domain/types";
import { monthLabel } from "@/lib/domain/month";

const short = (n: number) => (n >= 1000 ? (n / 1000).toFixed(1).replace(/\.0$/, "") + "k" : String(Math.round(n)));

export interface SpendColumn {
  label: string;
  spent: number;
  budget: number;
  current?: boolean;
}

/** Spending per month as bars, with each month's budget as a dashed line. */
export function SpendChart({ rows }: { rows: SpendColumn[] }) {
  const W = 340, H = 180, T = 24, B = 24, L = 6, R = 6;
  const max = Math.max(1, ...rows.map((r) => Math.max(r.spent, r.budget))) * 1.12;
  const cw = (W - L - R) / rows.length;
  const bw = Math.min(30, cw * 0.5);
  const y = (v: number) => T + (1 - v / max) * (H - T - B);
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="chart" role="img" aria-label="Spending per month compared with budget">
      <line x1={L} y1={H - B} x2={W - R} y2={H - B} className="axis" />
      {rows.map((r, i) => {
        const cx = L + cw * (i + 0.5);
        const top = y(r.spent);
        return (
          <g key={r.label}>
            <rect x={cx - bw / 2} y={top} width={bw} height={Math.max(0, H - B - top)} className={r.current ? "bar-cur" : r.spent > r.budget ? "bar-over" : "bar-ok"} />
            <line x1={cx - bw * 0.85} x2={cx + bw * 0.85} y1={y(r.budget)} y2={y(r.budget)} className="budget" />
            <text x={cx} y={Math.min(top, y(r.budget)) - 7} className="ct v">{short(r.spent)}</text>
            <text x={cx} y={H - 8} className="ct">{r.label}</text>
          </g>
        );
      })}
    </svg>
  );
}

/** Treasure chest total after each month, as a step line. */
export function SavingsChart({ history }: { history: MonthRecord[] }) {
  const W = 340, H = 130, T = 22, B = 22, L = 14, R = 14;
  let total = 0;
  const pts = history.map((h) => ({ label: monthLabel(h.key), v: (total += h.savedTo === "savings" ? h.saved : 0) }));
  const max = Math.max(1, ...pts.map((p) => p.v)) * 1.15;
  const n = pts.length;
  const x = (i: number) => (n === 1 ? W / 2 : L + ((W - L - R) * i) / (n - 1));
  const y = (v: number) => T + (1 - v / max) * (H - T - B);
  let d = `M ${x(0)} ${y(pts[0].v)}`;
  for (let i = 1; i < n; i++) d += ` H ${x(i)} V ${y(pts[i].v)}`;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="chart" role="img" aria-label="Treasure chest growth by month">
      <line x1={L} y1={H - B} x2={W - R} y2={H - B} className="axis" />
      <path d={`${d} V ${H - B} H ${x(0)} Z`} className="area" />
      <path d={d} className="step" />
      {pts.map((p, i) => (
        <g key={p.label + i}>
          <rect x={x(i) - 4} y={y(p.v) - 4} width={8} height={8} className="dot" />
          <text x={x(i)} y={y(p.v) - 9} className="ct v">{short(p.v)}</text>
          <text x={x(i)} y={H - 7} className="ct">{p.label}</text>
        </g>
      ))}
    </svg>
  );
}
