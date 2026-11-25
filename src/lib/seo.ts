/**
 * Canonical + language alternates for a page (audit 14.11: pages without their own canonical inherited the home
 * page's, so Google saw ~50 pages as duplicates of /uk/). `path` is the route after the language, e.g. "/dex".
 */
export function alt(lang: string, path = "") {
  const p = `${path.replace(/\/+$/, "")}/`;
  return { canonical: `/${lang}${p}`, languages: { uk: `/uk${p}`, en: `/en${p}`, ru: `/ru${p}`, "x-default": p === "/" ? "/" : `/en${p}` } };   // audit 25.11: the root page is the language chooser
}

type Meta = { title?: unknown; description?: unknown; openGraph?: Record<string, unknown>; [k: string]: unknown };
/**
 * Page metadata with the page's own share card text (audit 14.11: every page inherited the home page's og:title /
 * og:description, so Telegram previews all looked the same). The image stays the site card unless the page sets one.
 */
export function withOg<T extends Meta>(m: T): T {
  const title = typeof m.title === "string" ? m.title : undefined;
  const description = typeof m.description === "string" ? m.description : undefined;
  if (!title) return m;
  return {
    ...m,
    openGraph: { type: "website", siteName: "PromoRadar", images: [{ url: "/og-home.png", width: 1200, height: 630 }], title, ...(description ? { description } : {}), ...(m.openGraph ?? {}) },
    twitter: { card: "summary_large_image", title, ...(description ? { description } : {}) },
  };
}
