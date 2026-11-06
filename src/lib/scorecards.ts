import type { Promo, Venue } from "./types";
import type { PoolProject } from "./pools";
import type { EarnOffer } from "./earn";
import type { PromoDetails } from "./details";

/**
 * Exchange rating, computed only from what the site actually sees right now (no opinions, no paid placement).
 * Per country (any / Ukraine / EU) the promos that are other-region-only or restricted for that country are left out.
 */
export type Country = "any" | "ua" | "eu";
export const COUNTRIES: Country[] = ["any", "ua", "eu"];

export interface ScoreRow {
  venue: Venue;
  promos: number;           // live promos available in that country
  hidden: number;           // promos left out for that country
  poolUsd: number;          // sum of stated prize pools (USD-valued)
  perUserMedian?: number;   // median "up to … per person" ($)
  perUserMax?: number;
  entryMedian?: number;     // median minimum to get anything ($)
  noDepositPct: number;     // % of promos that need no money
  newUsersPct: number;      // % only for new users
  kycPct?: number;          // % of promos whose rules mention KYC (only promos with rules text)
  launchpools: number;      // live / upcoming Launchpool projects
  usdtEarn?: number;        // best plain USDT flexible Earn APR (not new-user)
  score: number;            // 0..100
}

const OK_FOR: Record<Exclude<Country, "any">, RegExp> = { ua: /^(CEE|CIS.*|Europe|Ukraine|region)$/i, eu: /^(CEE|CIS & CEE|Europe|EEA|region)$/i };
export function availableIn(p: Promo, c: Country): boolean {
  const g = p.meta?.geo;
  if (!g || c === "any") return true;
  if (c === "ua" && g.noUA) return false;
  if (c === "eu" && g.noEU) return false;
  return !g.only || OK_FOR[c].test(g.only);
}

const median = (xs: number[]) => { if (!xs.length) return undefined; const s = [...xs].sort((a, b) => a - b); const m = s.length >> 1; return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; };
const pct = (n: number, d: number) => (d ? Math.round((n / d) * 100) : 0);

export function scorecards(promos: Promo[], details: Record<string, PromoDetails>, projects: PoolProject[], offers: EarnOffer[], now: number): Record<Country, ScoreRow[]> {
  const cex = promos.filter((p) => p.venue.kind === "cex" && !p.sponsored);
  const venues = new Map<string, Venue>();
  for (const p of cex) venues.set(p.venue.id, p.venue);
  const lp = new Map<string, number>();
  for (const pr of projects) if (pr.status !== "ended" && pr.end > now) lp.set(pr.exchange, (lp.get(pr.exchange) ?? 0) + 1);
  const earn = new Map<string, number>();
  for (const o of offers) if (o.coin === "USDT" && o.type === "flexible" && !o.newUsers && o.apr > 0 && o.apr <= 30) earn.set(o.exchange, Math.max(earn.get(o.exchange) ?? 0, o.apr));

  const out = {} as Record<Country, ScoreRow[]>;
  for (const c of COUNTRIES) {
    const rows: ScoreRow[] = [];
    for (const [id, venue] of venues) {
      const all = cex.filter((p) => p.venue.id === id);
      const mine = all.filter((p) => availableIn(p, c));
      const per = mine.map((p) => p.meta?.perUser?.usd).filter((x): x is number => typeof x === "number" && x > 0);
      const entry = mine.map((p) => (p.meta?.noDeposit ? 0 : p.meta?.minEntry?.amount)).filter((x): x is number => typeof x === "number");
      const withRules = mine.filter((p) => details[p.id]?.facts?.length);
      const kyc = withRules.filter((p) => details[p.id].facts.some((f) => f.k === "kyc"));
      rows.push({
        venue, promos: mine.length, hidden: all.length - mine.length,
        poolUsd: mine.reduce((s, p) => s + (p.reward?.usd ?? 0), 0),
        perUserMedian: median(per), perUserMax: per.length ? Math.max(...per) : undefined,
        entryMedian: median(entry),
        noDepositPct: pct(mine.filter((p) => p.meta?.noDeposit).length, mine.length),
        newUsersPct: pct(mine.filter((p) => p.meta?.forNew).length, mine.length),
        kycPct: withRules.length >= 3 ? pct(kyc.length, withRules.length) : undefined,
        launchpools: lp.get(id) ?? 0, usdtEarn: earn.get(id), score: 0,
      });
    }
    // score: how much there is to get (promos, per-person sums), how easy it is (entry, no-deposit), plus Launchpool / Earn
    const maxN = Math.max(1, ...rows.map((r) => r.promos));
    const maxPer = Math.max(1, ...rows.map((r) => r.perUserMedian ?? 0));
    for (const r of rows) {
      const activity = Math.sqrt(r.promos / maxN);                                   // 0..1
      const generosity = Math.sqrt((r.perUserMedian ?? 0) / maxPer);                 // 0..1
      const easy = r.entryMedian === undefined ? 0.4 : r.entryMedian <= 50 ? 1 : r.entryMedian <= 500 ? 0.7 : r.entryMedian <= 5000 ? 0.4 : 0.15;
      const extras = Math.min(1, r.launchpools / 3) * 0.5 + (r.usdtEarn ? Math.min(1, r.usdtEarn / 8) * 0.5 : 0);
      r.score = r.promos ? Math.round(100 * (0.35 * activity + 0.3 * generosity + 0.2 * easy + 0.1 * (r.noDepositPct / 100) + 0.05 * extras)) : 0;
    }
    out[c] = rows.filter((r) => r.promos > 0 || r.launchpools > 0).sort((a, b) => b.score - a.score || b.promos - a.promos);
  }
  return out;
}
