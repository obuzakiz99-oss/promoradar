import fs from "node:fs";
import path from "node:path";
import { TELEGRAM, VENUES, venueOf } from "@/config/site";
import type { Promo } from "../types";
import { classify, cleanTitle, isPromo, parseReward } from "../parse";
import { decodeEntities, getText } from "./util";

export type TgStatus = Record<string, { ok: boolean; count: number; error?: string }>;

const strip = (html: string) =>
  decodeEntities(html.replace(/<br\s*\/?>/g, "\n").replace(/<[^>]+>/g, "")).replace(/[ \t]+/g, " ").trim();

/** A post headline must itself announce a campaign (market chatter / memes are skipped). */
const STRONG = /\b(airdrops?|candybomb|candydrop|tokensplash|kickstarter|spotlight|launchx|hodler|token sale|tge|booster|puzzle hunt|launchpool|launchpad|megadrop|poolx|jumpstart|competition|challenge|tournament|giveaway|prize|campaign|carnival|rewards?|bonus|earn up to|apr|apy|share \$?\d|win|vouchers?|cashback|points (program|campaign|season|airdrop)|quiz|learn to earn|referral|invite|lucky draw|mystery box|trade to earn|staking)\b|\bpoints$/i;
const CHATTER = /\?\s*$|^(gm|good morning|happy|mark your calendar)\b|\b(bullish|bearish|price prediction|long or short|is back at|jumps past|surges|plunges|recap|distributed|results|winners? (announced|list)|has ended|ended|proposal|governance|vote|rewards? (are|is|have been) (out|sent|credited)|rewards update)\b/i;

