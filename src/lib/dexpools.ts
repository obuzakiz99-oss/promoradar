import { cached, getBigJson } from "./sources/util";

/** A DEX / DeFi yield pool (DefiLlama Yields open data). APYs in %. */
export interface DexPool {
  id: string;
  project: string;       // display name
  slug: string;
  logo?: string;
  url?: string;          // protocol app
  category: string;      // Dexs, Lending, Yield…
  chain: string;
  symbol: string;
  meta?: string;
  tvl: number;
  apy: number;
  apyBase?: number;
  apyReward?: number;
  apy30d?: number;
  stable: boolean;
  il: boolean;
}

export interface DexData { pools: DexPool[]; chains: string[]; categories: string[]; fetchedAt: number }

/** Raw DefiLlama data, shared with the promo "farming" source (cached 1 h in memory). */
export function llamaRaw() {
  return cached("llama-raw", 60 * 60_000, async () => {
    const [pools, protocols] = await Promise.all([
      getBigJson<{ data: any[] }>("https://yields.llama.fi/pools"),
      getBigJson<any[]>("https://api.llama.fi/protocols"),
    ]);
    return { pools: pools.data, protocols };
  });
}

const CATS = new Set(["Dexs", "Lending", "Yield", "Derivatives", "Liquid Staking", "CDP", "Yield Aggregator", "Liquidity manager", "Restaking", "Basis Trading", "RWA", "Farm"]);

export async function getDexPools(): Promise<DexData> {
  return cached("dex-pools", 30 * 60_000, async () => {
    const { pools, protocols } = await llamaRaw();
    const proto = new Map<string, any>(protocols.map((p) => [p.slug, p]));
    const out: DexPool[] = [];
    for (const p of pools) {
      const pr = proto.get(p.project);
      if (!pr || !CATS.has(pr.category)) continue;
      // apy < 0.1% (idle collateral on lending markets) isn't a yield opportunity
      if (!(p.tvlUsd >= 500_000) || !(p.apy >= 0.1) || p.apy > 2000 || p.outlier) continue;
      out.push({
        id: p.pool, project: String(pr.name), slug: p.project, logo: pr.logo ? `${pr.logo}?w=48&h=48` : undefined, url: pr.url,
        category: pr.category === "Dexs" ? "DEX" : pr.category, chain: p.chain, symbol: p.symbol, meta: p.poolMeta || undefined,
        tvl: Math.round(p.tvlUsd), apy: +p.apy.toFixed(2), apyBase: p.apyBase ? +p.apyBase.toFixed(2) : undefined,
        apyReward: p.apyReward ? +p.apyReward.toFixed(2) : undefined, apy30d: p.apyMean30d ? +p.apyMean30d.toFixed(2) : undefined,
        stable: !!p.stablecoin, il: p.ilRisk === "yes" && pr.category !== "Lending",   // a lending deposit has no impermanent loss
      });
    }
    out.sort((a, b) => b.tvl - a.tvl);
    const top = out.slice(0, 1500);
    const count = (k: (x: DexPool) => string) => [...top.reduce((m, x) => m.set(k(x), (m.get(k(x)) ?? 0) + 1), new Map<string, number>())].sort((a, b) => b[1] - a[1]).map(([v]) => v);
    return { pools: top, chains: count((x) => x.chain), categories: count((x) => x.category), fetchedAt: Date.now() };
  });
}
