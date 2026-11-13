import type { Value } from "./value";

/** Sort key for "best first": expected net $, discounted by how unsure we are; unknown values sit between weak and good ones. Client-safe. */
export function rankOf(v?: Value): number {
  if (!v || v.net === undefined) return 5;
  return v.net * (v.conf === "high" ? 1 : v.conf === "mid" ? 0.6 : 0.3);
}
