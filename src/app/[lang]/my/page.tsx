import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getDict, isLocale } from "@/lib/i18n";
import { TOOLS } from "@/lib/i18n-tools";
import { getPromos } from "@/lib/promos";
import { slugOf } from "@/lib/slug";
import { withBase } from "@/lib/base";
import { MyBoard, type MyPromo } from "@/components/MyBoard";
import { PageHeader } from "@/components/PageHeader";
import { Footer } from "@/components/Sections";

export const revalidate = 900;
type Params = Promise<{ lang: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { lang } = await params;
  if (!isLocale(lang)) return {};
  return { title: TOOLS[lang].myTitle, robots: { index: false } };
}

export default async function My({ params }: { params: Params }) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  const t = getDict(lang), T = TOOLS[lang];
  const { promos, fetchedAt } = await getPromos(lang);
  const light: MyPromo[] = promos.map((p) => ({
    id: p.id, title: p.title, venue: p.venue, url: p.url, href: withBase(`/${lang}/p/${slugOf(p)}/`), endsAt: p.endsAt, category: p.category, reward: p.reward?.label,
  }));
  return (
    <>
      <main className="mx-auto max-w-6xl px-4 pb-20 pt-10 sm:px-6">
        <PageHeader lang={lang} title={T.myTitle} sub={T.mySub} nav={<a href={withBase(`/${lang}/#promos`)} className="inline-flex min-h-11 items-center text-sm font-bold text-ink-3 hover:text-ink">← {({"uk":"Усі акції","en":"All promos","ru":"Все акции"} as Record<string, string>)[lang]}</a>} />
        <MyBoard promos={light} lang={lang} />
      </main>
      <Footer t={t} fetchedAt={fetchedAt} lang={lang} />
    </>
  );
}
