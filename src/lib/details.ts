import fs from "node:fs";
import path from "node:path";
import { DEX_FEEDS } from "@/config/site";
import type { Promo } from "./types";
import { decodeEntities, getJson, getText } from "./sources/util";

/**
 * Full conditions & rules of a promo, taken from the exchange's own announcement (in its original language — English).
 * Fetched once per promo and kept in data/details.json (the `data` branch), so each build only fetches new promos.
 * OKX and Bybit block our honest crawler, so for those only the API summary is available.
 */
export type Block = { t: "h" | "p" | "li" | "tr"; x: string; cells?: string[] };
export type FactKey = "period" | "who" | "min" | "how" | "payout" | "region" | "kyc";
export interface Fact { k: FactKey; text: string }
export interface PromoDetails { blocks: Block[]; facts: Fact[]; at: number; partial?: boolean; v?: number }

const VER = 2;               // bump when the parser changes → cached promos are re-read
const MAX_NEW = 90;          // new articles fetched per build
const KEEP_MS = 45 * 86400_000;
const FILE = () => path.join(process.cwd(), "data", "details.json");

/* ------------------------------------------------------------------ HTML → blocks */
const BOILER = /^(this is a general announcement|products and services referred to here may not|risk warning|disclaimer:?$|thanks for your support|thank you for your support|the .* team$|binance reserves the right|follow us|join us|find us on|download the app|bitget team|kucoin team|gate team|\d{4}-\d{2}-\d{2}$)/i;

const ENT: Record<string, string> = {
  bull: "•", times: "×", ldquo: "“", rdquo: "”", lsquo: "‘", rsquo: "’", mdash: "—", ndash: "–", hellip: "…", middot: "·", ge: "≥", le: "≤",
  euro: "€", pound: "£", yen: "¥", trade: "™", reg: "®", copy: "©", deg: "°", plusmn: "±", rarr: "→", larr: "←", divide: "÷", laquo: "«", raquo: "»", frac12: "½", percnt: "%", dollar: "$",
};
const named = (s: string) => s.replace(/&([a-z]+\d*);/gi, (m, n: string) => ENT[n.toLowerCase()] ?? m);

function htmlToBlocks(html: string): Block[] {
  let h = html
    .replace(/<(script|style|svg|noscript|iframe)[\s\S]*?<\/\1>/gi, "")
    .replace(/<img[^>]*>/gi, "")
    // a line that is only bold text = a section heading
    .replace(/<(p|div)[^>]*>\s*(?:&nbsp;|\s)*<(strong|b)>([^<]{3,90})<\/\2>(?:&nbsp;|\s|:)*<\/\1>/gi, "\n§H§$3\n")
    .replace(/<h[1-6][^>]*>/gi, "\n§H§").replace(/<\/h[1-6]>/gi, "\n")
    .replace(/<li[^>]*>/gi, "\n§L§").replace(/<\/li>/gi, "\n");
  // tables → one marker line per row, cells joined by a separator
  h = h.replace(/<tr[^>]*>([\s\S]*?)<\/tr>/gi, (_, row: string) => {
    const cells = [...row.matchAll(/<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/gi)].map((m) => m[1].replace(/<[^>]+>/g, " "));
    return cells.length ? `\n§R§${cells.join("§C§")}\n` : "\n";
  });
  h = h.replace(/<br\s*\/?>/gi, "\n").replace(/<\/?(p|div|section|article|ul|ol|table|tbody|thead|blockquote)[^>]*>/gi, "\n").replace(/<[^>]+>/g, "");
  const clean = (s: string) => decodeEntities(named(s)).replace(/[​ \t ]+/g, " ").replace(/^[•·▪◦]\s*/, "").trim();
  const out: Block[] = [];
  for (const raw of h.split("\n")) {
    const line = raw.trim();
    if (!line) continue;
    if (line.startsWith("§R§")) {
      const cells = line.slice(3).split("§C§").map(clean);
      if (cells.some(Boolean)) out.push({ t: "tr", x: cells.join(" · "), cells });
      continue;
    }
    const t: Block["t"] = line.startsWith("§H§") ? "h" : line.startsWith("§L§") ? "li" : "p";
    const x = clean(line.replace(/^§[HL]§/, ""));
    if (!x || x.length < 2 || BOILER.test(x)) continue;
    // a short line ending with a colon reads as a heading too
    out.push({ t: t === "p" && x.length < 60 && /:$/.test(x) ? "h" : t, x: x.replace(/:$/, t === "h" ? "" : ":") });
  }
  // drop repeats and cap the size of a page
  const seen = new Set<string>();
  const res: Block[] = [];
  let chars = 0;
  for (const b of out) {
    const key = b.t + b.x;
    if (b.t !== "tr" && seen.has(key)) continue;
    seen.add(key);
    chars += b.x.length;
    if (chars > 14_000 || res.length >= 220) break;
    res.push(b.t === "h" && b.x.length > 120 ? { t: "p", x: b.x } : b);
  }
  return res;
}

