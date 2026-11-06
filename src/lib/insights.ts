import { cached, getJson } from "./sources/util";
import { getPools, isStable, type PoolProject } from "./pools";

/**
 * Launchpool analytics from our own data:
 *  - how reward tokens traded after the pool (Gate daily candles: first close after pool start → +7d, +30d, now);
 *  - how APR decays (Gate's launch estimate `maybe_year_rate` vs the final `rate_year` of finished pools).
 */
export interface AfterRow { token: string; exchange: PoolProject["exchange"]; start: number; d0: number; d7?: number; d30?: number; now: number }
export interface DecayRow { name: string; stake: string; start: number; final: number }
export interface Insights { after: AfterRow[]; decay: DecayRow[]; median: { d7?: number; d30?: number; now?: number }; decayMedian?: number; fetchedAt: number }

const DAY = 86400_000;
const median = (xs: number[]) => { if (!xs.length) return undefined; const s = [...xs].sort((a, b) => a - b); const m = s.length >> 1; return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; };

/** Gate candle: [t(s), quoteVol, close, high, low, open, baseVol, closed] */
async function candles(token: string, from: number): Promise<Array<[number, number]>> {
  return cached(`gate-1d:${token}:${Math.floor(from / DAY)}`, 6 * 3600_000, async () => {
    const j = await getJson<any[]>(`https://api.gateio.ws/api/v4/spot/candlesticks?currency_pair=${token}_USDT&interval=1d&from=${Math.floor(from / 1000)}&to=${Math.floor(Date.now() / 1000)}`, 15_000);
    return (Array.isArray(j) ? j : []).map((c) => [Number(c[0]) * 1000, Number(c[2])] as [number, number]).filter(([, p]) => p > 0);
  });
}

export async function getInsights(): Promise<Insights> {
  const { projects, fetchedAt } = await getPools();
  // one row per token: its earliest pool in the last ~8 months
  const seen = new Set<string>();
  const ended = projects.filter((p) => p.status === "ended" && fetchedAt - p.start < 240 * DAY && !isStable(p.token)).sort((a, b) => a.start - b.start)
    .filter((p) => !seen.has(p.token) && seen.add(p.token)).slice(-45);
  const after: AfterRow[] = [];
  const res = await Promise.allSettled(ended.map((p) => candles(p.token, p.start - DAY)));
  res.forEach((r, i) => {
    if (r.status !== "fulfilled" || r.value.length < 2) return;
    const p = ended[i], cs = r.value;
    const first = cs.find(([t]) => t + DAY > p.start);
    if (!first) return;
    const at = (days: number) => cs.find(([t]) => t >= first[0] + days * DAY)?.[1];
    after.push({ token: p.token, exchange: p.exchange, start: p.start, d0: first[1], d7: at(7), d30: at(30), now: cs[cs.length - 1][1] });
  });
  after.sort((a, b) => b.start - a.start);
  const ch = (x: number | undefined, base: number) => (x === undefined ? undefined : (x / base - 1) * 100);
  const med = {
    d7: median(after.map((a) => ch(a.d7, a.d0)).filter((x): x is number => x !== undefined)),
    d30: median(after.map((a) => ch(a.d30, a.d0)).filter((x): x is number => x !== undefined)),
    now: median(after.map((a) => ch(a.now, a.d0)!)),
  };

  const decay: DecayRow[] = projects.filter((p) => p.exchange === "gate" && p.status === "ended")
    .flatMap((p) => p.pools.filter((x) => (x.aprStart ?? 0) > 0 && (x.apr ?? 0) > 0).map((x) => ({ name: p.name, stake: x.stake, start: x.aprStart!, final: x.apr! })))
    .slice(0, 40);
  return { after, decay, median: med, decayMedian: median(decay.map((d) => d.final / d.start)), fetchedAt };
}
