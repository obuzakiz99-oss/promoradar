import { getFunding } from "@/lib/funding";

export const dynamic = "force-static";
export const revalidate = 900;

/** Perp funding on Binance, Bybit, Gate, MEXC, Hyperliquid — annualised, with the cross-exchange spread. */
export async function GET() {
  return Response.json(await getFunding(), { headers: { "Cache-Control": "public, s-maxage=900" } });
}
