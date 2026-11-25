import { alt, withOg } from "@/lib/seo";
import { plural } from "@/lib/format";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getDict, isLocale } from "@/lib/i18n";
import { getPromos } from "@/lib/promos";
import { VenuePayout } from "@/components/VenuePayout";
import { PROMO_PAGES, SITE, TELEGRAM, VENUES, venueOf } from "@/config/site";
import type { Locale } from "@/lib/i18n";

const NOAUTO: Record<Locale, { browser: (v: string) => string; manual: (v: string) => string; open: (v: string) => string }> = {
  uk: { browser: (v) => `${v} не дозволяє автоматично читати свої акції, тому ми перевіряємо їхню сторінку акцій у браузері кожні 2 години. Нові акції можуть з'явитися тут із невеликою затримкою.`, manual: (v) => `${v} не дозволяє автоматично читати свої акції — актуальний список завжди на офіційній сторінці біржі.`, open: (v) => `Акції ${v}` },
  en: { browser: (v) => `${v} doesn't allow its promos to be read automatically, so we check its promo page in a browser every 2 hours. New promos may appear here with a short delay.`, manual: (v) => `${v} doesn't allow its promos to be read automatically — the current list is always on the exchange's official page.`, open: (v) => `${v} promos` },
  ru: { browser: (v) => `${v} не позволяет автоматически читать свои акции, поэтому мы проверяем их страницу акций в браузере каждые 2 часа. Новые акции могут появиться здесь с небольшой задержкой.`, manual: (v) => `${v} не позволяет автоматически читать свои акции — актуальный список всегда на официальной странице биржи.`, open: (v) => `Акции ${v}` },
};
import { GUIDES } from "@/lib/guides";
import { LEARN } from "@/lib/i18n-learn";
import { VenueLogo } from "@/components/VenueLogo";
import { PromoExplorer } from "@/components/PromoExplorer";
import { Footer } from "@/components/Sections";
import { SiteTour, TourButton } from "@/components/SiteTour";
import { VENUE_TOUR } from "@/lib/tours/venue";
import { tourOf } from "@/lib/tours/types";

export const revalidate = 900;
export const dynamicParams = false; // every page is pre-rendered at build (required by the static GitHub Pages export)
export function generateStaticParams() { return Object.keys(VENUES).map((id) => ({ id })); }

type Params = Promise<{ lang: string; id: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { lang, id } = await params;
  if (!isLocale(lang) || !VENUES[id]) return {};
  const t = getDict(lang);
  const n = VENUES[id].name;
  const description = ({
    uk: `Акції ${n} зараз: бонуси, Earn, змагання й аірдропи — умови українською, як ${n} платить і що забирати вручну.`,
    en: `${n} promos right now: bonuses, Earn, competitions and airdrops — plain-language terms, how ${n} pays and what to claim by hand.`,
    ru: `Акции ${n} сейчас: бонусы, Earn, соревнования и аирдропы — условия по-русски, как ${n} платит и что забирать вручную.`,
  } as const)[lang];
  // audit 24.11 (SEO): people search "бонус Bybit", "Bybit bonus November 2026", "акции Bybit" — the month keeps it fresh
  const month = new Date().toLocaleDateString(lang === "uk" ? "uk-UA" : lang === "ru" ? "ru-RU" : "en-US", { month: "long", year: "numeric", timeZone: "UTC" }).replace(/ р\.$| г\.$/, "");
  const title = ({
    uk: `Бонуси та акції ${n} — ${month}`,   // audit 2: ≤ 60 with " · PromoRadar"
    en: `${n} bonus & promotions — ${month}`,
    ru: `Бонусы и акции ${n} — ${month}`,
  } as const)[lang];
  void t;
  return withOg({ title, description, alternates: alt(lang, `/v/${id}`) });
}

