import type { Promo } from "./types";
import { money, num } from "./format";

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
  uk: { competition: "Змагання", airdrop: "Аірдроп", bonus: "Бонус", earn: "Earn", listing: "Лістинг", referral: "Реферальна програма", other: "Промоакція", farming: "Фарм" },
  en: { competition: "Competition", airdrop: "Airdrop", bonus: "Bonus", earn: "Earn", listing: "Listing", referral: "Referral programme", other: "Promo", farming: "Farm" },
  ru: { competition: "Соревнование", airdrop: "Аирдроп", bonus: "Бонус", earn: "Earn", listing: "Листинг", referral: "Реферальная программа", other: "Промоакция", farming: "Фарм" },
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
  [/\b(stocks?|equities|tradfi|xstocks?)\b/i, { uk: "токенізовані акції", en: "tokenized stocks", ru: "токенизированные акции" }],
  [/\bP2P\b/, { uk: "P2P", en: "P2P", ru: "P2P" }],
  [/\b(launchpool|gempool|poolx|candybomb|launchpad|jumpstart)\b/i, { uk: "Launchpool", en: "Launchpool", ru: "Launchpool" }],
  [/\bquiz\b/i, { uk: "вікторина", en: "quiz", ru: "викторина" }],
  [/\bcard\b/i, { uk: "картка", en: "card", ru: "карта" }],
  [/\bspot\b/i, { uk: "спот", en: "spot", ru: "спот" }],
];
const PRIZE = /\b(iPhone(?: \d+)?(?: Pro(?: Max)?)?|MacBook(?: \w+)?|iPad(?: \w+)?|PlayStation ?\d?|Tesla(?: Model \w)?|Rolex|AirPods(?: \w+)?)\b/i;
// tickers: $ABC, or 2–10 capitals/digits that are not ordinary words
const STOP = new Set("NEW NOW LIVE THE AND FOR WITH VIP APR APY TGE CEX DEX UTC KYC AMA FAQ USD USDT USDC FDUSD UP TO OF IN ON AT BY GET WIN JOIN EARN SHARE TRADE TRADING DAY DAYS TOP HOT EXCLUSIVE ONLY MENA SEA CIS EU UK US WEEK FREE BONUS NFT AI ALL YOUR OUR YOU IS IT ARE BE DEPOSIT SPOT TASK TASKS REWARD REWARDS PRIZE POOL ROUND PHASE SEASON EVENT CAMPAIGN PROMO PROMOTION PART ETF GO VS IPO PRE DOWN NOT CEE LATAM APAC DUO NO YES OFF MAX MIN".split(" "));
// audit 23.11: region codes (CEE, LATAM) and words like "is NOT just" were read as coins
function subject(title: string, lang: L, venue: string, noPrize = false): { text: string; specific: boolean } | undefined {
  const parts: string[] = [];
  let specific = false;
  const prize = noPrize ? undefined : title.match(PRIZE)?.[1];
  if (prize) { parts.push(prize); specific = true; }
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
    if (!parts.includes(t)) { parts.push(t); specific = true; }
  }
  return parts.length ? { text: parts.slice(0, 2).join(", "), specific } : undefined;
}

