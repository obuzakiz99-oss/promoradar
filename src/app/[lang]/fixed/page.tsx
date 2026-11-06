import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getDict, isLocale } from "@/lib/i18n";
import { PROX } from "@/lib/i18n-pro";
import { getFixed } from "@/lib/fixed";
import { shortDate } from "@/lib/format";
import { TraderTabs } from "@/components/TraderTabs";
import { Term } from "@/components/Term";
import { Footer } from "@/components/Sections";

export const revalidate = 900;
type Params = Promise<{ lang: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { lang } = await params;
  if (!isLocale(lang)) return {};
  return { title: PROX[lang].fixTitle, description: PROX[lang].fixSub };
}

const usd = (x: number) => (x >= 1e9 ? `$${(x / 1e9).toFixed(1)}B` : `$${(x / 1e6).toFixed(1)}M`);

export default async function FixedPage({ params }: { params: Params }) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  const t = getDict(lang), P = PROX[lang];
  const { rows, fetchedAt } = await getFixed();
  return (
    <>
      <main className="mx-auto max-w-5xl px-4 pb-20 pt-10 sm:px-6">
        <TraderTabs lang={lang} active="fixed" updated={fetchedAt} />
        <h1 className="mt-8 font-display text-3xl font-semibold tracking-tight sm:text-5xl">📌 {P.fixTitle}</h1>
        <p className="mt-3 max-w-3xl text-ink-2 sm:text-lg">{P.fixSub}</p>
        {rows.length === 0 ? <p className="mt-8 text-ink-3">{P.noData}</p> : (
          <div className="mt-8 overflow-x-auto rounded-2xl border border-line">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead className="bg-white/[0.03] text-[11px] font-bold uppercase tracking-wider text-ink-3">
                <tr>{P.fixCols.map((c, i) => <th key={c} className={`px-4 py-3 ${i >= 2 ? "text-right" : ""}`}>{i === 2 ? <Term k="apy" lang={lang}>{c}</Term> : c}</th>)}</tr>
              </thead>
              <tbody className="divide-y divide-line">
                {rows.map((r) => (
                  <tr key={r.url} className="hover:bg-white/[0.02]">
                    <td className="px-4 py-3 font-bold"><a href={r.url} target="_blank" rel="noopener" className="hover:text-lime">PT-{r.name} ↗</a></td>
                    <td className="px-4 py-3 text-ink-2">{r.chain}</td>
                    <td className="px-4 py-3 text-right font-mono font-bold text-lime">{r.apy.toFixed(2)}%</td>
                    <td className="px-4 py-3 text-right font-mono text-xs text-ink-2">{shortDate(r.expiry, lang)} {new Date(r.expiry).getFullYear()} · {Math.round((r.expiry - fetchedAt) / 86400_000)} {P.days}</td>
                    <td className="px-4 py-3 text-right font-mono text-xs text-ink-3">{usd(r.liquidity)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <p className="mt-4 max-w-3xl text-xs leading-relaxed text-ink-3">{P.fixNote}</p>
      </main>
      <Footer t={t} fetchedAt={fetchedAt} lang={lang} />
    </>
  );
}
