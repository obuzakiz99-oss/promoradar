import { TELEGRAM, VENUES, venueOf } from "@/config/site";
import type { Promo } from "../types";
import { classify, cleanTitle, isPromo, parseReward } from "../parse";
import { decodeEntities, getText } from "./util";

export type TgStatus = Record<string, { ok: boolean; count: number; error?: string }>;

const strip = (html: string) =>
  decodeEntities(html.replace(/<br\s*\/?>/g, "\n").replace(/<[^>]+>/g, "")).replace(/[ \t]+/g, " ").trim();

/** A post headline must itself announce a campaign (market chatter / memes are skipped). */
const STRONG = /\b(airdrops?|candybomb|launchpool|launchpad|megadrop|poolx|jumpstart|competition|challenge|tournament|giveaway|prize|campaign|carnival|rewards?|bonus|earn up to|apr|apy|share \$?\d|win|vouchers?|cashback|points (program|campaign|season|airdrop)|quiz|learn to earn|referral|invite|lucky draw|mystery box|trade to earn|staking)\b|\bpoints$/i;
const CHATTER = /\?\s*$|^(gm|good morning|happy|mark your calendar)\b|\b(bullish|bearish|price prediction|long or short|is back at|jumps past|surges|plunges|recap|distributed|results|winners? (announced|list)|has ended|ended|proposal|governance|vote)\b/i;

/** First meaningful line of a post, without leading emoji/bullets and channel boilerplate. */
function headline(text: string): string {
  const lines = text.split("\n")
    .map((l) => l.replace(/^[^\p{L}\p{N}$#@]+/u, "").replace(/^(Bitrue Official Update|Official Update|Announcement)[\s ]*[—–:-][\s ]*/i, "").trim())
    .filter((l) => l.length > 6 && !/^(bitrue official update|official update|announcement)$/i.test(l));
  let h = lines[0] ?? "";
  if (h.length < 28 && lines[1]) h = `${h} — ${lines[1]}`;
  return h.length > 170 ? `${h.slice(0, 167).replace(/\s+\S*$/, "")}…` : h;
}

/** Read the public preview page of an official channel (latest ~20 posts). */
async function channel(venue: string, ch: string): Promise<Promo[]> {
  const html = await getText(`https://t.me/s/${ch}`, 15_000);
  const posts = [...html.matchAll(/<div class="tgme_widget_message [^"]*"[^>]*data-post="([^"]+)"[\s\S]*?(?=<div class="tgme_widget_message_wrap|$)/g)];
  const out: Promo[] = [];
  const site = VENUES[venue].site;
  for (const [block, post] of posts) {
    const body = block.match(/<div class="tgme_widget_message_text[^"]*"[^>]*>([\s\S]*?)<\/div>/)?.[1];
    const date = Date.parse(block.match(/<time[^>]*datetime="([^"]+)"/)?.[1] ?? "");
    if (!body || !date) continue;
    const text = strip(body);
    const title = cleanTitle(headline(text));
    if (!title || CHATTER.test(title) || !isPromo(title) || !STRONG.test(title)) continue;
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
  return out;
}

export async function telegram(): Promise<{ promos: Promo[]; status: TgStatus }> {
  const res = await Promise.allSettled(TELEGRAM.map((c) => channel(c.venue, c.channel)));
  const status: TgStatus = {};
  const promos: Promo[] = [];
  res.forEach((r, i) => {
    const key = `tg:${TELEGRAM[i].channel}`;
    if (r.status === "rejected") { status[key] = { ok: false, count: 0, error: String(r.reason).slice(0, 120) }; return; }
    status[key] = { ok: true, count: 0 };
    promos.push(...r.value);
  });
  return { promos, status };
}
