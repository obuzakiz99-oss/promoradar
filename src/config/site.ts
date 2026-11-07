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
  ({ id, name, kind: "cex", color, ink, monogram, logo: logo ? LOGO(logo) : undefined, site, refUrl: "" });
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
      "Deposit & trade challenge, first tier — 50 USDT for completing all three tasks: net deposit of at least 1,000 USDT, spot trading volume of at least 100 USDT and futures trading volume of at least 300,000 USDT.",
      "Higher tiers pay 400 USDT and 6,000 USDT for larger deposits and volumes (the exact requirements are shown after logging in).",
      "New Earn users: 120% APR for 3 days, first investment from 1 USDT.",
      "Rewards from this promotion cannot be combined with the trial VIP pass benefits.",
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
    ],
    checked: "2026-11-07",
  },
  {
    id: "cryptocom:app-referral", venue: "cryptocom", category: "referral",
    title: "Crypto.com app referral: up to $50 in CRO for you and your friend",
    url: "https://help.crypto.com/en/articles/3124990-app-referral-programme", from: "2026-11-01T00:00:00Z", until: "2026-11-30T23:59:00Z", reward: "$50",
    perUser: { amount: 50, unit: "USD" },
    rules: [
      "Invite a friend to the Crypto.com App with your referral link; you both get a reward in CRO when the friend reaches trading-volume steps.",
      "Most countries (Tier 4, incl. Ukraine): $100 in trading volume — $1 USD each; $500 — $5 each; $1,000 — $10 each; $5,000 — $50 each. Maximum per referral: $50 USD each.",
      "Higher amounts apply in some countries (Tiers 1–3) — the app shows your country's amounts.",
      "Separate monthly referral leaderboard: top referrers share a $30,000 USD prize pool in CRO (at least 3 referred friends with $1,000+ total trading volume).",
      "Referral and welcome bonuses cannot be combined. Rewards are paid in CRO to the app wallet.",
    ],
    checked: "2026-11-07",
  },
  {
    id: "kraken:app-referral", venue: "kraken", category: "referral",
    title: "Kraken app referral: $20 in crypto for you and your friend (up to $1,000)",
    url: "https://support.kraken.com/articles/kraken-app-referral-program", from: "2026-11-01T00:00:00Z", until: "2026-11-30T23:59:00Z", reward: "$20",
    perUser: { amount: 20, unit: "USD" },
    rules: [
      "Invite friends through the Kraken app referral program; once your friend signs up, deposits and trades crypto, you both receive the bonus.",
      "The bonus is a fixed $20 in your default currency (e.g. €20 worth of BTC, CA$20 of BTC or $20 USDG). A referrer can earn up to $1,000 in total.",
      "The deposit and trading conditions are shown in the app and can vary.",
      "The bonus is paid within 14 days of completing the terms.",
    ],
    checked: "2026-11-07",
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
    ],
    checked: "2026-11-07",
  },
  {
    id: "hyperliquid:referrals", venue: "hyperliquid", category: "referral",
    title: "Hyperliquid referrals: 4% off fees for your friend, 10% of their fees for you",
    url: "https://hyperliquid.gitbook.io/hyperliquid-docs/referrals", from: "2026-11-01T00:00:00Z", until: "2026-11-30T23:59:00Z",
    rules: [
      "Using a referral code gives a 4% discount on trading fees for the first $25M in volume.",
      "You can create your own referral code after $10,000 in trading volume; you then receive 10% of referred users' fees (less their discount) for their first $1B in volume.",
      "Referral rewards accrue in all quote assets and can be claimed once above $1. Discounts do not apply to vaults or sub-accounts.",
    ],
    checked: "2026-11-07",
  },
  {
    id: "lighter:referral-program", venue: "lighter", category: "referral",
    title: "Lighter referral program: 10–20% of friends' fees, 10% fee discount for them",
    url: "https://docs.lighter.xyz/programs/referral-program", from: "2026-07-28T00:00:00Z", until: "2026-11-30T23:59:00Z",
    rules: [
      "Lighter is free to trade for most users; the referral program pays when referred users choose a paid account type.",
      "Referrer kickback: Bronze 10% of referred users' gross fees (everyone); Silver 20% (15+ unique referrals, each active for 5+ days). Tier upgrades are reviewed weekly on Mondays.",
      "Referred users get a 10% discount on fees, rebated every Monday. Attribution is permanent — the code must be used at sign-up.",
    ],
    checked: "2026-11-07",
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
