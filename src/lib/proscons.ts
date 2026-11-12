import type { Locale } from "./i18n";
import type { Hedge, Pool, PoolProject } from "./pools";
import type { EarnOffer } from "./earn";
import type { DexPool } from "./dexpools";

/** Auto-generated pros & cons for every APR on the site (data-driven, no opinions). */
export interface PC { pros: string[]; cons: string[] }

const D = {
  uk: {
    stableStake: "Стейк у стейблкоїні — без цінового ризику",
    majorStake: "Стейк у ліквідній монеті ({c})",
    highApr: "Високий APR {x}",
    bigFund: "Великий фонд винагород {x}",
    lowMin: "Низький поріг входу (від {x})",
    daysLeft: "Ще {x} днів нарахувань",
    canHedge: "Можна захеджувати шортом: {x}",
    fundingPlus: "Шорт ще й отримує фандинг {x}/рік",
    hedgedPos: "APR з хеджем ≈ {x}",
    buyToken: "Треба купити сам новий токен {c} — ризик ціни",
    dump: "{c} {x} за 24 год",
    aprFalling: "APR падає: на старті було {x}",
    noPerp: "Немає ф'ючерса на {c} — захеджуватись ніде",
    fundingMinus: "Шорт платить фандинг {x}/рік",
    thinBook: "Тонкий стакан {c} (~{x}) — великий вхід з прослизанням",
    highMin: "Високий мінімум: {x}",
    smallMax: "Ліміт на людину лише ~{x}",
    special: "Особливі умови / лише для частини користувачів",
    endsSoon: "Закінчується менш ніж за {x}",
    lowApr: "Низька дохідність — як звичайний Earn",
    rewardNew: "Нагорода в новому токені {c} — краще продавати одразу",
    // earn
    flexible: "Можна забрати будь-коли",
    redeemWait: "Виведення займає до {x}",
    swapTo: "{c} конвертується в {x} — діє ризик цієї монети",
    onchain: "Ончейн-стейкінг — дохід від мережі",
    stableCoin: "Стейблкоїн — без цінового ризику",
    highEarn: "Ставка вища за середню ({x})",
    locked: "Гроші заблоковано на {x} днів",
    tiered: "Підвищений APR лише на {x}",
    newOnly: "Лише для нових користувачів{x}",
    lowBase: "Базова ставка нижче 1%",
    volatileCoin: "Монета волатильна — дохід у {c}, ціна може впасти",
    // dex
    stablePool: "Пул стейблкоїнів — без цінового ризику",
    noIl: "Без IL-ризику",
    bigTvl: "Великий TVL {x} — перевірений пул",
    feeYield: "Дохід переважно з комісій, а не з емісії",
    stableApy: "APY стабільний (сер. 30д {x})",
    il: "IL-ризик: втрати при русі цін токенів",
    emissions: "{x} APY — винагороди в токені протоколу (можуть знецінитись)",
    spike: "APY зараз значно вищий за середній ({x}) — може не втриматись",
    smallTvl: "Малий TVL {x} — вищий ризик",
    extreme: "Дуже високий APY — зазвичай короткочасний або ризиковий",
  },
  en: {
    stableStake: "Stake is a stablecoin — no price risk",
    majorStake: "Stake is a liquid major ({c})",
    highApr: "High APR {x}",
    bigFund: "Large reward pool {x}",
    lowMin: "Low entry threshold (from {x})",
    daysLeft: "{x} more days of rewards",
    canHedge: "Hedgeable with a short: {x}",
    fundingPlus: "Short also receives funding {x}/yr",
    hedgedPos: "Hedged APR ≈ {x}",
    buyToken: "You must buy the new token {c} itself — price risk",
    dump: "{c} {x} in 24h",
    aprFalling: "APR is falling: launched at {x}",
    noPerp: "No perpetual for {c} — nowhere to hedge",
    fundingMinus: "Short pays funding {x}/yr",
    thinBook: "Thin {c} order book (~{x}) — big entries slip",
    highMin: "High minimum: {x}",
    smallMax: "Per-user cap only ~{x}",
    special: "Special conditions / not open to everyone",
    endsSoon: "Ends in less than {x}",
    lowApr: "Low yield — like plain Earn",
    rewardNew: "Paid in new token {c} — better sell on arrival",
    flexible: "Withdraw any time",
    redeemWait: "Withdrawal takes up to {x}",
    swapTo: "{c} is converted into {x} — that coin's risk applies",
    onchain: "On-chain staking — network yield",
    stableCoin: "Stablecoin — no price risk",
    highEarn: "Above-average rate ({x})",
    locked: "Funds locked for {x} days",
    tiered: "Boosted APR only on {x}",
    newOnly: "New users only{x}",
    lowBase: "Base rate below 1%",
    volatileCoin: "Volatile coin — yield in {c}, price can drop",
    stablePool: "Stablecoin pool — no price risk",
    noIl: "No impermanent-loss risk",
    bigTvl: "Large TVL {x} — battle-tested pool",
    feeYield: "Yield mostly from fees, not emissions",
    stableApy: "Steady APY (30d avg {x})",
    il: "IL risk: losses when token prices move",
    emissions: "{x} of APY is protocol-token rewards (can lose value)",
    spike: "APY far above its average ({x}) — may not last",
    smallTvl: "Small TVL {x} — higher risk",
    extreme: "Very high APY — usually short-lived or risky",
  },
  ru: {
    stableStake: "Стейк в стейблкоине — без ценового риска",
    majorStake: "Стейк в ликвидной монете ({c})",
    highApr: "Высокий APR {x}",
    bigFund: "Большой фонд наград {x}",
    lowMin: "Низкий порог входа (от {x})",
    daysLeft: "Ещё {x} дней начислений",
    canHedge: "Можно захеджировать шортом: {x}",
    fundingPlus: "Шорт ещё и получает фандинг {x}/год",
    hedgedPos: "APR с хеджем ≈ {x}",
    buyToken: "Нужно купить сам новый токен {c} — риск цены",
    dump: "{c} {x} за 24 ч",
    aprFalling: "APR падает: на старте было {x}",
    noPerp: "Нет фьючерса на {c} — хеджироваться негде",
    fundingMinus: "Шорт платит фандинг {x}/год",
    thinBook: "Тонкий стакан {c} (~{x}) — большой вход с проскальзыванием",
    highMin: "Высокий минимум: {x}",
    smallMax: "Лимит на человека всего ~{x}",
    special: "Особые условия / не для всех",
    endsSoon: "Заканчивается меньше чем через {x}",
    lowApr: "Низкая доходность — как обычный Earn",
    rewardNew: "Награда в новом токене {c} — лучше продавать сразу",
    flexible: "Можно забрать в любой момент",
    redeemWait: "Вывод занимает до {x}",
    swapTo: "{c} конвертируется в {x} — действует риск этой монеты",
    onchain: "Ончейн-стейкинг — доход от сети",
    stableCoin: "Стейблкоин — без ценового риска",
    highEarn: "Ставка выше средней ({x})",
    locked: "Деньги заблокированы на {x} дней",
    tiered: "Повышенный APR только на {x}",
    newOnly: "Только для новых пользователей{x}",
    lowBase: "Базовая ставка ниже 1%",
    volatileCoin: "Монета волатильна — доход в {c}, цена может упасть",
    stablePool: "Пул стейблкоинов — без ценового риска",
    noIl: "Без IL-риска",
    bigTvl: "Большой TVL {x} — проверенный пул",
    feeYield: "Доход в основном с комиссий, а не эмиссии",
    stableApy: "APY стабильный (ср. 30д {x})",
    il: "IL-риск: потери при движении цен токенов",
    emissions: "{x} APY — награды в токене протокола (могут обесцениться)",
    spike: "APY сейчас сильно выше среднего ({x}) — может не удержаться",
    smallTvl: "Малый TVL {x} — выше риск",
    extreme: "Очень высокий APY — обычно краткосрочный или рискованный",
  },
} as const;
type Key = keyof (typeof D)["uk"];

