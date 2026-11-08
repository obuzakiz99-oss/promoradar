import type { Promo } from "./types";
import { money } from "./format";

/**
 * Our own short card title, built from the parsed facts instead of a raw headline (audits 08.11):
 *   with an amount: "<type: subject | what to do> → <how much>"   "Змагання: SIAI → фонд 100M SIAI"
 *   without one:    "<type>: <what it is about>"                   "Змагання: CFD, XAUT" · "Розіграш: iPhone 18 Pro Max"
 * The subject comes from the headline (tickers, products, prizes). When we can't name the subject and there is no
 * amount, a translated headline beats a generic word — then this returns undefined.
 */
type L = "uk" | "en" | "ru";

const DO: Record<L, Record<"trade" | "deposit" | "stake" | "hold" | "buy", (x: string) => string>> = {
  uk: { trade: (x) => `Торгуйте від ${x}`, deposit: (x) => `Внесіть від ${x}`, stake: (x) => `Застейкайте від ${x}`, hold: (x) => `Тримайте від ${x}`, buy: (x) => `Купіть від ${x}` },
  en: { trade: (x) => `Trade from ${x}`, deposit: (x) => `Deposit from ${x}`, stake: (x) => `Stake from ${x}`, hold: (x) => `Hold from ${x}`, buy: (x) => `Buy from ${x}` },
  ru: { trade: (x) => `Торгуйте от ${x}`, deposit: (x) => `Внесите от ${x}`, stake: (x) => `Застейкайте от ${x}`, hold: (x) => `Держите от ${x}`, buy: (x) => `Купите от ${x}` },
};
const FREE: Record<L, string> = { uk: "Без вкладень", en: "No deposit", ru: "Без вложений" };
const KIND: Record<L, Record<Promo["category"], string>> = {
  uk: { competition: "Змагання", airdrop: "Аірдроп", bonus: "Бонус", earn: "Earn", listing: "Лістинг", referral: "Реферальна програма", other: "Розіграш", farming: "Фарм" },
  en: { competition: "Competition", airdrop: "Airdrop", bonus: "Bonus", earn: "Earn", listing: "Listing", referral: "Referral programme", other: "Giveaway", farming: "Farm" },
  ru: { competition: "Соревнование", airdrop: "Аирдроп", bonus: "Бонус", earn: "Earn", listing: "Листинг", referral: "Реферальная программа", other: "Розыгрыш", farming: "Фарм" },
};
const PER: Record<L, (x: string) => string> = { uk: (x) => `до ${x} на 1 людину`, en: (x) => `up to ${x} per person`, ru: (x) => `до ${x} на 1 человека` };
const POOL: Record<L, (x: string) => string> = { uk: (x) => `фонд ${x}`, en: (x) => `pool ${x}`, ru: (x) => `фонд ${x}` };

