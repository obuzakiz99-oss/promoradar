import type { MetadataRoute } from "next";
import { SITE, VENUES } from "@/config/site";
import { LOCALES } from "@/lib/i18n";
import { getPromos } from "@/lib/promos";
import { slugOf } from "@/lib/slug";

export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = `https://${SITE.domain}`;
  const { promos } = await getPromos();
  const out: MetadataRoute.Sitemap = [];
  for (const l of LOCALES) {
    out.push({ url: `${base}/${l}`, changeFrequency: "hourly", priority: l === "uk" ? 1 : 0.9 });
    for (const id of Object.keys(VENUES)) out.push({ url: `${base}/${l}/v/${id}`, changeFrequency: "hourly", priority: 0.7 });
    for (const p of promos) out.push({ url: `${base}/${l}/p/${slugOf(p)}`, lastModified: p.publishedAt ? new Date(p.publishedAt) : undefined, changeFrequency: "daily", priority: 0.6 });
  }
  return out;
}
