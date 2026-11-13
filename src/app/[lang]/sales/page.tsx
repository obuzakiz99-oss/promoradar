import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CalendarTabs } from "@/components/SectionTabs";
import { getDict, isLocale, type Locale } from "@/lib/i18n";
import { getSales, SALES_SRC, type Sale } from "@/lib/sales";
import { duration } from "@/lib/format";
import { VenueLogo } from "@/components/VenueLogo";
import { CalAdd } from "@/components/CalAdd";
import { Hint } from "@/components/Hint";
import { Icon } from "@/components/Icon";
import { Footer } from "@/components/Sections";
import { coinMonogram } from "@/lib/coinlogo";
import { VENUES, SITE, venueOf } from "@/config/site";

export const revalidate = 3600;
type Params = Promise<{ lang: string }>;

const X: Record<Locale, {
  title: string; sub: string; how: string[]; risk: string; active: string; upcoming: string; none: string; noIco: string;
  kind: Record<Sale["kind"], string>; starts: string; ends: string; noDate: string; raised: string; val: string; open: string; src: string; cal: (n: string) => string;
}> = {
  uk: {
    title: "Токен-сейли: де і коли", sub: "Публічні продажі нових токенів — Launchpad бірж, Binance Wallet, IDO на лаунчпадах. Що йде зараз і що стартує найближчим часом.",
    how: ["Відкрийте сейл і перевірте умови: хто може брати участь, KYC, мінімальна і максимальна сума, як рахують розподіл.", "Підготуйте гроші заздалегідь: на біржі — USDT або токен біржі на спот-рахунку; для IDO — гаманець і стейблкоїни в потрібній мережі.", "Подайте заявку у вікно підписки, потім отримайте токени й дочекайтеся лістингу."],
    risk: "Сейл — це не гарантований дохід: після лістингу ціна може впасти нижче ціни сейлу. Приватні раунди та «пресейли» ми не показуємо — серед них багато скаму.",
    active: "Ідуть зараз", upcoming: "Скоро", none: "Зараз немає публічних сейлів.", noIco: "Список з ICO Drops зараз не завантажився — показані лише анонси бірж.",
    kind: { exchange: "Біржа", wallet: "Гаманець", launchpad: "Лаунчпад" }, starts: "старт через", ends: "кінець через", noDate: "дату ще не оголосили",
    raised: "Збирають", val: "Оцінка", open: "Деталі", src: "Список IDO / IEO: ICO Drops", cal: (n) => `Сейл ${n}`,
  },
  en: {
    title: "Token sales: where and when", sub: "Public sales of new tokens — exchange launchpads, Binance Wallet, IDOs on launchpads. What is live now and what starts soon.",
    how: ["Open the sale and check the rules: who can join, KYC, minimum and maximum amount, how the allocation works.", "Prepare the money in advance: on an exchange — USDT or the exchange token on spot; for an IDO — a wallet and stablecoins on the right chain.", "Subscribe in the window, then receive the tokens and wait for the listing."],
    risk: "A sale is not guaranteed profit: after the listing the price can fall below the sale price. We leave out private rounds and \"presales\" — many of them are scams.",
    active: "Live now", upcoming: "Coming up", none: "No public sales right now.", noIco: "The ICO Drops list did not load — only exchange announcements are shown.",
    kind: { exchange: "Exchange", wallet: "Wallet", launchpad: "Launchpad" }, starts: "starts in", ends: "ends in", noDate: "date not announced yet",
    raised: "Raising", val: "Valuation", open: "Details", src: "IDO / IEO list: ICO Drops", cal: (n) => `${n} sale`,
  },
  ru: {
    title: "Токен-сейлы: где и когда", sub: "Публичные продажи новых токенов — Launchpad бирж, Binance Wallet, IDO на лаунчпадах. Что идёт сейчас и что стартует в ближайшее время.",
    how: ["Откройте сейл и проверьте условия: кто может участвовать, KYC, минимальная и максимальная сумма, как считают распределение.", "Подготовьте деньги заранее: на бирже — USDT или токен биржи на спот-счёте; для IDO — кошелёк и стейблкоины в нужной сети.", "Подайте заявку в окно подписки, затем получите токены и дождитесь листинга."],
    risk: "Сейл — не гарантированный доход: после листинга цена может упасть ниже цены сейла. Приватные раунды и «пресейлы» мы не показываем — среди них много скама.",
    active: "Идут сейчас", upcoming: "Скоро", none: "Сейчас нет публичных сейлов.", noIco: "Список с ICO Drops сейчас не загрузился — показаны только анонсы бирж.",
    kind: { exchange: "Биржа", wallet: "Кошелёк", launchpad: "Лаунчпад" }, starts: "старт через", ends: "конец через", noDate: "дату ещё не объявили",
    raised: "Собирают", val: "Оценка", open: "Детали", src: "Список IDO / IEO: ICO Drops", cal: (n) => `Сейл ${n}`,
  },
};
const KIND_CLS: Record<Sale["kind"], string> = { exchange: "bg-lime/10 text-lime", wallet: "bg-amber/10 text-amber", launchpad: "bg-sky/10 text-sky" };

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { lang } = await params;
  if (!isLocale(lang)) return {};
  return { title: X[lang].title, description: X[lang].sub };
}

