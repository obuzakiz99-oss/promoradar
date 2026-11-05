import type { Dict } from "@/lib/i18n";
import type { Venue } from "@/lib/types";
import { SITE } from "@/config/site";
import { compactUsd } from "@/lib/format";
import { TgIcon } from "./Header";
import { VenueLogo } from "./VenueLogo";

/** Blip positions on the radar (x%, y%, ping delay s). */
const SPOTS: Array<[number, number, number]> = [
  [68, 20, 0.2], [24, 32, 1.1], [80, 60, 2.0], [36, 78, 2.9], [55, 44, 3.8], [16, 58, 4.7], [62, 84, 5.4], [86, 36, 0.8],
];

export function Hero({ t, active, poolsUsd, sources, venues }: { t: Dict; active: number; poolsUsd: number; sources: number; venues: Venue[] }) {
  return (
    <section className="relative mx-auto grid max-w-7xl items-center gap-12 px-4 pb-10 pt-14 sm:px-6 md:pt-20 lg:grid-cols-[1.15fr_0.85fr] lg:pb-14">
      <div className="animate-fade-up">
        <span className="inline-flex items-center gap-2 rounded-full border border-lime/25 bg-lime/[0.06] px-3 py-1.5 text-xs font-bold text-lime">
          <span className="relative flex size-2">
            <span className="absolute inline-flex size-full animate-ping-slow rounded-full bg-lime" />
            <span className="relative inline-flex size-2 rounded-full bg-lime" />
          </span>
          {t.hero.kicker}
        </span>
        <h1 className="mt-6 font-display text-[2.2rem] font-semibold leading-[1.06] tracking-[-0.02em] sm:text-6xl lg:text-[3.9rem]">
          {t.hero.title1}
          <br />
          <span className="text-gradient">{t.hero.title2}</span>
        </h1>
        <p className="mt-6 max-w-xl text-base leading-relaxed text-ink-2 sm:text-lg">{t.hero.sub}</p>
        <div className="mt-8 flex flex-wrap gap-3">
          <a href="#promos" className="btn btn-primary h-12 px-6 text-base">
            {t.hero.cta}
            <svg className="size-4" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true"><path d="M10 3a1 1 0 0 1 1 1v9.6l3.3-3.3a1 1 0 1 1 1.4 1.4l-5 5a1 1 0 0 1-1.4 0l-5-5a1 1 0 1 1 1.4-1.4L9 13.6V4a1 1 0 0 1 1-1Z" /></svg>
          </a>
          <a href={SITE.telegram} target="_blank" rel="noopener" className="btn btn-ghost h-12 px-6 text-base"><TgIcon /> {t.hero.ctaPro}</a>
        </div>

        <dl className="mt-12 grid max-w-xl grid-cols-3 gap-3">
          {[
            [String(active), t.hero.statActive],
            [poolsUsd > 0 ? compactUsd(poolsUsd) : "—", t.hero.statPools],
            [String(sources), t.hero.statSources],
          ].map(([v, l]) => (
            <div key={l} className="min-w-0 rounded-2xl border border-line bg-white/[0.02] px-3 py-3 sm:px-4 sm:py-3.5">
              <dt className="sr-only">{l}</dt>
              <dd className="font-display text-xl font-semibold tracking-tight sm:text-3xl">{v}</dd>
              <dd className="mt-1 text-xs font-semibold leading-tight text-ink-3 sm:text-sm">{l}</dd>
            </div>
          ))}
        </dl>
      </div>

      <div className="relative mx-auto hidden aspect-square w-full max-w-[460px] lg:block" aria-hidden="true">
        <div className="absolute inset-0 rounded-full border border-line-2 bg-[radial-gradient(circle_at_center,rgb(200_255_61/0.07),transparent_65%)]" />
        {[0.78, 0.56, 0.34].map((s) => (
          <div key={s} className="absolute rounded-full border border-line" style={{ inset: `${((1 - s) / 2) * 100}%` }} />
        ))}
        <div className="absolute left-1/2 top-0 h-full w-px -translate-x-1/2 bg-line" />
        <div className="absolute left-0 top-1/2 h-px w-full -translate-y-1/2 bg-line" />
        <div className="absolute inset-0 animate-sweep rounded-full" style={{ background: "conic-gradient(from 0deg, rgb(200 255 61 / 0.32), rgb(200 255 61 / 0.06) 18%, transparent 30%)" }} />
        <div className="absolute left-1/2 top-1/2 size-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-lime shadow-[0_0_24px_6px_rgb(200_255_61/0.5)]" />
        {venues.slice(0, SPOTS.length).map((v, i) => {
          const [x, y, d] = SPOTS[i];
          return (
            <div key={v.id} className="absolute -translate-x-1/2 -translate-y-1/2" style={{ left: `${x}%`, top: `${y}%` }}>
              <span className="absolute inset-0 animate-ping-slow rounded-full" style={{ background: v.color, animationDelay: `${d}s`, opacity: 0.3 }} />
              <span className="relative block rounded-full ring-4 ring-bg"><VenueLogo v={v} size={44} rounded="rounded-full" /></span>
            </div>
          );
        })}
      </div>
    </section>
  );
}
