import { collectAll, type Collected } from "./sources";
import { VENUES, SPONSORED, venueOf } from "@/config/site";
import { parseReward } from "./parse";
import type { Promo, Venue } from "./types";

/** All live promos (exchange & DeFi feeds + paid placements). */
export async function getPromos(): Promise<Collected> {
  const data = await collectAll();
  const now = Date.now();
  const sponsored: Promo[] = SPONSORED.filter((s) => new Date(s.until).getTime() > now).map((s) => {
    return {
      id: s.id, venue: venueOf(s.venue), title: s.title, url: s.url, joinUrl: VENUES[s.venue].refUrl || undefined, category: s.category,
      publishedAt: now, endsAt: new Date(s.until).getTime(), reward: s.reward ? parseReward(s.reward) : undefined, tags: [], sponsored: true,
    };
  });
  return { ...data, promos: [...sponsored, ...data.promos] };
}

/** Sum of prize pools denominated in dollars/stablecoins. */
export function totalUsd(promos: Promo[]): number {
  return promos.reduce((s, p) => s + (p.reward?.usd ?? 0), 0);
}

/** Most active venues with logos (for the hero radar): CEX first, then DEX/DeFi. */
export function topVenues(promos: Promo[], n = 8): Venue[] {
  const m = new Map<string, { v: Venue; c: number }>();
  for (const p of promos) {
    if (p.venue.kind === "airdrop") continue;
    const e = m.get(p.venue.id);
    e ? e.c++ : m.set(p.venue.id, { v: p.venue, c: 1 });
  }
  const all = [...m.values()].sort((a, b) => b.c - a.c);
  const cex = all.filter((x) => x.v.kind === "cex").slice(0, 5);
  const rest = all.filter((x) => x.v.kind !== "cex" && x.v.logo).slice(0, n - cex.length);
  return [...cex, ...rest].map((x) => x.v);
}
