import type { Hedge } from "./pools";   // type only: this file also runs in the browser (DexBoard)

/**
 * Price hedge for a DeFi pool (audit 12.11): which coins of the pool move in price, what share of the deposit each
 * one is, and the yield after shorting that share on the exchange with the best funding.
 *  - a 2-coin LP is ~50/50, so each volatile coin is half of the money; a single-asset pool is 100% of it
 *  - wrapped / staked versions are hedged with the base coin's futures (WETH, stETH → ETH; WBTC, cbBTC → BTC …)
 *  - the hedge is set once at entry: it removes the price direction, not impermanent loss when prices move far
 */
const BASE: Record<string, string> = {
  WETH: "ETH", STETH: "ETH", WSTETH: "ETH", WEETH: "ETH", EZETH: "ETH", RSETH: "ETH", CBETH: "ETH", RETH: "ETH", METH: "ETH", OSETH: "ETH",
  WBTC: "BTC", CBBTC: "BTC", TBTC: "BTC", LBTC: "BTC", SOLVBTC: "BTC", BTCB: "BTC", FBTC: "BTC",
  WSOL: "SOL", JITOSOL: "SOL", MSOL: "SOL", JUPSOL: "SOL", BNSOL: "SOL", WBNB: "BNB", WAVAX: "AVAX", SAVAX: "AVAX",
  WPOL: "POL", WMATIC: "POL", MATIC: "POL", WHYPE: "HYPE", KHYPE: "HYPE", WS: "S", STS: "S", WSUI: "SUI", HASUI: "SUI",
};
const EXTRA_STABLE = /^(USD|EUR|GHO|CRVUSD|SCRVUSD|SUSDE|USDE|SUSDS|USDS|PYUSD|RLUSD|FRAX|LUSD|DOLA|SDOLA|MIM|USDM|AUSD|USDX|SUSDX|USD0|USDG|USD1|FDUSD|TUSD|DAI|SDAI|USDC|USDT)/;

export function poolCoins(symbol: string): string[] {
  return symbol.toUpperCase().split(/[-/ +_]+/).map((s) => s.replace(/\.E$/, "").trim()).filter(Boolean);
}
export const hedgeCoin = (c: string) => BASE[c] ?? c;
const stable = (c: string) => c === "U" || EXTRA_STABLE.test(c);

/** Volatile coins of a pool with their share of the deposit (empty for stable-only pools). */
export function exposure(symbol: string): Array<{ coin: string; share: number }> {
  const coins = poolCoins(symbol);
  const vol = coins.filter((c) => !stable(c));
  if (!vol.length) return [];
  const share = 1 / coins.length;
  const by = new Map<string, number>();
  for (const c of vol) by.set(hedgeCoin(c), (by.get(hedgeCoin(c)) ?? 0) + share);
  return [...by].map(([coin, s]) => ({ coin, share: Math.round(s * 100) / 100 }));
}

export interface DexHedge { legs: Array<{ coin: string; share: number; venue?: string; fundingApr?: number }>; hedgedApy?: number; possible: boolean }

/** Hedged APY = pool APY + Σ share × best short funding (positive funding pays the short). */
export function dexHedge(symbol: string, apy: number, h: Record<string, Hedge>): DexHedge | undefined {
  const exp = exposure(symbol);
  if (!exp.length) return undefined;
  const legs = exp.map(({ coin, share }) => {
    const perps = h[coin]?.perps ?? [];
    if (!perps.length) return { coin, share };
    const best = perps.reduce((m, x) => (x.fundingApr > m.fundingApr ? x : m), perps[0]);
    return { coin, share, venue: best.ex, fundingApr: best.fundingApr };
  });
  const possible = legs.every((l) => l.venue);
  return { legs, possible, hedgedApy: possible ? apy + legs.reduce((s, l) => s + l.share * (l.fundingApr ?? 0), 0) : undefined };
}
