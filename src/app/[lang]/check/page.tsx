import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getDict, isLocale } from "@/lib/i18n";
import { TOOLS } from "@/lib/i18n-tools";
import { officialList } from "./official";
import { ToolHeader } from "@/components/ToolsNav";
import { LinkCheck } from "@/components/LinkCheck";
import { Footer } from "@/components/Sections";

type Params = Promise<{ lang: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { lang } = await params;
  if (!isLocale(lang)) return {};
  return { title: TOOLS[lang].tools.check[0], description: TOOLS[lang].tools.check[1] };
}

export default async function CheckPage({ params }: { params: Params }) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  const t = getDict(lang), T = TOOLS[lang];
  return (
    <>
      <main className="mx-auto max-w-7xl px-4 pb-20 pt-10 sm:px-6">
        <ToolHeader lang={lang} active="check" title={T.tools.check[0]} sub={T.tools.check[1]} />
        <LinkCheck lang={lang} official={officialList()} />
      </main>
      <Footer t={t} fetchedAt={Date.now()} lang={lang} />
    </>
  );
}
