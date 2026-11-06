import fs from "node:fs";
import path from "node:path";
import { collectAll, type Collected } from "./sources";
import { VENUES, SPONSORED, venueOf } from "@/config/site";
import { parseReward } from "./parse";
import type { Promo, Venue } from "./types";

/** All live promos (exchange & DeFi feeds + paid placements). */
/**
 * During the static GitHub build every language page (and the build's worker processes) must see the SAME promo list —
 * otherwise a Telegram post appearing between the uk and en renders breaks the language links of promo pages.
 * So the first collection of a build is written to .next/cache/promos-build.json and reused for 20 minutes.
 */
export async function getPromos(): Promise<Collected> {
  if (process.env.GITHUB_PAGES === "1") {
    const file = path.join(process.cwd(), ".next", "cache", "promos-build.json");
    try {
      const st = fs.statSync(file);
      if (Date.now() - st.mtimeMs < 20 * 60_000) return JSON.parse(fs.readFileSync(file, "utf8")) as Collected;
    } catch { /* first call of this build */ }
    const fresh = await getPromosLive();
    try { fs.mkdirSync(path.dirname(file), { recursive: true }); fs.writeFileSync(file, JSON.stringify(fresh)); } catch { /* read-only fs: fine */ }
    return fresh;
  }
  return getPromosLive();
}

async function getPromosLive(): Promise<Collected> {
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
