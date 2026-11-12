import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getDict, isLocale, type Locale } from "@/lib/i18n";
import { getPromos } from "@/lib/promos";
import { getPools } from "@/lib/pools";
import { getEarn } from "@/lib/earn";
import { scorecards } from "@/lib/scorecards";
import { withBase } from "@/lib/base";
import { ScoreBoard } from "@/components/ScoreBoard";
import { Footer } from "@/components/Sections";

export const revalidate = 900;
type Params = Promise<{ lang: string }>;

const TX: Record<Locale, { title: string; sub: string }> = {
  uk: { title: "Рейтинг бірж за акціями", sub: "Де зараз найбільше можна отримати: кількість акцій, суми на одну людину, поріг входу, Launchpool і ставки — для вашої країни." },
  en: { title: "Exchange ranking by promos", sub: "Where there is most to get right now: number of promos, amounts per person, entry threshold, Launchpools and rates — for your country." },
  ru: { title: "Рейтинг бирж по акциям", sub: "Где сейчас больше всего можно получить: количество акций, суммы на одного человека, порог входа, Launchpool и ставки — для вашей страны." },
};

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { lang } = await params;
  if (!isLocale(lang)) return {};
  // hidden for now (owner, 12.11): not in the menu or sitemap, and not indexed — remove `robots` to bring it back
  return { title: TX[lang].title, description: TX[lang].sub, alternates: { canonical: `/${lang}/exchanges` }, robots: { index: false, follow: false } };
}

export default async function Exchanges({ params }: { params: Params }) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  const t = getDict(lang);
  const [{ promos, details, fetchedAt }, pools, earn] = await Promise.all([getPromos(lang), getPools().catch(() => null), getEarn().catch(() => null)]);
  const data = scorecards(promos, details ?? {}, pools?.projects ?? [], earn?.offers ?? [], fetchedAt);
  return (
    <>
      <main className="mx-auto max-w-7xl px-4 pb-20 pt-10 sm:px-6">
        <h1 className="font-display text-3xl font-semibold tracking-tight sm:text-5xl">{TX[lang].title}</h1>
        <p className="mt-2 max-w-3xl text-ink-2">{TX[lang].sub}</p>
        <ScoreBoard data={data} lang={lang} venueBase={withBase(`/${lang}/v/`)} />
      </main>
      <Footer t={t} fetchedAt={fetchedAt} lang={lang} />
    </>
  );
}