// the parser's label is language-neutral ("2,000 USDC"); amounts under 10K get the reader's format ("2 000 USDC"),
// bigger ones keep the compact K/M form
const poolLabel = (r: NonNullable<Promo["reward"]>, lang: L) => (r.amount > 0 && r.amount < 1e4 ? money(r.amount, r.unit, lang) : r.label);
const VAGUE = /\b(limited[- ]time|exclusive|special|rewards?|benefits?|perks?|offers?|bonanza|new and existing|all users|everyone)\b/i;
const FRAG = /^(don'?t miss|do not miss|maximum reward|max(imum)? (prize|reward)s?\s*:|breakdown|what'?s more|here'?s (how|what)|plus[,:]|also[,:]|in addition|on top of that|for this occasion|to celebrate (this|the)|join us|read more|details)\b|[:…]\s*$/i;
const cyr = (s: string) => /[а-яіїєґё]/i.test(s);

export function titleOf(p: Promo, lang: L): string | undefined {
  const m = p.meta ?? {};
  if (p.category === "farming" || p.venue.kind === "airdrop") return undefined;
  const head = p.titleOrig ?? p.title;
  // audit 14.11: "Earn: USDG → +4.25% APR" paired the wrong coin with the wrong rate in a headline listing several —
  // an Earn headline with several coins or rates keeps its own (translated) wording; APY stays APY, "up to" stays
  const rates = head.match(/\d+(?:\.\d+)?\s?%/g) ?? [];
  const many = p.category === "earn" && (new Set(rates).size > 1 || (head.match(/\b[A-Z][A-Z0-9]{1,9}\b(?=\s*(?:,|、|&|and|\/))/g) ?? []).length > 0);
  if (many && showHeadline(p, lang)) return undefined;
  const apy = /\bAPY\b/.test(head) && !/\bAPR\b/.test(head) ? "APY" : "APR";
  const upTo = /\bup to\b/i.test(head) ? ({ uk: "до ", en: "up to ", ru: "до " } as const)[lang] : "";
  // audit 23.11: an Earn product is about its rate — "USDT до 10% APR" lost the 10 % when a per-person cap existed;
  // rates use the reader's decimal comma (4,25 %), like the translated headline next to them
  const rate = m.aprPct !== undefined ? `${upTo || "+"}${num(m.aprPct, lang)}% ${apy}` : undefined;
  const much = p.category === "earn" && rate ? rate
    : m.perUser ? PER[lang](money(m.perUser.amount, m.perUser.unit, lang))
    : rate ?? (p.reward ? POOL[lang](poolLabel(p.reward, lang)) : undefined);
  const what = m.minEntry ? DO[lang][m.minEntry.kind](money(m.minEntry.amount, m.minEntry.unit, lang)) : m.noDeposit ? FREE[lang] : undefined;
  // an iPhone in an Earn headline is a side prize, not what the product pays
  const sj = subject(head, lang, p.venue.name, p.category === "earn");
  // only a product word ("Змагання: WSOT", "Аірдроп: ф'ючерси") says less than the translated headline (audit 14.11)
  const subj = sj && (sj.specific || much || !showHeadline(p, lang)) ? sj.text : undefined;
  // audit 12.11: "Змагання → фонд 1M USDC" says nothing the reward line doesn't — when we can't name the subject
  // and the headline reads in this language ("Binance Pick: прогнозуйте…"), the headline is the better title
  // audit 23.11: "Акція: спот" said nothing — a 0% fee offer is named as one
  const K = m.zeroFee && p.category === "other" ? ({ uk: "0% комісії", en: "0% fees", ru: "0% комиссии" } as const)[lang] : KIND[lang][p.category];
  // owner 23.11: a headline that names nothing ("Limited-time rewards, open to both new and existing users") is not a
  // better title than the facts — the subject comes from the entry rule ("copy trading") and the amount leads
  if (!subj && much && VAGUE.test(head) && !/\d|\$|\b[A-Z]{2,10}\b/.test(head)) {
    const s2 = subject(m.minEntry?.text ?? "", lang, p.venue.name, true)?.text;
    return `${s2 ? `${K}: ${s2}` : what ?? K} → ${much}`;
  }
  // audit 23.11: headlines cut from the middle of a post ("Don't miss rewards of up to $2,098", "Maximum reward: XAUT worth
  // $5,000.", "For this occasion we prepared even more prizes:") are not titles — the facts are
  if (!subj && (much || what) && FRAG.test(head.trim())) return much ? `${what ?? K} → ${much}` : `${K} · ${what}`;
  if (!subj && showHeadline(p, lang)) return undefined;
  const kind = subj ? `${K}: ${subj}` : K;
  if (much) return `${subj ? kind : what ?? kind} → ${much}`;
  if (what) return subj ? `${kind} · ${what}` : `${K} · ${what}`;
  if (subj) return kind;
  return undefined;   // nothing specific to say: the (translated) headline stays the title
}

/** Show the headline under our title only in the reader's language (a translation, or English on /en). */
export const showHeadline = (p: Promo, lang: L) => lang === "en" || cyr(p.title);
