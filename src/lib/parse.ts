import type { Category, Reward } from "./types";

const has = (t: string, words: RegExp) => words.test(t);

/** Not promotions: maintenance, delistings, dividends, contract tweaks… */
const NOISE = /(maintenance|delist|removal of|suspension|suspend|resumption|resume|dividend|adjustment|upgrade of|\bapi\b|system update|notice of|will list .* perpetual|margin tier|tick size|leverage|funding rate|settlement|wallet maintenance|important updates? on|risk warning|monitoring tag|deposits? and withdrawals?|opening .* deposits|network upgrade|token swap|rebrand|contract (swap|migration)|announcement on|\b(wins|won|named|recognized|recognised) .{0,40}\b(awards?|of the year|best)\b|\bawards? 20\d\d\b|\b(breach|hack(ed|s)?|exploit(ed)?|security incident|post-?mortem|initial report)\b|\b(watch the (replay|recording)|recap|performance report|monthly report|(october|november|december|september|weekly|monthly) report|is in (the )?(focus|spotlight)|all eyes on|market (update|insight|outlook)|price (is )?(falls?|drops?|dips?)|what is [^?]{3,60}\?))/i;

/** Signals that the item is something users can earn from (word boundaries: "withdrawal" is not a "draw"). */
const PROMO = /\b(airdrops?|launchpool|launchpad|launchx|megadrop|hodler|jumpstart|candybomb|candydrop|tokensplash|kickstarter|spotlight|startup|token sale|ieo|tge|booster|puzzle hunt|learn (&|and) earn|quiz|quests?|galxe|giveaways?|competition|tournament|challenge|trade[- ]to[- ](earn|share)|share|win|wins|winners?|prizes?|rewards?|bonus(es)?|earn|staking|apr|apy|cashback|vouchers?|coupons?|referral|invite|campaign|carnival|festival|lucky|draw|up to|points|incentives?|treasure|mystery box)\b/i;

export function isPromo(title: string): boolean {
  // audit 24.11: "Celebrate Thanksgiving with 350,000 USDT" (Toobit), "$1M TradFi Flip Fest: … Fee Perks" (MEXC) were missed
  return !has(title, NOISE) && (has(title, PROMO) || /\b\d[\d,.]*\s?(USDT|USDC)\b|\$\d[\d,.]*[KM]?\b[^.]{0,30}\b(fest|perks|rewards?|pool)\b|\b0% (maker|taker|trading )?fees?\b|\bfee perks\b/i.test(title));
}

const REFERRAL = /(referral|invite friends|affiliate|refer )/i;
export const isReferral = (t: string) => REFERRAL.test(t);
/**
 * audit 27.11 (evening): Ourbit "Create a Team and Earn Up to 130,000 USDT as Captain" (a futures team showdown) was filed
 * as Earn — "earn up to <amount>" is how a reward is worded; without an Earn-product word in the headline the body decides.
 * Returns the body's category, or undefined when the headline is a real Earn offer / the body says nothing.
 */
export function earnVerbCategory(title: string, body: string): Category | undefined {
  // audit 27.11 (night): KuCoin "Earn extra draw entries for a chance to get surprise prizes" (a margin campaign) was filed as Earn
  const extra = /\bearn\s+(extra|more|bonus|additional)\s+(draw|lucky|raffle|spin|entr|ticket|chance|point)/i.test(title);
  if ((!extra && !/\bearn\s+(up to\s+)?\$?\d/i.test(title)) || /\b(apr|apy|stak\w*|savings|yield|subscri\w*|lock\w*|interest|dual investment|hold\w*|deposit\w*)\b|%/i.test(title)) return undefined;
  const c = classify(title.replace(/\bearn\b/gi, "get"), body);
  return c !== "other" && c !== "earn" ? c : extra ? "other" : undefined;
}