/** Binance CMS body: a JSON tree of {node, tag, child, text}. */
function binanceTree(n: any): string {
  if (!n) return "";
  if (n.node === "text") return String(n.text ?? "").replace(/</g, "&lt;");
  const inner = (n.child ?? []).map(binanceTree).join("");
  return n.node === "element" && /^[a-z0-9]+$/i.test(n.tag ?? "") ? `<${n.tag}>${inner}</${n.tag}>` : inner;
}

/** Longest HTML-looking string inside the JSON state embedded in a page (Next.js / React Query pages). */
function htmlFromPage(page: string): string {
  let best = "";
  const score = (v: string) => (v.match(/<(p|li|h\d|table|div)[ >]/g) ?? []).length;
  for (const m of page.matchAll(/<script[^>]*>([\s\S]*?)<\/script>/g)) {
    const s = m[1].trim();
    const i = s.indexOf("{");
    if (i < 0 || s.length < 500) continue;
    let j: unknown;
    try { j = JSON.parse(s.slice(i).replace(/;\s*$/, "")); } catch { continue; }
    const walk = (v: unknown, depth: number) => {
      if (typeof v === "string") { if (v.length > best.length && score(v) > 2) best = v; }
      else if (v && typeof v === "object" && depth < 14) for (const x of Object.values(v)) walk(x, depth + 1);
    };
    walk(j, 0);
  }
  return best;
}

