import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getDict, isLocale } from "@/lib/i18n";
import { TOOLS } from "@/lib/i18n-tools";
import { getPromos } from "@/lib/promos";
import { getPools } from "@/lib/pools";
import { venueOf } from "@/config/site";
import { slugOf } from "@/lib/slug";
import { withBase } from "@/lib/base";
import { CalendarBoard, type CalEvent } from "@/components/CalendarBoard";
import { ToolHeader } from "@/components/ToolsNav";
import { Footer } from "@/components/Sections";

export const revalidate = 900;
type Params = Promise<{ lang: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { lang } = await params;
  if (!isLocale(lang)) return {};
  return { title: TOOLS[lang].calTitle, description: TOOLS[lang].calSub };
}

export default async function Calendar({ params }: { params: Params }) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  const t = getDict(lang), T = TOOLS[lang];
  const [{ promos, fetchedAt }, pools] = await Promise.all([getPromos(), getPools()]);
  const now = fetchedAt, horizon = now + 45 * 86400_000;
  const events: CalEvent[] = [];
  for (const p of promos) {
    const href = withBase(`/${lang}/p/${slugOf(p)}/`);
    if (p.startsAt && p.startsAt > now && p.startsAt < horizon) events.push({ id: p.id, at: p.startsAt, kind: "start", venue: p.venue, title: p.title, href, source: p.url });
    if (p.endsAt && p.endsAt > now && p.endsAt < horizon) events.push({ id: p.id, at: p.endsAt, kind: "end", venue: p.venue, title: p.title, href, source: p.url });
  }
  for (const p of pools.projects) {
    if (p.status === "ended") continue;
    const title = `${p.name} Launchpool (${[...new Set(p.pools.map((x) => x.stake))].join(", ")} → ${p.token})`;
    const href = withBase(`/${lang}/launchpools/`);
    if (p.start > now && p.start < horizon) events.push({ id: p.id, at: p.start, kind: "start", venue: venueOf(p.exchange), title, href, source: p.rulesUrl ?? p.url });
    if (p.end > now && p.end < horizon) events.push({ id: p.id, at: p.end, kind: "end", venue: venueOf(p.exchange), title, href, source: p.rulesUrl ?? p.url });
  }
  return (
    <>
      <main className="mx-auto max-w-5xl px-4 pb-20 pt-10 sm:px-6">
        <ToolHeader lang={lang} active="calendar" title={T.calTitle} sub={T.calSub} updated={fetchedAt} />
        <CalendarBoard events={events} lang={lang} now={now} />
      </main>
      <Footer t={t} fetchedAt={fetchedAt} lang={lang} />
    </>
  );
}
