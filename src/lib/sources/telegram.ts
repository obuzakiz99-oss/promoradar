import fs from "node:fs";
import path from "node:path";
import { TELEGRAM, VENUES, venueOf } from "@/config/site";
import type { Promo } from "../types";
import { classify, cleanTitle, earnVerbCategory, isPromo, isReferral, parseReward, tidyHeadline } from "../parse";
import { decodeEntities, getText } from "./util";

export type TgStatus = Record<string, { ok: boolean; count: number; error?: string }>;

const strip = (html: string) =>
  decodeEntities(html.replace(/<br\s*\/?>/g, "\n").replace(/<[^>]+>/g, "")).replace(/[ \t]+/g, " ").trim();

/** A post headline must itself announce a campaign (market chatter / memes are skipped). */
const STRONG = /\b(airdrops?|candybomb|candydrop|tokensplash|kickstarter|(?<!the )spotlight|launchx|hodler|token sale|tge|booster|puzzle hunt|launchpool|launchpad|megadrop|poolx|jumpstart|competitions?|challenges?|tournaments?|giveaways?|prizes?|campaigns?|carnival|rewards?|bonus(es)?|earn up to|apr|apy|share \$?\d[\d,.]*[kmb]?|win|vouchers?|cashback|points (program|campaign|season|airdrop)|quiz|learn to earn|referrals?|invite|lucky draw|mystery box|trade to earn|staking|festival|loss coverage)\b|\bpoints$/i;
const CHATTER = /\?\s*$|^(gm|good morning|happy|mark your calendar)\b|\b(bullish|bearish|price prediction|long or short|is back at|jumps past|surges|plunges|recap|distributed|results|winners? (announced|list)|has ended|ended|proposal|governance|vote|rewards? (are|is|have been) (out|sent|credited)|rewards update|performance report|monthly report|buildathon|hackathon|grants?)\b/i;   // + builder grants (GMX Buildathon, 26.11)

