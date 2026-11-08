import { buildShared } from "./sources/util";
import fs from "node:fs";
import path from "node:path";
import { collectAll, type Collected } from "./sources";
import { VENUES, SPONSORED, MANUAL, venueOf } from "@/config/site";
import { parseReward } from "./parse";
import { aprOf, factsOf, geoOf, getDetails, poolOf, termsOf, tiersOf, type PromoDetails } from "./details";
import { prices } from "./pools";
import { translateAll } from "./translate";
import { getFaqs } from "./faq";
import type { Promo, Venue } from "./types";

/** All live promos (exchange & DeFi feeds + paid placements). */
/**
 * During the static GitHub build every language page (and the build's worker processes) must see the SAME promo list —
 * otherwise a Telegram post appearing between the uk and en renders breaks the language links of promo pages.
 * So the first collection of a build is written to .next/cache/promos-build.json and reused for 20 minutes.
 */
export async function getPromos(lang?: string): Promise<Collected> {
  const c = await getPromosShared();
  return lang === "uk" || lang === "ru" ? localize(c, lang) : c;
}

/** The same collection with titles / key rules / full rules swapped for their translation where one exists. */
function localize(c: Collected, lang: "uk" | "ru"): Collected {
  const dict = c.i18n?.[lang];
  if (!dict || !Object.keys(dict).length) return c;
  const tr = (s: string) => dict[s.trim()] ?? s;
  const promos = c.promos.map((p) => {
    const t = dict[p.title.trim()];
    const m = p.meta;
    return {
      ...p, ...(t ? { title: t, titleOrig: p.title } : {}),
      meta: m && {
        ...m,
        actions: m.actions && tr(m.actions),
        perUser: m.perUser && { ...m.perUser, text: tr(m.perUser.text) },
        minEntry: m.minEntry && { ...m.minEntry, text: tr(m.minEntry.text) },
        geo: m.geo && { ...m.geo, text: m.geo.text && tr(m.geo.text) },
      },
    };
  });
  const details: Record<string, PromoDetails> = {};
  for (const [id, d] of Object.entries(c.details ?? {})) {
    let done = 0;
    const blocks = d.blocks.map((b) => {
      const x = dict[b.x.trim()];
      if (x || b.t === "tr") done++;
      return b.t === "tr" ? { ...b, cells: b.cells?.map(tr) } : x ? { ...b, x } : b;
    });
    details[id] = { ...d, blocks, facts: d.facts.map((f) => ({ ...f, text: tr(f.text) })), translated: blocks.length ? done / blocks.length : 0 };
  }
  return { ...c, promos, details };
}

function getPromosShared(): Promise<Collected> {
  return buildShared("promos", getPromosLive);
}

