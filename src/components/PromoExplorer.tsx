"use client";
import { useEffect, useMemo, useState } from "react";
import type { Category, Promo, Venue, VenueKind } from "@/lib/types";
import type { Dict, Locale } from "@/lib/i18n";
import { PromoCard, CAT_STYLE } from "./PromoCard";
import { PROX } from "@/lib/i18n-pro";
import { VenueLogo } from "./VenueLogo";
import { Select } from "./Select";
import { useSaved } from "./SaveButton";
import { combosFor } from "@/lib/combos";
import { clearHidden, useHidden } from "./HideButton";
import { statusOf, type Status } from "@/lib/slug";

type Sort = "newest" | "ending" | "biggest" | "perUser" | "minEntry";
type Country = "any" | "ua" | "eu";
type Quick = "noDeposit" | "low" | "forNew" | "cash";

const GX: Record<Locale, {
  country: string; any: string; ua: string; eu: string; hidden: (n: number) => string;
  quick: Record<Quick, string>; perUser: string; minEntry: string;
}> = {
  uk: { country: "Країна", any: "Будь-яка", ua: "Україна", eu: "ЄС", hidden: (n) => `Сховано ${n} акцій лише для інших регіонів або з обмеженням для вашої країни`, quick: { noDeposit: "Без вкладень", low: "Поріг до $100", forNew: "Для нових", cash: "Тільки живі гроші" }, perUser: "Більше на 1 людину", minEntry: "Найменший поріг" },
  en: { country: "Country", any: "Any", ua: "Ukraine", eu: "EU", hidden: (n) => `${n} promos hidden: other regions only or restricted for your country`, quick: { noDeposit: "No deposit", low: "Entry under $100", forNew: "New users", cash: "Real money only" }, perUser: "Most per person", minEntry: "Lowest entry" },
  ru: { country: "Страна", any: "Любая", ua: "Украина", eu: "ЕС", hidden: (n) => `Скрыто ${n} акций только для других регионов или с ограничением для вашей страны`, quick: { noDeposit: "Без вложений", low: "Порог до $100", forNew: "Для новых", cash: "Только живые деньги" }, perUser: "Больше на 1 человека", minEntry: "Наименьший порог" },
};

/** Regions whose "exclusive" promos may include each country (CEE/CIS lists usually include Ukraine). */
const OK_FOR: Record<Exclude<Country, "any">, RegExp> = { ua: /^(CEE|CIS.*|Europe|Ukraine|region)$/i, eu: /^(CEE|CIS & CEE|Europe|EEA|region)$/i };
export function geoAllowed(p: Promo, c: Country): boolean {
  const g = p.meta?.geo;
  if (!g || c === "any") return true;
  if (c === "ua" && g.noUA) return false;
  if (c === "eu" && g.noEU) return false;
  return !g.only || OK_FOR[c].test(g.only);
}
type Kind = VenueKind | "all" | "saved" | "hidden";
const STATUSES: Array<Status | "all"> = ["all", "live", "upcoming", "ending"];
const CATS: Category[] = ["airdrop", "competition", "bonus", "earn", "farming", "listing", "referral", "other"];
const KINDS: Kind[] = ["all", "cex", "dex", "defi", "airdrop"];
const SORTS: Sort[] = ["newest", "ending", "biggest", "perUser", "minEntry"];
const QUICKS: Quick[] = ["noDeposit", "low", "forNew", "cash"];
const FILTER_KEYS = ["kind", "status", "cat", "sort", "venue", "quick", "q"];
const FIRST = 9;   // cards shown before "show more" (user: keep the overview short)
const PAGE = 24;  // cards added per "show more"
const VENUE_CHIPS = 9;
const HID: Record<Locale, { n: (n: number) => string; show: string; hideAgain: string; reset: string }> = {
  uk: { n: (n) => `Ви приховали: ${n}`, show: "показати", hideAgain: "знову сховати", reset: "повернути всі" },
  en: { n: (n) => `You hid ${n}`, show: "show them", hideAgain: "hide again", reset: "restore all" },
  ru: { n: (n) => `Вы скрыли: ${n}`, show: "показать", hideAgain: "снова скрыть", reset: "вернуть все" },
};
const FILT: Record<Locale, string> = { uk: "Фільтри", en: "Filters", ru: "Фильтры" };
const HID_TAB: Record<Locale, string> = { uk: "Приховані", en: "Hidden", ru: "Скрытые" };