const STABLE = new Set(["USDT", "USDC", "USD1", "USDG", "FDUSD", "U", "DAI", "USDE", "PYUSD", "TUSD"]);
const MAJORS = new Set(["BTC", "ETH", "BNB", "SOL", "XRP", "GT", "KCS", "TON", "TRX", "DOGE", "ADA", "MX", "OKB", "XAUT"]);

const usd = (n: number) => (n >= 1e9 ? `$${+(n / 1e9).toFixed(1)}B` : n >= 1e6 ? `$${+(n / 1e6).toFixed(1)}M` : n >= 1e3 ? `$${Math.round(n / 1e3)}K` : `$${Math.round(n)}`);
const pct = (n: number) => { const a = Math.abs(n); return `${a >= 100 ? Math.round(n) : a >= 10 ? n.toFixed(1) : n.toFixed(2)}%`; };
const sign = (n: number) => `${n > 0 ? "+" : ""}${pct(n)}`;

function make(lang: Locale) {
  const d = D[lang];
  return (k: Key, x?: string | number, c?: string) => d[k].replace("{x}", String(x ?? "")).replace("{c}", c ?? "");
}

/* ---------------- hedge maths (shared with the board) ---------------- */
export interface HedgeCalc {
  needed: boolean;          // stake coin is volatile
  possible: boolean;
  venue?: string;           // best venue to short
  fundingApr?: number;      // >0 shorts receive
  costPct?: number;         // round-trip entry/exit cost, % of position
  hedgedApr?: number;
  sensibleUsd?: number;     // up to this size the hedge still keeps ≥ half of the period yield
}

