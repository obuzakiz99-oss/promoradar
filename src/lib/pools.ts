import { cached, getBigJson, getJson, getText } from "./sources/util";

/** One staking pool inside a Launchpool project (stake X → earn Y). */
export interface Pool {
  stake: string;            // coin you stake
  stakeLogo?: string;
  apr?: number;             // % per year, as shown by the exchange (live estimate)
  aprStart?: number;        // APR the exchange estimated at launch (to show the trend)
  reward?: number;          // tokens distributed by this pool
  minStake?: number;
  maxStake?: number;        // per-user cap (in stake coin)
  staked?: number;          // total staked
  participants?: number;
  newUsers?: boolean;       // only for new users / special condition
}

export type PoolStatus = "live" | "upcoming" | "ended";

/** Exchanges whose Launchpool data we read from their public API. */
export const LP_API = ["binance", "bitget", "gate", "mexc", "kucoin", "lbank"] as const;
export type LpExchange = (typeof LP_API)[number];
/** Exchanges with Launchpool-style products but no open API — tracked through their official announcements. */
export const LP_ANN: Record<string, string> = {
  bybit: "https://www.bybit.com/en/trade/spot/launchpool", okx: "https://www.okx.com/jumpstart", htx: "https://www.htx.com/en-us/financial/earn/", bingx: "https://bingx.com/en/launchpool",
  phemex: "https://phemex.com/earn-crypto/launchpool", bitmart: "https://www.bitmart.com/en-US/launchpad", coinex: "https://www.coinex.com/en/announcements",
  xt: "https://www.xt.com/en/activity/rewards-hub", weex: "https://www.weex.com/rewardhub", bitunix: "https://www.bitunix.com/activity/welfare-center",
  whitebit: "https://whitebit.com/earn", bitrue: "https://www.bitrue.com/staking",
};
/** Titles that announce a Launchpool-type campaign (stake X → earn new token). */
export const LP_RE = /launch ?pool|pool ?x\b|gem ?pool|jumpstart|prime ?pool|launchpad|boost ?hub|power ?piggy|stake .{1,40}(to )?(earn|mine|share)|staking (event|pool).{0,40}(new|airdrop)|mining pool|flash earn|subscribe .{1,40} to share|hold .{1,30} to share .{0,30}(token|[A-Z]{2,})/i;

export interface PoolProject {
  id: string;
  exchange: LpExchange;
  token: string;            // reward token
  name: string;
  logo?: string;
  start: number;
  end: number;
  status: PoolStatus;
  rewardTotal?: number;     // tokens
  rewardUsd?: number;
  pools: Pool[];
  url: string;              // exchange launchpool page
  rulesUrl?: string;        // announcement
  participants?: number;
}

export interface PoolsData {
  projects: PoolProject[];
  prices: Record<string, number>;   // USD price per coin (for the calculator)
  changes: Record<string, number>;  // 24h price change, % (Gate spot)
  hedge: Record<string, Hedge>;     // per volatile coin: where it can be shorted + spot depth
  totals: Record<string, number>;   // all-time project count per exchange (as reported by the exchange)
  status: Record<string, { ok: boolean; live: number; total: number; error?: string }>;
  fetchedAt: number;
}

const statusOf = (start: number, end: number, now: number): PoolStatus => (now < start ? "upcoming" : now > end ? "ended" : "live");
/** All-time project counts reported by the exchanges themselves (lists only return the latest page). */
const TOTALS: Record<string, number> = {};
const num = (x: unknown) => { const n = Number(x); return Number.isFinite(n) ? n : undefined; };

