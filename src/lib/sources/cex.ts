import { CEX } from "@/config/site";
import { getJson, getText, parseRss } from "./util";
import BROWSER from "@/config/browser-promos.json";

export type Raw = {
  venue: string; id: string; title: string; url: string; publishedAt: number;
  startsAt?: number; endsAt?: number; tags?: string[]; hint?: string; trusted?: boolean;
};

/* Binance — CMS catalog 93 "Latest Activities" (pageSize must be 20 or 50; 50 ≈ the last month).
   Catalog 128 "Crypto Airdrop" was dropped 06.11: nothing new there since 2022. */
export async function binance(): Promise<Raw[]> {
  const out: Raw[] = [];
  for (const [cat, hint] of [[93, ""]] as const) {
    const j = await getJson(`https://www.binance.com/bapi/composite/v1/public/cms/article/list/query?type=1&pageNo=1&pageSize=50&catalogId=${cat}`);
    for (const a of j?.data?.catalogs?.[0]?.articles ?? [])
      out.push({ venue: "binance", id: a.code, title: a.title, url: `https://www.binance.com/en/support/announcement/detail/${a.code}`, publishedAt: a.releaseDate, hint, trusted: true });
  }
  return out;
}

/* Bybit — announcements API with start/end dates. */
export async function bybit(): Promise<Raw[]> {
  const j = await getJson("https://api.bybit.com/v5/announcements/index?locale=en-US&type=latest_activities&limit=40");
  return (j?.result?.list ?? []).map((a: any) => ({
    venue: "bybit", id: String(a.url).split("/").filter(Boolean).pop() ?? a.title, title: a.title, url: a.url,
    publishedAt: a.dateTimestamp || a.publishTime, startsAt: a.startDateTimestamp, endsAt: a.endDateTimestamp,
    tags: a.tags ?? [], hint: (a.tags ?? []).join(" "), trusted: true,
  }));
}

/* OKX — latest events, Jumpstart, Earn. */
export async function okx(): Promise<Raw[]> {
  const out: Raw[] = [];
  for (const [type, hint, trusted] of [["latest-events", "", true], ["announcements-jumpstart", "jumpstart", true], ["announcements-earn-and-loan", "earn", false]] as const) {
    const j = await getJson(`https://www.okx.com/api/v5/support/announcements?annType=${type}`);
    for (const a of j?.data?.[0]?.details ?? [])
      out.push({ venue: "okx", id: String(a.url).split("/").pop() ?? a.title, title: a.title, url: a.url, publishedAt: Number(a.pTime), hint, trusted });
  }
  return out;
}

/* Bitget — latest news, filtered to promos. */
export async function bitget(): Promise<Raw[]> {
  const j = await getJson("https://api.bitget.com/api/v2/public/annoucements?language=en_US&annType=latest_news");
  return (j?.data ?? []).map((a: any) => ({ venue: "bitget", id: String(a.annId), title: a.annTitle, url: a.annUrl, publishedAt: Number(a.cTime), hint: a.annSubType }));
}

/* KuCoin — activities. */
export async function kucoin(): Promise<Raw[]> {
  const j = await getJson("https://api.kucoin.com/api/v3/announcements?annType=activities&pageSize=40&lang=en_US");
  return (j?.data?.items ?? []).map((a: any) => ({ venue: "kucoin", id: String(a.annId), title: a.annTitle, url: a.annUrl, publishedAt: Number(a.cTime), trusted: true }));
}

/* Gate — public "Activities" announcements page (data embedded as JSON in the page). */
export async function gate(): Promise<Raw[]> {
  const html = await getText("https://www.gate.com/announcements/activities", 15_000);
  const m = html.match(/<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/);
  if (!m) throw new Error("gate: page data not found");
  const list = JSON.parse(m[1])?.props?.pageProps?.listData?.list ?? [];
  return list.map((a: any) => ({
    venue: "gate", id: String(a.id), title: a.title, url: `https://www.gate.com${a.url}`, publishedAt: Number(a.release_timestamp || a.created_t) * 1000, hint: a.tags,
  }));
}

/* Zendesk help centres (public API): XT, Bitunix, WEEX. */
function zendesk(venue: string, host: string) {
  return async (): Promise<Raw[]> => {
    const j = await getJson(`https://${host}/api/v2/help_center/en-us/articles.json?sort_by=created_at&sort_order=desc&per_page=60`);
    return (j?.articles ?? []).map((a: any) => ({ venue, id: String(a.id), title: a.title, url: a.html_url, publishedAt: Date.parse(a.created_at), hint: (a.label_names ?? []).join(" ") }));
  };
}
export const xt = zendesk("xt", "xtsupport.zendesk.com");
export const bitunix = zendesk("bitunix", "support.bitunix.com");
export const weex = zendesk("weex", "weexsupport.zendesk.com");
export const bitbase = zendesk("bitbase", "bitbase-support.zendesk.com");   // 08.11 official help-centre announcements
export const biconomy = zendesk("biconomy", "biconomy.zendesk.com");
export const hibt = zendesk("hibt", "support.hibt.com");
export const bitvavo = zendesk("bitvavo", "support.bitvavo.com");
export const zoomex = zendesk("zoomex", "zoomex.zendesk.com");
export const websea = zendesk("websea", "webseahelp.zendesk.com");
/**
 * Exchanges that refuse automated requests (403): their public promo list is read in a real browser every 2 h and
 * committed as src/config/browser-promos.json. An item disappears 26 h after it was last seen on the exchange page.
 */
type BrowserItem = { venue: string; id: string; title: string; url: string; desc?: string; startsAt?: number; endsAt?: number; firstSeen: number; lastSeen: number };
function browserChecked(venue: string) {
  return async (): Promise<Raw[]> => {
    const now = Date.now();
    return ((BROWSER as { items: BrowserItem[] }).items ?? [])
      .filter((i) => i.venue === venue && now - i.lastSeen < 26 * 3600_000)
      .map((i) => ({ venue, id: i.id, title: i.title, url: i.url, publishedAt: Math.min(i.firstSeen, i.startsAt ?? i.firstSeen), startsAt: i.startsAt, endsAt: i.endsAt, hint: i.desc, trusted: true }));
  };
}
export const blofin = browserChecked("blofin");

/* Bitfinex — official blog RSS, filtered to promos like Kraken. */
export async function bitfinex(): Promise<Raw[]> {
  const items = parseRss(await getText("https://blog.bitfinex.com/feed/", 15_000));
  return items.map((i) => ({ venue: "bitfinex", id: i.link, title: i.title, url: i.link, publishedAt: i.date }));
}

/* Kraken — official blog RSS, filtered to promos. */
export async function kraken(): Promise<Raw[]> {
  const items = parseRss(await getText("https://blog.kraken.com/feed", 15_000));
  return items.map((i) => ({ venue: "kraken", id: i.link, title: i.title, url: i.link, publishedAt: i.date }));
}

/** Direct exchange APIs/pages. Exchanges not listed here are covered via their official Telegram channel. */
export const CEX_SOURCES: Partial<Record<keyof typeof CEX, () => Promise<Raw[]>>> = { binance, bybit, okx, bitget, kucoin, gate, xt, bitunix, weex, bitbase, biconomy, hibt, bitvavo, zoomex, websea, bitfinex, blofin, kraken };
