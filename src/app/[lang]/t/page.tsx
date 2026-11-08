import type { Metadata } from "next";
import { PromoTabs } from "@/components/SectionTabs";
import { notFound } from "next/navigation";
import { getDict, isLocale, type Locale } from "@/lib/i18n";
import { getTokens } from "@/lib/tokens";
import { withBase } from "@/lib/base";
import { TokenIndex, type TokenRow } from "@/components/TokenIndex";
import { Footer } from "@/components/Sections";

export const revalidate = 900;
type Params = Promise<{ lang: string }>;

const TX: Record<Locale, { title: string; sub: string; search: string; promos: string; lp: string; earn: string; best: string; empty: string }> = {
  uk: { title: "Токени", sub: "Оберіть монету — покажемо всі акції, де її роздають, Launchpool і найкращі ставки стейкінгу на всіх біржах.", search: "Пошук: SOL, KOR, USDT…", promos: "акцій", lp: "Launchpool", earn: "Earn до", best: "Найцікавіші зараз", empty: "Нічого не знайдено" },
  en: { title: "Tokens", sub: "Pick a coin — we'll show every promo giving it away, its Launchpools and the best staking rates across all exchanges.", search: "Search: SOL, KOR, USDT…", promos: "promos", lp: "Launchpool", earn: "Earn up to", best: "Most interesting now", empty: "Nothing found" },
  ru: { title: "Токены", sub: "Выберите монету — покажем все акции, где её раздают, Launchpool и лучшие ставки стейкинга на всех биржах.", search: "Поиск: SOL, KOR, USDT…", promos: "акций", lp: "Launchpool", earn: "Earn до", best: "Самые интересные сейчас", empty: "Ничего не найдено" },
};

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { lang } = await params;
  if (!isLocale(lang)) return {};
  return { title: TX[lang].title, description: TX[lang].sub, alternates: { canonical: `/${lang}/t` } };
}

export default async function Tokens({ params }: { params: Params }) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  const t = getDict(lang), T = TX[lang];
  const { tokens, fetchedAt } = await getTokens(lang);
  const rows: TokenRow[] = [...tokens.values()].map((x) => ({
    sym: x.sym, logo: x.logo, href: withBase(`/${lang}/t/${x.sym}/`), promos: x.promos.length, lp: x.lpReward.length + x.lpStake.length,
    earnMax: x.earn.find((o) => !o.newUsers && o.apr <= 100)?.apr, score: x.promos.length * 3 + x.lpReward.length * 5 + x.lpStake.length + Math.min(x.earn.length, 5),
  })).sort((a, b) => b.score - a.score);
  return (
    <>
      <main className="mx-auto max-w-7xl px-4 pb-20 pt-10 sm:px-6">
        <PromoTabs lang={lang} active="tokens" />
        <h1 className="mt-8 font-display text-3xl font-semibold tracking-tight sm:text-5xl">{T.title}</h1>
        <p className="mt-2 max-w-2xl text-ink-2">{T.sub}</p>
        <TokenIndex rows={rows} labels={{ search: T.search, promos: T.promos, lp: T.lp, earn: T.earn, empty: T.empty }} />
      </main>
      <Footer t={t} fetchedAt={fetchedAt} lang={lang} />
    </>
  );
}
