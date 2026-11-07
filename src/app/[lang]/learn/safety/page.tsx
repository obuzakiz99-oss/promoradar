import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getDict, isLocale } from "@/lib/i18n";
import { LEARN } from "@/lib/i18n-learn";
import { Footer } from "@/components/Sections";
import { LearnHeader } from "@/components/LearnNav";

type Params = Promise<{ lang: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { lang } = await params;
  if (!isLocale(lang)) return {};
  return { title: LEARN[lang].safety.title, description: LEARN[lang].safety.sub };
}

export default async function LearnSafety({ params }: { params: Params }) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  const t = getDict(lang), S = LEARN[lang].safety;
  return (
    <>
      <main className="mx-auto max-w-4xl px-4 pb-20 pt-10 sm:px-6">
        <LearnHeader lang={lang} active="safety" title={S.title} sub={S.sub} />
        <div className="mt-8 grid grid-cols-1 gap-3 sm:grid-cols-2">
          {S.rules.map(([h, b], i) => (
            <div key={h} className="card p-5 hover:transform-none">
              <div className="flex items-start gap-3">
                <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-teal/10 font-mono text-xs font-bold text-teal">{i + 1}</span>
                <div>
                  <h3 className="font-bold leading-snug">{h}</h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-ink-2">{b}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </main>
      <Footer t={t} fetchedAt={Date.now()} lang={lang} />
    </>
  );
}