/* ---------------- Gate Launchpool (public web API) ---------------- */
async function gate(now: number): Promise<PoolProject[]> {
  const j = await getJson("https://www.gate.com/apiw/v2/earn/launch-pool/project-list?page=1&pageSize=60&status=0", 15_000);
  const d = j?.data ?? {};
  TOTALS.gate = (Number(d.ing_count) || 0) + (Number(d.not_start_count) || 0) + (Number(d.finish_count) || 0);
  return (d.list ?? []).map((p: any): PoolProject => {
    const start = p.start_timest * 1000, end = p.end_timest * 1000;
    const notice = (p.labels_config ?? []).find((l: any) => l.labelName === "notice")?.jumpUrl;
    return {
      id: `gate:${p.pid}`, exchange: "gate", token: p.coin, name: p.name, logo: p.coin_icon, start, end,
      status: statusOf(start, end, now), rewardTotal: num(p.total_amount), rewardUsd: num(p.total_amount_u),
      url: "https://www.gate.com/launchpool", rulesUrl: notice,
      pools: (p.reward_pools ?? []).map((r: any): Pool => ({
        stake: r.coin, stakeLogo: r.coin_icon, apr: num(r.rate_year), aprStart: num(r.maybe_year_rate), reward: num(r.total_amount),
        minStake: num(r.personal_min_amount) || undefined, maxStake: num(r.personal_max_amount) || undefined,
        participants: num(r.order_count), newUsers: Number(r.limit_rule) > 0,
      })),
    };
  });
}

/* ---------------- Binance Launchpool ---------------- */
async function binance(now: number): Promise<PoolProject[]> {
  const j = await getJson("https://www.binance.com/bapi/earn/v1/friendly/launchpool/project/listV3", 15_000);
  const d = j?.data ?? {};
  TOTALS.binance = Number(d.summary?.projectCount) || 0;
  const all = [...(Array.isArray(d.tracking) ? d.tracking : d.tracking?.list ?? []), ...(Array.isArray(d.coming) ? d.coming : d.coming?.list ?? []), ...(d.completed?.list ?? [])];
  return all.map((p: any): PoolProject => {
    const start = Number(p.investStartTime), end = Number(p.mineEndTime);
    const projects = p.projects ?? [];
    return {
      id: `binance:${p.rebateCoin}:${start}`, exchange: "binance", token: p.rebateCoin, name: projects[0]?.projectName ?? p.rebateCoin,
      logo: `https://bin.bnbstatic.com/static/assets/logos/${p.rebateCoin}.png`, start, end, status: statusOf(start, end, now),
      rewardTotal: num(p.rebateTotalAmount), url: "https://www.binance.com/en/launchpool",
      participants: projects.reduce((s: number, x: any) => s + (num(x.investUsers) ?? 0), 0) || undefined,
      pools: projects.map((x: any): Pool => ({
        stake: x.asset, apr: num(x.annualRate) ? num(x.annualRate)! * 100 : undefined, reward: num(x.rebateTotalAmount),
        minStake: num(x.minInvestAmount), staked: num(x.totalInvestAmount), participants: num(x.investUsers),
      })),
    };
  });
}

/* ---------------- MEXC Launchpool ---------------- */
async function mexc(now: number): Promise<PoolProject[]> {
  const j = await getJson("https://www.mexc.com/api/operateactivity/launchpool/list", 15_000);
  return (j?.data ?? []).map((p: any): PoolProject => {
    const start = Number(p.startTime), end = Number(p.endTime);
    const pools = (p.launchpoolDetailList ?? []).map((x: any): Pool => ({
      stake: x.pledgeCurrency, apr: num(x.apr), reward: num(x.profitCurrencyQuantity), minStake: num(x.pledgeMin), maxStake: num(x.pledgeMax),
      staked: num(x.sumLockQuantity), newUsers: x.joinType === "NEW_USER",
    }));
    return {
      id: `mexc:${p.id}`, exchange: "mexc", token: p.activityCoin, name: p.activityName, start, end,
      status: p.activityStatus === "FINISHED" ? "ended" : statusOf(start, end, now),
      rewardTotal: pools.reduce((s: number, x: Pool) => s + (x.reward ?? 0), 0) || undefined,
      // the project's own page (MEXC only uses the id; the name part is cosmetic)
      url: `https://www.mexc.com/launchpool/${String(p.currencyFullName || p.activityCoin || "x").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "x"}/${p.id}`,
      rulesUrl: p.noticeUrl || undefined, pools,
    };
  });
}

