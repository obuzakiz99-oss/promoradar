import { recordLive } from "./archive";
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
    // weekly audit 26.11: button / UI words the translators leave in English, and literal slips
    [/\bJoin [Nn]ow\b/g, "Долучитися"], [/\bSubscribe and receive\b/g, "Підпишіться й отримайте"], [/\bLucky Draw\b/g, "розіграш"],
    [/(^|[\s(«"])Rewards(?=[\s:»".,)]|$)/g, "$1Нагороди"], [/\bBuy the Dip\b/g, "«Купуй на просіданні»"], [/\bpending\b/g, "в очікуванні"],
    [/\bReal-Time APR\b/g, "APR у реальному часі"], [/\bFast Exit\b/g, "швидкий вихід"], [/\bStandard Exit\b/g, "звичайний вихід"],
    [/ваш вихід/g, "ваш хід"], [/ВАШ ВИХІД/g, "ВАШ ХІД"], [/Добавка вітається/g, "Повторні друзі теж рахуються"], [/&amp;/g, "&"],
  ] : [[/Дорогие сотрудники Binance/g, "Уважаемые пользователи Binance"], [/\bJoin [Nn]ow\b/g, "Присоединиться"], [/\bLucky Draw\b/g, "розыгрыш"], [/&amp;/g, "&"]];
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
      publishedAt: s.from ? new Date(s.from).getTime() : now, startsAt: s.from ? new Date(s.from).getTime() : undefined,
      // audit 23.11: a standing programme has no end — `until` is only our monthly re-check date, not a countdown
      endsAt: s.standing ? undefined : new Date(s.until).getTime(), evergreen: s.standing || undefined,
      reward: s.reward ? parseReward(s.reward) : undefined, tags: [],
      meta: { source: `${venueOf(s.venue).name} · ${s.checked.split("-").reverse().join(".")}`, ...(s.standing ? { standing: true } : {}), ...(s.perUser ? { perUser: { ...s.perUser, usd: s.perUser.unit === "USD" ? s.perUser.amount : undefined, text: s.rules?.find((r) => /place|prize/i.test(r)) ?? "" } } : {}) },
    } satisfies Promo;
  });
  const all = [...sponsored, ...manual, ...data.promos];
  // full rules from the exchanges' own announcements (cached across builds in data/details.json)
  const details: Record<string, PromoDetails> = { ...(await getDetails(all.filter((p) => !manualDetails[p.id])).catch(() => ({}))), ...manualDetails };
  const px = await prices().then((x) => x.px).catch(() => ({} as Record<string, number>));
  const promos: Promo[] = [];
  const hidden: Array<{ id: string; venue: string; title: string; url: string; why: JunkReason | "news" | "region" | "duplicate" | "ended" | "ended-text" | "upgraded" | "teaser"; of?: string; perUserUsd?: number; netUsd?: number }> = [];
  for (const p of all) {
    // links scraped from HTML / Telegram keep "&amp;" — the second parameter (inviteCode, rcode…) was lost (audit 14.11)
    // audit 22.11: links copied from Telegram can be plain http (WhiteBIT) — exchanges all serve https
    p.url = p.url.replace(/&amp;/g, "&").replace(/^http:\/\//i, "https://");
    if (p.joinUrl) p.joinUrl = p.joinUrl.replace(/&amp;/g, "&");
    // audit 25.11 (deep): links come straight from exchange feeds — only https web links are ever printed (no data:, javascript:)
    const safe = (u: string | undefined) => { try { return !!u && new URL(u).protocol === "https:"; } catch { return false; } };
    if (!safe(p.url)) p.url = VENUES[p.venue.id]?.site ?? `https://t.me/s/${p.id.replace(/^tg:/, "")}`;
    if (p.joinUrl && !safe(p.joinUrl)) p.joinUrl = undefined;
    // the venue registry is the source of logos (audit 14.11: one Phemex card had the logo, its twin a monogram)
    if (!p.venue.logo && VENUES[p.venue.id]?.logo) p.venue = { ...p.venue, logo: venueOf(p.venue.id).logo };
    // the pool in dollars when it is announced in a coin ("12.5M NIGHT ≈ $579K"): cards, sorting by size and the
    // exchange rating then see coin pools too (audit 12.11)
    if (p.reward && p.reward.usd === undefined && px[p.reward.unit.toUpperCase()]) p.reward = { ...p.reward, usd: Math.round(p.reward.amount * px[p.reward.unit.toUpperCase()]) };
    // audit 23.11 (round 5): Gate "Unlock Mystery Boxes with $1" showed "Винагорода $1" / "фонд на всіх $1" — a sum under $5 is an
    // entry price, never a promo's reward
    if (p.reward?.usd !== undefined && p.reward.usd < 5) p.reward = undefined;
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
        // audit 23.11 (round 5): the end time is optional ("2026/10/31 00:00 – 2026/12/01 (UTC+8)" → end of that day) and
        // KuCoin's US-style "10/28/2026 08:00 ~ 11/27/2026 15:59:59 (UTC)" is read too
        const R = /(\d{4})[./-](\d{1,2})[./-](\d{1,2})[^\d]{0,4}(?:\d{1,2}:\d{2}(?::\d{2})?)?\s*[-–~]\s*(\d{4})[./-](\d{1,2})[./-](\d{1,2})\s*(?:(\d{1,2}):(\d{2})(?::\d{2})?)?\s*[(（]?\s*(?:UTC|GMT)\s*([+-]\d{1,2})?/i;
        const US = /(\d{1,2})\/(\d{1,2})\/(\d{4})[^\d]{0,4}(?:\d{1,2}:\d{2}(?::\d{2})?)?\s*[-–~]\s*(\d{1,2})\/(\d{1,2})\/(\d{4})\s*(?:(\d{1,2}):(\d{2})(?::\d{2})?)?\s*[(（]?\s*(?:UTC|GMT)\s*([+-]\d{1,2})?/i;
        // the range is often split over two lines ("⏰ 2026.10.20 00:00:00 -" / "2026.10.27 23:59:59（UTC+8）")
        const txt0 = d.blocks.slice(0, 40).map((b) => b.x).join(" ");
        const r = txt0.match(R), u = r ? null : txt0.match(US);
        const e = r ? { y: +r[4], m: +r[5], d: +r[6], h: r[7], mi: r[8], tz: r[9] } : u ? { y: +u[6], m: +u[4], d: +u[5], h: u[7], mi: u[8], tz: u[9] } : null;
        if (e && e.m >= 1 && e.m <= 12) {
          const end = Date.UTC(e.y, e.m - 1, e.d, e.h ? +e.h : 23, e.mi ? +e.mi : 59) - (e.tz ? +e.tz * 3600_000 : 0);
          if (Number.isFinite(end) && end > Date.UTC(2020, 0, 1)) { p.endsAt = end; meta.datesFromRules = true; }
        }
      }
      // audit 23.11: month-name periods in Telegram posts ("📅 September 12–18 (UTC)", "Nov 20 – Dec 4", "until November 24")
      // left no end date, so ended promos stayed up (Phemex Deposit Week, Hotcoin, LBank). The year defaults to the post's.
      // audit 23.11: Bybit's feed end (30.11) was the listing end, the rules said "Nov 3 – Dec 7" — a later rules end wins there
      if ((!p.endsAt || p.venue.id === "bybit") && !p.evergreen) {
        const M = "[Jj]an|[Ff]eb|[Mm]ar|[Aa]pr|May|[Jj]un|[Jj]ul|[Aa]ug|[Ss]ept?|[Oo]ct|[Nn]ov|[Dd]ec";   // "May" capitalised only ("users may 1…")
        const mon = (s: string) => ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"].indexOf(s.slice(0, 3).toLowerCase());
        // audit 25.11: the title counts too ("Canton Carnival: final week — Ends Nov 30, 18:00 (UTC+8)")
        const txt = [p.titleOrig ?? p.title, ...d.blocks.slice(0, 40).map((b) => b.x)].join(" ");
        const y0 = new Date(p.publishedAt || now).getUTCFullYear();
        const range = txt.match(new RegExp(String.raw`\b(${M})[a-z]*\.? (\d{1,2})(?:st|nd|rd|th)?(?:,? (20\d\d))?(?:,? \d{1,2}:\d{2})?\s*(?:[-–—~～]|to|until|through)\s*(?:(${M})[a-z]*\.? )?(\d{1,2})(?:st|nd|rd|th)?(?:,? (20\d\d))?`))
          ?? txt.match(new RegExp(String.raw`\b(?:until|till|through|[Ee]nds?(?: on)?|[Ee]nding(?: on)?)\s+()()()(${M})[a-z]*\.? (\d{1,2})(?:st|nd|rd|th)?(?:,? (20\d\d))?`));
        // weekly audit 26.11: the end time and the offset count ("Dec 8, 14:00 (UTC+8)" showed 08:00 UTC instead of 06:00),
        // and a verification / payout period is not the campaign end (Bitbase "May 5 to May 18" verification)
        const at = range ? (range.index ?? 0) : 0;
        const nearBefore = range ? txt.slice(Math.max(0, at - 80), at) : "";
        if (range && !/\b(verification|verify|distribut\w*|payout|settlement|credited|claim period|review)\b[^.]{0,60}$/i.test(nearBefore)) {
          const mEnd = mon(range[4] || range[1]), dEnd = +range[5], yEnd = +(range[6] || range[3] || y0);
          const after = txt.slice(at + range[0].length, at + range[0].length + 60);
          const tm = after.match(/^,?\s*(?:at\s*)?(\d{1,2}):(\d{2})(?::\d{2})?\s*(AM|PM)?/i);
          const off = (after + " " + txt.slice(Math.max(0, at - 40), at)).match(/(?:UTC|GMT)\s*([+-]\d{1,2})/i);
          let h = tm ? +tm[1] : 23; const mi = tm ? +tm[2] : 59;
          if (tm?.[3]) h = (h % 12) + (/pm/i.test(tm[3]) ? 12 : 0);
          const end = Date.UTC(yEnd, mEnd, dEnd, h, mi) - (off ? +off[1] * 3600_000 : 0);
          if (mEnd >= 0 && dEnd >= 1 && dEnd <= 31 && Number.isFinite(end) && (!p.endsAt || end > p.endsAt)) { p.endsAt = end; meta.datesFromRules = true; }
        }
      }
      // audit 23.11: BTSE "… closes tomorrow" had no end date, so it could never expire on the site
      if (!p.endsAt && p.publishedAt && !p.evergreen) {
        const head = [p.titleOrig ?? p.title, ...d.blocks.slice(0, 4).map((b) => b.x)].join(" ");
        const when = /\b(closes?|ends?|ending|finish(es)?|last day( is)?)\s+(tomorrow|today|tonight)\b|\b(tomorrow|today) is the last day\b/i.exec(head);
        if (when) {
          const pub = new Date(p.publishedAt), plus = /tomorrow/i.test(when[0]) ? 1 : 0;
          p.endsAt = Date.UTC(pub.getUTCFullYear(), pub.getUTCMonth(), pub.getUTCDate() + plus, 23, 59);
          meta.datesFromRules = true;
        }
      }
      // "PS5 Slim drop today" — a one-day drop ends the day after it was posted
      if (!p.endsAt && p.publishedAt && /\b(drop|giveaway|airdrop|flash)\b[^.]{0,30}\btoday\b|\btoday only\b/i.test(p.titleOrig ?? p.title)) {
        p.endsAt = Date.UTC(new Date(p.publishedAt).getUTCFullYear(), new Date(p.publishedAt).getUTCMonth(), new Date(p.publishedAt).getUTCDate() + 1, 23, 59);
        meta.datesFromRules = true;
      }
      // "Last 5 days to enjoy up to 7% APR" (KuCoin KCUSD, audit 23.11) — ends N days after the post
      // audit 25.11: also "7 days left in Referral Rush", "⏰ Only 14 days" in the first lines, "final week", "this week"
      const head5 = [p.titleOrig ?? p.title, ...d.blocks.slice(0, 6).map((b) => b.x)].join(" ");
      const lastN = head5.match(/\b(?:last|final|only) (\d{1,2}) days?\b|\b(\d{1,2}) days? (?:left|remaining|to go)\b/i);
      const weekN = /\b(?:final|last|this) week\b/i.test(p.titleOrig ?? p.title);
      const nDays = lastN ? +(lastN[1] ?? lastN[2]) : weekN ? 7 : 0;
      if (!p.endsAt && p.publishedAt && nDays > 0) { p.endsAt = p.publishedAt + nDays * 86400_000; meta.datesFromRules = true; }
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
      // audit 23.11: "Earn Up to 1,000 USDT Extra" (Bybit MENA VIP) is what one person can get, not a shared pool —
      // the page said «фонд 1 000 USDT»
      if (!meta.perUser && p.reward && /\b(earn|get|receive|claim) up to\b[^.|]{0,30}\b(extra|bonus|each|per (user|person))\b|\bup to [\d,.]+ ?[A-Z]{2,6} (extra|each|per (user|person))\b/i.test(p.titleOrig ?? p.title)) {
        meta.perUser = { amount: p.reward.amount, unit: p.reward.unit, usd: p.reward.usd, text: "" };
        p.reward = undefined;
      }
      if (tm.minEntry) meta.minEntry = tm.minEntry;
      // calculator inputs: reward tiers, advertised APR, futures vs spot (fees)
      // audit 23.11 (round 5): Bitget Rewards Center — "50 USDT … 300,000 USDT or more of futures trading volume" read as free
      // money (cost 0): the smallest volume named for futures / spot is a fee the participant pays
      {
        const vols = (re: RegExp) => d.blocks.slice(0, 80).flatMap((b) => [...b.x.matchAll(re)]).map((x) => Number((x[1] || x[2]).replace(/,/g, ""))).filter((n) => n >= 100 && n < 1e9);
        const fut = vols(/([\d,]{3,})\s*(?:USDT|USD|USDC)?\s*(?:or more |and above )?(?:of |in )?(?:cumulative )?futures trading volume|futures trading volume (?:of |reaches )?(?:at least |≥\s*|over )?\$?([\d,]{3,})/gi);
        const spot = vols(/([\d,]{3,})\s*(?:USDT|USD|USDC)?\s*(?:or more |and above )?(?:of |in )?(?:cumulative )?spot trading volume|spot trading volume (?:of |reaches )?(?:at least |≥\s*|over )?\$?([\d,]{3,})/gi);
        if (fut.length || spot.length) meta.needVol = { futures: fut.length ? Math.min(...fut) : undefined, spot: spot.length ? Math.min(...spot) : undefined };
      }
      const tiers = tiersOf(d.blocks);
      if (tiers.length) meta.tiers = tiers;
      const apr = p.category === "earn" || /\bAPR|APY\b/.test(p.title) ? aprOf(p.title, d.blocks.map((b) => b.x)) : undefined;
      if (apr !== undefined && meta.apr === undefined) meta.aprPct = apr;
      // audit 25.11 (deep): Binance Yield Arena "up to 27% APR" was BERA's variable rate — USDT got 10.3% on the first 1,000.
      // The rate a stablecoin gets in the rules (a table row or a sentence naming USDT/USDC next to a %) is what $1,000 earns.
      if (meta.aprPct !== undefined) {
        const rows = d.blocks.slice(0, 80).map((b) => (b.t === "tr" ? (b.cells ?? []).join(" | ") : b.x));
        // (audit 2: only a rate — "min 100 USDT, 0.5% redemption fee" turned a SOL estimate into ≈ $0)
        const st = rows.filter((x) => /\b(APR|APY|rate|interest|yield)\b/i.test(x) && !/\b(fee|commission|penalty)\b/i.test(x))
          .flatMap((x) => [...x.matchAll(/\b(USDT|USDC|USD1|FDUSD)\b[^%\n]{0,50}?(\d{1,3}(?:\.\d+)?)\s?%|(\d{1,3}(?:\.\d+)?)\s?%[^%\n]{0,30}?\b(USDT|USDC|USD1|FDUSD)\b/g)])
          .map((x) => Number(x[2] ?? x[3])).filter((n) => n > 0 && n <= 100);
        if (st.length && Math.max(...st) < meta.aprPct) meta.aprStable = Math.max(...st);
      }
      // audit 23.11 (round 5): MEXC "up to 20% APR" (base 5%), KuCoin Dual "up to 250%" were calculated as flat rates
      if (meta.aprPct !== undefined && /\bup to\b[^.%]{0,25}\d+(\.\d+)?\s?%|\bmax(imum)?\b[^.%]{0,15}\d+(\.\d+)?\s?%/i.test(p.titleOrig ?? p.title)) meta.aprUpTo = true;
      // audit 23.11: OKX "8% APR paid over 3 months" was counted only until the promo's end (17 days)
      const over = (p.titleOrig ?? p.title).match(/\bpaid over (\d{1,2}) (month|week|day)s?\b/i);
      if (over && meta.aprPct !== undefined) meta.aprDays = +over[1] * ({ month: 30, week: 7, day: 1 } as Record<string, number>)[over[2].toLowerCase()];
      // what is actually paid (cash / voucher / points), claim window, review & payout days — with the quoted sentences
      const po = payoutOf(d.blocks.map((b) => (b.t === "tr" ? (b.cells ?? []).join(" | ") : b.x)));
      if (po) meta.payout = po;
      // audit 2: rewards paid as vouchers / coupons / futures bonuses are named in the rules, not the headline
      if (!po || po.form === undefined) {
        const rew = d.blocks.slice(0, 60).map((b) => b.x).join(" ");
        if (/\b(reward|prize|receive|get|earn|win)\w*\b[^.]{0,60}\b(vouchers?|coupons?|futures bonus|super bonus|trial funds?|bonus funds?)\b/i.test(rew) && !/\b(apr|apy|rate[- ]up|interest|yield)\s+(boost\s+)?coupons?\b/i.test(rew)) meta.voucherish = true;
      }
      if (/\b(futures|perps?|perpetual|contract|CFD)\b/i.test(`${p.title} ${tm.minEntry?.text ?? ""}`)) meta.futures = true;
      // a small headline amount someone "gets" is per person, not the pool ("Get $2 in WLFI" while the rules say
      // 60,000 WLFI in total): keep it as the per-person figure and look for the real pool in the rules (audit 12.11)
      // 25.11: "Get up to 800 USDT in rewards!" (BingX, the pool was 200,000) — "get/earn up to X" is what one person gets,
      // up to a few thousand dollars, unless the headline itself calls it a pool / a share / a total
      const head0 = p.meta?.rawTitle ?? p.titleOrig ?? p.title;
      const getUpTo = /\b(get|receive|claim|earn|grab|enjoy|unlock)\s+up to\s+\$?\s?\d/i.test(head0) && !/\b(pool|share|total|in rewards pool|prize pool|split)\b/i.test(head0);
      const perPersonHeadline = !!p.reward && (((p.reward.usd ?? Infinity) < 100 && /\b(get|receive|claim|earn|grab|enjoy)\s+(up to\s+)?\$?\s?\d/i.test(head0)) || (getUpTo && (p.reward.usd ?? Infinity) <= 5000));
      if (perPersonHeadline && p.reward) {
        meta.perUser ??= { amount: p.reward.amount, unit: p.reward.unit, usd: p.reward.usd, text: p.title };
        p.reward = undefined;
      }
      // the headline had no amount → take the prize pool from the rules ("Total prize pool: 10,000 USDT")
      if (!p.reward && p.category !== "farming") {
        // (audit 26.11: Binance Appreciation — a schedule row "Reward Period: 11-10 to 11-20 · Share 30.36 million WLFI" is one
        // period's slice, not the campaign's pool)
        const pool = poolOf([p.title, ...d.blocks.filter((b) => !(b.t === "tr" && /^(reward |distribution |snapshot )?(period|week|day|round|phase|batch)\b/i.test(b.x))).map((b) => b.x)]);
        // a "pool" 1,000x the per-person prize is another campaign's cross-promo in the rules (audit 14.11: a MENA demo
        // contest with 500 USDT prizes showed WSOT's 10M)
        const tooBig = !!pool && !!meta.perUser?.usd && /^(USD|USDT|USDC)$/.test(pool.unit) && pool.amount > 1000 * meta.perUser.usd;
        if (pool && !tooBig) p.reward = parseReward(pool.unit === "USD" ? `$${pool.amount.toLocaleString("en-US")}` : `${pool.amount.toLocaleString("en-US")} ${pool.unit}`);
      }
      p.meta = meta;
    }
    if (p.endsAt && p.endsAt < now) { hidden.push({ id: p.id, venue: p.venue.name, title: p.title, url: p.url, why: "ended", of: p.endsAt ? new Date(p.endsAt).toISOString().slice(0, 16) : undefined }); continue; }          // the rules say it has already ended
    // closed early: exchanges put an "UPDATE: this campaign has ended early" line at the top of the rules
    const ENDED = /\b(has ended( early)?|ended early|campaign (is )?(now )?(closed|over|concluded)|has (been )?(concluded|terminated|suspended))\b/i;
    if (d && d.blocks.slice(0, 8).some((b) => b.x.split(/(?<=[.!])\s+/).some((s) => ENDED.test(s) && !/\b(will|if|once|after)\b/i.test(s)))) { hidden.push({ id: p.id, venue: p.venue.name, title: p.title, url: p.url, why: "ended-text", of: p.endsAt ? new Date(p.endsAt).toISOString().slice(0, 16) : undefined }); continue; }
    // audit 25.11 (deep): "This Campaign has been upgraded … Please refer to the most recent … announcement" — the old page of a
    // replaced campaign (the new page also says "has been upgraded", but never sends you elsewhere)
    if (d && d.blocks.slice(0, 8).some((b) => /has been upgraded/i.test(b.x) && /\brefer to the (most recent|latest|new)\b/i.test(b.x))) { hidden.push({ id: p.id, venue: p.venue.name, title: p.title, url: p.url, why: "upgraded", of: p.endsAt ? new Date(p.endsAt).toISOString().slice(0, 16) : undefined }); continue; }
    // region / audience / effort flags for the filters
    const meta = { ...(p.meta ?? {}) };
    // audit 26.11: Binance "Community 3rd Appreciation Campaign" says nothing in its title — the rules open with
    // "hold USD1 … enjoy up to 15% APR": a holding / APR offer is Earn
    if (p.category === "other" && d && d.blocks.slice(0, 6).some((b) => /\b(enjoy|earn|get) up to [\d.]+\s?% (apr|apy)\b/i.test(b.x)) && d.blocks.slice(0, 8).some((b) => /\b(hold|holding|subscribe|stake)\b/i.test(b.x))
      && !/\b(fee|fees|loss|taker|maker)\b/i.test(p.titleOrig ?? p.title)) p.category = "earn";
    // weekly audit 26.11: BingX daily "buy the dip" tasks (/activity/task/) were filed as a ranking contest
    if (p.category === "competition" && /\/(activity\/task|task-?center|tasks?)\b/i.test(p.url) && !/\b(rank|leaderboard|top \d+|competition|tournament)\b/i.test(p.meta?.rawTitle ?? p.titleOrig ?? p.title)) p.category = "bonus";
    const geo = geoOf(p.title, d);
    // audit 23.11: a KuCoin Australia page (/en-au/) was shown to everyone
    if (!geo.only && /\/(en-au|au)\//i.test(p.url)) geo.only = "AU";
    else if (!geo.only && /\/en-eu\//i.test(p.url)) geo.only = "EU";   // OKX EU deposit bonus (France, Italy, Spain…)
    if (geo.only || geo.noUA || geo.noEU) meta.geo = geo;
    // audit 24.11 (owner: "роби все"): promos only for regions a Ukrainian/European reader can't join (Brazil, LATAM,
    // South Asia, Africa, Kenya, MENA, SEA, Australia…) or that exclude Ukraine are hidden, not just labelled
    // audit 24.11: 46 % of cards had no end date and stayed up for the full 30 days (MEXC Alpha Quest 03.11, Bitrue Halloween
    // airdrop…). With no date in the post AND none in the rules, a Telegram / announcement post is shown for 10 days.
    if (!p.endsAt && !p.evergreen && !p.sponsored && !MANUAL.some((m) => m.id === p.id) && p.category !== "farming" && p.publishedAt && now - p.publishedAt > 10 * 86400_000) {
      hidden.push({ id: p.id, venue: p.venue.name, title: p.title, url: p.url, why: "news" }); continue;
    }
    // "BDT & PKR Exclusive" (Bitget) — a local-currency exclusive is a regional promo too
    const localFiat = /\b(BDT|PKR|INR|NGN|KES|GHS|BRL|ARS|MXN|COP|IDR|VND|PHP|THB|TRY|EGP|ZAR|AED|SAR)\b[^.:|]{0,20}\bexclusive\b/i.test(p.titleOrig ?? p.title);
    if (!p.sponsored && (localFiat || geo.noUA || (geo.only && !/^(EU|EEA|Europe|CEE|CIS|CIS & CEE|Ukraine)$/i.test(geo.only)))) {
      hidden.push({ id: p.id, venue: p.venue.name, title: p.title, url: p.url, why: "region" }); continue;
    }
    if (/\b(new ?users?|newcomers?|new traders?|first[- ]time|welcome (offer|bonus|rewards?|gift)|sign[- ]?up bonus|newbies?|new to [A-Z]\w*)\b/i.test(p.meta?.rawTitle ?? p.titleOrig ?? p.title)
      || d?.facts.some((f) => f.k === "who" && /\bonly\b[^.]{0,40}\bnew\b|\bnew users? only\b/i.test(f.text) && !/\bonly the first [\d,.]+\s*(k|m)?\s*(new|[A-Z])/i.test(f.text))   // "only the first 50,000 new USDT per user" is a cap (26.11)
      // audit 25.11 (deep): "only for users who have never used XT Earn", "new futures users only" sat in the rules, not the title
      || (d?.blocks ?? []).slice(0, 25).some((b) => /\bnew (futures |spot |earn )?users? only\b|\bonly (for |available to |open to )?new (futures |spot )?(users|traders|customers)\b|\bexclusive(ly)? (for|to) new (users|traders)\b|\b(users|those) who have never (used|traded|deposited|registered)\b/i.test(b.x)
        // weekly audit 26.11: HTX MAPO — "Events 1–2: new users only" is one part of a campaign open to everyone
        && !/\b(event|task|part|activity|section|phase|bonus|reward) ?(\d|[ivx]+\b|one|two|three)/i.test(b.x))) meta.forNew = true;
    // audit 23.11 (round 5): "Хто може: усі користувачі" for Kenyan P2P merchants, new VIPs, Anthropic IPO subscribers
    // (audit 2: + VVIP, broker referral codes, taker / market-share programmes, IPO subscribers)
    const AUD = /\b(P2P )?merchants?\b|\bV?VIP ?\d*\+?\s*(users|clients|members)?\b|\bbroker (referral )?code\b|\btaker program(me)?\b|\b(volume|market) share\b|\bexclusive to [A-Z][\w ]{0,30}subscribers\b|\b(selected|invited|whitelisted|verified and selected|designated) (users|participants|clients)\b|\b(subscribers?|participants) (of|in) (the )?[A-Z]|\bwho (have )?(subscribed|participated|registered) (to|in|for) (the )?[A-Z]|\bKOLs?\b|\baffiliates? only\b/i;
    if (!meta.forNew && (AUD.test(p.titleOrig ?? p.title) || d?.facts.some((f) => f.k === "who" && /\b(only|exclusive(ly)?|eligible|open to|limited to)\b/i.test(f.text) && AUD.test(f.text))
      // audit 25.11 (deep): KuCoin "only for users bound to the ChartControl broker code"
      || (d?.blocks ?? []).slice(0, 25).some((b) => /\b(broker code|bound to (the )?broker|via (the )?[A-Z]\w+ broker|API (users|partners) only|institutional (users|clients) only)\b/i.test(b.x)))) meta.audience = true;
    // (audit 14.11: a Toobit VIP draw needing 20,000 USDT of volume was pinned as "no deposit")
    const costs = /\b(trading volume|trade (at least|over|more than|a minimum)|volume of|cumulative (trading|futures)|net deposit|deposit (at least|of|a minimum)|minimum deposit|VIP\s?\d?|hold (at least|a minimum)|stake (at least|a minimum)|subscribe)\b/i;
    // audit 23.11 (beginner persona): HTX NVDA "free airdrop" needs a stock-token trade, a referral needs the friend to act —
    // both were tagged "Без вкладень"
    const mustAct = /\b(must|need to|required to|have to) (trade|deposit|buy|stake|subscribe|hold)\b|\b(complete|make) (a|any|one|your first|at least one) (trade|deposit|purchase|swap)\b|\bfirst (trade|deposit|purchase)\b|\b(trade|buy|swap) (any|eligible|designated|selected)\b/i;
    if (!meta.minEntry && p.category !== "referral" && /\b(quiz|learn|word of the day|register to (claim|get|win)|check[- ]?in|giveaway|lucky draw|free|no deposit|feedback|survey)\b/i.test(p.title)
      && !costs.test(p.title) && !/\b(trade|trading|swap|deposit|stake|buy)\b/i.test(p.titleOrig ?? p.title) && !(d?.blocks ?? []).slice(0, 80).some((b) => costs.test(b.x) || mustAct.test(b.x))) meta.noDeposit = true;
    const thin = !p.reward && !p.endsAt && !meta.perUser && !meta.minEntry && !(d && d.facts.length) && meta.apr === undefined && !p.evergreen;
    // pure teasers ("T-minus 24 hours until…", "coming soon") carry nothing to act on yet
    // audit 2 (25.11): teasers with numbers were shown live with estimates (Ourbit "XP Arena Is Coming" — starts Dec 2,
    // Bitbase "Coming Soon", Bitrue "starts tomorrow… stay tuned") — hidden until the start post comes
    const head1 = p.meta?.rawTitle ?? p.titleOrig ?? p.title;
    const teaser = /\b(t-?minus|coming soon|stay tuned|countdown|sneak peek|teaser|guess (what|the)|something (big|new) is coming|is coming|are coming|starts tomorrow|launching soon)\b/i.test(head1);
    if ((thin || teaser) && (teaser || /\b(t-?minus|coming soon|stay tuned|countdown|sneak peek|teaser|guess (what|the)|something (big|new) is coming)\b/i.test(p.title)) && !(p.startsAt && p.startsAt <= now)) { hidden.push({ id: p.id, venue: p.venue.name, title: p.title, url: p.url, why: "teaser", of: p.endsAt ? new Date(p.endsAt).toISOString().slice(0, 16) : undefined }); continue; }
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
  const seenUrl = new Map<string, string>(), dups = new Set<string>(), twin = new Map<string, { id: string; rule: string }>(), poolSeen = new Map<string, { t: number; tg: boolean; id: string; end?: number }>();
  // audit 25.11 (deep): every hidden duplicate records its twin and the rule (data/hidden-promos.json) — 3 promos vanished
  // with no visible twin because the twin was later hidden as junk; such a duplicate now stands in for its twin
  const dupOf = (id: string, k: string, other?: string) => { dups.add(id); twin.set(id, { id: other ?? seenUrl.get(k) ?? "?", rule: k.split("|")[1] ?? "url" }); };
  const linkUse = new Map<string, number>();
  for (const p of promos) if (p.meta?.linkKey) { const k = `${p.venue.id}|${p.meta.linkKey}`; linkUse.set(k, (linkUse.get(k) ?? 0) + 1); }
  for (const p of [...promos].sort((a, b) => b.publishedAt - a.publishedAt)) {
    let u = "";
    // (lower case: the Telegram linkKey is lower-cased — Bitrue "/land/Bitrue-Thanksgiving-Month" missed its twin)
    try { const x = new URL(p.url); u = x.pathname.length > 1 && x.host !== "t.me" ? `${p.venue.id}${x.host.replace(/^www\./, "")}${x.pathname.replace(/\/$/, "")}`.toLowerCase() : ""; } catch { /* keep */ }
    // a general section page (one path segment, no id: Bitrue /flexible-staking, LBank /futures-earn) is shared by many
    // different promos — never a duplicate key; a campaign page (/flexible-staking/xrp, /pointmall/10003934-…) is
    try { const pn = new URL(p.url).pathname; if (/^\/[a-z-]+\/?$/i.test(pn) || /\/rewards\/mobile|\/download|channel-verification/i.test(pn)) u = ""; } catch { /* */ }
    if (u && !p.sponsored && !p.evergreen) { if (seenUrl.has(u)) dupOf(p.id, u); else seenUrl.set(u, p.id); }
    // audit 25.11 (deep): Toobit 6188 + 6156 (same bit.ly), CoinW TradFi phase 4 twice — the campaign link inside the post.
    // Only a campaign-like link counts, and never one most posts of the channel carry (Bitrue puts /rewards/mobile in
    // every post — the first version merged 8 different Bitrue promos)
    const lkRaw = p.meta?.linkKey;
    const lkOk = !!lkRaw && (linkUse.get(`${p.venue.id}|${lkRaw}`) ?? 0) <= 4
      && (/^(bit\.ly|tinyurl\.com|t\.co|rb\.gy|shorturl\.at|s\.[a-z]+\.com)\//.test(lkRaw) || /\/(land|event|events|campaigns?|activity|activities|promo|competition|rank|topic|launchhub|act)\b/.test(lkRaw));
    const lk = lkOk ? `${p.venue.id}|link|${lkRaw}` : "";
    if (lk && !p.sponsored && !dups.has(p.id)) { if (seenUrl.has(lk)) dupOf(p.id, lk); else seenUrl.set(lk, p.id); }
    // the site's own page and a Telegram post about it point to the same article path
    if (lk && !dups.has(p.id)) { const own = `${p.venue.id}${lkRaw!.replace(/\/$/, "")}`; const o = seenUrl.get(own); if (o && o !== p.id) dupOf(p.id, `${p.venue.id}|own|`, o); }
    // the same prize pool (≥ 1,000) on the exchange's site and in its Telegram within a week = one campaign (Bitget Super Earn)
    const poolKey = p.reward && p.reward.amount >= 1000 ? `${p.venue.id}|${p.category}|pool|${Math.round(p.reward.amount)}|${p.reward.unit.toUpperCase()}` : "";
    if (poolKey && !p.sponsored && !p.evergreen && !dups.has(p.id)) {
      const prev = poolSeen.get(poolKey), tg = p.id.startsWith("tg:");
      if (prev && prev.tg !== tg && prev.t - p.publishedAt < 7 * 86400_000) dupOf(p.id, poolKey, prev.id); else if (!prev) poolSeen.set(poolKey, { t: p.publishedAt, tg, id: p.id });
    }
    // same venue + same tickers + same numbers in the headline = the same offer
    const head = p.titleOrig ?? p.title;
    const toks = [...new Set([...(head.match(/\$?\b[A-Z][A-Z0-9]{1,9}\b/g) ?? []).map((x) => x.replace("$", "")), ...(head.match(/\d+(?:[.,]\d+)?\s?%?/g) ?? []).map((x) => x.replace(/\s/g, ""))])].sort();
    const GENERIC = /^(APR|APY|USDT|USDC|USD|VIP|TGE|NEW|LIVE|UTC|KYC|AI|CEX|DEX|NFT|P2P|FAQ|AMA)$/;
    const sig = toks.some((x) => /\d/.test(x) && !/^20\d\d$/.test(x)) && toks.some((x) => /^[A-Z]/.test(x) && !GENERIC.test(x)) ? `${p.venue.id}|${p.category}|${toks.filter((x) => !/^20\d\d$/.test(x)).join(",")}` : "";
    if (sig && !p.sponsored && !p.evergreen && !dups.has(p.id)) { if (seenUrl.has(sig)) dupOf(p.id, sig); else seenUrl.set(sig, p.id); }
    const lead = head.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, " ").trim().slice(0, 32);
    if (lead.length >= 24 && !p.sponsored && !p.evergreen && !dups.has(p.id)) { const k = `${p.venue.id}|lead|${lead}`; if (seenUrl.has(k)) dupOf(p.id, k); else seenUrl.set(k, p.id); }
    // audit 24.11: 8 near-identical "Biconomy.com Earn – DHN, GBCK, ATS & MTC Locked Products" cards — one per venue (the newest)
    // audit 2 (25.11): one named event posted twice (CoinW "TradFi Campaign Phase 4", Bitget "Super Earn Festival", MEXC
    // "Futures Earn" ×2 — one card $0, the other +$12): the event's own name, within two weeks
    const ev = (p.meta?.rawTitle ?? head).match(/\b((?:[A-Z][\w×&'-]*\s+){0,3})(Festival|Carnival|Fest|Campaign|Futures Earn|Super Earn|Championship|League)\b(?:\s+(?:Phase|Season|S)\s?(\d+))?/);
    // the exchange's own name in front ("CoinW TradFi Campaign" vs "TradFi Campaign") is not part of the event's name
    const evName = ev ? ev[1].trim().toLowerCase().split(/\s+/).filter((w) => w && w !== p.venue.name.toLowerCase() && w !== p.venue.id).join(" ") : "";
    const evKey = ev && (evName || /earn/i.test(ev[2])) ? `${p.venue.id}|event|${evName} ${ev[2].toLowerCase()}${ev[3] ? ` ${ev[3]}` : ""}` : "";
    if (evKey && !p.sponsored && !p.evergreen && !dups.has(p.id)) {
      const prev = poolSeen.get(evKey);
      // (audit 26.11: Bitget "Super Earn Festival" 09.11 page + 25.11 "Only 2 Weeks Left!" post — 16 days apart, one end date)
      const sameEnd = !!prev?.end && !!p.endsAt && Math.abs(prev.end - p.endsAt) < 36 * 3600_000 && prev.t - p.publishedAt < 45 * 86400_000;
      if (prev && (prev.t - p.publishedAt < 14 * 86400_000 || sameEnd)) dupOf(p.id, evKey, prev.id); else if (!prev) poolSeen.set(evKey, { t: p.publishedAt, tg: p.id.startsWith("tg:"), id: p.id, end: p.endsAt });
    }
    const series = /^[\w.]+ Earn\s*[–—-]\s*.{0,60}\b(Locked|Flexible|Fixed) Products?\b/i.test(head) ? `${p.venue.id}|series|earn-products` : "";
    if (series && !dups.has(p.id)) { if (seenUrl.has(series)) dupOf(p.id, series); else seenUrl.set(series, p.id); }
    const tag = (head.match(/\b[A-Z][A-Z0-9]{2,9}\b/g) ?? []).find((x) => !GENERIC.test(x));
    const big = p.reward?.usd !== undefined && p.reward.usd >= 100_000 && tag ? `${p.venue.id}|${p.category}|${tag}|${Math.round(p.reward.usd)}` : "";
    if (big && !p.sponsored && !p.evergreen && !dups.has(p.id)) { if (seenUrl.has(big)) dupOf(p.id, big); else seenUrl.set(big, p.id); }
  }
  const consider = (p: Promo) => {
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
    // audit 25.11 (deep): Biconomy "up to 23,000 USDT" per-user ladders were printed as the pool too ("фонд 23.1K") — a pool
    // within 10 % of what one person can get is that person's cap, not a shared pool
    if (p.reward && p.meta?.perUser && p.reward.unit.toUpperCase() === p.meta.perUser.unit.toUpperCase() && p.meta.perUser.amount >= p.reward.amount * 0.9 && !p.sponsored) {
      p.reward = undefined;
    }
    const v = p.category === "farming" ? undefined : valueOf(p, a, px);
    if (v) p.meta = { ...(p.meta ?? {}), value: v };
    if (isZeroFee(p.titleOrig ?? p.title, details[p.id]?.blocks)) p.meta = { ...(p.meta ?? {}), zeroFee: true };
    // owner 16.11: nothing where one person can get under $15 at most — also competitions and promos the $30 rule
    // misses, referrals included; only zero-fee offers (the saving is the point) and APR products (no per-person cap) are exempt
    const maxPer = [v?.max, p.meta?.perUser?.usd].filter((x): x is number => x !== undefined);
    // owner 17.11: the per-person figure printed big on the card counts too ("2 USDT" with "up to 72 USDT" in the rules)
    const pu = p.meta?.perUser?.usd;
    // audit 24.11: a "0 fees" line somewhere in the rules let a MEXC lucky draw ($0.08) and a KCEX $0.10 promo through —
    // only an offer whose headline IS the fee cut is exempt from the small / raffle checks
    const feeOffer = !!p.meta?.zeroFee && isZeroFee(p.titleOrig ?? p.title, undefined);
    const tiny = !p.sponsored && !handAdded && !feeOffer && v?.mech !== "apr" && ((maxPer.length > 0 && Math.max(...maxPer) < MIN_MAX_PER_USER_USD) || (pu !== undefined && pu < MIN_MAX_PER_USER_USD));
    // owner 17.11: the card's estimate line ("У середньому на учасника ≈ $X" — expected net for an ordinary participant)
    // under $15 hides the promo too, hand-added ones included; APR products (that line is "+$X on $1,000") and 0% fee
    // offers are exempt
    const lowEstimate = !p.sponsored && !feeOffer && v?.mech !== "apr" && v?.net !== undefined && v.gross !== undefined && v.net < MIN_MAX_PER_USER_USD;
    // owner 17.11: raffles go (lucky draws, giveaways, mystery boxes) — also from the "stack with" links under other cards;
    // 0% fee offers stay (the fee saving is the point, the draw is an extra)
    // audit 24.11: KuCoin PROOF 550K (a futures contest with a lucky-draw side event, ≈$64 per participant) was read as
    // lucky_draw and hidden — a contest/competition headline with a real per-person estimate is not a raffle
    const contest = /\b(competition|contest|championship|challenge|tournament|leaderboard|league|win (your|a) share)\b/i.test(p.titleOrig ?? p.title) && (v?.net ?? 0) >= MIN_MAX_PER_USER_USD;
    const raffle = !p.sponsored && !handAdded && !feeOffer && ((v?.mech === "lucky_draw" && !contest) || RAFFLE.test(p.titleOrig ?? p.title));
    const junk = junkReason(p, details[p.id]?.blocks, handAdded) ?? (raffle ? "raffle" : undefined) ?? (tiny || lowEstimate ? "small" : undefined) ?? (p.sponsored || handAdded || !v ? undefined : valueJunk(a, v));
    if (junk) { hidden.push({ id: p.id, venue: p.venue.name, title: p.title, url: p.url, why: junk, perUserUsd: p.meta?.perUser?.usd, netUsd: v?.net }); return; }
    kept.push(p);
  };
  const later: Promo[] = [];
  for (const p of promos) { if (dups.has(p.id)) later.push(p); else consider(p); }
  // the same campaign is already on the site through another post (LBank $150K: 3 posts, the first twin was junk)
  const pathOf = (u: string) => { try { const x = new URL(u); return /^\/[a-z-]+\/?$/i.test(x.pathname) ? "" : x.host.replace(/^www\./, "") + x.pathname.replace(/\/$/, ""); } catch { return ""; } };
  const onSite = (p: Promo) => kept.some((k) => k.venue.id === p.venue.id && (
    (!!p.meta?.linkKey && k.meta?.linkKey === p.meta.linkKey) || (!!pathOf(p.url) && pathOf(k.url) === pathOf(p.url))
    || (!!p.reward && !!k.reward && p.reward.amount >= 1000 && k.reward.amount === p.reward.amount && k.reward.unit === p.reward.unit)));
  // audit 2: one stand-in per campaign — follow the twin chain to its root (B and C duplicates of junk A: only one shows),
  // newest first so the result doesn't depend on the order of the list
  const rootOf = (id: string) => { let r = id; for (let i = 0; i < 10 && twin.has(r); i++) r = twin.get(r)!.id; return r; };
  const stoodIn = new Set<string>();
  later.sort((a, b) => b.publishedAt - a.publishedAt);
  for (const p of later) {
    const tw = twin.get(p.id);
    const root = rootOf(p.id);
    if (tw && root !== p.id && !kept.some((k) => k.id === root) && !stoodIn.has(root) && !onSite(p)) {
      const n = kept.length; consider(p);
      if (kept.length > n) { stoodIn.add(root); continue; }   // its twin was hidden as junk — this one stands in
      continue;                                               // hidden by consider() itself (junk too)
    }
    hidden.push({ id: p.id, venue: p.venue.name, title: p.title, url: p.url, why: "duplicate", of: tw ? `${tw.id} (${tw.rule})` : undefined });
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
  recordLive(promos, i18n);
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
