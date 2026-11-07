import type { Dict } from "./i18n";

export function compactUsd(n: number): string {
  if (n >= 1e9) return `$${+(n / 1e9).toFixed(1)}B`;
  if (n >= 1e6) return `$${+(n / 1e6).toFixed(1)}M`;
  if (n >= 1e3) return `$${Math.round(n / 1e3)}K`;
  return `$${Math.round(n)}`;
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
  return new Date(ts).toLocaleDateString(locale === "uk" ? "uk-UA" : locale === "ru" ? "ru-RU" : "en-GB", { day: "numeric", month: "short" });
}

/** Word forms after a number: uk/ru [1, 2–4, 5+], en [1, many]. */
export const WORDS = {
  promo: { uk: ["акція", "акції", "акцій"], ru: ["акция", "акции", "акций"], en: ["promo", "promos", "promos"] },
  participant: { uk: ["учасник", "учасники", "учасників"], ru: ["участник", "участника", "участников"], en: ["participant", "participants", "participants"] },
  pool: { uk: ["пул", "пули", "пулів"], ru: ["пул", "пула", "пулов"], en: ["pool", "pools", "pools"] },
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