/** Search synonyms: what people type → words that appear in titles (original English and machine translations). */
const SYN: Array<[RegExp, string[]]> = [
  [/^(а[іий]рдроп|ейрдроп|аирдроп|airdrop)/, ["airdrop", "айрдроп", "аірдроп", "аирдроп", "роздач", "раздач"]],
  [/^(розіграш|розыгрыш|giveaway|lucky)/, ["giveaway", "lucky draw", "розіграш", "розыгрыш", "лотере"]],
  [/^(бонус|bonus)/, ["bonus", "бонус", "voucher", "ваучер"]],
  [/^(стейк|staking|stake)/, ["stak", "стейк", "earn", "launchpool"]],
  [/^(реферал|referral|запро|пригла)/, ["referral", "реферал", "invite", "запро", "пригла"]],
  [/^(змаган|соревн|competition|турнір|турнир)/, ["competition", "tournament", "challenge", "змаган", "турнір", "челендж", "соревн"]],
  [/^(лістинг|листинг|listing)/, ["listing", "лістинг", "листинг"]],
  [/^(новач|новичк|new user)/, ["new user", "newcomer", "новач", "нових користувач", "новых пользоват"]],
];

/** Smallest known money needed: 0 for no-deposit promos, unknown last. */
// rules say the reward is withdrawable coins (fully or partly); APR / farming interest is paid in the coin itself
const isCash = (p: Promo) => p.meta?.payout?.form === "cash" || p.meta?.payout?.form === "mixed";
const entry = (p: Promo) => (p.meta?.noDeposit ? 0 : p.meta?.minEntry?.amount ?? Infinity);
const value = (p: Promo) => p.reward?.usd ?? (p.meta?.apr !== undefined ? p.meta.apr * 100 : -1);

