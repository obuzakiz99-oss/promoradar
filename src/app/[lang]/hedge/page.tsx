import type { Metadata } from "next";
import { YieldTabs } from "@/components/SectionTabs";
import { notFound } from "next/navigation";
import { getDict, isLocale } from "@/lib/i18n";
import { TOOLS } from "@/lib/i18n-tools";
import { getPools } from "@/lib/pools";
import { HedgeCalculator } from "@/components/HedgeCalculator";
import { hedgeOptions } from "@/lib/hedge-options";
import { Footer } from "@/components/Sections";

export const revalidate = 300;
type Params = Promise<{ lang: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { lang } = await params;
  if (!isLocale(lang)) return {};
  return { title: TOOLS[lang].hedgeTitle, description: TOOLS[lang].hedgeSub };
}

export default async function HedgePage({ params }: { params: Params }) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  const t = getDict(lang), T = TOOLS[lang];
  const pools = await getPools();
  const live = pools.projects.filter((p) => p.status === "live");
  const options = hedgeOptions(live, pools.hedge, pools.prices, pools.fetchedAt);
  return (
    <>
      <main className="mx-auto max-w-7xl px-4 pb-20 pt-10 sm:px-6">
        <header>
          <YieldTabs lang={lang} active="hedge" />
          <h1 className="mt-8 font-display text-3xl font-semibold tracking-tight sm:text-5xl">{T.hedgeTitle}</h1>
          <p className="mt-3 max-w-2xl text-ink-2 sm:text-lg">{T.hedgeSub}</p>
        </header>
        <HedgeCalculator options={options} lang={lang} />
      </main>
      <Footer t={t} fetchedAt={pools.fetchedAt} lang={lang} />
    </>
  );
}
