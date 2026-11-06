import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getDict, isLocale } from "@/lib/i18n";
import { PROX } from "@/lib/i18n-pro";
import { FUNDING_EX, getFunding } from "@/lib/funding";
import { AprTabs } from "@/components/AprTabs";
import { FundingBoard } from "@/components/FundingBoard";
import { Footer } from "@/components/Sections";

export const revalidate = 900;
type Params = Promise<{ lang: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { lang } = await params;
  if (!isLocale(lang)) return {};
  return { title: PROX[lang].fundTitle, description: PROX[lang].fundSub };
}

export default async function FundingPage({ params }: { params: Params }) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  const t = getDict(lang), P = PROX[lang];
  const { rows, status, fetchedAt } = await getFunding();
  const live = FUNDING_EX.filter((e) => status[e]?.ok);
  return (
    <>
      <main className="mx-auto max-w-7xl px-4 pb-20 pt-10 sm:px-6">
        <AprTabs t={t} lang={lang} active="funding" updated={fetchedAt} />
        <h1 className="mt-8 font-display text-3xl font-semibold tracking-tight sm:text-5xl">⚖️ {P.fundTitle}</h1>
        <p className="mt-3 max-w-3xl text-ink-2 sm:text-lg">{P.fundSub}</p>
        <p className="mt-2 max-w-3xl text-sm text-ink-3">{P.fundHow}</p>
        <FundingBoard rows={rows.filter((r, i) => i < 150 || (r.volUsd ?? 0) >= 1e6)} exchanges={live} down={FUNDING_EX.filter((e) => !status[e]?.ok)} lang={lang} />
        <p className="mt-4 max-w-3xl text-xs leading-relaxed text-ink-3">{P.note}</p>
      </main>
      <Footer t={t} fetchedAt={fetchedAt} lang={lang} />
    </>
  );
}
