import { getPromos } from "@/lib/promos";

export const revalidate = 900;

/** Public JSON feed — handy for the future Telegram bot and partners. */
export async function GET() {
  const data = await getPromos();
  return Response.json(data, { headers: { "Cache-Control": "public, s-maxage=900, stale-while-revalidate=1800" } });
}