/** First meaningful line of a post, without leading emoji/bullets and channel boilerplate. */
const postLines = (text: string) => text.split("\n")
    .map((l) => l.replace(/^\d️?⃣\s*/u, "").replace(/^[^\p{L}\p{N}$#@]+/u, "").replace(/^(Bitrue Official Update|Official Update|Announcement)[\s ]*[—–:-][\s ]*/i, "").trim())
    .filter((l) => l.length > 6 && !/^(bitrue official update|official update|announcement)$/i.test(l));
const cap = (h: string) => (h.length > 170 ? `${h.slice(0, 167).replace(/\s+\S*$/, "")}…` : h);

function headline(text: string): string {
  const lines = postLines(text);
  let h = lines[0] ?? "";
  if (h.length < 28 && lines[1]) h = `${h} — ${lines[1]}`;
  return cap(h);
}

const titleOk = (t: string) => !!t && !(CHATTER.test(t) && !/kickstarter|\bclaim\b|airdrop distribut/i.test(t)) && isPromo(t) && STRONG.test(t);
/** A real reward amount near the top of the post ("20,000 USDT prize pool", "$10,000", "6% APY"). */
const AMOUNT = /(\$\s?\d[\d,.]*\s*[kmb]?\b|\b\d[\d,.]*\s*[kmb]?\s*(usdt|usdc|usd|btc|eth)\b|\b\d+(\.\d+)?\s?%\s*(apr|apy)\b)/i;

/**
 * 12.11: KuCoin / HTX posts often open with a slogan ("POWERING UP THE GRID, KUFAM!") or a question and name the
 * campaign only on the next lines. If the headline fails, take the first of the next 3 lines that passes — but only
 * when the top of the post also names a concrete reward amount, so chatter with a stray "rewards" word stays out.
 */
function pickTitle(text: string): string {
  const h = cleanTitle(headline(text));
  if (titleOk(h)) return h;
  if (!AMOUNT.test(text.slice(0, 500))) return "";
  for (const l of postLines(text).slice(1, 4)) {
    if (/https?:\/\/|^(more )?details\b|^\d+[.)]\s|^(prize|note|tip)\s*:|^(connect|copy|click|tap|visit|go to|follow|log ?in|sign in|scan|download|open)\b/i.test(l)) continue;
    let t = cleanTitle(cap(l.replace(/[:：]\s*$/, "")));
    // audit 26.11: MEXC "Maximum reward: $5,000 worth of XAUT." — a bare label line; name the programme from the lines above
    if (/^(maximum|max\.?|total|top) (reward|prize|bonus)\b/i.test(t)) {
      const name = text.slice(0, text.indexOf(l)).match(/\b((?:[A-Z][\w-]*\s){1,4}(?:Plan|Program|Programme|Campaign|Event|Festival|Carnival|Coverage))\b/);
      if (name) t = cap(`${name[1].replace(/^(Our|The|This|Your)\s+/, "")}: ${t.replace(/^(\w+(?: \w+)?)\s*:\s*/, "$1 ").replace(/^\w/, (c) => c.toLowerCase())}`);
    }
    if (t.length >= 20 && titleOk(t)) return t;
  }
  return "";
}

/*
 * The public preview shows only the latest ~20 posts, and busy channels (KuCoin, Bitget, MEXC) push a still-running
 * promo out of that window within a day or two. So: on the first run a channel is read back 14 days (?before=…), and every
 * promo found is kept in data/telegram.json until it ends / gets too old; later builds read just the newest 2 pages.
 */
const STORE = () => path.join(process.cwd(), "data", "telegram.json");
const BACK_MS = 14 * 86400_000;
type TgStore = { v?: number; backfilled: Record<string, number>; promos: Record<string, Promo> };
const TG_VER = 8;   // 8: plural promo words in headlines, "Maximum reward:" label lines named (26.11)  7: re-read 14 days with the fixed footer cut  6: footer cut, campaign links (audit 2)  5: raw headline kept for the AI  4: tidy headlines (25.11)  3: referral landing pages are never the campaign link (23.11)   // bump when post parsing changes → stored promos are re-read from Telegram
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

export function parsePage(html: string, venue: string, ch: string): { promos: Promo[]; minId: number; oldest: number } {
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
    // audit 2 (25.11): Bitrue posts end with a "━━━━ claim your USDT now" footer — never part of the post's headline
    // (Bitrue also puts "Bitrue Official Update / ━━━━" ABOVE the post — only the last part after a rule is the footer,
    // and a short first part is a channel header; the first version kept only the header and dropped 19 promos)
    const segs = strip(body).split(/^\s*[_━─=]{5,}\s*$/m);
    if (segs.length > 1) segs.pop();
    while (segs.length > 1 && segs[0].replace(/[^\p{L}]/gu, "").length < 40) segs.shift();
    const text = segs.join("\n");
    const raw = pickTitle(text), tidy = tidyHeadline(raw);
    const title = tidy && isPromo(tidy) ? tidy : raw;   // never lose a promo to the tidying
    if (!title) continue;
    // link to the exchange's own article when the post has one; otherwise to the post itself
    // (posts often start with a Discord / Google Form / partner link — those aren't the campaign page)
    const own = new URL(site).hostname.replace(/^(www|app)\./, "");
    const links = [...body.matchAll(/href="(https?:\/\/[^"]+)"/g)].map((m) => decodeEntities(m[1]));
    const mine = links.filter((u) => { try { const h = new URL(u).hostname; return h === own || h.endsWith("." + own); } catch { return false; } });
    // audit 23.11: the first own link was often a button (deposit, referral landing, m-score) — prefer the article / event page
    const path = (u: string) => u.split(/[?#]/)[0];   // utm_campaign=… is not a campaign page
    // audit 23.11 (round 5): Bitrue "/referral/landing?inviteCode=…" won over "/land/Bitrue-Thanksgiving-Month" — referral pages never count
    // audit 25.11: OKX posts end with a "verify our channel" link — never the campaign page
    // audit 2 (25.11): MEXC "/campaigns/ReferralRush" is the campaign page — only real referral / invite landings are skipped
    const ref = (u: string) => /\/referral(\/landing)?\b|[?&]invite(code)?=|\/invite\b|register|sign-?up|channel-verification|verify|\/rewards\/mobile|\/rewards\/?$|\/download|\/app\/?$/i.test(path(u));   // + footer links every post carries (Bitrue /rewards/mobile)
    const url0 = mine.find((u) => !ref(u) && /support|announce|activit|event|campaign|promo|article|help|zendesk|landing|\/land\/|\/news\//i.test(path(u)))
      ?? mine.find((u) => !ref(u) && !/deposit|download|\/assets|wallet|m-score|\/trade\/|\/futures\/[A-Z]/i.test(path(u)))
      ?? `https://t.me/${post}`;
    // a site's home page is not the campaign (MEXC Referral Rush linked mexc.com/) — the post itself is better
    const url = /^https?:\/\/[^/]+\/?$/.test(path(url0)) ? `https://t.me/${post}` : url0;
    out.push({
      id: `tg:${post}`, venue: venueOf(venue), title, url, joinUrl: VENUES[venue].refUrl || site,
      category: (() => {
        // audit 26.11: the raw headline decides (the tidy title can be cut before "prize pool"); a "referral" read only from
        // the raw tail (Ourbit "welcome gifts, BTC discounts and referral bonuses") is re-checked with the body as a hint
        const c = classify(raw);
        if (c === "referral" && !isReferral(title)) return classify(title, `${raw} ${text.slice(0, 400)}`);
        // audit 27.11 (evening): Ourbit "Create a Team and Earn Up to 130,000 USDT as Captain" (a futures team showdown) was
        // filed as Earn — "earn up to <amount>" is how a reward is worded; without an Earn-product word the body decides
        if (c === "earn") return earnVerbCategory(raw, text.slice(0, 400)) ?? c;
        return c !== "other" ? c : classify(raw, text.slice(0, 400));
      })(), publishedAt: date,
      // audit 23.11: "up to 1,250 USDT per user", "Maximum reward: $5,000" are per-person caps, not the pool
      reward: /\b(per (user|person|participant|account|referral|friend)|each user|maximum reward|max(imum)? (of )?\$?[\d,.]+ ?(USDT|USDC|USD)? ?(per|each))\b/i.test(raw) ? undefined : parseReward(raw), tags: [],
      // audit 25.11 (deep): two posts about one campaign share a link (often a bit.ly) even when the post has no own-site article
      meta: { source: `Telegram @${ch}`, ...(raw !== title ? { rawTitle: raw } : {}),...(() => { const k = links.map(path).find((u) => !/t\.me\/|twitter\.com|x\.com|youtu|discord|forms\.gle|docs\.google|apps\.apple|play\.google|deposit|download|\/assets|wallet|\/trade\/|\/futures\/[A-Z]/i.test(u) && !ref(u) && /^https?:\/\/[^/]+\/[^/?#]{3,}/.test(u)); return k ? { linkKey: k.replace(/^https?:\/\/(www\.)?/, "").replace(/\/$/, "").toLowerCase() } : {}; })() },
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
    // audit 23.11: a title picked from mid-post ("What's more? You can continue earning…") — drop the connector
    promos.push(...r.value.map((p) => ({ ...p, title: p.title.replace(/^(what'?s more|plus|also|moreover|in addition|on top of that)[\s?!:,.—–-]*/i, "") }))
      .filter((p) => p.title.length >= 12 && !/^(breakdown|details|rules|terms|how to|note)\b/i.test(p.title) && isPromo(p.title)));
  });
  return { promos, status };
}
