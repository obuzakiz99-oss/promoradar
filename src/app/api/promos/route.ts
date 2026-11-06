import { getPromos, publicFeed } from "@/lib/promos";

export const dynamic = "force-static";
export const revalidate = 900;

/** Public JSON feed — handy for the future Telegram bot and partners. */
export async function GET() {
  return Response.json(publicFeed(await getPromos()), { headers: { "Cache-Control": "public, s-maxage=900, stale-while-revalidate=1800" } });
}
