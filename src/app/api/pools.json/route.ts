import { getPools } from "@/lib/pools";

export const dynamic = "force-static";
export const revalidate = 900;

/** Same data as /api/pools, with a .json extension so browsers show it instead of downloading. */
export async function GET() {
  return Response.json(await getPools(), { headers: { "Cache-Control": "public, s-maxage=900" } });
}