import type { Category, Venue } from "@/lib/types";

/** Global site settings. Change the name/domain here once you pick them. */
export const SITE = {
  name: "PromoRadar",
  // your domain: set NEXT_PUBLIC_SITE_DOMAIN in Vercel once you connect one; until then the Vercel URL is used
  domain: process.env.NEXT_PUBLIC_SITE_DOMAIN || process.env.VERCEL_PROJECT_PRODUCTION_URL || "promoradar.example",
  telegram: "https://t.me/",              // TODO: your Telegram channel
  contactEmail: "hello@promoradar.example",
  revalidateSeconds: 900,                 // feeds are re-read every 15 min
  freshDays: 30,                          // dated promos older than this (and without an end date) are hidden
};

const LOGO = (slug: string) => `https://icons.llamao.fi/icons/protocols/${slug}?w=64&h=64`;
type V = Venue & { site: string; refUrl: string };
const cex = (id: string, name: string, color: string, ink: string, monogram: string, logo: string | undefined, site: string): V =>
  ({ id, name, kind: "cex", color, ink, monogram, logo: logo ? (logo.startsWith("http") ? logo : LOGO(logo)) : undefined, site, refUrl: "" });
const dex = (id: string, name: string, kind: "dex" | "defi", color: string, ink: string, monogram: string, logo: string | undefined, site: string): V =>
  ({ id, name, kind, color, ink, monogram, logo: logo ? LOGO(logo) : undefined, site, refUrl: "" });

/**
 * Centralised exchanges. `refUrl` = YOUR referral link: when set, "Join" on that exchange's promos uses it.
 */
