import { notFound } from "next/navigation";
import { PromoTabs } from "@/components/SectionTabs";
import { getDict, isLocale } from "@/lib/i18n";
import { getPromos, topVenues } from "@/lib/promos";
import { Hero } from "@/components/Hero";
import type { RadarItem } from "@/components/RadarPicker";
import { HAS_PRO, HAS_TG, VENUES } from "@/config/site";
import { todayPins } from "@/components/TodayTop";
import { slugOf } from "@/lib/slug";
import { promoLevel } from "@/lib/level";
import { withBase } from "@/lib/base";
import { PromoExplorer } from "@/components/PromoExplorer";
import { LaunchpoolTeaser } from "@/components/LaunchpoolTeaser";
import { getPools } from "@/lib/pools";
import { HowItWorks, ProSection, AdsSection, Footer } from "@/components/Sections";

export const revalidate = 900; // 15 min, same as SITE.revalidateSeconds

export default async function Home({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  const t = getDict(lang);
  // "your plan for today" and the 90-day backtest (MoneyBlock) were removed from the home page 06.11 at the user's request
  const [{ promos, fetchedAt }, pools] = await Promise.all([getPromos(lang), getPools().catch(() => null)]);
  const radarVenues = Object.fromEntries([...new Set(promos.map((p) => p.venue.id))].filter((id) => VENUES[id]).map((id) => [id, promos.find((p) => p.venue.id === id)!.venue]));
  const radar: RadarItem[] = promos.filter((p) => radarVenues[p.venue.id]).map((p) => ({
    id: p.id, venue: p.venue.id, title: p.title, category: p.category, usd: p.reward?.usd, label: p.reward?.label, href: withBase(`/${lang}/p/${slugOf(p)}/`), hard: promoLevel(p) === "hard",
  }));
  // first screen of the feed (newest, as the feed sorts by default); the rest is loaded from /api/promos.json
  const pins = todayPins(promos, lang, fetchedAt);
  const pinned = promos.filter((p) => pins.some((x) => x.id === p.id));
  const firstCards = [...pinned, ...[...promos].filter((p) => !pinned.includes(p)).sort((a, b) => Number(!!a.meta?.thin) - Number(!!b.meta?.thin) || b.publishedAt - a.publishedAt).slice(0, 24)];
  // the hero's money figure: the most ONE person can get in a promo open to everyone (a prize-pool total says little)
  const maxPerUser = Math.max(0, ...promos.filter((p) => !p.meta?.geo?.only && !p.meta?.geo?.noUA && p.category !== "competition").map((p) => p.meta?.perUser?.usd ?? 0));
  const newDay = promos.filter((p) => p.publishedAt > fetchedAt - 86400_000).length;
  const venueCount = new Set(promos.filter((p) => p.venue.kind !== "airdrop").map((p) => p.venue.id)).size;

  return (
    <>
      <main>
        <Hero t={t} active={promos.length} poolsUsd={maxPerUser} poolsLabel={({ uk: "максимум на 1 людину", en: "most for one person", ru: "максимум на 1 человека" } as const)[lang]} sources={venueCount} radar={radar} radarVenues={radarVenues} venueBase={withBase(`/${lang}/v/`)}
          live={{ at: fetchedAt, newDay, lang }}
          learn={{ href: withBase(`/${lang}/learn/`), label: { uk: "Вперше в крипті? Почніть тут →", en: "New to crypto? Start here →", ru: "Впервые в крипте? Начните здесь →" }[lang] }} />
        {/* the promo list comes right after the hero; today's top 3 are its pinned first cards (audit 08.11) */}
        <section id="promos" className="mx-auto max-w-7xl scroll-mt-16 px-4 pt-6 sm:px-6">
          <div className="mb-5"><PromoTabs lang={lang} active="all" /></div>
          <PromoExplorer promos={firstCards} t={t} lang={lang} serverNow={fetchedAt} src={withBase("/api/promos.json")} pinned={pins} />
        </section>
        {pools && pools.projects.some((p) => p.status !== "ended") && <LaunchpoolTeaser t={t} lang={lang} data={pools} />}
        <HowItWorks t={t} />
        {HAS_PRO && <ProSection t={t} />}
        {HAS_TG && <div className="adv"><AdsSection t={t} /></div>}
      </main>
      <Footer t={t} fetchedAt={fetchedAt} lang={lang} />
    </>
  );
}
