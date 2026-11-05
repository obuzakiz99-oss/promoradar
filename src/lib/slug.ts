import type { Promo } from "./types";

/** Short stable hash (FNV-1a, base36). */
export function hash(s: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193); }
  return (h >>> 0).toString(36);
}

const kebab = (s: string) =>
  s.normalize("NFKD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 64).replace(/-+$/, "");

/** URL slug for a promo: "<hash>-<venue>-<title-words>". */
export function slugOf(p: Promo): string {
  const text = p.title.toLowerCase().startsWith(p.venue.name.toLowerCase()) ? p.title : `${p.venue.name} ${p.title}`;
  return `${hash(p.id)}-${kebab(p.venue.kind === "airdrop" ? `${text} airdrop` : text) || "promo"}`;
}

export function findBySlug(promos: Promo[], slug: string): Promo | undefined {
  const h = slug.split("-")[0];
  return promos.find((p) => hash(p.id) === h);
}

export type Status = "live" | "upcoming" | "ending" | "ongoing";
/** live = running, upcoming = starts later, ending = ends within 3 days, ongoing = evergreen programme. */
export function statusOf(p: Promo, now: number): Status {
  if (p.startsAt && p.startsAt > now) return "upcoming";
  if (p.endsAt && p.endsAt - now < 3 * 86400_000) return "ending";
  if (p.evergreen) return "ongoing";
  return "live";
}
