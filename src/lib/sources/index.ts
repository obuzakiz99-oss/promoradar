import type { Promo } from "../types";
import type { PromoDetails } from "../details";
import { classify, cleanTitle, isPromo, parseReward } from "../parse";
import { CEX, DEX, DEX_FEEDS, SITE, TELEGRAM, VENUES, venueOf } from "@/config/site";
import { CEX_SOURCES, type Raw } from "./cex";
import { airdrops, dexBlogs, farming, lighter, ondoPerps } from "./defi";
import { telegram } from "./telegram";

export type SourceStatus = { ok: boolean; count: number; error?: string; name: string; kind: string; via: string };
export interface Collected {
  promos: Promo[]; status: Record<string, SourceStatus>; fetchedAt: number; details?: Record<string, PromoDetails>;
  i18n?: Record<"uk" | "ru", Record<string, string>>;   // original text → translation
  faq?: Record<string, import("../faq").Faq>;   // promo id → AI-written explainer (faq.ts)
}

function fromRaw(r: Raw): Promo | null {
  const title = cleanTitle(r.title);
  if (!r.trusted && !isPromo(title)) return null;
  return {
    id: `${r.venue}:${r.id}`, venue: venueOf(r.venue), title, url: r.url, joinUrl: CEX[r.venue].refUrl || undefined,
    category: classify(title, r.hint), publishedAt: r.publishedAt,
    startsAt: r.startsAt && r.startsAt !== r.endsAt ? r.startsAt : undefined,
    endsAt: r.endsAt && r.endsAt > r.publishedAt + 3600_000 ? r.endsAt : undefined,
    reward: parseReward(title), tags: r.tags ?? [],
  };
}

/** Normalised headline used to drop the same promo coming from two sources (e.g. API + Telegram). */
const sig = (p: Promo) => `${p.venue.id}|${p.title.toLowerCase().replace(/[^a-z0-9]+/g, "").slice(0, 28)}`;

export async function collectAll(): Promise<Collected> {
  const now = Date.now();
  const status: Record<string, SourceStatus> = {};
  const promos: Promo[] = [];
  const seen = new Set<string>();
  // the same campaign from the API and from Telegram often has a different headline but the same exchange + prize pool
  const pools = new Map<string, number>();
  const poolSig = (p: Promo) => (p.reward && p.reward.amount >= 100 ? `${p.venue.id}|${p.reward.amount}|${p.reward.unit}` : "");
  const keep = (p: Promo) => {
    const s = sig(p);
    if (seen.has(p.id) || seen.has(s)) return false;
    const ps = poolSig(p);
    if (ps && pools.has(ps) && Math.abs(pools.get(ps)! - p.publishedAt) < 5 * 86400_000) return false;
    if (ps) pools.set(ps, p.publishedAt);
    if (p.endsAt && p.endsAt < now) return false;
    if (!p.evergreen && !p.endsAt && p.publishedAt && now - p.publishedAt > SITE.freshDays * 86400_000) return false;
    seen.add(p.id); seen.add(s); promos.push(p); return true;
  };
  const settle = <T,>(pr: Promise<T>) => pr.then((v) => ({ ok: true as const, v }), (e) => ({ ok: false as const, e }));

  const cexIds = Object.keys(CEX_SOURCES);
  const [cexRes, dex, farm, drops, lit, tg, ondo] = await Promise.all([
    Promise.allSettled(cexIds.map((id) => CEX_SOURCES[id]!())),
    dexBlogs(),
    settle(farming()),
    settle(airdrops()),
    settle(lighter()),
    telegram(),
    settle(ondoPerps()),
  ]);

  // 1) direct exchange APIs (most precise: dates, ids) go first so they win de-duplication
  cexRes.forEach((r, i) => {
    const id = cexIds[i];
    const st: SourceStatus = { ok: r.status === "fulfilled", count: 0, name: CEX[id].name, kind: "cex", via: "API" };
    if (r.status === "rejected") st.error = String(r.reason).slice(0, 160);
    else for (const raw of r.value) { const p = fromRaw(raw); if (p && keep(p)) st.count++; }
    status[id] = st;
  });
  // 2) official APIs of DEXes
  status["api:lighter"] = { ok: lit.ok, count: lit.ok ? lit.v.filter(keep).length : 0, error: lit.ok ? undefined : String(lit.e).slice(0, 160), name: "Lighter", kind: "dex", via: "API" };
  status["web:ondoperps"] = { ok: ondo.ok, count: ondo.ok ? ondo.v.filter(keep).length : 0, error: ondo.ok ? undefined : String(ondo.e).slice(0, 160), name: "Ondo Perps", kind: "dex", via: "Web" };
  // 3) official Telegram channels
  for (const c of TELEGRAM) {
    const key = `tg:${c.channel}`;
    const s = tg.status[key];
    const n = tg.promos.filter((p) => p.id.toLowerCase().startsWith(`tg:${c.channel.toLowerCase()}/`) && keep(p)).length;
    status[key] = { ok: !!s?.ok, count: n, error: s?.error, name: VENUES[c.venue].name, kind: VENUES[c.venue].kind, via: "Telegram" };
  }
  // 4) official blogs
  for (const f of DEX_FEEDS) {
    const key = `blog:${f.venue}`;
    const n = dex.promos.filter((p) => p.venue.id === f.venue && keep(p)).length;
    status[key] = { ok: !!dex.status[key]?.ok, count: n, error: dex.status[key]?.error, name: DEX[f.venue].name, kind: DEX[f.venue].kind, via: "Blog" };
  }
  // 5) open data
  status.defillama = { ok: farm.ok, count: farm.ok ? farm.v.filter(keep).length : 0, error: farm.ok ? undefined : String(farm.e).slice(0, 160), name: "DefiLlama · Yields", kind: "defi", via: "Open data" };
  status.airdrops = { ok: drops.ok, count: drops.ok ? drops.v.filter(keep).length : 0, error: drops.ok ? undefined : String(drops.e).slice(0, 160), name: "airdrops.io", kind: "airdrop", via: "Web" };

  promos.sort((a, b) => b.publishedAt - a.publishedAt);
  return { promos, status, fetchedAt: now };
}
