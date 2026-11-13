"use client";
import { useEffect, useMemo, useState } from "react";
import type { Locale } from "@/lib/i18n";
import type { Venue } from "@/lib/types";
import { TOOLS } from "@/lib/i18n-tools";
import { getDict } from "@/lib/i18n";
import { duration, money } from "@/lib/format";
import { useSaved, toggleSaved } from "./SaveButton";
import { VenueLogo } from "./VenueLogo";
import { Select } from "./Select";
import { deadlineReminder, icsFile } from "@/lib/ics";

export interface MyPromo { id: string; title: string; venue: Venue; url: string; href: string; endsAt?: number; category: string; reward?: string }
type Status = "saved" | "joined" | "done" | "skipped";
interface Track { status: Status; earned?: number; note?: string; title?: string; venue?: string }

const KEY = "pr:track";
const CAL_T: Record<Locale, string> = { uk: "Дедлайн акції", en: "Promo deadline", ru: "Дедлайн акции" };
const CAL_ALL: Record<Locale, string> = { uk: "Дедлайни в календар (.ics) — нагадування за день", en: "Deadlines to calendar (.ics) — a day-before reminder", ru: "Дедлайны в календарь (.ics) — напоминание за день" };
type Sort = "deadline" | "recent" | "earned" | "venue";
type Show = "all" | Status | "ended";
const F: Record<Locale, { all: string; ended: string; sort: string; venue: string; anyVenue: string; search: string; sorts: Record<Sort, string>; empty: string }> = {
  uk: { all: "Усі", ended: "Завершились", sort: "Сортування", venue: "Біржа", anyVenue: "Усі біржі", search: "Пошук у моїх акціях", sorts: { deadline: "Скоро дедлайн", recent: "Нещодавно збережені", earned: "Більше заробив", venue: "За біржею" }, empty: "Нічого не знайдено — змініть фільтр" },
  en: { all: "All", ended: "Ended", sort: "Sort", venue: "Exchange", anyVenue: "All exchanges", search: "Search my promos", sorts: { deadline: "Deadline soon", recent: "Recently saved", earned: "Most earned", venue: "By exchange" }, empty: "Nothing found — change the filter" },
  ru: { all: "Все", ended: "Завершились", sort: "Сортировка", venue: "Биржа", anyVenue: "Все биржи", search: "Поиск в моих акциях", sorts: { deadline: "Скоро дедлайн", recent: "Недавно сохранённые", earned: "Больше заработал", venue: "По бирже" }, empty: "Ничего не найдено — измените фильтр" },
};
const PREF = "pr:my:view";
const load = (): Record<string, Track> => { try { return JSON.parse(localStorage.getItem(KEY) || "{}"); } catch { return {}; } };

