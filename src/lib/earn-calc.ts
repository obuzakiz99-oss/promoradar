import type { EarnOffer } from "./earn";

/**
 * Yearly income in the coin for `qty` coins (client-safe: no fetch code). audit 28.11 (sections): the boosted tier was
 * ignored — Bitget USDT "4% до 6% · ≤ 300K" showed +3,33 USDT/міс on 1 000 USDT instead of +5,00. The first `tierMax`
 * coins earn `aprMax`, the rest the base `apr`; with no numeric tier limit the base rate is used (as before).
 */
export function earnYear(o: Pick<EarnOffer, "apr" | "aprMax" | "tierMax">, qty: number): number {
  if (qty <= 0) return 0;
  if (!o.aprMax || !o.tierMax || o.tierMax <= 0) return (qty * o.apr) / 100;
  const boosted = Math.min(qty, o.tierMax);
  return (boosted * o.aprMax + (qty - boosted) * o.apr) / 100;
}
