import { getPromos, publicFeed } from "@/lib/promos";

export const dynamic = "force-static";
export const revalidate = 900;

/** Same data as /api/promos, with a .json extension so browsers show it instead of downloading. */
export async function GET() {
  return Response.json(publicFeed(await getPromos()), { headers: { "Cache-Control": "public, s-maxage=900" } });
}
