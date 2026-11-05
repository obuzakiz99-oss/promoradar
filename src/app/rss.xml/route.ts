import { getPromos } from "@/lib/promos";
import { getDict, isLocale, DEFAULT_LOCALE } from "@/lib/i18n";
import { slugOf } from "@/lib/slug";
import { SITE } from "@/config/site";

export const revalidate = 900;

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/** RSS 2.0 feed of the newest dated promos. /rss.xml?lang=uk|en|ru */
export async function GET(req: Request) {
  const l = new URL(req.url).searchParams.get("lang") ?? DEFAULT_LOCALE;
  const lang = isLocale(l) ? l : DEFAULT_LOCALE;
  const t = getDict(lang);
  const base = `https://${SITE.domain}`;
  const { promos } = await getPromos();
  const items = promos.filter((p) => p.publishedAt > 0).slice(0, 60).map((p) => `
    <item>
      <title>${esc(`${p.venue.name}: ${p.title}`)}</title>
      <link>${base}/${lang}/p/${slugOf(p)}</link>
      <guid isPermaLink="false">${esc(p.id)}</guid>
      <pubDate>${new Date(p.publishedAt).toUTCString()}</pubDate>
      <category>${esc(t.cat[p.category])}</category>
      <description>${esc([t.cat[p.category], p.reward?.label].filter(Boolean).join(" · "))}</description>
    </item>`).join("");
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>${esc(`${SITE.name} — ${t.hero.title1} ${t.hero.title2}`)}</title>
    <link>${base}/${lang}</link>
    <description>${esc(t.hero.sub)}</description>
    <language>${lang}</language>${items}
  </channel>
</rss>`;
  return new Response(xml, { headers: { "Content-Type": "application/rss+xml; charset=utf-8", "Cache-Control": "public, s-maxage=900" } });
}
