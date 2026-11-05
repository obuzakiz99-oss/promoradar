import { SITE } from "@/config/site";

export const UA = { "User-Agent": "Mozilla/5.0 (compatible; PromoRadar/1.0; +https://promoradar.example)", Accept: "application/json, text/html;q=0.9, application/xml;q=0.8, */*;q=0.5", "Accept-Language": "en-US,en;q=0.9" };

/** Small responses: use Next's fetch cache (ISR). */
export async function getJson<T = any>(url: string, timeout = 12_000): Promise<T> {
  const r = await fetch(url, { headers: UA, next: { revalidate: SITE.revalidateSeconds }, signal: AbortSignal.timeout(timeout) });
  if (!r.ok) throw new Error(`${r.status} ${url}`);
  return r.json() as Promise<T>;
}
export async function getText(url: string, timeout = 12_000): Promise<string> {
  const r = await fetch(url, { headers: UA, next: { revalidate: SITE.revalidateSeconds }, signal: AbortSignal.timeout(timeout) });
  if (!r.ok) throw new Error(`${r.status} ${url}`);
  return r.text();
}

/** Big responses (> 2 MB can't go into Next's fetch cache): keep the processed result in memory. */
const memo = new Map<string, { at: number; value: Promise<unknown> }>();
export function cached<T>(key: string, ttlMs: number, fn: () => Promise<T>): Promise<T> {
  const hit = memo.get(key);
  if (hit && Date.now() - hit.at < ttlMs) return hit.value as Promise<T>;
  const value = fn().catch((e) => { memo.delete(key); throw e; });
  memo.set(key, { at: Date.now(), value });
  return value;
}
export async function getBigJson<T = any>(url: string, timeout = 30_000): Promise<T> {
  // Next skips its data cache for bodies > 2 MB (harmless warning); our in-memory `cached()` covers it.
  // We still pass `revalidate` (not `no-store`) so routes stay ISR instead of turning fully dynamic.
  const r = await fetch(url, { headers: UA, next: { revalidate: 3600 }, signal: AbortSignal.timeout(timeout) });
  if (!r.ok) throw new Error(`${r.status} ${url}`);
  return r.json() as Promise<T>;
}

export const decodeEntities = (s: string) =>
  s.replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
   .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(+d))
   .replace(/&amp;/g, "&").replace(/&#8217;|&rsquo;/g, "’").replace(/&#8216;/g, "‘").replace(/&#8220;|&#8221;|&quot;/g, '"')
   .replace(/&#8211;/g, "–").replace(/&#8212;/g, "—").replace(/&#39;|&#039;/g, "'").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&nbsp;/g, " ");

/** Minimal RSS 2.0 parser (title, link, pubDate). */
export function parseRss(xml: string): Array<{ title: string; link: string; date: number }> {
  return [...xml.matchAll(/<item>([\s\S]*?)<\/item>/g)].map(([, it]) => {
    const pick = (tag: string) => (it.match(new RegExp(`<${tag}>(?:<!\\[CDATA\\[)?([\\s\\S]*?)(?:\\]\\]>)?</${tag}>`))?.[1] ?? "").trim();
    return { title: decodeEntities(pick("title")), link: pick("link").split("?")[0], date: Date.parse(pick("pubDate")) || 0 };
  });
}
