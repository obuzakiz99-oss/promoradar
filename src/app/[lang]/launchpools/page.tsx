import type { Metadata } from "next";
import { YieldTabs } from "@/components/SectionTabs";
import { notFound } from "next/navigation";
import Link from "next/link";
import { getDict, isLocale, type Locale } from "@/lib/i18n";
import { getPools, LP_ANN, LP_API, LP_RE, type PoolProject } from "@/lib/pools";
import { readHistory } from "@/lib/history";
import { getPromos } from "@/lib/promos";
import { slugOf } from "@/lib/slug";
import { withBase } from "@/lib/base";
import { venueOf } from "@/config/site";
import { compactUsd, shortDate } from "@/lib/format";
import { LaunchpoolBoard } from "@/components/LaunchpoolBoard";
import { VenueLogo } from "@/components/VenueLogo";
import { Footer } from "@/components/Sections";
import { PROX } from "@/lib/i18n-pro";

export const revalidate = 300; // pools move fast: 5 min

type Params = Promise<{ lang: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { lang } = await params;
  if (!isLocale(lang)) return {};
  const t = getDict(lang);
  return { title: `Launchpool Radar — ${t.lp.title}`, description: t.lp.sub, alternates: { canonical: `/${lang}/launchpools` } };
}

const EX_IDS = LP_API;
const ANN_IDS = Object.keys(LP_ANN);
const fmtNum = (n?: number) => (n === undefined ? "—" : n >= 1e9 ? `${+(n / 1e9).toFixed(2)}B` : n >= 1e6 ? `${+(n / 1e6).toFixed(2)}M` : n >= 1e3 ? `${+(n / 1e3).toFixed(1)}K` : `${+n.toFixed(2)}`);

const aprFmt = (x: number) => (x >= 100 ? x.toFixed(0) : x.toFixed(1));
const aprRange = (lo: number, hi: number) => (aprFmt(lo) === aprFmt(hi) ? `${aprFmt(hi)}%` : `${aprFmt(lo)}–${aprFmt(hi)}%`);

function period(p: PoolProject, lang: Locale) {
  return `${shortDate(p.start, lang)} – ${shortDate(p.end, lang)}`;
}

const MORE_TX = { uk: "Глянути більше", en: "Show more", ru: "Показать больше" } as const;
const LESS_TX = { uk: "Згорнути", en: "Show less", ru: "Свернуть" } as const;
// archive cells the exchange never published: a muted "no data" with an explanation instead of a bare dash
const NO_DATA = { uk: ["н/д", "Біржа не публікувала цей показник"], en: ["n/a", "The exchange did not publish this figure"], ru: ["н/д", "Биржа не публиковала этот показатель"] } as const;

