import { buildShared } from "./sources/util";
import fs from "node:fs";
import path from "node:path";
import { collectAll, type Collected } from "./sources";
import { VENUES, SPONSORED, MANUAL, venueOf } from "@/config/site";
import { compact, parseReward } from "./parse";
import { aprOf, factsOf, geoOf, getDetails, poolOf, termsOf, tiersOf, type PromoDetails } from "./details";
import { prices } from "./pools";
import { translateAll } from "./translate";
import { getFaqs } from "./faq";
import { payoutOf } from "./payout";
import { junkReason, MIN_MAX_PER_USER_USD, RAFFLE, type JunkReason } from "./junk";
import { isZeroFee } from "./zerofee";
import { getAssessments, usdOf, valueOf, valueJunk } from "./value";
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
  // recurring machine-translation slips in exchange texts (audit 14.11), fixed after translation for every line
  // (no \b around Cyrillic: JS word boundaries only know Latin letters)
  const FIX: Array<[RegExp, string]> = lang === "uk" ? [
    [/Дорогі співробітники Binance/g, "Шановні користувачі Binance"], [/Приймайте участь/g, "Беріть участь"], [/приймайте участь/g, "беріть участь"],
    [/Слідкуйте/g, "Стежте"], [/слідкуйте/g, "стежте"], [/стейблкоін/g, "стейблкоїн"], [/Наторгуйте/g, "Торгуйте"], [/наторгуйте/g, "торгуйте"],
    [/^Товар$/, "Продукт"], [/самоуправством/g, "угодами із самим собою"],
  ] : [[/Дорогие сотрудники Binance/g, "Уважаемые пользователи Binance"]];
  const fix = (x: string) => FIX.reduce((a, [re, to]) => a.replace(re, to), x);
  const tr = (s: string) => { const x = dict[s.trim()]; return x ? fix(x) : s; };
  const promos = c.promos.map((p) => {
    // DeFi pool names ("USDS · GROVE Farming Pool", "USDE · Plus") are names, not sentences (audit 14.11: «Сільськогосподарський пул»)
    const t0 = p.id.startsWith("llama:") ? undefined : dict[p.title.trim()];
    const t = t0 && fix(t0);
    const m = p.meta;
    // leftovers of the post body in a headline: "2. …", "@wanchain_org", lowercase stablecoin tickers (audit 14.11)
    const tidy = (x: string) => x.replace(/^\s*\d{1,2}\.\s+/, "").replace(/\s*@[A-Za-z0-9_]{3,}\b/g, "").replace(/\b(usdt|usdc|btc|eth|sol)\b/g, (m) => m.toUpperCase()).trim();
    return {
      ...p, ...(t ? { title: tidy(t), titleOrig: p.title } : {}),
      meta: m && {
        ...m,
        actions: m.actions && tr(m.actions),
        perUser: m.perUser && { ...m.perUser, text: tr(m.perUser.text) },
        minEntry: m.minEntry && { ...m.minEntry, text: tr(m.minEntry.text) },
        geo: m.geo && { ...m.geo, text: m.geo.text && tr(m.geo.text) },
        payout: m.payout && { ...m.payout, quotes: m.payout.quotes.map(tr) },
      },
    };
  });
  const details: Record<string, PromoDetails> = {};
  for (const [id, d] of Object.entries(c.details ?? {})) {
    let done = 0;
    const blocks = d.blocks.map((b) => {
      const x0 = dict[b.x.trim()];
      const x = x0 && fix(x0);
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
      meta: { source: `${venueOf(s.venue).name} · ${s.checked}`, ...(s.standing ? { standing: true } : {}), ...(s.perUser ? { perUser: { ...s.perUser, usd: s.perUser.unit === "USD" ? s.perUser.amount : undefined, text: s.rules?.find((r) => /place|prize/i.test(r)) ?? "" } } : {}) },
    } satisfies Promo;
  });
  const all = [...sponsored, ...manual, ...data.promos];
  // full rules from the exchanges' own announcements (cached across builds in data/details.json)
  const details: Record<string, PromoDetails> = { ...(await getDetails(all.filter((p) => !manualDetails[p.id])).catch(() => ({}))), ...manualDetails };
  const px = await prices().then((x) => x.px).catch(() => ({} as Record<string, number>));
  const promos: Promo[] = [];
  const hidden: Array<{ id: string; venue: string; title: string; url: string; why: JunkReason | "news"; perUserUsd?: number; netUsd?: number }> = [];
  for (const p of all) {
    // links scraped from HTML / Telegram keep "&amp;" — the second parameter (inviteCode, rcode…) was lost (audit 14.11)
    // audit 22.11: links copied from Telegram can be plain http (WhiteBIT) — exchanges all serve https
    p.url = p.url.replace(/&amp;/g, "&").replace(/^http:\/\//i, "https://");
    if (p.joinUrl) p.joinUrl = p.joinUrl.replace(/&amp;/g, "&");
    // the venue registry is the source of logos (audit 14.11: one Phemex card had the logo, its twin a monogram)
    if (!p.venue.logo && VENUES[p.venue.id]?.logo) p.venue = { ...p.venue, logo: venueOf(p.venue.id).logo };
    // the pool in dollars when it is announced in a coin ("12.5M NIGHT ≈ $579K"): cards, sorting by size and the
    // exchange rating then see coin pools too (audit 12.11)
    if (p.reward && p.reward.usd === undefined && px[p.reward.unit.toUpperCase()]) p.reward = { ...p.reward, usd: Math.round(p.reward.amount * px[p.reward.unit.toUpperCase()]) };
    const d = details[p.id];
    if (d) {
      // exact dates and the per-person maximum, read from the rules
      const tm = termsOf(d, p.title, p.publishedAt, p.reward?.amount);
      const meta = { ...(p.meta ?? {}) };
      if (!p.startsAt && tm.start && tm.start > now - 400 * 86400_000) { p.startsAt = tm.start; meta.datesFromRules = true; }
      if (!p.endsAt && tm.end) { p.endsAt = tm.end; meta.datesFromRules = true; }
      // "2026.10.20 00:00:00 - 2026.10.27 23:59:59 (UTC+8)" — a dotted range the terms parser misses (audit 14.11: an
      // ended BingX promo showed as running); only the end matters here, read in the stated offset
      if (!p.endsAt) {
        const R = /(\d{4})[./](\d{1,2})[./](\d{1,2})[^\d]{0,4}(?:\d{1,2}:\d{2}(?::\d{2})?)?\s*[-–~]\s*(\d{4})[./](\d{1,2})[./](\d{1,2})\s*(\d{1,2}):(\d{2})(?::\d{2})?\s*[(（]?\s*UTC\s*([+-]\d{1,2})?/i;
        // the range is often split over two lines ("⏰ 2026.10.20 00:00:00 -" / "2026.10.27 23:59:59（UTC+8）")
        const r = d.blocks.slice(0, 40).map((b) => b.x).join(" ").match(R);
        if (r) {
          const end = Date.UTC(+r[4], +r[5] - 1, +r[6], +r[7], +r[8]) - (r[9] ? +r[9] * 3600_000 : 0);
          if (Number.isFinite(end) && end > Date.UTC(2020, 0, 1)) { p.endsAt = end; meta.datesFromRules = true; }
        }
      }
      // audit 23.11: month-name periods in Telegram posts ("📅 September 12–18 (UTC)", "Nov 20 – Dec 4", "until November 24")
      // left no end date, so ended promos stayed up (Phemex Deposit Week, Hotcoin, LBank). The year defaults to the post's.
      if (!p.endsAt && !p.evergreen) {
        const M = "[Jj]an|[Ff]eb|[Mm]ar|[Aa]pr|May|[Jj]un|[Jj]ul|[Aa]ug|[Ss]ept?|[Oo]ct|[Nn]ov|[Dd]ec";   // "May" capitalised only ("users may 1…")
        const mon = (s: string) => ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"].indexOf(s.slice(0, 3).toLowerCase());
        const txt = d.blocks.slice(0, 40).map((b) => b.x).join(" ");
        const y0 = new Date(p.publishedAt || now).getUTCFullYear();
        const range = txt.match(new RegExp(String.raw`\b(${M})[a-z]*\.? (\d{1,2})(?:st|nd|rd|th)?(?:,? (20\d\d))?(?:,? \d{1,2}:\d{2})?\s*(?:[-–~]|to|until|through)\s*(?:(${M})[a-z]*\.? )?(\d{1,2})(?:st|nd|rd|th)?(?:,? (20\d\d))?`))
          ?? txt.match(new RegExp(String.raw`\b(?:until|till|through|ends? on|ending)\s+()()()(${M})[a-z]*\.? (\d{1,2})(?:st|nd|rd|th)?(?:,? (20\d\d))?`));
        if (range) {
          const mEnd = mon(range[4] || range[1]), dEnd = +range[5], yEnd = +(range[6] || range[3] || y0);
          const end = Date.UTC(yEnd, mEnd, dEnd, 23, 59);
          if (mEnd >= 0 && dEnd >= 1 && dEnd <= 31 && Number.isFinite(end)) { p.endsAt = end; meta.datesFromRules = true; }
        }
      }
      // "PS5 Slim drop today" — a one-day drop ends the day after it was posted
      if (!p.endsAt && p.publishedAt && /\b(drop|giveaway|airdrop|flash)\b[^.]{0,30}\btoday\b|\btoday only\b/i.test(p.titleOrig ?? p.title)) {
        p.endsAt = Date.UTC(new Date(p.publishedAt).getUTCFullYear(), new Date(p.publishedAt).getUTCMonth(), new Date(p.publishedAt).getUTCDate() + 1, 23, 59);
        meta.datesFromRules = true;
      }
      // audit 19.11: a timeline of bare dates with no "period" line ("Subscription channel closes 2026-11-18") — when every
      // date in the rules is over a day old the campaign is over (a Bitget IPO challenge kept saying «Триває» after it closed)
      if (!p.endsAt && !p.evergreen) {
        const ds = [...d.blocks.slice(0, 60).map((b) => b.x).join(" ").matchAll(/\b(20\d\d)[./-](\d{1,2})[./-](\d{1,2})\b/g)]
          .map((m) => Date.UTC(+m[1], +m[2] - 1, +m[3])).filter((t) => Number.isFinite(t) && t > Date.UTC(2025, 0, 1));
        const last = ds.length >= 2 ? Math.max(...ds) : undefined;
        if (last !== undefined && last < now - 86400_000) { p.endsAt = last + 86400_000 - 1; meta.datesFromRules = true; }
      }
      // "Bitbase Points is live" with a start months ahead: the parser took the end / verification date as the start
      if (p.startsAt && p.startsAt > now && meta.datesFromRules && /\b(is (now )?live|now live|kicks? off|has (started|begun|launched)|is here|are live|is on)\b/i.test(p.titleOrig ?? p.title)) p.startsAt = undefined;
      if (tm.perUser) {
        const u = usdOf(tm.perUser, px);
        meta.perUser = { ...tm.perUser, usd: u !== undefined ? Math.round(u * 100) / 100 : undefined };
      }
      if (tm.minEntry) meta.minEntry = tm.minEntry;
      // calculator inputs: reward tiers, advertised APR, futures vs spot (fees)
      const tiers = tiersOf(d.blocks);
      if (tiers.length) meta.tiers = tiers;
      const apr = p.category === "earn" || /\bAPR|APY\b/.test(p.title) ? aprOf(p.title, d.blocks.map((b) => b.x)) : undefined;
      if (apr !== undefined && meta.apr === undefined) meta.aprPct = apr;
      // what is actually paid (cash / voucher / points), claim window, review & payout days — with the quoted sentences
      const po = payoutOf(d.blocks.map((b) => (b.t === "tr" ? (b.cells ?? []).join(" | ") : b.x)));
      if (po) meta.payout = po;
      if (/\b(futures|perps?|perpetual|contract|CFD)\b/i.test(`${p.title} ${tm.minEntry?.text ?? ""}`)) meta.futures = true;
      // a small headline amount someone "gets" is per person, not the pool ("Get $2 in WLFI" while the rules say
      // 60,000 WLFI in total): keep it as the per-person figure and look for the real pool in the rules (audit 12.11)
      const perPersonHeadline = !!p.reward && (p.reward.usd ?? Infinity) < 100 && /\b(get|receive|claim|earn|grab|enjoy)\s+(up to\s+)?\$?\s?\d/i.test(p.title);
      if (perPersonHeadline && p.reward) {
        meta.perUser ??= { amount: p.reward.amount, unit: p.reward.unit, usd: p.reward.usd, text: p.title };
        p.reward = undefined;
      }
      // the headline had no amount → take the prize pool from the rules ("Total prize pool: 10,000 USDT")
      if (!p.reward && p.category !== "farming") {
        const pool = poolOf([p.title, ...d.blocks.map((b) => b.x)]);
        // a "pool" 1,000x the per-person prize is another campaign's cross-promo in the rules (audit 14.11: a MENA demo
        // contest with 500 USDT prizes showed WSOT's 10M)
        const tooBig = !!pool && !!meta.perUser?.usd && /^(USD|USDT|USDC)$/.test(pool.unit) && pool.amount > 1000 * meta.perUser.usd;
        if (pool && !tooBig) p.reward = parseReward(pool.unit === "USD" ? `$${pool.amount.toLocaleString("en-US")}` : `${pool.amount.toLocaleString("en-US")} ${pool.unit}`);
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
    // audit 23.11: a KuCoin Australia page (/en-au/) was shown to everyone
    if (!geo.only && /\/(en-au|au)\//i.test(p.url)) geo.only = "AU";
    else if (!geo.only && /\/en-eu\//i.test(p.url)) geo.only = "EU";   // OKX EU deposit bonus (France, Italy, Spain…)
    if (geo.only || geo.noUA || geo.noEU) meta.geo = geo;
    if (/\b(new ?users?|newcomers?|new traders?|first[- ]time|welcome (offer|bonus|rewards?|gift)|sign[- ]?up bonus|newbies?|new to [A-Z])\b/i.test(p.title)
      || d?.facts.some((f) => f.k === "who" && /\bonly\b[^.]{0,40}\bnew\b|\bnew users? only\b/i.test(f.text))) meta.forNew = true;
    // (audit 14.11: a Toobit VIP draw needing 20,000 USDT of volume was pinned as "no deposit")
    const costs = /\b(trading volume|trade (at least|over|more than|a minimum)|volume of|cumulative (trading|futures)|net deposit|deposit (at least|of|a minimum)|minimum deposit|VIP\s?\d?|hold (at least|a minimum)|stake (at least|a minimum)|subscribe)\b/i;
    if (!meta.minEntry && /\b(quiz|learn|word of the day|register to (claim|get|win)|check[- ]?in|giveaway|lucky draw|free|no deposit|feedback|survey)\b/i.test(p.title)
      && !costs.test(p.title) && !/\b(trade|trading|swap|deposit|stake|buy)\b/i.test(p.titleOrig ?? p.title) && !(d?.blocks ?? []).slice(0, 80).some((b) => costs.test(b.x))) meta.noDeposit = true;
    const thin = !p.reward && !p.endsAt && !meta.perUser && !meta.minEntry && !(d && d.facts.length) && meta.apr === undefined && !p.evergreen;
    // pure teasers ("T-minus 24 hours until…", "coming soon") carry nothing to act on yet
    if (thin && /\b(t-?minus|coming soon|stay tuned|countdown|sneak peek|teaser|guess (what|the)|something (big|new) is coming)\b/i.test(p.title)) continue;
    if (thin) meta.thin = true;
    p.meta = Object.keys(meta).length ? meta : p.meta;
    promos.push(p);
  }
  // what one ordinary participant can really get (Claude reads the rules once per promo, then plain arithmetic) —
  // junk is dropped: not a promo at all, social-only tasks, < $30 per person, or surely < $10 net
  // newest real promos first: the first builds read up to VALUE_PER_BUILD of them
  const facts = await getAssessments([...promos].sort((a, b) => Number(!!a.meta?.thin) - Number(!!b.meta?.thin) || b.publishedAt - a.publishedAt), details).catch(() => ({} as Awaited<ReturnType<typeof getAssessments>>));
  const kept: Promo[] = [];
  // several Telegram posts about one campaign link to the same page (KuCoin 5.0 ×3, MEXC Pre-IPO ×2): keep the newest
  const seenUrl = new Set<string>(), dups = new Set<string>();
  for (const p of [...promos].sort((a, b) => b.publishedAt - a.publishedAt)) {
    let u = "";
    try { const x = new URL(p.url); u = x.pathname.length > 1 && x.host !== "t.me" ? `${p.venue.id}${x.host.replace(/^www\./, "")}${x.pathname.replace(/\/$/, "")}` : ""; } catch { /* keep */ }
    if (u && !p.sponsored && !p.evergreen) { if (seenUrl.has(u)) dups.add(p.id); else seenUrl.add(u); }
    // same venue + same tickers + same numbers in the headline = the same offer
    const head = p.titleOrig ?? p.title;
    const toks = [...new Set([...(head.match(/\$?\b[A-Z][A-Z0-9]{1,9}\b/g) ?? []).map((x) => x.replace("$", "")), ...(head.match(/\d+(?:[.,]\d+)?\s?%?/g) ?? []).map((x) => x.replace(/\s/g, ""))])].sort();
    const GENERIC = /^(APR|APY|USDT|USDC|USD|VIP|TGE|NEW|LIVE|UTC|KYC|AI|CEX|DEX|NFT|P2P|FAQ|AMA)$/;
    const sig = toks.some((x) => /\d/.test(x) && !/^20\d\d$/.test(x)) && toks.some((x) => /^[A-Z]/.test(x) && !GENERIC.test(x)) ? `${p.venue.id}|${p.category}|${toks.filter((x) => !/^20\d\d$/.test(x)).join(",")}` : "";
    if (sig && !p.sponsored && !p.evergreen && !dups.has(p.id)) { if (seenUrl.has(sig)) dups.add(p.id); else seenUrl.add(sig); }
    const lead = head.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, " ").trim().slice(0, 32);
    if (lead.length >= 24 && !p.sponsored && !p.evergreen && !dups.has(p.id)) { const k = `${p.venue.id}|lead|${lead}`; if (seenUrl.has(k)) dups.add(p.id); else seenUrl.add(k); }
    const tag = (head.match(/\b[A-Z][A-Z0-9]{2,9}\b/g) ?? []).find((x) => !GENERIC.test(x));
    const big = p.reward?.usd !== undefined && p.reward.usd >= 100_000 && tag ? `${p.venue.id}|${p.category}|${tag}|${Math.round(p.reward.usd)}` : "";
    if (big && !p.sponsored && !p.evergreen && !dups.has(p.id)) { if (seenUrl.has(big)) dups.add(p.id); else seenUrl.add(big); }
  }
  for (const p of promos) {
    if (dups.has(p.id)) continue;
    const handAdded = !!manualDetails[p.id] || MANUAL.some((m) => m.id === p.id);
    const a = facts[p.id];
    // audit 18.11: Claude read the full rules, the regexes only guessed from a sentence — its per-person cap and pool win
    // (OKX "up to 350K USDC in DeFi incentives" was a pool printed as "max per person", a 400 USDT prize as the pool)
    // for APR products `max` is the stake cap, not a reward; "% COMMISSION" / POINTS / XP are not money
    const coin = (x?: { amount: number; unit: string }) => !!x && x.amount > 0 && /^[A-Z][A-Z0-9]{0,9}$/i.test(x.unit) && !/^(POINTS?|XP|PTS)$/i.test(x.unit);
    if (a && !handAdded && p.category !== "farming") {
      const m = { ...(p.meta ?? {}) };
      const same = (x: { amount: number; unit: string }, y: { amount: number; unit: string }) => x.unit.toUpperCase() === y.unit.toUpperCase() && Math.abs(x.amount - y.amount) <= 0.01 * y.amount;
      const rewardCap = a.mech !== "apr" && a.mech !== "points" && coin(a.max) ? a.max : undefined;
      if (rewardCap && (!m.perUser || !same(m.perUser, rewardCap))) {
        const prize = a.mech === "top_n" || a.mech === "lucky_draw";
        m.perUser = { amount: rewardCap.amount, unit: rewardCap.unit, usd: usdOf(rewardCap, px), text: prize ? p.titleOrig ?? p.title : "" };
      } else if (!rewardCap && m.perUser && a.pool && m.perUser.unit.toUpperCase() === a.pool.unit.toUpperCase() && m.perUser.amount >= a.pool.amount * 0.99) {
        delete m.perUser;
      }
      if (coin(a.pool) && a.pool && (!p.reward || !same(p.reward, a.pool))) p.reward = { amount: a.pool.amount, unit: a.pool.unit, usd: usdOf(a.pool, px), label: `${compact(a.pool.amount)} ${a.pool.unit}` };
      p.meta = m;
    }
    const v = p.category === "farming" ? undefined : valueOf(p, a, px);
    if (v) p.meta = { ...(p.meta ?? {}), value: v };
    if (isZeroFee(p.titleOrig ?? p.title, details[p.id]?.blocks)) p.meta = { ...(p.meta ?? {}), zeroFee: true };
    // owner 16.11: nothing where one person can get under $15 at most — also competitions and promos the $30 rule
    // misses, referrals included; only zero-fee offers (the saving is the point) and APR products (no per-person cap) are exempt
    const maxPer = [v?.max, p.meta?.perUser?.usd].filter((x): x is number => x !== undefined);
    // owner 17.11: the per-person figure printed big on the card counts too ("2 USDT" with "up to 72 USDT" in the rules)
    const pu = p.meta?.perUser?.usd;
    const tiny = !p.sponsored && !handAdded && !p.meta?.zeroFee && v?.mech !== "apr" && ((maxPer.length > 0 && Math.max(...maxPer) < MIN_MAX_PER_USER_USD) || (pu !== undefined && pu < MIN_MAX_PER_USER_USD));
    // owner 17.11: the card's estimate line ("У середньому на учасника ≈ $X" — expected net for an ordinary participant)
    // under $15 hides the promo too, hand-added ones included; APR products (that line is "+$X on $1,000") and 0% fee
    // offers are exempt
    const lowEstimate = !p.sponsored && !p.meta?.zeroFee && v?.mech !== "apr" && v?.net !== undefined && v.gross !== undefined && v.net < MIN_MAX_PER_USER_USD;
    // owner 17.11: raffles go (lucky draws, giveaways, mystery boxes) — also from the "stack with" links under other cards;
    // 0% fee offers stay (the fee saving is the point, the draw is an extra)
    const raffle = !p.sponsored && !handAdded && !p.meta?.zeroFee && (v?.mech === "lucky_draw" || RAFFLE.test(p.titleOrig ?? p.title));
    const junk = junkReason(p, details[p.id]?.blocks, handAdded) ?? (raffle ? "raffle" : undefined) ?? (tiny || lowEstimate ? "small" : undefined) ?? (p.sponsored || handAdded || !v ? undefined : valueJunk(a, v));
    if (junk) { hidden.push({ id: p.id, venue: p.venue.name, title: p.title, url: p.url, why: junk, perUserUsd: p.meta?.perUser?.usd, netUsd: v?.net }); continue; }
    kept.push(p);
  }
  promos.splice(0, promos.length, ...kept);
  // what the junk filter hid this build (data branch → reviewable history)
  try { if (fs.existsSync(path.join(process.cwd(), "data"))) fs.writeFileSync(path.join(process.cwd(), "data", "hidden-promos.json"), JSON.stringify({ at: now, items: hidden }, null, 1)); } catch { /* read-only */ }
  // translations (DeepL Free, cached in data/translations.json) — most visible texts first, full rules last
  const texts: string[] = [];
  for (const p of promos) if (!p.id.startsWith("llama:")) texts.push(p.title);
  for (const p of promos) {
    const d = details[p.id];
    if (p.meta?.perUser) texts.push(p.meta.perUser.text);
    if (p.meta?.minEntry) texts.push(p.meta.minEntry.text);
    if (p.meta?.actions) texts.push(p.meta.actions);
    if (p.meta?.geo?.text) texts.push(p.meta.geo.text);
    if (p.meta?.payout) texts.push(...p.meta.payout.quotes);
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