/** Round-trip cost model: spot spread/slippage grows with size vs. visible depth; + spot & perp taker fees. */
const roundTrip = (amountUsd: number, depthUsd?: number) => {
  const slip = depthUsd ? 0.3 + 2 * (amountUsd / depthUsd) : 1.5;      // % per side on spot
  return 2 * Math.min(slip, 25) + 0.3;                                  // both sides + fees (~0.1% spot ×2, ~0.05% perp ×2)
};

/** Leverage assumed for the hedging short: 2× keeps the liquidation ~+50% away (new tokens jump 20–40% a day). */
export const HEDGE_LEV = 2;

export function hedgeCalc(pool: Pool, p: PoolProject, h: Record<string, Hedge>, amountUsd: number, now: number, maxUsd?: number): HedgeCalc {
  if (STABLE.has(pool.stake)) return { needed: false, possible: true };
  const hd = h[pool.stake];
  const perps = hd?.perps ?? [];
  if (!perps.length || pool.apr === undefined) return { needed: true, possible: false };
  const best = perps.reduce((m, x) => (x.fundingApr > m.fundingApr ? x : m), perps[0]);
  const days = Math.max(1, ((p.status === "live" ? p.end - now : p.end - p.start) / 86400_000));
  const amt = Math.max(amountUsd, 1);
  const costPct = roundTrip(amt, hd.spotDepthUsd);
  // the short needs its own margin: at HEDGE_LEV× every $1 staked ties up 1/HEDGE_LEV more, so the yield is
  // spread over stake + margin (audit 12.11: 173% + 44% funding was shown as 188% — on the stake alone)
  const hedgedApr = (pool.apr + best.fundingApr - (costPct * 365) / days) / (1 + 1 / HEDGE_LEV);
  // largest size where round-trip costs stay ≤ half of the period yield:
  // 2·(0.3 + 2·a/depth) + 0.3 ≤ Y/2  →  a ≤ (Y/2 − 0.9) · depth / 4
  const periodYield = ((pool.apr + best.fundingApr) * days) / 365;
  let sensibleUsd: number | undefined;
  if (hd.spotDepthUsd && periodYield > 0) {
    sensibleUsd = Math.max(0, ((periodYield / 2 - 0.9) * hd.spotDepthUsd) / 4);
    if (maxUsd) sensibleUsd = Math.min(sensibleUsd, maxUsd);
  }
  return { needed: true, possible: true, venue: best.ex, fundingApr: best.fundingApr, costPct, hedgedApr, sensibleUsd };
}

/* ---------------- Launchpool ---------------- */
export function poolPC(lang: Locale, p: PoolProject, pool: Pool, ctx: {
  now: number; chgStake?: number; chgReward?: number; price?: number; hedge: Record<string, Hedge>; amountUsd: number;
}): PC {
  const f = make(lang);
  const pros: string[] = [], cons: string[] = [];
  const stableStake = STABLE.has(pool.stake);
  const apr = pool.apr ?? 0;
  const left = (p.end - ctx.now) / 3600_000;

  if (stableStake) pros.push(f("stableStake"));
  else if (MAJORS.has(pool.stake)) pros.push(f("majorStake", "", pool.stake));
  if (apr >= 50) pros.push(f("highApr", pct(apr)));
  if ((p.rewardUsd ?? 0) >= 100_000) pros.push(f("bigFund", usd(p.rewardUsd!)));
  if (pool.minStake && ctx.price && pool.minStake * ctx.price <= 50) pros.push(f("lowMin", `${pool.minStake} ${pool.stake}`));
  if (p.status === "live" && left > 24 * 7) pros.push(f("daysLeft", Math.floor(left / 24)));

  if (!stableStake) {
    const hc = hedgeCalc(pool, p, ctx.hedge, ctx.amountUsd, ctx.now);
    if (hc.possible && hc.venue) {
      pros.push(f("canHedge", (ctx.hedge[pool.stake]?.perps ?? []).map((x) => x.ex).join(", ")));
      if ((hc.fundingApr ?? 0) > 1) pros.push(f("fundingPlus", sign(hc.fundingApr!)));
      if ((hc.fundingApr ?? 0) < -1) cons.push(f("fundingMinus", sign(hc.fundingApr!)));
      if ((hc.hedgedApr ?? 0) > 5) pros.push(f("hedgedPos", pct(hc.hedgedApr!)));
    } else cons.push(f("noPerp", "", pool.stake));
    const depth = ctx.hedge[pool.stake]?.spotDepthUsd;
    if (depth !== undefined && depth < 20_000) cons.push(f("thinBook", usd(depth), pool.stake));
  }
  if (pool.stake === p.token) cons.push(f("buyToken", "", p.token));
  if ((ctx.chgReward ?? 0) <= -10) cons.push(f("dump", sign(ctx.chgReward!), p.token));
  else if (!STABLE.has(p.token) && pool.stake !== p.token && (ctx.chgReward ?? 0) < 0) cons.push(f("rewardNew", "", p.token));
  if (pool.aprStart && apr && pool.aprStart > apr * 1.3) cons.push(f("aprFalling", pct(pool.aprStart)));
  if (pool.minStake && ctx.price && pool.minStake * ctx.price >= 1000) cons.push(f("highMin", `${pool.minStake.toLocaleString("en-US")} ${pool.stake}`));
  if (pool.maxStake && ctx.price && pool.maxStake * ctx.price < 1000) cons.push(f("smallMax", usd(pool.maxStake * ctx.price)));
  if (pool.newUsers) cons.push(f("special"));
  if (p.status === "live" && left < 48) cons.push(f("endsSoon", left < 24 ? `${Math.max(1, Math.round(left))} h` : "2 d"));
  if (stableStake && apr < 5) cons.push(f("lowApr"));
  return { pros, cons };
}