export const CEX: Record<string, V> = {
  binance:  cex("binance",  "Binance",  "#F0B90B", "#16130A", "B",  "binance-cex", "https://www.binance.com"),
  bybit:    cex("bybit",    "Bybit",    "#F7A600", "#15110A", "By", "bybit",       "https://www.bybit.com"),
  okx:      cex("okx",      "OKX",      "#E9EDF2", "#0B0D10", "OK", "okx",         "https://www.okx.com"),
  bitget:   cex("bitget",   "Bitget",   "#1DA2B4", "#04161A", "Bg", "bitget",      "https://www.bitget.com"),
  kucoin:   cex("kucoin",   "KuCoin",   "#23AF91", "#03140F", "Ku", "kucoin",      "https://www.kucoin.com"),
  gate:     cex("gate",     "Gate",     "#2354E6", "#FFFFFF", "G",  "gate",        "https://www.gate.com"),
  mexc:     cex("mexc",     "MEXC",     "#1E6AF6", "#FFFFFF", "MX", "mexc",        "https://www.mexc.com"),
  htx:      cex("htx",      "HTX",      "#2C8CFF", "#FFFFFF", "HTX","htx",         "https://www.htx.com"),
  bingx:    cex("bingx",    "BingX",    "#2A54FF", "#FFFFFF", "Bx", "bingx",       "https://bingx.com"),
  xt:       cex("xt",       "XT.com",   "#F9C846", "#15120A", "XT", undefined,     "https://www.xt.com"),
  bitunix:  cex("bitunix",  "Bitunix",  "#B9F641", "#0E1404", "Bu", "bitunix",     "https://www.bitunix.com"),
  weex:     cex("weex",     "WEEX",     "#E6E9EE", "#0B0D10", "W",  "weex",        "https://www.weex.com"),
  bitbase:  cex("bitbase",  "Bitbase",  "#3D7BFF", "#FFFFFF", "Bb", undefined,     "https://www.bitbase.com"),
  // 08.11 "all exchanges": CoinGecko-listed (trust ≥ 6) with an honest official source; logos from CoinGecko
  biconomy: cex("biconomy", "Biconomy.com", "#1E6BFF", "#FFFFFF", "Bi", "https://coin-images.coingecko.com/markets/images/633/small/logo_B._200x200.png?1723787144", "https://www.biconomy.com/en"),
  hibt:     cex("hibt",     "Hibt",     "#F5B300", "#141005", "Hb", "https://coin-images.coingecko.com/markets/images/11765/small/1000125652.jpg?1732085736", "https://hibt.com"),
  bitvavo:  cex("bitvavo",  "Bitvavo",  "#0051FF", "#FFFFFF", "Bv", "https://coin-images.coingecko.com/markets/images/714/small/bitvavo-mark-square-black.png?1706864670", "https://bitvavo.com/en"),
  zoomex:   cex("zoomex",   "Zoomex",   "#FF7A00", "#140A00", "Zx", "https://coin-images.coingecko.com/markets/images/11948/small/zoomex.png?1747987100", "https://www.zoomex.com/en-US/"),
  websea:   cex("websea",   "Websea",   "#14C08B", "#04140F", "Ws", "https://coin-images.coingecko.com/markets/images/1365/small/websea-logo-png.png?1706865385", "https://www.websea.com/en"),
  toobit:   cex("toobit",   "Toobit",   "#F0B90B", "#141005", "Tb", "https://coin-images.coingecko.com/markets/images/1139/small/Toobit_logo400X400.png?1706865157", "https://www.toobit.com"),
  coinstore: cex("coinstore", "Coinstore", "#FF3DA1", "#FFFFFF", "Cs", "https://coin-images.coingecko.com/markets/images/747/small/CS_New_Logo_Pink.png?1751613895", "https://www.coinstore.com"),
  btse:     cex("btse",     "BTSE",     "#2F6BFF", "#FFFFFF", "BT", "https://coin-images.coingecko.com/markets/images/464/small/BTSE.jpg?1706864449", "https://www.btse.com"),
  ourbit:   cex("ourbit",   "Ourbit",   "#00C2FF", "#04121A", "Ob", "https://coin-images.coingecko.com/markets/images/11731/small/logo_200_200_2.png?1755659673", "https://www.ourbit.com"),
  kcex:     cex("kcex",     "KCEX",     "#00D395", "#04140F", "KC", "https://coin-images.coingecko.com/markets/images/11953/small/photo_2025-05-27_02-31-22.jpg?1748284326", "https://kcex.com"),
  cexio:    cex("cexio",    "CEX.IO",   "#2CA8E0", "#FFFFFF", "CX", "https://coin-images.coingecko.com/markets/images/56/small/main-icon.png?1706864277", "https://cex.io"),
  poloniex: cex("poloniex", "Poloniex", "#00A28A", "#FFFFFF", "Po", "https://coin-images.coingecko.com/markets/images/37/small/poloniex.png?1706864269", "https://poloniex.com"),
  bitfinex: cex("bitfinex", "Bitfinex", "#16B157", "#FFFFFF", "Bf", "https://coin-images.coingecko.com/markets/images/4/small/BItfinex.png?1706864245", "https://www.bitfinex.com"),
  // 08.11 exchanges that refuse automated requests: BloFin is read in a real browser every 2 h (browser-promos.json);
  // the rest are listed with a link to their official promo page (PROMO_PAGES)
  blofin:   cex("blofin",   "BloFin",   "#FF8A00", "#140A00", "BF", "https://coin-images.coingecko.com/markets/images/1645/small/blofin_logo.jpeg?1718852326", "https://blofin.com"),
  coinw:    cex("coinw",    "CoinW",    "#1A6BFF", "#FFFFFF", "CW", "https://coin-images.coingecko.com/markets/images/1172/small/coinw_new_logo.png?1713879109", "https://www.coinw.com"),
  pionex:   cex("pionex",   "Pionex",   "#FF6A00", "#140A00", "Pi", "https://coin-images.coingecko.com/markets/images/1026/small/pionex.png?1706865056", "https://www.pionex.com"),
  deepcoin: cex("deepcoin", "Deepcoin", "#6C5CE7", "#FFFFFF", "Dc", "https://coin-images.coingecko.com/markets/images/1005/small/deepcoin.jpeg?1706864992", "https://www.deepcoin.com"),
  hotcoin:  cex("hotcoin",  "Hotcoin",  "#FF3B30", "#FFFFFF", "Hc", "https://coin-images.coingecko.com/markets/images/1345/small/hotcoin.png?1756783952", "https://www.hotcoin.com"),
  bydfi:    cex("bydfi",    "BYDFi",    "#F7C600", "#141005", "BY", "https://coin-images.coingecko.com/markets/images/1186/small/ce9bee68-163f-485c-bf30-e564bee117c9.jpeg?1752056235", "https://www.bydfi.com/en"),
  bullish:  cex("bullish",  "Bullish",  "#00C2A8", "#04140F", "Bu", "https://coin-images.coingecko.com/markets/images/905/small/bullish_com.png?1706864904", "https://bullish.com"),
  hashkey:  cex("hashkey",  "HashKey",  "#2B5BFF", "#FFFFFF", "HK", "https://coin-images.coingecko.com/markets/images/22385/small/HashKey_logo.png?1792487793", "https://exchange.hashkey.com/en-US/"),
  bitstamp: cex("bitstamp", "Bitstamp", "#2BB24C", "#FFFFFF", "Bs", "https://coin-images.coingecko.com/markets/images/9/small/bitstamp.jpg?1706864251", "https://www.bitstamp.net"),
  whitebit: cex("whitebit", "WhiteBIT", "#E9EDF2", "#0B0D10", "WB", "whitebit",    "https://whitebit.com"),
  coinex:   cex("coinex",   "CoinEx",   "#28C8B4", "#04140F", "CX", "coinex",      "https://www.coinex.com"),
  bitrue:   cex("bitrue",   "Bitrue",   "#F5B915", "#15120A", "Bt", "bitrue",      "https://www.bitrue.com"),
  kraken:   cex("kraken",   "Kraken",   "#7B61FF", "#FFFFFF", "Kr", "kraken",      "https://www.kraken.com"),
  cryptocom: cex("cryptocom", "Crypto.com", "#103F68", "#FFFFFF", "Cr", "crypto-com", "https://crypto.com"),
  gemini:   cex("gemini",   "Gemini",   "#00DCFA", "#04141A", "Ge", "gemini",      "https://www.gemini.com"),
  lbank:    cex("lbank",    "LBank",    "#F6C946", "#15120A", "LB", undefined,     "https://www.lbank.com"),
  phemex:   cex("phemex",   "Phemex",   "#E6E9EE", "#0B0D10", "Ph", undefined,     "https://phemex.com"),
  bitmart:  cex("bitmart",  "BitMart",  "#22C2A8", "#04140F", "BM", undefined,     "https://www.bitmart.com"),
};

