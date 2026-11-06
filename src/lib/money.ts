import type { PoolsData } from "./pools";
import type { EarnData } from "./earn";
import type { Promo } from "./types";
import { median } from "./lpstats";

/** Plain dollar stablecoins only — what a beginner can stake without price risk. */
const SAFE = /^(USDT|USDC)$/;
const BIG = new Set(["binance", "bybit", "okx", "bitget", "gate", "kucoin", "mexc"]);
const WELCOME = /\b(new ?(user|comer)s?|newcomer|welcome|sign ?up|register|first (deposit|trade)|journey|start your)\b/i;
const NOT_FOR_ALL = /\b(aave|on-?chain|defi|x ?layer|wallet|dex|futures|perp|vip|mena|cis|sea|latam|region|exclusive|exclucsive)\b/i;
const DAY = 86400_000;

/* ------------------------------------------------------------------ today's plan */
export interface PlanEarn { exchange: string; coin: string; apr: number; cap?: number; url: string }
export interface PlanLp { exchange: string; token: string; stake: string; apr: number; cap?: number; daysLeft: number; url: string }
export interface PlanBonus { venue: Promo["venue"]; title: string; label?: string; href: string }
export interface PlanData { earn?: PlanEarn; lp: PlanLp[]; bonus?: PlanBonus; fetchedAt: number }

/** Ingredients for "your plan for today": best stable Launchpools (fill up to their caps), best plain USDT Earn for the rest, one real welcome bonus. */
export function planData(pools: PoolsData, earn: EarnData, promos: Promo[], bonusHref: (p: Promo) => string): PlanData {
  const now = pools.fetchedAt;
  const lp: PlanLp[] = pools.projects.filter((p) => p.status === "live" && p.end - now > DAY / 2)
    .flatMap((p) => p.pools.filter((x) => SAFE.test(x.stake) && (x.apr ?? 0) > 0 && !x.newUsers)
      .map((x) => ({ exchange: p.exchange, token: p.token, stake: x.stake, apr: x.apr!, cap: x.maxStake, daysLeft: Math.max(1, Math.round((p.end - now) / DAY)), url: p.url })))
    .sort((a, b) => b.apr - a.apr).slice(0, 3);
  const e = earn.offers.filter((o) => SAFE.test(o.coin) && o.type === "flexible" && !o.newUsers && BIG.has(o.exchange) && o.apr > 0 && o.apr <= 30)
    .sort((a, b) => b.apr - a.apr)[0];
  const b = promos.filter((p) => p.category === "bonus" && p.venue.kind === "cex" && WELCOME.test(p.title) && !NOT_FOR_ALL.test(p.title) && (!p.endsAt || p.endsAt > now))
    .sort((x, y) => (y.reward?.usd ?? 0) - (x.reward?.usd ?? 0))[0];
  return {
    lp, fetchedAt: now,
    earn: e ? { exchange: e.exchange, coin: e.coin, apr: e.apr, cap: e.maxAmount, url: e.url } : undefined,
    bonus: b ? { venue: b.venue, title: b.title, label: b.reward?.label, href: bonusHref(b) } : undefined,
  };
}

/* ------------------------------------------------------------------ one-time extras */
/**
 * Money a newcomer can add on top, once per exchange: welcome bonuses (real sign-up offers, not regional/VIP, not shared prize
 * pools) and boosted new-user Earn on stablecoins (cap × APR × term). Values are today's offers, shown as "available now".
 */
export interface Extra { key: string; exchange: string; kind: "welcome" | "newEarn"; title: string; usd: number; cap?: number; url: string }

