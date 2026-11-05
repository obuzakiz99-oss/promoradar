import { getEarn } from "@/lib/earn";

export const revalidate = 900;

/** Exchange Earn offers (Binance, Bybit, OKX, Gate, MEXC). */
export async function GET() {
  return Response.json(await getEarn(), { headers: { "Cache-Control": "public, s-maxage=900" } });
}
