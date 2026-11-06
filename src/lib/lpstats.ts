import type { PoolProject, PoolsData } from "./pools";
import { isStable } from "./pools";

/**
 * Launchpool statistics for the history page:
 *  - "drop" — how APR of live pools changed since we first saw it (our 30-min snapshots) and since launch (Gate's estimate);
 *  - "past" — every pool that started in the last 90 days (exchange archives), with per-exchange / per-month aggregates.
 */
export interface Snap { t: number; pools?: Record<string, { name: string; apr: number }> }
export interface DropRow { key: string; name: string; exchange: string; first: number; firstT: number; now: number; change: number; launch?: number; points: Array<[number, number]> }
export interface PastRow { id: string; exchange: string; token: string; stake: string; start: number; end: number; aprStart?: number; apr?: number; rewardUsd?: number; stable: boolean }
export interface ExStat { exchange: string; pools: number; projects: number; medStable?: number; medOther?: number; avgDays: number; rewardUsd: number }
export interface MonthStat { month: string; t: number; pools: number; byEx: Record<string, number>; medApr?: number }
/** Typical APR curve: median APR as a share of the starting APR, N hours after the pool opened. */
export interface CurvePoint { h: number; ratio?: number; n: number }
export const CURVE_HOURS = [6, 12, 24, 48, 72, 168];

export function decayCurve(data: PoolsData, snaps: Snap[]): CurvePoint[] {
  const proj = new Map<string, { start: number; aprStart?: number }>();
  for (const p of data.projects) for (const x of p.pools) proj.set(`${p.exchange}:${p.id}:${x.stake}`, { start: p.start, aprStart: x.aprStart });
  const per = new Map<number, number[]>(CURVE_HOURS.map((h) => [h, []]));
  const keys = new Set(snaps.flatMap((s) => Object.keys(s.pools ?? {})));
  for (const key of keys) {
    const meta = proj.get(key);
    if (!meta) continue;
    const pts = snaps.filter((s) => s.pools?.[key]?.apr).map((s) => [(s.t - meta.start) / 3600_000, s.pools![key].apr] as [number, number]);
    if (pts.length < 2) continue;
    // base = the exchange's launch estimate, or our first snapshot if we saw the pool within 2 h of opening
    const base = meta.aprStart ?? (pts[0][0] <= 2 ? pts[0][1] : undefined);
    if (!base) continue;
    for (const h of CURVE_HOURS) {
      const p = pts.find(([t]) => Math.abs(t - h) <= Math.max(1, h * 0.15));   // a snapshot close to that hour
      if (p) per.get(h)!.push(p[1] / base);
    }
  }
  return CURVE_HOURS.map((h) => { const xs = per.get(h)!; return { h, n: xs.length, ratio: xs.length >= 2 ? median(xs) : undefined }; });
}

export interface LpStats {
  drop: DropRow[];
  past: PastRow[]; byEx: ExStat[]; byMonth: MonthStat[];
  totals: { projects: number; pools: number; exchanges: number; medStable?: number; medOther?: number; medDays?: number; rewardUsd: number; medDecay?: number };
}

const DAY = 86400_000;
export const median = (xs: number[]) => { const s = xs.filter(Number.isFinite).sort((a, b) => a - b); if (!s.length) return undefined; const m = s.length >> 1; return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; };

export function lpStats(data: PoolsData, snaps: Snap[], now = data.fetchedAt): LpStats {
  // ---- live pools: change since first snapshot (and since launch estimate when the exchange gives one)
  const live = new Map<string, { p: PoolProject; aprStart?: number }>();
  for (const p of data.projects) if (p.status === "live") for (const x of p.pools) live.set(`${p.exchange}:${p.id}:${x.stake}`, { p, aprStart: x.aprStart });
  const drop: DropRow[] = [];
  const keys = new Set(snaps.flatMap((s) => Object.keys(s.pools ?? {})));
  for (const key of keys) {
    const pts = snaps.filter((s) => s.pools?.[key]).map((s) => [s.t, s.pools![key].apr] as [number, number]).filter(([, v]) => v > 0);
    if (pts.length < 2 || !live.has(key)) continue;
    const [firstT, first] = pts[0], last = pts[pts.length - 1][1];
    const name = snaps.filter((s) => s.pools?.[key]).at(-1)!.pools![key].name;
    drop.push({ key, name, exchange: key.split(":")[0], first, firstT, now: last, change: (last / first - 1) * 100, launch: live.get(key)?.aprStart,
      points: pts.map(([t, v]) => [t, (v / first - 1) * 100]) });
  }
  drop.sort((a, b) => a.change - b.change);

  // ---- past 90 days
  const past: PastRow[] = data.projects.filter((p) => p.start >= now - 90 * DAY && p.start <= now)
    .flatMap((p) => p.pools.map((x) => ({ id: `${p.id}:${x.stake}`, exchange: p.exchange, token: p.token, stake: x.stake, start: p.start, end: p.end,
      aprStart: x.aprStart, apr: x.apr, rewardUsd: p.pools.length ? (p.rewardUsd ?? 0) / p.pools.length : undefined, stable: isStable(x.stake) })))
    .sort((a, b) => b.start - a.start);
  const projOf = (rows: PastRow[]) => new Set(rows.map((r) => r.id.split(":").slice(0, 2).join(":"))).size;
  const exs = [...new Set(past.map((r) => r.exchange))];
  const byEx: ExStat[] = exs.map((exchange) => {
    const rows = past.filter((r) => r.exchange === exchange);
    return {
      exchange, pools: rows.length, projects: projOf(rows),
      medStable: median(rows.filter((r) => r.stable && r.apr).map((r) => r.apr!)), medOther: median(rows.filter((r) => !r.stable && r.apr).map((r) => r.apr!)),
      avgDays: rows.reduce((s, r) => s + (r.end - r.start) / DAY, 0) / rows.length,
      rewardUsd: rows.reduce((s, r) => s + (r.rewardUsd ?? 0), 0),
    };
  }).sort((a, b) => b.pools - a.pools);
  const months = new Map<string, MonthStat>();
  const monthOf = (t: number) => { const d = new Date(t); return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`; };
  for (const r of past) {
    const d = new Date(r.start), key = monthOf(r.start);
    const m = months.get(key) ?? { month: key, t: Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1), pools: 0, byEx: {} };
    m.pools++; m.byEx[r.exchange] = (m.byEx[r.exchange] ?? 0) + 1;
    months.set(key, m);
  }
  const byMonth = [...months.values()].sort((a, b) => a.t - b.t).map((m) => ({ ...m, medApr: median(past.filter((r) => monthOf(r.start) === m.month && r.apr).map((r) => r.apr!)) }));
  return {
    drop, past, byEx, byMonth,
    totals: {
      projects: projOf(past), pools: past.length, exchanges: exs.length,
      medStable: median(past.filter((r) => r.stable && r.apr).map((r) => r.apr!)), medOther: median(past.filter((r) => !r.stable && r.apr).map((r) => r.apr!)),
      medDays: median(past.map((r) => (r.end - r.start) / DAY)), rewardUsd: past.reduce((s, r) => s + (r.rewardUsd ?? 0), 0),
      medDecay: median(past.filter((r) => r.aprStart && r.apr && r.end < now).map((r) => r.apr! / r.aprStart!)),
    },
  };
}
