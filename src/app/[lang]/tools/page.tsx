import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getDict, isLocale } from "@/lib/i18n";
import { TOOLS } from "@/lib/i18n-tools";
import { Footer } from "@/components/Sections";
import { TOOL_ICON, TOOL_IDS } from "@/components/ToolsNav";

type Params = Promise<{ lang: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { lang } = await params;
  if (!isLocale(lang)) return {};
  return { title: TOOLS[lang].hubTitle, description: TOOLS[lang].hubSub };
}

export default async function ToolsHub({ params }: { params: Params }) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  const t = getDict(lang), T = TOOLS[lang];
  return (
    <>
      <main className="mx-auto max-w-7xl px-4 pb-20 pt-12 sm:px-6">
        <h1 className="font-display text-3xl font-semibold tracking-tight sm:text-5xl">{T.hubTitle}</h1>
        <p className="mt-3 max-w-2xl text-ink-2 sm:text-lg">{T.hubSub}</p>
        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {TOOL_IDS.map((id) => (
            <Link key={id} href={`/${lang}/${id}`} className={`card group flex flex-col p-6 ${id === "hedge" ? "adv" : ""}`}>
              <span className="grid size-12 place-items-center rounded-2xl bg-lime/10 text-2xl">{TOOL_ICON[id]}</span>
              <h2 className="mt-5 text-lg font-bold">{T.tools[id][0]}</h2>
              <p className="mt-2 flex-1 text-sm leading-relaxed text-ink-2">{T.tools[id][1]}</p>
              <span className="mt-5 text-sm font-bold text-lime group-hover:underline">{T.open} →</span>
            </Link>
          ))}
        </div>
      </main>
      <Footer t={t} fetchedAt={Date.now()} lang={lang} />
    </>
  );
}
