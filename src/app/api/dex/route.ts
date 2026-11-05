import { getDexPools } from "@/lib/dexpools";

export const revalidate = 1800;

/** DEX / DeFi pools (DefiLlama Yields subset). */
export async function GET() {
  return Response.json(await getDexPools(), { headers: { "Cache-Control": "public, s-maxage=1800" } });
}
