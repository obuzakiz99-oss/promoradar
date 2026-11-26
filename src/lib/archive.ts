import path from "node:path";
import { readStore, writeStore } from "./store";
import { slugOf } from "./slug";
import { fixWording } from "./format";
import type { Category, Promo } from "./types";

/**
 * Audit 23.11: a promo page went 404 the build after the promo disappeared, so shared links, search results and ★ on
 * /my/ led to nowhere. Every build records the promos it showed; one that is gone keeps its page for KEEP_DAYS as
 * "this promo has ended" with live promos of the same exchange (data/ended.json on the `data` branch).
 */
export interface Ended {
  id: string; slug: string; venue: string; category: Category; url: string;
  title: string; titles: { uk?: string; ru?: string };
  lastSeen: number;
}
const FILE = () => path.join(process.cwd(), "data", "ended.json");
const KEEP_DAYS = 90;

let MEM: Record<string, Ended> | null = null;
let OK = true;
function load(): Record<string, Ended> {
  if (MEM) return MEM;
  const r = readStore<Record<string, Ended>>(FILE(), {});
  OK = r.ok; MEM = r.data;
  return MEM;
}

/** Called once per collection: remember what is live now (with its uk/ru titles), drop very old entries, save. */
export function recordLive(promos: Promo[], i18n?: Partial<Record<"uk" | "ru", Record<string, string>>>): void {
  const db = load();
  const now = Date.now();
  for (const p of promos) {
    if (p.id.startsWith("llama:")) continue;   // DeFi pools come and go hourly — not promo pages people share
    db[slugOf(p)] = {
      id: p.id, slug: slugOf(p), venue: p.venue.id, category: p.category, url: p.url, title: p.title,
      titles: { uk: i18n?.uk?.[p.title.trim()], ru: i18n?.ru?.[p.title.trim()] }, lastSeen: now,
    };
  }
  for (const [k, e] of Object.entries(db)) if (now - e.lastSeen > KEEP_DAYS * 86400_000) delete db[k];
  writeStore(FILE(), db, OK);
}

/** Promos that were on the site in the last KEEP_DAYS but are not live now. */
export function endedPromos(live: Promo[]): Ended[] {
  const liveSlugs = new Set(live.map((p) => slugOf(p)));
  const liveIds = new Set(live.map((p) => p.id));
  // titles were stored by older builds — run them through today's wording fixes (26.11: bare "Lucky Draw" without «»)
  return Object.values(load()).filter((e) => !liveSlugs.has(e.slug) && !liveIds.has(e.id))
    .map((e) => ({ ...e, titles: { uk: e.titles?.uk && fixWording(e.titles.uk, "uk"), ru: e.titles?.ru && fixWording(e.titles.ru, "ru") } }));
}

export function endedBySlug(live: Promo[], slug: string): Ended | undefined {
  const h = slug.split("-")[0];   // the title part of a slug can change; the hash of the id does not
  return endedPromos(live).find((e) => e.slug.split("-")[0] === h);
}