/** First meaningful line of a post, without leading emoji/bullets and channel boilerplate. */
function headline(text: string): string {
  const lines = text.split("\n")
    .map((l) => l.replace(/^[^\p{L}\p{N}$#@]+/u, "").replace(/^(Bitrue Official Update|Official Update|Announcement)[\s ]*[—–:-][\s ]*/i, "").trim())
    .filter((l) => l.length > 6 && !/^(bitrue official update|official update|announcement)$/i.test(l));
  let h = lines[0] ?? "";
  if (h.length < 28 && lines[1]) h = `${h} — ${lines[1]}`;
  return h.length > 170 ? `${h.slice(0, 167).replace(/\s+\S*$/, "")}…` : h;
}

/*
 * The public preview shows only the latest ~20 posts, and busy channels (KuCoin, Bitget, MEXC) push a still-running
 * promo out of that window within a day or two. So: on the first run a channel is read back 14 days (?before=…), and every
 * promo found is kept in data/telegram.json until it ends / gets too old; later builds read just the newest 2 pages.
 */
const STORE = () => path.join(process.cwd(), "data", "telegram.json");
const BACK_MS = 14 * 86400_000;
type TgStore = { v?: number; backfilled: Record<string, number>; promos: Record<string, Promo> };
const TG_VER = 2;   // bump when post parsing changes → stored promos are re-read from Telegram
let STORE_MEM: TgStore | null = null;
function loadStore(): TgStore {
  if (STORE_MEM) return STORE_MEM;
  try { STORE_MEM = JSON.parse(fs.readFileSync(STORE(), "utf8")); } catch { STORE_MEM = { backfilled: {}, promos: {} }; }
  if (STORE_MEM!.v !== TG_VER) STORE_MEM = { v: TG_VER, backfilled: {}, promos: {} };
  STORE_MEM!.backfilled ??= {}; STORE_MEM!.promos ??= {};
  return STORE_MEM!;
}
function saveStore() {
  try { if (STORE_MEM && fs.existsSync(path.dirname(STORE()))) fs.writeFileSync(STORE(), JSON.stringify(STORE_MEM)); } catch { /* read-only */ }
}

/** Read the public preview of an official channel: newest pages, or 14 days back on the first run. */
async function channel(venue: string, ch: string): Promise<Promo[]> {
  const store = loadStore();
  const deep = !store.backfilled[ch] || Date.now() - store.backfilled[ch] > 7 * 86400_000;   // re-backfill weekly
  const out: Promo[] = [];
  let before = "", done = false, failed: unknown = null;
  for (let page = 0; page < (deep ? 12 : 2); page++) {
    const url = `https://t.me/s/${ch}${before ? `?before=${before}` : ""}`;
    // Telegram sometimes drops a request (seen on GitHub runners) — retry once, then keep what we already have
    let html = "";
    for (let a = 0; a < 3 && !html; a++) {
      try { html = await getText(url, 15_000); } catch (e) { failed = e; await new Promise((r) => setTimeout(r, 2500 * (a + 1))); }
    }
    if (!html) break;
    failed = null;
    const { promos, minId, oldest } = parsePage(html, venue, ch);
    out.push(...promos);
    if (!minId || oldest < Date.now() - BACK_MS) { done = true; break; }
    before = String(minId);
  }
  if (deep && done) store.backfilled[ch] = Date.now();
  // nothing fetched and nothing stored → report the error; otherwise the stored promos still count
  const stored = Object.values(store.promos).some((p) => p.id.toLowerCase().startsWith(`tg:${ch.toLowerCase()}/`));
  if (failed && !out.length && !stored) throw failed;
  // merge with what earlier builds found (a post that scrolled out of the preview is still a running promo)
  for (const p of out) store.promos[p.id] = p;
  // a post without an end date is kept 14 days (most exchange campaigns run 1–2 weeks); with an end date — until it ends
  const cutoff = Date.now() - BACK_MS;
  const mine = Object.values(store.promos).filter((p) => p.id.toLowerCase().startsWith(`tg:${ch.toLowerCase()}/`));
  for (const p of mine) if (p.endsAt ? p.endsAt < Date.now() : p.publishedAt < cutoff) delete store.promos[p.id];
  return Object.values(store.promos).filter((p) => p.id.toLowerCase().startsWith(`tg:${ch.toLowerCase()}/`));
}

function parsePage(html: string, venue: string, ch: string): { promos: Promo[]; minId: number; oldest: number } {
  const posts = [...html.matchAll(/<div class="tgme_widget_message [^"]*"[^>]*data-post="([^"]+)"[\s\S]*?(?=<div class="tgme_widget_message_wrap|$)/g)];
  let minId = 0, oldest = Infinity;
  for (const [block, post] of posts) {
    const id = Number(post.split("/").pop());
    if (id && (!minId || id < minId)) minId = id;
    const d = Date.parse(block.match(/<time[^>]*datetime="([^"]+)"/)?.[1] ?? "");
    if (d && d < oldest) oldest = d;
  }
  void ch;
  const out: Promo[] = [];
  const site = VENUES[venue].site;
  for (const [block, post] of posts) {
    const body = block.match(/<div class="tgme_widget_message_text[^"]*"[^>]*>([\s\S]*?)<\/div>/)?.[1];
    const date = Date.parse(block.match(/<time[^>]*datetime="([^"]+)"/)?.[1] ?? "");
    if (!body || !date) continue;
    const text = strip(body);
    const title = cleanTitle(headline(text));
    if (!title || (CHATTER.test(title) && !/kickstarter|\bclaim\b|airdrop distribut/i.test(title)) || !isPromo(title) || !STRONG.test(title)) continue;
    // link to the exchange's own article when the post has one; otherwise to the post itself
    // (posts often start with a Discord / Google Form / partner link — those aren't the campaign page)
    const own = new URL(site).hostname.replace(/^(www|app)\./, "");
    const links = [...body.matchAll(/href="(https?:\/\/[^"]+)"/g)].map((m) => decodeEntities(m[1]));
    const url = links.find((u) => { try { const h = new URL(u).hostname; return h === own || h.endsWith("." + own); } catch { return false; } }) ?? `https://t.me/${post}`;
    out.push({
      id: `tg:${post}`, venue: venueOf(venue), title, url, joinUrl: VENUES[venue].refUrl || site,
      category: classify(title) !== "other" ? classify(title) : classify(text.slice(0, 400)), publishedAt: date, reward: parseReward(title), tags: [],
      meta: { source: `Telegram @${ch}` },
    });
  }
  return { promos: out, minId, oldest: oldest === Infinity ? 0 : oldest };
}

export async function telegram(): Promise<{ promos: Promo[]; status: TgStatus }> {
  // channels one after another (a few at a time) — the deep first run makes ~10 requests per channel
  const res: PromiseSettledResult<Promo[]>[] = [];
  for (let i = 0; i < TELEGRAM.length; i += 3) {
    res.push(...await Promise.allSettled(TELEGRAM.slice(i, i + 3).map((c) => channel(c.venue, c.channel))));
  }
  saveStore();
  const status: TgStatus = {};
  const promos: Promo[] = [];
  res.forEach((r, i) => {
    const key = `tg:${TELEGRAM[i].channel}`;
    if (r.status === "rejected") { status[key] = { ok: false, count: 0, error: String(r.reason).slice(0, 120) }; return; }
    status[key] = { ok: true, count: 0 };
    // stored posts are re-checked against the current filter (it gets stricter over time, e.g. hack/breach news)
    promos.push(...r.value.filter((p) => isPromo(p.title)));
  });
  return { promos, status };
}
