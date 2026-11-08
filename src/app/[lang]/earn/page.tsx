import type { Metadata } from "next";
import { YieldTabs } from "@/components/SectionTabs";
import { notFound } from "next/navigation";
import { getDict, isLocale } from "@/lib/i18n";
import { getEarn, POPULAR } from "@/lib/earn";
import { getHedges, prices as getPrices } from "@/lib/pools";
import { venueOf } from "@/config/site";
import { EarnBoard } from "@/components/EarnBoard";
import { Footer } from "@/components/Sections";

export const revalidate = 900;
type Params = Promise<{ lang: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { lang } = await params;
  if (!isLocale(lang)) return {};
  const t = getDict(lang);
  return { title: `${t.aprHub.tabEarn} — ${t.aprHub.earnTitle}`, description: t.aprHub.earnSub, alternates: { canonical: `/${lang}/earn` } };
}

export default async function EarnPage({ params }: { params: Params }) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  const t = getDict(lang);
  const { offers, status, fetchedAt } = await getEarn();
  // where each coin can be hedged with futures: popular coins first, then the coins with the most offers (≤ 40)
  const byCount = new Map<string, number>();
  for (const o of offers) byCount.set(o.coin, (byCount.get(o.coin) ?? 0) + 1);
  const coins = [...new Set([...POPULAR, ...[...byCount.entries()].sort((a, b) => b[1] - a[1]).map(([c]) => c)])];
  const hedge = await getHedges(coins);
  // coin prices (Gate spot tickers) for the calculator: income in the coin and in dollars
  const px = await getPrices().then((x) => x.px).catch(() => ({} as Record<string, number>));
  const usedPx = Object.fromEntries(Object.entries(px).filter(([k]) => offers.some((o) => o.coin === k)));
  const ids = ["binance", "bybit", "okx", "gate", "mexc"] as const;
  const exchanges = Object.fromEntries(ids.map((id) => [id, venueOf(id)]));
  return (
    <>
      <main className="mx-auto max-w-7xl px-4 pb-20 pt-10 sm:px-6">
        <YieldTabs lang={lang} active="earn" updated={fetchedAt} />
        <header className="mt-8">
          <h1 className="font-display text-3xl font-semibold tracking-tight sm:text-5xl">{t.aprHub.earnTitle}</h1>
          <p className="mt-3 max-w-2xl text-ink-2 sm:text-lg">{t.aprHub.earnSub}</p>
          <div className="mt-5 flex flex-wrap gap-2">
            {ids.map((id) => (
              <span key={id} className="flex h-9 items-center gap-2 rounded-xl border border-line bg-white/[0.02] pl-1.5 pr-3 text-sm font-bold text-ink-2">
                <span className={`size-1.5 rounded-full ${status[id]?.ok ? "bg-lime" : "bg-rose"}`} />
                {exchanges[id].name}<span className="font-mono text-xs text-ink-3">{status[id]?.count ?? 0} {({ uk: "продуктів", en: "products", ru: "продуктов" } as const)[lang]}</span>
              </span>
            ))}
          </div>
        </header>
        <div className="mt-8">
          <EarnBoard offers={offers} popular={POPULAR} exchanges={exchanges} t={t} lang={lang} hedge={hedge} prices={usedPx} />
        </div>
        <p className="mt-8 text-xs text-ink-3">{t.aprHub.note}</p>
      </main>
      <Footer t={t} fetchedAt={fetchedAt} lang={lang} />
    </>
  );
}
