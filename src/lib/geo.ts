import type { Promo } from "./types";

export type Country = "any" | "ua" | "eu";

/** Regions whose "exclusive" promos may include each country (CEE/CIS lists usually include Ukraine). */
const OK_FOR: Record<Exclude<Country, "any">, RegExp> = { ua: /^(CEE|CIS.*|Europe|Ukraine|region)$/i, eu: /^(CEE|CIS & CEE|Europe|EEA|region)$/i };
export function geoAllowed(p: Promo, c: Country): boolean {
  const g = p.meta?.geo;
  if (!g || c === "any") return true;
  if (c === "ua" && g.noUA) return false;
  if (c === "eu" && g.noEU) return false;
  return !g.only || OK_FOR[c].test(g.only);
}