/* ---------------- KuCoin GemPool (data embedded in the public page) ---------------- */
async function kucoin(now: number): Promise<PoolProject[]> {
  const html = await getText("https://www.kucoin.com/gempool", 15_000);
  const m = html.match(/<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/);
  if (!m) throw new Error("kucoin: page data not found");
  const gs = JSON.parse(m[1])?.props?.pageProps?.GempoolStore ?? {};
  const items = [...(gs.currentRecords ?? []), ...(gs.historyRecords?.items ?? [])];
  TOTALS.kucoin = (gs.currentRecords?.length ?? 0) + (Number(gs.historyRecords?.totalNum) || 0);
  return items.map((c: any): PoolProject => {
    const start = Number(c.stakingStartTime), end = Number(c.stakingEndTime);
    const ann = c.announcementAddress ?? c.pools?.[0]?.jumpLink;
    return {
      id: `kucoin:${c.campaignId}`, exchange: "kucoin", token: c.earnTokenName, name: c.earnTokenName, logo: c.earnTokenLogo, start, end,
      status: statusOf(start, end, now), rewardTotal: num(c.totalReturns), url: c.campaignCode ? `https://www.kucoin.com/gempool/${encodeURIComponent(c.campaignCode)}` : "https://www.kucoin.com/gempool",
      rulesUrl: ann ? (ann.startsWith("http") ? ann : `https://www.kucoin.com${ann}`) : undefined,
      participants: (c.pools ?? []).reduce((s: number, x: any) => s + (num(x.totalStakingParticipants) ?? 0), 0) || undefined,
      pools: (c.pools ?? []).map((x: any): Pool => ({
        stake: x.stakingToken, stakeLogo: x.stakingTokenLogo, apr: num(x.annualPercentageRate) !== undefined ? num(x.annualPercentageRate)! * 100 : undefined,
        reward: num(x.earnTokenAmount), minStake: num(x.minStakingAmount), staked: num(x.totalStakingAmount), participants: num(x.totalStakingParticipants),
      })),
    };
  });
}

/* ---------------- Bitget PoolX (public web API; status 1 upcoming · 2 running · 3 ended) ---------------- */
async function bitget(now: number): Promise<PoolProject[]> {
  const H = { "content-type": "application/json;charset=UTF-8", language: "en_US", locale: "en_US" };
  const list = (status: number, pageSize: number) =>
    getJson("https://www.bitget.com/v1/finance/poolx/product/page/list/new", 15_000, { method: "POST", headers: H, body: JSON.stringify({ pageNo: 1, pageSize, pre: false, status }) });
  const out: any[] = [];
  for (const [s, n] of [[2, 20], [1, 20], [3, 50]] as const) {   // sequential: Bitget rate-limits bursts (429)
    const j = await list(s, n);
    if (j?.code !== "200") throw new Error(`bitget: ${j?.msg ?? "bad response"}`);
    out.push(...(j.data?.items ?? []));
  }
  const cnt = await getJson("https://www.bitget.com/v1/finance/poolx/product/count", 10_000, { method: "POST", headers: H, body: "{}" }).catch(() => null);
  if (cnt?.data) TOTALS.bitget = ["overNum", "runningNum", "waitStartNum"].reduce((s, k) => s + (Number(cnt.data[k]) || 0), 0);
  return out.map((p: any): PoolProject => {
    const start = Number(p.startTime), end = Number(p.endTime);
    const pools = (p.productSubList ?? []).map((x: any): Pool => ({
      stake: x.productSubCoinName, stakeLogo: x.productSubCoinImgUrl, apr: num(x.apr), reward: num(x.totalRewards),
      maxStake: num(x.userMaxAmount) || undefined, staked: num(x.totalStakedAmount), participants: num(x.userCount), newUsers: !!x.vipPool,
    }));
    return {
      id: `bitget:${p.id}`, exchange: "bitget", token: p.productCoinName, name: p.productCoinName, logo: p.productCoinImgUrl, start, end,
      status: statusOf(start, end, now), rewardTotal: num(p.totalRewards), url: p.productDetailLinkUrl || "https://www.bitget.com/launchhub/poolx",
      participants: pools.reduce((s: number, x: Pool) => s + (x.participants ?? 0), 0) || undefined, pools,
    };
  });
}