export default async function SalesPage({ params }: { params: Params }) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  const t = getDict(lang), T = X[lang];
  const { sales, fetchedAt, icoOk } = await getSales(lang);
  const now = fetchedAt;
  const logoOf = (s: Sale) => (s.venueId && VENUES[s.venueId] ? venueOf(s.venueId) : { name: s.name, logo: s.logo, color: "#2a313b", ink: "#eef2f6", monogram: coinMonogram(s.ticker ?? s.name) });

  const Row = ({ s }: { s: Sale }) => {
    const at = s.status === "upcoming" ? s.startsAt : s.endsAt;
    return (
      <li className="card flex flex-wrap items-center gap-x-4 gap-y-3 p-4 hover:transform-none">
        <VenueLogo v={logoOf(s)} size={40} rounded="rounded-xl" />
        <div className="min-w-0 flex-1 basis-56">
          <div className="flex flex-wrap items-center gap-2">
            <span className="break-words font-bold">{s.name}</span>
            <span className={`rounded-md px-2 py-0.5 text-xs font-bold ${KIND_CLS[s.kind]}`}>{T.kind[s.kind]}</span>
          </div>
          <div className="mt-0.5 text-sm text-ink-2">{s.where}{s.category ? <span className="text-ink-3"> · {s.category}</span> : null}</div>
        </div>
        <div className="min-w-32 text-sm">
          <div className={`font-mono font-bold ${at && at - now < 2 * 86400_000 ? "text-amber" : "text-ink"}`}>
            {at ? `${s.status === "upcoming" ? T.starts : T.ends} ${duration(at - now, t.time)}` : <span className="font-sans font-normal text-ink-3">{T.noDate}</span>}
          </div>
          {(s.raised || s.valuation) && (
            <div className="mt-0.5 font-mono text-xs text-ink-3">{s.raised ? `${T.raised} ${s.raised}` : ""}{s.raised && s.valuation ? " · " : ""}{s.valuation ? `${T.val} ${s.valuation}` : ""}</div>
          )}
        </div>
        <div className="flex items-center gap-2">
          {at && at > now && <CalAdd lang={lang} file={`sale-${s.ticker ?? s.name}`} ev={{
            uid: s.id.replace(/[^a-z0-9]/gi, "-"), at: s.status === "upcoming" ? at - 3600_000 : at - 6 * 3600_000,
            title: T.cal(s.ticker ?? s.name), description: `${s.where}${s.raised ? ` · ${s.raised}` : ""}`,
            url: s.external ? s.source : `https://${SITE.domain.split("/")[0]}${s.href}`,
          }} />}
          <a href={s.href} {...(s.external ? { target: "_blank", rel: "noopener" } : {})} className="btn btn-ghost h-9 px-3.5 text-sm">{T.open}{s.external ? " ↗" : " →"}</a>
        </div>
      </li>
    );
  };

  const groups: Array<[string, Sale[]]> = [[T.active, sales.filter((s) => s.status === "active")], [T.upcoming, sales.filter((s) => s.status === "upcoming")]];
  return (
    <>
      <main className="mx-auto max-w-7xl px-4 pb-20 pt-10 sm:px-6">
        <CalendarTabs lang={lang} active="sales" updated={fetchedAt} />
        <h1 className="mt-8 font-display text-3xl font-semibold tracking-tight sm:text-5xl">{T.title}</h1>
        <p className="mt-3 max-w-3xl text-ink-2 sm:text-lg">{T.sub}</p>

        <div className="mt-6 grid gap-4 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
          <ol className="card space-y-2.5 p-5 text-sm hover:transform-none">
            {T.how.map((h, i) => (
              <li key={i} className="flex gap-3"><span className="grid size-6 shrink-0 place-items-center rounded-md bg-lime/10 font-mono text-xs font-bold text-lime">{i + 1}</span><span className="text-ink-2">{h}</span></li>
            ))}
          </ol>
          <p className="rounded-2xl border border-amber/30 bg-amber/[0.05] p-5 text-sm leading-relaxed text-ink-2"><Icon name="alert" className="text-amber" /> {T.risk}</p>
        </div>

        {!icoOk && <p className="mt-6 text-xs text-ink-3">{T.noIco}</p>}
        {sales.length === 0 ? <p className="mt-10 rounded-2xl border border-dashed border-line-2 p-8 text-center text-ink-2">{T.none}</p> : groups.filter(([, l]) => l.length).map(([h, l]) => (
          <section key={h} className="mt-10">
            <h2 className="font-display text-2xl font-semibold tracking-tight">{h} <span className="font-mono text-base text-ink-3">{l.length}</span></h2>
            <ul className="mt-4 space-y-2">{l.map((s) => <Row key={s.id} s={s} />)}</ul>
          </section>
        ))}

        <p className="mt-6 text-xs text-ink-3"><a href={SALES_SRC} target="_blank" rel="noopener" className="font-bold text-ink-2 hover:text-ink">{T.src} ↗</a> <Hint lang={lang}>{T.risk}</Hint></p>
      </main>
      <Footer t={t} fetchedAt={fetchedAt} lang={lang} />
    </>
  );
}
