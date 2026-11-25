import { readStore, writeStore } from "./store";
import { readHand, writeTodo } from "./ai-hand";
import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import type { PromoDetails } from "./details";
import type { Promo } from "./types";

/**
 * What a promo is really worth to one ordinary person (owner 13.11: "the site shows any junk — count the rewards,
 * the chance to get them, and drop the $2-per-account stuff").
 *
 * Two steps:
 *  1) Claude reads the official rules ONCE per promo (again only when they change) and fills a few hard facts:
 *     is it a promo at all, how the reward is split, what one person can get, how many winners, what you must do and
 *     how much money that takes. Cached in data/value.json (the `data` branch), VALUE_PER_BUILD new ones per build.
 *  2) Plain arithmetic turns the facts into an expected net $ for a typical participant + how sure we are.
 * Without ANTHROPIC_API_KEY (or before a promo is read) step 2 runs on what the regex parsers found.
 */
export type Mech = "fixed" | "tiers" | "pool_share" | "top_n" | "lucky_draw" | "first_n" | "apr" | "referral" | "points" | "unknown";
export type ActKind = "none" | "register" | "trade_spot" | "trade_futures" | "deposit" | "stake" | "hold" | "buy" | "other";
export interface Assess {
  isPromo: boolean;
  socialOnly: boolean;
  mech: Mech;
  typical?: { amount: number; unit: string };   // what someone doing the minimum qualifying action gets
  max?: { amount: number; unit: string };       // the most one person can get
  pool?: { amount: number; unit: string };
  winners?: number;                             // reward slots: top N, first N, number of lucky winners
  act: { kind: ActKind; usd?: number; lockDays?: number };
  aprPct?: number;
  days?: number;                                // how long the qualifying period is
}
export type Conf = "high" | "mid" | "low";
export interface Value {
  max?: number;          // the most one person can get, $ (when known)
  net?: number;          // expected $ for a typical participant after costs (undefined = can't say: points, APR without cap…)
  gross?: number;
  cost?: number;
  conf: Conf;
  mech: Mech;
  basis: "stated" | "max" | "chance" | "apr" | "none";
  ai: boolean;           // facts read by Claude (vs regex only)
}

const FILE = () => path.join(process.cwd(), "data", "value.json");
const VER = 1;
const KEEP_MS = 45 * 86400_000;
const MODEL = process.env.VALUE_MODEL || "claude-sonnet-5-5";
const PER_BUILD = Number(process.env.VALUE_PER_BUILD) || 80;
/** Below this expected net (when we are sure of the amount) a promo is not worth anyone's time. */
export const MIN_NET_USD = 10;

const Amt = z.object({ amount: z.number(), unit: z.string() }).nullable();
const Schema = z.object({
  isPromo: z.boolean(),
  socialOnly: z.boolean(),
  mech: z.enum(["fixed", "tiers", "pool_share", "top_n", "lucky_draw", "first_n", "apr", "referral", "points", "unknown"]),
  typical: Amt, max: Amt, pool: Amt,
  winners: z.number().nullable(),
  act: z.object({
    kind: z.enum(["none", "register", "trade_spot", "trade_futures", "deposit", "stake", "hold", "buy", "other"]),
    usd: z.number().nullable(), lockDays: z.number().nullable(),
  }),
  aprPct: z.number().nullable(),
  days: z.number().nullable(),
});

