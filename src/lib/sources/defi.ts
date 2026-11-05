import { BLOCKLIST, DEX, DEX_FEEDS, venueOf } from "@/config/site";
import type { Promo, Venue, VenueKind } from "../types";
import { cached, decodeEntities, getJson, getText, parseRss } from "./util";
import { llamaRaw } from "../dexpools";
import { isPromo, classify, parseReward, cleanTitle } from "../parse";

const blocked = (s: string) => BLOCKLIST.some((b) => s.toLowerCase().includes(b));

/** Deterministic brand-ish colour for venues without a configured one. */
export function autoVenue(id: string, name: string, kind: VenueKind, logo?: string): Venue {
  let h = 0; for (const c of id) h = (h * 31 + c.charCodeAt(0)) % 360;
  const words = name.replace(/[^A-Za-z0-9 ]/g, "").split(/\s+/).filter(Boolean);
  const monogram = (words.length > 1 ? words[0][0] + words[1][0] : name.slice(0, 2)).toUpperCase().slice(0, 2) || "?";
  return { id, name, kind, color: `hsl(${h} 70% 62%)`, ink: "#0b0d10", monogram, logo };
}

/* ---------- DEX / DeFi official blogs (Medium RSS) ---------- */
export async function dexBlogs(): Promise<{ promos: Promo[]; status: Record<string, { ok: boolean; count: number; error?: string }> }> {
  const status: Record<string, { ok: boolean; count: number; error?: string }> = {};
  const promos: Promo[] = [];
  const res = await Promise.allSettled(DEX_FEEDS.map((f) => getText(f.feed, 15_000)));
  const now = Date.now();
  res.forEach((r, i) => {
    const f = DEX_FEEDS[i];
    const key = `blog:${f.venue}`;
    if (r.status === "rejected") { status[key] = { ok: false, count: 0, error: String(r.reason).slice(0, 120) }; return; }
    let n = 0;
    for (const it of parseRss(r.value)) {
      const title = cleanTitle(it.title);
      if (!isPromo(title) || now - it.date > 45 * 86400_000) continue;
      promos.push({ id: `${f.venue}:${it.link}`, venue: venueOf(f.venue), title, url: it.link, joinUrl: DEX[f.venue].site, category: classify(title), publishedAt: it.date, reward: parseReward(title), tags: [], meta: { source: "Medium" } });
      n++;
    }
    status[key] = { ok: true, count: n };
  });
  return { promos, status };
}

/* ---------- Lighter: official announcements API (title + content + created/expired) ---------- */
export async function lighter(): Promise<Promo[]> {
  const j = await getJson<{ announcements: Array<{ title: string; content: string; created_at: number; expired_at?: number }> }>(
    "https://mainnet.zklighter.elliot.ai/api/v1/announcement",
  );
  const venue = venueOf("lighter"), site = DEX.lighter.site;
  return (j.announcements ?? [])
    .filter((a) => isPromo(`${a.title} ${a.content}`) && !/delist|network upgrade|market update|listing/i.test(a.title))
    .map((a) => {
      const text = `${a.title}: ${a.content}`.replace(/\s+/g, " ");
      const title = cleanTitle(a.content.length < 140 ? text : `${a.title}: ${a.content.split(/(?<=[.!])\s/)[0]}`);
      return {
        id: `lighter:${a.created_at}`, venue, title, url: "https://app.lighter.xyz", joinUrl: site,
        category: classify(text), publishedAt: a.created_at * 1000, reward: parseReward(text), tags: [],
      } satisfies Promo;
    });
}

/* ---------- DefiLlama: pools that pay incentive rewards (liquidity mining / lending incentives) ---------- */
const FARM_CATEGORIES = new Set(["Dexs", "Lending", "Yield", "Derivatives", "Liquid Staking", "CDP", "Yield Aggregator", "Liquidity manager", "Restaking", "Basis Trading", "RWA"]);

