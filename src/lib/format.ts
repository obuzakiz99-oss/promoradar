import type { Dict } from "./i18n";

export function compactUsd(n: number, lang = "en"): string {
  const s = n >= 1e9 ? `$${+(n / 1e9).toFixed(1)}B` : n >= 1e6 ? `$${+(n / 1e6).toFixed(1)}M` : n >= 1e3 ? `$${Math.round(n / 1e3)}K` : `$${Math.round(n)}`;
  return lang === "en" ? s : s.replace(".", ",");
}

/** "2д 4год" / "3год 12хв" / "18хв" */
export function duration(ms: number, t: Dict["time"]): string {
  const m = Math.max(0, Math.floor(ms / 60000));
  const d = Math.floor(m / 1440), h = Math.floor((m % 1440) / 60), mm = m % 60;
  if (d > 0) return `${d}${t.d} ${h}${t.h}`;
  if (h > 0) return `${h}${t.h} ${mm}${t.m}`;
  return `${mm}${t.m}`;
}

export function ago(ms: number, t: Dict["time"]): string {
  if (ms < 60_000) return t.justNow;
  return `${duration(ms, t)} ${t.ago}`;
}

export function shortDate(ts: number, locale: string): string {
  return new Date(ts).toLocaleDateString(locale === "uk" ? "uk-UA" : locale === "ru" ? "ru-RU" : "en-GB", { day: "numeric", month: "short", timeZone: "UTC" });
}

/** Word forms after a number: uk/ru [1, 2–4, 5+], en [1, many]. */
export const WORDS = {
  promo: { uk: ["акція", "акції", "акцій"], ru: ["акция", "акции", "акций"], en: ["promo", "promos", "promos"] },
  participant: { uk: ["учасник", "учасники", "учасників"], ru: ["участник", "участника", "участников"], en: ["participant", "participants", "participants"] },
  pool: { uk: ["пул", "пули", "пулів"], ru: ["пул", "пула", "пулов"], en: ["pool", "pools", "pools"] },
  protocol: { uk: ["протокол", "протоколи", "протоколів"], ru: ["протокол", "протокола", "протоколов"], en: ["protocol", "protocols", "protocols"] },
  chain: { uk: ["мережа", "мережі", "мереж"], ru: ["сеть", "сети", "сетей"], en: ["chain", "chains", "chains"] },
  product: { uk: ["продукт", "продукти", "продуктів"], ru: ["продукт", "продукта", "продуктов"], en: ["product", "products", "products"] },
} as const;
/** "2 акції", "5 акцій", "21 акція"; non-integers (3.5K) take the "many"/"few" form like Ukrainian grammar does. */
export function plural(n: number, lang: string, w: keyof typeof WORDS): string {
  const f = (WORDS[w] as Record<string, readonly string[]>)[lang] ?? WORDS[w].en;
  if (lang === "en") return n === 1 ? f[0] : f[1];
  if (!Number.isInteger(n)) return f[1];
  const a = Math.abs(n) % 100, b = a % 10;
  return a >= 11 && a <= 14 ? f[2] : b === 1 ? f[0] : b >= 2 && b <= 4 ? f[1] : f[2];
}
/** Language of a translated label ("акцій" → uk, "акций" → ru, else en) — for components that only receive labels. */
export const langOf = (label: string) => (/[іїєґ]/i.test(label) ? "uk" : /[ыэъё]|ий(\s|$)/i.test(label) ? "ru" : /[а-я]/i.test(label) ? "uk" : "en");

/** Intl locale for the site language (uk/ru: "50 000", en: "50,000"). */
export const nfLocale = (lang: string) => (lang === "en" ? "en-US" : lang === "ru" ? "ru-RU" : "uk-UA");
/** One number format for the whole site (audit 08.11): uk/ru — space between thousands ("50 000"), en — comma. */
export function num(n: number, lang: string, digits = 2): string {
  return new Intl.NumberFormat(lang === "en" ? "en-US" : lang === "ru" ? "ru-RU" : "uk-UA", { maximumFractionDigits: digits }).format(n);
}
/** APR for display: "45.2%", "1 250%"; a pool that has just opened shows Bitget-style 3 928 866% — capped at ">10 000%". */
export function aprText(x: number, lang: string, digits = 1): string {
  if (x >= 10_000) return `>${num(10_000, lang)}%`;
  return `${num(x >= 100 ? Math.round(x) : x, lang, x >= 100 ? 0 : digits)}%`;
}
/** Decimal comma for uk/ru in an already formatted string ("7.05%" → "7,05%"); audit 23.11: boards mixed "7.05%" with
 *  translated "4,25%". */
export const dec = (s: string, lang: string) => (lang === "en" ? s : s.replace(/(\d)\.(\d)/g, "$1,$2"));
/** AI texts in uk/ru: "$2,500" -> "$2 500", "1.5%" -> "1,5%" (dates like 16.11.2026 stay). */
export const localNums = (s: string, lang: string) => (lang === "en" ? s : s
  .replace(/\b([1-9]\d{0,2})((?:,\d{3})+)(?![,\d]|\s?%)/g, (_, a: string, b: string) => a + b.replace(/,/g, "\u00a0"))
  .replace(/(?<![.\d])(\d+)\.(\d+)(?![.\d])/g, "$1,$2"));
/** Money: "$50 000" for dollars, "50 000 USDT" for coins. */
export function money(n: number, unit: string, lang: string): string {
  return unit === "USD" ? `$${num(n, lang)}` : `${num(n, lang)} ${unit}`;
}

/** Exchange headlines without emoji (audit 12.11): lists show the text, the icons come from our own set. */
export const noEmoji = (s: string) => s.replace(/[\u{1F000}-\u{1FAFF}☀-➿⭐️‍]/gu, "").replace(/\s{2,}/g, " ").trim();

/** "ВАША ХВИЛЯ АІРДРОПІВ ПОЧИНАЄТЬСЯ ЗАРАЗ!" → "Ваша хвиля аірдропів починається зараз!" (any script); short Latin
 *  all-caps words stay as they are, they are tickers (USDT, BTC, KCS). Normal headlines are returned unchanged. */
export function sentenceCase(s: string): string {
  // a shouting part next to a calm one ("ЗНАЙДИ KCEX І ВИГРАЙ! — Час трохи пограти") is calmed on its own
  const parts = s.split(/(\s[—|]\s)/);
  if (parts.length > 1) return parts.map((x, i) => (i % 2 ? x : sentenceCase1(x, 8))).join("");
  return sentenceCase1(s, 12);
}
function sentenceCase1(s: string, min: number): string {
  const letters = s.match(/\p{L}/gu) ?? [];
  if (letters.length < min) return s;
  const upper = letters.filter((c) => c !== c.toLowerCase() && c === c.toUpperCase()).length;
  if (upper / letters.length < 0.7) return s;
  const low = s.replace(/\p{L}+/gu, (w) => (/^[A-Z0-9]{2,5}$/.test(w) ? w : w.toLowerCase()));
  return low.replace(/\p{L}/u, (c) => c.toUpperCase());
}

/** A source label in the reader's number format: "5,000 USDT" → "5 000 USDT" on uk/ru (audit 14.11: mixed formats). */
export const fmtLabel = (s: string, lang: string) => (lang === "en" ? s : s.replace(/\d{1,3}(?:,\d{3})+(?:\.\d+)?/g, (m) => Number(m.replace(/,/g, "")).toLocaleString(nfLocale(lang))));