export function classify(title: string, hint?: string): Category {
  if (has(title, REFERRAL)) return "referral";
  // audit 22.11: a "refer" somewhere in the message text made an OKX liquidity campaign a referral programme —
  // the message text decides "referral" only when the title itself says nothing about the kind of promo
  // (audit 26.11: CoinW "TradFi Campaign Phase 4 … Share 100,000 USDT" is a trading campaign with a referral side task;
  // Ourbit "Three Black Friday rewards" = welcome gifts + discounts + referral — neither is a referral programme)
  if (hint && has(hint, REFERRAL)) {
    const own = kindOf(title);
    if (own !== "other") return own;
    if (has(title, /\bshare\s+(up to\s+)?\$?\d[\d,.]*\s*(k|m|million)?\s*(usdt|usdc|usd)?\b/i)) return "competition";
    if (has(hint, /\bwelcome (gifts?|bonus(es)?|rewards?|packs?)\b/i)) return "bonus";
    return "referral";
  }
  return kindOf(`${title} ${hint ?? ""}`);
}

function kindOf(t: string): Category {
  // audit 2 (25.11): Coinstore "Futures Trading Sprint", a "compete for…" airdrop / bonus were filed by their side words
  if (has(t, /\b(compete|competition|leaderboard|tournament|trading sprint|top \d+ traders)\b/i) && !has(t, /\b(yield|earn|apr|apy) arena\b/i)) return "competition";
  // audit 26.11: MEXC "Futures Earn APR Booster: +150%" is an Earn rate boost, not a token launch
  // audit 27.11 (night): Bitget "rToken Boost Season 4 — earn up to 20% APR" was filed as an airdrop by "season 4"
  if (has(t, /\b(apr|apy|yield|rate|earn|rtoken|holdings?|interest) boost(er)?\b/i) && !has(t, /\b(airdrop|launchpool|megadrop|hodler)\b/i)) return "earn";
  if (has(t, /(launchpool|launchpad|launchx|airdrop|hodler|jumpstart|megadrop|candybomb|candydrop|tokensplash|kickstarter|spotlight|token sale|\bieo\b|\btge\b|booster|puzzle hunt|poolx|gempool|startup|points? (program|season|campaign)|season \d)/i)) return "airdrop";
  if (has(t, /(pool rewards|liquidity (mining|rewards|incentive)|provid(e|ing) liquidity|liquidity provi|lp rewards|(?<!non-)\bfarm(ing)?\b)/i)) return "farming";
  // audit 23.11: MEXC "Futures Loss Coverage" (pays back futures losses) was filed as a deposit bonus
  if (has(t, /(loss (coverage|protection|compensation|rebate)|compensat\w* (for )?(your )?(futures )?loss|futures insurance)/i)) return "other";
  // audit 25.11 (deep): "New to CoinW? Complete tasks… Super Bonus" was filed as Earn
  if (has(t, /(new user|newcomer|welcome|first deposit|fiat|sign[- ]?up|kyc|start your .*journey|deposit (&|and) (trade|earn)|new to [a-z]|complete (the |all |simple )?tasks|task (center|hub|centre)|super bonus|claim (your |a )?\d[\d,.]* ?usdt futures bonus)/i)) return "bonus";   // + KuCoin "claim your 100 USDT futures bonus" (26.11)
  // 25.11: "Binance Earn Yield Arena" is an Earn offer, not a contest
  if (has(t, /\b(yield|earn|apr|apy) arena\b|\barena\b.{0,40}\b(apr|apy)\b/i)) return "earn";
  if (has(t, /(competition|tournament|challenge|showdown|arena|\bleague\b|prize pool|trade[- ]to[- ](earn|share)|trading (contest|campaign)|leaderboard|wsot|trade\b.*\b(share|win)|futures .*share)/i)) return "competition";
  if (has(t, /deposit/i)) return "bonus";
  if (has(t, /(earn|staking|stake|savings|apr|apy|hold to|\bhold\b.*\bshare\b|yield|dual investment|loan|subscribe|subscription)/i)) return "earn";
  if (has(t, /(listing campaign|giveaway|listing|celebrat)/i)) return "listing";
  return "other";
}

const STABLES = new Set(["USDT", "USDC", "USD", "FDUSD", "USDE", "DAI", "PYUSD", "USD1"]);
const MULT: Record<string, number> = { k: 1e3, thousand: 1e3, m: 1e6, million: 1e6, mn: 1e6, b: 1e9, billion: 1e9 };

