import { plural } from "@/lib/format";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getDict, isLocale, type Locale } from "@/lib/i18n";
import { getPools, lpPaged, lpSlug, isStable, type Pool, type PoolProject } from "@/lib/pools";
import { getPromos } from "@/lib/promos";
import { slugOf } from "@/lib/slug";
import { withBase } from "@/lib/base";
import { venueOf } from "@/config/site";
import { compactUsd, duration, num, shortDate } from "@/lib/format";
import { hedgeCalc, poolPC } from "@/lib/proscons";
import { GUIDES } from "@/lib/guides";
import { VenueLogo } from "@/components/VenueLogo";
import { ProsCons } from "@/components/ProsCons";
import { HedgeVenues } from "@/components/HedgeVenues";
import { Footer } from "@/components/Sections";
import { LineChart, seriesColor, type Series } from "@/components/LineChart";
import { readHistory } from "@/lib/history";
import { Hint } from "@/components/Hint";

export const revalidate = 900;
export const dynamicParams = false; // static GitHub Pages export: every page is pre-rendered

export async function generateStaticParams() {
  return lpPaged(await getPools()).map((p) => ({ slug: lpSlug(p) }));
}

type Params = Promise<{ lang: string; slug: string }>;

const CHART_TX: Record<Locale, { title: string; sub: string; apr: string; users: string; staked: string; real: string; realNote: string }> = {
  uk: { title: "Як змінюється пул", sub: "Наші знімки кожні 30 хвилин. Учасники й обсяг стейку зберігаються з 12 листопада.", apr: "APR, %", users: "Учасники", staked: "Застейкано, $", real: "Розрахунковий APR за поточною ціною токена", realNote: "Вартість усієї винагороди за рік ÷ вартість усього застейканого. Якщо він набагато нижчий за APR біржі, токен подешевшав або учасників стало більше." },
  en: { title: "How the pool changes", sub: "Our snapshots every 30 minutes. Participants and stake size are kept since 12 November.", apr: "APR, %", users: "Participants", staked: "Staked, $", real: "Estimated APR at the current token price", realNote: "Value of all rewards per year ÷ value of everything staked. Far below the exchange APR means the token got cheaper or more people joined." },
  ru: { title: "Как меняется пул", sub: "Наши снимки каждые 30 минут. Участники и объём стейка хранятся с 12 ноября.", apr: "APR, %", users: "Участники", staked: "Застейкано, $", real: "Расчётный APR по текущей цене токена", realNote: "Стоимость всей награды за год ÷ стоимость всего застейканного. Если он намного ниже APR биржи — токен подешевел или участников стало больше." },
};
const X: Record<Locale, {
  back: string; kicker: (ex: string) => string; title: (stake: string, token: string) => string; sub: (ex: string, token: string) => string;
  start: string; end: string; endsIn: string; startsIn: string; ended: string; fund: string; users: string;
  poolsTitle: string; poolsSub: string; stake: string; apr: string; aprStart: string; limits: string; staked: string; min: string; max: string; noLimit: string;
  calcTitle: string; calcSub: string; with: (x: string) => string; withMax: string; perDay: string; untilEnd: string; belowMin: (m: string) => string; noApr: string;
  priceRisk: string; newUsers: string;
  stepsTitle: string; fullGuide: string; prosTitle: string; prosSub: string;
  go: (ex: string) => string; rulesOrig: string; rulesOur: string; endedNote: string; disclaimer: string;
}> = {
  uk: {
    back: "← Усі лаунчпули", kicker: (ex) => `Launchpool на ${ex}`,
    title: (s, t) => `Застейкайте ${s} — отримайте ${t}`,
    sub: (ex, t) => `Біржа ${ex} роздає токен ${t} тим, хто тримає монети в цьому пулі. Ваша частка = ваш стейк ÷ усе, що застейкано. Нижче — умови, скільки можна заробити і як взяти участь.`,
    start: "Старт", end: "Завершення", endsIn: "до кінця", startsIn: "старт через", ended: "Пул завершено", fund: "Фонд винагород", users: "Учасників",
    poolsTitle: "Що можна стейкати", poolsSub: "У кожного пулу свій фонд, APR і ліміти на одну людину.",
    stake: "Стейк", apr: "APR зараз", aprStart: "на старті", limits: "Ліміт на людину", staked: "Застейкано всього", min: "мін.", max: "макс.", noLimit: "не вказано",
    calcTitle: "Скільки можна заробити", calcSub: "Оцінка за поточним APR до кінця пулу. APR падає, коли заходять нові учасники, а нагорода приходить у новому токені — його ціна може змінитися.",
    with: (x) => `Зі стейком ${x}`, withMax: "На максимум", perDay: "/день", untilEnd: "до кінця пулу", belowMin: (m) => `менше мінімуму (від ${m})`, noApr: "APR ще не оголошено",
    priceRisk: "Щоб стейкати, треба купити сам новий токен — його ціна може впасти сильніше, ніж ви заробите.", newUsers: "Особливі умови (напр., лише для нових користувачів)",
    stepsTitle: "Як взяти участь — покроково", fullGuide: "Повна інструкція по біржі →", prosTitle: "Плюси і мінуси", prosSub: "Розраховано для стейку $1 000.",
    go: (ex) => `Взяти участь на ${ex}`, rulesOrig: "Офіційні умови ↗", rulesOur: "Умови з перекладом →",
    endedNote: "Цей пул уже завершено — дивіться активні на сторінці лаунчпулів.",
    disclaimer: "APR — оцінка біржі на момент оновлення; фактичний дохід залежить від ціни токена і кількості учасників. Не є фінансовою порадою.",
  },
  en: {
    back: "← All launchpools", kicker: (ex) => `Launchpool on ${ex}`,
    title: (s, t) => `Stake ${s} — earn ${t}`,
    sub: (ex, t) => `${ex} gives out ${t} to everyone holding coins in this pool. Your share = your stake ÷ everything staked. Below: conditions, how much you can earn and how to join.`,
    start: "Start", end: "End", endsIn: "ends in", startsIn: "starts in", ended: "Pool ended", fund: "Reward fund", users: "Participants",
    poolsTitle: "What you can stake", poolsSub: "Each pool has its own fund, APR and per-person limits.",
    stake: "Stake", apr: "APR now", aprStart: "at launch", limits: "Per-person limit", staked: "Total staked", min: "min", max: "max", noLimit: "not stated",
    calcTitle: "How much you can earn", calcSub: "Estimate at the current APR until the pool ends. APR drops as people join, and the reward is paid in the new token — its price can move.",
    with: (x) => `With ${x} staked`, withMax: "At the maximum", perDay: "/day", untilEnd: "until the end", belowMin: (m) => `below the minimum (from ${m})`, noApr: "APR not announced yet",
    priceRisk: "To stake you must buy the new token itself — its price can fall more than you earn.", newUsers: "Special conditions (e.g. new users only)",
    stepsTitle: "How to join — step by step", fullGuide: "Full exchange guide →", prosTitle: "Pros and cons", prosSub: "Calculated for a $1,000 stake.",
    go: (ex) => `Join on ${ex}`, rulesOrig: "Official rules ↗", rulesOur: "Rules on our site →",
    endedNote: "This pool has ended — see the live ones on the launchpools page.",
    disclaimer: "APR is the exchange's estimate at update time; actual income depends on the token price and the number of participants. Not financial advice.",
  },
  ru: {
    back: "← Все лаунчпулы", kicker: (ex) => `Launchpool на ${ex}`,
    title: (s, t) => `Застейкайте ${s} — получите ${t}`,
    sub: (ex, t) => `Биржа ${ex} раздаёт токен ${t} тем, кто держит монеты в этом пуле. Ваша доля = ваш стейк ÷ всё, что застейкано. Ниже — условия, сколько можно заработать и как участвовать.`,
    start: "Старт", end: "Завершение", endsIn: "до конца", startsIn: "старт через", ended: "Пул завершён", fund: "Фонд наград", users: "Участников",
    poolsTitle: "Что можно стейкать", poolsSub: "У каждого пула свой фонд, APR и лимиты на одного человека.",
    stake: "Стейк", apr: "APR сейчас", aprStart: "на старте", limits: "Лимит на человека", staked: "Застейкано всего", min: "мин.", max: "макс.", noLimit: "не указан",
    calcTitle: "Сколько можно заработать", calcSub: "Оценка по текущему APR до конца пула. APR падает, когда заходят новые участники, а награда приходит в новом токене — его цена может измениться.",
    with: (x) => `Со стейком ${x}`, withMax: "На максимум", perDay: "/день", untilEnd: "до конца пула", belowMin: (m) => `меньше минимума (от ${m})`, noApr: "APR ещё не объявлен",
    priceRisk: "Чтобы стейкать, нужно купить сам новый токен — его цена может упасть сильнее, чем вы заработаете.", newUsers: "Особые условия (напр., только для новых пользователей)",
    stepsTitle: "Как участвовать — пошагово", fullGuide: "Полная инструкция по бирже →", prosTitle: "Плюсы и минусы", prosSub: "Рассчитано для стейка $1 000.",
    go: (ex) => `Участвовать на ${ex}`, rulesOrig: "Официальные условия ↗", rulesOur: "Условия с переводом →",
    endedNote: "Этот пул уже завершён — смотрите активные на странице лаунчпулов.",
    disclaimer: "APR — оценка биржи на момент обновления; фактический доход зависит от цены токена и количества участников. Не является финансовым советом.",
  },
};

