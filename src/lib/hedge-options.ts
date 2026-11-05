import type { Hedge, PoolProject } from "./pools";

export interface HedgeOption { key: string; label: string; coin: string; price: number; apr: number; days: number; venue: string; fundingApr: number; feesPct: number; maxUsd?: number }

/** Calculator presets from live pools whose stake coin can be shorted (server-side). */
export function hedgeOptions(pools: PoolProject[], hedge: Record<string, Hedge>, prices: Record<string, number>, now: number): HedgeOption[] {
  const out: HedgeOption[] = [];
  for (const p of pools) for (const x of p.pools) {
    const h = hedge[x.stake]; const price = prices[x.stake];
    if (!h?.perps.length || !price || x.apr === undefined) continue;
    const best = h.perps.reduce((m, y) => (y.fundingApr > m.fundingApr ? y : m), h.perps[0]);
    const slip = h.spotDepthUsd ? 0.3 + 2 * (1000 / h.spotDepthUsd) : 1.5;
    out.push({
      key: `${p.id}:${x.stake}`, label: `${p.name} · ${x.stake} → ${p.token} (APR ${Math.round(x.apr)}%)`, coin: x.stake, price, apr: x.apr,
      days: Math.max(1, Math.round((p.end - now) / 86400_000)), venue: best.ex, fundingApr: +best.fundingApr.toFixed(1),
      feesPct: +(2 * Math.min(slip, 25) + 0.3).toFixed(2), maxUsd: x.maxStake ? x.maxStake * price : undefined,
    });
  }
  return out.sort((a, b) => b.apr - a.apr);
}
