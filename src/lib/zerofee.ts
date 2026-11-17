import type { Block } from "./details";

/**
 * "0% trading fees" offers (owner 16.11: a separate "0 fees" tab in Promos).
 * A promo counts when its headline names zero fees, or a rules sentence offers them ("enjoy zero maker and taker fees",
 * "pay zero net transaction fees", "a zero trading fee campaign on KGST/USDT"). Not counted: the usual exclusion
 * clauses ("volume on zero-fee pairs is not counted") and site menus copied with the page ("ConvertSwap … with 0 fees").
 */
const FEE = String.raw`(?:zero|0\s?%?|no)[- ]?(?:maker |taker |spot |futures |trading |spot trading |futures trading |net transaction |gas )?(?:(?:and|&|or) (?:zero |0\s?%? )?taker )?(?:trading )?(?:fees?|commissions?)\b`;
const TITLE = new RegExp(String.raw`\b${FEE}|\bfee[- ]free\b|\b0\s?% maker and 0\s?% taker\b|\bzero[- ]fee\b`, "i");
// in the rules only "zero / 0%" offers count, never "no fees" or "charges …": audit 17.11 — KuCoin's rules said a
// third-party terminal "charges no trading fees", which flagged a normal-fee contest
const FEE_RULES = FEE.replace("(?:zero|0\\s?%?|no)", "(?:zero|0\\s?%?)");
const OFFER = new RegExp(
  String.raw`\b(enjoy|enjoys|offers?|pay|pays|with|launch(?:es)?|get|trade [^.]{0,50}?with)\b[^.]{0,40}?\b${FEE_RULES}` +
  String.raw`|\bzero[- ]trading[- ]fee campaign\b|\b0\s?% maker and 0\s?% taker\b|\bpay no maker or taker fees\b`, "i");
const EXCLUDE = /\b(exclud\w*|except\w*|not (be )?(count|eligible|includ)\w*|non[- ]?zero|do(es)? not|will not|won't|isn't|aren't|nor)\b/i;

export function isZeroFee(title: string, blocks: Block[] | undefined): boolean {
  if (TITLE.test(title) && !EXCLUDE.test(title)) return true;
  for (const b of (blocks ?? []).slice(0, 60)) {
    if (b.t === "tr" || !b.x) continue;
    // menu items copied with the page are short list lines; real offers are sentences
    if (b.t === "li" && b.x.length < 80) continue;
    if (b.x.split(/(?<=[.!?])\s+/).some((s) => OFFER.test(s) && !EXCLUDE.test(s))) return true;
  }
  return false;
}
