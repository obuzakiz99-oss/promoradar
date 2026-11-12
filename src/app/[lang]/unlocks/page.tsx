import type { Metadata } from "next";
import { CalendarTabs } from "@/components/SectionTabs";
import { notFound } from "next/navigation";
import { getDict, isLocale, type Locale } from "@/lib/i18n";
import { dropstabCoin, getUnlocks, isBig, UNLOCK_SRC, type Unlock } from "@/lib/unlocks";
import { trList } from "@/lib/translate";
import { getTokens } from "@/lib/tokens";
import { withBase } from "@/lib/base";
import { compactUsd, duration } from "@/lib/format";
import { VenueLogo } from "@/components/VenueLogo";
import { Footer } from "@/components/Sections";
import { impactOf, impactText, LEVEL_CLS, LEVEL_TXT } from "@/lib/unlock-impact";

export const revalidate = 3600;
type Params = Promise<{ lang: string }>;

const X: Record<Locale, {
  title: string; sub: string; how: string; big: string; bigSub: string; all: string; none: string;
  date: string; token: string; amount: string; pressure: string; who: string; kind: string; impact: string; impactNote: string;
  type: Record<Unlock["type"], string>; ofCap: string; ofSupply: string; already: string; src: string; note: string; down: string;
}> = {
  uk: {
    title: "Календар розлоків токенів",
    sub: "Коли команда, інвестори чи фонд отримують доступ до заблокованих токенів. Великий розлок = багато нових монет на ринку, і ціна часто слабшає ще до дати.",
    how: "Головна колонка — «Тиск»: вартість розлоку у відсотках від капіталізації. Від 1% — помітно, від 5% — дуже багато. «Лінійний» розлок розтягнутий у часі й тисне менше, ніж разовий.",
    big: "Великі розлоки", bigSub: "≥ 1% капіталізації або ≥ $10M", all: "Усі найближчі", none: "Немає даних про розлоки — джерело не відповіло. Спробуйте пізніше.",
    date: "Дата", token: "Токен", amount: "Скільки", pressure: "Тиск", who: "Кому", kind: "Тип", impact: "Як вплине на ціну",
    impactNote: "«Як вплине на ціну» — наша груба оцінка з трьох речей: розмір розлоку відносно капіталізації, хто отримує токени (інвестори й отримувачі аірдропів продають частіше, ніж казна) і чи розлок разовий. Це не прогноз: ринок часто враховує розлок у ціні заздалегідь.",
    type: { cliff: "Разовий", linear: "Лінійний", tge: "TGE" }, ofCap: "капіталізації", ofSupply: "емісії", already: "вже розблоковано",
    src: "Дані: DropsTab", note: "Показуємо ~50 найближчих розлоків. Суми в доларах — за поточною ціною. Не є фінансовою порадою.", down: "через",
  },
  en: {
    title: "Token unlock calendar",
    sub: "When the team, investors or the foundation get access to locked tokens. A big unlock = lots of new coins on the market, and the price often weakens before the date.",
    how: "The key column is “Pressure”: the unlock's value as a % of market cap. From 1% it's noticeable, from 5% it's a lot. A “linear” unlock is spread over time and weighs less than a one-off.",
    big: "Big unlocks", bigSub: "≥ 1% of market cap or ≥ $10M", all: "All upcoming", none: "No unlock data — the source didn't respond. Try again later.",
    date: "Date", token: "Token", amount: "Amount", pressure: "Pressure", who: "To whom", kind: "Type", impact: "Likely price impact",
    impactNote: "“Likely price impact” is our rough estimate from three things: the unlock's size vs market cap, who receives the tokens (investors and airdrop recipients sell more often than a treasury) and whether it's a one-off. Not a forecast: markets often price an unlock in ahead of time.",
    type: { cliff: "One-off", linear: "Linear", tge: "TGE" }, ofCap: "of market cap", ofSupply: "of supply", already: "already unlocked",
    src: "Data: DropsTab", note: "We show the ~50 nearest unlocks. USD amounts at the current price. Not financial advice.", down: "in",
  },
  ru: {
    title: "Календарь разлоков токенов",
    sub: "Когда команда, инвесторы или фонд получают доступ к заблокированным токенам. Большой разлок = много новых монет на рынке, и цена часто слабеет ещё до даты.",
    how: "Главная колонка — «Давление»: стоимость разлока в процентах от капитализации. От 1% — заметно, от 5% — очень много. «Линейный» разлок растянут во времени и давит меньше, чем разовый.",
    big: "Большие разлоки", bigSub: "≥ 1% капитализации или ≥ $10M", all: "Все ближайшие", none: "Нет данных о разлоках — источник не ответил. Попробуйте позже.",
    date: "Дата", token: "Токен", amount: "Сколько", pressure: "Давление", who: "Кому", kind: "Тип", impact: "Как повлияет на цену",
    impactNote: "«Как повлияет на цену» — наша грубая оценка из трёх вещей: размер разлока относительно капитализации, кто получает токены (инвесторы и получатели аирдропов продают чаще, чем казна) и разовый ли разлок. Это не прогноз: рынок часто учитывает разлок в цене заранее.",
    type: { cliff: "Разовый", linear: "Линейный", tge: "TGE" }, ofCap: "капитализации", ofSupply: "эмиссии", already: "уже разблокировано",
    src: "Данные: DropsTab", note: "Показываем ~50 ближайших разлоков. Суммы в долларах — по текущей цене. Не является финансовым советом.", down: "через",
  },
};

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { lang } = await params;
  if (!isLocale(lang)) return {};
  return { title: X[lang].title, description: X[lang].sub, alternates: { canonical: `/${lang}/unlocks` } };
}

