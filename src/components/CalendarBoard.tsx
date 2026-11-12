"use client";
import { useState } from "react";
import type { Locale } from "@/lib/i18n";
import type { Venue } from "@/lib/types";
import { TOOLS } from "@/lib/i18n-tools";
import { VenueLogo } from "./VenueLogo";

export interface CalEvent { id: string; at: number; kind: "start" | "end"; venue: Venue; title: string; href: string; source: string }

const stamp = (ts: number) => new Date(ts).toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
const locTag = (l: Locale) => (l === "uk" ? "uk-UA" : l === "ru" ? "ru-RU" : "en-GB");

function gcal(e: CalEvent, label: string) {
  const end = e.at + 30 * 60_000;
  const q = new URLSearchParams({ action: "TEMPLATE", text: `${label}: ${e.venue.name} — ${e.title}`, dates: `${stamp(e.at)}/${stamp(end)}`, details: e.source });
  return `https://calendar.google.com/calendar/render?${q.toString()}`;
}

/** One .ics file for one event (with a 2-hour reminder). */
function downloadIcs(evs: Array<[CalEvent, string]>, name: string) {
  const esc = (s: string) => s.replace(/[\\,;]/g, (m) => `\\${m}`).replace(/\n/g, "\\n");
  const ics = [
    "BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//PromoRadar//EN",
    ...evs.flatMap(([e, label]) => [
      "BEGIN:VEVENT",
      `UID:${e.id}-${e.kind}@promoradar`, `DTSTAMP:${stamp(Date.now())}`, `DTSTART:${stamp(e.at)}`, `DTEND:${stamp(e.at + 30 * 60_000)}`,
      `SUMMARY:${esc(`${label}: ${e.venue.name} — ${e.title}`)}`, `DESCRIPTION:${esc(e.source)}`, `URL:${e.source}`,
      "BEGIN:VALARM", "TRIGGER:-PT2H", "ACTION:DISPLAY", "DESCRIPTION:PromoRadar", "END:VALARM",
      "END:VEVENT",
    ]),
    "END:VCALENDAR",
  ].join("\r\n");
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([ics], { type: "text/calendar" }));
  a.download = `${name.replace(/[^a-z0-9]+/gi, "-").slice(0, 40)}.ics`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
}

const X: Record<Locale, { more: string; add: string }> = {
  uk: { more: "Показати ще 7 днів", add: "Додати в календар" },
  en: { more: "Show 7 more days", add: "Add to calendar" },
  ru: { more: "Показать ещё 7 дней", add: "Добавить в календарь" },
};

/** Compact calendar (audit 08.11): 7 days at a time, one-line rows, one "add to calendar" menu per row. */
export function CalendarBoard({ events, lang, now }: { events: CalEvent[]; lang: Locale; now: number }) {
  const T = TOOLS[lang], L = X[lang];
  const [days, setDays] = useState(7);
  const day = (ts: number) => new Date(ts).toISOString().slice(0, 10);
  const today = day(now), tomorrow = day(now + 86400_000);
  const groups = new Map<string, CalEvent[]>();
  for (const e of [...events].sort((a, b) => a.at - b.at)) groups.set(day(e.at), [...(groups.get(day(e.at)) ?? []), e]);
  const all = [...groups];

  if (!groups.size) return <p className="mt-10 text-ink-3">{T.noEvents}</p>;
  return (
    <div className="mt-8">
      <div className="space-y-8">
        {all.slice(0, days).map(([d, list]) => (
          <section key={d}>
            <h2 className="sticky top-16 z-10 -mx-1 bg-bg/90 px-1 py-2 text-lg font-bold backdrop-blur">
              {d === today ? T.today : d === tomorrow ? T.tomorrow : new Date(d).toLocaleDateString(locTag(lang), { weekday: "long", day: "numeric", month: "long" })}
            </h2>
            <ul className="mt-2 space-y-2">
              {list.map((e) => {
                const label = e.kind === "start" ? T.starts : T.ends;
                return (
                  <li key={e.id + e.kind} className="card flex items-center gap-3 p-3" style={{ ["--tint" as string]: e.venue.color }}>
                    <span suppressHydrationWarning className="w-12 shrink-0 text-sm font-bold tabular-nums text-ink-2">{new Date(e.at).toLocaleTimeString(locTag(lang), { hour: "2-digit", minute: "2-digit" })}</span>
                    <VenueLogo v={e.venue} size={28} rounded="rounded-lg" />
                    <a href={e.href} className="min-w-0 flex-1 text-sm hover:text-lime">
                      <span className={`text-xs font-bold ${e.kind === "start" ? "text-sky" : "text-amber"}`}>{label}</span>
                      <span className="line-clamp-2 break-words font-semibold">{e.venue.name}: {e.title}</span>
                    </a>
                    <details className="relative shrink-0">
                      <summary aria-label={L.add} title={L.add} className="grid size-11 cursor-pointer list-none place-items-center rounded-xl border border-line text-ink-2 hover:border-line-2 hover:text-ink [&::-webkit-details-marker]:hidden">
                        <svg className="size-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="3" y="4.5" width="18" height="16" rx="2.5" /><path d="M3 9.5h18M8 2.5v4M16 2.5v4M12 13v5M9.5 15.5h5" /></svg>
                      </summary>
                      <div className="absolute right-0 top-12 z-20 flex w-48 flex-col rounded-xl border border-line-2 bg-surface p-1 shadow-2xl">
                        <a href={gcal(e, label)} target="_blank" rel="noopener" className="rounded-lg px-3 py-2.5 text-sm font-semibold hover:bg-white/5">Google Calendar</a>
                        <button type="button" onClick={() => downloadIcs([[e, label]], `promoradar-${e.id}`)} className="rounded-lg px-3 py-2.5 text-left text-sm font-semibold hover:bg-white/5">{T.addIcs}</button>
                      </div>
                    </details>
                  </li>
                );
              })}
            </ul>
          </section>
        ))}
      </div>
      {all.length > days && <div className="mt-8 flex justify-center"><button type="button" onClick={() => setDays((n) => n + 7)} className="btn btn-ghost h-12 px-6">{L.more}</button></div>}
    </div>
  );
}
