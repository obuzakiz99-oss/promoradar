import { getFixed } from "@/lib/fixed";

export const dynamic = "force-static";
export const revalidate = 900;

/** Same data as /api/fixed, with a .json extension so browsers show it instead of downloading. */
export async function GET() {
  return Response.json(await getFixed(), { headers: { "Cache-Control": "public, s-maxage=900" } });
}