/* ------------------------------------------------------------------ key facts */
const FACT_RE: Array<[FactKey, RegExp]> = [
  // "Campaign Period: …", "Event Time: …", "Promotion A Period: 2026-11-01 … to …"
  ["period", /^[^\p{L}\p{N}]*[\p{L}\p{N} ]{0,30}\b(period|time|duration|window|dates?)\s*[:：]\s*\S/iu],
  ["who", /\b(new users?|newly registered|new (to|on) [A-Z]|first[- ]time|eligible (users|participants)|eligibility|only (available|open) to|all users|vip ?\d|sub-?accounts? (are|will) not)\b/i],
  ["min", /\b(minimum|min\.|at least|no less than|reach|accumulat\w+|net deposit|trading volume of|deposit of|trade (a total|at least))\b[^.]{0,60}\d/i],
  ["how", /\b(click|tap) (on )?(the )?["“]?(register|join|participate|claim|subscribe|apply|stake)|\bmust (register|sign up|opt in|join|click)|\bregister (for|via|on|through)|\bjoin (now|the event|the campaign)\b/i],
  ["payout", /\b(rewards?|prizes?|airdrops?|vouchers?|tokens?|bonus(es)?) (will|shall) be (distributed|credited|sent|airdropped|issued|allocated|delivered)|\bdistribut(ed|ion) (within|by|on|before|after)\b/i],
  ["region", /\b(not (be )?(available|eligible|open)|excluded|prohibited|restricted)\b[^.]{0,80}\b(regions?|countr(y|ies)|jurisdictions?|residents?|users (from|in|located))\b|\b(users|residents) (from|in) [^.]{0,80}\b(are not|cannot|will not be) (eligible|able)\b/i],
  ["kyc", /\b(KYC|identity verification|verified (users|accounts)|complete (the )?verification)\b/i],
];

function factsOf(blocks: Block[]): Fact[] {
  const out: Fact[] = [];
  const count: Partial<Record<FactKey, number>> = {};
  for (const b of blocks) {
    if (b.x.length < 25 || b.t === "tr") continue;                       // "Join Now" buttons, table rows
    if (b.t === "h" && !FACT_RE[0][1].test(b.x)) continue;                // headings only count as a period line
    const text = b.x.length > 260 ? `${b.x.slice(0, 257).replace(/\s+\S*$/, "")}…` : b.x;
    for (const [k, re] of FACT_RE) {
      if ((count[k] ?? 0) >= 2 || !re.test(b.x)) continue;
      if (out.some((f) => f.text === text)) continue;
      out.push({ k, text });
      count[k] = (count[k] ?? 0) + 1;
      break;          // one line → one fact
    }
  }
  const order: FactKey[] = ["period", "who", "min", "how", "payout", "kyc", "region"];
  return out.sort((a, b) => order.indexOf(a.k) - order.indexOf(b.k));
}

/* ------------------------------------------------------------------ per-source fetchers */
const ZENDESK: Record<string, string> = { xt: "xtsupport.zendesk.com", bitunix: "support.bitunix.com", weex: "weexsupport.zendesk.com" };

async function feedMap(): Promise<Map<string, string>> {
  const feeds = ["https://blog.kraken.com/feed", ...DEX_FEEDS.map((f) => f.feed)];
  const m = new Map<string, string>();
  const res = await Promise.allSettled(feeds.map((f) => getText(f, 15_000)));
  for (const r of res) {
    if (r.status !== "fulfilled") continue;
    for (const [, it] of r.value.matchAll(/<item>([\s\S]*?)<\/item>/g)) {
      const link = (it.match(/<link>([\s\S]*?)<\/link>/)?.[1] ?? "").replace(/<!\[CDATA\[|\]\]>/g, "").trim().split("?")[0];
      const body = it.match(/<content:encoded>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/content:encoded>/)?.[1];
      if (link && body) m.set(link, body);
    }
  }
  return m;
}

let lighterCache: Promise<Map<string, string>> | null = null;
const lighterMap = () => (lighterCache ??= getJson<{ announcements: Array<{ title: string; content: string; created_at: number }> }>("https://mainnet.zklighter.elliot.ai/api/v1/announcement")
  .then((j) => new Map((j.announcements ?? []).map((a) => [`lighter:${a.created_at}`, `<p>${a.title}</p>${a.content.split(/\n+/).map((l) => `<p>${l}</p>`).join("")}`])))
  .catch(() => new Map()));

let bybitCache: Promise<Map<string, string>> | null = null;
const bybitMap = () => (bybitCache ??= getJson<any>("https://api.bybit.com/v5/announcements/index?locale=en-US&type=latest_activities&limit=40")
  .then((j) => new Map<string, string>((j?.result?.list ?? []).map((a: any) => [String(a.url).split("/").filter(Boolean).pop() ?? "", `<p>${a.description ?? ""}</p>`])))
  .catch(() => new Map()));

async function fetchHtml(p: Promo, feeds: () => Promise<Map<string, string>>): Promise<{ html: string; partial?: boolean } | null> {
  const v = p.venue.id;
  const tail = p.id.slice(p.id.indexOf(":") + 1);
  if (p.id.startsWith("tg:")) {
    // single public post (embed view) — the post text is the whole announcement
    const page = await getText(`https://t.me/${tail}?embed=1&mode=tme`, 10_000);
    const body = page.match(/<div class="tgme_widget_message_text[^"]*"[^>]*>([\s\S]*?)<\/div>/)?.[1];
    if (!body) return null;
    // the channel's own linked article usually holds the full rules
    if (p.url && !p.url.startsWith("https://t.me/")) {
      const art = await fromUrl(p.url).catch(() => "");
      if (art) return { html: art };
    }
    // posts use <br> or, in the embed view, runs of spaces between lines
    const lines = body.replace(/<i class="emoji"[^>]*><b>([^<]*)<\/b><\/i>/g, "$1").split(/<br\s*\/?>|\s{2,}/i);
    return { html: lines.map((l) => `<p>${l}</p>`).join(""), partial: true };
  }
  if (v === "binance") {
    const j = await getJson<any>(`https://www.binance.com/bapi/composite/v1/public/cms/article/detail/query?articleCode=${tail}`, 10_000);
    const body = j?.data?.body;
    return body ? { html: binanceTree(typeof body === "string" ? JSON.parse(body) : body) } : null;
  }
  if (ZENDESK[v]) {
    const j = await getJson<any>(`https://${ZENDESK[v]}/api/v2/help_center/en-us/articles/${tail}.json`, 10_000);
    return j?.article?.body ? { html: j.article.body } : null;
  }
  if (v === "bybit") { const d = (await bybitMap()).get(tail); return d ? { html: d, partial: true } : null; }
  if (v === "okx") return null;                                   // OKX blocks the crawler; link only
  if (v === "lighter") { const d = (await lighterMap()).get(p.id); return d ? { html: d, partial: true } : null; }
  const fromFeed = (await feeds()).get(p.url.split("?")[0]);
  if (fromFeed) return { html: fromFeed };
  if (["kucoin", "bitget", "gate"].includes(v)) { const h = await fromUrl(p.url); return h ? { html: h } : null; }
  return null;
}

async function fromUrl(url: string): Promise<string> {
  const host = new URL(url).hostname;
  if (/okx\.com|bybit\.com|t\.me$/.test(host)) return "";
  return htmlFromPage(await getText(url, 12_000));
}

/* ------------------------------------------------------------------ cache + public API */
let MEM: Record<string, PromoDetails> | null = null;   // also keeps dev-server renders from refetching
function load(): Record<string, PromoDetails> {
  if (MEM) return MEM;
  try { MEM = JSON.parse(fs.readFileSync(FILE(), "utf8")); } catch { MEM = {}; }
  return MEM!;
}

/** Details for the given promos: cached ones + up to MAX_NEW freshly fetched. Never throws. */
export async function getDetails(promos: Promo[]): Promise<Record<string, PromoDetails>> {
  const now = Date.now();
  const store = load();
  const want = promos.filter((p) => p.venue.kind !== "airdrop" && !p.evergreen && store[p.id]?.v !== VER).slice(0, MAX_NEW);
  let feedP: Promise<Map<string, string>> | null = null;
  const feeds = () => (feedP ??= feedMap());
  const queue = [...want];
  const worker = async () => {
    for (let p = queue.shift(); p; p = queue.shift()) {
      try {
        const r = await fetchHtml(p, feeds);
        if (!r) continue;
        const blocks = htmlToBlocks(r.html);
        if (blocks.length) store[p.id] = { blocks, facts: factsOf(blocks), at: now, partial: r.partial, v: VER };
      } catch { /* leave for the next build */ }
    }
  };
  await Promise.all(Array.from({ length: 4 }, worker));
  // keep current promos + anything seen recently; save for the next build (the workflow commits the data folder)
  const live = new Set(promos.map((p) => p.id));
  for (const [id, d] of Object.entries(store)) if (!live.has(id) && now - d.at > KEEP_MS) delete store[id];
  try { if (fs.existsSync(path.dirname(FILE()))) fs.writeFileSync(FILE(), JSON.stringify(store)); } catch { /* read-only */ }
  const out: Record<string, PromoDetails> = {};
  for (const p of promos) if (store[p.id]) out[p.id] = store[p.id];
  return out;
}
