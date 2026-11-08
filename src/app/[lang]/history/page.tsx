import type { Metadata } from "next";
import { YieldTabs } from "@/components/SectionTabs";
import { notFound } from "next/navigation";
import { getDict, isLocale, type Locale } from "@/lib/i18n";
import { TOOLS } from "@/lib/i18n-tools";
import { readHistory } from "@/lib/history";
import { getPools } from "@/lib/pools";
import { decayCurve, lpStats } from "@/lib/lpstats";
import { venueOf } from "@/config/site";
import { compactUsd, shortDate } from "@/lib/format";
import { LineChart, seriesColor, type Series } from "@/components/LineChart";
import { VenueLogo } from "@/components/VenueLogo";
import { Footer } from "@/components/Sections";

type Params = Promise<{ lang: string }>;
const COINS = ["USDT", "USDC", "BTC", "ETH"];

const H: Record<Locale, {
  past: string; pastSub: string; tiles: [string, string, string, string, string, string]; months: string; monthsSub: string;
  exTitle: string; exCols: [string, string, string, string, string, string];
  drop: string; dropSub: string; dropCols: [string, string, string, string, string]; dropNone: string; launchNote: string;
  list: string; listCols: [string, string, string, string, string, string, string]; earn: string; stable: string; other: string; days: string;
  curve: string; curveSub: string; after: (h: number) => string; pools: string; collecting: string;
}> = {
  uk: {
    past: "Launchpool за 3 місяці", pastSub: "Усі пули, що стартували за останні 90 днів на біржах, які ми відстежуємо (з архівів самих бірж).",
    tiles: ["проєктів", "пулів", "медіана APR · стейблкоїн", "медіана APR · інші монети", "медіана тривалість, дн.", "фінал від старту (Gate)"],
    months: "Пули по місяцях", monthsSub: "Скільки пулів стартувало щомісяця і медіанний фінальний APR.",
    exTitle: "По біржах", exCols: ["Біржа", "Пулів", "APR · стейбл", "APR · інші", "Сер. днів", "≈ Фонд"],
    drop: "Як падає APR зараз", dropSub: "Зміна APR живих пулів у % від першого значення, яке ми побачили (знімок кожні 30 хв). Нижче нуля — APR впав.",
    dropCols: ["Пул", "Перший APR", "Зараз", "Зміна", "Від старту біржі"], dropNone: "Поки замало знімків — графік з'явиться після кількох годин спостереження за пулом.", launchNote: "«Від старту біржі» — порівняння з APR, який біржа оцінила на запуску (є лише в Gate).",
    list: "Усі пули за 3 місяці", listCols: ["Старт", "Біржа", "Токен", "Стейк", "APR на старті", "Фінальний APR", "Зміна"], earn: "Ставки Earn", stable: "стейбл", other: "інші", days: "дн.",
    curve: "Типова крива падіння", curveSub: "Медіанний APR як частка стартового через N годин після відкриття пулу. ×0.5 = APR упав удвічі. Наповнюється з кожним новим пулом.", after: (h) => (h < 48 ? `через ${h} год` : `через ${h / 24} дн.`), pools: "пулів", collecting: "збираємо дані",
  },
  en: {
    past: "Launchpools over 3 months", pastSub: "Every pool that started in the last 90 days on the exchanges we track (from the exchanges' own archives).",
    tiles: ["projects", "pools", "median APR · stablecoin", "median APR · other coins", "median length, days", "final vs start (Gate)"],
    months: "Pools by month", monthsSub: "How many pools started each month and the median final APR.",
    exTitle: "By exchange", exCols: ["Exchange", "Pools", "APR · stable", "APR · other", "Avg days", "≈ Rewards"],
    drop: "How APR is falling now", dropSub: "APR change of live pools in % of the first value we saw (a snapshot every 30 min). Below zero — APR dropped.",
    dropCols: ["Pool", "First APR", "Now", "Change", "Since exchange launch"], dropNone: "Not enough snapshots yet — the chart appears after a few hours of tracking a pool.", launchNote: "'Since exchange launch' compares with the APR the exchange estimated at launch (Gate only).",
    list: "All pools over 3 months", listCols: ["Start", "Exchange", "Token", "Stake", "Start APR", "Final APR", "Change"], earn: "Earn rates", stable: "stable", other: "other", days: "d",
    curve: "Typical decay curve", curveSub: "Median APR as a share of the starting APR N hours after a pool opens. ×0.5 = APR halved. Fills in with every new pool.", after: (h) => (h < 48 ? `after ${h}h` : `after ${h / 24}d`), pools: "pools", collecting: "collecting data",
  },
  ru: {
    past: "Launchpool за 3 месяца", pastSub: "Все пулы, стартовавшие за последние 90 дней на биржах, которые мы отслеживаем (из архивов самих бирж).",
    tiles: ["проектов", "пулов", "медиана APR · стейблкоин", "медиана APR · другие монеты", "медиана длительность, дн.", "финал от старта (Gate)"],
    months: "Пулы по месяцам", monthsSub: "Сколько пулов стартовало каждый месяц и медианный финальный APR.",
    exTitle: "По биржам", exCols: ["Биржа", "Пулов", "APR · стейбл", "APR · другие", "Ср. дней", "≈ Фонд"],
    drop: "Как падает APR сейчас", dropSub: "Изменение APR живых пулов в % от первого значения, которое мы увидели (снимок каждые 30 мин). Ниже нуля — APR упал.",
    dropCols: ["Пул", "Первый APR", "Сейчас", "Изменение", "От старта биржи"], dropNone: "Пока мало снимков — график появится после нескольких часов наблюдения за пулом.", launchNote: "«От старта биржи» — сравнение с APR, который биржа оценила на запуске (есть только у Gate).",
    list: "Все пулы за 3 месяца", listCols: ["Старт", "Биржа", "Токен", "Стейк", "APR на старте", "Финальный APR", "Изменение"], earn: "Ставки Earn", stable: "стейбл", other: "другие", days: "дн.",
    curve: "Типичная кривая падения", curveSub: "Медианный APR как доля стартового через N часов после открытия пула. ×0.5 = APR упал вдвое. Наполняется с каждым новым пулом.", after: (h) => (h < 48 ? `через ${h} ч` : `через ${h / 24} дн.`), pools: "пулов", collecting: "собираем данные",
  },
};

