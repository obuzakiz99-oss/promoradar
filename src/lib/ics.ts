/** Calendar reminders for a promo's deadline: a .ics file (Apple / Outlook / Google import) and a Google Calendar link. */
export interface CalEvent { uid: string; title: string; at: number; minutes?: number; description: string; url: string }

const stamp = (ms: number) => new Date(ms).toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
const esc = (s: string) => s.replace(/\\/g, "\\\\").replace(/\n/g, "\\n").replace(/([,;])/g, "\\$1");
/** RFC 5545 lines must be folded at 75 octets (approximated by characters). */
const fold = (line: string) => line.match(/.{1,72}/g)!.join("\r\n ");

/** The reminder goes a day before the end (or an hour before, if the end is closer than that). */
export function deadlineReminder(endsAt: number, now: number): number {
  return endsAt - now > 26 * 3600_000 ? endsAt - 24 * 3600_000 : Math.max(now + 5 * 60_000, endsAt - 3600_000);
}

export function icsFile(events: CalEvent[]): string {
  const lines = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//PromoRadar//Promo deadlines//EN", "CALSCALE:GREGORIAN"];
  for (const e of events) {
    lines.push(
      "BEGIN:VEVENT", `UID:${e.uid}@promoradar`, `DTSTAMP:${stamp(Date.now())}`,
      `DTSTART:${stamp(e.at)}`, `DTEND:${stamp(e.at + (e.minutes ?? 30) * 60_000)}`,
      fold(`SUMMARY:${esc(e.title)}`), fold(`DESCRIPTION:${esc(`${e.description}\n${e.url}`)}`), fold(`URL:${e.url}`),
      "BEGIN:VALARM", "ACTION:DISPLAY", fold(`DESCRIPTION:${esc(e.title)}`), "TRIGGER:-PT0M", "END:VALARM",
      "END:VEVENT",
    );
  }
  lines.push("END:VCALENDAR");
  return lines.join("\r\n");
}

export const icsHref = (events: CalEvent[]) => `data:text/calendar;charset=utf-8,${encodeURIComponent(icsFile(events))}`;

export function googleCalUrl(e: CalEvent): string {
  const q = new URLSearchParams({ action: "TEMPLATE", text: e.title, dates: `${stamp(e.at)}/${stamp(e.at + (e.minutes ?? 30) * 60_000)}`, details: `${e.description}\n${e.url}` });
  return `https://calendar.google.com/calendar/render?${q.toString()}`;
}
