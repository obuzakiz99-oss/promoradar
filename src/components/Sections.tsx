import { langOf, plural } from "@/lib/format";
import type { Dict } from "@/lib/i18n";
import type { SourceStatus } from "@/lib/sources";
import { HAS_ADS, HAS_TG, PRO, SITE, VENUES } from "@/config/site";
import { LEGAL_NAV } from "@/lib/i18n-legal";
import { TgIcon } from "./Header";
import { LogoMark } from "./Logo";
import { withBase } from "@/lib/base";
import { TOUR_LABEL, tourHref } from "@/lib/tour";

export function HowItWorks({ t }: { t: Dict }) {
  return (
    <section id="how" className="mx-auto max-w-7xl scroll-mt-20 px-4 py-20 sm:px-6">
      <h2 className="font-display text-3xl font-semibold tracking-tight sm:text-4xl">{t.how.title}</h2>
      <ol className="mt-10 grid grid-cols-1 gap-4 md:grid-cols-3">
        {t.how.steps.map(([title, body], i) => (
          <li key={title} className="card relative overflow-hidden p-6">
            <span className="pointer-events-none absolute -top-3 right-4 font-display text-8xl font-bold text-white/[0.035]" aria-hidden="true">0{i + 1}</span>
            <span className="grid size-10 place-items-center rounded-xl bg-lime/10 font-mono text-sm font-bold text-lime">{i + 1}</span>
            <h3 className="mt-5 text-lg font-bold">{title}</h3>
            <p className="mt-2 leading-relaxed text-ink-2">{body}</p>
          </li>
        ))}
      </ol>
    </section>
  );
}

const KIND_ORDER = ["cex", "dex", "defi", "airdrop"] as const;

