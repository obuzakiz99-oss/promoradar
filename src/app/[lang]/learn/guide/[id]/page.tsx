import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getDict, isLocale } from "@/lib/i18n";
import { LEARN } from "@/lib/i18n-learn";
import { GUIDES, GUIDE_IDS } from "@/lib/guides";
import { LEVEL_CLS, LEVEL_TXT } from "@/lib/level";
import { venueOf } from "@/config/site";
import { withBase } from "@/lib/base";
import { shortDate } from "@/lib/format";
import { Footer } from "@/components/Sections";
import { VenueLogo } from "@/components/VenueLogo";

export const dynamicParams = false;
export function generateStaticParams() { return GUIDE_IDS.map((id) => ({ id })); }

type Params = Promise<{ lang: string; id: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { lang, id } = await params;
  if (!isLocale(lang)) return {};
  const g = GUIDES[lang].find((x) => x.id === id);
  return g ? { title: g.title, description: g.sub } : {};
}

export default async function GuidePage({ params }: { params: Params }) {
  const { lang, id } = await params;
  if (!isLocale(lang)) notFound();
  const g = GUIDES[lang].find((x) => x.id === id);
  if (!g) notFound();
  const t = getDict(lang), L = LEARN[lang], v = venueOf(g.venue);
  return (
    <>
      <main className="mx-auto max-w-3xl px-4 pb-20 pt-10 sm:px-6">
        <Link href={`/${lang}/learn/how`} className="text-sm font-bold text-ink-3 hover:text-ink">← {L.cards.how[0]}</Link>
        <div className="mt-5 flex items-center gap-3">
          <VenueLogo v={v} size={44} />
          <span className={`rounded-md px-2 py-0.5 text-xs font-bold ${LEVEL_CLS[g.level]}`} title={LEVEL_TXT[lang][g.level][1]}>{LEVEL_TXT[lang][g.level][0]}</span>
        </div>
        <h1 className="mt-4 font-display text-3xl font-semibold tracking-tight sm:text-5xl">{g.title}</h1>
        <p className="mt-3 text-ink-2 sm:text-lg">{g.sub}</p>

        <ol className={g.steps.length ? "mt-10 space-y-6" : "hidden"}>
          {g.steps.map((s, i) => (
            <li key={s.h} className="card p-5 hover:transform-none sm:p-6">
              <div className="flex gap-4">
                <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-lime/10 font-mono text-sm font-bold text-lime">{i + 1}</span>
                <div className="min-w-0">
                  <h2 className="text-lg font-bold">{s.h}</h2>
                  <p className="mt-1.5 text-sm leading-relaxed text-ink-2">{s.b}</p>
                </div>
              </div>
              {s.img && (
                // eslint-disable-next-line @next/next/no-img-element -- static export, plain img
                <img src={withBase(s.img)} alt={s.alt ?? ""} loading="lazy" className="mt-4 w-full rounded-xl border border-line" />
              )}
            </li>
          ))}
        </ol>

        {g.sections?.map((s) => (
          <section key={s.title} className="mt-12">
            <div className="flex flex-wrap items-center gap-3">
              <h2 className="font-display text-2xl font-semibold tracking-tight">{s.title}</h2>
              <span className={`rounded-md px-2 py-0.5 text-xs font-bold ${LEVEL_CLS[s.level]}`} title={LEVEL_TXT[lang][s.level][1]}>{LEVEL_TXT[lang][s.level][0]}</span>
            </div>
            <ol className="mt-5 space-y-3">
              {s.steps.map((st, i) => (
                <li key={st.h} className="card flex gap-4 p-5 hover:transform-none">
                  <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-lime/10 font-mono text-sm font-bold text-lime">{i + 1}</span>
                  <div className="min-w-0">
                    <h3 className="font-bold">{st.h}</h3>
                    <p className="mt-1 text-sm leading-relaxed text-ink-2">{st.b}</p>
                  </div>
                </li>
              ))}
            </ol>
            <a href={s.url} target="_blank" rel="noopener" className="mt-4 inline-block text-sm font-bold text-lime hover:underline">{new URL(s.url).hostname.replace(/^www\./, "")} ↗</a>
          </section>
        ))}

        {g.facts.length > 0 && (
          <ul className="mt-8 space-y-2 rounded-2xl border border-line bg-white/[0.02] p-5 text-sm leading-relaxed text-ink-2">
            {g.facts.map((f) => <li key={f}>• {f}</li>)}
          </ul>
        )}

        <div className="mt-8 flex flex-wrap items-center gap-3">
          <a href={g.url} target="_blank" rel="noopener" className="btn btn-primary h-12 px-6 text-base">{v.name} ↗</a>
          <span className="text-xs text-ink-3">{g.source} · {shortDate(Date.parse(g.checked), lang)} {new Date(g.checked).getFullYear()}</span>
        </div>
      </main>
      <Footer t={t} fetchedAt={Date.now()} lang={lang} />
    </>
  );
}
