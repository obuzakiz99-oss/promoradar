import type { Metadata } from "next";
import { YieldTabs } from "@/components/SectionTabs";
import { notFound } from "next/navigation";
import { getDict, isLocale } from "@/lib/i18n";
import { PROX } from "@/lib/i18n-pro";
import { getInsights } from "@/lib/insights";
import { venueOf } from "@/config/site";
import { shortDate } from "@/lib/format";
import { VenueLogo } from "@/components/VenueLogo";
import { Footer } from "@/components/Sections";
import { Hint } from "@/components/Hint";

export const revalidate = 3600;
type Params = Promise<{ lang: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { lang } = await params;
  if (!isLocale(lang)) return {};
  return { title: PROX[lang].insTitle, description: PROX[lang].insSub };
}

const chg = (x: number | undefined, base: number) => {
  if (x === undefined) return <span className="text-ink-3">—</span>;
  const v = (x / base - 1) * 100;
  return <span className={v >= 0 ? "text-lime" : "text-rose"}>{v >= 0 ? "+" : ""}{v.toFixed(0)}%</span>;
};
const medTxt = (v?: number) => (v === undefined ? "—" : `${v >= 0 ? "+" : ""}${v.toFixed(0)}%`);

export default async function InsightsPage({ params }: { params: Params }) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  const t = getDict(lang), P = PROX[lang];
  const { after, decay, median, decayMedian, fetchedAt } = await getInsights();
  return (
    <>
      <main className="mx-auto max-w-7xl px-4 pb-20 pt-10 sm:px-6">
        <YieldTabs lang={lang} active="insights" updated={fetchedAt} />
        <h1 className="mt-8 font-display text-3xl font-semibold tracking-tight sm:text-5xl">{P.insTitle}</h1>
        <p className="mt-3 max-w-3xl text-ink-2 sm:text-lg">{P.insSub}</p>

        <section className="mt-12">
          <h2 className="flex flex-wrap items-center gap-2 font-display text-2xl font-semibold tracking-tight">{P.listTitle} <Hint lang={lang}>{P.listSub}</Hint></h2>
          {after.length === 0 ? <p className="mt-6 text-ink-3">{P.noData}</p> : (
            <>
              <dl className="mt-6 grid max-w-xl grid-cols-3 gap-3">
                {([["+7", median.d7], ["+30", median.d30], [P.listCols[5], median.now]] as const).map(([l, v]) => (
                  <div key={l} className="rounded-2xl border border-line bg-white/[0.02] px-4 py-3.5">
                    <dd className={`font-display text-2xl font-semibold ${v !== undefined && v < 0 ? "text-rose" : "text-lime"}`}>{medTxt(v)}</dd>
                    <dt className="mt-1 text-xs font-semibold text-ink-3">{P.median} · {l}</dt>
                  </div>
                ))}
              </dl>
              <div className="mt-6 overflow-x-auto rounded-2xl border border-line">
                <table className="w-full min-w-[640px] text-left text-sm">
                  <thead className="bg-white/[0.03] text-xs font-bold uppercase tracking-wider text-ink-3">
                    <tr>{P.listCols.map((c, i) => <th key={c} className={`px-4 py-3 ${i >= 3 ? "text-right" : ""}`}>{c}</th>)}</tr>
                  </thead>
                  <tbody className="divide-y divide-line">
                    {after.map((a) => (
                      <tr key={a.token} className="hover:bg-white/[0.02]">
                        <td className="px-4 py-2.5 font-bold">{a.token}</td>
                        <td className="px-4 py-2.5"><span className="flex items-center gap-2 text-ink-2"><VenueLogo v={venueOf(a.exchange)} size={20} rounded="rounded-md" />{venueOf(a.exchange).name}</span></td>
                        <td className="px-4 py-2.5 font-mono text-xs text-ink-2">{shortDate(a.start, lang)}</td>
                        <td className="px-4 py-2.5 text-right font-mono text-xs font-bold">{chg(a.d7, a.d0)}</td>
                        <td className="px-4 py-2.5 text-right font-mono text-xs font-bold">{chg(a.d30, a.d0)}</td>
                        <td className="px-4 py-2.5 text-right font-mono text-xs font-bold">{chg(a.now, a.d0)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="mt-3 text-xs text-ink-3">{P.method}</p>
            </>
          )}
        </section>

        <section className="mt-16">
          <h2 className="flex flex-wrap items-center gap-2 font-display text-2xl font-semibold tracking-tight">{P.decayTitle} <Hint lang={lang}>{P.decaySub}</Hint></h2>
          {decay.length === 0 ? <p className="mt-6 text-ink-3">{P.noData}</p> : (
            <>
              {decayMedian !== undefined && (
                <div className="mt-6 w-fit rounded-2xl border border-line bg-white/[0.02] px-5 py-4">
                  <div className="font-display text-3xl font-semibold text-amber">×{decayMedian.toFixed(2)}</div>
                  <div className="mt-1 text-xs font-semibold text-ink-3">{P.median} · {P.decayCols[3]}</div>
                </div>
              )}
              <div className="mt-6 overflow-x-auto rounded-2xl border border-line">
                <table className="w-full min-w-[520px] text-left text-sm">
                  <thead className="bg-white/[0.03] text-xs font-bold uppercase tracking-wider text-ink-3">
                    <tr>{P.decayCols.map((c, i) => <th key={c} className={`px-4 py-3 ${i >= 1 ? "text-right" : ""}`}>{c}</th>)}</tr>
                  </thead>
                  <tbody className="divide-y divide-line">
                    {decay.map((d, i) => (
                      <tr key={i} className="hover:bg-white/[0.02]">
                        <td className="px-4 py-2.5 font-bold">{d.name} <span className="font-normal text-ink-3">· {d.stake}</span></td>
                        <td className="px-4 py-2.5 text-right font-mono text-xs">{d.start.toFixed(1)}%</td>
                        <td className="px-4 py-2.5 text-right font-mono text-xs">{d.final.toFixed(1)}%</td>
                        <td className={`px-4 py-2.5 text-right font-mono text-xs font-bold ${d.final < d.start ? "text-amber" : "text-lime"}`}>×{(d.final / d.start).toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </section>
      </main>
      <Footer t={t} fetchedAt={fetchedAt} lang={lang} />
    </>
  );
}