const pct = (x?: number) => (x === undefined ? "—" : `${x >= 100 ? Math.round(x) : x.toFixed(1)}%`);
const chg = (x?: number) => (x === undefined ? <span className="text-ink-3">—</span> : <span className={x < 0 ? "text-rose" : "text-lime"}>{x > 0 ? "+" : ""}{x.toFixed(0)}%</span>);

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { lang } = await params;
  if (!isLocale(lang)) return {};
  return { title: TOOLS[lang].histTitle, description: TOOLS[lang].histSub };
}

export default async function HistoryPage({ params }: { params: Params }) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  const t = getDict(lang), T = TOOLS[lang], X = H[lang];
  const snaps = readHistory();
  const pools = await getPools();
  const S = lpStats(pools, snaps);
  const curve = decayCurve(pools, snaps);
  const locale = lang === "uk" ? "uk-UA" : lang === "ru" ? "ru-RU" : "en-GB";
  const exName = (id: string) => venueOf(id).name;

  const earnCharts = COINS.map((coin) => {
    const exs = [...new Set(snaps.flatMap((s) => Object.keys(s.earn?.[coin] ?? {})))];
    const series: Series[] = exs.map((ex, i) => ({
      name: venueOf(ex)?.name ?? ex, color: seriesColor(i),
      points: snaps.filter((s) => s.earn?.[coin]?.[ex] !== undefined).map((s) => [s.t, s.earn[coin][ex]] as [number, number]),
    })).filter((s) => s.points.length > 1);
    return { coin, series };
  }).filter((c) => c.series.length);

  const dropSeries: Series[] = S.drop.slice(0, 8).map((d, i) => ({ name: `${d.name} · ${exName(d.exchange)}`, color: seriesColor(i), points: d.points }));
  const exList = [...new Set(S.past.map((r) => r.exchange))];
  const maxMonth = Math.max(1, ...S.byMonth.map((m) => m.pools));

  return (
    <>
      <main className="mx-auto max-w-7xl px-4 pb-20 pt-10 sm:px-6">
        <header>
          <YieldTabs lang={lang} active="history" updated={pools.fetchedAt} />
          <h1 className="mt-8 font-display text-3xl font-semibold tracking-tight sm:text-5xl">{T.histTitle}</h1>
          <p className="mt-3 max-w-2xl text-ink-2 sm:text-lg">{T.histSub}</p>
        </header>

        {/* ---- how APR is falling now ---- */}
        <section className="mt-12">
          <h2 className="font-display text-2xl font-semibold tracking-tight">📉 {X.drop}</h2>
          <p className="mt-1.5 max-w-3xl text-sm text-ink-3">{X.dropSub}</p>
          {S.drop.length === 0 ? <p className="mt-6 rounded-2xl border border-dashed border-line-2 px-6 py-10 text-center text-ink-2">{X.dropNone}</p> : (
            <>
              <div className="card mt-5 p-5 hover:transform-none"><LineChart series={dropSeries} locale={locale} height={260} signed /></div>
              <div className="mt-4 overflow-x-auto rounded-2xl border border-line">
                <table className="w-full min-w-[620px] text-left text-sm">
                  <thead className="bg-white/[0.03] text-xs font-bold uppercase tracking-wider text-ink-3"><tr>{X.dropCols.map((c, i) => <th key={c} className={`px-4 py-3 ${i ? "text-right" : ""}`}>{c}</th>)}</tr></thead>
                  <tbody className="divide-y divide-line">
                    {S.drop.map((d) => (
                      <tr key={d.key} className="hover:bg-white/[0.02]">
                        <td className="px-4 py-2.5"><span className="flex items-center gap-2 font-bold"><VenueLogo v={venueOf(d.exchange)} size={20} rounded="rounded-md" />{d.name}</span></td>
                        <td className="px-4 py-2.5 text-right font-mono text-xs">{pct(d.first)} <span className="text-ink-3">· {shortDate(d.firstT, lang)}</span></td>
                        <td className="px-4 py-2.5 text-right font-mono text-xs font-bold">{pct(d.now)}</td>
                        <td className="px-4 py-2.5 text-right font-mono text-xs font-bold">{chg(d.change)}</td>
                        <td className="px-4 py-2.5 text-right font-mono text-xs font-bold">{d.launch ? chg((d.now / d.launch - 1) * 100) : <span className="text-ink-3">—</span>}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="mt-2 text-xs text-ink-3">{X.launchNote}</p>
            </>
          )}
        </section>

        {/* ---- typical decay curve: shown only once ≥ 10 pools back it (audit 08.11: ×1.25 / ×0.09 on 3 pools misled) ---- */}
        {Math.max(0, ...curve.map((c) => c.n ?? 0)) >= 10 && <section className="mt-14">
          <h2 className="font-display text-2xl font-semibold tracking-tight">⏱ {X.curve}</h2>
          <p className="mt-1.5 max-w-3xl text-sm text-ink-3">{X.curveSub}</p>
          <div className="mt-5 grid grid-cols-3 gap-3 sm:grid-cols-6">
            {curve.map((c) => (
              <div key={c.h} className="rounded-2xl border border-line bg-white/[0.02] px-4 py-3.5">
                <div className={`font-display text-2xl font-semibold ${c.ratio === undefined ? "text-ink-3" : c.ratio < 0.7 ? "text-rose" : c.ratio < 0.95 ? "text-amber" : "text-lime"}`}>{c.ratio === undefined ? "…" : `×${c.ratio.toFixed(2)}`}</div>
                <div className="mt-1 text-xs font-semibold text-ink-2">{X.after(c.h)}</div>
                <div className="mt-0.5 font-mono text-xs text-ink-3">{c.ratio === undefined ? X.collecting : `${c.n} ${X.pools}`}</div>
              </div>
            ))}
          </div>
        </section>}

        {/* ---- 3-month statistics ---- */}
        <section className="mt-16">
          <h2 className="font-display text-2xl font-semibold tracking-tight">📊 {X.past}</h2>
          <p className="mt-1.5 max-w-3xl text-sm text-ink-3">{X.pastSub}</p>
          <dl className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            {([
              [String(S.totals.projects), X.tiles[0]], [String(S.totals.pools), X.tiles[1]],
              [pct(S.totals.medStable), X.tiles[2]], [pct(S.totals.medOther), X.tiles[3]],
              [S.totals.medDays ? S.totals.medDays.toFixed(0) : "—", X.tiles[4]],
              [S.totals.medDecay ? `×${S.totals.medDecay.toFixed(2)}` : "—", X.tiles[5]],
            ] as const).map(([v, l]) => (
              <div key={l} className="rounded-2xl border border-line bg-white/[0.02] px-4 py-3.5">
                <dd className="font-display text-2xl font-semibold tracking-tight">{v}</dd>
                <dt className="mt-1 text-xs font-semibold leading-tight text-ink-3">{l}</dt>
              </div>
            ))}
          </dl>

          {/* months: stacked bars by exchange */}
          {S.byMonth.length > 0 && (
            <div className="card mt-6 p-5 hover:transform-none">
              <div className="font-bold">{X.months}</div>
              <p className="mt-0.5 text-xs text-ink-3">{X.monthsSub}</p>
              <div className="mt-5 flex items-end gap-4" style={{ height: 180 }}>
                {S.byMonth.map((m) => (
                  <div key={m.month} className="flex flex-1 flex-col items-center justify-end gap-1.5" style={{ height: "100%" }}>
                    <span className="font-mono text-xs font-bold text-ink-2">{m.pools}</span>
                    <div className="flex w-full max-w-16 flex-col-reverse overflow-hidden rounded-lg" style={{ height: `${(m.pools / maxMonth) * 120}px` }}>
                      {exList.map((ex) => m.byEx[ex] ? <div key={ex} title={`${exName(ex)}: ${m.byEx[ex]}`} style={{ height: `${(m.byEx[ex] / m.pools) * 100}%`, background: venueOf(ex).color }} /> : null)}
                    </div>
                    <span className="text-xs font-semibold text-ink-3">{new Date(m.t).toLocaleString(locale, { month: "short", timeZone: "UTC" })}</span>
                    <span className="font-mono text-xs text-lime">{pct(m.medApr)}</span>
                  </div>
                ))}
              </div>
              <div className="mt-4 flex flex-wrap gap-3 text-xs font-semibold text-ink-2">
                {exList.map((ex) => <span key={ex} className="flex items-center gap-1.5"><span className="size-2.5 rounded-sm" style={{ background: venueOf(ex).color }} />{exName(ex)}</span>)}
              </div>
            </div>
          )}

          {/* per exchange */}
          <h3 className="mt-10 text-lg font-bold">{X.exTitle}</h3>
          <div className="mt-3 overflow-x-auto rounded-2xl border border-line">
            <table className="w-full min-w-[600px] text-left text-sm">
              <thead className="bg-white/[0.03] text-xs font-bold uppercase tracking-wider text-ink-3"><tr>{X.exCols.map((c, i) => <th key={c} className={`px-4 py-3 ${i ? "text-right" : ""}`}>{c}</th>)}</tr></thead>
              <tbody className="divide-y divide-line">
                {S.byEx.map((e) => (
                  <tr key={e.exchange} className="hover:bg-white/[0.02]">
                    <td className="px-4 py-2.5"><span className="flex items-center gap-2 font-bold"><VenueLogo v={venueOf(e.exchange)} size={20} rounded="rounded-md" />{exName(e.exchange)}</span></td>
                    <td className="px-4 py-2.5 text-right font-mono text-xs">{e.pools} <span className="text-ink-3">/ {e.projects}</span></td>
                    <td className="px-4 py-2.5 text-right font-mono text-xs">{pct(e.medStable)}</td>
                    <td className="px-4 py-2.5 text-right font-mono text-xs">{pct(e.medOther)}</td>
                    <td className="px-4 py-2.5 text-right font-mono text-xs">{e.avgDays.toFixed(0)}</td>
                    <td className="px-4 py-2.5 text-right font-mono text-xs">{e.rewardUsd ? compactUsd(e.rewardUsd) : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* every pool */}
          <h3 className="mt-10 text-lg font-bold">{X.list}</h3>
          <div className="mt-3 overflow-x-auto rounded-2xl border border-line">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead className="bg-white/[0.03] text-xs font-bold uppercase tracking-wider text-ink-3"><tr>{X.listCols.map((c, i) => <th key={c} className={`px-4 py-3 ${i >= 4 ? "text-right" : ""}`}>{c}</th>)}</tr></thead>
              <tbody className="divide-y divide-line">
                {S.past.map((r) => (
                  <tr key={r.id} className="hover:bg-white/[0.02]">
                    <td className="whitespace-nowrap px-4 py-2.5 font-mono text-xs text-ink-2">{shortDate(r.start, lang)}</td>
                    <td className="px-4 py-2.5"><span className="flex items-center gap-2 text-ink-2"><VenueLogo v={venueOf(r.exchange)} size={18} rounded="rounded-md" />{exName(r.exchange)}</span></td>
                    <td className="px-4 py-2.5 font-bold">{r.token}</td>
                    <td className="px-4 py-2.5 text-ink-2">{r.stake} {r.stable && <span className="ml-1 rounded bg-teal/10 px-1 text-xs font-bold text-teal">{X.stable}</span>}</td>
                    <td className="px-4 py-2.5 text-right font-mono text-xs">{pct(r.aprStart)}</td>
                    <td className="px-4 py-2.5 text-right font-mono text-xs font-bold">{pct(r.apr)}</td>
                    <td className="px-4 py-2.5 text-right font-mono text-xs font-bold">{r.aprStart && r.apr ? chg((r.apr / r.aprStart - 1) * 100) : <span className="text-ink-3">—</span>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* ---- Earn rates over time ---- */}
        {earnCharts.length > 0 && (
          <section className="mt-16">
            <h2 className="font-display text-2xl font-semibold tracking-tight">🏦 {X.earn}</h2>
            <div className="mt-5 grid grid-cols-1 gap-4 lg:grid-cols-2">
              {earnCharts.map((c) => (
                <div key={c.coin} className="card p-5 hover:transform-none">
                  <div className="mb-3 font-display text-lg font-semibold">{c.coin}</div>
                  <LineChart series={c.series} locale={locale} />
                </div>
              ))}
            </div>
          </section>
        )}
        {snaps.length > 0 && <p className="mt-6 font-mono text-xs text-ink-3">{snaps.length} snapshots · {new Date(snaps[0].t).toISOString().slice(0, 16)} → {new Date(snaps[snaps.length - 1].t).toISOString().slice(0, 16)} UTC</p>}
      </main>
      <Footer t={t} fetchedAt={pools.fetchedAt} lang={lang} />
    </>
  );
}