export default async function VenuePage({ params }: { params: Params }) {
  const { lang, id } = await params;
  if (!isLocale(lang) || !VENUES[id]) notFound();
  const t = getDict(lang);
  const cfg = VENUES[id];
  const v = venueOf(id);
  const { promos, fetchedAt } = await getPromos(lang);
  const mine = promos.filter((p) => p.venue.id === id);
  const others = Object.keys(VENUES).filter((k) => k !== id);

  return (
    <>
      <main className="mx-auto max-w-7xl px-4 pb-20 pt-8 sm:px-6">
        <nav aria-label={t.detail.back} className="text-sm font-semibold text-ink-3"><Link href={`/${lang}#promos`} className="hover:text-ink">← {t.detail.back}</Link></nav>
        <header data-tour="venue-head" className="relative mt-6 overflow-hidden rounded-3xl border border-line bg-bg-2 p-6 sm:p-10">
          <div className="pointer-events-none absolute -right-20 -top-20 size-80 rounded-full opacity-20 blur-3xl" style={{ background: v.color }} />
          <div className="relative flex flex-col gap-6 sm:flex-row sm:items-center">
            <VenueLogo v={v} size={80} rounded="rounded-2xl" />
            <div className="flex-1">
              <div className="text-xs font-bold uppercase tracking-wider text-ink-3">{t.kinds[v.kind]}</div>
              <h1 className="mt-1 font-display text-3xl font-semibold tracking-tight sm:text-5xl">{v.name}</h1>
              <p className="mt-2 font-mono text-sm text-ink-2">{mine.length} {plural(mine.length, lang, "promo")} {t.venue.count.split(" ").slice(1).join(" ")}</p>
              <TourButton lang={lang} className="mt-1" />
            </div>
            <div className="flex flex-wrap gap-3">
              <a href={cfg.refUrl || cfg.site} target="_blank" rel={cfg.refUrl ? "sponsored noopener" : "noopener"} className="btn btn-primary h-12 px-6">{VENUES[id].kind === "cex" ? t.venue.join : ({ uk: `Відкрити ${VENUES[id].name}`, en: `Open ${VENUES[id].name}`, ru: `Открыть ${VENUES[id].name}` } as const)[lang]} ↗{cfg.refUrl && <span className="ml-1.5 rounded bg-white/10 px-1 py-0.5 text-xs font-bold uppercase tracking-wide text-ink-3" title={({ uk: "Реферальне посилання: ми можемо отримати комісію від біржі. Для вас умови ті самі.", en: "Referral link: we may earn a commission from the exchange. Your terms are the same.", ru: "Реферальная ссылка: мы можем получить комиссию от биржи. Для вас условия те же." } as const)[lang]}>{({ uk: "реф.", en: "ref", ru: "реф." } as const)[lang]}</span>}</a>
              {cfg.refUrl && <a href={cfg.site} target="_blank" rel="noopener" className="btn btn-ghost h-12 px-6">{t.venue.site} ↗</a>}
              {GUIDES[lang].some((g) => g.id === id || g.venue === id) && <Link href={`/${lang}/learn/guide/${GUIDES[lang].find((g) => g.id === id || g.venue === id)!.id}`} className="btn btn-ghost h-12 px-6">{LEARN[lang].cards.how[0]}</Link>}
            </div>
            {/* audit 23.11: signing up here instead of through the promo's own link lost a newcomer the MEXC 150 USDT bonus */}
            {VENUES[id].kind === "cex" && mine.some((p) => p.meta?.forNew) && <p className="mt-3 max-w-xl text-sm font-semibold text-amber">{({ uk: "Новачкам: щоб отримати бонус, реєструйтеся за посиланням з акції нижче — після звичайної реєстрації він може не нарахуватися.", en: "New users: sign up through the link in the promo below to get the bonus — a plain sign-up may not qualify.", ru: "Новичкам: чтобы получить бонус, регистрируйтесь по ссылке из акции ниже — после обычной регистрации он может не начислиться." } as const)[lang]}</p>}
          </div>
        </header>

        {PROMO_PAGES[id] && (
          <div data-tour="venue-noauto" className="mt-6 flex flex-col gap-3 rounded-2xl border border-amber/30 bg-amber/[0.06] p-5 sm:flex-row sm:items-center">
            <p className="flex-1 text-sm text-ink-2">{(id === "blofin" ? NOAUTO[lang].browser : NOAUTO[lang].manual)(v.name)}</p>
            <a href={PROMO_PAGES[id]} target="_blank" rel="noopener" className="btn btn-primary h-11 shrink-0 px-5 text-sm">{NOAUTO[lang].open(v.name)} ↗</a>
          </div>
        )}

        {/* how this exchange pays: verified facts + what its promos' rules say */}
        <VenuePayout venueId={id} venueName={v.name} promos={mine} lang={lang} />
        {/* audit 23.11 (UX): a newcomer from a shared link had no way to tell the real exchange from a copy — the official
            addresses we already use for the "Це справжня біржа?" checker, shown here (only facts we hold, no ratings) */}
        {(() => {
          const host = (() => { try { return new URL(cfg.site).hostname.replace(/^www\./, ""); } catch { return ""; } })();
          const tgs = TELEGRAM.filter((x) => x.venue === id).map((x) => x.channel);
          const TT = ({
            uk: { title: "Офіційні адреси", site: "Сайт", tg: "Telegram", check: "Перевірити інше посилання", warn: "Підробні сайти й «служба підтримки» в особистих повідомленнях — найчастіший спосіб втратити гроші. Заходьте лише за цими адресами." },
            en: { title: "Official addresses", site: "Website", tg: "Telegram", check: "Check another link", warn: "Fake sites and \"support\" in private messages are the most common way to lose money. Use only these addresses." },
            ru: { title: "Официальные адреса", site: "Сайт", tg: "Telegram", check: "Проверить другую ссылку", warn: "Поддельные сайты и «поддержка» в личных сообщениях — самый частый способ потерять деньги. Заходите только по этим адресам." },
          } as const)[lang];
          return host ? (
            <section className="mt-6 rounded-2xl border border-line bg-white/[0.02] p-5">
              <h2 className="text-xs font-bold uppercase tracking-wider text-ink-3">{TT.title}</h2>
              <dl className="mt-3 grid gap-2 text-sm sm:grid-cols-[8rem_1fr]">
                <dt className="font-semibold text-ink-3">{TT.site}</dt><dd className="font-mono font-bold text-ink">{host}</dd>
                {tgs.length > 0 && <><dt className="font-semibold text-ink-3">{TT.tg}</dt><dd className="font-mono font-bold text-ink">{tgs.map((c) => `@${c}`).join(", ")}</dd></>}
              </dl>
              <p className="mt-3 text-sm text-ink-2">{TT.warn} <Link href={`/${lang}/check/`} className="font-semibold text-lime underline-offset-2 hover:underline">{TT.check} →</Link></p>
            </section>
          ) : null;
        })()}

        <section className="mt-10">
          <h2 data-tour="venue-promos" className="mb-5 font-display text-2xl font-semibold tracking-tight">{t.venue.promos}</h2>
          {/* audit 2 (25.11): WhiteBIT (most used in Ukraine, linked in the footer) showed "Нічого не знайдено. Спробуйте інші фільтри." */}
          {mine.length === 0 ? (
            <div className="card p-6 text-sm leading-relaxed text-ink-2 hover:transform-none">
              {({
                uk: <>Зараз у {v.name} немає активних акцій. Нові з'являються тут автоматично — підпишіться на <a className="font-semibold text-lime underline" href={SITE.telegram} target="_blank" rel="noopener">наш Telegram</a>, щоб не пропустити.</>,
                en: <>{v.name} has no running promos right now. New ones appear here automatically — follow <a className="font-semibold text-lime underline" href={SITE.telegram} target="_blank" rel="noopener">our Telegram</a> so you don&apos;t miss them.</>,
                ru: <>Сейчас у {v.name} нет активных акций. Новые появляются здесь автоматически — подпишитесь на <a className="font-semibold text-lime underline" href={SITE.telegram} target="_blank" rel="noopener">наш Telegram</a>, чтобы не пропустить.</>,
              } as const)[lang]}
            </div>
          ) : <PromoExplorer promos={mine} t={t} lang={lang} serverNow={fetchedAt} showKinds={false} />}
        </section>

        <section data-tour="venue-others" className="mt-16">
          <h2 className="text-xs font-bold uppercase tracking-wider text-ink-3">{t.venue.all}</h2>
          <div className="mt-4 flex flex-wrap gap-2">
            {others.map((k) => (
              <Link key={k} href={`/${lang}/v/${k}`} className="flex h-10 items-center gap-2 rounded-xl border border-line bg-white/[0.02] pl-1.5 pr-3 text-sm font-bold text-ink-2 hover:border-line-2 hover:text-ink">
                <VenueLogo v={venueOf(k)} size={28} rounded="rounded-lg" /> {VENUES[k].name}
              </Link>
            ))}
          </div>
        </section>
      </main>
      <Footer t={t} fetchedAt={fetchedAt} lang={lang} />
      <SiteTour lang={lang} {...tourOf(VENUE_TOUR, lang)} />
    </>
  );
}
