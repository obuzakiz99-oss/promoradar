/**
 * What a promo actually pays and how you get it — read from the official rules text (no guessing).
 *  - form: "cash"   the rules say the reward is withdrawable / credited as normal tokens to the spot/funding wallet
 *          "voucher" futures bonus, coupon, voucher, position airdrop, fee saver, trial fund… (not withdrawable as such)
 *          "points"  XP / points (no money yet)
 *          "mixed"   both cash-like and voucher-like rewards in the same promo
 *          undefined the rules do not say
 *  - claimDays: reward must be claimed within N days (else it expires); manual: must be claimed by hand
 *  - reviewDays / payDays: risk review up to N days / paid within N days after the event or task
 * Every value keeps the sentence it came from (`quotes`) so the page can show the evidence.
 */
export type PayoutForm = "cash" | "voucher" | "points" | "mixed";
export interface Payout {
  form?: PayoutForm;
  claimDays?: number;
  manual?: boolean;
  auto?: boolean;
  reviewDays?: number;
  payDays?: number;
  quotes: string[];
}

const NUM: Record<string, number> = { one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10, fourteen: 14, fifteen: 15, twenty: 20, thirty: 30 };
const n = (s: string) => (/^\d+$/.test(s) ? Number(s) : NUM[s.toLowerCase()]);
const W = String.raw`(?:\d{1,3}|one|two|three|four|five|six|seven|eight|nine|ten|fourteen|fifteen|twenty|thirty)`;
// "7 days", "seven (7) days", "one to three days" (→ the upper bound)
const D = String.raw`(?:${W}\s*(?:to|-|–)\s*)?(\d{1,3}|one|two|three|four|five|six|seven|eight|nine|ten|fourteen|fifteen|twenty|thirty)\s*(?:\(\d+\)\s*)?`;

