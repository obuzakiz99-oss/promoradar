"use client";
import { useEffect, useMemo, useState } from "react";
import type { Category, Promo, Venue, VenueKind } from "@/lib/types";
import type { Dict, Locale } from "@/lib/i18n";
import { PromoCard, CAT_STYLE } from "./PromoCard";
import { PROX } from "@/lib/i18n-pro";
import { VenueLogo } from "./VenueLogo";
import { useSaved } from "./SaveButton";
import { statusOf, type Status } from "@/lib/slug";

type Sort = "newest" | "ending" | "biggest";
type Kind = VenueKind | "all" | "saved";
const STATUSES: Array<Status | "all"> = ["all", "live", "upcoming", "ending"];
const CATS: Category[] = ["airdrop", "competition", "bonus", "earn", "farming", "listing", "referral", "other"];
const KINDS: Kind[] = ["all", "cex", "dex", "defi", "airdrop"];
const PAGE = 24;
const VENUE_CHIPS = 9;

const value = (p: Promo) => p.reward?.usd ?? (p.meta?.apr !== undefined ? p.meta.apr * 100 : -1);

export function PromoExplorer({ promos, t, lang, serverNow, showKinds = true }: { promos: Promo[]; t: Dict; lang: Locale; serverNow: number; showKinds?: boolean }) {
  const [now, setNow] = useState(serverNow);
  const saved = useSaved();
  const [kind, setKind] = useState<Kind>("all");
  const [status, setStatus] = useState<Status | "all">("all");
  const [cat, setCat] = useState<Category | "all">("all");
  const [venues, setVenues] = useState<Set<string>>(new Set());
  const [allVenues, setAllVenues] = useState(false);
  const [q, setQ] = useState("");
  const [sort, setSort] = useState<Sort>("newest");
  const [limit, setLimit] = useState(PAGE);

  useEffect(() => {
    setNow(Date.now());
    const id = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(id);
  }, []);
  useEffect(() => setLimit(PAGE), [kind, cat, venues, q, sort, status]);

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

  const kindCounts = useMemo(() => {
    const c: Record<string, number> = { all: promos.length, saved: promos.filter((p) => saved.includes(p.id)).length };
    promos.forEach((p) => (c[p.venue.kind] = (c[p.venue.kind] ?? 0) + 1));
    return c;
  }, [promos, saved]);

  const byKind = useMemo(
    () => promos.filter((p) => (kind === "all" || (kind === "saved" ? saved.includes(p.id) : p.venue.kind === kind)) && (status === "all" || statusOf(p, now) === status)),
    [promos, kind, saved, status, now],
  );

  const venueList = useMemo(() => {
    const m = new Map<string, { v: Venue; n: number }>();
    byKind.forEach((p) => { if (p.venue.kind === "airdrop") return; const e = m.get(p.venue.id); e ? e.n++ : m.set(p.venue.id, { v: p.venue, n: 1 }); });
    return [...m.values()].sort((a, b) => b.n - a.n);
  }, [byKind]);

  const base = useMemo(() => {
    const s = q.trim().toLowerCase();
    return byKind.filter((p) =>
      (venues.size === 0 || venues.has(p.venue.id)) &&
      (!s || `${p.title} ${p.venue.name} ${t.cat[p.category]} ${p.reward?.unit ?? ""} ${p.meta?.chain ?? ""} ${p.meta?.actions ?? ""}`.toLowerCase().includes(s)),
    );
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
    return [...sponsored, ...rest];
  }, [base, cat, sort]);

  const toggleVenue = (id: string) => setVenues((s) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const dirty = kind !== "all" || cat !== "all" || venues.size > 0 || q !== "" || sort !== "newest" || status !== "all";
  const shownVenues = allVenues ? venueList : venueList.slice(0, VENUE_CHIPS);

  return (
    <div>
      {/* kind tabs */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="scroll-x flex gap-1 rounded-2xl border border-line bg-white/[0.02] p-1 sm:w-fit" role="tablist" aria-label="Type">
          {[...(showKinds ? KINDS.filter((k) => k === "all" || kindCounts[k]) : (["all"] as Kind[])), "saved" as Kind].map((k) => (
            <button
              key={k}
              role="tab"
              aria-selected={kind === k}
              onClick={() => { setKind(k); setVenues(new Set()); setCat("all"); }}
              className={`flex h-10 shrink-0 items-center gap-2 rounded-xl px-4 text-sm font-bold transition-colors ${kind === k ? (k === "saved" ? "bg-amber text-[#151005]" : "bg-lime text-[#0b0f05]") : "text-ink-2 hover:bg-white/5 hover:text-ink"}`}
            >
              {k === "saved" ? <>★ {t.saved.tab}</> : t.kinds[k as Exclude<Kind, "saved">]}
              <span className={`font-mono text-[11px] ${kind === k ? "text-black/60" : "text-ink-3"}`}>{kindCounts[k] ?? 0}</span>
            </button>
          ))}
        </div>
        <label className="relative sm:ml-auto">
          <span className="sr-only">{t.status.all}</span>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value as Status | "all")}
            className="h-12 w-full appearance-none rounded-2xl border border-line bg-surface pl-4 pr-10 text-sm font-bold text-ink focus:border-lime/50 focus:outline-none sm:w-auto"
          >
            {STATUSES.map((s) => <option key={s} value={s}>{s === "all" ? t.status.all : t.status[s]}</option>)}
          </select>
          <svg className="pointer-events-none absolute right-3.5 top-1/2 size-4 -translate-y-1/2 text-ink-3" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true"><path d="M5.2 7.6a.75.75 0 0 1 1.06 0L10 11.3l3.74-3.7a.75.75 0 1 1 1.06 1.06l-4.27 4.24a.75.75 0 0 1-1.06 0L5.2 8.66a.75.75 0 0 1 0-1.06Z" /></svg>
        </label>
      </div>

      {/* toolbar */}
      <div className="sticky top-16 z-30 -mx-4 mt-4 border-b border-line/60 bg-bg/85 px-4 py-3 backdrop-blur-xl sm:-mx-6 sm:px-6">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          <label className="relative flex-1 lg:max-w-sm">
            <span className="sr-only">{t.filters.search}</span>
            <svg className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-ink-3" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true"><path fillRule="evenodd" d="M9 3.5a5.5 5.5 0 1 0 3.4 9.83l3.64 3.63a.75.75 0 1 0 1.06-1.06l-3.63-3.64A5.5 5.5 0 0 0 9 3.5ZM5 9a4 4 0 1 1 8 0 4 4 0 0 1-8 0Z" clipRule="evenodd" /></svg>
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder={t.filters.search}
              className="h-11 w-full rounded-xl border border-line bg-white/[0.03] pl-10 pr-9 text-sm font-medium text-ink placeholder:text-ink-3 focus:border-lime/50 focus:outline-none"
            />
            {q && <button onClick={() => setQ("")} className="absolute right-2 top-1/2 grid size-7 -translate-y-1/2 place-items-center rounded-lg text-ink-3 hover:bg-white/5 hover:text-ink" aria-label="Clear">✕</button>}
          </label>
          <div className="flex h-11 shrink-0 items-center self-start rounded-xl border border-line bg-white/[0.02] p-1 lg:ml-auto" role="group" aria-label={t.filters.sort}>
            {(["newest", "ending", "biggest"] as Sort[]).map((s) => (
              <button key={s} onClick={() => setSort(s)} aria-pressed={sort === s}
                className={`h-full rounded-lg px-2.5 text-xs font-bold transition-colors sm:px-3 ${sort === s ? "bg-white/10 text-ink" : "text-ink-3 hover:text-ink"}`}>
                {t.filters[s]}
              </button>
            ))}
          </div>
        </div>

        <div className="scroll-x -mx-1 mt-3 flex gap-2 px-1" role="tablist" aria-label="Category">
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
            <button className="chip ml-auto border-dashed" onClick={() => { setKind("all"); setCat("all"); setVenues(new Set()); setQ(""); setSort("newest"); setStatus("all"); }}>
              ✕ {t.filters.reset}
            </button>
          )}
        </div>
      </div>

      {/* venues */}
      {/* venues: folded into one dropdown so the filter area stays short */}
      {venueList.length > 1 && (
        <details className="group relative mt-4 w-fit">
          <summary className={`flex h-9 cursor-pointer list-none items-center gap-2 rounded-xl border px-3 text-[13px] font-bold [&::-webkit-details-marker]:hidden ${venues.size ? "border-lime/60 bg-lime/10 text-ink" : "border-line bg-white/[0.02] text-ink-2 hover:text-ink"}`}>
            {t.filters.venues}
            {venues.size > 0 && <span className="flex -space-x-1.5">{venueList.filter(({ v }) => venues.has(v.id)).slice(0, 5).map(({ v }) => <VenueLogo key={v.id} v={v} size={20} rounded="rounded-md" />)}</span>}
            {venues.size > 0 && <span className="font-mono text-[11px] text-lime">{venues.size}</span>}
            <span className="text-ink-3 transition-transform group-open:rotate-180">▾</span>
          </summary>
          <div className="absolute left-0 top-11 z-30 grid w-[min(36rem,calc(100vw-2rem))] grid-cols-2 gap-1.5 rounded-2xl border border-line-2 bg-surface p-2 shadow-2xl sm:grid-cols-3" role="group" aria-label={t.filters.venues}>
            {venueList.map(({ v, n }) => (
              <button key={v.id} type="button" onClick={() => toggleVenue(v.id)} aria-pressed={venues.has(v.id)}
                className={`flex h-9 items-center gap-2 rounded-xl border pl-1.5 pr-3 text-[13px] font-bold transition-all ${venues.has(v.id) ? "border-lime/60 bg-lime/10 text-ink" : "border-transparent text-ink-2 hover:bg-white/5 hover:text-ink"}`}>
                <VenueLogo v={v} size={22} rounded="rounded-lg" />
                <span className="truncate">{v.name}</span>
                <span className="ml-auto font-mono text-[11px] text-ink-3">{n}</span>
              </button>
            ))}
          </div>
        </details>
      )}

      {/* grid */}
      {since !== null && (
        <p className="mt-5 text-sm font-semibold text-ink-2">✦ {PROX[lang].sinceTitle}: <span className={freshCount ? "text-lime" : "text-ink-3"}>{freshCount ? PROX[lang].sinceNew(freshCount) : PROX[lang].sinceNone}</span></p>
      )}
      {list.length ? (
        <>
          <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {list.slice(0, limit).map((p, i) => <PromoCard key={p.id} p={p} t={t} lang={lang} now={now} index={i % PAGE} fresh={!!since && p.publishedAt > since} />)}
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