const fmtNum = (n: number) => (n >= 1e9 ? `${+(n / 1e9).toFixed(2)}B` : n >= 1e6 ? `${+(n / 1e6).toFixed(2)}M` : n >= 1e3 ? `${+(n / 1e3).toFixed(1)}K` : `${+n.toFixed(2)}`);
const pressCls = (x: number) => (x >= 5 ? "bg-rose/15 text-rose" : x >= 1 ? "bg-amber/15 text-amber" : "bg-white/5 text-ink-2");
const day = (ms: number, lang: Locale) => new Date(ms).toLocaleDateString(lang === "uk" ? "uk-UA" : lang === "ru" ? "ru-RU" : "en-GB", { day: "numeric", month: "short", timeZone: "UTC" });

export default async function UnlocksPage({ params }: { params: Params }) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  const t = getDict(lang), T = X[lang];
  const [{ rows, fetchedAt, ok }, { tokens }] = await Promise.all([getUnlocks(), getTokens()]);
  const trs = await trList(lang, rows.map((u) => u.sale).filter(Boolean));
  const big = rows.filter(isBig).sort((a, b) => b.pctCap - a.pctCap).slice(0, 9);

  const tokenHref = (u: Unlock) => (tokens.has(u.sym) ? withBase(`/${lang}/t/${u.sym}/`) : undefined);
  const logo = (u: Unlock) => ({ name: u.sym, logo: u.logo, color: "#2a313b", ink: "#eef2f6", monogram: u.sym.slice(0, 3) });

  return (
    <>
      <main className="mx-auto max-w-7xl px-4 pb-20 pt-10 sm:px-6">
        <CalendarTabs lang={lang} active="unlocks" updated={fetchedAt} />
        <h1 className="mt-8 font-display text-3xl font-semibold tracking-tight sm:text-5xl">{T.title}</h1>
        <p className="mt-3 max-w-3xl text-ink-2 sm:text-lg">{T.sub}</p>
        <details className="mt-2 max-w-3xl text-sm text-ink-3">
          <summary className="cursor-pointer font-semibold text-ink-2 hover:text-ink">{({ uk: "Як читати таблицю", en: "How to read the table", ru: "Как читать таблицу" } as const)[lang]}</summary>
          <p className="mt-2">{T.how}</p>
          <p className="mt-2">{T.impactNote}</p>
        </details>

        {!ok && <p className="mt-8 rounded-2xl border border-dashed border-line-2 p-5 text-ink-2">{T.none}</p>}

        {big.length > 0 && (
          <section className="mt-10">
            <h2 className="font-display text-2xl font-semibold tracking-tight">{T.big}</h2>
            <p className="mt-1 text-sm text-ink-3">{T.bigSub}</p>
            <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {big.map((u) => {
                const href = tokenHref(u) ?? dropstabCoin(u.slug);
                return (
                  <a key={`${u.sym}${u.date}`} href={href} {...(href.startsWith("http") ? { target: "_blank", rel: "noopener" } : {})} className="card flex gap-3 p-4">
                    <VenueLogo v={logo(u)} size={40} rounded="rounded-full" />
                    <span className="min-w-0 flex-1">
                      <span className="flex flex-wrap items-center gap-2">
                        <span className="font-bold">{u.sym}</span>
                        <span className={`rounded-md px-1.5 py-0.5 font-mono text-xs font-bold ${pressCls(u.pctCap)}`}>{u.pctCap.toFixed(2)}% {T.ofCap}</span>
                      </span>
                      <span className="mt-1 block text-sm text-ink-2">{day(u.date, lang)} · {T.down} {duration(Math.max(0, u.date - fetchedAt), t.time)} · <span className="font-mono">{compactUsd(u.usd)}</span></span>
                      <span className="mt-0.5 block break-words text-xs text-ink-3">{trs(u.sale)} · {T.type[u.type]}</span>
                      <span className="mt-2 block text-xs"><span title={impactText(u, lang)} className={`cursor-help rounded-md px-1.5 py-0.5 font-bold ${LEVEL_CLS[impactOf(u).level]}`}>{LEVEL_TXT[lang][impactOf(u).level]}</span></span>
                    </span>
                  </a>
                );
              })}
            </div>
          </section>
        )}

        {rows.length > 0 && (
          <section className="mt-12">
            <h2 className="font-display text-2xl font-semibold tracking-tight">{T.all}</h2>
            <div className="mt-4 overflow-x-auto rounded-2xl border border-line">
              <table className="w-full min-w-[860px] text-left text-sm">
                <thead className="bg-white/[0.03] text-xs font-bold uppercase tracking-wider text-ink-3">
                  <tr>{[T.date, T.token, T.amount, T.pressure, T.who, T.kind, T.impact].map((h) => <th key={h} className="px-4 py-3">{h}</th>)}</tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {rows.map((u) => {
                    const href = tokenHref(u);
                    return (
                      <tr key={`${u.sym}${u.date}`} className="hover:bg-white/[0.02]">
                        <td className="whitespace-nowrap px-4 py-3"><div className="font-mono font-bold">{day(u.date, lang)}</div><div className="text-xs text-ink-3">{T.down} {duration(Math.max(0, u.date - fetchedAt), t.time)}</div></td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2.5">
                            <VenueLogo v={logo(u)} size={28} rounded="rounded-full" />
                            <div className="min-w-0">
                              {href ? <a href={href} className="font-bold hover:text-lime">{u.sym}</a> : <span className="font-bold">{u.sym}</span>}
                              <div className="break-words text-xs text-ink-3">{u.name && u.name.toLowerCase() !== u.sym.toLowerCase() ? u.name : ""}{u.name && u.name.toLowerCase() !== u.sym.toLowerCase() && u.unlockedPct ? " · " : ""}{u.unlockedPct ? `${u.unlockedPct.toFixed(0)}% ${T.already}` : ""}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3"><div className="font-mono font-bold">{compactUsd(u.usd)}</div><div className="font-mono text-xs text-ink-3">{fmtNum(u.tokens)} {u.sym} · {u.pctSupply.toFixed(2)}% {T.ofSupply}</div></td>
                        <td className="px-4 py-3"><span className={`rounded-md px-2 py-1 font-mono text-xs font-bold ${pressCls(u.pctCap)}`}>{u.pctCap.toFixed(2)}%</span></td>
                        <td className="px-4 py-3 text-ink-2">{u.sale ? trs(u.sale) : "—"}</td>
                        <td className="px-4 py-3 text-ink-2">{T.type[u.type]}</td>
                        <td className="px-4 py-3">
                          <span title={impactText(u, lang)} className={`cursor-help rounded-md px-2 py-0.5 text-xs font-bold ${LEVEL_CLS[impactOf(u).level]}`}>{LEVEL_TXT[lang][impactOf(u).level]}</span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>
        )}

        <p className="mt-4 text-xs text-ink-3">
          <a href={UNLOCK_SRC} target="_blank" rel="noopener" className="font-bold text-ink-2 hover:text-ink">{T.src} ↗</a> · {T.note}
        </p>
      </main>
      <Footer t={t} fetchedAt={fetchedAt} lang={lang} />
    </>
  );
}
