import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getDict, isLocale } from "@/lib/i18n";
import { LEARN } from "@/lib/i18n-learn";
import { Footer } from "@/components/Sections";
import { LEARN_ICON, LEARN_IDS } from "@/components/LearnNav";

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
      <main className="mx-auto max-w-7xl px-4 pb-20 pt-12 sm:px-6">
        <h1 className="font-display text-3xl font-semibold tracking-tight sm:text-5xl">🌱 {L.hubTitle}</h1>
        <p className="mt-3 max-w-2xl text-ink-2 sm:text-lg">{L.hubSub}</p>
        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {LEARN_IDS.map((id, i) => (
            <Link key={id} href={`/${lang}/learn/${id}`} className={`card group flex flex-col p-6 ${i === 0 ? "ring-1 ring-lime/40" : ""}`}>
              <span className="grid size-12 place-items-center rounded-2xl bg-lime/10 text-2xl">{LEARN_ICON[id]}</span>
              <h2 className="mt-5 text-lg font-bold">{L.cards[id][0]}</h2>
              <p className="mt-2 flex-1 text-sm leading-relaxed text-ink-2">{L.cards[id][1]}</p>
              <span className="mt-5 text-sm font-bold text-lime group-hover:underline">{L.open} →</span>
            </Link>
          ))}
        </div>
      </main>
      <Footer t={t} fetchedAt={Date.now()} lang={lang} />
    </>
  );
}