const fmtNum = (n?: number) => (n === undefined ? "—" : n >= 1e9 ? `${+(n / 1e9).toFixed(2)}B` : n >= 1e6 ? `${+(n / 1e6).toFixed(2)}M` : n >= 1e3 ? `${+(n / 1e3).toFixed(1)}K` : `${+n.toFixed(2)}`);
const fmtApr = (x?: number) => (x === undefined ? "—" : `${x >= 100 ? Math.round(x) : x.toFixed(2)}%`);
// site-wide number format: uk/ru "$1 000", en "$1,000"
const usd = (x: number, lang: string) => (x >= 100 ? `$${num(Math.round(x), lang, 0)}` : `$${x.toFixed(2)}`);
const STAKE_OF: Record<string, (x: string) => string> = { uk: (x) => `стейк ${x}`, en: (x) => `stake ${x}`, ru: (x) => `стейк ${x}` };
const LP_SECTION = /launch ?pool|gem ?pool|pool ?x|boost ?hub|jumpstart/i;

async function find(slug: string) {
  const data = await getPools();
  const p = lpPaged(data).find((x) => lpSlug(x) === slug);
  return p ? { p, data } : undefined;
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { lang, slug } = await params;
  if (!isLocale(lang)) return {};
  const hit = await find(slug);
  if (!hit) return { title: "404" };
  const { p } = hit;
  const ex = venueOf(p.exchange).name;
  const stakes = [...new Set(p.pools.map((x) => x.stake))].join(", ");
  const best = Math.max(0, ...p.pools.map((x) => x.apr ?? 0));
  const title = `${p.name} (${p.token}) Launchpool — ${ex}`;
  const description = [X[lang].title(stakes, p.token), best ? `APR ${fmtApr(best)}` : "", `${shortDate(p.start, lang)} – ${shortDate(p.end, lang)}`].filter(Boolean).join(" · ");
  return { title, description, alternates: { canonical: `/${lang}/lp/${slug}` } };
}