const SYSTEM = `You read one crypto exchange / DeFi announcement and extract hard facts so a site can estimate what ONE ordinary participant can realistically get. Use ONLY the given text; when something is not stated, use null. Never guess numbers.

Fields:
- isPromo: true only if a person can take an action now or soon and receive a reward (bonus, airdrop, prize, voucher, interest, rebate). false for news, reports, listings without rewards, product ads, market commentary, maintenance notices, "results/winners announced", backtested bot returns.
- socialOnly: true when the only task is social media (follow, like, repost, quote, join Telegram/Discord, post on the exchange's feed).
- mech: how the reward reaches a person —
  fixed (everyone who completes the task gets a set amount), tiers (amount depends on volume/deposit tiers),
  pool_share (a pool split among all qualifiers, pro rata or equally), top_n (leaderboard / ranking prizes),
  lucky_draw (random winners, spins, mystery boxes), first_n (first N qualifiers only),
  apr (interest / staking yield), referral (reward per invited friend), points (points/XP with no fixed $ value), unknown.
  If a campaign mixes several, pick the one an ordinary small participant would actually get.
- typical: the reward for the SMALLEST qualifying action (lowest tier, the fixed amount, per-person share if equal split is stated). Amount + unit exactly as in the text (USDT, USD, a token ticker…).
- max: the most one person can get (per-user cap, top prize for one person, highest tier).
- pool: the total prize pool.
- winners: number of reward slots when stated (top 100 → 100, first 5,000 users → 5000, 500 lucky winners → 500).
- act: the smallest thing one must do to qualify — kind; usd = the money needed (trading volume, deposit, stake, purchase in USD/USDT; convert only if the text gives the USD value); lockDays = days the money is locked if stated.
- aprPct: the advertised APR/APY % if this is an interest product.
- days: length of the qualifying period in days if stated.`;

function inputText(p: Promo, d?: PromoDetails): string {
  const lines = (d?.blocks ?? []).map((b) => (b.t === "h" ? `## ${b.x}` : b.t === "li" ? `- ${b.x}` : b.t === "tr" ? (b.cells ?? []).join(" | ") : b.x));
  return [
    `Venue: ${p.venue.name}`, `Headline: ${p.meta?.rawTitle ?? p.titleOrig ?? p.title}`,
    p.meta?.actions ? `Tasks: ${p.meta.actions}` : "",
    lines.length ? "\nANNOUNCEMENT / RULES:" : "(only the headline is available)",
    ...lines,
  ].filter(Boolean).join("\n").slice(0, 24_000);
}

type Store = Record<string, { h: string; v: number; at: number; a: Assess }>;
let READ_OK = true;
let MEM: Store | null = null;
function load(): Store {
  if (MEM) return MEM;
  const r = readStore<Store>(FILE(), {}); MEM = r.data; READ_OK = r.ok;
  return MEM!;
}

async function ask(client: Anthropic, text: string): Promise<Assess | null> {
  const r = await client.beta.messages.create({
    model: MODEL,
    max_tokens: 2000,
    system: SYSTEM,
    output_config: { effort: "low", format: zodOutputFormat(Schema) },
    messages: [{ role: "user", content: text }],
  } as Parameters<typeof client.beta.messages.create>[0], { timeout: 90_000 }) as Anthropic.Beta.BetaMessage;
  if (r.stop_reason !== "end_turn") return null;
  const parsed = Schema.safeParse(JSON.parse(r.content.flatMap((b) => (b.type === "text" ? [b.text] : [])).join("")));
  if (!parsed.success) return null;
  const x = parsed.data;
  const amt = (a: { amount: number; unit: string } | null) => (a && a.amount > 0 ? { amount: a.amount, unit: a.unit.trim().toUpperCase() } : undefined);
  return {
    isPromo: x.isPromo, socialOnly: x.socialOnly, mech: x.mech, typical: amt(x.typical), max: amt(x.max), pool: amt(x.pool),
    winners: x.winners ?? undefined, aprPct: x.aprPct ?? undefined, days: x.days ?? undefined,
    act: { kind: x.act.kind, usd: x.act.usd ?? undefined, lockDays: x.act.lockDays ?? undefined },
  };
}

