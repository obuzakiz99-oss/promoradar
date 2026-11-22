"use client";
import { useState } from "react";
import type { Locale } from "@/lib/i18n";
import type { Venue } from "@/lib/types";
import { TOOLS } from "@/lib/i18n-tools";
import { VenueLogo } from "./VenueLogo";
import { noEmoji } from "@/lib/format";
import { SITE } from "@/config/site";

export interface CalEvent { id: string; at: number; kind: "start" | "end"; venue: Venue; title: string; href: string; source: string }

const stamp = (ts: number) => new Date(ts).toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
const locTag = (l: Locale) => (l === "uk" ? "uk-UA" : l === "ru" ? "ru-RU" : "en-GB");

// owner 13.11: the calendar entry links back to the promo on our site, then to the exchange's own page
const SITE_TX = { uk: ["Деталі й умови на PromoRadar", "Сторінка біржі"], en: ["Details on PromoRadar", "Exchange page"], ru: ["Детали и условия на PromoRadar", "Страница биржи"] } as const;
// href already carries the base path (/promoradar/…); the same value on the server and in the browser
const siteUrl = (e: CalEvent) => (/^https?:/.test(e.href) ? e.href : `https://${SITE.domain.split("/")[0]}${e.href}`);
const details = (e: CalEvent, lang: Locale) => `${SITE_TX[lang][0]}: ${siteUrl(e)}\n${SITE_TX[lang][1]}: ${e.source}`;
const summary = (e: CalEvent, label: string) => `${label}: ${e.venue.name} — ${noEmoji(e.title)}`;

function gcal(e: CalEvent, label: string, lang: Locale) {
  const end = e.at + 30 * 60_000;
  const q = new URLSearchParams({ action: "TEMPLATE", text: summary(e, label), dates: `${stamp(e.at)}/${stamp(end)}`, details: details(e, lang) });
  return `https://calendar.google.com/calendar/render?${q.toString()}`;
}

/** One .ics file for one event (with a 2-hour reminder). */
function downloadIcs(evs: Array<[CalEvent, string]>, name: string, lang: Locale) {
  const esc = (s: string) => s.replace(/[\\,;]/g, (m) => `\\${m}`).replace(/\n/g, "\\n");
  const ics = [
    "BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//PromoRadar//EN",
    ...evs.flatMap(([e, label]) => [
      "BEGIN:VEVENT",
      `UID:${e.id}-${e.kind}@promoradar`, `DTSTAMP:${stamp(Date.now())}`, `DTSTART:${stamp(e.at)}`, `DTEND:${stamp(e.at + 30 * 60_000)}`,
      `SUMMARY:${esc(summary(e, label))}`, `DESCRIPTION:${esc(details(e, lang))}`, `URL:${siteUrl(e)}`,
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
const dayTitle = (d: string | number, lang: Locale) => {
  const t = new Date(d), o = { timeZone: "UTC" } as const;
  const wd = t.toLocaleDateString(locTag(lang), { ...o, weekday: "long" });
  return `${wd.charAt(0).toUpperCase()}${wd.slice(1)}, ${t.toLocaleDateString(locTag(lang), { ...o, day: "numeric", month: "long" })}`;
};

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
      {/* the page is static: dates and times are UTC everywhere, and say so (audit 14.11: "23:59" without a zone was misread) */}
      <p data-tour="calendar-utc" className="mb-4 text-xs text-ink-3">{({ uk: "Час указано за UTC (Київ: +2 год взимку, +3 влітку)", en: "Times are UTC", ru: "Время указано по UTC (Киев: +2 ч зимой, +3 летом)" } as const)[lang]}</p>
      <div className="space-y-8">
        {all.slice(0, days).map(([d, list]) => (
          <section key={d}>
            {/* audit 23.11: Node and Chrome format "weekday, day month" differently (React #418, and Chrome's uk gave the
                accusative "пʼятницю") — weekday and date are formatted apart, which both agree on */}
            <h2 suppressHydrationWarning data-tour="calendar-day" className="sticky top-16 z-10 -mx-1 bg-bg/90 px-1 py-2 text-lg font-bold backdrop-blur">
              {d === today ? T.today : d === tomorrow ? T.tomorrow : dayTitle(d, lang)}
            </h2>
            <ul className="mt-2 space-y-2">
              {list.map((e) => {
                const label = e.kind === "start" ? T.starts : T.ends;
                return (
                  <li key={e.id + e.kind} data-tour="calendar-row" className="card relative flex items-center gap-3 p-3 has-[details[open]]:z-30" style={{ ["--tint" as string]: e.venue.color }}>
                    <span suppressHydrationWarning className="w-12 shrink-0 text-sm font-bold tabular-nums text-ink-2">{new Date(e.at).toISOString().slice(11, 16)}</span>
                    <VenueLogo v={e.venue} size={28} rounded="rounded-lg" />
                    <a href={e.href} className="min-w-0 flex-1 text-sm hover:text-lime">
                      <span className={`text-xs font-bold ${e.kind === "start" ? "text-sky" : "text-amber"}`}>{label}</span>
                      <span className="line-clamp-2 break-words font-semibold">{e.venue.name}: {noEmoji(e.title)}</span>
                    </a>
                    <details data-tour="calendar-add" data-pop="" className="relative shrink-0">
                      <summary aria-label={L.add} title={L.add} className="grid size-11 cursor-pointer list-none place-items-center rounded-xl border border-line text-ink-2 hover:border-line-2 hover:text-ink [&::-webkit-details-marker]:hidden">
                        <svg className="size-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="3" y="4.5" width="18" height="16" rx="2.5" /><path d="M3 9.5h18M8 2.5v4M16 2.5v4M12 13v5M9.5 15.5h5" /></svg>
                      </summary>
                      <div className="absolute right-0 top-12 z-40 flex w-56 flex-col rounded-xl border border-line-2 bg-surface p-1 shadow-2xl">
                        <a href={gcal(e, label, lang)} target="_blank" rel="noopener" onClick={(ev) => ev.currentTarget.closest("details")?.removeAttribute("open")} className="rounded-lg px-3 py-2.5 text-sm font-semibold hover:bg-white/5">Google Calendar</a>
                        <button type="button" onClick={(ev) => { downloadIcs([[e, label]], `promoradar-${e.id}`, lang); const d = ev.currentTarget.closest("details"); d?.removeAttribute("open"); d?.querySelector<HTMLElement>("summary")?.focus(); }} className="rounded-lg px-3 py-2.5 text-left text-sm font-semibold hover:bg-white/5">{T.addIcs}</button>
                      </div>
                    </details>
                  </li>
                );
              })}
            </ul>
          </section>
        ))}
      </div>
      {all.length > days && <div className="mt-8 flex justify-center"><button data-tour="calendar-more" type="button" onClick={() => setDays((n) => n + 7)} className="btn btn-ghost h-12 px-6">{L.more}</button></div>}
    </div>
  );
}
