import { alt, withOg } from "@/lib/seo";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getDict, isLocale, type Locale } from "@/lib/i18n";
import { getPromos } from "@/lib/promos";
import { PromoTabs } from "@/components/SectionTabs";
import { PromoCard } from "@/components/PromoCard";
import { Updated } from "@/components/Updated";
import { Footer } from "@/components/Sections";
import type { Promo } from "@/lib/types";

/**
 * "0% fees" page (owner 21.11: the "0% комісії" tab on the promo list was hard to find — own page + menu entry).
 * The same set as that tab (meta.zeroFee, lib/zerofee.ts): standing offers first, then time-limited campaigns by end date.
 */
export const revalidate = 900;
type Params = Promise<{ lang: string }>;

const TX: Record<Locale, { title: string; sub: string; standing: string; standingSub: string; temp: string; tempSub: string; none: string; watch: string; tips: string[] }> = {
  uk: {
    title: "0% комісії: де торгувати без комісії",
    sub: "Біржі й DEX, які зараз не беруть комісію за торгівлю: постійно або в межах акції. Список оновлюється автоматично з оголошень бірж.",
    standing: "Постійно", standingSub: "Діють без дати завершення.",
    temp: "Акції на час", tempSub: "Нуль комісій лише до кінця кампанії. Першими стоять ті, що закінчуються раніше.",
    none: "Зараз таких акцій немає. Загляньте пізніше.",
    watch: "На що звернути увагу",
    tips: [
      "Часто 0% діє лише на окремі пари або лише для maker-ордерів. Ринкова заявка може й далі платити комісію.",
      "Без комісії спред буває ширшим: порівняйте ціну з іншою біржею, перш ніж торгувати великим обсягом.",
      "Деякі акції лише для нових користувачів, певних країн або після KYC.",
      "Обсяг на парах з нульовою комісією зазвичай не зараховується в інші змагання та VIP-рівні.",
    ],
  },
  en: {
    title: "Zero trading fees: where to trade with 0% fees",
    sub: "Exchanges and DEXs that currently charge no trading fees, either permanently or during a campaign. The list updates automatically from exchange announcements.",
    standing: "Ongoing", standingSub: "No end date.",
    temp: "Time-limited campaigns", tempSub: "Zero fees only until the campaign ends. The ones ending soonest come first.",
    none: "No such offers right now. Check back later.",
    watch: "What to check",
    tips: [
      "0% often applies only to certain pairs or only to maker orders. A market order may still pay a fee.",
      "Without fees the spread can be wider: compare the price with another exchange before trading large size.",
      "Some offers are only for new users, certain countries or after KYC.",
      "Volume on zero-fee pairs usually does not count toward other competitions or VIP tiers.",
    ],
  },
  ru: {
    title: "0% комиссии: где торговать без комиссии",
    sub: "Биржи и DEX, которые сейчас не берут комиссию за торговлю: постоянно или в рамках акции. Список обновляется автоматически из объявлений бирж.",
    standing: "Постоянно", standingSub: "Действуют без даты окончания.",
    temp: "Акции на время", tempSub: "Ноль комиссий только до конца кампании. Первыми идут те, что заканчиваются раньше.",
    none: "Сейчас таких акций нет. Загляните позже.",
    watch: "На что обратить внимание",
    tips: [
      "Часто 0% действует только на отдельные пары или только для maker-ордеров. Рыночная заявка может по-прежнему платить комиссию.",
      "Без комиссии спред бывает шире: сравните цену с другой биржей, прежде чем торговать большим объёмом.",
      "Некоторые акции только для новых пользователей, определённых стран или после KYC.",
      "Объём на парах с нулевой комиссией обычно не засчитывается в другие соревнования и VIP-уровни.",
    ],
  },
};

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { lang } = await params;
  if (!isLocale(lang)) return {};
  return withOg({ alternates: alt(lang, "/zero-fees"), title: TX[lang].title, description: TX[lang].sub });
}

export default async function ZeroFees({ params }: { params: Params }) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  const t = getDict(lang), T = TX[lang];
  const { promos, fetchedAt } = await getPromos(lang);
  const live = promos.filter((p) => p.meta?.zeroFee && (!p.endsAt || p.endsAt > fetchedAt));
  const standing = live.filter((p) => p.meta?.standing);
  // region-only offers (P2P South Asia, Kenya…) last: the list on the home page hides them by the visitor's country, here they
  // stay visible with their "only for …" badge
  const temp = live.filter((p) => !p.meta?.standing).sort((a, b) => Number(!!a.meta?.geo?.only) - Number(!!b.meta?.geo?.only) || (a.endsAt ?? Infinity) - (b.endsAt ?? Infinity) || b.publishedAt - a.publishedAt);
  const groups: Array<{ id: string; title: string; sub: string; list: Promo[] }> = [
    { id: "standing", title: T.standing, sub: T.standingSub, list: standing },
    { id: "campaigns", title: T.temp, sub: T.tempSub, list: temp },
  ];

  return (
    <>
      <main className="mx-auto max-w-7xl px-4 pb-20 pt-10 sm:px-6">
        <PromoTabs lang={lang} active="zerofee" />
        <h1 className="mt-8 font-display text-3xl font-semibold tracking-tight sm:text-5xl">{T.title}</h1>
        <p className="mt-3 max-w-3xl text-ink-2 sm:text-lg">{T.sub}</p>
        <div className="mt-4"><Updated at={fetchedAt} lang={lang} /></div>

        {live.length === 0 ? <p className="mt-10 text-ink-3">{T.none}</p> : groups.filter((g) => g.list.length).map((g) => (
          <section key={g.id} id={g.id} className="mt-12 scroll-mt-20">
            <h2 className="font-display text-2xl font-semibold tracking-tight">{g.title} <span className="font-mono text-base text-ink-3">{g.list.length}</span></h2>
            <p className="mt-2 max-w-3xl text-ink-2">{g.sub}</p>
            <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {g.list.map((p, i) => <PromoCard key={p.id} p={p} t={t} lang={lang} now={fetchedAt} index={i} />)}
            </div>
          </section>
        ))}

        <section className="card mt-14 max-w-3xl p-6 hover:transform-none">
          <h2 className="text-lg font-bold">{T.watch}</h2>
          <ul className="mt-3 space-y-2 text-ink-2">
            {T.tips.map((x) => <li key={x} className="flex gap-2"><span className="text-lime" aria-hidden="true">•</span><span>{x}</span></li>)}
          </ul>
        </section>
        <p className="mt-8 text-xs text-ink-3">{t.footer.disclaimer}</p>
      </main>
      <Footer t={t} fetchedAt={fetchedAt} lang={lang} />
    </>
  );
}
