import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getDict, isLocale } from "@/lib/i18n";
import { TOOLS } from "@/lib/i18n-tools";
import { readHistory } from "@/lib/history";
import { venueOf } from "@/config/site";
import { LineChart, seriesColor, type Series } from "@/components/LineChart";
import { ToolHeader } from "@/components/ToolsNav";
import { Footer } from "@/components/Sections";

type Params = Promise<{ lang: string }>;
const COINS = ["USDT", "USDC", "BTC", "ETH"];

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { lang } = await params;
  if (!isLocale(lang)) return {};
  return { title: TOOLS[lang].histTitle, description: TOOLS[lang].histSub };
}

export default async function HistoryPage({ params }: { params: Params }) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  const t = getDict(lang), T = TOOLS[lang];
  const snaps = readHistory();
  const locale = lang === "uk" ? "uk-UA" : lang === "ru" ? "ru-RU" : "en-GB";

  const earnCharts = COINS.map((coin) => {
    const exs = [...new Set(snaps.flatMap((s) => Object.keys(s.earn?.[coin] ?? {})))];
    const series: Series[] = exs.map((ex, i) => ({
      name: venueOf(ex)?.name ?? ex, color: seriesColor(i),
      points: snaps.filter((s) => s.earn?.[coin]?.[ex] !== undefined).map((s) => [s.t, s.earn[coin][ex]] as [number, number]),
    })).filter((s) => s.points.length > 1);
    return { coin, series };
  }).filter((c) => c.series.length);

  const lastPools = snaps.length ? Object.keys(snaps[snaps.length - 1].pools ?? {}) : [];
  const poolSeries: Series[] = lastPools.map((k, i) => ({
    name: snaps[snaps.length - 1].pools[k].name, color: seriesColor(i),
    points: snaps.filter((s) => s.pools?.[k]).map((s) => [s.t, s.pools[k].apr] as [number, number]),
  })).filter((s) => s.points.length > 1);
  // very high APR pools would flatten the rest: split into two charts
  const hi = poolSeries.filter((s) => Math.max(...s.points.map((p) => p[1])) > 60), lo = poolSeries.filter((s) => !hi.includes(s));

  return (
    <>
      <main className="mx-auto max-w-6xl px-4 pb-20 pt-10 sm:px-6">
        <ToolHeader lang={lang} active="history" title={T.histTitle} sub={T.histSub} />
        {snaps.length < 2 ? (
          <div className="mt-10 rounded-3xl border border-dashed border-line-2 px-6 py-16 text-center text-ink-2">{T.noHistory}</div>
        ) : (
          <>
            <h2 className="mt-10 font-display text-2xl font-semibold tracking-tight">{T.histEarn}</h2>
            <div className="mt-5 grid gap-4 lg:grid-cols-2">
              {earnCharts.map((c) => (
                <div key={c.coin} className="card p-5 hover:transform-none">
                  <div className="mb-3 font-display text-lg font-semibold">{c.coin}</div>
                  <LineChart series={c.series} locale={locale} />
                </div>
              ))}
            </div>
            {(lo.length > 0 || hi.length > 0) && (
              <>
                <h2 className="mt-12 font-display text-2xl font-semibold tracking-tight">{T.histPools}</h2>
                <div className="mt-5 grid gap-4">
                  {[hi, lo].filter((g) => g.length).map((g, i) => (
                    <div key={i} className="card p-5 hover:transform-none"><LineChart series={g} locale={locale} height={240} /></div>
                  ))}
                </div>
              </>
            )}
            <p className="mt-6 font-mono text-xs text-ink-3">{snaps.length} snapshots · {new Date(snaps[0].t).toISOString().slice(0, 16)} → {new Date(snaps[snaps.length - 1].t).toISOString().slice(0, 16)} UTC</p>
          </>
        )}
      </main>
      <Footer t={t} fetchedAt={Date.now()} lang={lang} />
    </>
  );
}
