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
import { CheckSteps } from "@/components/CheckSteps";

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
      <main className="mx-auto max-w-7xl px-4 pb-20 pt-10 sm:px-6">
        <Link href={`/${lang}/learn/how`} className="text-sm font-bold text-ink-3 hover:text-ink">← {L.cards.how[0]}</Link>
        <div className="mt-5 flex items-center gap-3">
          <VenueLogo v={v} size={44} />
          <span className={`rounded-md px-2 py-0.5 text-xs font-bold ${LEVEL_CLS[g.level]}`} title={LEVEL_TXT[lang][g.level][1]}>{LEVEL_TXT[lang][g.level][0]}</span>
        </div>
        <h1 className="mt-4 max-w-4xl font-display text-3xl font-semibold tracking-tight sm:text-5xl">{g.title}</h1>
        <p className="mt-3 max-w-3xl text-ink-2 sm:text-lg">{g.sub}</p>

        {g.steps.length > 0 && <div className="mt-10"><CheckSteps id={`guide-${g.id}`} lang={lang} big cols={2} steps={g.steps.map((s) => ({ ...s, img: s.img ? withBase(s.img) : undefined }))} /></div>}

        {g.sections?.map((s) => (
          <section key={s.title} className="mt-12">
            <div className="flex flex-wrap items-center gap-3">
              <h2 className="font-display text-2xl font-semibold tracking-tight">{s.title}</h2>
              <span className={`rounded-md px-2 py-0.5 text-xs font-bold ${LEVEL_CLS[s.level]}`} title={LEVEL_TXT[lang][s.level][1]}>{LEVEL_TXT[lang][s.level][0]}</span>
            </div>
            <div className="mt-5"><CheckSteps id={`guide-${g.id}-${s.title}`} lang={lang} cols={2} steps={s.steps} /></div>
            <a href={s.url} target="_blank" rel="noopener" className="mt-4 inline-block text-sm font-bold text-lime hover:underline">{new URL(s.url).hostname.replace(/^www\./, "")} ↗</a>
          </section>
        ))}

        {g.facts.length > 0 && (
          <ul className="mt-8 grid gap-x-8 gap-y-2 rounded-2xl border border-line bg-white/[0.02] p-5 text-sm leading-relaxed text-ink-2 md:grid-cols-2">
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
