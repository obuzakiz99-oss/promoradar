import { getJson } from "./sources/util";

/** A savings/staking offer on a centralised exchange. APRs are in % per year. */
export interface EarnOffer {
  exchange: "binance" | "bybit" | "okx" | "gate" | "mexc" | "bitget";
  coin: string;
  type: "flexible" | "fixed" | "onchain";
  apr: number;              // typical / base APR for any amount
  aprMax?: number;          // best tier (usually limited amount)
  tierNote?: string;        // e.g. "≤ 100 USDT"
  days?: number;            // lock period for fixed products
  minAmount?: number;
  maxAmount?: number;       // per-user cap
  newUsers?: boolean;       // promo only for new users / first deposit
  redeemHours?: number;     // withdrawal processing time (Bybit on-chain: up to 3 days)
  via?: string;             // deposit is converted into this coin (Bybit on-chain USDT → USDE)
  url: string;
}

export interface EarnData { offers: EarnOffer[]; status: Record<string, { ok: boolean; count: number; error?: string }>; fetchedAt: number }

const n = (x: unknown) => { const v = Number(String(x ?? "").replace("%", "")); return Number.isFinite(v) ? v : undefined; };
const fmtAmt = (x: number) => (x >= 1e6 ? `${x / 1e6}M` : x >= 1e3 ? `${x / 1e3}K` : String(x));

/* Binance Simple Earn (public web API used by the Earn page). */
async function binance(): Promise<EarnOffer[]> {
  const out: EarnOffer[] = [];
  for (let page = 1; page <= 5; page++) {
    const j = await getJson(`https://www.binance.com/bapi/earn/v1/friendly/finance-earn/simple/product/simpleEarnProducts?pageIndex=${page}&pageSize=100&includeEthStaking=true&includeSolStaking=true&includeP2pLoan=true&simple=true`, 15_000);
    const list = j?.data?.list ?? [];
    for (const p of list) for (const d of p.productDetailList ?? []) {
      if (d.status !== "ENABLE" || d.sellOut) continue;
      const max = (n(d.apy) ?? 0) * 100, base = (n(d.marketApr) ?? n(d.apy) ?? 0) * 100;
      const fixed = Number(d.duration) > 0;
      const tier = d.apyTierOption?.[0];
      out.push({
        exchange: "binance", coin: p.asset, type: fixed ? "fixed" : "flexible", apr: +base.toFixed(2),
        aprMax: max > base + 0.01 ? +max.toFixed(2) : undefined,
        tierNote: max > base + 0.01 && tier?.endAmount ? `≤ ${fmtAmt(Number(tier.endAmount))} ${p.asset}` : undefined,
        days: fixed ? Number(d.duration) : undefined, minAmount: n(d.minPurchaseAmount),
        url: `https://www.binance.com/en/simple-earn`,
      });
    }
    if (page * 100 >= Number(j?.data?.total ?? 0)) break;
  }
  return out;
}

/* Bybit official public API v5 /earn/product. */
async function bybit(): Promise<EarnOffer[]> {
  const out: EarnOffer[] = [];
  for (const cat of ["FlexibleSaving", "OnChain"] as const) {
    const j = await getJson(`https://api.bybit.com/v5/earn/product?category=${cat}`, 15_000);
    for (const p of j?.result?.list ?? []) {
      if (p.status !== "Available") continue;
      const tiers = (p.tierAprDetails ?? []).map((t: any) => ({ max: n(t.max), apr: n(t.estimateApr) ?? 0 }));
      const best = tiers.length ? Math.max(...tiers.map((t: any) => t.apr)) : undefined;
      const base = n(p.estimateApr) ?? 0;
      const top = tiers.find((t: any) => t.apr === best);
      out.push({
        exchange: "bybit", coin: p.coin, type: cat === "OnChain" ? "onchain" : "flexible", apr: base,
        aprMax: best && best > base + 0.01 ? best : undefined,
        tierNote: best && best > base + 0.01 && top?.max && top.max > 0 ? `≤ ${fmtAmt(top.max)} ${p.coin}` : undefined,
        minAmount: n(p.minStakeAmount), url: "https://www.bybit.com/en/earn/home",
        redeemHours: Number(p.redeemProcessingMinute) > 0 ? Number(p.redeemProcessingMinute) / 60 : undefined,
        via: p.swapCoin && p.swapCoin !== p.coin ? p.swapCoin : undefined,
      });
    }
  }
  return out;
}

/* OKX official public API: Simple Earn flexible lending rates. */
async function okx(): Promise<EarnOffer[]> {
  const j = await getJson("https://www.okx.com/api/v5/finance/savings/lending-rate-summary", 15_000);
  return (j?.data ?? []).map((x: any): EarnOffer => ({
    exchange: "okx", coin: x.ccy, type: "flexible", apr: +((n(x.estRate) ?? n(x.avgRate) ?? 0) * 100).toFixed(2),
    url: "https://www.okx.com/earn/simple-earn",
  })).filter((o: EarnOffer) => o.apr > 0);
}

