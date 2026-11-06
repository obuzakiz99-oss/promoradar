import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getDict, isLocale } from "@/lib/i18n";
import { getPromos } from "@/lib/promos";
import { getPmRewards } from "@/lib/pmrewards";
import { DROP_ICON, DROP_LEVEL, DROP_TEXT, DROP_TYPES, dropType } from "@/lib/drops";
import { LEVEL_CLS, LEVEL_TXT } from "@/lib/level";
import { slugOf } from "@/lib/slug";
import { withBase } from "@/lib/base";
import { VenueLogo } from "@/components/VenueLogo";
import { Updated } from "@/components/Updated";
import { Footer } from "@/components/Sections";

export const revalidate = 900;
type Params = Promise<{ lang: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { lang } = await params;
  if (!isLocale(lang)) return {};
  return { title: DROP_TEXT[lang].page.title, description: DROP_TEXT[lang].page.sub };
}

export default async function DropsPage({ params }: { params: Params }) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  const t = getDict(lang), D = DROP_TEXT[lang], P = D.page;
  const [{ promos, fetchedAt }, pm] = await Promise.all([getPromos(), getPmRewards()]);
  const live = promos.filter((p) => (!p.endsAt || p.endsAt > fetchedAt) && p.venue.kind !== "airdrop");
  const byType = Object.fromEntries(DROP_TYPES.map((k) => [k, live.filter((p) => dropType(p.title) === k)]));

  return (
    <>
      <main className="mx-auto max-w-6xl px-4 pb-20 pt-10 sm:px-6">
        <h1 className="font-display text-3xl font-semibold tracking-tight sm:text-5xl">🪂 {P.title}</h1>
        <p className="mt-3 max-w-3xl text-ink-2 sm:text-lg">{P.sub}</p>
        <div className="mt-4"><Updated at={fetchedAt} lang={lang} /></div>
        {/* jump links */}
        <nav className="mt-6 flex flex-wrap gap-2">
          {DROP_TYPES.map((k) => (
            <a key={k} href={`#${k}`} className="flex h-9 items-center gap-1.5 rounded-full border border-line bg-white/[0.02] px-3.5 text-xs font-bold text-ink-2 hover:text-ink">
              {DROP_ICON[k]} {D[k].title} <span className="font-mono text-ink-3">{byType[k].length}</span>
            </a>
          ))}
          <a href="#polymarket" className="adv flex h-9 items-center gap-1.5 rounded-full border border-line bg-white/[0.02] px-3.5 text-xs font-bold text-ink-2 hover:text-ink">🎯 Polymarket</a>
        </nav>

        {DROP_TYPES.map((k) => {
          const lvl = DROP_LEVEL[k], list = byType[k];
          return (
            <section key={k} id={k} className={`mt-14 scroll-mt-20 ${lvl === "hard" ? "adv" : ""}`}>
              <div className="flex flex-wrap items-center gap-3">
                <h2 className="font-display text-2xl font-semibold tracking-tight">{DROP_ICON[k]} {D[k].title}</h2>
                <span className={`rounded-md px-2 py-0.5 text-xs font-bold ${LEVEL_CLS[lvl]}`} title={LEVEL_TXT[lang][lvl][1]}>{LEVEL_TXT[lang][lvl][0]}</span>
              </div>
              <p className="mt-2 max-w-3xl text-ink-2">{D[k].what}</p>
              <div className="mt-5 grid gap-4 lg:grid-cols-[1fr_1.2fr]">
                <div className="card p-5 hover:transform-none">
                  <div className="text-xs font-bold uppercase tracking-wider text-lime">{P.how}</div>
                  <ol className="mt-3 space-y-2.5 text-sm">
                    {D[k].how.map((s, i) => (
                      <li key={i} className="flex gap-3"><span className="grid size-6 shrink-0 place-items-center rounded-md bg-lime/10 font-mono text-xs font-bold text-lime">{i + 1}</span><span className="text-ink-2">{s}</span></li>
                    ))}
                  </ol>
                  <p className="mt-4 border-t border-line pt-3 text-xs leading-relaxed text-ink-3">⚠️ <b className="text-ink-2">{P.risk}:</b> {D[k].risk}</p>
                </div>
                <div>
                  {list.length === 0 ? <p className="rounded-2xl border border-dashed border-line-2 px-5 py-8 text-center text-sm text-ink-3">{P.none}</p> : (
                    <ul className="space-y-2">
                      {list.slice(0, 8).map((p) => (
                        <li key={p.id}>
                          <a href={withBase(`/${lang}/p/${slugOf(p)}/`)} className="card flex items-center gap-3 p-3.5">
                            <VenueLogo v={p.venue} size={32} rounded="rounded-lg" />
                            <span className="min-w-0 flex-1">
                              <span className="block text-xs font-bold text-ink-3">{p.venue.name}</span>
                              <span className="block truncate text-sm font-semibold">{p.title}</span>
                            </span>
                            {p.reward?.label && <span className="shrink-0 font-mono text-xs font-bold text-lime">{p.reward.label}</span>}
                          </a>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            </section>
          );
        })}

        {/* Polymarket liquidity rewards */}
        <section id="polymarket" className="adv mt-16 scroll-mt-20">
          <div className="flex flex-wrap items-center gap-3">
            <h2 className="font-display text-2xl font-semibold tracking-tight">🎯 {P.pmTitle}</h2>
            <span className={`rounded-md px-2 py-0.5 text-xs font-bold ${LEVEL_CLS.hard}`}>{LEVEL_TXT[lang].hard[0]}</span>
          </div>
          <p className="mt-2 max-w-3xl text-ink-2">{P.pmSub}</p>
          <div className="mt-5 grid gap-4 lg:grid-cols-[1fr_1.2fr]">
            <div className="card p-5 hover:transform-none">
              <div className="text-xs font-bold uppercase tracking-wider text-lime">{P.how}</div>
              <ol className="mt-3 space-y-2.5 text-sm">
                {P.pmHow.map((s, i) => <li key={i} className="flex gap-3"><span className="grid size-6 shrink-0 place-items-center rounded-md bg-lime/10 font-mono text-xs font-bold text-lime">{i + 1}</span><span className="text-ink-2">{s}</span></li>)}
              </ol>
              <p className="mt-4 border-t border-line pt-3 text-xs leading-relaxed text-ink-3">⚠️ <b className="text-ink-2">{P.risk}:</b> {P.pmRisk}</p>
            </div>
            {!pm.ok ? <p className="rounded-2xl border border-dashed border-line-2 px-5 py-8 text-center text-sm text-ink-3">{P.pmNone}</p> : (
              <div className="overflow-x-auto rounded-2xl border border-line">
                <table className="w-full min-w-[520px] text-left text-sm">
                  <thead className="bg-white/[0.03] text-[11px] font-bold uppercase tracking-wider text-ink-3"><tr>{P.pmCols.map((c, i) => <th key={c} className={`px-4 py-3 ${i ? "text-right" : ""}`}>{c}</th>)}</tr></thead>
                  <tbody className="divide-y divide-line">
                    {pm.rows.slice(0, 15).map((r) => (
                      <tr key={r.slug} className="hover:bg-white/[0.02]">
                        <td className="px-4 py-2.5"><a href={`https://polymarket.com/market/${r.slug}`} target="_blank" rel="noopener" className="line-clamp-1 font-semibold hover:text-lime">{r.question}</a></td>
                        <td className="px-4 py-2.5 text-right font-mono text-xs font-bold text-lime">${r.daily.toLocaleString("en-US", { maximumFractionDigits: 0 })}</td>
                        <td className="px-4 py-2.5 text-right font-mono text-xs">{r.maxSpread !== undefined ? `±${r.maxSpread}¢` : "—"}</td>
                        <td className="px-4 py-2.5 text-right font-mono text-xs">{r.minSize ?? "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </section>
      </main>
      <Footer t={t} fetchedAt={fetchedAt} lang={lang} />
    </>
  );
}
