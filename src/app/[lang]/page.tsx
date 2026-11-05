import { notFound } from "next/navigation";
import { getDict, isLocale } from "@/lib/i18n";
import { getPromos, topVenues, totalUsd } from "@/lib/promos";
import { Hero } from "@/components/Hero";
import { PromoExplorer } from "@/components/PromoExplorer";
import { Ticker, TopPools } from "@/components/Featured";
import { LaunchpoolTeaser } from "@/components/LaunchpoolTeaser";
import { getPools } from "@/lib/pools";
import { HowItWorks, ProSection, SourcesSection, AdsSection, Footer } from "@/components/Sections";

export const revalidate = 900; // 15 min, same as SITE.revalidateSeconds

export default async function Home({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  const t = getDict(lang);
  const [{ promos, status, fetchedAt }, pools] = await Promise.all([getPromos(), getPools().catch(() => null)]);
  const venueCount = new Set(promos.filter((p) => p.venue.kind !== "airdrop").map((p) => p.venue.id)).size;

  return (
    <>
      <main>
        <Hero t={t} active={promos.length} poolsUsd={totalUsd(promos)} sources={venueCount} venues={topVenues(promos)} />
        <Ticker promos={promos} t={t} />
        <TopPools promos={promos} t={t} />
        {pools && pools.projects.some((p) => p.status !== "ended") && <LaunchpoolTeaser t={t} lang={lang} data={pools} />}
        <section id="promos" className="mx-auto max-w-7xl scroll-mt-16 px-4 pt-10 sm:px-6">
          <PromoExplorer promos={promos} t={t} lang={lang} serverNow={fetchedAt} />
        </section>
        <HowItWorks t={t} />
        <SourcesSection t={t} status={status} />
        <ProSection t={t} />
        <AdsSection t={t} />
      </main>
      <Footer t={t} fetchedAt={fetchedAt} lang={lang} />
    </>
  );
}