/* ---------------- LBank BoostHub (public web API) ---------------- */
// Each project has a sign-up pool (fixed share, no APR) and a "futures position" pool (APR on net futures positions, USDT-margined).
async function lbank(now: number): Promise<PoolProject[]> {
  const j = await getJson("https://www.lbank.com/lbk-api/finance-earn-center/launchpool/pageList", 15_000, {
    method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ pageNo: 1, pageSize: 20 }),
  });
  const list = j?.data?.resultList;
  if (!Array.isArray(list)) throw new Error("lbank: bad response");
  return list.map((r: any): PoolProject => {
    const p = r.project ?? {}, b = r.prizeBasic, f = r.futurePrize;
    const start = Number(p.startTime), end = Number(p.endTime), token = String(p.assetCode ?? "").toUpperCase();
    const pools: Pool[] = [];
    if (f) pools.push({ stake: "USDT", apr: num(f.rateAPR), reward: num(f.total), staked: num(f.sumHoldingAmount), newUsers: true });
    return {
      id: `lbank:${p.projectId}`, exchange: "lbank", token, name: p.projectName ?? token, start, end,
      status: statusOf(start, end, now), rewardTotal: num(p.total), url: "https://www.lbank.com/boosthub",
      participants: num(b?.participantCount), pools,
    };
  });
}

const STABLE = new Set(["USDT", "USDC", "USD1", "USDG", "FDUSD", "U", "DAI", "USDE", "PYUSD"]);

/** USD prices + 24h change for coins from Gate's public spot tickers (one call, cached 10 min). */
async function prices(): Promise<{ px: Record<string, number>; chg: Record<string, number> }> {
  return cached("gate-tickers", 10 * 60_000, async () => {
    const t = await getBigJson<any[]>("https://api.gateio.ws/api/v4/spot/tickers", 20_000);
    const px: Record<string, number> = {}, chg: Record<string, number> = {};
    for (const x of t) if (x.currency_pair?.endsWith("_USDT")) {
      const c = x.currency_pair.slice(0, -5), p = Number(x.last), ch = Number(x.change_percentage);
      if (p > 0) px[c] = p;
      if (Number.isFinite(ch)) chg[c] = ch;
    }
    for (const s of STABLE) { px[s] = 1; chg[s] = 0; }
    return { px, chg };
  });
}

export const isStable = (c: string) => STABLE.has(c);

/** Where a coin can be shorted (perpetuals) and how deep its spot book is. fundingApr > 0 → shorts RECEIVE funding. */
export interface Hedge { perps: Array<{ ex: string; fundingApr: number }>; spotDepthUsd?: number }

const yearly = (rate: number, intervalH: number) => rate * (24 / intervalH) * 365 * 100;