/** DEX / DeFi protocols with their own campaigns. */
export const DEX: Record<string, V> = {
  hyperliquid: dex("hyperliquid", "Hyperliquid", "dex",  "#97FCE4", "#04140F", "HL", "hyperliquid",  "https://app.hyperliquid.xyz"),
  lighter:     dex("lighter",     "Lighter",     "dex",  "#E8ECF1", "#0B0D10", "Li", "lighter",      "https://app.lighter.xyz"),
  pumpfun:     dex("pumpfun",     "Pump.fun",    "dex",  "#86EFAC", "#05140A", "Pf", "pump.fun",     "https://pump.fun"),
  paradex:     dex("paradex",     "Paradex",     "dex",  "#7C5CFF", "#FFFFFF", "Pa", "paradex",      "https://app.paradex.trade"),
  ondoperps:   dex("ondoperps",   "Ondo Perps",  "dex",  "#3B82F6", "#FFFFFF", "On", "ondo-finance", "https://app.ondoperps.xyz"),
  aster:       dex("aster",       "Aster",       "dex",  "#F2C67C", "#15110A", "As", "aster",        "https://www.asterdex.com"),
  pancakeswap: dex("pancakeswap", "PancakeSwap", "dex",  "#1FC7D4", "#04141A", "Ca", "pancakeswap",  "https://pancakeswap.finance"),
  raydium:     dex("raydium",     "Raydium",     "dex",  "#C200FB", "#FFFFFF", "Ra", "raydium",      "https://raydium.io"),
  gmx:         dex("gmx",         "GMX",         "dex",  "#4B5CF0", "#FFFFFF", "GMX","gmx",          "https://app.gmx.io"),
  meteora:     dex("meteora",     "Meteora",     "dex",  "#FF5C1F", "#FFFFFF", "Me", "meteora",      "https://www.meteora.ag"),
  bluefin:     dex("bluefin",     "Bluefin",     "dex",  "#3D7BFF", "#FFFFFF", "Bf", "bluefin",      "https://bluefin.io"),
  edgex:       dex("edgex",       "edgeX",       "dex",  "#C6F432", "#0E1404", "eX", "edgex",        "https://www.edgex.exchange"),
  aerodrome:   dex("aerodrome",   "Aerodrome",   "dex",  "#2C64F6", "#FFFFFF", "Ae", "aerodrome",    "https://aerodrome.finance"),
  pendle:      dex("pendle",      "Pendle",      "defi", "#1BE3C2", "#04140F", "Pe", "pendle",       "https://www.pendle.finance"),
};

export const VENUES: Record<string, V> = { ...CEX, ...DEX };

/** Official promo / rewards pages of exchanges whose promos we can't read automatically (shown on their venue page). */
export const PROMO_PAGES: Record<string, string> = {
  blofin: "https://blofin.com/en/activity/",
  coinw: "https://www.coinw.com/en_US/events-calendar/active",
  pionex: "https://www.pionex.com/en/activity-center",
  deepcoin: "https://www.deepcoin.com/ps/en/welfare/home",
  hotcoin: "https://www.hotcoin.com/en_US/support/notice/",
  bydfi: "https://www.bydfi.com/en",
  bullish: "https://bullish.com",
  hashkey: "https://exchange.hashkey.com/en-US/",
  bitstamp: "https://www.bitstamp.net",
};

/** Official blogs (Medium RSS). */
export const DEX_FEEDS: Array<{ venue: keyof typeof DEX; feed: string }> = [
  { venue: "aster",     feed: "https://medium.com/feed/@asterdex" },
  { venue: "meteora",   feed: "https://medium.com/feed/@meteoraag" },
  { venue: "pendle",    feed: "https://medium.com/feed/@pendle" },
  { venue: "bluefin",   feed: "https://medium.com/feed/@bluefinapp" },
  { venue: "edgex",     feed: "https://medium.com/feed/@edgex" },
  { venue: "aerodrome", feed: "https://medium.com/feed/@aerodromefi" },
];