export function PromoExplorer({ promos: initial, t, lang, serverNow, showKinds = true, src, pinned = [] }: { promos: Promo[]; t: Dict; lang: Locale; serverNow: number; showKinds?: boolean; src?: string; pinned?: Array<{ id: string; tag: string; cls: string }> }) {
  // the home page ships only the first cards in its HTML; the full list (for filters and "show more") comes from the
  // cached JSON feed right after the page appears — the page is several times lighter on phones
  const [promos, setPromos] = useState(initial);
  useEffect(() => {
    if (!src) return;
    let alive = true;
    fetch(src).then((r) => r.json()).then((j: { promos: Promo[]; titles?: Record<string, Record<string, string>> }) => {
      if (!alive || !Array.isArray(j.promos)) return;
      const tr = j.titles?.[lang] ?? {};
      setPromos(j.promos.map((p) => (tr[p.id] ? { ...p, title: tr[p.id], titleOrig: p.title } : p)));
    }).catch(() => { /* keep the first cards */ });
    return () => { alive = false; };
  }, [src, lang]);
  const [now, setNow] = useState(serverNow);
  const saved = useSaved();
  const [kind, setKind] = useState<Kind>("all");
  const [status, setStatus] = useState<Status | "all">("all");
  const [cat, setCat] = useState<Category | "all">("all");
  const [venues, setVenues] = useState<Set<string>>(new Set());
  const [allVenues, setAllVenues] = useState(false);
  const [q, setQ] = useState("");
  const [sort, setSort] = useState<Sort>("newest");
  const [limit, setLimit] = useState(FIRST);
  const G = GX[lang];
  const [country, setCountryS] = useState<Country>(lang === "uk" ? "ua" : "any");
  const [quick, setQuick] = useState<Set<Quick>>(new Set());
  useEffect(() => { try { const c = localStorage.getItem("pr:country"); if (c === "any" || c === "ua" || c === "eu") setCountryS(c); } catch { /* blocked */ } }, []);
  const setCountry = (c: Country) => { setCountryS(c); try { localStorage.setItem("pr:country", c); } catch { /* blocked */ } };
  const [panel, setPanel] = useState(false);
  const activeN = Number(kind !== "all") + Number(status !== "all") + Number(venues.size > 0) + quick.size;
  const toggleQuick = (k: Quick) => setQuick((s) => { const n = new Set(s); n.has(k) ? n.delete(k) : n.add(k); return n; });

  useEffect(() => {
    setNow(Date.now());
    const id = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(id);
  }, []);
  useEffect(() => setLimit(FIRST), [kind, cat, venues, q, sort, status, country, quick]);

  // Filters live in the URL (shareable: ?cat=bonus&venue=bybit&quick=noDeposit) and are remembered per page between
  // visits. A link with filters wins over the remembered ones; the first run only reads, so nothing is written on load.
  const [restored, setRestored] = useState(false);
  useEffect(() => {
    let src = new URLSearchParams(location.search);
    const key = `pr:filters:${location.pathname}`;
    if (![...src.keys()].some((k) => FILTER_KEYS.includes(k))) { try { src = new URLSearchParams(localStorage.getItem(key) ?? ""); } catch { /* blocked */ } }
    const one = <T extends string>(k: string, ok: readonly T[]) => { const v = src.get(k); return v && (ok as readonly string[]).includes(v) ? (v as T) : undefined; };
    const many = (k: string) => (src.get(k) ?? "").split(",").map((x) => x.trim()).filter(Boolean);
    const k = one("kind", [...KINDS, "saved", "hidden"] as Kind[]); if (k && showKinds) setKind(k);
    const st = one("status", STATUSES); if (st) setStatus(st);
    const c = one("cat", CATS); if (c) setCat(c);
    const so = one("sort", SORTS); if (so) setSort(so);
    const v = many("venue"); if (v.length) setVenues(new Set(v));
    const qk = many("quick").filter((x): x is Quick => (QUICKS as readonly string[]).includes(x)); if (qk.length) setQuick(new Set(qk));
    const qq = src.get("q"); if (qq) setQ(qq.slice(0, 80));
    setRestored(true);
  }, [showKinds]);
  useEffect(() => {
    if (!restored) return;
    const u = new URLSearchParams(location.search);
    FILTER_KEYS.forEach((k) => u.delete(k));
    const f = new URLSearchParams();
    if (kind !== "all") f.set("kind", kind);
    if (status !== "all") f.set("status", status);
    if (cat !== "all") f.set("cat", cat);
    if (sort !== "newest") f.set("sort", sort);
    if (venues.size) f.set("venue", [...venues].join(","));
    if (quick.size) f.set("quick", [...quick].join(","));
    if (q.trim()) f.set("q", q.trim());
    f.forEach((v, k) => u.set(k, v));
    const qs = u.toString();
    history.replaceState(history.state, "", `${location.pathname}${qs ? `?${qs}` : ""}${location.hash}`);
    try { localStorage.setItem(`pr:filters:${location.pathname}`, f.toString()); } catch { /* blocked */ }
  }, [restored, kind, status, cat, sort, venues, quick, q]);

  // "since your last visit": the previous visit time is frozen for this browser session, the new one saved for next time
  const [since, setSince] = useState<number | null>(null);
  useEffect(() => {
    try {
      let s = sessionStorage.getItem("pr:since");
      if (s === null) { s = localStorage.getItem("pr:lastVisit") ?? "0"; sessionStorage.setItem("pr:since", s); localStorage.setItem("pr:lastVisit", String(Date.now())); }
      if (Number(s) > 0) setSince(Number(s));
    } catch { /* storage blocked */ }
  }, []);
  const freshCount = useMemo(() => (since ? promos.filter((p) => p.publishedAt > since).length : 0), [promos, since]);

  // tab counts follow the country / quick filters, so the numbers match the cards shown
  const quickOk = (p: Promo) => (!quick.has("noDeposit") || !!p.meta?.noDeposit)
    && (!quick.has("low") || (p.meta?.minEntry !== undefined && p.meta.minEntry.amount < 100) || !!p.meta?.noDeposit)
    && (!quick.has("forNew") || !!p.meta?.forNew)
    && (!quick.has("cash") || isCash(p));
  // promos the reader hid with the eye button stay out of the feed (but not out of "Saved"), unless they ask to see them
  const hiddenIds = useHidden();
  const kindCounts = useMemo(() => {
    const all = promos.filter((p) => geoAllowed(p, country) && quickOk(p));
    const vis = all.filter((p) => !hiddenIds.includes(p.id));
    const c: Record<string, number> = { all: vis.length, saved: all.filter((p) => saved.includes(p.id)).length, hidden: all.filter((p) => hiddenIds.includes(p.id)).length };
    vis.forEach((p) => (c[p.venue.kind] = (c[p.venue.kind] ?? 0) + 1));
    return c;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [promos, saved, hiddenIds, country, quick]);
  const [showHidden, setShowHidden] = useState(false);
  const geoAll = useMemo(() => promos.filter((p) => geoAllowed(p, country)), [promos, country]);
  const geoHidden = promos.length - geoAll.length;
  const userHidden = geoAll.filter((p) => hiddenIds.includes(p.id)).length;
  // how many other live promos each one stacks with (same exchange, same action, same time)
  const combos = useMemo(() => new Map(promos.map((p) => [p.id, combosFor(p, promos, serverNow)])), [promos, serverNow]);
  const geoOk = useMemo(() => (showHidden || kind === "saved" || kind === "hidden" ? geoAll : geoAll.filter((p) => !hiddenIds.includes(p.id))), [geoAll, hiddenIds, showHidden, kind]);
  const byKind = useMemo(
    () => geoOk.filter((p) => (kind === "all" || (kind === "saved" ? saved.includes(p.id) : kind === "hidden" ? hiddenIds.includes(p.id) : p.venue.kind === kind)) && (status === "all" || statusOf(p, now) === status)
      && (!quick.has("noDeposit") || !!p.meta?.noDeposit)
      && (!quick.has("low") || (p.meta?.minEntry !== undefined && p.meta.minEntry.amount < 100) || !!p.meta?.noDeposit)
      && (!quick.has("forNew") || !!p.meta?.forNew)
      && (!quick.has("cash") || isCash(p))),
    [geoOk, kind, saved, hiddenIds, status, now, quick],
  );

  const venueList = useMemo(() => {
    const m = new Map<string, { v: Venue; n: number }>();
    byKind.forEach((p) => { if (p.venue.kind === "airdrop") return; const e = m.get(p.venue.id); e ? e.n++ : m.set(p.venue.id, { v: p.venue, n: 1 }); });
    return [...m.values()].sort((a, b) => b.n - a.n);
  }, [byKind]);

  const base = useMemo(() => {
    const s = q.trim().toLowerCase();
    // the same word in Ukrainian / Russian / English spellings ("аірдроп" finds "айрдроп" and "airdrop")
    const alts = s ? [s, ...SYN.filter(([re]) => re.test(s)).flatMap(([, words]) => words)] : [];
    return byKind.filter((p) => {
      if (venues.size && !venues.has(p.venue.id)) return false;
      if (!s) return true;
      const hay = `${p.title} ${p.titleOrig ?? ""} ${p.venue.name} ${t.cat[p.category]} ${p.category} ${p.reward?.unit ?? ""} ${p.meta?.chain ?? ""} ${p.meta?.actions ?? ""}`.toLowerCase();
      return alts.some((a) => hay.includes(a));
    });
  }, [byKind, venues, q, t]);

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: base.length };
    base.forEach((p) => (c[p.category] = (c[p.category] ?? 0) + 1));
    return c;
  }, [base]);

  const list = useMemo(() => {
    const l = base.filter((p) => cat === "all" || p.category === cat);
    const sponsored = l.filter((p) => p.sponsored);
    const rest = l.filter((p) => !p.sponsored);
    if (sort === "newest") rest.sort((a, b) => b.publishedAt - a.publishedAt || value(b) - value(a));
    if (sort === "ending") rest.sort((a, b) => (a.endsAt ?? Infinity) - (b.endsAt ?? Infinity) || b.publishedAt - a.publishedAt);
    if (sort === "biggest") rest.sort((a, b) => value(b) - value(a));
    if (sort === "perUser") rest.sort((a, b) => (b.meta?.perUser?.usd ?? -1) - (a.meta?.perUser?.usd ?? -1) || value(b) - value(a));
    if (sort === "minEntry") rest.sort((a, b) => entry(a) - entry(b) || b.publishedAt - a.publishedAt);
    // teaser-like posts (no amount, no dates, no rules yet) go after everything else
    const full = rest.filter((p) => !p.meta?.thin), thin = rest.filter((p) => p.meta?.thin);
    const out = [...sponsored, ...full, ...thin];
    // today's top 3 lead the untouched list (no search, filters or other sort)
    if (pinned.length && sort === "newest" && cat === "all" && !q && !venues.size && kind === "all" && status === "all" && !quick.size) {
      const ids = new Set(pinned.map((x) => x.id));
      const top = pinned.map((x) => out.find((p) => p.id === x.id)).filter((p): p is Promo => !!p);
      return [...top, ...out.filter((p) => !ids.has(p.id))];
    }
    return out;
  }, [base, cat, sort, pinned, q, venues, kind, status, quick]);
  const pinOf = useMemo(() => new Map(pinned.map((x) => [x.id, x])), [pinned]);

  const toggleVenue = (id: string) => setVenues((s) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const dirty = kind !== "all" || cat !== "all" || venues.size > 0 || q !== "" || sort !== "newest" || status !== "all" || quick.size > 0;
  const shownVenues = allVenues ? venueList : venueList.slice(0, VENUE_CHIPS);

  return (
    <div>
      {/* toolbar */}
      {/* phones: search + one row of sort / filters, sticky only from sm up (it used to take ~190px of a phone screen) */}
      <div className="z-30 -mx-4 mt-4 border-b border-line/60 bg-bg/85 px-4 py-3 backdrop-blur-xl sm:sticky sm:top-16 sm:-mx-6 sm:px-6">
        <div className="flex flex-wrap items-center gap-2 lg:flex-nowrap lg:gap-3">
          <label className="relative w-full lg:w-auto lg:max-w-sm lg:flex-1">
            <span className="sr-only">{t.filters.search}</span>
            <svg className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-ink-3" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true"><path fillRule="evenodd" d="M9 3.5a5.5 5.5 0 1 0 3.4 9.83l3.64 3.63a.75.75 0 1 0 1.06-1.06l-3.63-3.64A5.5 5.5 0 0 0 9 3.5ZM5 9a4 4 0 1 1 8 0 4 4 0 0 1-8 0Z" clipRule="evenodd" /></svg>
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder={t.filters.search}
              className="h-11 w-full rounded-xl border border-line bg-white/[0.03] pl-10 pr-9 text-sm font-medium text-ink placeholder:text-ink-3 focus:border-lime/50 focus:outline-none"
            />
            {q && <button onClick={() => setQ("")} className="absolute right-2 top-1/2 grid size-7 -translate-y-1/2 place-items-center rounded-lg text-ink-3 hover:bg-white/5 hover:text-ink" aria-label={t.filters.reset}>✕</button>}
          </label>
          <div className="min-w-0 flex-1 sm:w-56 sm:flex-none lg:ml-auto">
            <Select label={t.filters.sort} value={sort} onChange={setSort} align="right"
              className="h-11 rounded-xl border border-line bg-surface pl-3 pr-2.5 text-sm font-bold text-ink"
              options={(["newest", "ending", "biggest", "perUser", "minEntry"] as Sort[]).map((s) => ({ value: s, label: s === "perUser" ? G.perUser : s === "minEntry" ? G.minEntry : t.filters[s] }))} />
          </div>
          <button type="button" onClick={() => setPanel((x) => !x)} aria-expanded={panel}
            className={`h-11 shrink-0 rounded-xl border px-4 text-sm font-bold ${panel || activeN ? "border-lime/60 bg-lime/10 text-ink" : "border-line bg-white/[0.03] text-ink-2 hover:text-ink"}`}>
            {FILT[lang]}{activeN ? ` (${activeN})` : ""} <span className="text-ink-3">{panel ? "▴" : "▾"}</span>
          </button>
        </div>

        <div className="scroll-x -mx-1 mt-3 flex gap-2 px-1 md:flex-wrap" role="tablist" aria-label="Category">
          <button className="chip" data-on={cat === "all"} onClick={() => setCat("all")} role="tab" aria-selected={cat === "all"}>
            {t.filters.all} <span className="chip-count">{counts.all ?? 0}</span>
          </button>
          {CATS.filter((c) => counts[c]).map((c) => (
            <button key={c} className="chip" data-on={cat === c} onClick={() => setCat(c)} role="tab" aria-selected={cat === c}>
              <span className="size-2 rounded-full" style={{ background: CAT_STYLE[c].dot }} />
              {t.cat[c]} <span className="chip-count">{counts[c]}</span>
            </button>
          ))}
          {dirty && (
            <button className="chip ml-auto border-dashed" onClick={() => { setKind("all"); setCat("all"); setVenues(new Set()); setQ(""); setSort("newest"); setStatus("all"); setQuick(new Set()); }}>
              ✕ {t.filters.reset}
            </button>
          )}
        </div>
      </div>

      {/* everything else folds under "Filters (N)" — two rows stay visible (audit 08.11) */}
      {panel && <div className="mt-4 flex flex-wrap items-center gap-2 rounded-2xl border border-line bg-white/[0.02] p-3">
        {/* kind tabs */}
        <div className="flex w-full flex-col gap-2 sm:flex-row sm:items-center">
          <div className="scroll-x flex gap-1 rounded-2xl border border-line bg-white/[0.02] p-1 sm:w-fit" role="tablist" aria-label="Type">
            {[...(showKinds ? KINDS.filter((k) => k === "all" || kindCounts[k]) : (["all"] as Kind[])), ...(["saved", "hidden"] as Kind[]).filter((k) => kindCounts[k] || kind === k)].map((k) => (
              <button
                key={k}
                role="tab"
                aria-selected={kind === k}
                onClick={() => { setKind(k); setVenues(new Set()); setCat("all"); }}
                className={`flex h-10 shrink-0 items-center gap-2 rounded-xl px-4 text-sm font-bold transition-colors ${kind === k ? (k === "saved" ? "bg-amber text-on-accent" : k === "hidden" ? "bg-white/15 text-ink" : "bg-lime text-on-accent") : "text-ink-2 hover:bg-white/5 hover:text-ink"}`}
              >
                {k === "saved" ? <>★ {t.saved.tab}</> : k === "hidden" ? HID_TAB[lang] : t.kinds[k as Exclude<Kind, "saved" | "hidden">]}
                <span className={`font-mono text-xs ${kind === k && k !== "hidden" ? "text-black/60" : "text-ink-3"}`}>{kindCounts[k] ?? 0}</span>
              </button>
            ))}
          </div>
          <div className="sm:ml-auto sm:min-w-44">
            <Select label={t.status.all} value={status} onChange={setStatus} align="right"
              className="h-10 rounded-xl border border-line bg-surface pl-4 pr-3 text-sm font-bold text-ink"
              options={STATUSES.map((s) => ({ value: s, label: s === "all" ? t.status.all : t.status[s] }))} />
          </div>
        </div>
  
  
      {venueList.length > 1 && (
        <details className="group relative w-fit">
          <summary className={`flex h-11 cursor-pointer list-none items-center gap-2 rounded-xl border px-3 text-[13px] sm:h-9 font-bold [&::-webkit-details-marker]:hidden ${venues.size ? "border-lime/60 bg-lime/10 text-ink" : "border-line bg-white/[0.02] text-ink-2 hover:text-ink"}`}>
            {t.filters.venues}
            {venues.size > 0 && <span className="flex -space-x-1.5">{venueList.filter(({ v }) => venues.has(v.id)).slice(0, 5).map(({ v }) => <VenueLogo key={v.id} v={v} size={20} rounded="rounded-md" />)}</span>}
            {venues.size > 0 && <span className="font-mono text-xs text-lime">{venues.size}</span>}
            <span className="text-ink-3 transition-transform group-open:rotate-180">▾</span>
          </summary>
          <div className="absolute left-0 top-11 z-30 grid w-[min(36rem,calc(100vw-2rem))] grid-cols-2 gap-1.5 rounded-2xl border border-line-2 bg-surface p-2 shadow-2xl sm:grid-cols-3" role="group" aria-label={t.filters.venues}>
            {venueList.map(({ v, n }) => (
              <button key={v.id} type="button" onClick={() => toggleVenue(v.id)} aria-pressed={venues.has(v.id)}
                className={`flex min-h-9 items-center gap-2 rounded-xl border py-1 pl-1.5 pr-3 text-left text-[13px] font-bold leading-tight transition-all ${venues.has(v.id) ? "border-lime/60 bg-lime/10 text-ink" : "border-transparent text-ink-2 hover:bg-white/5 hover:text-ink"}`}>
                <VenueLogo v={v} size={22} rounded="rounded-lg" />
                <span className="min-w-0 break-words">{v.name}</span>
                <span className="ml-auto font-mono text-xs text-ink-3">{n}</span>
              </button>
            ))}
          </div>
        </details>
      )}
        <Select label={G.country} title={G.country} value={country} onChange={setCountry}
          className={`h-11 rounded-xl border pl-3 pr-2.5 text-[13px] font-bold sm:h-9 ${country !== "any" ? "border-lime/60 bg-lime/10 text-ink" : "border-line bg-surface text-ink-2"}`}
          options={(["any", "ua", "eu"] as Country[]).map((c) => ({ value: c, label: G[c] }))} />
        {(["noDeposit", "low", "forNew", "cash"] as Quick[]).map((k) => (
          <button key={k} type="button" onClick={() => toggleQuick(k)} aria-pressed={quick.has(k)}
            className={`h-11 rounded-xl border px-3 text-[13px] font-bold transition-colors sm:h-9 ${quick.has(k) ? "border-lime/60 bg-lime/10 text-ink" : "border-line bg-white/[0.02] text-ink-2 hover:text-ink"}`}>
            {G.quick[k]}
          </button>
        ))}
      </div>}
      {userHidden > 0 && (
        <p className="mt-2 text-xs text-ink-3">
          {HID[lang].n(userHidden)} ·{" "}
          <button type="button" className="font-semibold text-ink-2 underline-offset-2 hover:underline" onClick={() => setShowHidden((x) => !x)}>{showHidden ? HID[lang].hideAgain : HID[lang].show}</button>
          {" · "}
          <button type="button" className="font-semibold text-ink-2 underline-offset-2 hover:underline" onClick={() => { clearHidden(); setShowHidden(false); }}>{HID[lang].reset}</button>
        </p>
      )}
      {geoHidden > 0 && (
        <p className="mt-2 text-xs text-ink-3">{G.hidden(geoHidden)} · <button type="button" className="font-semibold text-ink-2 underline-offset-2 hover:underline" onClick={() => setCountry("any")}>{G.any}</button></p>
      )}

      {/* grid */}
      {since !== null && (
        <p className="mt-5 text-sm font-semibold text-ink-2">{PROX[lang].sinceTitle}: <span className={freshCount ? "text-lime" : "text-ink-3"}>{freshCount ? PROX[lang].sinceNew(freshCount) : PROX[lang].sinceNone}</span></p>
      )}
      {list.length ? (
        <>
          <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {list.slice(0, limit).map((p, i) => <PromoCard key={p.id} p={p} t={t} lang={lang} now={now} combos={combos.get(p.id)} index={i % PAGE} fresh={!!since && p.publishedAt > since} pin={i < 3 ? pinOf.get(p.id) : undefined} />)}
          </div>
          {list.length > limit && (
            <div className="mt-8 flex justify-center">
              <button onClick={() => setLimit((l) => l + PAGE)} className="btn btn-ghost h-12 px-6">
                {t.filters.more} · {list.length - limit}
              </button>
            </div>
          )}
        </>
      ) : (
        <div className="mt-10 rounded-3xl border border-dashed border-line-2 px-6 py-16 text-center text-ink-2">{kind === "saved" && !q ? t.saved.empty : t.filters.empty}</div>
      )}
    </div>
  );
}
