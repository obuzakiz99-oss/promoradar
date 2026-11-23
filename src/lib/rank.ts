import type { Value } from "./value";

/** Sort key for "best first": expected net $, discounted by how unsure we are; unknown values sit between weak and good ones. Client-safe. */
export function rankOf(v?: Value): number {
  if (!v || v.net === undefined) return 5;
  return v.net * (v.conf === "high" ? 1 : v.conf === "mid" ? 0.6 : 0.3);
}

/**
 * audit 23.11 (beginner persona): the default "Найвигідніші" list opened with a Toobit futures contest and an HTX referral —
 * the most a typical person can get is not the same as what suits them. Futures, rankings, referrals and big entry
 * thresholds sink; no-deposit, new-user and cash offers rise.
 */
export function friendlyRank(p: { category: string; meta?: { value?: Value; futures?: boolean; noDeposit?: boolean; forNew?: boolean; minEntry?: { amount: number }; payout?: { form?: string } } }): number {
  const m = p.meta ?? {};
  let k = 1;
  if (m.futures) k *= 0.5;
  if (p.category === "referral") k *= 0.5;
  if (p.category === "competition") k *= 0.6;
  if ((m.minEntry?.amount ?? 0) > 500) k *= 0.6;
  if (m.noDeposit) k *= 1.3;
  if (m.forNew) k *= 1.2;
  if (m.payout?.form === "cash") k *= 1.1; else if (m.payout?.form === "voucher" || m.payout?.form === "points") k *= 0.8;
  return rankOf(m.value) * k;
}