export default async function Launchpools({ params }: { params: Params }) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  const t = getDict(lang);
  const L = t.lp;
  const [{ projects, prices, changes, hedge, totals, status, fetchedAt }, { promos }] = await Promise.all([getPools(), getPromos(lang)]);
  const now = fetchedAt;
  // official Launchpool-type announcements from exchanges without an open API (last 45 days)
  const ann = promos
    .filter((p) => ANN_IDS.includes(p.venue.id) && LP_RE.test(p.title) && (p.endsAt ? p.endsAt > now : now - p.publishedAt < 45 * 86400_000))
    .sort((a, b) => b.publishedAt - a.publishedAt).slice(0, 24);
  const annVenues = Object.fromEntries(ANN_IDS.map((id) => [id, venueOf(id)]));
  const active = projects.filter((p) => p.status !== "ended");
  // APR sparklines for live pools: our snapshots of the last 7 days, thinned to ≤ 40 points
  const snaps = readHistory().filter((s) => now - s.t < 7 * 86400_000);
  const sparks: Record<string, number[]> = {};
  for (const p of active) for (const x of p.pools) {
    const key = `${p.exchange}:${p.id}:${x.stake}`;
    const pts = snaps.map((s) => s.pools?.[key]?.apr).filter((a): a is number => typeof a === "number" && a > 0);
    if (pts.length >= 3) sparks[key] = pts.filter((_, i) => i % Math.ceil(pts.length / 40) === 0 || i === pts.length - 1);
  }
  const ended = projects.filter((p) => p.status === "ended");
  const livePools = active.flatMap((p) => p.pools);
  const bestApr = Math.max(0, ...active.filter((p) => p.status === "live").flatMap((p) => p.pools.map((x) => x.apr ?? 0)));
  const rewardsUsd = active.reduce((s, p) => s + (p.rewardUsd ?? 0), 0);
  const exchanges = Object.fromEntries(EX_IDS.map((id) => [id, venueOf(id)]));
  const quiet = EX_IDS.filter((id) => !active.some((p) => p.exchange === id));

  const stats = EX_IDS.map((id) => {
    const list = projects.filter((p) => p.exchange === id);
    const done = list.filter((p) => p.status === "ended");
    const avgDays = done.length ? done.reduce((s, p) => s + (p.end - p.start) / 86400_000, 0) / done.length : 0;
    const last = list.reduce((m, p) => Math.max(m, p.start), 0);
    return { id, count: totals[id] ?? list.length, avgDays, last, ok: status[id]?.ok };
  });

  const archive = ended.slice().sort((a, b) => b.end - a.end).slice(0, 30);

  return (
    <>
      <main>
        {/* hero */}
        <section className="relative mx-auto max-w-7xl px-4 pb-8 pt-10 sm:px-6">
          <div className="pointer-events-none absolute right-0 top-0 -z-10 size-[28rem] rounded-full bg-lime/10 blur-3xl" />
          <div className="mb-8"><YieldTabs lang={lang} active="lp" updated={fetchedAt} /></div>
          <h1 className="mt-5 max-w-3xl font-display text-[2.1rem] font-semibold leading-[1.06] tracking-[-0.02em] sm:text-5xl lg:text-6xl">
            <span className="text-gradient">Launchpool</span> Radar
            <span className="mt-2 block text-[0.55em] font-medium leading-tight text-ink-2">{L.title}</span>
          </h1>
          <p className="mt-5 max-w-2xl text-ink-2 sm:text-lg">{L.sub}</p>
          <dl className="mt-6 grid max-w-3xl grid-cols-4 gap-2 sm:gap-3">
            {[
              [String(livePools.length), L.statLive],
              [rewardsUsd ? compactUsd(rewardsUsd) : "—", L.statRewards],
              [bestApr ? `${bestApr >= 100 ? Math.round(bestApr) : bestApr.toFixed(1)}%` : "—", L.statBest],
              [String(EX_IDS.length + ANN_IDS.length), L.statEx],
            ].map(([v, l]) => (
              <div key={l} className="min-w-0 rounded-2xl border border-line bg-white/[0.02] px-2.5 py-2.5 sm:px-4 sm:py-3.5">
                <dt className="sr-only">{l}</dt>
                <dd className="font-display text-lg font-semibold tracking-tight sm:text-3xl">{v}</dd>
                <dd className="mt-1 text-xs font-semibold text-ink-3 sm:text-sm">{l}</dd>
              </div>
            ))}
          </dl>
          {/* audit round 5: say plainly where the live pools come from, instead of only "N exchanges tracked" */}
          <p className="mt-3 max-w-3xl text-xs leading-relaxed text-ink-3">
            {(() => {
              const by = (ok: (x: { ok: boolean; live: number }) => boolean) => Object.entries(status).filter(([, x]) => ok(x)).map(([id]) => venueOf(id).name);
              const live = by((x) => x.ok && x.live > 0), idle = by((x) => x.ok && x.live === 0), down = by((x) => !x.ok);
              const S = ({
                uk: { live: "Активні пули зараз", idle: "без активних пулів", down: "тимчасово без даних", ann: "ще з оголошень" },
                en: { live: "Live pools now", idle: "no live pools", down: "data temporarily unavailable", ann: "plus from announcements" },
                ru: { live: "Активные пулы сейчас", idle: "без активных пулов", down: "временно без данных", ann: "ещё из объявлений" },
              } as const)[lang];
              return [
                `${S.live}: ${live.join(", ") || "—"}`,
                idle.length ? `${idle.join(", ")} — ${S.idle}` : "",
                down.length ? `${down.join(", ")} — ${S.down}` : "",
                ANN_IDS.length ? `${S.ann}: ${ANN_IDS.map((id) => venueOf(id).name).join(", ")}` : "",
              ].filter(Boolean).join(" · ");
            })()}
          </p>
        </section>

        {/* board */}
        <section className="mx-auto max-w-7xl px-4 sm:px-6">
          <LaunchpoolBoard projects={active} prices={prices} changes={changes} hedge={hedge} exchanges={exchanges} t={t} lang={lang} serverNow={now} sparks={sparks}
            extra={ann.map((p) => ({ id: p.id, href: withBase(`/${lang}/p/${slugOf(p)}/`), venue: p.venue, title: p.title, date: p.publishedAt || undefined, reward: p.reward?.label, endsAt: p.endsAt }))} />
          <p className="mt-4 text-xs text-ink-3">{L.disclaimer}</p>

          {quiet.length > 0 && (
            <div className="mt-6 rounded-2xl border border-dashed border-line-2 p-5">
              <p className="text-sm text-ink-2">{L.none}</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {quiet.map((id) => {
                  const s = stats.find((x) => x.id === id)!;
                  return (
                    <a key={id} href={withBase(`/${lang}/v/${id}/`)} className="flex h-11 items-center gap-2.5 rounded-xl border border-line bg-white/[0.02] pl-1.5 pr-3.5 text-sm font-bold text-ink-2 hover:border-line-2 hover:text-ink">
                      <VenueLogo v={exchanges[id]} size={30} rounded="rounded-lg" />
                      {exchanges[id].name}
                      {s.last ? <span className="font-mono text-xs font-medium text-ink-3">{L.lastAgo}: {shortDate(s.last, lang)}</span> : null}
                    </a>
                  );
                })}
              </div>
            </div>
          )}
        </section>

        {/* exchanges without an API: their cards are mixed into the board above; here — links to their official pages */}
        <section className="mx-auto max-w-7xl px-4 pt-10 sm:px-6">
          <p className="text-sm text-ink-3">{L.annSub}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {ANN_IDS.map((id) => (
              <a key={id} href={LP_ANN[id]} target="_blank" rel="noopener" className="flex h-10 items-center gap-2 rounded-xl border border-line bg-white/[0.02] pl-1.5 pr-3 text-sm font-bold text-ink-2 hover:border-line-2 hover:text-ink">
                <VenueLogo v={annVenues[id]} size={26} rounded="rounded-lg" />
                {annVenues[id].name}
                <span className="font-mono text-xs font-medium text-ink-3">{ann.filter((p) => p.venue.id === id).length || ""}</span>
              </a>
            ))}
          </div>
        </section>

        {/* link to the analytics page */}
        <section className="adv mx-auto max-w-7xl px-4 pt-12 sm:px-6">
          <Link href={`/${lang}/insights`} className="card flex items-center gap-4 p-5 sm:p-6">
            <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-lime/10 text-2xl">📊</span>
            <span className="min-w-0">
              <span className="block font-bold">{PROX[lang].insTitle}</span>
              <span className="mt-0.5 block text-sm text-ink-2">{PROX[lang].listSub}</span>
            </span>
            <span className="ml-auto text-lime">→</span>
          </Link>
        </section>

        {/* exchange stats */}
        <section className="adv mx-auto max-w-7xl px-4 pt-16 sm:px-6">
          <h2 className="font-display text-2xl font-semibold tracking-tight sm:text-3xl">{L.statsTitle}</h2>
          <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {stats.map((s) => (
              <div key={s.id} className="card p-5 hover:transform-none" style={{ ["--tint" as string]: exchanges[s.id].color }}>
                <div className="flex items-center gap-3">
                  <VenueLogo v={exchanges[s.id]} size={34} />
                  <span className="font-bold">{exchanges[s.id].name}</span>
                  <span className={`ml-auto size-2 rounded-full ${s.ok ? "bg-lime" : "bg-rose"}`} />
                </div>
                <dl className="mt-4 grid grid-cols-3 gap-2 text-center">
                  <div><dd className="font-mono text-lg font-bold">{s.count}</dd><dt className="text-xs font-semibold leading-tight text-ink-3">{L.statsCount}</dt></div>
                  <div><dd className="font-mono text-lg font-bold">{s.avgDays ? s.avgDays.toFixed(0) : "—"}</dd><dt className="text-xs font-semibold leading-tight text-ink-3">{L.statsAvgDays}</dt></div>
                  <div><dd className="font-mono text-lg font-bold">{s.last ? shortDate(s.last, lang) : "—"}</dd><dt className="text-xs font-semibold leading-tight text-ink-3">{L.statsLast}</dt></div>
                </dl>
              </div>
            ))}
          </div>
        </section>

        {/* archive */}
        <section className="adv mx-auto max-w-7xl px-4 pt-16 sm:px-6">
          <h2 className="font-display text-2xl font-semibold tracking-tight sm:text-3xl">{L.archive}</h2>
          <p className="mt-1.5 text-sm text-ink-3">{L.archiveSub}</p>
          {(() => {
            const tableOf = (rows: typeof archive) => (
            <div className="mt-6 overflow-x-auto rounded-2xl border border-line">
              <table className="w-full min-w-[760px] text-left text-sm">
                <thead className="bg-white/[0.03] text-xs font-bold uppercase tracking-wider text-ink-3">
                  <tr>{[L.colToken, L.colEx, L.colDate, L.colStake, L.colApr, L.colReward, L.colUsers].map((h) => <th key={h} className="px-4 py-3">{h}</th>)}</tr>
                </thead>
                  <tbody className="divide-y divide-line">
                  {rows.map((p) => {
                    const aprs = p.pools.map((x) => x.apr).filter((x): x is number => x !== undefined && x > 0);
                    return (
                      <tr key={p.id} className="hover:bg-white/[0.02]">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2.5">
                            <VenueLogo v={{ name: p.token, logo: p.logo, color: "#2a313b", ink: "#eef2f6", monogram: p.token.slice(0, 3) }} size={28} rounded="rounded-lg" />
                            <span className="font-bold">{p.name}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3"><span className="flex items-center gap-2 font-semibold text-ink-2"><VenueLogo v={exchanges[p.exchange]} size={20} rounded="rounded-md" />{exchanges[p.exchange].name}</span></td>
                        <td className="whitespace-nowrap px-4 py-3 font-mono text-xs text-ink-2">{period(p, lang)}</td>
                        <td className="px-4 py-3 text-ink-2">{[...new Set(p.pools.map((x) => x.stake))].join(", ")}</td>
                        <td className="whitespace-nowrap px-4 py-3 font-mono font-bold">{aprs.length ? aprRange(Math.min(...aprs), Math.max(...aprs)) : <span className="font-sans text-xs font-semibold text-ink-3" title={NO_DATA[lang][1]}>{NO_DATA[lang][0]}</span>}</td>
                        <td className="whitespace-nowrap px-4 py-3 font-mono">{p.rewardUsd ? compactUsd(p.rewardUsd) : `${fmtNum(p.rewardTotal)} ${p.token}`}</td>
                        <td className="px-4 py-3 font-mono text-ink-2">{(() => { const n = p.participants ?? (p.pools.reduce((s, x) => s + (x.participants ?? 0), 0) || undefined); return n === undefined ? <span className="font-sans text-xs font-semibold text-ink-3" title={NO_DATA[lang][1]}>{NO_DATA[lang][0]}</span> : fmtNum(n); })()}</td>
                      </tr>
                    );
                  })}
                  </tbody>
              </table>
            </div>
            );
            return (
              <>
                {tableOf(archive.slice(0, 10))}
                {archive.length > 10 && (
                  <details className="group mt-3">
                    <summary className="btn btn-ghost mx-auto flex h-11 w-fit cursor-pointer list-none px-5 text-sm [&::-webkit-details-marker]:hidden">
                      <span className="group-open:hidden">{MORE_TX[lang]} · {archive.length - 10}</span><span className="hidden group-open:inline">{LESS_TX[lang]}</span>
                    </summary>
                    {tableOf(archive.slice(10))}
                  </details>
                )}
              </>
            );
          })()}
        </section>

        {/* how it works */}
        <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6">
          <h2 className="font-display text-2xl font-semibold tracking-tight sm:text-3xl">{L.howTitle}</h2>
          <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-3">
            {L.how.map(([h, b], i) => (
              <div key={h} className="card p-6 hover:transform-none">
                <span className={`grid size-10 place-items-center rounded-xl font-mono text-sm font-bold ${i === 2 ? "bg-rose/10 text-rose" : "bg-lime/10 text-lime"}`}>{i === 2 ? "!" : i + 1}</span>
                <h3 className="mt-4 text-lg font-bold">{h}</h3>
                <p className="mt-2 text-sm leading-relaxed text-ink-2">{b}</p>
              </div>
            ))}
          </div>
        </section>
      </main>
      <Footer t={t} fetchedAt={fetchedAt} lang={lang} />
    </>
  );
}
