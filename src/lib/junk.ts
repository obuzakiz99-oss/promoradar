import type { Block } from "./details";
import type { Promo } from "./types";

/**
 * Promos the owner does not want on the site (13.11):
 *  - "social": the task is to follow / repost / join the exchange's social account or post on its feed (Square, Live);
 *  - "small":  one person can get less than $30 in total.
 * Checked on every build for every new promo; hidden ones are listed in data/hidden-promos.json for review.
 * Paid placements, hand-added promos and competitions (prize = rank, not a fixed amount) are never hidden.
 */
export type JunkReason = "social" | "small";
export const MIN_PER_USER_USD = 30;

const NET = String.raw`(?:X|Twitter|Telegram|Discord|YouTube|Instagram|TikTok|Facebook|Reddit|social (?:media|platforms?|accounts?))`;
const SOCIAL_TITLE = new RegExp(
  String.raw`\b(follow|retweet|repost|like|subscribe)\b.{0,40}\b${NET}\b` +
  String.raw`|\b(retweet|repost|like (?:&|and) RT)\b` +
  String.raw`|\b(giveaway|rewards?|prizes?)\b.{0,40}\b(in|on) (our )?${NET}\b` +
  String.raw`|\b(Gate|Binance|Bitget|OKX|MEXC|Bybit) (Square|Feed|Live)\b` +
  String.raw`|\bcommunity (weekly )?(activity|growth|campaign|giveaway|task)` +
  String.raw`|\bpost (on|in) |\bshare your (post|thoughts|story|subscription|screenshot)`, "i");
/** A rules line that makes a social action a task ("Follow @BingXTradFi, like & RT"). */
const SOCIAL_TASK = new RegExp(
  String.raw`\b(follow (us|our official|the official|@\w+|\w+ on (official |our )?${NET})` +
  String.raw`|retweet|repost (the|our|this)|quote (the |our |this )?(post|tweet)|like,? (and |& )?(share|retweet|repost|RT|comment)` +
  String.raw`|tag \d+ friends|comment (on|under) (the|our|this) (post|tweet)|invite your friends to join our (telegram|discord))`, "i");
/** Footers every article of a source carries ("Join our Telegram community to discuss…", "Subscribe to our channel >>>"). */
const SOCIAL_FOOTER = /to discuss|>>>|on-screen|for (the )?(latest|more)|stay (up to date|updated|tuned)/i;

const AMT = /\$\s?([\d,]+(?:\.\d+)?)\s*([kKmM])?(?![\w])|([\d,]+(?:\.\d+)?)\s*([kKmM])?\s*(?:USDT|USDC|USD|FDUSD|USD1)\b/g;
const POOL_BEFORE = /(share|pool|split|total|worth|prize|airdrop of|giveaway)/i;
const POOL_AFTER = /^\s*(in (total )?(rewards|prizes|token vouchers|vouchers|bonus(es)?)|prize pool|pool)/i;
const PER_BEFORE = /\b(up to|capped at|maximum of|max\.?|each|per (user|person|participant)|receive|get|earn|claim|win|collect)\s*$/i;

/** Dollar amounts one person can get named in a text; in a headline any non-pool amount counts. */
function personAmounts(s: string, headline: boolean): number[] {
  const out: number[] = [];
  for (const m of s.matchAll(AMT)) {
    const num = (m[1] ?? m[3] ?? "").replace(/,/g, "");
    if (!/^\d+(\.\d+)?$/.test(num)) continue;
    const mul = (m[2] ?? m[4] ?? "").toLowerCase();
    const v = Number(num) * (mul === "k" ? 1e3 : mul === "m" ? 1e6 : 1);
    const before = s.slice(Math.max(0, m.index! - 25), m.index!), after = s.slice(m.index! + m[0].length, m.index! + m[0].length + 20);
    if (PER_BEFORE.test(before)) { out.push(v); continue; }
    if (!headline || POOL_BEFORE.test(before) || POOL_AFTER.test(after)) continue;
    out.push(v);
  }
  return out;
}

export function junkReason(p: Promo, blocks: Block[] | undefined, handAdded = false): JunkReason | undefined {
  if (p.sponsored || handAdded) return undefined;
  const lines = (blocks ?? []).map((b) => (b.t === "tr" ? (b.cells ?? []).join(" · ") : b.x));
  if (SOCIAL_TITLE.test(p.title) || lines.some((x) => SOCIAL_TASK.test(x) && !SOCIAL_FOOTER.test(x))) return "social";
  const pu = p.meta?.perUser?.usd;
  if (p.category === "competition" || pu === undefined || pu >= MIN_PER_USER_USD) return undefined;
  // the per-person figure read from the rules is sometimes one task of several ("Earn 5 USDT: …" in a package worth
  // up to 3,100 USDT): keep the promo when the headline or any rules line names a bigger per-person amount
  const best = Math.max(pu, ...personAmounts(p.title, true), ...[p.meta?.perUser?.text ?? "", ...lines].flatMap((x) => personAmounts(x, false)));
  return best < MIN_PER_USER_USD ? "small" : undefined;
}