/** Official public Telegram announcement channels (read via the public t.me/s/<channel> preview). */
export const TELEGRAM: Array<{ venue: string; channel: string }> = [
  // fallbacks for exchanges whose APIs refuse GitHub's US build servers (duplicates with the API are merged)
  { venue: "bybit",       channel: "Bybit_Announcements" },
  { venue: "okx",         channel: "OKXAnnouncements" },
  { venue: "binance",     channel: "binance_announcements" },
  { venue: "kucoin",      channel: "kucoin_news" },
  { venue: "bitget",      channel: "bitget_announcements" },
  { venue: "mexc",        channel: "MEXCofficialNews" },
  { venue: "htx",         channel: "HTXGlobalAnnouncementChannel" },
  { venue: "bingx",       channel: "BingXAnnouncement" },
  { venue: "whitebit",    channel: "WhiteBIT" },
  { venue: "coinex",      channel: "coinex_announcement" },
  { venue: "bitrue",      channel: "bitrue_official" },
  { venue: "hyperliquid", channel: "hyperliquid_announcements" },
  { venue: "pancakeswap", channel: "PancakeSwapAnn" },
  { venue: "raydium",     channel: "Raydium" },
  { venue: "gmx",         channel: "GMX_Announcements" },
  { venue: "lighter",     channel: "lighter_announcements" },
  { venue: "pendle",      channel: "Pendle" },
  // 08.11 official announcement channels (active, posts link to the exchange's own domain)
  { venue: "toobit",      channel: "toobit_announcements" },
  { venue: "coinstore",   channel: "coinstore_global" },
  { venue: "btse",        channel: "btsenews" },
  { venue: "ourbit",      channel: "ourbitofficial" },
  { venue: "kcex",        channel: "kcex_announcements" },
  { venue: "cexio",       channel: "CEXIO_Announcements" },
  { venue: "poloniex",    channel: "poloniexannouncements" },
];

/** Venues we never show. Matched against ids/slugs/names, lower-case. */
export const BLOCKLIST: string[] = [];

/**
 * Paid placements. Pinned on top with a "Sponsored" label.
 * { id: "sp:1", venue: "bybit", title: "…", url: "https://…", category: "bonus", until: "2026-12-01", reward: "1,000 USDT" }
 */
export const SPONSORED: Array<{ id: string; venue: string; title: string; url: string; category: Category; until: string; reward?: string }> = [];

/**
 * Promos added by hand — for platforms that publish campaigns only where we can't read them automatically
 * (Pump.fun: X/Twitter + a Cloudflare-protected site; its Telegram channel isn't confirmed as official).
 * Only from the platform's own page; each entry disappears by itself after `until`.
 */
