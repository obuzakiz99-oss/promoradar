import type { MetadataRoute } from "next";
export const dynamic = "force-static";
import { SITE, VENUES } from "@/config/site";
import { LOCALES } from "@/lib/i18n";
import { getPromos } from "@/lib/promos";
import { slugOf } from "@/lib/slug";
import { getTokens } from "@/lib/tokens";
import { getPools, lpPaged, lpSlug } from "@/lib/pools";
import { GUIDE_IDS } from "@/lib/guides";

export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = `https://${SITE.domain}`;
  const { promos } = await getPromos();
  const { tokens } = await getTokens();
  const lps = lpPaged(await getPools());
  const out: MetadataRoute.Sitemap = [];
  for (const l of LOCALES) {
    out.push({ url: `${base}/${l}`, changeFrequency: "hourly", priority: l === "uk" ? 1 : 0.9 });
    for (const s of ["launchpools", "earn", "dex", "best", "calendar", "bonuses", "history", "hedge", "learn", "learn/start", "learn/how", "learn/safety", "learn/rewards", "check", "learn/quiz", "learn/glossary", "fixed", "insights", "drops", "unlocks", "about", "privacy", "terms", "api"])
      out.push({ url: `${base}/${l}/${s}`, changeFrequency: s.startsWith("learn") ? "weekly" : "hourly", priority: s.startsWith("learn") ? 0.6 : 0.8 });
    for (const id of Object.keys(VENUES)) out.push({ url: `${base}/${l}/v/${id}`, changeFrequency: "hourly", priority: 0.7 });
    out.push({ url: `${base}/${l}/t`, changeFrequency: "hourly", priority: 0.8 });
    for (const id of GUIDE_IDS) out.push({ url: `${base}/${l}/learn/guide/${id}`, changeFrequency: "weekly", priority: 0.6 });
    // exchange rating hidden for now (owner, 12.11): page kept, not linked or listed
    // out.push({ url: `${base}/${l}/exchanges`, changeFrequency: "hourly", priority: 0.8 });
    for (const sym of tokens.keys()) out.push({ url: `${base}/${l}/t/${sym}`, changeFrequency: "hourly", priority: 0.7 });
    for (const p of lps) out.push({ url: `${base}/${l}/lp/${lpSlug(p)}`, changeFrequency: "hourly", priority: 0.7 });
    for (const p of promos) out.push({ url: `${base}/${l}/p/${slugOf(p)}`, lastModified: p.publishedAt ? new Date(p.publishedAt) : undefined, changeFrequency: "daily", priority: 0.6 });
  }
  // trailing slash = the canonical URL (trailingSlash export); without it every sitemap line was a 301 hop
  return out.map((e) => ({ ...e, url: e.url.endsWith("/") ? e.url : `${e.url}/` }));
}
