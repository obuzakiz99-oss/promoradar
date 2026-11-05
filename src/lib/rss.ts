import { getPromos } from "./promos";
import { getDict, type Locale } from "./i18n";
import { slugOf } from "./slug";
import { SITE } from "@/config/site";

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/** RSS 2.0 feed of the newest dated promos for one language. */
export async function rssResponse(lang: Locale): Promise<Response> {
  const t = getDict(lang);
  const base = `https://${SITE.domain}`;
  const { promos } = await getPromos();
  const items = promos.filter((p) => p.publishedAt > 0).slice(0, 60).map((p) => `
    <item>
      <title>${esc(`${p.venue.name}: ${p.title}`)}</title>
      <link>${base}/${lang}/p/${slugOf(p)}/</link>
      <guid isPermaLink="false">${esc(p.id)}</guid>
      <pubDate>${new Date(p.publishedAt).toUTCString()}</pubDate>
      <category>${esc(t.cat[p.category])}</category>
      <description>${esc([t.cat[p.category], p.reward?.label].filter(Boolean).join(" · "))}</description>
    </item>`).join("");
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>${esc(`${SITE.name} — ${t.hero.title1} ${t.hero.title2}`)}</title>
    <link>${base}/${lang}/</link>
    <description>${esc(t.hero.sub)}</description>
    <language>${lang}</language>${items}
  </channel>
</rss>`;
  return new Response(xml, { headers: { "Content-Type": "application/rss+xml; charset=utf-8" } });
}