export const MANUAL: Array<{
  id: string; venue: string; title: string; url: string; category: Category; from?: string; until: string; reward?: string;
  perUser?: { amount: number; unit: string }; rules?: string[]; checked: string;
}> = [
  {
    id: "pumpfun:creator-competition-2026-11", venue: "pumpfun", category: "competition",
    title: "Pump.fun Creator Competition — $100,000 prize pool (1st place $50,000)",
    url: "https://pump.fun/creators", from: "2026-11-02T00:00:00Z", until: "2026-11-16T23:59:00Z", reward: "$100,000",
    perUser: { amount: 50_000, unit: "USD" },
    rules: [
      "Creator competition on Pump.fun: launch and grow your coin on the platform.",
      "Prize pool: $100,000. 1st place — $50,000; 5th place — $10,000.",
      "Period: November 2 – November 16, 2026.",
      "Participation is subject to the official competition rules and the Creator Competition Terms on pump.fun.",
      "Rewards are not trading profits and are not guaranteed. Programs are announced only on official pump.fun channels.",
      "The public announcement does not give the payout date or method for the prizes — they are set in the Creator Competition Terms on pump.fun; read them before taking part.",
    ],
    checked: "2026-11-06",
  },
  {
    // official: x.com/Pumpfun/status/2111167411647099077 (16.10.2026) + the in-app referral terms; no end date announced
    id: "pumpfun:referral-50-match", venue: "pumpfun", category: "referral",
    title: "Pump.fun app referral: your friend's first purchase matched up to $50 — for both of you",
    url: "https://x.com/Pumpfun/status/2111167411647099077", from: "2026-10-16T00:00:00Z", until: "2026-11-30T23:59:00Z", reward: "$50",
    perUser: { amount: 50, unit: "USD" },
    rules: [
      "Invite a friend to the Pump.fun app with your referral link or code.",
      "The friend makes a first fiat purchase (deposit) in the app — the reward equals that first purchase, up to $50, for the friend and for you.",
      "The reward is paid in installments only if the friend trades on 5 separate days within 10 days after the deposit is confirmed: 1/6 on each of the first four trading days and 2/6 on the fifth.",
      "If the friend does not reach 5 trading days within the 10-day window, the remaining installments are forfeited.",
      "Referred users also get about 10% lower trading fees. Referrers earn a share of their friends' fees (the temporary 4x referrer boost ended on November 2, 2026; referrers now get 1.5x — 37.5% of referred users' fees).",
      "Installments are credited after review. Pump.fun has not announced an end date — check the in-app Rewards section before inviting.",
    ],
    checked: "2026-11-07",
  },
  /* ---- standing referral programmes (official help pages, checked 07.11.2026); they have no end date, so each entry
         is re-checked monthly: `until` = end of the month, then the entry is renewed or removed by hand ---- */
  {
    id: "bitget:rewards-center-new-user", venue: "bitget", category: "bonus",
    title: "Bitget new-user Rewards Center: welcome pack + deposit & trade challenge (50 / 400 / 6,000 USDT)",
    url: "https://www.bitget.com/events/rewards", from: "2026-11-01T00:00:00Z", until: "2026-11-30T23:59:00Z", reward: "6,000 USDT",
    perUser: { amount: 6000, unit: "USDT" },
    rules: [
      "Bitget Rewards Center for new users (seen on the official page on November 7, 2026).",
      "Welcome pack: 200 USD as a BTC USDT-M futures position voucher; a three-day check-in task is part of it.",
      "Deposit & trade challenge, first tier — 50 USDT for completing all three tasks: net deposit of at least 1,000 USDT, plus 100 USDT or more of spot trading volume and 300,000 USDT or more of futures trading volume.",
      "Higher tiers pay 400 USDT and 6,000 USDT for larger deposits and volumes (the exact requirements are shown after logging in).",
      "New Earn users: 120% APR for 3 days, first investment from 1 USDT.",
      "Rewards from this promotion cannot be combined with the trial VIP pass benefits.",
      "The public page does not say how soon rewards are credited or which ones can be withdrawn: the welcome pack is a futures position voucher (not cash). Check each reward's details in the Rewards Center after logging in.",
    ],
    checked: "2026-11-07",
  },
  {
    id: "mexc:rewards-hub-new-user", venue: "mexc", category: "bonus",
    title: "MEXC Rewards Hub: 10 USDT futures voucher for signing up + 10 USDT for the app — no deposit needed",
    url: "https://www.mexc.com/rewards-hub", from: "2026-11-01T00:00:00Z", until: "2026-11-30T23:59:00Z", reward: "20 USDT",
    perUser: { amount: 20, unit: "USDT" },
    rules: [
      "MEXC Rewards Hub for new users (seen on the official page on November 7, 2026; the page advertises perks of up to 10,000 USDT in total).",
      "Sign up for a new account — 10 USDT voucher. First login in the MEXC App or Lite App — another 10 USDT voucher.",
      "Next steps (KYC, deposit, trade) unlock more rewards; their amounts are shown after logging in. Daily tasks add small futures bonuses (example: 1 USDT bonus for a day with 3,000 USDT of futures volume).",
      "Vouchers are 'Position Airdrops': when claimed, the system opens a futures position of the same value at the last price (isolated margin). You keep only the profit when closing; the remaining bonus is revoked; the maximum loss is capped at the airdrop amount.",
      "A voucher cannot be claimed if you already have an open position or pending order in that trading pair.",
      "Before doing any task, open the Rewards Hub page once — that counts as registration. Tasks and rewards are time-limited and first come, first served; some tasks need Primary or Advanced KYC. Only one new-user event at a time.",
      "Payout: after finishing a task, claim the reward manually. Every reward goes through a risk review of up to 7 calendar days; approved rewards appear under Rewards Hub → My Rewards. Unclaimed rewards expire after the claim period.",
      "Futures bonuses can only be used for futures trading (margin, fees, losses, funding) — the bonus itself cannot be withdrawn, only the profit made with it. Moving any funds out of the Futures account before the bonus is used up cancels the whole bonus. Unused bonuses are revoked at expiry, which can cause liquidation.",
      "Token Vouchers are the exception: redeem within 14 days in the Voucher Center and the tokens become fully yours (tradable and withdrawable). Fee vouchers only reduce futures trading fees.",
      "Net deposit = on-chain deposits + P2P/fiat buys + airdrops − withdrawals − P2P/fiat sells − transfers out. Internal transfers do not count as deposits. The offer is only for invited users in designated regions; users where derivatives are banned may not get futures rewards.",
    ],
    checked: "2026-11-08",
  },
  {
    id: "cryptocom:app-referral", venue: "cryptocom", category: "referral",
    title: "Crypto.com app referral: up to $50 for you and your friend",
    url: "https://help.crypto.com/en/articles/3124990-app-referral-programme", from: "2026-11-01T00:00:00Z", until: "2026-11-30T23:59:00Z", reward: "$50",
    perUser: { amount: 50, unit: "USD" },
    rules: [
      "Invite a friend to the Crypto.com App with your referral link; you both get a reward when the friend reaches trading-volume steps (amounts are in USD; the help page does not name the coin for these step rewards).",
      "Most countries (Tier 4, incl. Ukraine): $100 in trading volume — $1 USD each; $500 — $5 each; $1,000 — $10 each; $5,000 — $50 each. Maximum per referral: $50 USD each.",
      "Higher amounts apply in some countries (Tiers 1–3) — the app shows your country's amounts.",
      "Separate monthly referral leaderboard: the top 200 referrers by their friends' trading volume share a prize pool in CRO (the help page names both $25,000 and $30,000; 1st place $5,000). To qualify, your referred friends must trade at least $1,000 in total during the month. Plus a $5,000 lucky draw among all qualified referrers.",
      "Who counts: the friend signs up with your link or code, passes KYC (phone number + ID document; outside Europe the phone and the document must be from the same country) and lives in a region where the referral programme is available.",
      "The 30-day window starts at the moment the friend's KYC is approved (not at sign-up) and ends exactly 30 days later; all trades in that window count toward the volume steps.",
      "Payout: each step's reward is credited to both wallets within 24 hours after the step is reached. Leaderboard and lucky-draw prizes are paid to the app wallet within 7 days after the monthly campaign ends.",
      "You must have an active account to receive any bonus. Referral and welcome bonuses cannot be combined.",
    ],
    checked: "2026-11-08",
  },
  {
    id: "kraken:app-referral", venue: "kraken", category: "referral",
    title: "Kraken app referral: $20 in crypto for you and your friend (up to $1,000)",
    url: "https://support.kraken.com/articles/kraken-app-referral-program", from: "2026-11-01T00:00:00Z", until: "2026-11-30T23:59:00Z", reward: "$20",
    perUser: { amount: 20, unit: "USD" },
    rules: [
      "Invite friends through the Kraken app referral program; once your friend signs up, deposits and trades crypto, you both receive the bonus.",
      "The bonus is a fixed $20 in your default currency (e.g. €20 worth of BTC, CA$20 of BTC or $20 USDG). A referrer can earn up to $1,000 in total.",
      "You need a verified Kraken account. Your friend must be new to Kraken, must sign up through the Kraken app, and must live in the same country as you (in the EEA: any eligible EEA country).",
      "What to do: after signing up the friend has 30 days to deposit and make a crypto trade. Bundles and stablecoins do not count as eligible trades.",
      "Payout: the bonus is credited within 14 days after the conditions are met, as a fixed $20 in your default currency (e.g. €20 worth of BTC or $20 USDG).",
      "Referral bonuses are subject to programme limits and Kraken's discretion and are not guaranteed.",
    ],
    checked: "2026-11-08",
  },
  {
    id: "bybit:referral-250", venue: "bybit", category: "referral",
    title: "Bybit referral: up to 250 USDT for you and up to 250 USDT for your friend",
    url: "https://www.bybit.com/en/help-center/article/Bybit-Referral-Program-General-FAQ", from: "2026-10-30T00:00:00Z", until: "2026-11-30T23:59:00Z", reward: "250 USDT",
    perUser: { amount: 250, unit: "USDT" },
    rules: [
      "Invite a friend with your referral link. Both of you get the same reward at each step:",
      "Step 1: the friend makes a first trade of at least $50 within 14 days of registration — 50 USDT each.",
      "Step 2: the friend reaches at least $500 cumulative trading volume within 30 days after the first trade — 100 USDT each.",
      "Step 3: the friend reaches at least $10,000 trading volume within the same 30 days — another 100 USDT each.",
      "Trading volume counts spot, derivatives, options, Alpha, convert and other products on all sub-accounts; zero-fee trading pairs do not count.",
      "Payout: every reward first goes through a 3-day risk review, then appears in the Rewards Hub. It must be claimed within 10 days, otherwise it expires.",
      "The monthly pool is 500,000 USDT with a daily claim limit (first come, first served; friends with higher trading volume go first). If today's limit is used up, claim the next day — the daily pool refills at 00:00 UTC, while the monthly pool lasts.",
      "The FAQ does not say whether these rewards are withdrawable USDT or vouchers: it lists Fee Savers (non-withdrawable, only reduce trading fees) and Position Airdrops (trading vouchers) among its reward types. Check the reward's details page in the Rewards Hub before relying on cash.",
      "Referrers also earn 20% of the friend's net trading fees (25–30% at higher levels), paid daily at 04:00 UTC, for 365 days after the friend registers.",
      "Only for Bybit Global users — not available on Bybit EU / in the EEA and other restricted regions.",
    ],
    checked: "2026-11-08",
  },
  {
    id: "kraken:stablecoin-rewards", venue: "kraken", category: "earn",
    title: "Kraken stablecoin rewards: up to 4.25% APY on USDe, 2.25% on USDG — no lock-up, paid weekly",
    url: "https://support.kraken.com/articles/stablecoin-rewards", from: "2026-11-05T00:00:00Z", until: "2026-11-30T23:59:00Z",
    rules: [
      "Hold eligible stablecoins in a verified Kraken account and earn rewards automatically. Rewards are paid weekly; there is no lock-up, no minimum holding period and no reward fee — the coins stay tradable and withdrawable.",
      "Rates for non-subscribers (Kraken+ subscribers get about double): USDe up to 4.25% (Kraken+ 5.75%), APXUSD and AUSD up to 3% (6%), USDG up to 2.25% (4.5%), tGBP up to 2% (4%), USDC up to 2% (4%, only US/Canada/Australia/UK), RLUSD up to 1.75% (US/UK).",
      "USDG: worldwide except the EEA and prohibited regions. USDe and APXUSD: rest of world except Brazil, Argentina, UAE and prohibited regions. USDe rewards apply to balances up to 25,000 USDe per client.",
      "Rewards are paid in the same stablecoin you hold, directly into your existing balance (Stablecoin Rewards must be enabled). Your stablecoins are not lent out.",
      "Rates may change; Kraken can change or end the programme at any time. Rewards are funded by Kraken and are not bank deposits (no FDIC/FSCS cover). Geographic restrictions apply.",
    ],
    checked: "2026-11-08",
  },
  {
    id: "gemini:referral-50", venue: "gemini", category: "referral",
    title: "Gemini referral: $50 in crypto for you and your friend",
    url: "https://www.gemini.com/referrals", from: "2026-11-01T00:00:00Z", until: "2026-11-30T23:59:00Z", reward: "$50",
    perUser: { amount: 50, unit: "USD" },
    rules: [
      "Invite friends to Gemini — you both earn $50 in the crypto of your choice.",
      "Condition: your friend trades at least $100 within their first 30 days.",
      "Gemini is not available in every country — check that your country is supported before signing up.",
      "The public referral page does not say when the $50 is credited or whether it can be withdrawn right away — check the referral terms in the Gemini app before counting on it.",
    ],
    checked: "2026-11-08",
  },
  {
    id: "hyperliquid:referrals", venue: "hyperliquid", category: "referral",
    title: "Hyperliquid referrals: 4% off fees for your friend, 10% of their fees for you",
    url: "https://hyperliquid.gitbook.io/hyperliquid-docs/referrals", from: "2026-11-01T00:00:00Z", until: "2026-11-30T23:59:00Z",
    rules: [
      "Using a referral code gives a 4% discount on trading fees for the first $25M in volume.",
      "You can create your own referral code after $10,000 in trading volume; you then receive 10% of referred users' fees (less their discount) for their first $1B in volume.",
      "Referral rewards accrue in all quote assets and can be claimed once above $1 (manually, on the Referrals page). Discounts do not apply to vaults or sub-accounts.",
    ],
    checked: "2026-11-08",
  },
  /* ---- perp-DEX points & reward programmes (official docs, checked 07.11.2026) ---- */
  {
    id: "aster:usd1-rwa-boost-phase-1", venue: "aster", category: "earn",
    title: "Aster USD1 RWA Boost: trade & hold RWA perps for a share of 125M WLFI + 6.25M USD1",
    url: "https://docs.asterdex.com/usd1-rwa-boost-phase-1/usd1-rwa-boost-phase-1", from: "2026-08-31T00:00:00Z", until: "2026-12-31T23:59:00Z", reward: "6,250,000 USD1",
    rules: [
      "Campaign period: August 31 – December 31, 2026. Weekly epochs (Monday 00:00 – Sunday 23:59 UTC); total rewards 125M WLFI and 6.25M USD1, split equally across epochs.",
      "Trading Points (from taker volume on eligible pairs, with a daily multiplier based on your open-interest-to-volume ratio) share the USD1 pool. Open Interest Points (positions snapshotted every 5 minutes) share the WLFI pool.",
      "Eligible pairs: SPCX/USD1, CL/USD1, XAU/USD1, SNDK/USD1, SKHYNIX/USD1, MU/USD1, GPRO/USD1 (the campaign page has the current list).",
      "USD1 must be more than 50% of your perpetual account balance (multi-asset mode), or the position must use USD1 as collateral (single-asset mode).",
      "From Epoch 9 (October 26, 2026) hidden positions no longer earn OI Points.",
    ],
    checked: "2026-11-07",
  },
  {
    id: "aster:trade-and-earn", venue: "aster", category: "earn",
    title: "Aster Trade & Earn: extra rewards for trading with USDF / asBNB as margin",
    url: "https://docs.asterdex.com/program-and-rewards/trade-and-earn", from: "2026-11-01T00:00:00Z", until: "2026-11-30T23:59:00Z",
    rules: [
      "Use Aster's yield-bearing assets USDF or asBNB as margin for perpetual trades — the collateral keeps earning its own yield and you get Trade & Earn rewards on top.",
      "Weekly trading volume requirement: 50,000 USD. USDF rewards are calculated Thursday to the following Wednesday.",
      "At most 100,000 USDF per account counts toward the reward calculation. asBNB counts as collateral at a 95% ratio.",
      "Trading rewards require trading on at least 2 days per week with at least 50,000 USD weekly volume. Holding rewards are calculated hourly from snapshots of your holdings.",
      "Payout: last week's rewards are sent automatically in USDF to your Futures account within 7 business days after the week ends; see [Rewards History].",
    ],
    checked: "2026-11-08",
  },
  {
    id: "aster:referral-program", venue: "aster", category: "referral",
    title: "Aster referral program: 10% of friends' fees, split as you like with them",
    url: "https://docs.asterdex.com/program-and-rewards/referral-program", from: "2026-11-01T00:00:00Z", until: "2026-11-30T23:59:00Z",
    rules: [
      "Generate a referral link on the Referral page and share it; you earn commission on every perp trade your friends make.",
      "The default 10% commission can be split, e.g. 5% for you and 5% back to your friend as a fee discount.",
      "High-volume affiliates can apply for an upgraded rate: 20% from referred VIP 1 users, 10% from VIP 2 and above.",
      "Payout: rebates are calculated in real time and transferred to your Aster account by the next day, in the same asset your friend paid fees in.",
      "Only new users who sign up through your link count; there is no limit on how many you invite. The referral link stays valid for 365 days by default.",
    ],
    checked: "2026-11-08",
  },
  {
    id: "paradex:xp-season-3", venue: "paradex", category: "airdrop",
    title: "Paradex XP Season 3: 4,000,000 XP shared every week",
    url: "https://docs.paradex.trade/docs/xp-referrals/xp", from: "2026-02-01T00:00:00Z", until: "2026-11-30T23:59:00Z",
    rules: [
      "Season 3 started on February 1, 2026; end date TBD. A pool of 4,000,000 XP is distributed every Wednesday.",
      "XP is earned for contributing to the platform: trading, providing liquidity and community activity. Linking X and Discord helps the team tell real users from Sybils.",
      "Season 3 introduces a new XP earning mechanic (details in the official docs as they are published).",
      "Payout: XP (points, not money) is credited every Wednesday for the previous week. XP itself cannot be withdrawn or sold; its future value is not promised.",
      "XP is Paradex's reward system; earlier seasons' XP was converted into a share of the DIME token supply. No value of future XP is promised.",
    ],
    checked: "2026-11-08",
  },
  {
    id: "paradex:referrals", venue: "paradex", category: "referral",
    title: "Paradex referrals: 10% of your friends' XP, +5% XP for them",
    url: "https://docs.paradex.trade/docs/xp-referrals/affiliate-referrals", from: "2026-11-01T00:00:00Z", until: "2026-11-30T23:59:00Z",
    rules: [
      "Referrers earn 10% of their referees' XP; referees get a 5% XP bonus on their trading activity.",
      "You must refer at least $10k+ in volume to qualify. Self-referrals do not earn XP commissions.",
      "Affiliates in the Token-Aligned Affiliate Program also earn a pro-rata share of 1.0% of the DIME supply via TAP Points (1M TAP Points every 2 weeks).",
      "Payout: referral XP arrives with the weekly XP drop (Wednesdays) — it is points, not money. TAP Points are distributed every 2 weeks; the DIME tokens they lead to have a 3-month lock-up after the programme ends.",
    ],
    checked: "2026-11-08",
  },
  {
    id: "lighter:referral-program", venue: "lighter", category: "referral",
    title: "Lighter referral program: 10–20% of friends' fees, 10% fee discount for them",
    url: "https://docs.lighter.xyz/programs/referral-program", from: "2026-07-28T00:00:00Z", until: "2026-11-30T23:59:00Z",
    rules: [
      "Lighter is free to trade for most users; the referral program pays when referred users choose a paid account type.",
      "Referrer kickback: Bronze 10% of referred users' gross fees (everyone); Silver 20% (15+ unique referrals, each active for 5+ days). Tier upgrades are reviewed weekly on Mondays.",
      "Referred users get a 10% discount on fees, rebated every Monday. Attribution is permanent — the code must be used at sign-up.",
      "Payout: kickbacks and rebates are paid every Monday as L2 transfers in LIT tokens, covering fees from Monday 00:00 to Sunday 23:59 UTC of the previous week. Minimum payout $1. The value of LIT can change.",
    ],
    checked: "2026-11-08",
  },
];

export const PRO = {
  priceMonthUsd: 9,
  priceYearUsd: 79,
  checkoutUrl: "",   // TODO: payment link once chosen
};

/** Strip config-only fields so a venue can be embedded into a promo. */
export function venueOf(id: string): Venue {
  const { site, refUrl, ...v } = VENUES[id];
  return v;
}

/** Until the owner fills these in, links that would lead nowhere stay hidden (Telegram CTAs, Pro checkout, ads contact). */
export const HAS_TG = /t\.me\/[A-Za-z0-9_+]{3,}/.test(SITE.telegram);
export const HAS_PRO = !!PRO.checkoutUrl;
