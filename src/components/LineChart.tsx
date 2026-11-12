/** Minimal multi-series SVG line chart (server-rendered, theme-aware via CSS variables). */
export interface Series { name: string; color: string; points: Array<[number, number]> } // [time ms, value]

const PALETTE = ["#c8ff3d", "#3de0c8", "#5ab8ff", "#ffb547", "#a38bff", "#ff6b8b", "#7ee787", "#f2c67c"];
export const seriesColor = (i: number) => PALETTE[i % PALETTE.length];

export function LineChart({ series, height = 220, unit = "%", locale = "uk-UA", signed = false, legend = true, kind = "pct" }: { series: Series[]; height?: number; unit?: string; locale?: string; signed?: boolean; legend?: boolean; kind?: "pct" | "num" | "usd" }) {
  const all = series.flatMap((s) => s.points);
  if (all.length < 2) return null;
  const W = 720, H = height, L = 60, R = 12, Tp = 12, B = 26;
  const xs = all.map((p) => p[0]), ys = all.map((p) => p[1]);
  const x0 = Math.min(...xs), x1 = Math.max(...xs);
  let y0 = Math.min(...ys), y1 = Math.max(...ys);
  if (y1 - y0 < 0.5) { y0 -= 0.5; y1 += 0.5; }
  const pad = (y1 - y0) * 0.08; y0 = signed ? Math.max(-100, Math.min(0, y0 - pad)) : Math.max(0, y0 - pad); y1 = signed ? Math.max(0, y1 + pad) : y1 + pad;   // signed: change in % (can be negative), 0 always visible
  const X = (t: number) => L + ((t - x0) / Math.max(1, x1 - x0)) * (W - L - R);
  const Y = (v: number) => Tp + (1 - (v - y0) / (y1 - y0)) * (H - Tp - B);
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((k) => y0 + (y1 - y0) * k);
  const short = (v: number) => { const a = Math.abs(v); return a >= 1e9 ? `${+(v / 1e9).toFixed(1)}B` : a >= 1e6 ? `${+(v / 1e6).toFixed(1)}M` : a >= 1e3 ? `${+(v / 1e3).toFixed(1)}K` : `${Math.round(v)}`; };
  const fmt = (v: number) => {
    if (kind !== "pct") return `${kind === "usd" ? "$" : ""}${short(v)}`;
    const a = Math.abs(v), s = a >= 100 ? Math.round(v).toString() : a >= 10 ? v.toFixed(1) : v.toFixed(signed ? 1 : 2); return signed && v > 0 ? `+${s}` : s;
  };
  if (kind !== "pct") unit = "";
  const dates = [x0, x0 + (x1 - x0) / 2, x1];
  return (
    <figure>
      <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" role="img" aria-label={series.map((s) => s.name).join(", ")}>
        {ticks.map((v) => (
          <g key={v}>
            <line x1={L} x2={W - R} y1={Y(v)} y2={Y(v)} stroke="rgb(255 255 255 / 0.07)" />
            <text x={L - 6} y={Y(v) + 4} textAnchor="end" fontSize="12" fill="var(--color-ink-3)" fontFamily="var(--font-mono)">{fmt(v)}{unit}</text>
          </g>
        ))}
        {signed && <line x1={L} x2={W - R} y1={Y(0)} y2={Y(0)} stroke="rgb(255 255 255 / 0.35)" strokeDasharray="4 4" />}
        {dates.map((t, i) => (
          <text key={t} x={X(t)} y={H - 6} textAnchor={i === 0 ? "start" : i === 2 ? "end" : "middle"} fontSize="12" fill="var(--color-ink-3)">
            {new Date(t).toLocaleString(locale, { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "UTC" })}
          </text>
        ))}
        {series.map((s) => (
          <polyline key={s.name} fill="none" stroke={s.color} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round"
            points={s.points.map(([t, v]) => `${X(t).toFixed(1)},${Y(v).toFixed(1)}`).join(" ")} />
        ))}
      </svg>
      {legend && <figcaption className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs font-semibold text-ink-2">
        {series.map((s) => {
          const last = s.points[s.points.length - 1]?.[1];
          return <span key={s.name} className="flex items-center gap-1.5"><span className="size-2.5 rounded-full" style={{ background: s.color }} />{s.name}{last !== undefined && <span className="font-mono text-ink-3">{fmt(last)}{unit}</span>}</span>;
        })}
      </figcaption>}
    </figure>
  );
}
