import type { Promo } from "./types";

/**
 * "Mix" promos (audit 12.11): other live promos on the same exchange that the same money / the same action can
 * count toward, so one trade volume or one deposit earns in several campaigns at once.
 *  - same exchange, dates overlap
 *  - the same kind of action: trading (futures with futures, spot with spot), deposit, staking / holding, buying
 *  - trading promos only when they don't name different coins (volume on LAB doesn't count in a bStocks contest)
 *  - no-deposit promos (quizzes, sign-up tasks) pair with each other; referral programmes are left out
 * Checked on the live feed (12.11): 50 of 301 promos get 1–4 partners.
 * Exchanges sometimes exclude volume already counted elsewhere — the UI says to check the rules.
 */
export type ComboWhy = "trade-futures" | "trade-spot" | "deposit" | "stake" | "free";
export interface Combo { p: Promo; why: ComboWhy }

type Act = ComboWhy | undefined;
const TRADE_RE = /\b(trad(e|ing)|volume)\b/i;
// tickers named in a headline (stablecoins and common words don't tell two contests apart)
const STOP = new Set("USDT USDC USD USDX CFD VIP NEW P2P BSC ETF IPO CIS CEE WSOT APR APY KYC UID TGE AMA NFT DEX CEX AI TP SL UTC GMT FAQ OTC API CEO OG VS PRO II III IV".split(" "));
const tickers = (p: Promo) => new Set(((p.titleOrig ?? p.title).match(/\b[A-Z][A-Z0-9]{1,9}\b/g) ?? []).filter((w) => !STOP.has(w) && !/^\d+$/.test(w)));

export function actionOf(p: Promo): Act {
  const m = p.meta ?? {};
  if (p.category === "referral") return undefined;
  if (m.noDeposit) return "free";
  const k = m.minEntry?.kind;
  if (k === "trade" || (!k && p.category === "competition" && TRADE_RE.test(p.titleOrig ?? p.title))) return m.futures ? "trade-futures" : "trade-spot";
  if (k === "deposit") return "deposit";
  if (k === "stake" || k === "hold") return "stake";
  return undefined;
}

const live = (p: Promo, now: number) => (!p.endsAt || p.endsAt > now) && (!p.startsAt || p.startsAt - now < 3 * 86400_000);
const overlap = (a: Promo, b: Promo) => (!a.endsAt || !b.startsAt || b.startsAt < a.endsAt) && (!b.endsAt || !a.startsAt || a.startsAt < b.endsAt);

export function combosFor(p: Promo, all: Promo[], now: number, max = 4): Combo[] {
  const a = actionOf(p);
  if (!a || p.venue.kind !== "cex" || !live(p, now)) return [];
  const out: Combo[] = [];
  for (const q of all) {
    if (q.id === p.id || q.venue.id !== p.venue.id || !live(q, now) || !overlap(p, q)) continue;
    if (actionOf(q) !== a) continue;
    if (a === "trade-futures" || a === "trade-spot") {
      const A = tickers(p), B = tickers(q);
      if (A.size && B.size && ![...A].some((x) => B.has(x))) continue;
    }
    out.push({ p: q, why: a });
  }
  // same action first, then the biggest per-person / pool value
  const val = (x: Promo) => x.meta?.perUser?.usd ?? (x.reward?.usd ?? 0) / 1000;
  return out.sort((x, y) => val(y.p) - val(x.p)).slice(0, max);
}

/** How many promos one can stack with `p` (for a small badge on the card). */
export const comboCount = (p: Promo, all: Promo[], now: number) => combosFor(p, all, now, 99).length;
