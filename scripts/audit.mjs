// Independent audit: re-fetch raw sources and compare with what the site serves (/api/*).
// usage: node scripts/audit.mjs   (site must run on :3100)
const H = { "User-Agent": "Mozilla/5.0 (compatible; PromoRadar/1.0)", Accept: "application/json" };
const j = async (u) => (await fetch(u, { headers: H, signal: AbortSignal.timeout(30000) })).json();
const site = (p) => j(`http://localhost:3100${p}`);
let bad = 0, ok = 0;
const check = (cond, msg) => { if (cond) ok++; else { bad++; console.log("  ✕", msg); } };
const close = (a, b, tol = 0.02) => Math.abs(a - b) <= Math.max(Math.abs(b) * tol, 1e-9);

/* ================= LAUNCHPOOLS ================= */
console.log("\n=== LAUNCHPOOLS");
const P = await site("/api/pools");
// Gate
const g = await j("https://www.gate.com/apiw/v2/earn/launch-pool/project-list?page=1&pageSize=60&status=0");
for (const raw of g.data.list.filter((x) => x.end_timest * 1000 > Date.now())) {
  const s = P.projects.find((p) => p.id === `gate:${raw.pid}`);
  check(!!s, `gate ${raw.name} missing on site`);
  if (!s) continue;
  check(s.start === raw.start_timest * 1000 && s.end === raw.end_timest * 1000, `gate ${raw.name} dates`);
  check(close(s.rewardTotal, +raw.total_amount), `gate ${raw.name} reward ${s.rewardTotal} vs ${raw.total_amount}`);
  for (const r of raw.reward_pools) {
    const sp = s.pools.find((x) => x.stake === r.coin);
    check(!!sp, `gate ${raw.name}/${r.coin} pool missing`);
    if (!sp) continue;
    check(close(sp.apr, +r.rate_year, 0.25), `gate ${raw.name}/${r.coin} APR site ${sp.apr} vs raw ${r.rate_year} (live value moves)`);
    check((+r.personal_max_amount || undefined) === sp.maxStake, `gate ${raw.name}/${r.coin} max ${sp.maxStake} vs ${r.personal_max_amount}`);
  }
}
console.log("  gate counts: ing", g.data.ing_count, "not_start", g.data.not_start_count, "finish", g.data.finish_count, "| site gate projects", P.projects.filter((p) => p.exchange === "gate").length);
// Binance summary vs site history count
const b = await j("https://www.binance.com/bapi/earn/v1/friendly/launchpool/project/listV3");
console.log("  binance summary projectCount", b.data.summary.projectCount, "| site binance projects", P.projects.filter((p) => p.exchange === "binance").length);
// hedge funding check (KOR on MEXC etc.)
for (const [coin, h] of Object.entries(P.hedge)) {
  for (const perp of h.perps) {
    let raw;
    if (perp.ex === "MEXC") { const m = await j(`https://contract.mexc.com/api/v1/contract/funding_rate/${coin}_USDT`); raw = m.data.fundingRate * (24 / m.data.collectCycle) * 365 * 100; }
    if (perp.ex === "Gate") { const c = await j(`https://api.gateio.ws/api/v4/futures/usdt/contracts/${coin}_USDT`); raw = c.funding_rate * (86400 / c.funding_interval) * 365 * 100; }
    if (perp.ex === "Bybit") { const y = await j(`https://api.bybit.com/v5/market/tickers?category=linear&symbol=${coin}USDT`); const t = y.result.list[0]; raw = t.fundingRate * (24 / (t.fundingIntervalHour || 8)) * 365 * 100; console.log(`  bybit ${coin} fundingIntervalHour field:`, t.fundingIntervalHour); }
    if (perp.ex === "Binance") {
      const p = await j(`https://fapi.binance.com/fapi/v1/premiumIndex?symbol=${coin}USDT`);
      const info = await j("https://fapi.binance.com/fapi/v1/fundingInfo");
      const iv = info.find((x) => x.symbol === `${coin}USDT`)?.fundingIntervalHours ?? 8;
      raw = p.lastFundingRate * (24 / iv) * 365 * 100;
      console.log(`  binance ${coin} funding interval ${iv}h`);
    }
    check(raw === undefined || Math.abs(raw - perp.fundingApr) < Math.max(5, Math.abs(raw) * 0.5), `hedge ${coin}@${perp.ex} fundingApr site ${perp.fundingApr.toFixed(2)} vs raw ${raw?.toFixed(2)}`);
  }
}
// profit maths for $1000 on each live pool
for (const p of P.projects.filter((x) => x.status === "live")) for (const pool of p.pools) {
  const price = P.prices[pool.stake];
  if (!price || pool.apr === undefined) { console.log(`  ⚠ no price for ${pool.stake} (${p.name}) — calculator can't value it`); continue; }
  let coins = 1000 / price; if (pool.maxStake && coins > pool.maxStake) coins = pool.maxStake;
  const days = (p.end - Date.now()) / 86400000;
  const profit = coins * price * pool.apr / 100 / 365 * days;
  console.log(`  ${p.name.padEnd(5)} ${pool.stake.padEnd(5)} APR ${String(pool.apr).padEnd(8)} $1000 → ${profit.toFixed(2)} over ${days.toFixed(1)}d${pool.minStake && coins < pool.minStake ? " (below min)" : ""}`);
}

