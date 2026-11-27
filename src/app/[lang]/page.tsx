import { fmtLabel } from "@/lib/format";
import { ldJson } from "@/lib/ldjson";
import { rankOf, friendlyRank } from "@/lib/rank";
import { notFound } from "next/navigation";
import { PromoTabs } from "@/components/SectionTabs";
import { getDict, isLocale } from "@/lib/i18n";
import { getPromos, topVenues } from "@/lib/promos";
import { Hero } from "@/components/Hero";
import type { RadarItem } from "@/components/RadarPicker";
import { HAS_ADS, HAS_PRO, HAS_TG, SITE, VENUES } from "@/config/site";
import { todayPins } from "@/components/TodayTop";
import { slugOf } from "@/lib/slug";
import { promoLevel } from "@/lib/level";
import { withBase } from "@/lib/base";
import { PromoExplorer } from "@/components/PromoExplorer";
import { EasyStart } from "@/components/EasyStart";
import { geoAllowed } from "@/lib/geo";
import { LaunchpoolTeaser } from "@/components/LaunchpoolTeaser";
import { getPools } from "@/lib/pools";
import { HowItWorks, ProSection, AdsSection, Footer } from "@/components/Sections";
import { SiteTour } from "@/components/SiteTour";
import { TOUR_LABEL, tourHref } from "@/lib/tour";
import { HOME_TOUR } from "@/lib/tours/home";
import { tourOf } from "@/lib/tours/types";

export const revalidate = 900; // 15 min, same as SITE.revalidateSeconds

