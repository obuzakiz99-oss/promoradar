import type { Promo } from "./types";

/**
 * weekly audit 26.11: the "Аірдроп / Launchpool" label sat on a paid MEXC BTC Launchpad (you BUY the token there) —
 * a beginner reads "airdrop" as free. Token sales keep the airdrop group (filters, pages) but get their own label.
 */
const SALE = /\b(launchpad|token sale|\bieo\b|presale|pre-sale|subscription sale|launchx)\b/i;
const SALE_LABEL = { uk: "Launchpad — купівля токена", en: "Launchpad — token purchase", ru: "Launchpad — покупка токена" } as const;
export function catLabel(p: Promo, lang: string, cat: Record<string, string>): string {
  if (p.category === "airdrop" && SALE.test(p.titleOrig ?? p.title)) return SALE_LABEL[(lang in SALE_LABEL ? lang : "en") as keyof typeof SALE_LABEL];
  return cat[p.category];
}
