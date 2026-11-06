import type { Promo } from "./types";
import type { PoolProject, Pool } from "./pools";
import type { EarnOffer } from "./earn";

/**
 * Token pages (/t/SOL): everything the site knows about one coin — promos that give it away, Launchpools that reward it
 * or let you stake it, and the best Earn rates for it. A token gets a page when it has a live promo or Launchpool,
 * or Earn offers on at least 3 exchanges (the big coins).
 */
export interface TokenInfo {
  sym: string;
  logo?: string;
  price?: number;
  change?: number;
  promos: Promo[];
  lpReward: PoolProject[];                                   // Launchpools that pay out this token
  lpStake: Array<{ project: PoolProject; pool: Pool }>;     // Launchpools where you stake this token
  earn: EarnOffer[];                                         // best Earn offers, highest APR first
}

const STABLE = new Set(["USDT", "USDC", "USD", "FDUSD", "USD1", "DAI", "USDE", "PYUSD", "USDG"]);
/** Capital words in headlines that are not tickers. */
const NOT_TICKER = new Set(["APR", "APY", "USD", "NEW", "VIP", "ETF", "KYC", "UID", "LIVE", "WIN", "FREE", "AI", "IPO", "TGE", "CFD", "PNL", "OTC", "API", "NFT", "DEX", "CEX", "UTC", "AMA", "FAQ", "GEM", "MENA", "SEA", "CIS", "CEE", "EU", "UK", "US", "P2P", "HODLER", "WSOT", "TGE", "CEO", "RWA", "DEFI", "TOP", "THE", "AND", "FOR", "UP", "TO", "OF", "ON", "IN", "IS", "X", "ID", "BOOST", "EARN", "SHARE", "TRADE", "REWARDS", "BONUS", "PRIZE", "POOL", "DAY", "DAYS", "WEEK", "CARNIVAL", "CHALLENGE", "CAMPAIGN", "LISTING", "FUTURES", "SPOT", "MARGIN", "COPY", "CANDYBOMB", "LAUNCHPOOL", "POOLX", "GEMPOOL", "KUCOIN", "BINANCE", "BYBIT", "BITGET", "MEXC", "GATE", "HTX", "OKX", "XT", "LBANK", "BINGX", "WHITEBIT", "COINEX", "BITRUE", "WEEX", "BITUNIX", "PHEMEX", "BITMART", "KRAKEN"]);

export const tokenSlug = (sym: string) => sym.toUpperCase().replace(/[^A-Z0-9]/g, "");

export function buildTokens(promos: Promo[], projects: PoolProject[], offers: EarnOffer[], px: Record<string, number>, chg: Record<string, number>, now: number): Map<string, TokenInfo> {
  const map = new Map<string, TokenInfo>();
  const get = (raw: string) => {
    const sym = tokenSlug(raw);
    if (!sym || sym.length < 2 || sym.length > 10) return undefined;
    let t = map.get(sym);
    if (!t) { t = { sym, promos: [], lpReward: [], lpStake: [], earn: [] }; map.set(sym, t); }
    return t;
  };

  for (const p of projects) {
    if (p.status === "ended" || p.end < now) continue;
    const t = get(p.token);
    if (t) { t.lpReward.push(p); t.logo ??= p.logo; }
    for (const pool of p.pools) { const s = get(pool.stake); if (s) { s.lpStake.push({ project: p, pool }); s.logo ??= pool.stakeLogo; } }
  }

  for (const p of promos) {
    if (p.category === "farming") continue;
    const syms = new Set<string>();
    if (p.reward?.unit && p.reward.unit !== "USD") syms.add(tokenSlug(p.reward.unit));
    if (p.meta?.perUser?.unit && p.meta.perUser.unit !== "USD") syms.add(tokenSlug(p.meta.perUser.unit));
    // "$SOL", "(KOR)", "KOR Listing" — capital tickers in the original headline (not in ALL-CAPS headlines, where every word is capital)
    const head = p.titleOrig ?? p.title;
    const letters = head.replace(/[^A-Za-z]/g, "");
    const shouty = letters.length > 12 && (letters.match(/[A-Z]/g)?.length ?? 0) / letters.length > 0.6;
    if (!shouty) for (const m of head.matchAll(/(?:\$|\(|\b)([A-Z][A-Z0-9]{1,9})\b\)?/g)) if (!NOT_TICKER.has(m[1])) syms.add(m[1]);
    for (const s of syms) { if (!s || NOT_TICKER.has(s)) continue; const t = get(s); t?.promos.push(p); }
  }

  const byCoin = new Map<string, EarnOffer[]>();
  for (const o of offers) { if (!(o.apr > 0) || o.apr > 300) continue; const k = tokenSlug(o.coin); if (!byCoin.has(k)) byCoin.set(k, []); byCoin.get(k)!.push(o); }
  for (const [k, list] of byCoin) {
    const exchanges = new Set(list.map((o) => o.exchange)).size;
    const t = map.get(k) ?? (exchanges >= 3 ? get(k) : undefined);
    if (t) t.earn = list.sort((a, b) => b.apr - a.apr).slice(0, 12);
  }

  // a token with only a headline mention (no reward in it, no Launchpool, no Earn) isn't worth a page
  for (const [k, t] of map) {
    const strong = t.lpReward.length + t.lpStake.length + t.earn.length + t.promos.filter((p) => p.reward?.unit === k || p.meta?.perUser?.unit === k).length;
    if (!strong && t.promos.length < 2) map.delete(k);
  }
  for (const t of map.values()) {
    t.price = STABLE.has(t.sym) ? 1 : px[t.sym];
    t.change = chg[t.sym];
    t.logo ??= `https://bin.bnbstatic.com/static/assets/logos/${t.sym}.png`;
    t.promos.sort((a, b) => (b.meta?.perUser?.usd ?? 0) - (a.meta?.perUser?.usd ?? 0) || (b.reward?.usd ?? 0) - (a.reward?.usd ?? 0) || b.publishedAt - a.publishedAt);
  }
  return map;
}

export const isStableSym = (s: string) => STABLE.has(s);

/** Everything needed for the token pages, from the same (build-cached) data the rest of the site uses. */
export async function getTokens(lang?: string): Promise<{ tokens: Map<string, TokenInfo>; fetchedAt: number }> {
  const [{ getPromos }, { getPools, prices }, { getEarn }] = await Promise.all([import("./promos"), import("./pools"), import("./earn")]);
  const [{ promos, fetchedAt }, pools, earn, pr] = await Promise.all([
    getPromos(lang), getPools().catch(() => null), getEarn().catch(() => null), prices().catch(() => ({ px: {}, chg: {} })),
  ]);
  return { tokens: buildTokens(promos, pools?.projects ?? [], earn?.offers ?? [], pr.px, pr.chg, fetchedAt), fetchedAt };
}
