import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getDict, isLocale } from "@/lib/i18n";
import { TOOLS } from "@/lib/i18n-tools";
import { getPools } from "@/lib/pools";
import { HedgeCalculator } from "@/components/HedgeCalculator";
import { hedgeOptions } from "@/lib/hedge-options";
import { ToolHeader } from "@/components/ToolsNav";
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
      <main className="mx-auto max-w-6xl px-4 pb-20 pt-10 sm:px-6">
        <ToolHeader lang={lang} active="hedge" title={T.hedgeTitle} sub={T.hedgeSub} />
        <HedgeCalculator options={options} lang={lang} />
      </main>
      <Footer t={t} fetchedAt={pools.fetchedAt} lang={lang} />
    </>
  );
}