// voucher-like: the reward cannot be withdrawn as such ("token vouchers" are NOT here: they redeem into real tokens)
const VOUCHER = /\b(futures (trial )?bonus(es)?|bonus (voucher|credit)s?|(futures|trading|deduction|fee|copy ?trad\w*|margin|position|interest[- ]free|apr|earn|crypto) (vouchers?|coupons?)|(?<!token )vouchers?|coupons?|position airdrops?|fee savers?|trial funds?|experience (funds?|money)|bonus(es)? (can only|cannot|can't|are non-withdrawable|is non-withdrawable)|non-withdrawable|cannot be withdrawn|can ?not be withdrawn|not withdrawable)\b/i;
// cash-like: explicitly withdrawable, or paid straight into a normal balance
const CASH = /\b((can|may) be (freely )?(withdrawn|transferred out)|withdrawable|fully owned by you|paid (directly )?into your (existing )?balance|in the same (stablecoin|asset) you hold|token vouchers?|[\d,.]+ ?(USDT|USDC|USD) in cash|(distributed|credited|airdropped|paid|sent) (directly )?(in|as) (USDT|USDC|FDUSD|USD1|[A-Z]{2,10} tokens?)\b(?! (bonus|voucher|coupon|trial))|wallet address(es)?)\b/i;
// "… distributed to users' Spot Accounts …", "credited in USDT to your Funding account" — a normal wallet, not a bonus balance
const TO_WALLET = {
  test: (x: string) => /\b(distribut\w*|credit\w*|airdrop\w*|issued|paid|sent|deposited|given)\b/i.test(x)
    && /\b(spot|funding|main|fund) (accounts?|wallets?)\b/i.test(x)
    && !/\b(transfers? from|only transfers|count(s|ed)? toward|excluded?|net transfer|deduct\w*)\b/i.test(x)
    && !/\b(coupons?|vouchers?|bonus(es)?) (will be |are |is )?(credited|distributed|sent|issued)\b/i.test(x),
} as unknown as RegExp;
const POINTS = /\b(XP|points? (will be|are) (distributed|credited|awarded)|earn (your share of )?[\d,.]+[MK]? ?(XP|points))\b/;
const TOKEN_VOUCHER_OK = /token voucher[^.]{0,200}\b(withdraw|fully owned|transferred)/i;

const CLAIM = [
  new RegExp(String.raw`\b(?:must|need to|should|have to)\s+(?:be\s+)?claim(?:ed)?\b[^.]{0,80}?\bwithin\s+${D}(?:calendar\s+|business\s+|working\s+)?days?`, "i"),
  new RegExp(String.raw`\bclaim(?:ed)?\b[^.]{0,60}?\bwithin\s+${D}(?:calendar\s+|business\s+|working\s+)?days?`, "i"),
  new RegExp(String.raw`\b(?:valid|expire[sd]?)\s+(?:for|after|in|within)\s+${D}(?:calendar\s+)?days?\s+(?:after|from|of)\s+(?:being\s+)?(?:distribut|issu|credit|receiv)`, "i"),
];
const AUTO = /\b(credited|distributed|sent|paid|airdropped) automatically\b|\bautomatically (credited|distributed|sent|paid|airdropped|transferred)\b/i;
const MANUAL = /\b(claim (it|them|your rewards?|the rewards?|manually)|manually claim|must be claimed|need to claim|click (the )?["“]?claim|go to [^.]{0,40}(rewards? (hub|center|centre)|my rewards)[^.]{0,40}claim)\b/i;
const REVIEW = new RegExp(String.raw`\b${D}[- ]?(?:calendar[- ]|business[- ]|working[- ])?days?[- ](?:risk[- ])?review|\breview[^.]{0,40}?(?:up to|within|takes)\s+${D}(?:calendar\s+|business\s+|working\s+)?days?`, "i");
const PAY = new RegExp(String.raw`\b(?:distributed|credited|airdropped|sent|paid|issued|delivered|disbursed|allocated)\b[^.]{0,80}?\bwithin\s+${D}(?:calendar\s+|business\s+|working\s+)?days?`, "i");
const PAY_HOURS = /\b(?:distributed|credited|paid|sent)\b[^.]{0,60}?\bwithin\s+(\d{1,2})\s*hours?\b/i;

const sentences = (lines: string[]) => lines.flatMap((l) => l.split(/(?<=[.!?])\s+(?=[A-Z0-9•\-(])/)).map((s) => s.trim()).filter((s) => s.length > 8 && s.length < 600);

export function payoutOf(lines: string[]): Payout | undefined {
  const ss = sentences(lines);
  const quotes = new Set<string>();
  const hit = (re: RegExp) => { const s = ss.find((x) => re.test(x)); if (s) quotes.add(s); return s; };
  // sentences that mention vouchers only in passing ("cannot be combined with vouchers", "volume using fee vouchers is
  // not included", Binance's "Learn how to redeem a voucher" footer) say nothing about what THIS promo pays
  const aside = (x: string) => /\b(combined|stack(ed)?|together) with\b|\bexclud\w*\b|\bnot (be )?(count\w*|eligible|included)\b|\blearn how to redeem\b/i.test(x);
  const pick = (test: (x: string) => boolean) => { const s = ss.find(test); if (s) quotes.add(s); return !!s; };
  const voucher = pick((x) => VOUCHER.test(x) && !aside(x));
  // "profits made with the bonus are withdrawable" is about a voucher, not a cash reward
  const cash = pick((x) => (CASH.test(x) || TOKEN_VOUCHER_OK.test(x) || TO_WALLET.test(x)) && !/\bprofits?\b/i.test(x) && !aside(x));
  const points = !voucher && !cash && !!hit(POINTS);
  const form: PayoutForm | undefined = voucher && cash ? "mixed" : voucher ? "voucher" : cash ? "cash" : points ? "points" : undefined;

  const num = (re: RegExp) => { const s = ss.find((x) => re.test(x)); if (!s) return undefined; const m = s.match(re)!; const v = n(m.slice(1).find((g) => g && n(g) !== undefined) ?? ""); if (v && v <= 120) { quotes.add(s); return v; } return undefined; };
  const claimDays = CLAIM.map(num).find((v) => v !== undefined);
  const manual = claimDays !== undefined || !!hit(MANUAL);
  const auto = !manual && !!hit(AUTO);
  const reviewDays = num(REVIEW);
  let payDays = num(PAY);
  if (payDays === undefined && hit(PAY_HOURS)) payDays = 1;
  if (!form && claimDays === undefined && !manual && !auto && reviewDays === undefined && payDays === undefined) return undefined;
  return { form, claimDays, manual: manual || undefined, auto: auto || undefined, reviewDays, payDays, quotes: [...quotes] };
}