/** Facts for the given promos: cached + up to VALUE_PER_BUILD new ones (pass the most visible first). Never throws. */
export async function getAssessments(promos: Promo[], details: Record<string, PromoDetails>): Promise<Record<string, Assess>> {
  const store = load();
  const now = Date.now();
  const hashOf = (t: string) => createHash("sha1").update(t).digest("base64url").slice(0, 16);
  const items = promos.filter((p) => p.category !== "farming" && !p.sponsored).map((p) => ({ p, text: inputText(p, details[p.id]) }));
  const key = process.env.ANTHROPIC_API_KEY;
  if (key) {
    const todo = items.filter(({ p, text }) => { const s = store[p.id]; return !s || s.v !== VER || s.h !== hashOf(text); }).slice(0, PER_BUILD);
    const client = new Anthropic({ apiKey: key, maxRetries: 3 });
    let stop = false;
    const worker = async () => {
      for (let it = todo.shift(); it && !stop; it = todo.shift()) {
        try {
          const a = await ask(client, it.text);
          if (a) store[it.p.id] = { h: hashOf(it.text), v: VER, at: now, a };
        } catch (e) {
          if (e instanceof Anthropic.AuthenticationError || e instanceof Anthropic.PermissionDeniedError) stop = true;
          else if (e instanceof Anthropic.BadRequestError && /credit|balance|billing/i.test(e.message)) stop = true;
          console.warn(`[value] ${it.p.id}: ${e instanceof Error ? e.message : e}`);
        }
      }
    };
    await Promise.all(Array.from({ length: 4 }, worker));
    const live = new Set(promos.map((p) => p.id));
    for (const [id, s] of Object.entries(store)) { if (live.has(id)) s.at = now; else if (now - s.at > KEEP_MS) delete store[id]; }
    writeStore(FILE(), store, READ_OK);
  }
  // facts written on the owner's laptop by Claude Code under the owner's plan (no API key) — see ai-hand.ts
  const hand = readHand<Assess>("value");
  const fresh = (id: string, text: string) => { const e = hand.get(id); return !!e && e.v === VER && e.h === hashOf(text); };
  writeTodo("value", items.filter(({ p, text }) => !fresh(p.id, text) && !(store[p.id]?.v === VER && store[p.id]?.h === hashOf(text)))
    .map(({ p, text }) => ({ id: p.id, h: hashOf(text), text })), 120);
  const out: Record<string, Assess> = {};
  for (const { p } of items) {
    const e = hand.get(p.id);
    if (e && e.v === VER) out[p.id] = e.data;          // a slightly older reading beats none while the new one waits
    else if (store[p.id]) out[p.id] = store[p.id].a;
  }
  return out;
}

// --- step 2: arithmetic ---------------------------------------------------------------------------------------------

// audit 18.11: Gate's "claim 20 USDx" was dropped as an unpriced coin and the estimate fell back to the 5,000 USDT top prize
export const STABLE = /^(USD|USDT|USDC|FDUSD|USD1|USDE|DAI|PYUSD|USDG|RLUSD|USDX|USDS|USDD|USD0|USDF|USDB|TUSD)$/i;
export const usdOf = (x: { amount: number; unit: string } | undefined, px: Record<string, number>) => {
  if (!x) return undefined;
  const r = STABLE.test(x.unit) ? 1 : px[x.unit] ?? px[x.unit.toUpperCase()];
  return r ? x.amount * r : undefined;
};
/** How many people a campaign on this venue typically draws (order of magnitude; competitions/pools on Binance get tens of thousands). */
// aster (audit 18.11): a 6.25M pool over the 2,000 default read as "≈ $3K per participant"
const CROWD: Record<string, number> = { binance: 30_000, bybit: 15_000, okx: 15_000, aster: 15_000, bitget: 12_000, gate: 6_000, kucoin: 6_000, mexc: 6_000, htx: 5_000, bingx: 4_000 };
const crowd = (venueId: string) => CROWD[venueId] ?? 2_000;
/** Trading fee per $1 of volume (taker; what a beginner pays). */
const FEE = { spot: 0.001, futures: 0.0005 };
/** What the locked money would earn elsewhere (flexible stablecoin earn), per year. */
const IDLE_APR = 0.05;

