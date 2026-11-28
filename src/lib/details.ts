import { readStore, writeStore } from "./store";
import { regionName } from "./regions";
import JUNK_JSON from "@/config/rules-junk.json";
import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { DEX_FEEDS } from "@/config/site";
import BROWSER_RULES from "@/config/browser-rules.json";
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
export interface PromoDetails { blocks: Block[]; facts: Fact[]; at: number; partial?: boolean; v?: number; translated?: number; ex?: number; u?: string }

const VER = 8;               // (7: 26.11 Telegram post text kept before the linked page) (6: 24.11 related-article bodies skipped) bump when the parser changes → cached promos are re-read
const MAX_NEW = 90;          // new articles fetched per build
const KEEP_MS = 45 * 86400_000;
const FILE = () => path.join(process.cwd(), "data", "details.json");

/* ------------------------------------------------------------------ HTML → blocks */
const BOILER = /^(this is a general announcement|sign up and claim up to|products and services referred to here may not|risk warning|disclaimer:?$|thanks for your support|thank you for your support|the .* team$|binance reserves the right|follow us|join us|find us on|download the app|bitget team|kucoin team|gate team|\d{4}-\d{2}-\d{2}$)/i;

const ENT: Record<string, string> = {
  bull: "•", times: "×", ldquo: "“", rdquo: "”", lsquo: "‘", rsquo: "’", mdash: "—", ndash: "–", hellip: "…", middot: "·", ge: "≥", le: "≤",
  euro: "€", pound: "£", yen: "¥", trade: "™", reg: "®", copy: "©", deg: "°", plusmn: "±", rarr: "→", larr: "←", divide: "÷", laquo: "«", raquo: "»", frac12: "½", percnt: "%", dollar: "$",
};
const named = (s: string) => s.replace(/&([a-z]+\d*);/gi, (m, n: string) => ENT[n.toLowerCase()] ?? m);