/* ================= EARN ================= */
console.log("\n=== EARN");
const E = await site("/api/earn");
const byKey = (ex, coin) => E.offers.filter((o) => o.exchange === ex && o.coin === coin);
// OKX
const okx = await j("https://www.okx.com/api/v5/finance/savings/lending-rate-summary");
for (const c of ["USDT", "USDC", "BTC", "ETH"]) { const r = okx.data.find((x) => x.ccy === c); const s = byKey("okx", c)[0]; check(s && close(s.apr, r.estRate * 100, 0.3), `okx ${c} site ${s?.apr} vs est ${r.estRate * 100}`); }
// Gate
const gu = await j("https://api.gateio.ws/api/v4/earn/uni/rate");
for (const c of ["USDT", "USDC", "BTC", "ETH"]) { const r = gu.find((x) => x.currency === c); const s = byKey("gate", c)[0]; check(s && close(s.apr, r.est_rate * 100, 0.3), `gate ${c} site ${s?.apr} vs ${r.est_rate * 100}`); }
// Bybit
const by = await j("https://api.bybit.com/v5/earn/product?category=FlexibleSaving");
for (const c of ["USDT", "USDC", "BTC", "ETH"]) { const r = by.result.list.find((x) => x.coin === c); const s = byKey("bybit", c).find((o) => o.type === "flexible"); check(s && close(s.apr, parseFloat(r.estimateApr), 0.2), `bybit ${c} site ${s?.apr} vs ${r.estimateApr} tiers ${JSON.stringify(r.tierAprDetails)}`); }
// Binance: inspect tier semantics for USDT
const bn = await j("https://www.binance.com/bapi/earn/v1/friendly/finance-earn/simple/product/simpleEarnProducts?pageIndex=1&pageSize=100&includeEthStaking=true&includeSolStaking=true&includeP2pLoan=true&simple=true");
const bu = bn.data.list.find((x) => x.asset === "USDT").productDetailList[0];
console.log("  binance USDT apy", bu.apy, "marketApr", bu.marketApr, "tiers", JSON.stringify(bu.apyTierOption).slice(0, 300));
console.log("  site binance USDT", JSON.stringify(byKey("binance", "USDT")));
// MEXC: tier semantics
const mx = await j("https://www.mexc.com/api/financialactivity/financial/products/list/V2");
for (const p of mx.data.find((x) => x.currency === "USDT").financialProductList) console.log("  mexc USDT", p.investPeriodType, "showApr", p.showApr, "baseApr", p.baseApr, "member", p.memberType, "tiers", JSON.stringify(p.tieredSubsidyApr));
console.log("  site mexc USDT", JSON.stringify(byKey("mexc", "USDT").map((o) => [o.type, o.apr, o.aprMax, o.newUsers])));

/* ================= DEX ================= */
console.log("\n=== DEX");
const D = await site("/api/dex");
const ll = await j("https://yields.llama.fi/pools");
const map = new Map(ll.data.map((p) => [p.pool, p]));
let n = 0;
for (const p of D.pools.slice(0, 300)) {
  const r = map.get(p.id); if (!r) { check(false, `dex ${p.symbol} not in llama`); continue; }
  n++;
  check((close(p.apy, r.apy, 0.15) || Math.abs(p.apy - r.apy) < 0.011) && close(p.tvl, r.tvlUsd, 0.15), `dex ${p.project} ${p.symbol} apy ${p.apy}/${r.apy} tvl ${p.tvl}/${r.tvlUsd}`);
  if (p.apyBase !== undefined || p.apyReward !== undefined)
    check(Math.abs((p.apyBase ?? 0) + (p.apyReward ?? 0) - p.apy) < 0.05 * Math.max(1, p.apy) + 0.02, `dex ${p.project} ${p.symbol} base+reward ≠ apy (${p.apyBase}+${p.apyReward} vs ${p.apy})`);
}
console.log("  dex rows checked", n);

/* ================= PROMOS ================= */
console.log("\n=== PROMOS (reward labels)");
const PR = await site("/api/promos");
for (const p of PR.promos.filter((x) => x.reward).slice(0, 80)) console.log(`  ${(p.reward.label).padEnd(14)} ${p.reward.usd ? "$" : " "} ${p.title.slice(0, 110)}`);
console.log(`\nRESULT: ${ok} ok, ${bad} mismatches`);
