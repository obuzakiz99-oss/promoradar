import Link from "next/link";
import type { Dict, Locale } from "@/lib/i18n";
import type { Promo } from "@/lib/types";
import type { Ended } from "@/lib/archive";
import { geoAllowed } from "@/lib/geo";
import { fixWording } from "@/lib/format";
import { venueOf, VENUES } from "@/config/site";
import { VenueLogo } from "@/components/VenueLogo";
import { PromoCard } from "@/components/PromoCard";

const TX = {
  uk: { badge: "Завершилась", lead: "Ця акція вже закінчилась або біржа її зняла. Сторінка лишається, щоб посилання не вели в нікуди.", rules: "Оголошення на сайті біржі", more: (v: string) => `Зараз у ${v}`, all: "Усі акції", venue: (v: string) => `Усі акції ${v}`, none: "Зараз у цієї біржі немає активних акцій." },
  en: { badge: "Ended", lead: "This promo has ended or the exchange took it down. The page stays so shared links still work.", rules: "Announcement on the exchange", more: (v: string) => `Live on ${v} now`, all: "All promos", venue: (v: string) => `All ${v} promos`, none: "This exchange has no live promos right now." },
  ru: { badge: "Завершилась", lead: "Эта акция уже закончилась или биржа её сняла. Страница остаётся, чтобы ссылки не вели в никуда.", rules: "Объявление на сайте биржи", more: (v: string) => `Сейчас у ${v}`, all: "Все акции", venue: (v: string) => `Все акции ${v}`, none: "Сейчас у этой биржи нет активных акций." },
} as const;

/** Page of a promo that is no longer live (audit 23.11: these were 404). */
export function EndedPromo({ e, lang, t, live, now }: { e: Ended; lang: Locale; t: Dict; live: Promo[]; now: number }) {
  const T = TX[lang];
  const v = venueOf(e.venue);
  const title = lang === "en" ? e.title : (e.titles[lang] ?? fixWording(e.title, lang));   // an untranslated title still gets «Lucky Draw»
  const same = live.filter((p) => p.venue.id === e.venue && (lang !== "uk" || geoAllowed(p, "ua"))).slice(0, 6);
  return (
    <main className="mx-auto max-w-7xl px-4 pb-20 pt-8 sm:px-6">
      <nav className="flex flex-wrap items-center gap-2 text-sm font-semibold text-ink-3">
        <Link href={`/${lang}#promos`} className="inline-flex min-h-10 items-center hover:text-ink">← {T.all}</Link>
      </nav>
      <header className="mt-6 flex flex-col gap-6 md:flex-row md:items-start">
        <VenueLogo v={v} size={72} rounded="rounded-2xl" />
        <div className="min-w-0 flex-1">
          <span className="inline-flex rounded-md bg-white/5 px-2 py-0.5 text-xs font-bold text-ink-3">{T.badge}</span>
          <h1 className="mt-2 break-words font-display text-3xl font-semibold tracking-tight text-ink-2 sm:text-4xl">{title}</h1>
          <p className="mt-3 max-w-2xl text-ink-2">{T.lead}</p>
          <div className="mt-5 flex flex-wrap gap-3">
            {VENUES[e.venue] && <Link href={`/${lang}/v/${e.venue}`} className="btn btn-primary h-11 px-5">{T.venue(v.name)}</Link>}
            <a href={e.url} target="_blank" rel="noopener nofollow" className="btn btn-ghost h-11 px-5">{T.rules} ↗</a>
          </div>
        </div>
      </header>
      <section className="mt-12">
        <h2 className="font-display text-2xl font-semibold tracking-tight">{T.more(v.name)}</h2>
        {same.length ? (
          <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {same.map((p, i) => <PromoCard key={p.id} p={p} t={t} lang={lang} now={now} index={i} />)}
          </div>
        ) : <p className="mt-3 text-ink-3">{T.none} <Link href={`/${lang}#promos`} className="font-semibold text-ink underline-offset-2 hover:underline">{T.all} →</Link></p>}
      </section>
    </main>
  );
}
