import type { Category, Venue } from "@/lib/types";

/** Global site settings. Change the name/domain here once you pick them. */
export const SITE = {
  name: "PromoRadar",
  domain: "promoradar.example",          // TODO: your domain
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
};

/** DEX / DeFi protocols with their own campaigns. */
export const DEX: Record<string, V> = {
  hyperliquid: dex("hyperliquid", "Hyperliquid", "dex",  "#97FCE4", "#04140F", "HL", "hyperliquid",  "https://app.hyperliquid.xyz"),
  lighter:     dex("lighter",     "Lighter",     "dex",  "#E8ECF1", "#0B0D10", "Li", "lighter",      "https://app.lighter.xyz"),
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
