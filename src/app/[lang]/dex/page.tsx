import type { Metadata } from "next";
import { YieldTabs } from "@/components/SectionTabs";
import { notFound } from "next/navigation";
import { getDict, isLocale } from "@/lib/i18n";
import { getDexPools } from "@/lib/dexpools";
import { getHedges } from "@/lib/pools";
import { exposure } from "@/lib/dexhedge";
import { compactUsd, nfLocale } from "@/lib/format";
import { withBase } from "@/lib/base";
import { DexBoard } from "@/components/DexBoard";
import { Footer } from "@/components/Sections";

export const revalidate = 1800;
type Params = Promise<{ lang: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { lang } = await params;
  if (!isLocale(lang)) return {};
  const t = getDict(lang);
  return { title: t.aprHub.dexTitle, description: t.aprHub.dexSub, alternates: { canonical: `/${lang}/dex` } };
}

export default async function DexPage({ params }: { params: Params }) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  const t = getDict(lang);
  const { pools, chains, categories, fetchedAt } = await getDexPools();
  const tvl = pools.reduce((s, p) => s + p.tvl, 0);
  const protocols = new Set(pools.map((p) => p.slug)).size;
  // futures + funding for the volatile coins of the highest-yield pools (the API call takes up to 40 coins)
  const coins: string[] = [];
  for (const p of [...pools].sort((a, b) => b.apy - a.apy)) {
    for (const e of exposure(p.symbol)) if (!coins.includes(e.coin)) coins.push(e.coin);
    if (coins.length >= 40) break;
  }
  const hedge = await getHedges(coins.slice(0, 40));
  return (
    <>
      <main className="mx-auto max-w-7xl px-4 pb-20 pt-10 sm:px-6">
        <YieldTabs lang={lang} active="dex" updated={fetchedAt} />
        <header className="mt-8">
          <h1 className="font-display text-3xl font-semibold tracking-tight sm:text-5xl">{t.aprHub.dexTitle}</h1>
          <p className="mt-3 max-w-2xl text-ink-2 sm:text-lg">{t.aprHub.dexSub}</p>
          <dl className="mt-6 grid max-w-2xl grid-cols-2 gap-3 sm:grid-cols-4">
            {[[pools.length.toLocaleString(nfLocale(lang)), t.aprHub.colPool], [String(protocols), t.aprHub.colProto], [String(chains.length), t.aprHub.colChain], [compactUsd(tvl), t.aprHub.colTvl]].map(([v, l]) => (
              <div key={l} className="rounded-2xl border border-line bg-white/[0.02] px-4 py-3">
                <dd className="font-display text-2xl font-semibold tracking-tight">{v}</dd>
                <dt className="mt-0.5 text-xs font-semibold text-ink-3">{l}</dt>
              </div>
            ))}
          </dl>
        </header>
        <div className="mt-8">
          <DexBoard hedge={hedge} pools={pools.slice(0, 300)} fullUrl={withBase("/api/dex.json")} chains={chains} categories={categories} t={t} lang={lang} />
        </div>
        <p className="mt-8 text-xs text-ink-3">{t.aprHub.dexNote} · DefiLlama</p>
      </main>
      <Footer t={t} fetchedAt={fetchedAt} lang={lang} />
    </>
  );
}