/* ---------------- Exchange Earn ---------------- */
const HRS: Record<Locale, string> = { uk: "год", en: "h", ru: "ч" };
const DAYS: Record<Locale, string> = { uk: "дн.", en: "days", ru: "дн." };
export function earnPC(lang: Locale, o: EarnOffer, avgForCoin: number): PC {
  const f = make(lang);
  const pros: string[] = [], cons: string[] = [];
  if (o.type === "flexible") pros.push(f("flexible"));
  if (o.type === "onchain") pros.push(f("onchain"));
  if (STABLE.has(o.coin)) pros.push(f("stableCoin"));
  if (avgForCoin > 0 && o.apr > avgForCoin * 1.3 && !o.newUsers) pros.push(f("highEarn", pct(avgForCoin)));
  if (o.type === "fixed" && o.days) cons.push(f("locked", o.days));
  if (o.aprMax && o.tierNote) cons.push(f("tiered", o.tierNote.replace("≤ ", "")));
  if ((o.redeemHours ?? 0) >= 2) cons.push(f("redeemWait", o.redeemHours! < 48 ? `${Math.round(o.redeemHours!)} ${HRS[lang]}` : `${Math.round(o.redeemHours! / 24)} ${DAYS[lang]}`));
  if (o.via) cons.push(f("swapTo", o.via, o.coin));
  if (o.newUsers) cons.push(f("newOnly", o.maxAmount ? ` · max ${o.maxAmount} ${o.coin}` : ""));
  if (o.apr < 1 && !o.newUsers) cons.push(f("lowBase"));
  if (!STABLE.has(o.coin)) cons.push(f("volatileCoin", "", o.coin));
  return { pros, cons };
}

/* ---------------- DEX / DeFi pools ---------------- */
export function dexPC(lang: Locale, p: DexPool): PC {
  const f = make(lang);
  const pros: string[] = [], cons: string[] = [];
  const rewardShare = p.apy > 0 ? (p.apyReward ?? 0) / p.apy : 0;
  if (p.stable) pros.push(f("stablePool"));
  if (!p.il) pros.push(f("noIl"));
  if (p.tvl >= 100e6) pros.push(f("bigTvl", usd(p.tvl)));
  if (rewardShare < 0.3 && (p.apyBase ?? 0) > 0) pros.push(f("feeYield"));
  if (p.apy30d && Math.abs(p.apy - p.apy30d) / Math.max(p.apy30d, 0.01) < 0.25) pros.push(f("stableApy", pct(p.apy30d)));
  if (p.il) cons.push(f("il"));
  if (rewardShare >= 0.5) cons.push(f("emissions", `${Math.round(rewardShare * 100)}%`));
  if (p.apy30d && p.apy > p.apy30d * 2 && p.apy > 10) cons.push(f("spike", pct(p.apy30d)));
  if (p.tvl < 5e6) cons.push(f("smallTvl", usd(p.tvl)));
  if (p.apy >= 100) cons.push(f("extreme"));
  return { pros, cons };
}
