import { UA } from "@/lib/sources/util";

/** First-party logo proxy with a long cache. Only whitelisted hosts (not an open proxy). */
const ALLOWED = new Set(["icons.llamao.fi", "airdrops.io", "bin.bnbstatic.com", "icon.staticimgs.com", "assets-currency.kucoin.com", "assets-currency.kucoin.plus"]);

export async function GET(req: Request) {
  const u = new URL(req.url).searchParams.get("u");
  let target: URL;
  try { target = new URL(u ?? ""); } catch { return new Response("bad url", { status: 400 }); }
  if (target.protocol !== "https:" || !ALLOWED.has(target.hostname)) return new Response("forbidden", { status: 403 });

  const r = await fetch(target, { headers: UA, next: { revalidate: 86400 }, signal: AbortSignal.timeout(10_000) }).catch(() => null);
  const type = r?.headers.get("content-type") ?? "";
  if (!r || !r.ok || !type.startsWith("image/")) return new Response("not found", { status: 404, headers: { "Cache-Control": "public, max-age=3600" } });
  return new Response(await r.arrayBuffer(), {
    headers: { "Content-Type": type, "Cache-Control": "public, max-age=86400, s-maxage=604800, stale-while-revalidate=604800" },
  });
}