async function getPromosLive(): Promise<Collected> {
  const data = await collectAll();
  const now = Date.now();
  const sponsored: Promo[] = SPONSORED.filter((s) => new Date(s.until).getTime() > now).map((s) => {
    return {
      id: s.id, venue: venueOf(s.venue), title: s.title, url: s.url, joinUrl: VENUES[s.venue].refUrl || undefined, category: s.category,
      publishedAt: now, endsAt: new Date(s.until).getTime(), reward: s.reward ? parseReward(s.reward) : undefined, tags: [], sponsored: true,
    };
  });
  // hand-added promos (platforms without a readable feed, e.g. Pump.fun) — with their rules as the page text
  const manualDetails: Record<string, PromoDetails> = {};
  const manual: Promo[] = MANUAL.filter((s) => new Date(s.until).getTime() > now).map((s) => {
    const blocks = (s.rules ?? []).map((x) => ({ t: "p" as const, x }));
    if (blocks.length) manualDetails[s.id] = { blocks, facts: factsOf(blocks), at: now, partial: true };
    return {
      id: s.id, venue: venueOf(s.venue), title: s.title, url: s.url, category: s.category,
      publishedAt: s.from ? new Date(s.from).getTime() : now, startsAt: s.from ? new Date(s.from).getTime() : undefined, endsAt: new Date(s.until).getTime(),
      reward: s.reward ? parseReward(s.reward) : undefined, tags: [],
      meta: { source: `${venueOf(s.venue).name} · ${s.checked}`, ...(s.perUser ? { perUser: { ...s.perUser, usd: s.perUser.unit === "USD" ? s.perUser.amount : undefined, text: s.rules?.find((r) => /place|prize/i.test(r)) ?? "" } } : {}) },
    } satisfies Promo;
  });
  const all = [...sponsored, ...manual, ...data.promos];
  // full rules from the exchanges' own announcements (cached across builds in data/details.json)
  const details: Record<string, PromoDetails> = { ...(await getDetails(all.filter((p) => !manualDetails[p.id])).catch(() => ({}))), ...manualDetails };
  const px = await prices().then((x) => x.px).catch(() => ({} as Record<string, number>));
  const promos: Promo[] = [];
  for (const p of all) {
    const d = details[p.id];
    if (d) {
      // exact dates and the per-person maximum, read from the rules
      const tm = termsOf(d, p.title, p.publishedAt, p.reward?.amount);
      const meta = { ...(p.meta ?? {}) };
      if (!p.startsAt && tm.start && tm.start > now - 400 * 86400_000) { p.startsAt = tm.start; meta.datesFromRules = true; }
      if (!p.endsAt && tm.end) { p.endsAt = tm.end; meta.datesFromRules = true; }
      if (tm.perUser) {
        const rate = /^(USD|USDT|USDC|FDUSD|USD1|DAI)$/.test(tm.perUser.unit) ? 1 : px[tm.perUser.unit];
        meta.perUser = { ...tm.perUser, usd: rate ? Math.round(tm.perUser.amount * rate * 100) / 100 : undefined };
      }
      if (tm.minEntry) meta.minEntry = tm.minEntry;
      // calculator inputs: reward tiers, advertised APR, futures vs spot (fees)
      const tiers = tiersOf(d.blocks);
      if (tiers.length) meta.tiers = tiers;
      const apr = p.category === "earn" || /\bAPR|APY\b/.test(p.title) ? aprOf(p.title, d.blocks.map((b) => b.x)) : undefined;
      if (apr !== undefined && meta.apr === undefined) meta.aprPct = apr;
      if (/\b(futures|perps?|perpetual|contract|CFD)\b/i.test(`${p.title} ${tm.minEntry?.text ?? ""}`)) meta.futures = true;
      // the headline had no amount → take the prize pool from the rules ("Total prize pool: 10,000 USDT")
      if (!p.reward && p.category !== "farming") {
        const pool = poolOf([p.title, ...d.blocks.map((b) => b.x)]);
        if (pool) p.reward = parseReward(pool.unit === "USD" ? `$${pool.amount.toLocaleString("en-US")}` : `${pool.amount.toLocaleString("en-US")} ${pool.unit}`);
      }
      p.meta = meta;
    }
    if (p.endsAt && p.endsAt < now) continue;          // the rules say it has already ended
    // closed early: exchanges put an "UPDATE: this campaign has ended early" line at the top of the rules
    const ENDED = /\b(has ended( early)?|ended early|campaign (is )?(now )?(closed|over|concluded)|has (been )?(concluded|terminated|suspended))\b/i;
    if (d && d.blocks.slice(0, 8).some((b) => b.x.split(/(?<=[.!])\s+/).some((s) => ENDED.test(s) && !/\b(will|if|once|after)\b/i.test(s)))) continue;
    // region / audience / effort flags for the filters
    const meta = { ...(p.meta ?? {}) };
    const geo = geoOf(p.title, d);
    if (geo.only || geo.noUA || geo.noEU) meta.geo = geo;
    if (/\b(new ?users?|newcomers?|new traders?|first[- ]time|welcome (offer|bonus|rewards?|gift)|sign[- ]?up bonus|newbies?|new to [A-Z])\b/i.test(p.title)
      || d?.facts.some((f) => f.k === "who" && /\bonly\b[^.]{0,40}\bnew\b|\bnew users? only\b/i.test(f.text))) meta.forNew = true;
    if (!meta.minEntry && /\b(quiz|learn|word of the day|register to (claim|get|win)|check[- ]?in|giveaway|lucky draw|free|no deposit|feedback|survey)\b/i.test(p.title)) meta.noDeposit = true;
    const thin = !p.reward && !p.endsAt && !meta.perUser && !meta.minEntry && !(d && d.facts.length) && meta.apr === undefined && !p.evergreen;
    // pure teasers ("T-minus 24 hours until…", "coming soon") carry nothing to act on yet
    if (thin && /\b(t-?minus|coming soon|stay tuned|countdown|sneak peek|teaser|guess (what|the)|something (big|new) is coming)\b/i.test(p.title)) continue;
    if (thin) meta.thin = true;
    p.meta = Object.keys(meta).length ? meta : p.meta;
    promos.push(p);
  }
  // translations (DeepL Free, cached in data/translations.json) — most visible texts first, full rules last
  const texts: string[] = [];
  for (const p of promos) texts.push(p.title);
  for (const p of promos) {
    const d = details[p.id];
    if (p.meta?.perUser) texts.push(p.meta.perUser.text);
    if (p.meta?.minEntry) texts.push(p.meta.minEntry.text);
    if (p.meta?.actions) texts.push(p.meta.actions);
    if (p.meta?.geo?.text) texts.push(p.meta.geo.text);
    if (d) texts.push(...d.facts.map((f) => f.text));
  }
  // Full rules are long (≈3k chars each): Ukrainian first, most valuable promos first (open to Ukraine, then by what one
  // person / the pool can get). DeepL Free covers what it can, Azure Translator the rest (see translate.ts).
  const worth = (p: Promo) => (p.meta?.geo?.only || p.meta?.geo?.noUA ? -1e9 : 0) + (p.meta?.perUser?.usd ?? 0) * 10 + (p.reward?.usd ?? 0) / 100 - (p.meta?.thin ? 1e6 : 0);
  const rules: string[] = [];
  for (const p of [...promos].sort((a, b) => worth(b) - worth(a))) {
    const d = details[p.id];
    if (d) for (const b of d.blocks) { if (b.t === "tr") rules.push(...(b.cells ?? [])); else rules.push(b.x); }
  }
  const i18n = await translateAll({ uk: [...texts, ...rules], ru: [...texts, ...rules] }).catch(() => undefined);
  // "Часті питання" written by Claude from the original rules (cached in data/faq.json), most valuable promos first
  const faq = await getFaqs([...promos].sort((a, b) => worth(b) - worth(a)), details).catch(() => undefined);
  return { ...data, promos, details, i18n, faq };
}

