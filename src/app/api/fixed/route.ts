import { getFixed } from "@/lib/fixed";

export const dynamic = "force-static";
export const revalidate = 900;

/** Pendle PT fixed yields on stablecoin markets. */
export async function GET() {
  return Response.json(await getFixed(), { headers: { "Cache-Control": "public, s-maxage=900" } });
}
