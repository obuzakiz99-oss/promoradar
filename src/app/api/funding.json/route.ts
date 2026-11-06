import { getFunding } from "@/lib/funding";

export const dynamic = "force-static";
export const revalidate = 900;

/** Same data as /api/funding, with a .json extension so browsers show it instead of downloading. */
export async function GET() {
  return Response.json(await getFunding(), { headers: { "Cache-Control": "public, s-maxage=900" } });
}