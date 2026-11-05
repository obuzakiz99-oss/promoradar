import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getDict, isLocale } from "@/lib/i18n";
import { LEARN } from "@/lib/i18n-learn";
import { Footer } from "@/components/Sections";
import { LearnHeader, Steps } from "@/components/LearnNav";

type Params = Promise<{ lang: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { lang } = await params;
  if (!isLocale(lang)) return {};
  return { title: LEARN[lang].start.title, description: LEARN[lang].start.sub };
}

export default async function LearnStart({ params }: { params: Params }) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  const t = getDict(lang), S = LEARN[lang].start;
  return (
    <>
      <main className="mx-auto max-w-3xl px-4 pb-20 pt-10 sm:px-6">
        <LearnHeader lang={lang} active="start" title={S.title} sub={S.sub} />
        <div className="mt-8"><Steps steps={S.steps} /></div>
        <p className="mt-6 rounded-2xl border border-amber/25 bg-amber/[0.06] px-5 py-4 text-sm leading-relaxed text-ink-2">💡 {S.tip}</p>
        <Link href={`/${lang}/learn/quiz`} className="btn btn-primary mt-6 h-12 px-6 text-base">{S.next.split(":")[0]} → {LEARN[lang].cards.quiz[0]}</Link>
        <p className="mt-3 text-sm text-ink-3">{S.next}</p>
      </main>
      <Footer t={t} fetchedAt={Date.now()} lang={lang} />
    </>
  );
}