// products and prizes people recognise, in each language
const PRODUCTS: Array<[RegExp, Record<L, string>]> = [
  [/\bCFDs?\b/i, { uk: "CFD", en: "CFD", ru: "CFD" }],
  [/\b(futures|perps?|perpetuals?)\b/i, { uk: "ф'ючерси", en: "futures", ru: "фьючерсы" }],
  [/\bcopy[- ]?trad/i, { uk: "копітрейдинг", en: "copy trading", ru: "копитрейдинг" }],
  [/\bmargin\b/i, { uk: "маржа", en: "margin", ru: "маржа" }],
  [/\boptions\b/i, { uk: "опціони", en: "options", ru: "опционы" }],
  [/\b(stocks?|equities|tradfi|xstocks?)\b/i, { uk: "акції", en: "stocks", ru: "акции" }],
  [/\bP2P\b/, { uk: "P2P", en: "P2P", ru: "P2P" }],
  [/\b(launchpool|gempool|poolx|candybomb|launchpad|jumpstart)\b/i, { uk: "Launchpool", en: "Launchpool", ru: "Launchpool" }],
  [/\bquiz\b/i, { uk: "вікторина", en: "quiz", ru: "викторина" }],
  [/\bcard\b/i, { uk: "картка", en: "card", ru: "карта" }],
  [/\bspot\b/i, { uk: "спот", en: "spot", ru: "спот" }],
];
const PRIZE = /\b(iPhone(?: \d+)?(?: Pro(?: Max)?)?|MacBook(?: \w+)?|iPad(?: \w+)?|PlayStation ?\d?|Tesla(?: Model \w)?|Rolex|AirPods(?: \w+)?)\b/i;
// tickers: $ABC, or 2–10 capitals/digits that are not ordinary words
const STOP = new Set("NEW NOW LIVE THE AND FOR WITH VIP APR APY TGE CEX DEX UTC KYC AMA FAQ USD USDT USDC FDUSD UP TO OF IN ON AT BY GET WIN JOIN EARN SHARE TRADE TRADING DAY DAYS TOP HOT EXCLUSIVE ONLY MENA SEA CIS EU UK US WEEK FREE BONUS NFT AI ALL YOUR OUR YOU IS IT ARE BE DEPOSIT SPOT TASK TASKS REWARD REWARDS PRIZE POOL ROUND PHASE SEASON EVENT CAMPAIGN PROMO PROMOTION PART ETF GO VS IPO PRE DOWN".split(" "));
function subject(title: string, lang: L, venue: string): string | undefined {
  const parts: string[] = [];
  const prize = title.match(PRIZE)?.[1];
  if (prize) parts.push(prize);
  for (const [re, w] of PRODUCTS) if (re.test(title) && parts.length < 2) parts.push(w[lang]);
  const ven = venue.toUpperCase().replace(/[^A-Z0-9]/g, "");
  const words = title.split(/\s+/);
  for (let i = 0; i < words.length && parts.length < 2; i++) {
    const m = words[i].match(/^\$?([A-Z][A-Z0-9]{1,9})[^A-Za-z0-9]*$/);
    if (!m) continue;
    const t = m[1];
    if (STOP.has(t) || t === ven || ven.startsWith(t)) continue;
    // a bare capital word counts only next to ordinary words ("Trade SIAI to win"), not inside an ALL-CAPS headline
    const calm = (w?: string) => !!w && /[a-zа-я]/.test(w);
    if (!words[i].startsWith("$") && !calm(words[i - 1]) && !calm(words[i + 1])) continue;
    if (!parts.includes(t)) parts.push(t);
  }
  return parts.length ? parts.slice(0, 2).join(", ") : undefined;
}

const cyr = (s: string) => /[а-яіїєґё]/i.test(s);

export function titleOf(p: Promo, lang: L): string | undefined {
  const m = p.meta ?? {};
  if (p.category === "farming" || p.venue.kind === "airdrop") return undefined;
  const much = m.perUser ? PER[lang](money(m.perUser.amount, m.perUser.unit, lang))
    : m.aprPct !== undefined ? `+${m.aprPct}% APR` : p.reward ? POOL[lang](p.reward.label) : undefined;
  const what = m.minEntry ? DO[lang][m.minEntry.kind](money(m.minEntry.amount, m.minEntry.unit, lang)) : m.noDeposit ? FREE[lang] : undefined;
  const subj = subject(p.titleOrig ?? p.title, lang, p.venue.name);
  const kind = subj ? `${KIND[lang][p.category]}: ${subj}` : KIND[lang][p.category];
  if (much) return `${subj ? kind : what ?? kind} → ${much}`;
  if (what) return subj ? `${kind} · ${what}` : `${KIND[lang][p.category]} · ${what}`;
  if (subj) return kind;
  return undefined;   // nothing specific to say: the (translated) headline stays the title
}

/** Show the headline under our title only in the reader's language (a translation, or English on /en). */
export const showHeadline = (p: Promo, lang: L) => lang === "en" || cyr(p.title);
