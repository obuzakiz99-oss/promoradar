import { getPools } from "@/lib/pools";

export const dynamic = "force-static";
export const revalidate = 300;

/** Launchpool data (live + upcoming + archive) with prices, 24h changes and hedge venues. */
export async function GET() {
  return Response.json(await getPools(), { headers: { "Cache-Control": "public, s-maxage=300" } });
}