export function compact(n: number): string {
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
  const t0 = title.replace(/ /g, " ").replace(/\b(balance of|minimum( of)?|min\.|at least|holding of|deposit of at least)\s*\$?\s?[\d][\d,.]*\+?\s?(k|m)?\s*([A-Z][A-Z0-9]{1,9})?/gi, " ");
  // audit 25.11: "$1.8B in weekly spot volume" (Bitrue) was posted as the pool — market figures are not prizes,
  // and "earn up to $300 daily" / "per friend" is what one person gets, not a pool
  const t = t0
    // audit 27.11 (texts): Bitrue "Bitcoin reclaims $61,000" became a "$61K" pool — a market price is not a prize
    .replace(/\b(reclaims?|above|below|hits?|breaks?|crosses|price of|priced at)\s+\$?\s?[\d][\d,.]*\s?(k|m)?\b/gi, " ")
    // (audit 2, 25.11: "liquidity / deposits / traders" and a bare "each" / "daily" also ate real pools — "Share 100,000 USDT
    // in Liquidity Rewards", "Win 20,000 USDT Daily Prize Pool", "Top 100 traders share 30,000 USDT each week")
    .replace(/\$?\s?[\d][\d,.]*\s?(k|m|b|million|billion)?\+?\s*([A-Z][A-Z0-9]{1,9}\s)?(in )?((weekly|daily|monthly|total|24h|record)\s)*(spot |futures |trading )?(volume|TVL|market cap|valuation)\b/gi, " ")
    .replace(/\$?\s?[\d][\d,.]*\s?(k|m)?\s*([A-Z][A-Z0-9]{1,9}\s?)?(daily|per day|a day|each day|per friend|per referral|per invite|per user|per person|each (user|person|winner|friend))\b(?!\s+(\w+\s+){0,2}(prize|pool|rewards? pool))/gi, " ");
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
    if (/\$\s?$/.test(t.slice(0, m.index))) continue;   // "$50 ETH voucher": already counted as $50
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
/**
 * Audit 25.11 (deep): headlines copied from posts read like raw exchange text — "New Listing Fest Phase 6 | Prize Pool",
 * "How your APR stacks • 5% base APR • Up to…", "… 👉 Details", 300-character first sentences. One tidy shape:
 * separators become " — ", a bullet list keeps only its first item, trailing calls to action go, and a long headline is
 * cut at the end of a sentence/clause. The page URL does not depend on it (promos are found by the id hash).
 */
export function tidyHeadline(s: string): string {
  let t = cleanTitle(s)
    .replace(/\s*[|｜]\s*/g, " — ")
    .replace(/\s*(👉|➡️|→)\s*(more )?(details|learn more|join now|read more|here)\b.*$/i, "")
    .replace(/[\s\u{1F300}-\u{1FAFF}☀-➿️]+$/u, "")
    .replace(/^[\s\u{1F300}-\u{1FAFF}☀-➿️#]+/u, "")   // leading "🏆 " / "#" too (audit 2)
    // audit 26.11: "0.01% fees 🎁 Enjoy up to 80% commission 🎁 Invite…" — an emoji between words is a separator;
    // "#XRP and #Bitcoin", "on #Bitrue" — hashtags read as plain words (a "#4" campaign number stays)
    .replace(/\s+[\u{1F300}-\u{1FAFF}☀-➿️]+\s+/gu, " — ")
    .replace(/(^|[\s(])#(?=[A-Za-z$])/g, "$1")
    .trim();
  // the headline is its first part; a part with the money ("Share 10,000 USDT", "5% base APR") is kept next to it
  // (case-sensitive ticker: "Phase 4 is Live" is not an amount)
  const AMT = /\$\s?\d|\d[\d,.]*\s?(%|[kKmMbB]\b|USDT|USDC|USD|BTC|ETH|[A-Z]{2,6}\b)/;
  // (audit 2: no split after abbreviations — "Bitget U.S. Stock…" became "Bitget U.S — Stock", "a est. 4%" was cut;
  // emoji-only parts ("☕️") go)
  const parts = t.split(/\s+—\s+|\s+•\s+|(?<=[\p{L}\p{N}]{3}[.!?])(?<!\b(?:est|approx|incl|etc|vs|min|max)\.)\s+/u)
    .map((x) => x.trim().replace(/\.$/, "").replace(/^[—–-]\s*/, "")).filter((x) => /[\p{L}\p{N}]/u.test(x));
  if (parts.length > 1) {
    let out = parts[0];
    if (out.length < 28 && parts[1]) out = `${out} — ${parts[1]}`;
    if (!AMT.test(out)) {
      let money = parts.slice(1).find((x) => AMT.test(x));
      // a long money part keeps the words around the amount ("…Share 10,000 USDT")
      if (money && out.length + money.length > 107) { const i = money.search(AMT); const from = Math.max(0, i - 25); money = (from > 0 ? "…" : "") + money.slice(from).replace(from > 0 ? /^\S*\s/ : /^/, ""); }
      if (money) out = `${out} — ${money}`;
    }
    // the part that makes it a promo ("Stake $SOL … up to 50% APY") must stay — a market fact alone is not a headline
    if (!isPromo(out)) { const pr = parts.find((x) => isPromo(x) && AMT.test(x)) ?? parts.find((x) => isPromo(x)); if (pr && !out.includes(pr)) out = parts[0].length <= 60 && parts[0] !== pr ? `${parts[0]} — ${pr}` : pr; }
    t = out;
  }
  if (t.length > 110) t = `${t.slice(0, 108).replace(/\s+\S*$/, "").replace(/[\s—:,;]+$/, "")}…`;
  t = unshout(t).replace(/^[a-z]/, (c) => c.toUpperCase()).replace(/\s*[.:;,]$/, "");
  return t || cleanTitle(s);
}

/** Names that keep their capital letter ("BLACK FRIDAY" → "Black Friday"). */
const PROPER = /^(monday|tuesday|wednesday|thursday|friday|saturday|sunday|black|christmas|xmas|thanksgiving|halloween|easter|bitcoin|ethereum|solana|binance|bybit|bitget|kucoin|bitrue|bingx|gate|coinw|ourbit|toobit|poloniex|biconomy|bitmart|hibt|nvidia|tesla|apple|anthropic|january|february|march|april|june|july|august|september|october|november|december)$/i;
/** Tickers and acronyms that stay in capitals when a SHOUTED headline is put in sentence case. */
const KEEP_CAPS = /^(USDT|USDC|USDE|USD1|USD|FDUSD|DAI|APR|APY|BTC|ETH|SOL|XRP|BNB|TON|TRX|DOGE|VIP|VVIP|KYC|P2P|AI|NFT|TGE|IPO|CEX|DEX|DEFI|RWA|PNL|ROI|UTC|US|USA|UK|EU|OTC|API|TRADFI|LBANK|HTX|OKX|MEXC|KCS|BGB|XAUT|PAXG|ETF|AMA|CEO)$/;
/**
 * audit 26.11: "ONE WEEK LEFT — DON'T MISS THE DUAL INVESTMENT CAMPAIGN!", "500,000 USDT PRIZE POOL — TRADERS, YOU'RE UP"
 * read as shouting on a card. A headline that is mostly capitals goes to sentence case; tickers ($ANTON, USDT, BTC),
 * words with digits and known acronyms keep their capitals.
 */
export function unshout(t: string): string {
  const shouty = (x: string, min: number, share: number) => { const l = x.replace(/[^A-Za-z]/g, ""); return l.length >= min && (l.match(/[A-Z]/g)?.length ?? 0) / l.length >= share; };
  const fix = (x: string) => x.replace(/[$#]?[A-Za-z][A-Za-z0-9'’]*/g, (w) =>
    /^[$#]/.test(w) || /\d/.test(w) || (w === w.toUpperCase() && KEEP_CAPS.test(w.replace(/['’]S$/i, "").toUpperCase())) ? w
      : PROPER.test(w) ? w[0].toUpperCase() + w.slice(1).toLowerCase() : w.toLowerCase());
  // the whole headline, or one shouted part of it ("$ANTON EARN: UP TO 30% APR! — LBank's limited-time…")
  const out = shouty(t, 15, 0.75) ? fix(t) : t.split(/(\s+—\s+|:\s+|[!?]\s+)/).map((x) => (shouty(x, 6, 0.9) ? fix(x) : x)).join("");
  if (out === t) return t;
  // a capital again at the start of each sentence / part
  return out.replace(/(^|[.!?]\s+|[—–]\s+)([a-z])/g, (_, p: string, c: string) => p + c.toUpperCase());
}

export function cleanTitle(s: string): string {
  return s
    .replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&lt;/g, "<").replace(/&gt;/g, ">")
    .replace(/\s{2,}/g, " ")
    .trim();
}
