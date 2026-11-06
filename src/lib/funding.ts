import { cached, getBigJson, getJson } from "./sources/util";

/**
 * Perpetual funding across exchanges, annualised (% per year). Positive = longs pay shorts (a short RECEIVES it).
 * Only exchanges whose funding interval we can read exactly are included (Bitget's tickers don't expose it).
 * Binance & Bybit refuse GitHub's US build servers — their exact URLs are fed through the EU relay (see util.ts).
 */
export const FUNDING_EX = ["Binance", "Bybit", "Gate", "MEXC", "Hyperliquid"] as const;
export type FundingEx = (typeof FUNDING_EX)[number];

export interface FundingRow {
  coin: string;
  rates: Partial<Record<FundingEx, number>>;   // APR %
  hours: Partial<Record<FundingEx, number>>;   // funding interval
  max: number; maxEx: FundingEx; min: number; minEx: FundingEx; spread: number;
  volUsd?: number;                              // biggest 24h perp volume we know of
}
export interface FundingData { rows: FundingRow[]; status: Record<string, { ok: boolean; n: number; error?: string }>; fetchedAt: number }

const apr = (rate: number, hours: number) => rate * (24 / hours) * 365 * 100;
type One = Map<string, { apr: number; h: number; vol?: number }>;

async function binance(): Promise<One> {
  const [prem, info, tick] = await Promise.all([
    getJson<any[]>("https://fapi.binance.com/fapi/v1/premiumIndex", 20_000),
    getJson<any[]>("https://fapi.binance.com/fapi/v1/fundingInfo", 20_000).catch(() => [] as any[]),
    getJson<any[]>("https://fapi.binance.com/fapi/v1/ticker/24hr", 20_000).catch(() => [] as any[]),
  ]);
  const iv = new Map(info.map((x) => [x.symbol, Number(x.fundingIntervalHours) || 8]));
  const vol = new Map(tick.map((x) => [x.symbol, Number(x.quoteVolume) || 0]));
  const m: One = new Map();
  for (const x of prem) if (x.symbol?.endsWith("USDT") && x.lastFundingRate !== "") {
    const h = iv.get(x.symbol) ?? 8;
    m.set(x.symbol.slice(0, -4), { apr: apr(Number(x.lastFundingRate), h), h, vol: vol.get(x.symbol) });
  }
  return m;
}
async function bybit(): Promise<One> {
  const j = await getJson("https://api.bybit.com/v5/market/tickers?category=linear", 20_000);
  const m: One = new Map();
  for (const x of j?.result?.list ?? []) if (x.symbol?.endsWith("USDT") && x.fundingRate !== "") {
    const h = Number(x.fundingIntervalHour) || 8;
    m.set(x.symbol.slice(0, -4), { apr: apr(Number(x.fundingRate), h), h, vol: Number(x.turnover24h) || undefined });
  }
  return m;
}
async function gate(): Promise<One> {
  const list = await cached("gate-contracts", 10 * 60_000, () => getBigJson<any[]>("https://api.gateio.ws/api/v4/futures/usdt/contracts", 30_000));
  const m: One = new Map();
  for (const x of list) if (!x.in_delisting && x.name?.endsWith("_USDT")) {
    const h = Number(x.funding_interval) / 3600 || 8;
    m.set(x.name.slice(0, -5), { apr: apr(Number(x.funding_rate), h), h });
  }
  return m;
}
async function mexc(): Promise<One> {
  const j = await getJson("https://contract.mexc.com/api/v1/contract/funding_rate", 20_000);
  const m: One = new Map();
  for (const x of j?.data ?? []) if (x.symbol?.endsWith("_USDT")) {
    const h = Number(x.collectCycle) || 8;
    m.set(x.symbol.slice(0, -5), { apr: apr(Number(x.fundingRate), h), h });
  }
  return m;
}
async function hyperliquid(): Promise<One> {
  const j = await getJson<any[]>("https://api.hyperliquid.xyz/info", 20_000, { method: "POST", headers: { "content-type": "application/json" }, body: '{"type":"metaAndAssetCtxs"}' });
  const [meta, ctxs] = j ?? [];
  const m: One = new Map();
  (meta?.universe ?? []).forEach((u: any, i: number) => {
    const c = ctxs?.[i];
    if (!c || u.isDelisted) return;
    m.set(u.name, { apr: apr(Number(c.funding), 1), h: 1, vol: Number(c.dayNtlVlm) || undefined });   // hourly funding
  });
  return m;
}

export async function getFunding(): Promise<FundingData> {
  const src: Record<FundingEx, () => Promise<One>> = { Binance: binance, Bybit: bybit, Gate: gate, MEXC: mexc, Hyperliquid: hyperliquid };
  const res = await Promise.allSettled(FUNDING_EX.map((e) => src[e]()));
  const status: FundingData["status"] = {};
  const per = new Map<FundingEx, One>();
  res.forEach((r, i) => {
    const e = FUNDING_EX[i];
    if (r.status === "fulfilled") { per.set(e, r.value); status[e] = { ok: true, n: r.value.size }; }
    else status[e] = { ok: false, n: 0, error: String(r.reason).slice(0, 120) };
  });
  const coins = new Set<string>();
  for (const m of per.values()) for (const c of m.keys()) coins.add(c);
  const rows: FundingRow[] = [];
  for (const coin of coins) {
    const rates: FundingRow["rates"] = {}, hours: FundingRow["hours"] = {};
    let volUsd: number | undefined;
    for (const [e, m] of per) {
      const x = m.get(coin);
      if (!x || !Number.isFinite(x.apr)) continue;
      rates[e] = x.apr; hours[e] = x.h;
      if (x.vol) volUsd = Math.max(volUsd ?? 0, x.vol);
    }
    const ent = Object.entries(rates) as Array<[FundingEx, number]>;
    if (ent.length < 2) continue;                               // a spread needs two venues
    const hi = ent.reduce((a, b) => (b[1] > a[1] ? b : a)), lo = ent.reduce((a, b) => (b[1] < a[1] ? b : a));
    rows.push({ coin, rates, hours, max: hi[1], maxEx: hi[0], min: lo[1], minEx: lo[0], spread: hi[1] - lo[1], volUsd });
  }
  rows.sort((a, b) => b.spread - a.spread);
  return { rows, status, fetchedAt: Date.now() };
}
