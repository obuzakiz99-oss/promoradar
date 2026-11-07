import type { Category, Reward } from "./types";

const has = (t: string, words: RegExp) => words.test(t);

/** Not promotions: maintenance, delistings, dividends, contract tweaks… */
const NOISE = /(maintenance|delist|removal of|suspension|suspend|resumption|resume|dividend|adjustment|upgrade of|\bapi\b|system update|notice of|will list .* perpetual|margin tier|tick size|leverage|funding rate|settlement|wallet maintenance|important updates? on|risk warning|monitoring tag|deposits? and withdrawals?|opening .* deposits|network upgrade|token swap|rebrand|contract (swap|migration)|announcement on|\b(wins|won|named|recognized|recognised) .{0,40}\b(awards?|of the year|best)\b|\bawards? 20\d\d\b|\b(breach|hack(ed|s)?|exploit(ed)?|security incident|post-?mortem|initial report)\b)/i;

/** Signals that the item is something users can earn from (word boundaries: "withdrawal" is not a "draw"). */
const PROMO = /\b(airdrops?|launchpool|launchpad|launchx|megadrop|hodler|jumpstart|candybomb|candydrop|tokensplash|kickstarter|spotlight|startup|token sale|ieo|tge|booster|puzzle hunt|learn (&|and) earn|quiz|quests?|galxe|giveaways?|competition|tournament|challenge|trade[- ]to[- ](earn|share)|share|win|wins|winners?|prizes?|rewards?|bonus(es)?|earn|staking|apr|apy|cashback|vouchers?|coupons?|referral|invite|campaign|carnival|festival|lucky|draw|up to|points|incentives?|treasure|mystery box)\b/i;

export function isPromo(title: string): boolean {
  return !has(title, NOISE) && has(title, PROMO);
}

export function classify(title: string, hint?: string): Category {
  const t = `${title} ${hint ?? ""}`;
  if (has(t, /(referral|invite friends|affiliate|refer )/i)) return "referral";
  if (has(t, /(launchpool|launchpad|launchx|airdrop|hodler|jumpstart|megadrop|candybomb|candydrop|tokensplash|kickstarter|spotlight|token sale|\bieo\b|\btge\b|booster|puzzle hunt|poolx|gempool|startup|points? (program|season|campaign)|season \d)/i)) return "airdrop";
  if (has(t, /(pool rewards|liquidity (mining|rewards|incentive)|lp rewards|(?<!non-)\bfarm(ing)?\b)/i)) return "farming";
  if (has(t, /(new user|newcomer|welcome|first deposit|fiat|sign[- ]?up|kyc|start your .*journey|deposit (&|and) (trade|earn))/i)) return "bonus";
  if (has(t, /(competition|tournament|challenge|showdown|arena|prize pool|trade[- ]to[- ](earn|share)|trading (contest|campaign)|leaderboard|wsot|trade\b.*\b(share|win)|futures .*share)/i)) return "competition";
  if (has(t, /deposit/i)) return "bonus";
  if (has(t, /(earn|staking|stake|savings|apr|apy|hold to|\bhold\b.*\bshare\b|yield|dual investment|loan|subscribe|subscription)/i)) return "earn";
  if (has(t, /(listing campaign|giveaway|listing|celebrat)/i)) return "listing";
  return "other";
}

const STABLES = new Set(["USDT", "USDC", "USD", "FDUSD", "USDE", "DAI", "PYUSD", "USD1"]);
const MULT: Record<string, number> = { k: 1e3, thousand: 1e3, m: 1e6, million: 1e6, mn: 1e6, b: 1e9, billion: 1e9 };

function compact(n: number): string {
  if (n >= 1e9) return `${+(n / 1e9).toFixed(2)}B`;
  if (n >= 1e6) return `${+(n / 1e6).toFixed(2)}M`;
  if (n >= 1e4) return `${+(n / 1e3).toFixed(1)}K`;
  return n.toLocaleString("en-US");
}

/**
 * Pull the prize pool out of a headline, e.g.
 *  "Trade to Share 1,670,000 CT" -> 1.67M CT
 *  "Compete to Win Up to $10M"    -> $10M
 *  "share 400,000 USDC, up to 8%" -> 400K USDC
 * The biggest amount found wins (headlines often list a per-user cap after the pool).
 */
export function parseReward(title: string): Reward | undefined {
  // amounts that are entry conditions ("balance of 100 USDT", "minimum 50 USDT", "at least…") are not prizes
  const t = title.replace(/ /g, " ").replace(/\b(balance of|minimum( of)?|min\.|at least|holding of|deposit of at least)\s*\$?\s?[\d][\d,.]*\+?\s?(k|m)?\s*([A-Z][A-Z0-9]{1,9})?/gi, " ");
  const found: Reward[] = [];
  const letters = t.replace(/[^A-Za-z]/g, "");
  const shouty = letters.length > 12 && (letters.match(/[A-Z]/g)?.length ?? 0) / letters.length > 0.7;

  // $10M / $1,000,000 / $50K
  for (const m of t.matchAll(/\$\s?([\d][\d,.]*)\s?(k|m|b|million|thousand|billion|mn)?\b/gi)) {
    const v = parseFloat(m[1].replace(/,/g, "")) * (MULT[(m[2] || "").toLowerCase()] ?? 1);
    if (v > 0) found.push({ amount: v, unit: "USD", usd: v, label: `$${compact(v)}` });
  }
  // 1,670,000 CT / 400,000 USDC / 2.3M RITUAL / 10 USDT
  for (const m of t.matchAll(/\b([\d][\d,.]*)\s?([kKmMbB]|[Mm]illion|[Tt]housand|[Bb]illion|mn)?\+?\s+([A-Z][A-Z0-9]{1,9})\b/g)) {
    const unit = m[3];
    // in an ALL-CAPS headline every word looks like a ticker ("KUCOIN 5.0 JUST DROPPED") — only dollar stables count there
    if (shouty && !STABLES.has(unit)) continue;
    if (/^(APR|APY|USERS?|BNB CHAIN|VIP|NFT|AM|PM|UTC|X|DAYS?|MILLION|MILLIONS|BILLION|THOUSAND|HOURS?|WEEKS?|MONTHS?|TIMES|POINTS?|PAIRS?|NEW|ROUND)$/i.test(unit)) continue;
    const v = parseFloat(m[1].replace(/,/g, "")) * (MULT[(m[2] || "").toLowerCase()] ?? 1);
    if (!(v > 0) || /^20\d\d$/.test(m[1])) continue;
    const usd = STABLES.has(unit) ? v : undefined;
    found.push({ amount: v, unit, usd, label: `${compact(v)} ${unit}` });
  }
  if (!found.length) return undefined;
  // prefer USD-valued pools; among equals the largest amount
  found.sort((a, b) => (b.usd ?? -1) - (a.usd ?? -1) || b.amount - a.amount);
  const usdBest = found.find((f) => f.usd !== undefined);
  const tokenBest = [...found].sort((a, b) => b.amount - a.amount)[0];
  return usdBest ?? tokenBest;
}

/** Normalise whitespace and HTML entities in headlines. */
export function cleanTitle(s: string): string {
  return s
    .replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&lt;/g, "<").replace(/&gt;/g, ">")
    .replace(/\s{2,}/g, " ")
    .trim();
}
