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
