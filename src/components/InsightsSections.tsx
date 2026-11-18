import type { Locale } from "@/lib/i18n";
import { PROX } from "@/lib/i18n-pro";
import type { getInsights } from "@/lib/insights";
import { venueOf } from "@/config/site";
import { shortDate } from "@/lib/format";
import { VenueLogo } from "./VenueLogo";
import { Hint } from "./Hint";

/**
 * "What happens to the token after a Launchpool" + "how APR decays" — formerly /insights/, now part of /history/
 * (audit 14.11: two half-pages about the same pools; the old address redirects to /history/#after).
 */
const chg = (x: number | undefined, base: number) => {
  if (x === undefined) return <span className="text-ink-3">—</span>;
  const v = (x / base - 1) * 100;
  return <span className={v >= 0 ? "text-lime" : "text-rose"}>{v >= 0 ? "+" : ""}{v.toFixed(0)}%</span>;
};
const medTxt = (v?: number) => (v === undefined ? "—" : `${v >= 0 ? "+" : ""}${v.toFixed(0)}%`);

const FIRST = 25;
const D90 = { uk: "+90 днів", en: "+90 days", ru: "+90 дней" } as const;
const MORE_ROWS = { uk: (n: number) => `Показати ще ${n}`, en: (n: number) => `Show ${n} more`, ru: (n: number) => `Показать ещё ${n}` } as const;
const LESS_ROWS = { uk: "Згорнути", en: "Show less", ru: "Свернуть" } as const;

export function InsightsSections({ lang, data }: { lang: Locale; data: Awaited<ReturnType<typeof getInsights>> }) {
  const P = PROX[lang];
  const { after, decay, median, decayMedian } = data;
  return (
    <div id="after" className="scroll-mt-20">
        <section className="mt-12">
          <h2 className="flex flex-wrap items-center gap-2 font-display text-2xl font-semibold tracking-tight">{P.listTitle} <Hint lang={lang}>{P.listSub}</Hint></h2>
          {after.length === 0 ? <p className="mt-6 text-ink-3">{P.noData}</p> : (
            <>
              <dl className="mt-6 grid max-w-2xl grid-cols-2 gap-3 sm:grid-cols-4">
                {([["+7", median.d7], ["+30", median.d30], ["+90", median.d90], [P.listCols[5], median.now]] as const).map(([l, v]) => (
                  <div key={l} className="rounded-2xl border border-line bg-white/[0.02] px-4 py-3.5">
                    <dd className={`font-display text-2xl font-semibold ${v !== undefined && v < 0 ? "text-rose" : "text-lime"}`}>{medTxt(v)}</dd>
                    <dt className="mt-1 text-xs font-semibold text-ink-3">{P.median} · {l}</dt>
                  </div>
                ))}
              </dl>
              {/* up to 2 years of pools: the first rows show, the rest open with a CSS-only toggle (no JS) */}
              <div className="group">
              <div tabIndex={0} role="region" aria-label={`${P.listTitle} — ${({ uk: "гортайте вбік", en: "scroll sideways", ru: "листайте вбок" } as const)[lang]}`} className="mt-6 overflow-x-auto rounded-2xl border border-line">
                <table className="w-full min-w-[720px] text-left text-sm">
                  <thead className="bg-white/[0.03] text-xs font-bold uppercase tracking-wider text-ink-3">
                    <tr>{[...P.listCols.slice(0, 5), D90[lang], P.listCols[5]].map((c, i) => <th key={c} className={`px-4 py-3 ${i >= 3 ? "text-right" : ""}`}>{c}</th>)}</tr>
                  </thead>
                  <tbody className="divide-y divide-line">
                    {after.map((a, i) => (
                      <tr key={a.token} className={`hover:bg-white/[0.02] ${i >= FIRST ? "hidden group-has-[:checked]:table-row" : ""}`}>
                        <td className="px-4 py-2.5 font-bold">{a.token}</td>
                        <td className="px-4 py-2.5"><span className="flex items-center gap-2 text-ink-2"><VenueLogo v={venueOf(a.exchange)} size={20} rounded="rounded-md" />{venueOf(a.exchange).name}</span></td>
                        <td className="px-4 py-2.5 font-mono text-xs text-ink-2">{shortDate(a.start, lang)}</td>
                        <td className="px-4 py-2.5 text-right font-mono text-xs font-bold">{chg(a.d7, a.d0)}</td>
                        <td className="px-4 py-2.5 text-right font-mono text-xs font-bold">{chg(a.d30, a.d0)}</td>
                        <td className="px-4 py-2.5 text-right font-mono text-xs font-bold">{chg(a.d90, a.d0)}</td>
                        <td className="px-4 py-2.5 text-right font-mono text-xs font-bold">{chg(a.now, a.d0)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {after.length > FIRST && (
                <label className="btn btn-ghost mt-3 h-10 cursor-pointer px-4 text-sm">
                  <input type="checkbox" className="sr-only" />
                  <span className="group-has-[:checked]:hidden">{MORE_ROWS[lang](after.length - FIRST)}</span>
                  <span className="hidden group-has-[:checked]:inline">{LESS_ROWS[lang]}</span>
                </label>
              )}
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
              <div tabIndex={0} role="region" aria-label={`${P.decayTitle} — ${({ uk: "гортайте вбік", en: "scroll sideways", ru: "листайте вбок" } as const)[lang]}`} className="mt-6 overflow-x-auto rounded-2xl border border-line">
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
    </div>
  );
}
