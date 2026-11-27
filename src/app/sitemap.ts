import type { MetadataRoute } from "next";
export const dynamic = "force-static";
import { SITE, VENUES } from "@/config/site";
import { LOCALES } from "@/lib/i18n";
import { getPromos } from "@/lib/promos";
import { slugOf } from "@/lib/slug";
import { tokenRich, getTokens } from "@/lib/tokens";
import { getPools, lpPaged, lpSlug } from "@/lib/pools";
import { GUIDE_IDS } from "@/lib/guides";
import { ARTICLE_IDS } from "@/lib/articles";

export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = `https://${SITE.domain}`;
  const { promos } = await getPromos();
  const { tokens } = await getTokens();
  const lps = lpPaged(await getPools());
  // audit 23.11 (SEO): Google ignores changefreq/priority; it reads lastmod
  // audit 25.11 (deep): lastmod was the build time on every page, so Google stops trusting it — now it is the real change:
  // data pages = the newest promo they show, text pages (guides, legal) = when their text last changed
  const now = new Date();
  const newest = new Date(Math.max(0, ...promos.map((p) => p.publishedAt || 0)) || now.getTime());
  const byVenue = (id: string) => { const t = Math.max(0, ...promos.filter((p) => p.venue.id === id).map((p) => p.publishedAt || 0)); return t ? new Date(t) : TEXT_DATE; };
  const TEXT_DATE = new Date("2026-11-25T00:00:00Z");
  const TEXT = new Set(["learn", "learn/start", "learn/how", "learn/safety", "learn/rewards", "check", "learn/quiz", "learn/glossary", "about", "privacy", "terms", "api", "hedge"]);
  const out: MetadataRoute.Sitemap = [{ url: `${base}/`, lastModified: newest }];
  for (const l of LOCALES) {
    out.push({ url: `${base}/${l}`, lastModified: newest });
    for (const s of ["launchpools", "earn", "dex", "calendar", "bonuses", "history", "hedge", "learn", "learn/start", "learn/how", "learn/safety", "learn/rewards", "check", "learn/quiz", "learn/glossary", "fixed", "drops", "zero-fees", "unlocks", "sales", "about", "privacy", "terms", "api"])
      out.push({ url: `${base}/${l}/${s}`, lastModified: TEXT.has(s) ? TEXT_DATE : newest });
    for (const id of Object.keys(VENUES)) out.push({ url: `${base}/${l}/v/${id}`, lastModified: byVenue(id) });
    out.push({ url: `${base}/${l}/t`, lastModified: newest });
    for (const id of GUIDE_IDS) out.push({ url: `${base}/${l}/learn/guide/${id}`, lastModified: TEXT_DATE });
    for (const id of ARTICLE_IDS) out.push({ url: `${base}/${l}/learn/a/${id}`, lastModified: new Date("2026-11-27T00:00:00Z") });   // search articles (27.11)
    // exchange rating hidden for now (owner, 12.11): page kept, not linked or listed
    // out.push({ url: `${base}/${l}/exchanges`, lastModified: now });
    for (const [sym, tk] of tokens) if (tokenRich(tk)) out.push({ url: `${base}/${l}/t/${sym}`, lastModified: newest });
    // audit 2: lastmod = the pool's start (it was the build time, changing every 30 min)
    for (const p of lps) out.push({ url: `${base}/${l}/lp/${lpSlug(p)}`, lastModified: p.start ? new Date(Math.min(p.start, now.getTime())) : newest });
    for (const p of promos) out.push({ url: `${base}/${l}/p/${slugOf(p)}`, lastModified: p.publishedAt ? new Date(p.publishedAt) : p.startsAt && p.startsAt < now.getTime() ? new Date(p.startsAt) : newest });
  }
  // trailing slash = the canonical URL (trailingSlash export); without it every sitemap line was a 301 hop
  return out.map((e) => ({ ...e, url: e.url.endsWith("/") ? e.url : `${e.url}/` }));
}
