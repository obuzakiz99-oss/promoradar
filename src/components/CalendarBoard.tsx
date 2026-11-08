"use client";
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

function downloadIcs(e: CalEvent, label: string) {
  const esc = (s: string) => s.replace(/[\\,;]/g, (m) => `\\${m}`).replace(/\n/g, "\\n");
  const ics = [
    "BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//PromoRadar//EN", "BEGIN:VEVENT",
    `UID:${e.id}@promoradar`, `DTSTAMP:${stamp(Date.now())}`, `DTSTART:${stamp(e.at)}`, `DTEND:${stamp(e.at + 30 * 60_000)}`,
    `SUMMARY:${esc(`${label}: ${e.venue.name} — ${e.title}`)}`, `DESCRIPTION:${esc(e.source)}`, `URL:${e.source}`,
    "BEGIN:VALARM", "TRIGGER:-PT2H", "ACTION:DISPLAY", "DESCRIPTION:PromoRadar", "END:VALARM",
    "END:VEVENT", "END:VCALENDAR",
  ].join("\r\n");
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([ics], { type: "text/calendar" }));
  a.download = `promoradar-${e.id.replace(/[^a-z0-9]+/gi, "-").slice(0, 40)}.ics`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
}

export function CalendarBoard({ events, lang, now }: { events: CalEvent[]; lang: Locale; now: number }) {
  const T = TOOLS[lang];
  const day = (ts: number) => new Date(ts).toISOString().slice(0, 10);
  const today = day(now), tomorrow = day(now + 86400_000);
  const groups = new Map<string, CalEvent[]>();
  for (const e of [...events].sort((a, b) => a.at - b.at)) groups.set(day(e.at), [...(groups.get(day(e.at)) ?? []), e]);

  if (!groups.size) return <p className="mt-10 text-ink-3">{T.noEvents}</p>;
  return (
    <div className="mt-10 space-y-8">
      {[...groups].map(([d, list]) => (
        <section key={d}>
          <h2 className="sticky top-16 z-10 -mx-1 bg-bg/90 px-1 py-2 font-display text-lg font-semibold backdrop-blur">
            {d === today ? T.today : d === tomorrow ? T.tomorrow : new Date(d).toLocaleDateString(locTag(lang), { weekday: "long", day: "numeric", month: "long" })}
          </h2>
          <ul className="mt-2 space-y-2">
            {list.map((e) => {
              const label = e.kind === "start" ? T.starts : T.ends;
              return (
                <li key={e.id + e.kind} className="card flex flex-wrap items-center gap-3 p-3.5 sm:flex-nowrap" style={{ ["--tint" as string]: e.venue.color }}>
                  <span suppressHydrationWarning className="w-14 shrink-0 font-mono text-sm font-bold text-ink-2">{new Date(e.at).toLocaleTimeString(locTag(lang), { hour: "2-digit", minute: "2-digit" })}</span>
                  <span className={`shrink-0 rounded-md px-2 py-0.5 text-xs font-extrabold uppercase ${e.kind === "start" ? "bg-sky/15 text-sky" : "bg-amber/15 text-amber"}`}>{label}</span>
                  <VenueLogo v={e.venue} size={28} rounded="rounded-lg" />
                  <a href={e.href} className="min-w-0 flex-1 break-words text-sm font-semibold hover:text-lime">{e.venue.name}: {e.title}</a>
                  <div className="flex shrink-0 gap-1.5">
                    <a href={gcal(e, label)} target="_blank" rel="noopener" className="btn btn-ghost h-8 px-2.5 text-xs">+ {T.addGoogle}</a>
                    <button type="button" onClick={() => downloadIcs(e, label)} className="btn btn-ghost h-8 px-2.5 text-xs">{T.addIcs}</button>
                  </div>
                </li>
              );
            })}
          </ul>
        </section>
      ))}
    </div>
  );
}