export function MyBoard({ promos, lang }: { promos: MyPromo[]; lang: Locale }) {
  const T = TOOLS[lang], t = getDict(lang);
  const saved = useSaved();
  const [track, setTrack] = useState<Record<string, Track>>({});
  const [now, setNow] = useState(Date.now());
  useEffect(() => { setTrack(load()); const i = setInterval(() => setNow(Date.now()), 60_000); return () => clearInterval(i); }, []);
  const save = (next: Record<string, Track>) => { setTrack(next); try { localStorage.setItem(KEY, JSON.stringify(next)); } catch {} };
  const update = (id: string, patch: Partial<Track>, p?: MyPromo) =>
    save({ ...track, [id]: { ...(track[id] ?? { status: "saved" as Status }), ...(p ? { title: p.title, venue: p.venue.name } : {}), ...patch } });

  const byId = useMemo(() => new Map(promos.map((p) => [p.id, p])), [promos]);
  const rows = saved.map((id) => ({ id, p: byId.get(id), tr: track[id] ?? { status: "saved" as Status } }));
  const total = Object.values(track).reduce((s, x) => s + (x.earned ?? 0), 0);
  const activeN = rows.filter((r) => r.tr.status === "joined").length;

  // filter + sort (owner 13.11): status chips with counts, exchange, search; the choice is remembered in this browser
  const L = F[lang];
  const [show, setShow] = useState<Show>("all");
  const [sort, setSort] = useState<Sort>("deadline");
  const [venue, setVenue] = useState("all");
  const [q, setQ] = useState("");
  useEffect(() => { try { const v = JSON.parse(localStorage.getItem(PREF) || "{}"); if (v.show) setShow(v.show); if (v.sort) setSort(v.sort); } catch {} }, []);
  useEffect(() => { try { localStorage.setItem(PREF, JSON.stringify({ show, sort })); } catch {} }, [show, sort]);
  const ended = (r: (typeof rows)[number]) => !r.p || (!!r.p.endsAt && r.p.endsAt <= now);
  const venueOf = (r: (typeof rows)[number]) => r.p?.venue.name ?? r.tr.venue ?? "";
  const counts: Record<string, number> = { all: rows.length, ended: rows.filter(ended).length };
  rows.forEach((r) => (counts[r.tr.status] = (counts[r.tr.status] ?? 0) + 1));
  const venues = [...new Set(rows.map(venueOf).filter(Boolean))].sort((a, b) => a.localeCompare(b));
  const view = useMemo(() => {
    const s = q.trim().toLowerCase();
    const order = new Map(saved.map((id, i) => [id, i]));
    const list = rows.filter((r) => (show === "all" || (show === "ended" ? ended(r) : r.tr.status === show))
      && (venue === "all" || venueOf(r) === venue)
      && (!s || `${r.p?.title ?? r.tr.title ?? ""} ${venueOf(r)} ${r.tr.note ?? ""}`.toLowerCase().includes(s)));
    const end = (r: (typeof rows)[number]) => (r.p?.endsAt && r.p.endsAt > now ? r.p.endsAt : Infinity);
    return list.sort((a, b) => sort === "deadline" ? end(a) - end(b) || (order.get(b.id)! - order.get(a.id)!)
      : sort === "recent" ? order.get(b.id)! - order.get(a.id)!
      : sort === "earned" ? (b.tr.earned ?? 0) - (a.tr.earned ?? 0)
      : venueOf(a).localeCompare(venueOf(b)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows.length, saved, track, show, sort, venue, q, now]);

  const exportCsv = () => {
    const lines = [["title", "venue", "status", "earned_usd", "note", "url"], ...rows.map((r) => [r.p?.title ?? r.tr.title ?? r.id, r.p?.venue.name ?? r.tr.venue ?? "", r.tr.status, String(r.tr.earned ?? ""), r.tr.note ?? "", r.p?.url ?? ""])];
    const csv = lines.map((l) => l.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob(["﻿" + csv], { type: "text/csv" }));
    a.download = "promoradar-my-promos.csv"; a.click();
  };

  // every saved promo with a known end → one .ics with a reminder a day before each deadline
  const withEnd = rows.filter((r) => r.p?.endsAt && r.p.endsAt > now && r.tr.status !== "skipped" && r.tr.status !== "done");
  const exportIcs = () => {
    const ev = withEnd.map(({ p }) => ({
      uid: p!.id.replace(/[^a-z0-9]/gi, "-"), title: Array.from(`⏳ ${CAL_T[lang]}: ${p!.title}`).slice(0, 180).join(""), at: deadlineReminder(p!.endsAt!, Date.now()),
      description: `${p!.venue.name} · ${new Date(p!.endsAt!).toUTCString()}`, url: location.origin + p!.href,
    }));
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([icsFile(ev)], { type: "text/calendar" }));
    a.download = "promoradar-deadlines.ics"; a.click();
  };

  if (!rows.length) return <div className="mt-10 rounded-3xl border border-dashed border-line-2 px-6 py-16 text-center text-ink-2">{T.emptyMy}</div>;
  return (
    <div className="mt-8">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="card p-4 hover:transform-none"><div className="font-display text-3xl font-semibold text-lime">{money(total, "USD", lang)}</div><div className="mt-1 text-xs font-semibold text-ink-3">{T.totalEarned}</div></div>
        <div className="card p-4 hover:transform-none"><div className="font-display text-3xl font-semibold">{activeN}</div><div className="mt-1 text-xs font-semibold text-ink-3">{T.status.joined} · {T.active}</div></div>
        <button onClick={exportCsv} className="card p-4 text-left"><div className="font-display text-3xl font-semibold">⇩</div><div className="mt-1 text-xs font-semibold text-ink-3">{T.export}</div></button>
        <button onClick={exportIcs} disabled={!withEnd.length} className="card p-4 text-left disabled:opacity-50"><div className="font-display text-3xl font-semibold">{withEnd.length}</div><div className="mt-1 text-xs font-semibold text-ink-3">{CAL_ALL[lang]}</div></button>
      </div>
      <div className="mt-6 flex flex-wrap items-center gap-2">
        <div className="scroll-x -mx-1 flex min-w-0 flex-1 gap-2 px-1" role="tablist" aria-label={L.all}>
          {(["all", "joined", "saved", "done", "skipped", "ended"] as Show[]).filter((k) => k === "all" || counts[k] || show === k).map((k) => (
            <button key={k} type="button" className="chip" data-on={show === k} role="tab" aria-selected={show === k} onClick={() => setShow(k)}>
              {k === "all" ? L.all : k === "ended" ? L.ended : T.status[k]} <span className="chip-count">{counts[k] ?? 0}</span>
            </button>
          ))}
        </div>
        {rows.length > 5 && (
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={L.search} aria-label={L.search}
            className="h-10 w-full rounded-xl border border-line bg-white/[0.03] px-3 text-sm font-medium text-ink placeholder:text-ink-3 focus:border-lime/50 focus:outline-none sm:w-56" />
        )}
        {venues.length > 1 && (
          <div className="min-w-40">
            <Select label={L.venue} value={venue} onChange={setVenue} align="right" className="h-10 rounded-xl border border-line bg-surface pl-3 pr-2.5 text-sm font-bold text-ink"
              options={[{ value: "all", label: L.anyVenue }, ...venues.map((v) => ({ value: v, label: v }))]} />
          </div>
        )}
        <div className="min-w-48">
          <Select label={L.sort} value={sort} onChange={setSort} align="right" className="h-10 rounded-xl border border-line bg-surface pl-3 pr-2.5 text-sm font-bold text-ink"
            options={(["deadline", "recent", "earned", "venue"] as Sort[]).map((k) => ({ value: k, label: L.sorts[k] }))} />
        </div>
      </div>
      {!view.length && <div className="mt-4 rounded-3xl border border-dashed border-line-2 px-6 py-10 text-center text-sm text-ink-2">{L.empty}</div>}
      <ul className="mt-4 space-y-2">
        {view.map(({ id, p, tr }) => {
          const left = p?.endsAt ? p.endsAt - now : undefined;
          const soon = left !== undefined && left > 0 && left < 2 * 86400_000;
          return (
            <li key={id} className={`card grid gap-3 p-4 lg:grid-cols-[1.6fr_auto_auto_1fr_auto] lg:items-center ${soon && tr.status === "joined" ? "ring-1 ring-amber/50" : ""}`} style={{ ["--tint" as string]: p?.venue.color }}>
              <div className="flex min-w-0 items-center gap-3">
                {p && <VenueLogo v={p.venue} size={34} />}
                <div className="min-w-0">
                  {p ? <a href={p.href} className="break-words text-sm font-bold hover:text-lime">{p.title}</a> : <span className="text-sm font-bold text-ink-3">{tr.title ?? id}</span>}
                  <div className="mt-0.5 text-xs font-semibold text-ink-3">
                    {p ? p.venue.name : `${tr.venue ?? ""} · ${T.gone}`}
                    {left !== undefined && left > 0 && <span className={soon ? " text-amber" : ""}> · {t.card.endsIn} {duration(left, t.time)}{soon ? ` · ${T.deadlineSoon}` : ""}</span>}
                  </div>
                </div>
              </div>
              <Select label={T.status[tr.status]} value={tr.status} onChange={(v) => update(id, { status: v }, p)}
                className="h-10 rounded-xl border border-line bg-surface pl-3 pr-2.5 text-sm font-bold text-ink"
                options={(["saved", "joined", "done", "skipped"] as Status[]).map((s) => ({ value: s, label: T.status[s] }))} />
              <label className="flex items-center gap-2 text-xs font-semibold text-ink-3">{T.earned}
                <input inputMode="decimal" defaultValue={tr.earned ?? ""} onBlur={(e) => update(id, { earned: Number(e.target.value.replace(",", ".")) || 0 }, p)}
                  className="h-10 w-24 rounded-xl border border-line bg-white/[0.03] px-3 font-mono text-sm text-ink focus:border-lime/50 focus:outline-none" />
              </label>
              <input placeholder={T.note} defaultValue={tr.note ?? ""} onBlur={(e) => update(id, { note: e.target.value.slice(0, 200) }, p)}
                className="h-10 w-full rounded-xl border border-line bg-white/[0.03] px-3 text-sm text-ink placeholder:text-ink-3 focus:border-lime/50 focus:outline-none" />
              <button type="button" onClick={() => toggleSaved(id)} title={t.saved.remove} className="h-10 rounded-xl border border-line px-3 text-sm text-ink-3 hover:text-rose">✕</button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