async function hedgeFor(c: string): Promise<Hedge> {
  const get = (u: string) => getJson(u, 8_000).catch(() => null);
  const [g, b, y, m, ob] = await Promise.all([
    get(`https://api.gateio.ws/api/v4/futures/usdt/contracts/${c}_USDT`),
    get(`https://fapi.binance.com/fapi/v1/premiumIndex?symbol=${c}USDT`),
    get(`https://api.bybit.com/v5/market/tickers?category=linear&symbol=${c}USDT`),
    get(`https://contract.mexc.com/api/v1/contract/funding_rate/${c}_USDT`),
    get(`https://api.gateio.ws/api/v4/spot/order_book?currency_pair=${c}_USDT&limit=20`),
  ]);
  const perps: Hedge["perps"] = [];
  if (g?.name && !g.in_delisting) perps.push({ ex: "Gate", fundingApr: yearly(Number(g.funding_rate), Number(g.funding_interval) / 3600 || 8) });
  if (b?.symbol) {
    // Binance funding interval differs per symbol (4h/8h) — read it from fundingInfo, default 8h
    const info = await cached("binance-funding-info", 60 * 60_000, () => getJson<any[]>("https://fapi.binance.com/fapi/v1/fundingInfo", 8_000)).catch(() => [] as any[]);
    const iv = Number(info.find((x: any) => x.symbol === `${c}USDT`)?.fundingIntervalHours) || 8;
    perps.push({ ex: "Binance", fundingApr: yearly(Number(b.lastFundingRate), iv) });
  }
  const yt = y?.result?.list?.[0];
  if (yt?.symbol) perps.push({ ex: "Bybit", fundingApr: yearly(Number(yt.fundingRate), Number(yt.fundingIntervalHour) || 8) });
  if (m?.success && m.data) perps.push({ ex: "MEXC", fundingApr: yearly(Number(m.data.fundingRate), Number(m.data.collectCycle) || 8) });
  let spotDepthUsd: number | undefined;
  if (ob?.bids && ob?.asks) {
    const side = (s: any[]) => s.reduce((a, l) => a + Number(l[0]) * Number(l[1]), 0);
    spotDepthUsd = Math.min(side(ob.bids), side(ob.asks));
  }
  return { perps, spotDepthUsd };
}

async function hedges(coins: string[]): Promise<Record<string, Hedge>> {
  const uniq = [...new Set(coins)].filter((c) => !STABLE.has(c)).slice(0, 40);
  const res = await Promise.all(uniq.map((c) => cached(`hedge:${c}`, 5 * 60_000, () => hedgeFor(c)).catch(() => ({ perps: [] }) as Hedge)));
  return Object.fromEntries(uniq.map((c, i) => [c, res[i]]));
}

export async function getPools(): Promise<PoolsData> {
  const now = Date.now();
  const src = { gate, binance, mexc, kucoin, bitget, lbank } as const;
  const keys = Object.keys(src) as (keyof typeof src)[];
  const [res, market] = await Promise.all([Promise.allSettled(keys.map((k) => src[k](now))), prices().catch(() => ({ px: {}, chg: {} }) as { px: Record<string, number>; chg: Record<string, number> })]);
  const { px, chg } = market;
  const status: PoolsData["status"] = {};
  const projects: PoolProject[] = [];
  res.forEach((r, i) => {
    const k = keys[i];
    if (r.status === "rejected") { status[k] = { ok: false, live: 0, total: 0, error: String(r.reason).slice(0, 140) }; return; }
    projects.push(...r.value);
    status[k] = { ok: true, live: r.value.filter((p) => p.status !== "ended").length, total: r.value.length };
  });
  // fill USD value of reward pools where the exchange doesn't give it
  for (const p of projects) if (!p.rewardUsd && p.rewardTotal && px[p.token]) p.rewardUsd = p.rewardTotal * px[p.token];
  const rank = { live: 0, upcoming: 1, ended: 2 } as const;
  projects.sort((a, b) => rank[a.status] - rank[b.status] || (a.status === "ended" ? b.end - a.end : a.end - b.end));
  const active = projects.filter((p) => p.status !== "ended");
  const hedge = await hedges(active.flatMap((p) => [p.token, ...p.pools.map((x) => x.stake)])).catch(() => ({}));
  // KuCoin's archive APR doesn't reproduce from its own numbers (e.g. 310% shown vs 217% implied) — don't show it for ended pools
  for (const p of projects) if (p.exchange === "kucoin" && p.status === "ended") for (const x of p.pools) x.apr = undefined;
  const totals: Record<string, number> = {};
  for (const k of keys) totals[k] = Math.max(TOTALS[k] ?? 0, projects.filter((p) => p.exchange === k).length);
  return { projects, prices: px, changes: chg, hedge, totals, status, fetchedAt: now };
}