/* Gate official public API v4: Lend & Earn estimated rates. */
async function gate(): Promise<EarnOffer[]> {
  const j = await getJson<any[]>("https://api.gateio.ws/api/v4/earn/uni/rate", 15_000);
  return (j ?? []).map((x): EarnOffer => ({ exchange: "gate", coin: x.currency, type: "flexible", apr: +((n(x.est_rate) ?? 0) * 100).toFixed(2), url: "https://www.gate.com/simple-earn" }))
    .filter((o) => o.apr > 0);
}

/* MEXC Earn (public web API used by the Earn page). */
async function mexc(): Promise<EarnOffer[]> {
  const j = await getJson("https://www.mexc.com/api/financialactivity/financial/products/list/V2", 15_000);
  const out: EarnOffer[] = [];
  for (const c of j?.data ?? []) for (const p of c.financialProductList ?? []) {
    const tiers = (p.tieredSubsidyApr ?? []).map((t: any) => ({ end: n(t.endQuantity), apr: n(t.apr) ?? 0 }));
    const base = n(p.showApr) ?? n(p.baseApr) ?? 0;
    const best = Math.max(base, ...tiers.map((t: any) => t.apr));
    const fixed = p.investPeriodType === "FIXED";
    out.push({
      exchange: "mexc", coin: p.currency, type: fixed ? "fixed" : "flexible",
      apr: tiers.length ? Math.min(...tiers.map((t: any) => t.apr)) : base, aprMax: best > base + 0.01 || tiers.length ? best : undefined,
      days: fixed ? n(p.fixedInvestPeriodCount) : undefined, url: "https://www.mexc.com/earn",
      minAmount: n(p.minPledgeQuantity), maxAmount: (n(p.perPledgeMaxQuantity) ?? -1) > 0 ? n(p.perPledgeMaxQuantity) : undefined,
      newUsers: p.memberType && p.memberType !== "NORMAL",
    });
  }
  return out.filter((o) => o.apr > 0);
}

/* Bitget Savings (public web API used by the Earn page; one call returns every coin). Owner 13.11: more exchanges. */
async function bitget(): Promise<EarnOffer[]> {
  const j = await postJson("https://www.bitget.com/v1/finance/savings/product/list", { pageNo: 1, pageSize: 500, locale: "en_US" });
  const out: EarnOffer[] = [];
  for (const c of j?.data ?? []) for (const bl of c.bizLineProductList ?? []) for (const p of bl.productList ?? []) {
    if (p.status !== 2 || p.visibleApy === false) continue;   // 2 = open; sold-out / upcoming are skipped
    const tiers: Array<{ apy: number; max?: number }> = (p.apyList ?? []).map((t: any) => ({ apy: n(t.apy) ?? 0, max: n(t.maxStepValue) }));
    const base = Math.min(...tiers.map((t) => t.apy).concat(n(p.minApy) ?? Infinity));
    const best = Math.max(base, n(p.maxApy) ?? 0, ...tiers.map((t) => t.apy));
    const fixed = p.periodType === 2 && Number(p.period) > 0;
    const top = tiers.find((t) => t.apy === best);
    out.push({
      exchange: "bitget", coin: p.coinName, type: fixed ? "fixed" : "flexible", apr: +base.toFixed(2),
      aprMax: best > base + 0.01 ? +best.toFixed(2) : undefined,
      tierNote: best > base + 0.01 && top?.max ? `≤ ${fmtAmt(top.max)} ${p.coinName}` : undefined,
      days: fixed ? Number(p.period) : undefined, url: "https://www.bitget.com/earning/savings",
    });
  }
  // the same product is listed under several tabs — keep one
  const seen = new Set<string>();
  return out.filter((o) => Number.isFinite(o.apr) && o.apr > 0 && !seen.has(`${o.coin}|${o.type}|${o.days}|${o.apr}|${o.aprMax}`) && !!seen.add(`${o.coin}|${o.type}|${o.days}|${o.apr}|${o.aprMax}`));
}

async function postJson(url: string, body: unknown): Promise<any> {
  const ctl = new AbortController();
  const t = setTimeout(() => ctl.abort(), 15_000);
  try {
    const r = await fetch(url, { method: "POST", headers: { "content-type": "application/json", "user-agent": "Mozilla/5.0" }, body: JSON.stringify(body), signal: ctl.signal });
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    return await r.json();
  } finally { clearTimeout(t); }
}

export async function getEarn(): Promise<EarnData> {
  const src = { binance, bybit, okx, gate, mexc, bitget } as const;
  const keys = Object.keys(src) as (keyof typeof src)[];
  const res = await Promise.allSettled(keys.map((k) => src[k]()));
  const status: EarnData["status"] = {};
  const offers: EarnOffer[] = [];
  res.forEach((r, i) => {
    const k = keys[i];
    if (r.status === "rejected") { status[k] = { ok: false, count: 0, error: String(r.reason).slice(0, 140) }; return; }
    // sanity: drop absurd values (data errors)
    const clean = r.value.filter((o) => o.apr < 1000 && (o.aprMax ?? 0) < 5000);
    offers.push(...clean);
    status[k] = { ok: true, count: clean.length };
  });
  return { offers, status, fetchedAt: Date.now() };
}

export const POPULAR = ["USDT", "USDC", "BTC", "ETH", "SOL", "BNB", "XRP", "DOGE", "TON", "TRX", "ADA", "SUI", "FDUSD", "USDE"];