export function valueOf(p: Promo, a: Assess | undefined, px: Record<string, number>): Value {
  const usd = (x?: { amount: number; unit: string }) => usdOf(x, px);
  const m = p.meta ?? {};
  // audit 19.11: a pool shared by holdings with an APR ceiling ("MIN(pool ÷ all holdings × 365, 8%)", OKX Hold to Earn)
  // is a yield product — splitting it over the crowd and charging idle interest read as −$14 and hid it as "small"
  const yieldPool = a?.mech === "pool_share" && a.aprPct !== undefined && (a.act.kind === "hold" || a.act.kind === "stake" || a.act.kind === "deposit");
  const mech: Mech = yieldPool ? "apr" : a?.mech ?? (p.category === "referral" ? "referral" : p.category === "competition" ? "top_n" : m.aprPct !== undefined || p.category === "earn" ? "apr" : "unknown");
  const max = usd(a?.max) ?? m.perUser?.usd;
  const typical = usd(a?.typical);
  const pool = usd(a?.pool) ?? p.reward?.usd;
  // cost of qualifying: trading fees on the required volume, or what the locked money would have earned elsewhere
  const kind = a?.act.kind ?? (m.minEntry?.kind === "trade" ? (m.futures ? "trade_futures" : "trade_spot") : m.minEntry?.kind) ?? (m.noDeposit ? "none" : "other");
  const need = a?.act.usd ?? (m.minEntry && STABLE.test(m.minEntry.unit) ? m.minEntry.amount : undefined) ?? 0;
  const lock = a?.act.lockDays ?? a?.days ?? 14;
  const cost = kind === "trade_spot" ? need * FEE.spot : kind === "trade_futures" ? need * FEE.futures
    : kind === "deposit" || kind === "stake" || kind === "hold" ? need * IDLE_APR * (lock / 365) : 0;
  // + the trading volume the rules require on top of a deposit (Bitget: deposit 1,000 + 300,000 futures volume ≈ $150 in fees)
  const volCost = (m.needVol?.futures ?? 0) * FEE.futures + (m.needVol?.spot ?? 0) * FEE.spot;
  const ai = !!a;
  // audit 23.11: position vouchers, interest-free coupons and futures bonuses were counted as cash ("$500, sure" for a
  // BingX voucher) — they can only be used for trading and most expire unused; points are worth even less
  const title = p.titleOrig ?? p.title;
  const rules = [title, m.perUser?.text, m.minEntry?.text, ...(m.payout?.quotes ?? [])].filter(Boolean).join(" ");
  // audit 25.11: trial funds / position vouchers pay only the (capped) profit made with them, not their face value
  // (Gate "100 USDT Dual Investment Trial Fund" read as ≈$40, KuCoin "Futures Trial Fund — withdrawable profit ≤ 20%")
  const trial = /\b(trial funds?|trial vouchers?|position (trial )?vouchers?|experience (funds?|vouchers?)|trial bonus)\b/i.test(rules);
  // audit 25.11 (deep): CoinW "1,200% APR paid as a Mega Coupon" and "100 USDT Super Bonus" (a futures bonus) were counted as cash
  const couponWord = /\b(coupons?|vouchers?|super bonus|futures bonus|bonus funds?|deduction|cashback vouchers?)\b/i.test(rules);
  const fk = trial ? 0.1 : ({ cash: 1, mixed: 0.7, voucher: 0.4, points: 0.3 } as const)[m.payout?.form ?? (couponWord ? "voucher" : "cash")] ?? 1;
  // audit 23.11 (round 5): an "up to" APR is a ceiling — an estimate from it is never better than "low"
  // audit 25.11: a Telegram post without the exchange's full rules is never "you will really get" (Bitget trailing-stop 50 USDT)
  const capConf = (c: Conf): Conf => (m.aprUpTo ? "low" : c === "high" && p.id.startsWith("tg:") ? "mid" : c);
  const out = (g0: number | undefined, c0: Conf, basis: Value["basis"]): Value => {
    const gross = g0 === undefined ? undefined : g0 * fk;
    const conf: Conf = capConf(fk < 1 && c0 === "high" ? "mid" : c0);
    const c = Math.max(cost, kind.startsWith("trade") ? cost : cost + volCost);
    return { gross: gross === undefined ? undefined : round(gross), cost: round(c), max: max === undefined ? undefined : round(max), net: gross === undefined ? undefined : round(gross - c), conf, mech, basis, ai };
  };

  // audit 25.11: VIP/VVIP-only perks (MEXC VVIP Futures Earn boosters read as "+$21 likely") and campaigns whose smallest
  // tier needs tens of thousands of dollars are out of reach for an ordinary participant — no estimate
  if (/(?<![\w-])V?VIP(?![\w-])/.test(title) && !/non-?VIP|all users/i.test(title)) return out(undefined, "low", "none");
  if (need >= 20_000 && mech !== "apr") return out(undefined, "low", "none");

  switch (mech) {
    case "referral": {
      // audit 23.11 (round 3): referral money depends on friends who sign up AND deposit/trade — "up to 10,000 USDT for you
      // and your friend" (Binance Referral Rush: a friend really gets ≤ $25 boxes), HTX "≈ $100 average" = the maximum.
      // An ordinary person brings one friend at best: count half of one friend's reward, never above $50, always "low".
      const per = typical ?? max;
      return per === undefined ? out(undefined, "low", "none") : out(Math.min(per / 2, 50), "low", typical !== undefined ? "stated" : "max");
    }
    case "fixed": case "tiers":
      // the smallest tier is certain, but the bigger tiers are within reach too → not "surely small"
      // audit 23.11: MEXC "up to 150 USDT" (100 of it a trading bonus) showed "you will really get" — any "up to" above the typical is not sure
      if (typical !== undefined) return out(typical, mech === "tiers" || (max !== undefined && max > typical) ? "mid" : "high", "stated");
      // only an "up to" figure: the top tier / an affiliate's best month is not what a typical person gets
      // (an affiliate "up to $3,000" is a best month, not one friend: capped until Claude reads the per-friend amount)
      // audit 23.11: Bitget "up to $12,800" (needs $5M of holdings) read as "≈ $3,200 likely" — a quarter of a big top tier
      // is still far above what the entry tiers pay, so an unknown tier ladder is capped at $250
      // audit 25.11 (deep): CoinW "Welcome Pack up to 350 USDT" showed "≈ $350, most likely" — an "up to" alone is never likely
      if (max !== undefined) return out(Math.min(max / 4, 250), "low", "max");
      return out(undefined, "low", "none");
    case "first_n": {
      const per = typical ?? max ?? (pool && a?.winners ? pool / a.winners : undefined);
      if (per === undefined) return out(undefined, "low", "none");
      // being among the first N: certain when slots outnumber the crowd, otherwise roughly a coin flip for the quick
      const chance = a?.winners ? Math.min(1, Math.max(0.3, a.winners / crowd(p.venue.id))) : 0.5;
      return out(per * chance, typical !== undefined ? "mid" : "low", "chance");
    }
    case "pool_share": case "lucky_draw": case "top_n": {
      if (typical !== undefined && mech === "pool_share") return out(typical, "mid", "stated");
      if (pool === undefined) return out(max !== undefined ? Math.min(max, 1e9) * 0.05 : undefined, "low", max !== undefined ? "chance" : "none");
      // expected share of a typical small participant: the pool spread over the crowd, never above the per-person cap.
      // Rankings reward the biggest traders: an ordinary participant's real chance is a fraction of the average.
      // audit 23.11: a pool shared by volume/holdings goes mostly to whales too (Aster 6.25M → "≈ $417 likely")
      const avg = pool / crowd(p.venue.id) * (mech === "top_n" ? 0.2 : mech === "pool_share" ? 0.25 : 1);
      return out(max !== undefined ? Math.min(avg, max) : avg, "low", "chance");
    }
    case "apr": {
      // the $1,000 example is in a stablecoin: when the headline rate belongs to another coin, the stablecoin's rate counts
      const apr0 = a?.aprPct ?? m.aprPct;
      const apr = apr0 !== undefined && m.aprStable !== undefined ? Math.min(apr0, m.aprStable) : apr0;
      if (apr === undefined) return out(undefined, "low", "none");
      // extra over idle money on $1,000 (or the cap) for the period (30 days when not stated)
      // shown as "+$X on $1,000 a month over regular earn" (audit 14.11: Bitbase used its 250,000 USDT minimum,
      // KuCoin's 3-day 250 % coupon was counted for a whole month)
      if (need > 1000) return out(undefined, "low", "none");             // $1,000 can't even enter
      if (!a && apr > 30) return out(undefined, "low", "none");          // "up to 150 %" boosts: unknown term and cap
      // audit 25.11 (deep): a "1,200 % APR" is a short promo rate on a tiny quota (CoinW ANT: 12,000 pool, 10 people) — never an estimate
      if (apr > 100) return out(undefined, "low", "none");
      // audit 24.11: Binance "35% bonus APR for new users" (only the first 200 USDT, only 7 days) read as ≈$24.66 — the AI gave
      // no cap / term, the rules quoted on the card did: "only applicable to the user's first 200 USDT", "effective for 7 days"
      const txt = [m.minEntry?.text, m.perUser?.text, p.titleOrig ?? p.title].filter(Boolean).join(" ");
      const capM = txt.match(/\b(?:first|up to|maximum of|max(?:imum)?|capped at|cap of|limit of)\s+([\d,]+(?:\.\d+)?)\s?(USDT|USDC|USD|FDUSD)\b/i);
      const daysM = txt.match(/\b(?:for|within|lasts?|effective for|valid for)\s+(\d{1,3})\s+days?\b|\b(\d{1,3})[- ]day\b/i);
      // audit 25.11: Dual Investment is a non-principal-protected option product; its "rate-up" coupons cover a few USDT
      // for 3 days (KuCoin: 50 % on max 10 USDT principal read as "+$78 on $1,000")
      if (/dual investment/i.test(rules)) return out(undefined, "low", "none");
      const cap = usd(a?.max) ?? (capM ? Number(capM[1].replace(/,/g, "")) : undefined);
      // audit 25.11: the rules' "effective for 7 days" beats the AI's campaign length (Binance new-user 35 %: AI said 70 days)
      const textDays = daysM ? Number(daysM[1] ?? daysM[2]) : undefined;
      const days0 = a?.days !== undefined && textDays !== undefined ? Math.min(a.days, textDays) : a?.days ?? textDays;
      // audit 25.11 (deep): never count more days than the promo has left
      const left = p.endsAt ? Math.max(1, Math.ceil((p.endsAt - Date.now()) / 86400_000)) : undefined;
      const days = left !== undefined ? Math.min(days0 ?? 30, left) : days0;
      const base = Math.min(1000, cap !== undefined && cap > 0 ? cap : 1000);
      const g0 = base * Math.max(0, apr / 100 - IDLE_APR) * (Math.min(30, days ?? 30) / 365) * fk;
      // a capped bonus pool can't pay everyone the full rate: never more than ~10 average shares of the pool
      const poolCap = pool !== undefined && pool > 0 ? (pool / crowd(p.venue.id)) * 10 : Infinity;
      const g = round(Math.min(g0, poolCap));
      // "up to" rates and interest paid in a volatile token (GBCK, PEARL, stock tokens…) are not what one likely gets
      const stable = /\b(USDT|USDC|USD1|FDUSD|USDE|USDG|PYUSD|RLUSD|DAI|KCUSD|BXUSD|USDF|stablecoins?)\b|(?<![\w.])U(?![\w.])/i.test(rules);
      return { gross: g, cost: 0, net: g, conf: m.aprUpTo || !stable || fk < 1 ? "low" : "mid", mech, basis: "apr", ai };
    }
    default:
      return out(typical ?? undefined, typical !== undefined ? "mid" : "low", typical !== undefined ? "stated" : "none");
  }
}
const round = (x: number) => Math.round(x * 100) / 100;

/** Hide reason from the value (on top of junk.ts): not a promo at all, social-only, or surely worth under $10. */
export function valueJunk(a: Assess | undefined, v: Value): "news" | "social" | "small" | undefined {
  if (a && !a.isPromo) return "news";
  if (a?.socialOnly) return "social";
  if (v.net !== undefined && v.conf === "high" && v.net < MIN_NET_USD && v.mech !== "apr" && v.mech !== "referral" && !(v.max !== undefined && v.max >= 30)) return "small";
  return undefined;
}
