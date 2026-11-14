/**
 * Canonical + language alternates for a page (audit 14.11: pages without their own canonical inherited the home
 * page's, so Google saw ~50 pages as duplicates of /uk/). `path` is the route after the language, e.g. "/dex".
 */
export function alt(lang: string, path = "") {
  const p = `${path.replace(/\/+$/, "")}/`;
  return { canonical: `/${lang}${p}`, languages: { uk: `/uk${p}`, en: `/en${p}`, ru: `/ru${p}`, "x-default": `/en${p}` } };
}
