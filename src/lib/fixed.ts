import { getJson } from "./sources/util";

/** Pendle PT fixed yields on dollar-stablecoin markets (official Pendle API, active markets per chain). */
export interface FixedRow { name: string; chain: string; apy: number; expiry: number; liquidity: number; url: string }
export interface FixedData { rows: FixedRow[]; fetchedAt: number }

const CHAINS: Array<[number, string, string]> = [[1, "Ethereum", "ethereum"], [42161, "Arbitrum", "arbitrum"], [8453, "Base", "base"], [56, "BNB Chain", "bnbchain"]];
const STABLE = /usd|dai|gho|frax|usde|usd0/i;

export async function getFixed(): Promise<FixedData> {
  const now = Date.now();
  const res = await Promise.allSettled(CHAINS.map(([id]) => getJson(`https://api-v2.pendle.finance/core/v1/${id}/markets/active`, 20_000)));
  const rows: FixedRow[] = [];
  res.forEach((r, i) => {
    if (r.status !== "fulfilled") return;
    const [, chain, slug] = CHAINS[i];
    for (const m of r.value?.markets ?? []) {
      const d = m.details ?? {};
      const expiry = Date.parse(m.expiry);
      if (!STABLE.test(m.name) || !(d.impliedApy > 0) || !(d.liquidity >= 1e6) || !(expiry > now)) continue;
      rows.push({ name: m.name, chain, apy: d.impliedApy * 100, expiry, liquidity: d.liquidity, url: `https://app.pendle.finance/trade/markets/${m.address}/swap?view=pt&chain=${slug}` });
    }
  });
  rows.sort((a, b) => b.liquidity - a.liquidity);
  return { rows, fetchedAt: now };
}
