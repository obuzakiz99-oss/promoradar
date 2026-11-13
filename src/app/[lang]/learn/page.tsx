import { TOOLS } from "@/lib/i18n-tools";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getDict, isLocale } from "@/lib/i18n";
import { LEARN } from "@/lib/i18n-learn";
import { Footer } from "@/components/Sections";
import { LEARN_ICON, LEARN_IDS } from "@/components/LearnNav";
import { LearnCards } from "@/components/LearnProgress";

type Params = Promise<{ lang: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { lang } = await params;
  if (!isLocale(lang)) return {};
  return { title: LEARN[lang].hubTitle, description: LEARN[lang].hubSub };
}

export default async function LearnHub({ params }: { params: Params }) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  const t = getDict(lang), L = LEARN[lang];
  return (
    <>
      <main className="mx-auto max-w-7xl px-4 pb-20 pt-10 sm:px-6">
        <h1 className="font-display text-3xl font-semibold tracking-tight sm:text-5xl">{L.hubTitle}</h1>
        <p className="mt-3 max-w-2xl text-ink-2 sm:text-lg">{L.hubSub}</p>
        <LearnCards lang={lang} startTotal={L.start.steps.length} promosHref={`/${lang}`} cards={[
          ...LEARN_IDS.map((id) => ({ id, href: `/${lang}/learn/${id}`, icon: LEARN_ICON[id], title: L.cards[id][0], sub: L.cards[id][1] })),
          { id: "check", href: `/${lang}/check`, icon: "search" as const, title: TOOLS[lang].tools.check[0], sub: TOOLS[lang].tools.check[1] },
        ]} />
      </main>
      <Footer t={t} fetchedAt={Date.now()} lang={lang} />
    </>
  );
}
