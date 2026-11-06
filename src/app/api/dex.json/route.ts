import { getDexPools } from "@/lib/dexpools";

export const dynamic = "force-static";
export const revalidate = 900;

/** Same data as /api/dex, with a .json extension so browsers show it instead of downloading. */
export async function GET() {
  return Response.json(await getDexPools(), { headers: { "Cache-Control": "public, s-maxage=900" } });
}