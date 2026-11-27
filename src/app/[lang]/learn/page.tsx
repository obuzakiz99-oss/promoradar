import { alt, withOg } from "@/lib/seo";
import { TOOLS } from "@/lib/i18n-tools";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getDict, isLocale } from "@/lib/i18n";
import { LEARN } from "@/lib/i18n-learn";
import { Footer } from "@/components/Sections";
import { LEARN_ICON, LEARN_IDS } from "@/components/LearnNav";
import { LearnCards } from "@/components/LearnProgress";
import { SiteTour, TourButton } from "@/components/SiteTour";
import { LEARN_TOUR } from "@/lib/tours/learn";
import { tourOf } from "@/lib/tours/types";
import Link from "next/link";
import { ARTICLES } from "@/lib/articles";
import { getPromos } from "@/lib/promos";
import { getEarn } from "@/lib/earn";
import { EasyStart } from "@/components/EasyStart";
import { EasyEarn } from "@/components/EasyEarn";

type Params = Promise<{ lang: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { lang } = await params;
  if (!isLocale(lang)) return {};
  return withOg({ alternates: alt(lang, "/learn"), title: LEARN[lang].hubTitle, description: LEARN[lang].hubSub });
}

export default async function LearnHub({ params }: { params: Params }) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  const t = getDict(lang), L = LEARN[lang];
  // owner 27.11: the beginners' tab also shows the easiest live offers and the simplest Earn — not only lessons
  const [{ promos, fetchedAt }, earn] = await Promise.all([getPromos(lang), getEarn().catch(() => ({ offers: [] }))]);
  return (
    <>
      <main className="mx-auto max-w-7xl px-4 pb-20 pt-10 sm:px-6">
        <h1 className="font-display text-3xl font-semibold tracking-tight sm:text-5xl">{L.hubTitle}</h1>
        <p className="mt-3 max-w-2xl text-ink-2 sm:text-lg">{L.hubSub}</p>
        <TourButton lang={lang} className="mt-2" />
        <LearnCards lang={lang} startTotal={L.start.steps.length} promosHref={`/${lang}`} cards={[
          ...LEARN_IDS.map((id) => ({ id, href: `/${lang}/learn/${id}`, icon: LEARN_ICON[id], title: L.cards[id][0], sub: L.cards[id][1] })),
          { id: "check", href: `/${lang}/check`, icon: "search" as const, title: TOOLS[lang].tools.check[0], sub: TOOLS[lang].tools.check[1] },
        ]} />
        <div className="-mx-4 sm:-mx-6"><EasyStart promos={promos} lang={lang} now={fetchedAt} /></div>
        <EasyEarn offers={earn.offers} lang={lang} />
        {/* search articles (owner 27.11): plain answers to what beginners google */}
        <h2 className="mt-12 font-display text-2xl font-semibold tracking-tight">{({ uk: "Статті", en: "Articles", ru: "Статьи" } as const)[lang]}</h2>
        <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
          {ARTICLES[lang].map((a) => (
            <Link key={a.id} href={`/${lang}/learn/a/${a.id}`} className="card block p-5">
              <div className="font-bold leading-snug text-ink">{a.title}</div>
              <p className="mt-1 text-sm text-ink-2">{a.sub}</p>
            </Link>
          ))}
        </div>
      </main>
      <Footer t={t} fetchedAt={Date.now()} lang={lang} />
      <SiteTour lang={lang} {...tourOf(LEARN_TOUR, lang)} />
    </>
  );
}
