/**
 * Token sales — where and when to take part (owner 13.11). Two sources:
 *  1) exchange announcements we already collect (Launchpad, Jumpstart, Startup, Spotlight, LaunchX, Binance Wallet TGE…)
 *  2) ICO Drops' active / upcoming lists, public rounds only (IEO / IDO / ICO / launchpad / wallet sales).
 * Private and seed rounds and "presales" (a common scam format) are left out on purpose.
 */
import { getPromos } from "./promos";
import { slugOf } from "./slug";
import { withBase } from "./base";
import { getText } from "./sources/util";
import type { Promo } from "./types";

export interface Sale {
  id: string;
  name: string;              // project or promo title
  ticker?: string;
  logo?: string;
  where: string;             // "Binance Wallet", "Bybit Launchpad", "IDO on Kommunitas"…
  kind: "exchange" | "wallet" | "launchpad";
  status: "active" | "upcoming";
  startsAt?: number;
  endsAt?: number;
  raised?: string;
  valuation?: string;
  category?: string;
  href: string;              // our page when we have one, otherwise the source
  external: boolean;
  source: string;            // the official / listing page
  venueId?: string;
}

export const SALES_SRC = "https://icodrops.com/category/active-ico/";

// announcement titles that are a token sale / subscription (not a Launchpool, which is staking and has its own section)
const SALE_RE = /\b(launchpad|token sale|ieo|ido|jumpstart|gate startup|startup (sale|project|subscription|mining)|kucoin spotlight|spotlight (sale|project|token)|launchx|prime sale|public sale|wallet (exclusive )?(tge|sale)|exclusive tge|buidlpad|coinlist|legion sale|sonar)\b/i;
const NOT_SALE = /launchpool|poolx|gempool|airdrop hunter|trading competition/i;
const PROGRAM: Array<[RegExp, string]> = [
  [/jumpstart/i, "Jumpstart"], [/startup/i, "Startup"], [/spotlight/i, "Spotlight"], [/launchx/i, "LaunchX"],
  [/wallet.*tge|tge.*wallet/i, "Wallet TGE"], [/launchpad/i, "Launchpad"], [/\bieo\b/i, "IEO"], [/token sale|public sale|prime sale/i, "Token sale"],
];

function fromPromos(promos: Promo[], lang: string, now: number): Sale[] {
  return promos
    .filter((p) => SALE_RE.test(p.titleOrig ?? p.title) && !NOT_SALE.test(p.titleOrig ?? p.title) && (!p.endsAt || p.endsAt > now))
    .map((p): Sale => {
      const t = p.titleOrig ?? p.title;
      const prog = PROGRAM.find(([re]) => re.test(t))?.[1] ?? "Token sale";
      return {
        id: `p:${p.id}`, name: p.title, where: `${p.venue.name} ${prog}`, kind: /wallet/i.test(prog) ? "wallet" : "exchange",
        status: p.startsAt && p.startsAt > now ? "upcoming" : "active", startsAt: p.startsAt, endsAt: p.endsAt,
        href: withBase(`/${lang}/p/${slugOf(p)}/`), external: false, source: p.url, venueId: p.venue.id,
      };
    });
}

// ICO Drops rounds we show: public sales only
const ROUND_OK = /\b(ieo|ido|ico|iko|icm|launchpad|launchx|public sale|wallet sale|sale on|buidlpad|coinlist|legion|sonar|echo|kaito)\b/i;
const ROUND_NO = /private|presale|pre-sale|seed|strategic|airdrop|retrodrop|incentiv|testnet|points?|tge and distribution/i;
const clean = (s: string) => s.replace(/<[^>]+>/g, " ").replace(/&nbsp;?/g, " ").replace(/&amp;/g, "&").replace(/\s+/g, " ").trim();

export function parseIcoDrops(html: string, status: Sale["status"], now: number): Sale[] {
  const out: Sale[] = [];
  for (const li of html.split('<li class="Tbl-Row Tbl-Row--usual"').slice(1)) {
    const cell = (cls: string) => clean(li.match(new RegExp(`Tbl-Row__item--${cls}"[^>]*>([\\s\\S]*?)</div>`))?.[1] ?? "");
    const round = cell("round");
    if (!ROUND_OK.test(round) || ROUND_NO.test(round)) continue;
    const slug = li.match(/assign\('\/([^']+?)\/?'\)/)?.[1];
    if (!slug) continue;
    const name = clean(li.match(/Cll-Project__name[^>]*>([\s\S]*?)<\/p>/)?.[1] ?? "") || slug;
    const ticker = clean(li.match(/Cll-Project__ticker[^>]*>([\s\S]*?)<\/(?:span|p)>/)?.[1] ?? "") || undefined;
    const logo = li.match(/data-src="(https:\/\/icodrops\.com\/media\/[^"]+)"/)?.[1];
    const dateTxt = cell("date");
    // "18d left" / "5h left" → an end; "from Jul 24, 2026" → a start (in the past for running sales)
    const left = dateTxt.match(/(\d+)\s*([dh])\s*left/i);
    const leftMs = left ? Number(left[1]) * (left[2].toLowerCase() === "d" ? 86400_000 : 3600_000) : 0;
    const d = leftMs ? now + leftMs : Date.parse(dateTxt.replace(/^(from|until|ends?)\s+/i, ""));
    const dash = (x: string) => (x && x !== "—" ? x : undefined);
    out.push({
      id: `ico:${slug}`, name, ticker, logo, where: round, kind: /wallet/i.test(round) ? "wallet" : /\b(ieo)\b/i.test(round) ? "exchange" : "launchpad",
      status, startsAt: status === "upcoming" && Number.isFinite(d) && d > now ? d : undefined,
      endsAt: status === "active" && leftMs ? d : undefined,
      raised: dash(cell("raised")), valuation: dash(cell("pre-valuation")), category: dash(cell("categories")),
      href: `https://icodrops.com/${slug}/`, external: true, source: `https://icodrops.com/${slug}/`,
    });
  }
  return out;
}

export async function getSales(lang: string): Promise<{ sales: Sale[]; fetchedAt: number; icoOk: boolean }> {
  const now = Date.now();
  const { promos, fetchedAt } = await getPromos(lang);
  const ex = fromPromos(promos, lang, now);
  let ico: Sale[] = [];
  let icoOk = true;
  try {
    const [act, up] = await Promise.all([getText(SALES_SRC, 20_000), getText("https://icodrops.com/category/upcoming-ico/", 20_000)]);
    ico = [...parseIcoDrops(act, "active", now), ...parseIcoDrops(up, "upcoming", now)];
  } catch { icoOk = false; }
  // one row per project: exchange announcements win over the listing
  const seen = new Set(ex.map((s) => s.name.toLowerCase()));
  const sales = [...ex, ...ico.filter((s) => !seen.has(s.name.toLowerCase()) && !!seen.add(s.name.toLowerCase()))]
    .sort((a, b) => (a.status === b.status ? (a.startsAt ?? a.endsAt ?? Infinity) - (b.startsAt ?? b.endsAt ?? Infinity) : a.status === "active" ? -1 : 1));
  return { sales, fetchedAt, icoOk };
}
