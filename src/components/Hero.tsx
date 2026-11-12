import type { Dict, Locale } from "@/lib/i18n";
import { LiveLine } from "./LiveLine";
import type { Venue } from "@/lib/types";
import { HAS_TG, SITE } from "@/config/site";
import { compactUsd } from "@/lib/format";
import { TgIcon } from "./Header";
import { RadarPicker, type RadarItem } from "./RadarPicker";

export function Hero({ t, active, poolsUsd, poolsLabel, sources, radar, radarVenues, venueBase, learn, live }: {
  t: Dict; active: number; poolsUsd: number; poolsLabel?: string; sources: number; radar: RadarItem[]; radarVenues: Record<string, Venue>; venueBase: string;
  learn?: { href: string; label: string }; live?: { at: number; newDay: number; lang: Locale };
}) {
  return (
    <section className="relative mx-auto grid grid-cols-1 max-w-7xl items-center gap-8 px-4 pb-4 pt-8 sm:px-6 md:pt-10 lg:grid-cols-[1.15fr_0.85fr] lg:pb-6">
      <div className="animate-fade-up">
        <span className="inline-flex items-center gap-2 rounded-full border border-lime/25 bg-lime/[0.06] px-3 py-1.5 text-xs font-bold text-lime">
          <span className="relative flex size-2">
            <span className="absolute inline-flex size-full animate-ping-slow rounded-full bg-lime" />
            <span className="relative inline-flex size-2 rounded-full bg-lime" />
          </span>
          {t.hero.kicker}
        </span>
        <h1 className="mt-4 font-display text-[2rem] font-semibold leading-[1.06] tracking-[-0.02em] sm:text-5xl lg:text-[3.3rem]">
          {t.hero.title1}
          <br />
          <span className="text-gradient">{t.hero.title2}</span>
        </h1>
        <p className="mt-4 max-w-xl text-base leading-relaxed text-ink-2 sm:text-lg">{t.hero.sub}</p>
        <div className="mt-6 hidden flex-wrap gap-3 md:flex">
          <a href="#promos" className="btn btn-primary h-12 px-6 text-base">
            {t.hero.cta}
            <svg className="size-4" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true"><path d="M10 3a1 1 0 0 1 1 1v9.6l3.3-3.3a1 1 0 1 1 1.4 1.4l-5 5a1 1 0 0 1-1.4 0l-5-5a1 1 0 1 1 1.4-1.4L9 13.6V4a1 1 0 0 1 1-1Z" /></svg>
          </a>
          {HAS_TG && <a href={SITE.telegram} target="_blank" rel="noopener" className="btn btn-ghost h-12 px-6 text-base"><TgIcon /> {t.hero.ctaPro}</a>}
        </div>
        {learn && <a href={learn.href} className="mt-4 hidden text-sm font-bold text-lime hover:underline md:inline-block">{learn.label}</a>}

        <dl className="mt-8 grid max-w-xl grid-cols-3 gap-3">
          {[
            [String(active), t.hero.statActive],
            [poolsUsd > 0 ? compactUsd(poolsUsd) : "—", poolsLabel ?? t.hero.statPools],
            [String(sources), t.hero.statSources],
          ].map(([v, l]) => (
            <div key={l} className="min-w-0 rounded-2xl border border-line bg-white/[0.02] px-3 py-3 sm:px-4 sm:py-3.5">
              <dt className="sr-only">{l}</dt>
              <dd className="font-display text-xl font-semibold tracking-tight sm:text-3xl">{v}</dd>
              <dd className="mt-1 text-xs font-semibold leading-tight text-ink-3 sm:text-sm">{l}</dd>
            </div>
          ))}
        </dl>
        {live && <LiveLine at={live.at} newDay={live.newDay} lang={live.lang} />}
      </div>

      <div className="hidden animate-fade-up md:block">
        <RadarPicker items={radar} venues={radarVenues} labels={t.hero.radar} catLabels={t.cat} venueBase={venueBase} />
      </div>
    </section>
  );
}