/** The public API shape: promos + source status, plus translated titles (id → title) — without the bulky rules texts. */
export function publicFeed(c: Collected) {
  const titles: Record<string, Record<string, string>> = {};
  for (const l of ["uk", "ru"] as const) {
    const d = c.i18n?.[l] ?? {};
    titles[l] = Object.fromEntries(c.promos.filter((p) => d[p.title.trim()]).map((p) => [p.id, d[p.title.trim()]]));
  }
  return { promos: c.promos, status: c.status, fetchedAt: c.fetchedAt, titles };
}

/** Sum of prize pools denominated in dollars/stablecoins. */
export function totalUsd(promos: Promo[]): number {
  return promos.reduce((s, p) => s + (p.reward?.usd ?? 0), 0);
}

/** Most active venues with logos (for the hero radar): CEX first, then DEX/DeFi. */
export function topVenues(promos: Promo[], n = 8): Venue[] {
  const m = new Map<string, { v: Venue; c: number }>();
  for (const p of promos) {
    if (p.venue.kind === "airdrop") continue;
    const e = m.get(p.venue.id);
    e ? e.c++ : m.set(p.venue.id, { v: p.venue, c: 1 });
  }
  const all = [...m.values()].sort((a, b) => b.c - a.c);
  const cex = all.filter((x) => x.v.kind === "cex").slice(0, 5);
  const rest = all.filter((x) => x.v.kind !== "cex" && x.v.logo).slice(0, n - cex.length);
  return [...cex, ...rest].map((x) => x.v);
}