export function htmlToBlocks(html: string): Block[] {
  let h = html
    .replace(/<(script|style|svg|noscript|iframe)[\s\S]*?<\/\1>/gi, "")
    .replace(/<img[^>]*>/gi, "")
    // a line that is only bold text = a section heading
    .replace(/<(p|div)[^>]*>\s*(?:&nbsp;|\s)*<(strong|b)>([^<]{3,90})<\/\2>(?:&nbsp;|\s|:)*<\/\1>/gi, "\n§H§$3\n")
    .replace(/<h[1-6][^>]*>/gi, "\n§H§").replace(/<\/h[1-6]>/gi, "\n")
    .replace(/<li[^>]*>/gi, "\n§L§").replace(/<\/li>/gi, "\n");
  // tables → one marker line per row, cells joined by a separator
  h = h.replace(/<tr[^>]*>([\s\S]*?)<\/tr>/gi, (_, row: string) => {
    const cells = [...row.matchAll(/<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/gi)].map((m) => m[1].replace(/<[^>]+>/g, " ").replace(/\s+/g, " "));   // line breaks inside a cell must not split the row
    return cells.length ? `\n§R§${cells.join("§C§")}\n` : "\n";
  });
  h = h.replace(/<br\s*\/?>/gi, "\n").replace(/<\/?(p|div|section|article|ul|ol|table|tbody|thead|blockquote)[^>]*>/gi, "\n").replace(/<[^>]+>/g, "");
  // some sources escape twice ("&amp;amp;") — decode twice
  const clean = (s: string) => decodeEntities(named(decodeEntities(named(s)))).replace(/[​ \t ]+/g, " ").replace(/^[•·▪◦]\s*/, "").trim();
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
  // a "rules" text that is mostly code is not the rules: reject it; otherwise drop stray code lines
  if (out.length && out.filter((b) => CODE_LINE.test(b.x)).length / out.length > 0.1) return [];
  for (let i = out.length - 1; i >= 0; i--) if (CODE_LINE.test(out[i].x)) out.splice(i, 1);
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

/** Script / CSS text that sometimes sits in a page's embedded state next to the article (never show it as "rules"). */
const CODE_LINE = /function\s*\(|=>\s*[{(]|\bvar\s+\w+\s*=|\breturn\s+typeof\b|\/\*[\s\S]*?\*\/|window\.|document\.|\bconst\s+\w+\s*=|^\s*[{}]\s*$|[;{]\s*[a-z$_][\w$]*\s*[=(.]|@media|!important/;
export function looksLikeCode(s: string): boolean {
  const lines = s.split(/\n|<\/?(?:p|div|br)[^>]*>/).map((l) => l.trim()).filter((l) => l.length > 3);
  if (!lines.length) return false;
  return lines.filter((l) => CODE_LINE.test(l)).length / lines.length > 0.15 || /Build time:|webpackChunk|__NEXT_DATA__|sourceMappingURL/.test(s);
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
      if (typeof v === "string") { if (v.length > best.length && score(v) > 2 && !looksLikeCode(v)) best = v; }
      // audit 24.11: BYDFi pages embed the longer bodies of "related articles" — every BYDFi promo got the Autumn
      // Challenge rules. Sidebars / related / recommended lists are never the article itself.
      else if (v && typeof v === "object" && depth < 14) for (const [k, x] of Object.entries(v)) { if (!/^_?(related|recommend|hot|latest|other|more|allSections)/i.test(k)) walk(x, depth + 1); }
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
  // translated rules too (audit 12.11: "пройдуть верифікацію особи" was not seen as KYC on /uk)
  ["kyc", /\b(KYC|identity verification|verified (users|accounts)|complete (the )?verification)\b|верифікац\p{L}* (особи|особистост\p{L}*|акаунт\p{L}*)|пройд\p{L}* верифікац|верификац\p{L}* (личност\p{L}*|аккаунт\p{L}*)|пройд\p{L}* верификац|підтвердж\p{L}* особ/iu],
];

export function factsOf(blocks: Block[]): Fact[] {
  const out: Fact[] = [];
  const count: Partial<Record<FactKey, number>> = {};
  for (const b of blocks) {
    if (b.x.length < 25 || b.t === "tr") continue;                       // "Join Now" buttons, table rows
    if (b.t === "h" && !FACT_RE[0][1].test(b.x)) continue;                // headings only count as a period line
    const text = b.x.replace(/^\s*\(?\d{1,2}[.)]\s+(?=\S)/, "");   // full line — never cut; raw source numbering dropped (audit 14.11)
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

/* ------------------------------------------------------------------ exact dates + how much one person can get */
const MON: Record<string, number> = { jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5, jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11 };
// whole month names only ("5 market" must not read as 5 March)
const MRE = "(january|february|march|april|may|june|july|august|september|october|november|december|jan|feb|mar|apr|jun|jul|aug|sept?|oct|nov|dec)\\.?(?![a-z])";
// audit 28.11 (accuracy): Coinstore "Period: 2 PM, Nov 19 – 2 PM, Dec 3, 2026 (GMT+8)" — an hour without minutes was not read, the
// promo showed 18 Nov 16:00 – 3 Dec 15:59 UTC instead of 19 Nov 06:00 – 3 Dec 06:00; minutes may be left out before am/pm
const TIME = "(\\d{1,2})(?::(\\d{2})(?::\\d{2})?|(?=\\s*(?:am|pm)\\b))\\s*(am|pm)?";
const D_ISO = new RegExp(`(\\d{4})[-/.](\\d{1,2})[-/.](\\d{1,2})(?:[ T,]+(?:at\\s*)?${TIME})?`, "gi");
const D_MDY = new RegExp(`\\b${MRE}\\s+(\\d{1,2})(?:st|nd|rd|th)?,?\\s+(\\d{4})(?:,?\\s*(?:at\\s*)?${TIME})?`, "gi");
const D_DMY = new RegExp(`\\b(\\d{1,2})(?:st|nd|rd|th)?\\s+${MRE},?\\s+(\\d{4})(?:,?\\s*(?:at\\s*)?${TIME})?`, "gi");
const TIME_BEFORE = new RegExp(`${TIME}\\s*(?:\\((?:UTC|GMT)[^)]*\\))?\\s*(?:on|,)?\\s*$`, "i");
// without a year ("from 3 Nov to 2 Dec", "Nov 6 – Nov 13") — only used when the year is known from the publish date
const D_MD = new RegExp(`\\b${MRE}\\s+(\\d{1,2})(?:st|nd|rd|th)?\\b(?!,?\\s*\\d{4})(?:,?\\s*(?:at\\s*)?${TIME})?`, "gi");
const D_DM = new RegExp(`\\b(\\d{1,2})(?:st|nd|rd|th)?\\s+${MRE}(?!\\w)(?!,?\\s*\\d{4})(?:,?\\s*(?:at\\s*)?${TIME})?`, "gi");

/** All date-times in a line (ms, UTC; "UTC+8" etc. in the line is honoured), in reading order. */
export function datesIn(line: string, refMs?: number): Array<{ ms: number; hasTime: boolean }> {
  const tz = line.match(/\b(?:UTC|GMT)\s*([+-])\s*(\d{1,2})(?::?(\d{2}))?/i);
  const off = tz ? (tz[1] === "-" ? -1 : 1) * (Number(tz[2]) * 60 + Number(tz[3] ?? 0)) : 0;
  const hits: Array<{ i: number; end: number; ms: number; hasTime: boolean }> = [];
  const add = (i: number, len: number, y: number, mo: number, d: number, hh?: string, mm?: string, ap?: string) => {
    if (hits.some((h) => i < h.end && i + len > h.i)) return;           // overlapping match from another pattern
    let H = hh !== undefined ? Number(hh) : undefined, M = mm !== undefined ? Number(mm) : 0;
    if (H === undefined) {                                               // "14:00 on November 4, 2026"
      const b = line.slice(Math.max(0, i - 28), i).match(TIME_BEFORE);
      if (b) { H = Number(b[1]); M = b[2] ? Number(b[2]) : 0; ap = b[3]; }
    }
    if (H !== undefined && ap) { if (/pm/i.test(ap) && H < 12) H += 12; if (/am/i.test(ap) && H === 12) H = 0; }
    if (y < 2020 || y > 2035 || mo < 0 || mo > 11 || d < 1 || d > 31 || (H ?? 0) > 23) return;
    const ms = Date.UTC(y, mo, d, H ?? 0, M) - off * 60_000;
    hits.push({ i, end: i + len, ms, hasTime: H !== undefined });
  };
  for (const m of line.matchAll(D_ISO)) add(m.index!, m[0].length, +m[1], +m[2] - 1, +m[3], m[4], m[5], m[6]);
  for (const m of line.matchAll(D_MDY)) add(m.index!, m[0].length, +m[3], MON[m[1].slice(0, 3).toLowerCase()], +m[2], m[4], m[5], m[6]);
  for (const m of line.matchAll(D_DMY)) add(m.index!, m[0].length, +m[3], MON[m[2].slice(0, 3).toLowerCase()], +m[1], m[4], m[5], m[6]);
  if (refMs) {
    const ref = new Date(refMs);
    // a month well before the publish month belongs to next year (e.g. "28 Dec – 4 Jan" published in December)
    const yearOf = (mo: number) => ref.getUTCFullYear() + (mo < ref.getUTCMonth() - 5 ? 1 : 0);
    for (const m of line.matchAll(D_MD)) { const mo = MON[m[1].slice(0, 3).toLowerCase()]; add(m.index!, m[0].length, yearOf(mo), mo, +m[2], m[3], m[4], m[5]); }
    for (const m of line.matchAll(D_DM)) { const mo = MON[m[2].slice(0, 3).toLowerCase()]; add(m.index!, m[0].length, yearOf(mo), mo, +m[1], m[3], m[4], m[5]); }
  }
  return hits.sort((a, b) => a.i - b.i).map(({ ms, hasTime }) => ({ ms, hasTime }));
}

export interface PerUser { amount: number; unit: string; text: string }
export type EntryKind = "trade" | "deposit" | "stake" | "hold" | "buy";
export interface MinEntry { amount: number; unit: string; kind: EntryKind; text: string }
export interface Terms { start?: number; end?: number; perUser?: PerUser; minEntry?: MinEntry }

/** The smallest dollar threshold that earns anything ("trade at least 500 USDT", "volume ≥ 500 USDT", "deposit at least $100"). */
// audit 27.11 (night): Bitget rToken Boost "Start with just 10,000 USDT in new holdings" — the calculator offered $1 000 / $2 000
const ENTRY_RE = /(?:at least|minimum(?: of)?|min\.?|no less than|start(?:ing)? with(?: just| only| as little as)?|≥|>=|reach(?:es|ing)?|exceed(?:s|ing)?|greater than or equal to(?: the equivalent of)?)\s*(\$)?\s?(\d[\d,]*(?:\.\d+)?)\s*(k\b|m\b)?\s*(USDT|USDC|USD|FDUSD|\$)?/gi;
const KIND_RE: Array<[EntryKind, RegExp]> = [
  ["trade", /\b(trad(e|es|ed|ing)|volume|futures|spot|perps?|swap|copy)\b/i],
  ["deposit", /\b(deposit\w*|top[- ]?up|net inflow|fiat)\b/i],
  ["stake", /\b(stak\w*|subscri\w*|lock\w*|launchpool|earn product|savings)\b/i],
  ["hold", /\b(hold\w*|balance|average daily)\b/i],
  ["buy", /\b(buy|purchase\w*|convert)\b/i],
];
function minEntryOf(lines: string[]): MinEntry | undefined {
  let best: MinEntry | undefined;
  // 27.11 (Bitget Super Earn): the first tier row "… | ≥30,000 USDT | …" names no action — the table's header ("Net deposit
  // amount") does; only the next row's "Subscribe now" button gave a kind, so the minimum read as 300,000
  let hdrKind: EntryKind | undefined;
  for (const line of lines) {
    // a header row: a table row with no number in it (the §H§ marks are stripped when the stored rules are loaded)
    if (line.includes(" | ") && !/\d/.test(line.replace(/§H§|APR\*?|%/g, ""))) hdrKind = KIND_RE.find(([, re]) => re.test(line.replace(/subscription limit|subscri\w*\s*$/gi, "")))?.[0];
    else if (!line.includes("|")) hdrKind = undefined;
    for (const m of line.matchAll(ENTRY_RE)) {
      const dollar = m[1] || m[4];
      if (!dollar) continue;                                             // only dollar amounts (not "3 friends", "5 trades")
      const amount = Number(m[2].replace(/,/g, "")) * (m[3] ? (/m/i.test(m[3]) ? 1e6 : 1e3) : 1);
      if (!(amount > 0) || amount > 1e7) continue;   // "minimum 0.1 USDT" is a real minimum too (weekly audit 26.11)
      const clause = line.slice(Math.max(0, m.index! - 70), m.index! + m[0].length + 40).split(/[.;]/).find((c) => c.includes(m[0])) ?? line;
      if (/\b(reward|prize|bonus|voucher|airdrop|pool|cap(ped)?|up to|max(imum)? (reward|payout))\b/i.test(clause.slice(0, clause.indexOf(m[0]))) && !/\b(volume|deposit|trade|stake|hold)\b/i.test(clause)) continue;
      // weekly audit 26.11: "applies only to the user's first 200 USDT", "up to 200 USDT", "maximum 5,000 USDT per user" is a
      // CAP of the bonus, not the minimum to join (Binance new-user 35 % showed "stake from 200 USDT"; the minimum is 0.1)
      const lead = line.slice(Math.max(0, m.index! - 30), m.index!);
      if (/\b(first|up to|maximum|max\.?|cap(ped)? at|limit(ed)? (of|to)|no more than|at most)\s*\$?\s*$/i.test(lead)) continue;
      // …and "any amount exceeding 200 USDT will only earn…" / "the first 200 USDT" anywhere in the line (the regex keyword
      // "exceeding" itself sits before the number, so the lead above misses it)
      if (new RegExp(`\\b(first|up to|maximum|capped at|exceed\\w*|above|over)\\s*\\$?\\s?${m[2].replace(/[.,]/g, "[.,]?")}\\b`, "i").test(line) && /\b(first|only (applicable|effective)|will only|exceed\w*|cap)\b/i.test(line)) continue;
      // the word right before the amount decides the kind ("net deposit of at least 1,000 USDT, plus … trading volume")
      const near = line.slice(Math.max(0, m.index! - 40), m.index!);
      const kind = KIND_RE.find(([, re]) => re.test(near))?.[0] ?? (line.includes("|") ? hdrKind : undefined) ?? KIND_RE.find(([, re]) => re.test(clause))?.[0];
      if (!kind) continue;
      if (!best || amount < best.amount) best = { amount, unit: m[4] && m[4] !== "$" ? m[4].toUpperCase() : "USD", kind, text: line.replace(/§H§/g, "").replace(/\s*\|\s*/g, " · ") };
    }
  }
  return best;
}

// a K/M multiplier must stand alone ("10K USDT"), not be the first letter of a ticker ("33,300 KOR")
const NUM = "\\$?\\s?([\\d][\\d,]*(?:\\.\\d+)?)\\s*(?:(k|m|million|thousand)(?![a-z]))?\\s*";
const UNIT = "(usdt|usdc|usd|fdusd|[A-Z][A-Z0-9]{1,9})?";
const PER_USER: RegExp[] = [
  // "maximum cap of 33,300 KOR per user", "up to 500 USDT per user", "capped at $200 per participant"
  new RegExp(`\\b(?:up to|maximum(?: of)?|max(?:imum)? (?:reward|cap|bonus|prize)s?(?: of| is)?|capped at|cap of)\\s*${NUM}${UNIT}[^.;]{0,50}?\\b(?:per|for each|each) (?:user|pers(?:on)?|participant|account|uid|winner|eligible user)`, "i"),
  // "each eligible user will receive 10 USDT", "every participant can earn up to 50 USDT"
  new RegExp(`\\b(?:each|every) (?:eligible |qualified |new )?(?:user|participant|winner)[^.;]{0,40}?\\b(?:receive|get|earn|win|claim|share|be rewarded)s?(?: with)?\\s*(?:up to\\s*)?${NUM}${UNIT}`, "i"),
  // "10 USDT per user", "$50 per person"
  new RegExp(`${NUM}${UNIT}\\s*(?:in [a-z ]{0,20})?\\s*(?:per|for each|each) (?:user|person|participant|uid|winner)\\b`, "i"),
  // "Earn up to 12,000 USDC", "Get up to $100" (headline style; checked after the stricter ones)
  new RegExp(`\\b(?:earn|get|receive|win|claim|grab|enjoy|unlock)\\s+(?:up to\\s+)?(?:a\\s+)?(?:total(?: of)?\\s+)?${NUM}${UNIT}`, "i"),
];

function perUserOf(lines: string[], poolAmount?: number): PerUser | undefined {
  for (const re of PER_USER) {
    for (const line of lines) {
      const m = line.match(re);
      if (!m) continue;
      const g = m.slice(1).filter((x) => x !== undefined);
      // groups come as [number, multiplier?, unit?] — find them by shape
      const numS = g.find((x) => /^\d[\d,]*(\.\d+)?$/.test(x));
      if (!numS) continue;
      const mult = g.find((x) => /^(k|m|million|thousand)$/i.test(x));
      let amount = Number(numS.replace(/,/g, "")) * (mult ? (/^(m|million)$/i.test(mult) ? 1e6 : 1e3) : 1);
      // a unit is a ticker (written in capitals) or a dollar stable — not words like "tokens"/"rewards"
      const unitRaw = g.find((x) => /^[A-Za-z][A-Za-z0-9]{1,9}$/.test(x) && (/^(usdt|usdc|usd|fdusd)$/i.test(x) || (x === x.toUpperCase() && /[A-Z]/.test(x))) && !/^(K|M|UID|VIP|KYC|APR|APY)$/.test(x));
      // "$50 ETH Position Voucher" is $50 paid in ETH, not 50 ETH (audit 14.11: showed as ≈ $93K per person)
      const dollar = new RegExp(`\\$\\s?${numS.replace(/[.]/g, "\\.")}`).test(m[0]);
      const unit = dollar ? "USD" : unitRaw ? (/^usd$/i.test(unitRaw) ? "USD" : unitRaw.toUpperCase()) : "";
      if (!unit || !(amount > 0) || amount > 5e8) continue;
      // staking / deposit / volume limits per user are not winnings
      const before = line.slice(0, m.index!).split(/[,.;:!?]/).pop() ?? "";        // same clause only
      // audit 27.11 (evening): HTX "✔️ Whale-Friendly Cap: Up to $70M per user" became "Нагорода до $70 000 000" — the label
      // before a colon belongs to this clause too, and a cap is a limit
      const pre = line.slice(0, m.index!), colon = Math.max(pre.lastIndexOf(":"), pre.lastIndexOf("："));
      const label = colon >= 0 && pre.length - colon <= 12 ? pre.slice(0, colon).split(/[,.;!?]/).pop() ?? "" : "";
      const around = label.slice(-45) + " " + before.slice(-45) + m[0];
      if (/\b(stak\w*|deposit\w*|subscri\w*|invest\w*|lock\w*|position|volume|limit|caps?|quota|hold(ing)?s?|borrow\w*|loan|margin|principal)\b/i.test(around)) continue;
      // equal to the headline prize pool → that's the whole pool, unless the line itself says "per person"
      if (poolAmount && amount >= poolAmount * 0.999 && re !== PER_USER[0] && re !== PER_USER[2]) continue;
      // headline style "earn up to 600%" / "earn 10 USDT APR…" isn't a per-person amount
      if (re === PER_USER[3] && /^\s*(%|apr|apy)/i.test(line.slice(m.index! + m[0].length, m.index! + m[0].length + 8))) continue;
      // audit 27.11 (evening): Gate "0.017 QQQG" showed as "до 0,02 QQQG" — amounts under 1 keep 3 significant digits
      amount = amount >= 1 ? Math.round(amount * 100) / 100 : +amount.toPrecision(3);
      return { amount, unit, text: line };
    }
  }
  return undefined;
}

/**
 * The total prize pool when the headline doesn't say it: "Total prize pool: 10,000 USDT", "share a 50,000 USDT prize pool",
 * "1,800,000 KOR to be won", "Prize Pool · 30,000 USDT". Several activities → their pools are added up (same unit only).
 */
const POOL_RES: RegExp[] = [
  new RegExp(`\\b(?:total|overall|grand)?\\s*(?:prize|reward|bonus|airdrop|token) pool(?:s)?(?: of| worth| totaling| totalling)?\\s*[:：·-]?\\s*(?:up to\\s*)?${NUM}${UNIT}`, "i"),
  new RegExp(`\\b(?:share|split|giveaway of|giving away)\\s+(?:a\\s+|the\\s+)?(?:total of\\s+|up to\\s+)?${NUM}${UNIT}\\s*(?:in\\s+[a-z ]{0,20})?(?:prize|reward|bonus|airdrop)?\\s*(?:pool)?`, "i"),
  new RegExp(`${NUM}${UNIT}\\s*(?:in\\s+)?(?:prize|reward|bonus|airdrop|token) pool\\b`, "i"),
];
export function poolOf(lines: string[]): { amount: number; unit: string } | undefined {
  for (const re of POOL_RES) {
    const found: Array<{ amount: number; unit: string }> = [];
    for (const line of lines) {
      const m = line.match(re);
      if (!m) continue;
      const g = m.slice(1).filter((x) => x !== undefined);
      const numS = g.find((x) => /^\d[\d,]*(\.\d+)?$/.test(x));
      const mult = g.find((x) => /^(k|m|million|thousand)$/i.test(x));
      const unitRaw = g.find((x) => /^[A-Za-z][A-Za-z0-9]{1,9}$/.test(x) && (/^(usdt|usdc|usd|fdusd)$/i.test(x) || /^[a-z]?[A-Z][A-Z0-9]+$/.test(x)) && !/^(K|M|UID|VIP|KYC|APR|APY)$/.test(x));
      const unit = unitRaw ? (/^usd$/i.test(unitRaw) ? "USD" : /^[a-z][A-Z]/.test(unitRaw) ? unitRaw : unitRaw.toUpperCase()) : /\$/.test(m[0]) ? "USD" : "";
      const amount = numS ? Number(numS.replace(/,/g, "")) * (mult ? (/^(m|million)$/i.test(mult) ? 1e6 : 1e3) : 1) : 0;
      if (!unit || !(amount > 0) || amount > 5e10) continue;
      if (/\b(apr|apy|%)\b/i.test(line.slice(m.index! + m[0].length, m.index! + m[0].length + 6))) continue;
      if (!found.some((f) => f.amount === amount && f.unit === unit)) found.push({ amount, unit });
    }
    if (found.length) {
      // one headline number, or the sum of each activity's pool when they share a unit
      const unit = found[0].unit;
      const same = found.filter((f) => f.unit === unit);
      return { unit, amount: Math.max(...same.map((f) => f.amount)) };      // the biggest one (adding activities up can double-count)
    }
  }
  return undefined;
}

/** Start/end of the whole campaign and the most one person can get, read from the rules text (+ title). */
export function termsOf(d: PromoDetails | undefined, title: string, publishedAt: number, poolAmount?: number): Terms {
  const lines = (d?.blocks ?? []).map((b) => b.x).filter((x) => !BOILER.test(x));
  const out: Terms = {};
  const lo = (publishedAt || Date.now()) - 150 * 86400_000, hi = (publishedAt || Date.now()) + 400 * 86400_000;
  const ok = (ms: number) => ms > lo && ms < hi;
  const periodRe = FACT_RE[0][1];
  // audit 27.11 (accuracy): Coinstore states "(UTC+8)" once and then lists "2026-12-08 14:00:00" bare — those were read as
  // UTC and the countdown ran 8 h long; a single time zone named in the rules applies to the lines that name none
  const zones = new Set(lines.map((l) => l.match(/\b(?:UTC|GMT)\s*[+-]\s*\d{1,2}(?::?\d{2})?/i)?.[0].replace(/\s+/g, "").toUpperCase().replace("GMT", "UTC")).filter(Boolean));
  const docTz = zones.size === 1 ? [...zones][0] : undefined;
  const starts: number[] = [], ends: number[] = [], timed: number[] = [];
  for (const l of lines) {
    if (/distribut|credited|airdropp?ed|snapshot|listing|trading (opening|opens|starts)|deposit (opening|opens)|withdrawal/i.test(l) && !periodRe.test(l)) continue;
    // audit 25.11 (deep): "Verification period: … – 18.05" (Bitbase) and Binance's payout date (08.01) were read as the campaign end
    if (/\b(verification|settlement|payout|pay-?out|reward (distribution|issuance)|distribution (period|date|time)|claim (period|window)|review period|redemption|rewards? will be (distributed|credited|sent))\b/i.test(l)) continue;
    const ds = datesIn(docTz && !/\b(?:UTC|GMT)\b/i.test(l) ? `${l} (${docTz})` : l, publishedAt || undefined).filter((x) => ok(x.ms));
    if (ds.length >= 2 && (periodRe.test(l) || /\b(from|between)\b|\bto\b|[–—-]/i.test(l))) {
      starts.push(ds[0].ms); if (ds[0].hasTime) timed.push(ds[0].ms);
      const e = ds[ds.length - 1];
      ends.push(e.hasTime ? e.ms : e.ms + 86400_000 - 60_000);             // a bare end date means the end of that day
    } else if (ds.length === 1 && /\b(ends?|until|deadline|closes?|expires?)\b/i.test(l) && !/\bstart/i.test(l)) {
      ends.push(ds[0].hasTime ? ds[0].ms : ds[0].ms + 86400_000 - 60_000);
    }
  }
  // audit 26.11: BTSE — the post says "Runs Nov 24 – Dec 15", the rules "24 Nov 08:00 (UTC+0)": a bare date gives way to
  // a start time on that same day
  const day = (ms: number) => Math.floor(ms / 86400_000);
  const st = starts.filter((x) => timed.includes(x) || !timed.some((t) => day(t) === day(x)));
  if (st.length) out.start = Math.min(...st);
  if (ends.length) out.end = Math.max(...ends);
  if (out.start && out.end && out.end <= out.start) { delete out.start; delete out.end; }
  out.perUser = perUserOf([title, ...lines], poolAmount);
  // table rows with their cells (header marks §H§ kept) so a tier row can take its action from the header
  out.minEntry = minEntryOf((d?.blocks ?? []).filter((b) => !BOILER.test(b.x)).map((b) => (b.t === "tr" && b.cells?.length ? b.cells.join(" | ") : b.x)));
  return out;
}

/* ------------------------------------------------------------------ reward tiers (for the "how much will I get" calculator) */
export interface Tier { min: number; reward: string; amount: number; unit: string }
const DOLLAR = /(?:≥|>=|at least|over|from|min(?:imum)?\.?)?\s*\$?\s?(\d[\d,]*(?:\.\d+)?)\s*(k|m)?\s*(USDT|USDC|USD|\$)/i;
const PRIZE = /(\d[\d,]*(?:\.\d+)?)\s*(k|m)?\s*([A-Z][A-Z0-9]{1,9}|USDT|USDC)\b/;
/**
 * Threshold → reward rows from the rules' tables, e.g. "Stock trading volume ≥ 500 USDT · 1 draw chance",
 * "Net deposit ≥ 100 USDT · 10 USDT". Only rows whose reward is a token amount are used; ≥ 2 rows needed.
 */
export function tiersOf(blocks: Block[]): Tier[] {
  // each table separately (rows next to each other); the first one that reads like personal tiers wins
  const groups: Block[][] = [];
  blocks.forEach((b, i) => {
    if (b.t !== "tr") return;
    if (i > 0 && blocks[i - 1].t === "tr") groups[groups.length - 1].push(b);
    else groups.push([b]);
  });
  for (const g of groups) {
    const t = tableTiers(g);
    // personal tiers: thresholds a person can reach, same reward unit, reward grows with the threshold
    if (t.length >= 2 && t.every((x) => x.min <= 5_000_000 && x.unit === t[0].unit) && t.every((x, i) => i === 0 || x.amount > t[i - 1].amount)) return t;
  }
  return [];
}

function tableTiers(rows: Block[]): Tier[] {
  const out: Tier[] = [];
  for (const b of rows) {
    if (b.t !== "tr" || !b.cells || b.cells.length < 2) continue;
    const condIdx = b.cells.findIndex((c) => DOLLAR.test(c) && /≥|>=|at least|volume|deposit|trade|trading|stake|hold|net|reach|\d\s*(USDT|USDC|USD)/i.test(c));
    if (condIdx < 0) continue;
    const m = b.cells[condIdx].match(DOLLAR)!;
    const min = Number(m[1].replace(/,/g, "")) * (m[2] ? (/m/i.test(m[2]) ? 1e6 : 1e3) : 1);
    const rewardCell = b.cells.find((c, i) => i !== condIdx && PRIZE.test(c) && !/≥|>=|volume|deposit/i.test(c));
    if (!rewardCell || !(min > 0)) continue;
    const r = rewardCell.match(PRIZE)!;
    const amount = Number(r[1].replace(/,/g, "")) * (r[2] ? (/m/i.test(r[2]) ? 1e6 : 1e3) : 1);
    if (!(amount > 0) || /^(APR|APY|VIP|KYC|UID)$/.test(r[3])) continue;
    out.push({ min, reward: rewardCell.length > 60 ? `${amount.toLocaleString("en-US")} ${r[3]}` : rewardCell, amount, unit: r[3] });
  }
  const uniq = out.filter((t, i) => out.findIndex((x) => x.min === t.min) === i).sort((a, b) => a.min - b.min);
  return uniq.length >= 2 && uniq.length <= 15 ? uniq : [];
}
/** "Earn up to 7% APR", "6% reference APR" → the advertised yearly rate (for interest-type promos). */
export function aprOf(title: string, lines: string[]): number | undefined {
  for (const s of [title, ...lines.slice(0, 15)]) {
    const m = s.match(/(\d{1,3}(?:\.\d+)?)\s?%\s?(?:reference\s+|estimated\s+|annual(?:ized)?\s+)?(APR|APY)/i);
    if (m) { const v = Number(m[1]); if (v > 0 && v <= 1000) return v; }
  }
  return undefined;
}

/* ------------------------------------------------------------------ geography */
/** weekly audit 26.11: "✓ no restriction for Ukraine" was shown whenever nothing was found — even under "Geo restrictions
 *  apply". Now: "checked" = the rules name the restricted countries and Ukraine is not among them (only then the ✓);
 *  "vague" = the rules say there are country limits without naming them; "occupied" = only the occupied areas are out. */
export interface Geo { only?: string; noUA?: boolean; noEU?: boolean; text?: string; checked?: boolean; vague?: boolean; occupied?: boolean }
const REGION = "MENA|SEA|LATAM|CIS(?:\\s*(?:&|and)\\s*CEE)?|CEE|APAC|South Asia|Southeast Asia|Middle East|Africa|Türkiye|Turkey|India|Indonesia|Vietnam|Philippines|Nigeria|Kenya|Brazil|Pakistan|Bangladesh|Korea|Japan|Thailand|Argentina|Mexico|Europe|EEA|Ukraine|Kazakhstan|Uzbekistan|Russia";
const REGION_TITLE = new RegExp(`(?:^|[\\[(\\s])(${REGION})\\b`, "i");
const RESTRICT = /\b(not (be )?(available|eligible|open|permitted)|excluded|prohibited|restricted|ineligible|cannot participate|may not participate)\b/i;

/** Region-exclusive promos (from the title) and country restrictions (from the rules). */
export function geoOf(title: string, d?: PromoDetails): Geo {
  const g: Geo = {};
  const r = title.match(REGION_TITLE)?.[1];
  // "[MENA Exclusive] …", "SEA Festival …", "Binance P2P Kenya: …", "CIS & CEE Exclusive: …"
  if (r && (/exclusive|only\b|\bP2P\b/i.test(title) || title.search(REGION_TITLE) < 14)) g.only = r.length <= 4 ? r.toUpperCase() : r.replace(/\s+/g, " ");
  else if (/region[- ]exclusive/i.test(title)) g.only = "region";
  const bl = d?.blocks ?? [];
  // audit 23.11 (round 5): CEX.IO listed the countries where the offer runs — Ukraine was not on it, the page said "✓ Україна"
  const allow = bl.findIndex((b) => /\b(available|eligible|open|valid|applies)\b[^.]{0,40}\b(following|these|listed|supported|selected) (countries|regions|jurisdictions|markets)\b|\b(supported|eligible|participating) (countries|regions|jurisdictions)\s*[:：]/i.test(b.x)
    // weekly audit 26.11: CEX.IO "🌐 Available in the US, Cape Verde, Serbia, Albania…" — a plain country list
    || /\b[Aa]vailable (?:only )?in (?:the )?[A-Z][\w .'-]{1,30},\s*[A-Z][\w .'-]{1,30},/.test(b.x));
  if (allow >= 0 && !g.only) {
    const list = bl.slice(allow, allow + 4).map((b) => b.x).join(" ");
    if (!/\bUkraine\b/i.test(list) && (list.match(/,/g)?.length ?? 0) >= 2) { g.only = "region"; g.text ??= bl[allow].x; }
  }
  for (const b of bl) {
    // audit 23.11: "Only available to users in France, Italy, Spain…" (OKX), "for users in South Asia" (Binance) left no mark
    const only = !g.only && b.x.match(/\b(?:only (?:available|open|eligible) (?:to|for)|exclusively (?:available )?for|open only to) (?:users|residents|customers|participants) (?:in|from|of|located in|residing in) (?:the )?([A-Z][^.;:!?]{2,70})/);
    // the card says "Лише для окремих регіонів"; the exact list is the quoted line (g.text), translated on the promo page
    if (only) { const r = only[1].replace(/\s+(?:who|and who|with|that)\b.*$/, "").trim(); g.only = regionName(r, "uk") !== r ? r : "region"; g.text ??= b.x; }
    // "Geo restrictions apply", "certain jurisdictions", "subject to local laws" — limits exist, the countries are not named
    if (/\bgeo[- ]?(graphic(al)?)?[- ]?restrict|\b(certain|some|restricted|prohibited|sanctioned|excluded) (countries|regions|jurisdictions)\b|\bsubject to (local|applicable) (laws|regulations)\b|\bwhere (prohibited|restricted)\b/i.test(b.x)) { g.vague = true; g.text ??= b.x; }
    if (!RESTRICT.test(b.x)) continue;
    if (/\b(crimea|donetsk|luhansk|sevastopol|occupied (areas|regions|territories))\b/i.test(b.x)) g.occupied = true;
    // occupied areas (Crimea, Donetsk, Luhansk…) are on most lists — that is not "Ukraine is excluded"
    const x = b.x.replace(/\b(crimea|donetsk|luhansk|sevastopol|kherson|zaporizh\w*)\b[^,;.]*/gi, "")
      .replace(/\b(occupied|non-government[- ]controlled|certain|temporarily occupied) (areas|regions|territories) of ukraine/gi, "");
    if (/\bUkraine\b/i.test(x)) { g.noUA = true; g.text ??= b.x; }
    // a real list: several capitalised country names separated by commas
    else if ((x.match(/\b[A-Z][a-z]+(?: [A-Z][a-z]+)?\s*(,|\band\b)/g)?.length ?? 0) >= 3) g.checked = true;
    if (/\b(EEA|European Economic Area|European Union|EU member states?|EU (users|residents)|users (in|from) (the )?(EU|Europe))\b/i.test(x)) { g.noEU = true; g.text ??= b.x; }
  }
  if (g.checked) g.vague = undefined;   // the named list is the answer
  return g;
}

/* ------------------------------------------------------------------ per-source fetchers */
const ZENDESK: Record<string, string> = { xt: "xtsupport.zendesk.com", bitunix: "support.bitunix.com", weex: "weexsupport.zendesk.com", bitbase: "bitbase-support.zendesk.com", biconomy: "biconomy.zendesk.com", hibt: "support.hibt.com", bitvavo: "support.bitvavo.com", zoomex: "zoomex.zendesk.com", websea: "webseahelp.zendesk.com" };

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
    // weekly audit 26.11: the post itself always comes first — Bitrue posts link to a page that is only the site menu, so
    // "Nov 23 – Dec 23, 2026" in the post was lost and the promo had no dates
    const postHtml = body.replace(/<i class="emoji"[^>]*><b>([^<]*)<\/b><\/i>/g, "$1").split(/<br\s*\/?>|\s{2,}/i).map((l) => `<p>${l}</p>`).join("");
    // the channel's own linked article usually holds the full rules
    if (p.url && !p.url.startsWith("https://t.me/")) {
      // Binance announcement linked from a post: read it through Binance's own CMS API (its pages block servers)
      const bn = p.url.match(/binance\.com\/[a-z-]+\/support\/announcement\/(?:detail\/)?([0-9a-f]{32})/i)?.[1];
      if (bn) {
        const j = await getJson<any>(`https://www.binance.com/bapi/composite/v1/public/cms/article/detail/query?articleCode=${bn}`, 10_000).catch(() => null);
        const body = j?.data?.body;
        if (body) return { html: postHtml + binanceTree(typeof body === "string" ? JSON.parse(body) : body) };
      }
      const art = await fromUrl(p.url).catch(() => "");
      if (art) return { html: postHtml + art };
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
  // 24.11: Poloniex pages are an empty JS shell to servers — its own public detail API holds the article and the
  // campaign window (it answers only with an Accept-Language header, which getJson sends)
  if (v === "poloniex") {
    const j = await getJson<any>(`https://www.poloniex.com/proxy/sapi/proclamation/public/support/public/getDetails?id=${tail}`, 10_000);
    const d = j?.data?.details;
    if (!d?.content) return null;
    const iso = (ms: unknown) => (Number(ms) > 0 ? new Date(Number(ms)).toISOString().replace("T", " ").slice(0, 16) : "");
    const when = iso(d.activityStartTime) && iso(d.activityEndTime) ? `<p>Event Period: ${iso(d.activityStartTime)} – ${iso(d.activityEndTime)} (UTC)</p>` : "";
    return { html: when + d.content };
  }
  const fromFeed = (await feeds()).get(p.url.split("?")[0]);
  if (fromFeed) return { html: fromFeed };
  if (["kucoin", "bitget", "gate", "ondoperps", "bydfi", "mexc", "toobit"].includes(v)) { const h = await fromUrl(p.url); return h ? { html: h } : null; }
  return null;
}

async function fromUrl(url: string): Promise<string> {
  const host = new URL(url).hostname;
  if (/okx\.com|bybit\.com|t\.me$/.test(host)) return "";
  return htmlFromPage(await getText(url, 12_000));
}

/** Campaign pages rendered on the laptop for Telegram promos (relay branch rules.json, see scripts/tg-enrich.mjs). */
function relayRules(): Record<string, { at: number; html: string }> {
  try { return JSON.parse(fs.readFileSync(path.join(process.cwd(), "relay", "rules.json"), "utf8")); } catch { return {}; }
}

const STOP = new Set(["with", "your", "this", "that", "from", "into", "will", "have", "more", "live", "join", "trade", "trading", "share", "rewards", "reward", "event", "campaign", "users", "now", "up", "to", "and", "the", "for", "get", "win"]);
const words = (s: string) => new Set((s.toLowerCase().match(/[a-z][a-z0-9]{3,}/g) ?? []).filter((w) => !STOP.has(w)));
const WALLET = /\b[A-Za-z0-9]{3,8}\.{3}[A-Za-z0-9]{3,6}\b|\b[a-z0-9]{1,4}\*{2,}[a-z0-9]*@/i;
const UI = /^(log ?in|sign ?up|register( now)?|download( app| now)?|share|hide|view (details|more)|join now|more|english|en|copy|confirm|cancel|ok|go|claim|deposit|trade now|it ends in|ends in|campaign ends in|ending in|days?|hrs?|hours?|mins?|minutes?|secs?|seconds?|promotion countdown)$/i;
/**
 * A campaign page rendered in a browser carries site chrome around the rules: menus, countdown digits, live
 * leaderboards. Start at the first block that names the campaign (shares ≥ 2 title words) — a page that never does is
 * not about this promo and is ignored — and drop countdown / UI / leaderboard pieces.
 */
export function campaignBlocks(blocks: Block[], title: string): Block[] {
  const tw = words(title);
  const hits = (x: string) => { let n = 0; for (const w of words(x)) if (tw.has(w)) n++; return n; };
  let start = blocks.findIndex((b) => hits(b.x) >= Math.min(2, tw.size));
  // the Telegram headline and the page can be worded differently ("Your wave of airdrops starts now!" → page
  // "Market Tsunami: Sign Up…", the task list with 40 / 60 / 100 USDT got dropped): start at the page's first heading
  if (start < 0) start = blocks.findIndex((b) => b.t === "h" && b.x.trim().length >= 8);
  if (start < 0) return [];
  const out: Block[] = [];
  let chars = 0;
  for (const b of blocks.slice(start)) {
    const x = b.x.trim();
    // the rules are over once the page moves on to other articles / marketing / app links
    // audit 21.11: Coinstore pages end with a "Trending" sidebar of paid token blurbs (an online casino among them)
    if (/^(articles|related articles|more articles|more themes|you may also like|recommended|trending( now| tokens| coins)?|hot (tokens|coins)|why choose \w+\??|trade on the go with .*|download (the )?app.*|join the \w+ community)$/i.test(x) || /\bcookies?\b|privacy preference|waiting to reconnect|^reconnecting to\b/i.test(x)) break;
    if (/^(progress\s*[\d/]+|view rewards|reward preview|refresh)$/i.test(x)) continue;
    if (x.length < 4 || UI.test(x) || WALLET.test(x)) continue;
    if (/^(my |remaining rewards?\b|last price|change\s*-?[\d.]+%|(user ?id|uid)\s*[:：]|join now\s*>+|telegram\s*[:：]?$|discord\s*[:：]?$)/i.test(x)) continue;   // viewer's own empty stats, live quotes
    if (/\d{1,2}\/\d{1,2} \d{2}:\d{2}:\d{2} \(UTC\)$/.test(x) && b.t !== "h") continue;   // "related article title11/09 09:00:00 (UTC)"
    if (/\|\s*(latest news|announcements|official)\s*(\||$)/i.test(x)) continue;          // "11/12 09:00 (UTC)|Latest News|Official|…"
    if (/^[\d\s:.,$%+\-–—/()]+[A-Z]{0,4}$/.test(x) && x.length < 24) continue;      // countdowns, bare numbers, "$815"
    if (/^\d+\s*(d|day|days|h|hrs?|hours?|m|mins?|s|secs?)$/i.test(x)) continue;
    if (/^[\d\s:dhms]+$/i.test(x) && x.length < 20) continue;
    if (/^[A-Z0-9]{2,12}\/[A-Z]{3,5}\s*[\d.,+\-%\s]+$/.test(x)) continue;                 // live price ticker "MAPO/USDT0.00097-0.04%"                       // "13D:19:11:49"
    if (/^(deposited|traded|my (rank|rewards?|trading vol)|your (rank|volume))\b/i.test(x)) continue;   // the viewer's own (empty) stats
    if (b.t === "tr" && b.cells && b.cells.filter((c) => /^[\d\s.,$%#-]*$/.test(c) || WALLET.test(c)).length >= b.cells.length - 1) continue;   // leaderboard rows
    out.push(b);
    if ((chars += x.length) > 9000) break;
  }
  return out.length >= 3 ? out : [];
}

/** Key of a page in browser-rules.json: origin + path, no query / trailing slash. */
export function browserKey(url: string): string {
  try { const u = new URL(url.replace(/&amp;/g, "&")); return (u.origin + u.pathname).replace(/\/$/, ""); } catch { return url; }
}

/* ------------------------------------------------------------------ cache + public API */
let READ_OK = true;
let MEM: Record<string, PromoDetails> | null = null;   // also keeps dev-server renders from refetching
function load(): Record<string, PromoDetails> {
  if (MEM) return MEM;
  const r = readStore<Record<string, PromoDetails>>(FILE(), {}); MEM = r.data; READ_OK = r.ok;
  return MEM!;
}

/**
 * audit 27.11 (evening): Ourbit links (/activity/kol?id=…, /activity/staking) serve one stale September page to servers —
 * appended to the Black Friday and Aave Earn posts it gave them "start 2 вересня", "Торгівля від 50 000 USDT" and a
 * 2.5M pool. A Telegram post is stored as <p> lines only (a short post line ending in ":" becomes a heading but keeps its
 * colon; real headings lose theirs), so the linked article starts at its first colon-less heading; an article
 * whose own campaign period ended before the post was published is another (old) campaign and is dropped.
 */
function staleArticle(p: Promo, blocks: Block[]): Block[] {
  if (!p.id.startsWith("tg:") || !p.publishedAt) return blocks;
  const i = blocks.findIndex((b) => b.t === "h" && !/[:：]$/.test(b.x));
  if (i <= 0) return blocks;
  const end = termsOf({ blocks: blocks.slice(i) } as PromoDetails, "", p.publishedAt).end;
  return end && end < p.publishedAt - 86400_000 ? blocks.slice(0, i) : blocks;
}

/** Details for the given promos: cached ones + up to MAX_NEW freshly fetched. Never throws. */
export async function getDetails(promos: Promo[]): Promise<Record<string, PromoDetails>> {
  const now = Date.now();
  const store = load();
  const want = promos.filter((p) => p.venue.kind !== "airdrop" && !p.evergreen && (store[p.id]?.v !== VER || (store[p.id]?.partial && /binance\.com\/[a-z-]+\/support\/announcement/.test(p.url))
    // audit 23.11 (round 5): a promo whose link changed (Bitrue: referral page → campaign page) is read again
    || (p.id.startsWith("tg:") && store[p.id]?.u !== p.url))).slice(0, MAX_NEW);
  let feedP: Promise<Map<string, string>> | null = null;
  const feeds = () => (feedP ??= feedMap());
  const queue = [...want];
  const worker = async () => {
    for (let p = queue.shift(); p; p = queue.shift()) {
      try {
        const r = await fetchHtml(p, feeds);
        if (!r) continue;
        const blocks = htmlToBlocks(r.html);
        if (blocks.length) store[p.id] = { blocks, facts: factsOf(blocks), at: now, partial: r.partial, v: VER, u: p.url };
      } catch { /* leave for the next build */ }
    }
  };
  await Promise.all(Array.from({ length: 4 }, worker));
  // full rules read in headless Chrome on the owner's laptop (scripts/rules-merge.mjs) for pages that block servers
  // (OKX, Bybit, MEXC, Bitget campaign pages…) — used when they hold more than what the build could fetch itself
  const BR = BROWSER_RULES as Record<string, { at: number; html: string }>;
  const len = (d?: PromoDetails) => (d ? d.blocks.reduce((n, b) => n + b.x.length, 0) : 0);
  const RR = relayRules();
  const EX_HEAD = "On the exchange page";
  // a Telegram post is short: the campaign page it links to (read on the laptop, scripts/tg-enrich.mjs) is appended
  // at output time, so cleanup changes apply to pages already read; the store keeps only the post
  const pageOf = (p: Promo) => {
    const rr = p.id.startsWith("tg:") ? RR[browserKey(p.url)] : undefined;
    return rr?.html ? campaignBlocks(htmlToBlocks(rr.html), p.title) : [];
  };
  for (const p of promos) {
    const post = store[p.id];
    if (post?.ex) {   // 12.11 first version stored post + page together — keep the post part only
      const i = post.blocks.findIndex((b) => b.t === "h" && b.x === EX_HEAD);
      store[p.id] = { ...post, blocks: i >= 0 ? post.blocks.slice(0, i) : post.blocks, partial: true, ex: undefined };
    }
    if (store[p.id]?.partial && pageOf(p).length) continue;
    // a non-Telegram page the build can't read (Hotcoin) — the laptop reads it into the relay rules (tg-enrich.mjs)
    const r = BR[browserKey(p.url)]?.html ? BR[browserKey(p.url)] : !p.id.startsWith("tg:") ? RR[browserKey(p.url)] : undefined;
    if (!r?.html) continue;
    const blocks = htmlToBlocks(r.html);
    const cur = store[p.id];
    if (blocks.length && (!cur || cur.partial || len(cur) < blocks.reduce((n, b) => n + b.x.length, 0) * 0.6)) {
      store[p.id] = { blocks, facts: factsOf(blocks), at: now, v: VER };
    }
  }
  // keep current promos + anything seen recently; save for the next build (the workflow commits the data folder)
  const live = new Set(promos.map((p) => p.id));
  for (const [id, d] of Object.entries(store)) if (!live.has(id) && now - d.at > KEEP_MS) delete store[id];
  writeStore(FILE(), store, READ_OK);
  const out: Record<string, PromoDetails> = {};
  // facts are re-derived from the stored text so parser changes apply without re-fetching
  for (const p of promos) if (store[p.id]) {
    let blocks = staleArticle(p, dropBoilerplate(joinCells(store[p.id].blocks), p.id, store));
    // audit 27.11 (evening): the laptop-read page skipped joinCells — "§L§ 7 §L§ 90" (Coinstore), "§H§Мінімальний обсяг" (LBank)
    const page = store[p.id].partial ? joinCells(pageOf(p)) : [];
    if (page.length) {
      const seen = new Set(blocks.map((b) => b.x));
      blocks = [...blocks, { t: "h", x: EX_HEAD }, ...page.filter((b) => !seen.has(b.x))];
    }
    blocks = dropTail(dropChrome(blocks), EX_HEAD);
    if (blocks[blocks.length - 1]?.x === EX_HEAD) blocks = blocks.slice(0, -1);
    // audit 23.11: the FAQ said "only a one-line preview was available" for Bybit WSOT / Bitrue ANTX although the laptop had read
    // the full exchange page — once a real page (> 600 chars) is appended the rules are no longer partial
    const full = page.reduce((n, b) => n + b.x.length, 0) > 600;
    out[p.id] = { ...store[p.id], ...(full ? { partial: false } : {}), blocks, facts: factsOf(blocks) };
  }
  return out;
}

/**
 * Site chrome that appears only once (so the repeat filter in dropBoilerplate misses it): a product page's whole menu
 * ("Buy Crypto / Buy instantly using Visa…", KuCoin Earn hub, PancakeSwap footer) and social-link lines ("Website🌐 |
 * Twitter❌"). A menu is a long run of short labels without sentence punctuation or numbers; real rules break such a run
 * within a few blocks. Checked 13.11 on all 244 live promo pages: ≥ 15 blocks at ≥ 90 % labels hits only menus
 * (CandyBomb widget runs are 13 and keep "New futures traders only").
 */
const SOCIAL = /^(?:[^\p{L}\p{N}]*\b(?:telegram|whatsapp|facebook|instagram|discord|twitter|x|youtube|tiktok|reddit|website|linkedin|medium|download(?: \w+)?(?: app)?|join the \w+ community)\b[^\p{L}\p{N}]*)+$/iu;
function chromeLabel(b: Block): boolean {
  if (b.t === "tr") return false;
  const x = b.x.trim();
  if (/^[A-Z0-9]{2,20}(\/[A-Z]{3,5})?(\d+X)?$/.test(x)) return true;          // ticker lists "BTC/USDT10X", "1000BONKUSDT"
  if (x.length > 90 || /[.!?。:：]$/.test(x)) return false;
  return !/\d/.test(x) || /[a-z][A-Z][a-z]/.test(x);                           // label, or label glued to its text
}
function dropChrome(blocks: Block[]): Block[] {
  const keep = blocks.map((b) => !SOCIAL.test(b.x.trim()));
  const f = blocks.map(chromeLabel);
  for (let i = 0; i < blocks.length;) {
    if (!f[i]) { i++; continue; }
    let end = i, bad = 0;
    for (let j = i; j < blocks.length; j++) {
      if (!f[j] && ++bad > 0.1 * (j - i + 1) + 0.5) break;
      if (f[j]) end = j;
    }
    if (end - i + 1 >= 15) { for (let k = i; k <= end; k++) if (blocks[k].x !== "On the exchange page") keep[k] = false; i = end + 1; } else i++;
  }
  return blocks.filter((_, i) => keep[i]);
}

/**
 * Text that is not the promo (audit 14.11): ads in Telegram posts (a casino under a Coinstore campaign), the exchange's
 * site-wide sales lines scraped with the page ("Sign up and get welcome rewards worth $15,000" — it became a Phemex
 * promo's "up to $15,000 per person"), and everything after the "Team" signature of an announcement. Applied per
 * segment: the post, then the exchange page appended under `head`.
 */
const AD = /\b(casino|казино|gambling|sportsbook|betting|slots?|18\+)\b/i;
const SALES = /\b(sign up (now |today )?(and|&) (get|claim|receive)|register now|download the [\w.]+ app|scan to download|welcome rewards? worth|user-centric|leading (crypto(currency)? )?(exchange|platform|futures platform)|trade (over|more than) [\d,]+\+? (crypto|cryptocurrenc)|invite friends (and|to) (earn|get) \d+% commission|get your referral link|new user registration|app link|start your crypto journey|sign up to (get|claim|receive|unlock)|welcome (rewards?|bonus(es)?|gifts?|package)s? (of|worth|up to)|\$[\d,]+\+? (in )?welcome (rewards?|bonus)|scan (the )?qr code|click here to (get|obtain) (your )?referral|not (affiliated|sponsored|endorsed|associated) (with|by) apple|all rights reserved)\b/i;
const SIGN = /^(?:the\s+)?[\p{L}\d.]{2,20}(?:\s+[\p{L}\d.]{2,20})?\s+team\.?$|^(?:команда|команда)\s+\S+/iu;
function dropTail(blocks: Block[], head: string): Block[] {
  const out: Block[] = [];
  const seenRule = new Set<string>();
  let cut = false, linkTail = false;
  for (const b0 of blocks) {
    if (b0.x === head) { cut = false; out.push(b0); continue; }   // a new segment (the exchange page) starts
    if (cut) continue;
    // weekly audit 26.11: a Telegram promo text left "… #LBank #Crypto" at the end of a rule line
    const b = b0.t === "tr" ? b0 : { ...b0, x: b0.x.replace(/(\s+#[\p{L}\d_]+)+\s*$/u, "") };
    const x = b.x.trim();
    if (!x) continue;
    // weekly audit 26.11: BTSE printed rule 5 twice (the page repeats it in a collapsed block) — a long rule line only once
    const key = x.toLowerCase().replace(/^\s*\d+[.)]\s*/, "").replace(/\s+/g, " ");
    if (b.t !== "h" && key.length >= 40) { if (seenRule.has(key)) continue; seenRule.add(key); }
    if (out.length >= 3 && x.length <= 40 && SIGN.test(x)) { cut = true; continue; }
    if (AD.test(x) && !/\b(reward|prize|usdt|campaign)\b/i.test(x)) continue;
    if (b.t !== "tr" && x.length <= 220 && SALES.test(x)) continue;
    if (/^(#[\p{L}\d_]+[\s,]*)+$/u.test(x)) continue;                                             // hashtag lines
    if (/^©|^\d+D\s*\d+H\s*\d+M\s*\d+S$/i.test(x)) continue;                                       // copyright, frozen countdowns
    if ((x.match(/\|/g) ?? []).length >= 3 && /telegram|discord|twitter|reddit|website|download/i.test(x)) continue;   // social bars
    // audit 28.11 (texts): OKX "⚜️ Registration | OKX Announcements | TG | DC | OKX Orbit | … | CN TG | CN DC", its "Our Socials:"
    // heading and Biconomy "— Try it now —" stayed in the rules — a bar of 5+ short "|" parts is links, not a table row
    if (b.t !== "tr" && (x.match(/\|/g) ?? []).length >= 5 && x.split("|").every((c) => c.trim().length <= 30)) continue;
    if (b.t !== "tr" && x.length <= 60 && /^(our socials|follow our socials|наші сторінки в соцмережах|наши страницы в соцсетях|наші соцмережі|наши соцсети)\s*[:：]?\s*$/iu.test(x)) continue;
    if (b.t !== "tr" && x.length <= 200 && /^\W{0,4}(please )?(verify|check) the authenticity of (all )?(links|urls|websites)/i.test(x)) continue;   // OKX "‼️Please verify the authenticity of all links…"
    if (b.t !== "tr" && x.length <= 180 && /^\p{Extended_Pictographic}/u.test(x) && /\bstart your (earning )?journey\b|\band start earning\.?$/i.test(x)) continue;   // Biconomy "🔍 Search for … start your earning journey"
    if (b.t !== "tr" && x.length <= 40 && /^[—–-]+\s*(try it now|спробуйте зараз|попробуйте сейчас)!?\s*[—–-]+$/iu.test(x)) continue;
    if (/^(download|завантаження)\s*[:：]?\s*$/i.test(x)) continue;
    if (/^(trending|in trend|hot now|popular)\s*[:：]/i.test(x) || /\byou are (about to|going to) (leave|go to|open)\b|\bthird[- ]party (app|application|website|site)\b/i.test(x)) continue;
    if (b.t !== "tr" && x.length <= 16 && /^[+\-–]?[\d\s,.+\-–/]+$/.test(x)) continue;   // stray counters ("+1-284", "+0")
    // audit 27.11 (night): LBank "Level up with #YourGoToCryptoPlug 👇", Bitget "🔗 Join the campaign:" + a bare URL + "About
    // Bitget🔹", BingX "Official channels" (one "Website: https://…" per line) were left in the rules
    // (only the link right after such a pointer / inside the channels block goes: a bare form link or "Follow X: …" can be a task)
    if (b.t !== "tr" && x.length <= 90 && /(👇|⬇️?|👉)\s*$|^🔗[^.]{0,60}[:：]\s*$/u.test(x)) { linkTail = true; continue; }
    if (b.t !== "tr" && x.length <= 100 && /^([\p{L}\d.]+\s+)?(official (channels|links|community)|офіційні (канали|посилання)|официальные (каналы|ссылки))(\s+[\p{L}\d.]+)?\s*([:：]?\s*$|[^.]{0,40}https?:\/\/\S+$)/iu.test(x)) { linkTail = true; continue; }
    if (linkTail && b.t !== "tr" && x.length <= 120 && /^([\p{L}\s.()]{0,40}[:：]\s*)?https?:\/\/\S+$/iu.test(x)) continue;
    linkTail = false;
    // Bitget's "About Bitget🔹" company blurb (a token's "About SXT" in a Launchpool post is real content — no emoji there)
    if (out.length >= 3 && x.length <= 30 && /^(about|про|о)\s+[\p{L}\d.]+\s*[\u{1F539}\u{1F538}\u{1F537}\u{1F536}]\s*$/iu.test(x)) { cut = true; continue; }
    out.push(b);
  }
  return out;
}

/**
 * Rows stored before VER 5 could be split by a line break inside a cell, leaving "§C§ 60 days" as a separate block.
 * Glue such pieces back onto the preceding table row; any marker left elsewhere is removed.
 */
function joinCells(blocks: Block[]): Block[] {
  const out: Block[] = [];
  for (const b of blocks) {
    if (!b.x.includes("§")) { out.push(b); continue; }
    const prev = out[out.length - 1];
    if (b.t !== "tr" && b.x.includes("§C§") && prev?.t === "tr" && prev.cells) {
      const [head, ...rest] = b.x.split("§C§").map((c) => c.trim());
      const cells = [...prev.cells];
      if (head) cells[cells.length - 1] = `${cells[cells.length - 1]} ${head}`.trim();
      cells.push(...rest);
      out[out.length - 1] = { ...prev, cells, x: cells.filter(Boolean).join(" · ") };
      continue;
    }
    const strip = (s: string) => s.replace(/§[RCHL]§/g, " ").replace(/\s+/g, " ").trim();
    const x = strip(b.x);
    if (x) out.push(b.cells ? { ...b, x, cells: b.cells.map(strip) } : { ...b, x });
  }
  return out;
}

/**
 * Site chrome scraped together with a promo page (menus, language lists, "Log in / Sign up", footers) shows up as a long
 * run of short blocks that repeat word for word in many promos of the same source. Drop runs of ≥ 8 consecutive blocks
 * that each occur in ≥ 3 promos of that source and are mostly short labels; repeated rule text (standard terms, a
 * campaign posted several times) stays.
 */
const COMMON = new Map<string, Map<string, number>>();
/** Hand-picked site chrome that slips past the run filter (config/rules-junk.json, keyed like translate.ts). */
const JUNK = new Set<string>((JUNK_JSON as { keys: string[] }).keys);
function dropBoilerplate(blocks: Block[], id: string, store: Record<string, PromoDetails>): Block[] {
  const srcOf = (k: string) => (k.startsWith("tg:") ? k.split("/")[0] : k.split(":")[0]);   // telegram channel / venue
  const src = srcOf(id);
  let counts = COMMON.get(src);
  if (!counts) {
    counts = new Map();
    for (const [k, d] of Object.entries(store)) if (srcOf(k) === src) for (const x of new Set(d.blocks.map((b) => b.x))) counts.set(x, (counts.get(x) ?? 0) + 1);
    COMMON.set(src, counts);
  }
  const common = blocks.map((b) => b.x.length <= 300 && (counts!.get(b.x) ?? 0) >= 3);
  const keep = blocks.map(() => true);
  for (let i = 0; i < blocks.length;) {
    if (!common[i]) { i++; continue; }
    let j = i;
    while (j < blocks.length && common[j]) j++;
    // menus are mostly labels ("Spot", "Log in", "Español"): short, no digits, ≤ 5 words — rule text isn't
    if (j - i >= 8 && blocks.slice(i, j).filter((b) => menuLike(b.x)).length >= 0.6 * (j - i)) for (let k = i; k < j; k++) keep[k] = false;
    i = j;
  }
  // page widgets and cookie banners never belong to the rules
  blocks.forEach((b, i) => { if (JUNK.has(createHash("sha1").update(b.x.trim()).digest("base64url").slice(0, 16))) keep[i] = false; });
  blocks.forEach((b, i) => { if (/^(Claimed|Progress)\s*:?\s*[\d/ ,]+$/.test(b.x) || /\bcookies\b/i.test(b.x) || /^\S*\*{3,}\S*@\S+ won /.test(b.x) || /^Draws Left:|^Total Deposit[：:]/.test(b.x) || /^[A-Z0-9]{2,12}\/[A-Z]{3,5}\s*[\d.,+\-%\s]+$/.test(b.x) || /^(user ?id|uid)\s*[:：]/i.test(b.x)) keep[i] = false; });
  return blocks.filter((_, i) => keep[i]);
}
/** A menu entry: a short label ("Spot", "Log in", "Español") or a label glued to its description ("SpotBuy and sell…"). */
function menuLike(x: string): boolean {
  if (x.length <= 40 && !/\d/.test(x) && x.split(/\s+/).length <= 5) return true;
  return x.length <= 120 && /[a-z][A-Z][a-z]/.test(x.slice(0, 40)) && !/[.!?]$/.test(x);
}
