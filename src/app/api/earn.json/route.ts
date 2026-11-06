import { getEarn } from "@/lib/earn";

export const dynamic = "force-static";
export const revalidate = 900;

/** Same data as /api/earn, with a .json extension so browsers show it instead of downloading. */
export async function GET() {
  return Response.json(await getEarn(), { headers: { "Cache-Control": "public, s-maxage=900" } });
}