export function SourcesSection({ t, status }: { t: Dict; status: Record<string, SourceStatus> }) {
  const rows = Object.entries(status);
  return (
    <section id="sources" className="mx-auto max-w-7xl scroll-mt-20 px-4 pb-20 sm:px-6">
      <h2 className="font-display text-3xl font-semibold tracking-tight sm:text-4xl">{t.sources.title}</h2>
      <p className="mt-3 max-w-2xl text-ink-2">{t.sources.sub}</p>
      <div className="mt-8 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        {KIND_ORDER.map((k) => {
          const items = rows.filter(([, s]) => s.kind === k).sort((a, b) => b[1].count - a[1].count);
          if (!items.length) return null;
          return (
            <div key={k} className="card p-5 hover:transform-none">
              <div className="text-xs font-bold uppercase tracking-wider text-ink-3">{t.kinds[k]}</div>
              <ul className="mt-3 space-y-2">
                {items.map(([id, s]) => (
                  <li key={id} className="flex items-center gap-2.5 text-sm">
                    <span className={`size-2 rounded-full ${s.ok ? "bg-lime shadow-[0_0_8px] shadow-lime/60" : "bg-rose"}`} title={s.ok ? t.sources.ok : `${t.sources.fail}: ${s.error ?? ""}`} />
                    <span className="font-semibold text-ink">{s.name}</span>
                    <span className="rounded border border-line px-1 font-mono text-xs font-bold uppercase tracking-wider text-ink-3">{s.via}</span>
                    <span className="ml-auto font-mono text-xs text-ink-3">{s.ok ? `${s.count} ${plural(s.count, langOf(t.sources.items), "promo")}` : t.sources.fail}</span>
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </div>
    </section>
  );
}

export function AdsSection({ t }: { t: Dict }) {
  return (
    <section id="advertise" className="mx-auto max-w-7xl scroll-mt-20 px-4 pb-20 sm:px-6">
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
        <div>
          <h2 className="font-display text-3xl font-semibold tracking-tight sm:text-4xl">{t.ads.title}</h2>
          <p className="mt-3 max-w-md text-ink-2">{t.ads.sub}</p>
          <a href={SITE.contact} target="_blank" rel="noopener" className="btn btn-primary mt-6 h-12 px-6"><TgIcon /> {t.ads.cta}</a>
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {t.ads.plans.map(([name, desc, price]) => (
            <div key={name} className="card flex flex-col p-5 hover:transform-none">
              <div className="font-bold">{name}</div>
              <p className="mt-2 flex-1 text-sm leading-relaxed text-ink-3">{desc}</p>
              <div className="mt-4 font-mono text-lg font-bold text-lime">{price}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

const Check = () => (
  <svg className="mt-0.5 size-4 shrink-0 text-lime" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true"><path fillRule="evenodd" d="M16.7 5.3a1 1 0 0 1 0 1.4l-8 8a1 1 0 0 1-1.4 0l-4-4a1 1 0 1 1 1.4-1.4L8 12.6l7.3-7.3a1 1 0 0 1 1.4 0Z" clipRule="evenodd" /></svg>
);

export function ProSection({ t }: { t: Dict }) {
  const href = PRO.checkoutUrl || SITE.telegram;
  return (
    <section id="pro" className="mx-auto max-w-7xl scroll-mt-20 px-4 pb-24 sm:px-6">
      <div className="relative overflow-hidden rounded-3xl border border-line bg-bg-2 px-6 py-14 sm:px-12">
        <div className="pointer-events-none absolute -right-24 -top-24 size-96 rounded-full bg-lime/10 blur-3xl" />
        <div className="relative mx-auto max-w-2xl text-center">
          <div className="mx-auto w-fit"><LogoMark size={44} /></div>
          <h2 className="mt-5 font-display text-3xl font-semibold tracking-tight sm:text-4xl">{t.pro.title}</h2>
          <p className="mt-3 text-lg text-ink-2">{t.pro.sub}</p>
        </div>
        <div className="relative mx-auto mt-12 grid grid-cols-1 max-w-4xl gap-4 md:grid-cols-2">
          <div className="card p-7 hover:transform-none">
            <div className="text-sm font-bold text-ink-2">Free</div>
            <div className="mt-2 font-display text-4xl font-semibold">{t.pro.free}</div>
            <ul className="mt-6 space-y-3 text-ink-2">
              {t.pro.freeFeatures.map((f) => <li key={f} className="flex gap-2.5"><Check />{f}</li>)}
            </ul>
          </div>
          <div className="card relative p-7 ring-1 ring-lime/50 hover:transform-none" style={{ background: "linear-gradient(180deg, rgb(200 255 61 / 0.08), rgb(200 255 61 / 0.01)), var(--color-surface)" }}>
            <span className="absolute right-5 top-5 rounded-full bg-lime px-2.5 py-1 text-xs font-extrabold uppercase tracking-wide text-on-accent">{t.pro.popular}</span>
            <div className="text-sm font-bold text-lime">Pro</div>
            <div className="mt-2 flex items-baseline gap-1">
              <span className="font-display text-4xl font-semibold">${PRO.priceMonthUsd}</span>
              <span className="text-ink-3">{t.pro.month}</span>
              <span className="ml-3 text-sm text-ink-3">· ${PRO.priceYearUsd}{t.pro.year}</span>
            </div>
            <ul className="mt-6 space-y-3">
              {t.pro.proFeatures.map((f) => <li key={f} className="flex gap-2.5"><Check />{f}</li>)}
            </ul>
            <a href={href} target="_blank" rel="noopener" className="btn btn-primary mt-8 h-12 w-full text-base">
              {PRO.checkoutUrl ? null : <TgIcon />} {t.pro.cta}
            </a>
            {!PRO.checkoutUrl && <p className="mt-3 text-center text-xs text-ink-3">{t.pro.soon}</p>}
          </div>
        </div>
      </div>
    </section>
  );
}

const FOOT_SECTIONS: Array<[string, Record<"uk" | "en" | "ru", string>]> = [
  ["bonuses", { uk: "Бонуси бірж", en: "Exchange bonuses", ru: "Бонусы бирж" }],
  ["earn", { uk: "Earn / стейкінг", en: "Earn / staking", ru: "Earn / стейкинг" }],
  ["launchpools", { uk: "Launchpool", en: "Launchpools", ru: "Launchpool" }],
  ["zero-fees", { uk: "0% комісії", en: "0% fees", ru: "0% комиссии" }],
  ["dex", { uk: "DEX-пули", en: "DEX pools", ru: "DEX-пулы" }],
  ["drops", { uk: "Аірдропи", en: "Airdrops", ru: "Аирдропы" }],
  ["calendar", { uk: "Календар", en: "Calendar", ru: "Календарь" }],
  ["unlocks", { uk: "Розблокування токенів", en: "Token unlocks", ru: "Разлоки токенов" }],
  ["learn", { uk: "Навчання", en: "Learn", ru: "Обучение" }],
  ["tools", { uk: "Інструменти", en: "Tools", ru: "Инструменты" }],
];
const FOOT_VENUES = ["binance", "bybit", "okx", "bitget", "kucoin", "gate", "mexc", "htx", "bingx", "bitrue", "lbank", "toobit", "whitebit", "kraken", "biconomy", "phemex", "xt", "coinstore", "btse", "hyperliquid", "lighter", "aster", "paradex"];

export function Footer({ t, fetchedAt, lang }: { t: Dict; fetchedAt: number; lang: string }) {
  return (
    <footer className="border-t border-line">
      <div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-12 sm:px-6 md:flex-row md:items-start md:justify-between">
        <div>
          <div className="flex items-center gap-2.5 font-display font-semibold"><LogoMark /> {SITE.name}</div>
          <p className="mt-4 max-w-2xl text-sm leading-relaxed text-ink-3">{t.footer.disclaimer}</p>
          <p className="mt-4 text-xs text-ink-3">© {new Date(fetchedAt).getFullYear()} {SITE.name}. {t.footer.rights}</p>
          <nav className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs font-semibold text-ink-3">
            <a href={tourHref(withBase(""), lang)} className="inline-flex min-h-11 items-center text-ink-2 hover:text-ink">{TOUR_LABEL[(lang as "uk" | "en" | "ru")]}</a>
            {LEGAL_NAV[(lang as "uk" | "en" | "ru")].map(([slug, label]) => <a key={slug} href={withBase(`/${lang}/${slug}/`)} className="inline-flex min-h-11 min-w-6 justify-center items-center hover:text-ink">{label}</a>)}
          </nav>
          {/* audit 24.11 (SEO): the server HTML had no plain links to the sections or exchange pages — crawlers saw 9 of ~860 URLs */}
          <nav aria-label={({ uk: "Розділи", en: "Sections", ru: "Разделы" } as const)[lang as "uk" | "en" | "ru"]} className="mt-4 flex flex-wrap gap-x-4 gap-y-1 text-xs text-ink-3">
            {FOOT_SECTIONS.map(([slug, l]) => <a key={slug} href={withBase(`/${lang}/${slug}/`)} className="inline-flex min-h-8 items-center hover:text-ink">{l[(lang as "uk" | "en" | "ru")]}</a>)}
          </nav>
          <nav aria-label={({ uk: "Біржі", en: "Exchanges", ru: "Биржи" } as const)[lang as "uk" | "en" | "ru"]} className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-ink-3">
            {FOOT_VENUES.filter((id) => VENUES[id]).map((id) => <a key={id} href={withBase(`/${lang}/v/${id}/`)} className="inline-flex min-h-8 items-center hover:text-ink">{VENUES[id].name}</a>)}
          </nav>
        </div>
        <div className="flex flex-col gap-3 text-sm md:items-end">
          <div className="flex flex-wrap gap-2">
            <a href={withBase(`/rss-${lang}.xml`)} className="btn btn-ghost h-10">RSS</a>
            {HAS_TG && HAS_ADS && <a href={withBase(`/${lang}#advertise`)} className="btn btn-ghost h-10">{t.ads.title}</a>}
            {HAS_TG && <a href={SITE.telegram} target="_blank" rel="noopener" className="btn btn-ghost h-10"><TgIcon /> Telegram</a>}
          </div>
          <p className="font-mono text-xs text-ink-3">
            {t.footer.updated}: {new Date(fetchedAt).toLocaleString(lang === "uk" ? "uk-UA" : lang === "ru" ? "ru-RU" : "en-GB", { hour: "2-digit", minute: "2-digit", day: "numeric", month: "short", timeZone: "UTC" })} UTC
          </p>
        </div>
      </div>
    </footer>
  );
}
