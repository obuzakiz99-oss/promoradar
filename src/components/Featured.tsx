import type { Promo } from "@/lib/types";
import type { Dict } from "@/lib/i18n";
import { compactUsd } from "@/lib/format";
import { VenueLogo } from "./VenueLogo";
import { CAT_STYLE } from "./PromoCard";
import { promoLevel } from "@/lib/level";
import { slugOf } from "@/lib/slug";
import { withBase } from "@/lib/base";

/** internal promo page (short explanation + rules) — never straight to the exchange (07.11 user request) */
const page = (p: Promo, lang: string) => withBase(`/${lang}/p/${slugOf(p)}/`);

/** Infinite marquee of the freshest promos. Pure CSS; pauses on hover. */
export function Ticker({ promos, t, lang }: { promos: Promo[]; t: Dict; lang: string }) {
  const items = promos.filter((p) => p.publishedAt > 0).slice(0, 18);
  if (items.length < 4) return null;
  const row = (aria: boolean) => (
    <ul className="flex shrink-0 items-center gap-8 pr-8" aria-hidden={aria || undefined}>
      {items.map((p) => (
        <li key={p.id + aria} className={`${promoLevel(p) === "hard" ? "adv " : ""}flex items-center gap-2.5 whitespace-nowrap text-sm`}>
          <VenueLogo v={p.venue} size={22} rounded="rounded-md" />
          <span className="font-bold text-ink">{p.venue.name}</span>
          <a href={page(p, lang)} tabIndex={aria ? -1 : undefined} className="text-ink-2 hover:text-ink">{p.title}</a>
          {p.reward && <span className="rounded-md bg-lime/10 px-1.5 py-0.5 font-mono text-xs font-bold text-lime">{p.reward.label}</span>}
        </li>
      ))}
    </ul>
  );
  return (
    <div className="group relative border-y border-line bg-white/[0.015]">
      <div className="mx-auto flex max-w-7xl items-center">
        <span className="z-10 hidden shrink-0 items-center gap-2 border-r border-line bg-bg px-4 py-3 text-xs font-extrabold uppercase tracking-wider text-lime sm:flex sm:px-6">
          <span className="size-1.5 animate-pulse rounded-full bg-lime" /> {t.feat.ticker}
        </span>
        <div className="relative flex overflow-hidden py-3 [mask-image:linear-gradient(90deg,transparent,#000_6%,#000_94%,transparent)]">
          <div className="flex animate-marquee group-hover:[animation-play-state:paused]">
            {row(false)}
            {row(true)}
          </div>
        </div>
      </div>
    </div>
  );
}

/** Top prize pools (USD-denominated) as large tiles. */
export function TopPools({ promos, t, lang }: { promos: Promo[]; t: Dict; lang: string }) {
  const ranked = promos.filter((p) => (p.reward?.usd ?? 0) >= 1000 && !p.sponsored).sort((a, b) => b.reward!.usd! - a.reward!.usd!);
  // two top-6 lists in one render: everyone's (hard items get .adv) and the beginner one (extra easy items get .nov)
  const all6 = ranked.slice(0, 6), easy6 = ranked.filter((p) => promoLevel(p) !== "hard").slice(0, 6);
  const top = ranked.filter((p) => all6.includes(p) || easy6.includes(p));
  const cls = (p: Promo) => (!easy6.includes(p) ? "adv" : !all6.includes(p) ? "nov" : "");
  if (all6.length < 3) return null;
  return (
    <section className="mx-auto max-w-7xl px-4 pb-6 pt-14 sm:px-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="font-display text-2xl font-semibold tracking-tight sm:text-3xl">{t.feat.top}</h2>
          <p className="mt-1.5 text-sm text-ink-3">{t.feat.topSub}</p>
        </div>
      </div>
      <div className="scroll-x -mx-4 mt-6 flex snap-x gap-4 px-4 pb-2 [counter-reset:top] sm:-mx-6 sm:px-6 lg:mx-0 lg:grid lg:grid-cols-3 lg:px-0">
        {top.map((p) => (
          <a
            key={p.id}
            href={page(p, lang)}
            className={`card group relative flex w-[85%] shrink-0 snap-start flex-col overflow-hidden p-5 sm:w-[46%] lg:w-auto [counter-increment:top] ${cls(p)}`}
            style={{ ["--tint" as string]: p.venue.color }}
          >
            <span className="pointer-events-none absolute -right-10 -top-10 size-40 rounded-full opacity-[0.12] blur-2xl transition-opacity group-hover:opacity-25" style={{ background: p.venue.color }} />
            <div className="flex items-center gap-3">
              <span className="font-mono text-xs font-bold text-ink-3 before:content-['#'_counter(top)]" />
              <VenueLogo v={p.venue} size={30} rounded="rounded-lg" />
              <span className="text-sm font-bold">{p.venue.name}</span>
              <span className={`ml-auto text-xs font-semibold ${CAT_STYLE[p.category].text}`}>{t.cat[p.category]}</span>
            </div>
            <div className="mt-5 font-display text-4xl font-semibold tracking-tight text-gradient">{compactUsd(p.reward!.usd!)}</div>
            <p className="mt-3 text-sm font-semibold leading-snug text-ink-2 group-hover:text-ink">{p.title}</p>
          </a>
        ))}
      </div>
    </section>
  );
}