/** Earnings for `stakeUsd` until the end, capped by the per-person maximum; undefined if no APR/price. */
function earn(pool: Pool, p: PoolProject, prices: Record<string, number>, from: number, stakeUsd?: number) {
  const px = prices[pool.stake] ?? (isStable(pool.stake) ? 1 : undefined);
  if (!pool.apr || !px) return undefined;
  const capUsd = pool.maxStake ? pool.maxStake * px : undefined;
  const minUsd = pool.minStake ? pool.minStake * px : 0;
  const amount = stakeUsd === undefined ? capUsd : capUsd !== undefined ? Math.min(stakeUsd, capUsd) : stakeUsd;
  if (amount === undefined) return undefined;
  if (amount < minUsd) return { below: true as const, amount, perDay: 0, total: 0 };
  const days = Math.max(0, (p.end - Math.max(from, p.start)) / 86400_000);
  const perDay = (amount * pool.apr) / 100 / 365;
  return { below: false as const, amount, perDay, total: perDay * days };
}

const HEDGE_LOSS_LP: Record<string, string> = { uk: "хедж коштує більше, ніж дає пул", en: "the hedge costs more than the pool pays", ru: "хедж стоит больше, чем даёт пул" };

export default async function LaunchpoolPage({ params }: { params: Params }) {
  const { lang, slug } = await params;
  if (!isLocale(lang)) notFound();
  const hit = await find(slug);
  if (!hit) notFound();
  const { p, data } = hit;
  const t = getDict(lang), T = X[lang];
  const now = data.fetchedAt;
  const ex = venueOf(p.exchange);
  const live = p.status === "live", ended = p.status === "ended";
  const stakes = [...new Set(p.pools.map((x) => x.stake))];
  const participants = p.participants ?? (p.pools.reduce((s, x) => s + (x.participants ?? 0), 0) || undefined);
  // dollar values and the APR the pool really pays at today's prices: reward value per year ÷ value staked (audit 12.11)
  const pxOf = (c: string) => data.prices[c] ?? (isStable(c) ? 1 : undefined);
  const totalDays = Math.max(1, (p.end - p.start) / 86400_000);
  const realApr = (x: Pool) => {
    const pt = pxOf(p.token), ps = pxOf(x.stake);
    return x.reward && x.staked && pt && ps ? ((x.reward * pt * 365) / totalDays / (x.staked * ps)) * 100 : undefined;
  };
  // history of this project's pools from the 30-minute snapshots: APR, participants, value staked
  const snaps = readHistory().filter((s) => s.t >= p.start - 86400_000);
  const keyOf = (x: Pool) => `${p.exchange}:${p.id}:${x.stake}`;
  const seriesOf = (pick: (e: { apr: number; staked?: number; users?: number }, x: Pool) => number | undefined): Series[] =>
    p.pools.map((x, i) => ({
      name: x.stake, color: seriesColor(i),
      points: snaps.flatMap((s) => { const e = s.pools?.[keyOf(x)]; const v = e ? pick(e, x) : undefined; return v !== undefined && Number.isFinite(v) ? [[s.t, v] as [number, number]] : []; }),
    })).filter((x) => x.points.length >= 2);
  const aprSeries = seriesOf((e) => e.apr);
  const usersSeries = seriesOf((e) => e.users);
  const stakedSeries = seriesOf((e, x) => { const ps = pxOf(x.stake); return e.staked && ps ? e.staked * ps : undefined; });
  const locale = lang === "en" ? "en-US" : lang === "ru" ? "ru-RU" : "uk-UA";

  // our page with the translated official announcement, if the feed has it
  const { promos } = await getPromos(lang);
  const rulesPromo = p.rulesUrl ? promos.find((x) => x.url === p.rulesUrl) : undefined;

  // step-by-step from the exchange guide (Launchpool section)
  const guide = GUIDES[lang].find((g) => g.venue === p.exchange && g.id.includes("poolx")) ?? GUIDES[lang].find((g) => g.venue === p.exchange);
  const section = guide?.sections?.find((s) => LP_SECTION.test(s.title));
  const steps = section?.steps ?? (guide && LP_SECTION.test(guide.title) ? guide.steps : undefined);

  const tile = "rounded-2xl border border-line bg-white/[0.02] px-4 py-3.5";
  const tokenLogo = { name: p.token, logo: p.logo, color: "#2a313b", ink: "#eef2f6", monogram: p.token.slice(0, 3) };

  return (
    <>
      <main className="mx-auto max-w-7xl px-4 pb-20 pt-8 sm:px-6">
        <a href={withBase(`/${lang}/launchpools/`)} className="text-sm font-bold text-ink-3 hover:text-ink">{T.back}</a>

        <header className="mt-6 flex flex-wrap items-start gap-4">
          <div className="relative shrink-0">
            <VenueLogo v={tokenLogo} size={64} rounded="rounded-2xl" />
            <span className="absolute -bottom-2 -right-2 rounded-lg ring-2 ring-bg"><VenueLogo v={ex} size={28} rounded="rounded-lg" /></span>
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2 text-sm font-bold text-ink-3">
              <span>{T.kicker(ex.name)}</span>
              <span className={`rounded-md px-2 py-0.5 text-xs ${live ? "bg-lime/10 text-lime" : ended ? "bg-white/5 text-ink-3" : "bg-sky/10 text-sky"}`}>
                {live ? t.lp.live : ended ? T.ended : t.lp.upcoming}
              </span>
            </div>
            <h1 className="mt-2 break-words font-display text-3xl font-semibold leading-tight tracking-tight sm:text-4xl">
              {p.name} <span className="text-ink-3">({p.token})</span>
            </h1>
            <p className="mt-1 text-lg font-semibold text-lime">{T.title(stakes.join(" / "), p.token)}</p>
          </div>
        </header>
        <p className="mt-4 max-w-3xl text-ink-2">{T.sub(ex.name, p.token)}</p>

        {/* key facts */}
        <dl className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className={tile}><dt className="text-xs font-semibold text-ink-3">{T.start}</dt><dd className="mt-1 font-mono font-bold">{shortDate(p.start, lang)}</dd>
            {!live && !ended && <dd className="text-xs text-sky">{T.startsIn} {duration(p.start - now, t.time)}</dd>}</div>
          <div className={tile}><dt className="text-xs font-semibold text-ink-3">{T.end}</dt><dd className="mt-1 font-mono font-bold">{shortDate(p.end, lang)}</dd>
            {!ended && <dd className="text-xs text-lime">{T.endsIn} {duration(p.end - now, t.time)}</dd>}</div>
          <div className={tile}><dt className="text-xs font-semibold text-ink-3">{T.fund}</dt><dd className="mt-1 font-mono font-bold">{p.rewardUsd ? compactUsd(p.rewardUsd) : "—"}</dd>
            {p.rewardTotal ? <dd className="text-xs text-ink-3">{fmtNum(p.rewardTotal)} {p.token}</dd> : null}</div>
          <div className={tile}><dt className="text-xs font-semibold text-ink-3">{T.users}</dt><dd className="mt-1 font-mono font-bold">{fmtNum(participants)}</dd></div>
        </dl>

        {/* CTA */}
        <div className="mt-6 flex flex-wrap gap-2">
          {!ended && <a href={p.url} target="_blank" rel="noopener" className="btn btn-primary h-12 px-6 text-base">{T.go(ex.name)} ↗</a>}
          {rulesPromo && <a href={withBase(`/${lang}/p/${slugOf(rulesPromo)}/`)} className="btn btn-ghost h-12 px-5">{T.rulesOur}</a>}
          {p.rulesUrl && <a href={p.rulesUrl} target="_blank" rel="noopener" className="btn btn-ghost h-12 px-5">{T.rulesOrig}</a>}
        </div>
        {ended && <p className="mt-4 rounded-2xl border border-line bg-white/[0.02] p-4 text-sm text-ink-2">{T.endedNote}</p>}

        {/* pools */}
        <section className="mt-12">
          <h2 className="font-display text-2xl font-semibold tracking-tight">{T.poolsTitle}</h2>
          <p className="mt-1 text-sm text-ink-3">{T.poolsSub}</p>
          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
            {p.pools.map((x) => (
              <div key={x.stake} className="card p-5 hover:transform-none">
                <div className="flex items-center gap-3">
                  <VenueLogo v={{ name: x.stake, logo: x.stakeLogo, color: "#2a313b", ink: "#eef2f6", monogram: x.stake.slice(0, 3) }} size={36} rounded="rounded-full" />
                  <div className="min-w-0">
                    <div className="font-bold">{T.stake} {x.stake} → {p.token}</div>
                    {x.reward ? <div className="text-xs text-ink-3">{T.fund}: {fmtNum(x.reward)} {p.token}{pxOf(p.token) ? ` ≈ ${compactUsd(x.reward * pxOf(p.token)!)}` : ""}</div> : null}
                  </div>
                  <div className="ml-auto text-right">
                    <div className={`font-mono text-2xl font-bold ${(x.apr ?? 0) >= 50 ? "text-lime" : "text-ink"}`}>{fmtApr(x.apr)}</div>
                    <div className="text-xs text-ink-3">{ended ? "APR" : T.apr}{x.aprStart ? ` · ${T.aprStart} ${fmtApr(x.aprStart)}` : ""}</div>
                    {!ended && (() => {
                      const hc = hedgeCalc(x, p, data.hedge, 1000, now);
                      if (!hc.needed) return null;
                      // a negative hedged APR next to the pool APR read as a second, contradictory APR (audit 12.11)
                      if (hc.possible && hc.hedgedApr !== undefined && hc.hedgedApr <= 0) return <div className="mt-1 text-xs font-semibold text-ink-3" title={t.lp.hedgeNote}>{HEDGE_LOSS_LP[lang]}</div>;
                      return (
                        <div className={`mt-1 font-mono text-sm font-bold ${hc.possible && (hc.hedgedApr ?? 0) > 0 ? "text-teal" : "text-ink-3"}`} title={t.lp.hedgeNote}>
                          {hc.possible && hc.hedgedApr !== undefined ? fmtApr(hc.hedgedApr) : "—"} <span className="font-sans text-xs font-semibold">{t.lp.hedgeApr}</span>
                        </div>
                      );
                    })()}
                  </div>
                </div>
                <dl className="mt-4 grid grid-cols-2 gap-2 text-sm">
                  <div><dt className="text-xs font-bold uppercase tracking-wider text-ink-3">{T.limits}</dt>
                    <dd className="font-mono">{x.minStake || x.maxStake ? [x.minStake ? `${T.min} ${fmtNum(x.minStake)}` : "", x.maxStake ? `${T.max} ${fmtNum(x.maxStake)}` : ""].filter(Boolean).join(" · ") + ` ${x.stake}` : T.noLimit}</dd></div>
                  <div><dt className="text-xs font-bold uppercase tracking-wider text-ink-3">{T.staked}</dt>
                    <dd className="font-mono">{x.staked ? `${fmtNum(x.staked)} ${x.stake}${pxOf(x.stake) && !isStable(x.stake) ? ` ≈ ${compactUsd(x.staked * pxOf(x.stake)!)}` : ""}` : "—"}{x.participants ? ` · ${fmtNum(x.participants)} ${plural(x.participants, lang, "participant")}` : ""}</dd></div>
                </dl>
                {!ended && (data.hedge[x.stake] || (x.stake !== p.token && data.hedge[p.token])) && (
                  <div className="mt-3 flex flex-col gap-1.5">
                    <HedgeVenues coin={x.stake} hedge={data.hedge[x.stake]} lang={lang} />
                    {x.stake !== p.token && <HedgeVenues coin={p.token} hedge={data.hedge[p.token]} lang={lang} />}
                  </div>
                )}
                {!ended && realApr(x) !== undefined && (
                  <p className="mt-3 flex flex-wrap items-center gap-1.5 text-xs text-ink-3">
                    {CHART_TX[lang].real}: <span className={`font-mono font-bold ${realApr(x)! >= (x.apr ?? 0) * 0.7 ? "text-ink" : "text-amber"}`}>{fmtApr(realApr(x))}</span>
                    <Hint lang={lang}>{CHART_TX[lang].realNote}</Hint>
                  </p>
                )}
                {x.newUsers && <p className="mt-3 rounded-lg bg-amber/10 px-3 py-2 text-xs font-semibold text-amber">{T.newUsers}</p>}
                {x.stake === p.token && <p className="mt-3 rounded-lg bg-rose/10 px-3 py-2 text-xs font-semibold text-rose">{T.priceRisk}</p>}
              </div>
            ))}
          </div>
        </section>

        {/* history charts (audit 12.11): APR, participants and value staked over time, per stake coin */}
        {(aprSeries.length > 0 || usersSeries.length > 0 || stakedSeries.length > 0) && (
          <section className="mt-14">
            <h2 className="font-display text-2xl font-semibold tracking-tight">{CHART_TX[lang].title}</h2>
            <p className="mt-1 text-sm text-ink-3">{CHART_TX[lang].sub}</p>
            <div className="mt-4 grid grid-cols-1 gap-3 lg:grid-cols-3">
              {([[CHART_TX[lang].apr, aprSeries, "pct"], [CHART_TX[lang].users, usersSeries, "num"], [CHART_TX[lang].staked, stakedSeries, "usd"]] as const).map(([title, ser, kind]) => ser.length > 0 && (
                <div key={title} className="card p-4 hover:transform-none">
                  <h3 className="mb-2 text-sm font-bold">{title}</h3>
                  <LineChart series={ser} locale={locale} height={200} kind={kind} />
                </div>
              ))}
            </div>
          </section>
        )}

        {/* earnings */}
        {!ended && (
          <section className="mt-12">
            <h2 className="flex flex-wrap items-center gap-2 font-display text-2xl font-semibold tracking-tight">{T.calcTitle} <Hint lang={lang}>{T.calcSub}</Hint></h2>
            <div className="mt-4 overflow-x-auto rounded-2xl border border-line">
              <table className="w-full min-w-[520px] text-left text-sm">
                <thead className="bg-white/[0.03] text-xs font-bold uppercase tracking-wider text-ink-3">
                  <tr><th className="px-4 py-3">{T.stake}</th><th className="px-4 py-3">{T.with("$100")}</th><th className="px-4 py-3">{T.with(`$${num(1000, lang, 0)}`)}</th><th className="px-4 py-3">{T.withMax}</th></tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {p.pools.map((x) => {
                    const cells = [100, 1000, undefined].map((a) => earn(x, p, data.prices, now, a));
                    return (
                      <tr key={x.stake}>
                        <td className="px-4 py-3 font-bold">{x.stake}</td>
                        {cells.map((c, i) => (
                          <td key={i} className="px-4 py-3">
                            {!x.apr ? <span className="text-ink-3">{T.noApr}</span>
                              : !c ? <span className="text-ink-3">—</span>
                              : c.below ? <span className="text-xs font-semibold text-amber">{T.belowMin(`${fmtNum(x.minStake)} ${x.stake}`)}</span>
                              : <><div className="font-mono font-bold text-ink">≈ {usd(c.total, lang)}</div>
                                  <div className="font-mono text-xs text-ink-3">{i === 2 ? `${STAKE_OF[lang](usd(c.amount, lang))} · ` : ""}{usd(c.perDay, lang)}{T.perDay} · {T.untilEnd}</div></>}
                          </td>
                        ))}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {/* how to join */}
        {steps && steps.length > 0 && (
          <section className="mt-12">
            <h2 className="font-display text-2xl font-semibold tracking-tight">{T.stepsTitle}</h2>
            <ol className="mt-4 space-y-3">
              {steps.map((s, i) => (
                <li key={i} className="card flex gap-4 p-4 hover:transform-none">
                  <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-lime/10 font-mono text-sm font-bold text-lime">{i + 1}</span>
                  <div className="min-w-0">
                    <div className="font-bold">{s.h.replaceAll("{n}", ex.name)}</div>
                    <p className="mt-1 text-sm leading-relaxed text-ink-2">{s.b.replaceAll("{n}", ex.name)}</p>
                  </div>
                </li>
              ))}
            </ol>
            {guide && <a href={withBase(`/${lang}/learn/guide/${guide.id}/`)} className="mt-3 inline-block text-sm font-bold text-lime hover:underline">{T.fullGuide}</a>}
          </section>
        )}

        {/* pros & cons for each pool */}
        <section className="mt-12">
          <h2 className="font-display text-2xl font-semibold tracking-tight">{T.prosTitle}</h2>
          <p className="mt-1 text-sm text-ink-3">{T.prosSub}</p>
          <div className="mt-4 space-y-4">
            {p.pools.map((x) => (
              <div key={x.stake} className="card p-5 hover:transform-none">
                {p.pools.length > 1 && <div className="mb-3 font-bold">{T.stake} {x.stake}</div>}
                <ProsCons lang={lang} max={12} pc={poolPC(lang, p, x, { now, chgStake: data.changes[x.stake], chgReward: data.changes[p.token], price: data.prices[x.stake] ?? (isStable(x.stake) ? 1 : undefined), hedge: data.hedge, amountUsd: 1000 })} />
              </div>
            ))}
          </div>
        </section>

        {/* how launchpools work */}
        <section className="mt-12">
          <h2 className="font-display text-2xl font-semibold tracking-tight">{t.lp.howTitle}</h2>
          <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-3">
            {t.lp.how.map(([h, b]) => (
              <div key={h} className="card p-5 hover:transform-none"><h3 className="font-bold">{h}</h3><p className="mt-2 text-sm leading-relaxed text-ink-2">{b}</p></div>
            ))}
          </div>
        </section>

        {!ended && (
          <div className="mt-10 flex flex-wrap gap-2">
            <a href={p.url} target="_blank" rel="noopener" className="btn btn-primary h-12 px-6 text-base">{T.go(ex.name)} ↗</a>
          </div>
        )}
        <p className="mt-6 text-xs text-ink-3">{T.disclaimer}</p>
      </main>
      <Footer t={t} fetchedAt={now} lang={lang} />
    </>
  );
}
