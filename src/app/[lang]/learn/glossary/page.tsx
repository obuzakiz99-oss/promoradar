import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getDict, isLocale } from "@/lib/i18n";
import { LEARN } from "@/lib/i18n-learn";
import { GLOSSARY } from "@/lib/glossary";
import { Footer } from "@/components/Sections";
import { LearnHeader } from "@/components/LearnNav";

type Params = Promise<{ lang: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { lang } = await params;
  if (!isLocale(lang)) return {};
  return { title: LEARN[lang].glossary.title, description: LEARN[lang].glossary.sub };
}

export default async function LearnGlossary({ params }: { params: Params }) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  const t = getDict(lang), G = LEARN[lang].glossary;
  const terms = Object.entries(GLOSSARY[lang]).sort((a, b) => a[1][0].localeCompare(b[1][0], lang));
  return (
    <>
      <main className="mx-auto max-w-4xl px-4 pb-20 pt-10 sm:px-6">
        <LearnHeader lang={lang} active="glossary" title={G.title} sub={G.sub} />
        <dl className="mt-8 grid gap-3 sm:grid-cols-2">
          {terms.map(([k, [name, def]]) => (
            <div key={k} id={k} className="card scroll-mt-20 p-5 hover:transform-none">
              <dt className="font-display text-lg font-semibold">{name}</dt>
              <dd className="mt-1.5 text-sm leading-relaxed text-ink-2">{def}</dd>
            </div>
          ))}
        </dl>
      </main>
      <Footer t={t} fetchedAt={Date.now()} lang={lang} />
    </>
  );
}