export async function farming(): Promise<Promo[]> {
  return cached("llama-farming", 60 * 60_000, async () => {
    const { pools, protocols } = await llamaRaw();
    const proto = new Map<string, any>(protocols.map((p: any) => [p.slug, p]));
    const best = new Map<string, any>();
    for (const p of pools) {
      const pr = proto.get(p.project);
      if (!pr || !FARM_CATEGORIES.has(pr.category) || blocked(p.project) || blocked(pr.name)) continue;
      const apr = p.apyReward ?? 0;
      if (!(apr >= 1.5 && apr <= 150) || p.tvlUsd < 3e6 || p.outlier) continue;
      const family = String(pr.parentProtocol || p.project).replace(/^parent#/, "");
      const score = apr * Math.log10(p.tvlUsd);
      const cur = best.get(family);
      if (!cur || score > cur.score) best.set(family, { p, pr, family, score });
    }
    const now = Date.now();
    return [...best.values()].sort((a, b) => b.score - a.score).slice(0, 48).map(({ p, pr, family }) => {
      const name = String(pr.name).replace(/\s+(V\d+|CLMM|AMM|Slipstream|Lend(ing)?)$/i, "");
      const kind: VenueKind = pr.category === "Dexs" ? "dex" : "defi";
      return {
        id: `llama:${p.pool}`,
        venue: autoVenue(family, name, kind, pr.logo ? `${pr.logo}?w=64&h=64` : undefined),
        title: `${p.symbol}${p.poolMeta ? ` · ${p.poolMeta}` : ""}`,
        url: `https://defillama.com/yields/pool/${p.pool}`,
        joinUrl: pr.url,
        category: "farming" as const,
        publishedAt: 0,
        evergreen: true,
        tags: [p.chain, p.stablecoin ? "stable" : ""].filter(Boolean),
        meta: { source: "DefiLlama", apr: +Number(p.apyReward).toFixed(2), baseApr: p.apyBase ? +p.apyBase.toFixed(2) : undefined, tvlUsd: p.tvlUsd, chain: p.chain, symbol: p.symbol },
      } satisfies Promo;
    });
  });
}

/* ---------- airdrops.io: latest live airdrop campaigns (public list page) ---------- */
export async function airdrops(): Promise<Promo[]> {
  const html = await getText("https://airdrops.io/latest/", 15_000);
  const cards = [...html.matchAll(/<article\s+id="post-\d+"\s+class="([^"]*airdrop-click[^"]*)"([^>]*)>([\s\S]*?)<\/article>/g)];
  const ymd = (s?: string) => (s && /^\d{8}/.test(s) ? Date.UTC(+s.slice(0, 4), +s.slice(4, 6) - 1, +s.slice(6, 8), +(s.slice(8, 10) || 0), +(s.slice(10, 12) || 0)) : 0);
  const out: Promo[] = [];
  for (const [, cls, attrs, body] of cards) {
    if (!/\bongoing\b/.test(cls)) continue;
    const attr = (k: string) => attrs.match(new RegExp(`data-${k}="([^"]*)"`))?.[1];
    const name = decodeEntities(body.match(/<h3>([^<]+)<\/h3>/)?.[1] ?? "").trim();
    const link = body.match(/class="card-link-overlay" href="([^"]+)"/)?.[1] ?? body.match(/<a href=([^ >]+)><h3>/)?.[1]?.replace(/"/g, "");
    if (!name || !link || blocked(name)) continue;
    const actions = decodeEntities(body.match(/Actions:\s*<span>([^<]+)<\/span>/)?.[1] ?? "").trim();
    const logo = body.match(/data-src="([^"]+)"/)?.[1];
    const req = ["telegram", "twitter", "email-address", "discord", "kyc", "phone"].filter((k) => attr(`${k}-required`) === "1")
      .map((k) => ({ twitter: "x", "email-address": "email" } as Record<string, string>)[k] ?? k);
    const slug = link.split("/").filter(Boolean).pop()!;
    out.push({
      id: `airdrops.io:${slug}`,
      venue: autoVenue(`ad-${slug}`, name, "airdrop", logo),
      title: name,
      url: link,
      category: "airdrop",
      publishedAt: ymd(attr("published")),
      startsAt: ymd(attr("start")) || undefined,
      tags: [],
      meta: { source: "airdrops.io", actions, requires: req, confirmed: /\bconfirmed\b/.test(cls), hot: Number(attr("temperature") || 0) },
    });
  }
  return out;
}