export function oneTimeExtras(earn: EarnData, promos: Promo[], bonusHref: (p: Promo) => string, now: number): Extra[] {
  const best = new Map<string, Extra>();
  const keep = (x: Extra) => { const k = `${x.kind}:${x.exchange}`; if ((best.get(k)?.usd ?? -1) < x.usd) best.set(k, x); };
  for (const p of promos) {
    if (p.category !== "bonus" || p.venue.kind !== "cex" || !WELCOME.test(p.title) || NOT_FOR_ALL.test(p.title) || (p.endsAt && p.endsAt < now)) continue;
    const usd = p.reward?.usd;
    if (!usd || usd > 500) continue;                       // bigger numbers are shared pools, not a personal bonus
    keep({ key: `w:${p.id}`, exchange: p.venue.id, kind: "welcome", title: p.title, usd, url: bonusHref(p) });
  }
  for (const o of earn.offers) {
    if (!o.newUsers || !SAFE.test(o.coin) || !(o.apr > 0) || !o.maxAmount || !o.days) continue;
    keep({ key: `e:${o.exchange}:${o.coin}:${o.days}`, exchange: o.exchange, kind: "newEarn", title: `${o.coin} ${o.apr}% · ${o.days}d · ≤ ${o.maxAmount} ${o.coin}`, usd: (o.maxAmount * o.apr) / 100 * (o.days / 365), cap: o.maxAmount, url: o.url });
  }
  return [...best.values()].sort((a, b) => b.usd - a.usd);
}

/* ------------------------------------------------------------------ 90-day backtest */
export interface BtPool { token: string; exchange: string; stake: string; start: number; apr: number; earned: number }
export interface BtResult { amount: number; profit: number; lpPart: number; idlePart: number; pools: BtPool[]; heldDelta?: number }
export interface Backtest { days: number; idleApr: number; results: BtResult[]; poolsUsed: number; from: number; to: number }

/**
 * "If 90 days ago you had kept $X in the best stablecoin Launchpools (up to each pool's cap) and the rest in plain USDT Earn,
 *  selling the reward tokens right away". Uses each pool's final APR from the exchange archive, which is lower than the
 *  launch APR — i.e. conservative. `heldRatio` (token price now / on listing day) gives the "if you had kept the tokens" variant.
 */
export function backtest(pools: PoolsData, idleApr: number, heldRatio: Record<string, number>, amounts: number[], days = 90): Backtest {
  const to = pools.fetchedAt, from = to - days * DAY;
  const cands = pools.projects.flatMap((p) => p.pools.filter((x) => SAFE.test(x.stake) && (x.apr ?? 0) > 0 && !x.newUsers)
    .map((x) => ({ key: `${p.id}:${x.stake}`, token: p.token, exchange: p.exchange, stake: x.stake, start: p.start, end: Math.min(p.end, to), apr: x.apr!, cap: x.maxStake ?? Infinity })))
    .filter((c) => c.end > from && c.start < to && c.apr > idleApr);   // a pool paying less than plain Earn isn't worth joining
  const used = new Set<string>();
  const results = amounts.map((amount) => {
    let lpPart = 0, idlePart = 0, held = 0;
    const per = new Map<string, BtPool>();
    for (let d = from; d < to; d += DAY) {
      let left = amount;
      for (const c of cands.filter((c) => c.start <= d && c.end > d).sort((a, b) => b.apr - a.apr)) {
        if (left <= 0) break;
        const take = Math.min(left, c.cap);
        const inc = (take * c.apr) / 100 / 365;
        left -= take; lpPart += inc; used.add(c.key);
        held += inc * (heldRatio[c.token] ?? 1);
        const row = per.get(c.key) ?? { token: c.token, exchange: c.exchange, stake: c.stake, start: c.start, apr: c.apr, earned: 0 };
        row.earned += inc; per.set(c.key, row);
      }
      idlePart += (left * idleApr) / 100 / 365;
    }
    return { amount, profit: lpPart + idlePart, lpPart, idlePart, pools: [...per.values()].sort((a, b) => b.earned - a.earned), heldDelta: held - lpPart };
  });
  return { days, idleApr, results, poolsUsed: used.size, from, to };
}

/** Best regular (not new-user) plain-USDT flexible Earn rate on the big exchanges right now — where idle money would sit. */
export function idleUsdtApr(earn: EarnData): number {
  const xs = earn.offers.filter((o) => o.coin === "USDT" && o.type === "flexible" && !o.newUsers && BIG.has(o.exchange) && o.apr > 0 && o.apr <= 30).map((o) => o.apr);
  return xs.length ? Math.max(...xs) : median([]) ?? 3;
}

export const DAY_MS = DAY;