export default async function Home({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  const t = getDict(lang);
  // "your plan for today" and the 90-day backtest (MoneyBlock) were removed from the home page 06.11 at the user's request
  const [{ promos, fetchedAt }, pools] = await Promise.all([getPromos(lang), getPools().catch(() => null)]);
  const radarVenues = Object.fromEntries([...new Set(promos.map((p) => p.venue.id))].filter((id) => VENUES[id]).map((id) => [id, promos.find((p) => p.venue.id === id)!.venue]));
  // audit 23.11: the radar said "Binance 19" while the list (UA filter) showed 12 — count what this reader sees
  const radar: RadarItem[] = promos.filter((p) => radarVenues[p.venue.id] && (lang !== "uk" || geoAllowed(p, "ua"))).map((p) => ({
    id: p.id, venue: p.venue.id, title: p.title, category: p.category, usd: p.reward?.usd, label: p.reward?.label && fmtLabel(p.reward.label, lang), href: withBase(`/${lang}/p/${slugOf(p)}/`), hard: promoLevel(p) === "hard",
  }));
  // first screen of the feed (best value first, as the feed sorts by default); the rest is loaded from /api/promos.json
  const pins = todayPins(promos, lang, fetchedAt);
  const pinned = promos.filter((p) => pins.some((x) => x.id === p.id));
  const firstCards = [...pinned, ...[...promos].filter((p) => !pinned.includes(p)).sort((a, b) => Number(!!a.meta?.thin) - Number(!!b.meta?.thin) || Number(!!b.sponsored) - Number(!!a.sponsored) || friendlyRank(b) - friendlyRank(a) || b.publishedAt - a.publishedAt).slice(0, 24)];
  // the hero's money figure: the most ONE person can get in a promo open to everyone (a prize-pool total says little)
  // (audit 14.11: a "win $30,000+" pool and an exchange-footer "$15,000 welcome rewards" were taken as per-person sums —
  // a per-person figure counts only when it is below the promo's pool, or the promo has no pool and is a bonus/referral)
  const perPersonOk = (p: (typeof promos)[number]) => {
    const pu = p.meta?.perUser?.usd ?? 0, pool = p.reward?.usd;
    return pu > 0 && !p.meta?.thin && !/\bwin|\bwon|вигр|выигр/i.test(p.meta?.perUser?.text ?? "") && (pool !== undefined ? pu < pool : p.category === "bonus" || p.category === "referral");
  };
  // audit 25.11: "$23K for one person" was a Biconomy per-user ladder equal to its whole pool (≈$20 per participant really) —
  // the hero now shows the best REALISTIC estimate (value.ts, confident, not APR) of a promo open to everyone
  void perPersonOk;
  const maxPerUser = Math.max(0, ...promos.filter((p) => !p.meta?.geo?.only && !p.meta?.geo?.noUA && !p.meta?.thin && !p.meta?.audience && p.meta?.value && p.meta.value.mech !== "apr" && p.meta.value.conf !== "low" && (p.meta.value.net ?? 0) > 0).map((p) => Math.round(p.meta!.value!.net!)));
  const newDay = promos.filter((p) => p.publishedAt > fetchedAt - 86400_000).length;
  const venueCount = new Set(promos.filter((p) => p.venue.kind !== "airdrop").map((p) => p.venue.id)).size;

  return (
    <>
      <main>
        {/* audit 23.11 (SEO): who publishes the site and what it is called */}
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: ldJson({
          "@context": "https://schema.org",
          "@graph": [
            { "@type": "Organization", "@id": `https://${SITE.domain}/#org`, name: "PromoRadar", url: `https://${SITE.domain}/${lang}/` },
            { "@type": "WebSite", name: "PromoRadar", url: `https://${SITE.domain}/${lang}/`, inLanguage: lang, publisher: { "@id": `https://${SITE.domain}/#org` } },
          ],
        }).replace(/</g, "\\u003c") }} />
        <Hero t={t} active={promos.filter((p) => (lang !== "uk" || geoAllowed(p, "ua")) && !(p.startsAt && p.startsAt > Date.now())).length /* audit 27.11 (evening): not-started promos were counted as active */} poolsUsd={maxPerUser} poolsLabel={({ uk: "реально отримаєте в найкращій акції", en: "you can really get in the best promo", ru: "реально получите в лучшей акции" } as const)[lang]} sources={venueCount} radar={radar} radarVenues={radarVenues} venueBase={withBase(`/${lang}/v/`)}
          live={{ at: fetchedAt, newDay, lang }}
          learn={{ href: withBase(`/${lang}/learn/`), label: { uk: "Вперше в крипті? Почніть тут →", en: "New to crypto? Start here →", ru: "Впервые в крипте? Начните здесь →" }[lang] }}
          tour={{ href: tourHref(withBase(""), lang), label: TOUR_LABEL[lang] }} />
        {/* owner 27.11: beginners first see up to 4 easy offers explained in one line */}
        <EasyStart promos={promos} lang={lang} now={fetchedAt} />
        {/* the promo list comes right after the hero; today's top 3 are its pinned first cards (audit 08.11) */}
        <section id="promos" className="mx-auto max-w-7xl scroll-mt-16 px-4 pt-6 sm:px-6">
          <h2 className="sr-only">{({ uk: "Усі акції", en: "All promos", ru: "Все акции" } as const)[lang]}</h2>
          <div data-tour="sections" className="mb-5"><PromoTabs lang={lang} active="all" /></div>
          <PromoExplorer promos={firstCards} t={t} lang={lang} serverNow={fetchedAt} src={withBase("/api/promos.json")} pinned={pins} />
        </section>
        {pools && pools.projects.some((p) => p.status !== "ended") && <LaunchpoolTeaser t={t} lang={lang} data={pools} />}
        <HowItWorks t={t} />
        {HAS_PRO && <ProSection t={t} />}
        {HAS_TG && HAS_ADS && <div className="adv"><AdsSection t={t} /></div>}
      </main>
      <Footer t={t} fetchedAt={fetchedAt} lang={lang} />
      {/* owner 21.11: first-visit "how to use the site" tour (asks first; replay via ?tour=1) */}
      <SiteTour lang={lang} {...tourOf(HOME_TOUR, lang)} />
    </>
  );
}
