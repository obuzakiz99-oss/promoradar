"use client";
import { Spark } from "./Spark";
import { Term } from "./Term";
import { useNovice } from "./NoviceToggle";
import { LEVEL_CLS, LEVEL_TXT, plainProfit, poolLevel } from "@/lib/level";
import { useEffect, useMemo, useState } from "react";
import type { Dict, Locale } from "@/lib/i18n";
import type { Hedge, Pool, PoolProject } from "@/lib/pools";
import type { Venue } from "@/lib/types";
import { VenueLogo } from "./VenueLogo";
import { withBase } from "@/lib/base";
import { lpSlug } from "@/lib/lpslug";
import { HedgeVenues } from "./HedgeVenues";
import { ProsCons } from "./ProsCons";
import { compactUsd, duration } from "@/lib/format";
import { hedgeCalc, poolPC, type HedgeCalc } from "@/lib/proscons";

type Sort = "profit" | "apr" | "hedged" | "end";
const BELOW: Record<Locale, (min: string) => string> = { uk: (m) => `Сума менша за мінімум (від ${m})`, en: (m) => `Below the minimum (from ${m})`, ru: (m) => `Сумма меньше минимума (от ${m})` };
const HEDGE_VIA: Record<Locale, (c: string, ex: string) => string> = { uk: (c, ex) => `шорт ${c} на ${ex}`, en: (c, ex) => `short ${c} on ${ex}`, ru: (c, ex) => `шорт ${c} на ${ex}` };
const OPEN: Record<Locale, string> ={ uk: "Умови та як взяти участь", en: "Rules & how to join", ru: "Условия и как участвовать" };
const MORE: Record<Locale, string> ={ uk: "Детальніше: плюси, мінуси, хедж", en: "More: pros, cons, hedge", ru: "Подробнее: плюсы, минусы, хедж" };
const PRESETS = [100, 1000, 10000];

function tokenVenue(name: string, logo?: string): Pick<Venue, "name" | "logo" | "color" | "ink" | "monogram"> {
  let h = 0; for (const c of name) h = (h * 31 + c.charCodeAt(0)) % 360;
  return { name, logo, color: `hsl(${h} 70% 62%)`, ink: "#0b0d10", monogram: name.slice(0, 3) };
}
const fmtNum = (n: number) => (n >= 1e6 ? `${+(n / 1e6).toFixed(2)}M` : n >= 1e3 ? `${+(n / 1e3).toFixed(1)}K` : `${+n.toFixed(n < 1 ? 4 : 2)}`);
const UNIT: Record<Locale, { label: string; hint: string }> = {
  uk: { label: "Одиниця суми", hint: "Оберіть монету для стейку праворуч — і суму можна буде ввести в ній (наприклад, 0.05 BTC)." },
  en: { label: "Amount unit", hint: "Pick a stake coin on the right — then you can enter the amount in it (e.g. 0.05 BTC)." },
  ru: { label: "Единица суммы", hint: "Выберите монету для стейка справа — и сумму можно будет ввести в ней (например, 0.05 BTC)." },
};
const PICK: Record<Locale, { off: string; on: string; mine: string }> = {
  uk: { off: "Рахувати для цього пулу", on: "Обрано", mine: "обраний пул" },
  en: { off: "Calculate for this pool", on: "Selected", mine: "selected pool" },
  ru: { off: "Считать для этого пула", on: "Выбрано", mine: "выбранный пул" },
};
const BEST: Record<Locale, string> = { uk: "Найкращий", en: "Best", ru: "Лучший" };
const chgText = (x: number) => (x >= 0 ? "text-success" : "text-rose");
const fmtUsd = (n: number) => (n >= 1000 ? compactUsd(n) : `$${n.toFixed(n < 10 ? 2 : 0)}`);

interface Row {
  p: PoolProject; pool: Pool; price?: number; stakeCoins?: number; usd?: number; perDay?: number; profit?: number; capped: boolean; belowMin: boolean;
  chgStake?: number; chgReward?: number;   // 24h price change, %
  adjusted?: number;                       // profit if prices move again like the last 24h
  danger: boolean;                         // big drop / adjusted loss → loud warning
  hc: HedgeCalc;                           // delta-neutral version of this pool
}

const fmtPct = (x: number) => `${x >= 100 || x <= -100 ? Math.round(x) : x.toFixed(1)}%`;

/** "Hedged APR" panel: where to short, funding, entry/exit cost and the size up to which it still makes sense. */
function HedgeBox({ r, L }: { r: Row; L: Dict["lp"] }) {
  const hc = r.hc;
  if (!hc.needed) return <div className="rounded-xl bg-white/[0.03] px-3.5 py-3 text-[12.5px] font-semibold text-ink-2">🛡 {L.hedgeNotNeeded}</div>;
  if (!hc.possible) return <div className="rounded-xl bg-white/[0.03] px-3.5 py-3 text-[12.5px] font-semibold text-ink-3">🛡 {L.hedgeImpossible.replace("{c}", r.pool.stake)}</div>;
  const good = (hc.hedgedApr ?? 0) > 0;
  return (
    <div className={`rounded-xl border px-3.5 py-3 ${good ? "border-teal/25 bg-teal/[0.06]" : "border-line bg-white/[0.03]"}`} title={L.hedgeNote}>
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-xs font-semibold text-ink-3">🛡 {L.hedgeApr}</span>
        <span className={`font-mono text-lg font-bold ${good ? "text-teal" : "text-ink-3"}`}>≈{fmtPct(hc.hedgedApr ?? 0)}</span>
      </div>
      <ul className="mt-1.5 space-y-0.5 text-xs text-ink-2">
        <li>• {L.shortOn.replace("{c}", r.pool.stake).replace("{ex}", hc.venue ?? "")}</li>
        <li>• {L.funding.replace("{x}", `${(hc.fundingApr ?? 0) > 0 ? "+" : ""}${fmtPct(hc.fundingApr ?? 0)}`)}</li>
        <li>• {L.hedgeCost.replace("{x}", fmtPct(hc.costPct ?? 0))}</li>
        {hc.sensibleUsd !== undefined && (hc.sensibleUsd >= 50
          ? <li className="font-semibold text-ink">• {L.sensible.replace("{x}", fmtUsd(hc.sensibleUsd))}</li>
          : <li className="font-semibold text-ink-3">• {L.notWorth}</li>)}
      </ul>
    </div>
  );
}

const fmtChg = (c: number) => `${c > 0 ? "+" : ""}${Math.abs(c) >= 10 ? c.toFixed(0) : c.toFixed(1)}%`;

/** Launchpool-type campaigns known only from an exchange's official announcement (OKX, HTX, Bybit…): no API numbers. */
export interface AnnPool { id: string; href: string; venue: Venue; title: string; date?: number; reward?: string; endsAt?: number }

export function LaunchpoolBoard({ projects, prices, changes = {}, hedge = {}, exchanges, t, lang, serverNow, sparks = {}, extra = [] }: {
  projects: PoolProject[]; prices: Record<string, number>; changes?: Record<string, number>; hedge?: Record<string, Hedge>;
  exchanges: Record<string, Venue>; t: Dict; lang: Locale; serverNow: number; sparks?: Record<string, number[]>; extra?: AnnPool[];
}) {
  const L = t.lp;
  const [now, setNow] = useState(serverNow);
  const [text, setText] = useState("1000");
  const [coin, setCoinS] = useState("all");
  // the amount can be typed in dollars or in the chosen stake coin (0.05 BTC, 500 KOR); everything below works in dollars
  const [unit, setUnit] = useState<"usd" | "coin">("usd");
  const typed = Math.min(1e12, Number(text.replace(/[^\d.]/g, "")) || 0);
  const coinPrice = coin !== "all" ? prices[coin] : undefined;
  const inCoin = unit === "coin" && !!coinPrice;
  const amount = Math.min(1e9, inCoin ? typed * coinPrice! : typed);
  const setAmount = (v: number) => { setUnit("usd"); setText(String(v)); };
  const setCoin = (c: string) => {
    // keep the same money when switching coins: re-express a coin amount in the new coin (or in dollars)
    if (inCoin) {
      const p = c !== "all" ? prices[c] : undefined;
      if (p) setText(String(+(amount / p).toPrecision(6))); else { setUnit("usd"); setText(String(Math.round(amount))); }
    }
    setCoinS(c);
  };
  const toggleUnit = (u: "usd" | "coin") => {
    if (u === unit || !coinPrice) return;
    setText(String(u === "coin" ? +(amount / coinPrice).toPrecision(6) : Math.round(amount)));
    setUnit(u);
  };
  const [sort, setSort] = useState<Sort>("profit");
  const novice = useNovice();
  useEffect(() => { setNow(Date.now()); const i = setInterval(() => setNow(Date.now()), 30_000); return () => clearInterval(i); }, []);

  const coins = useMemo(() => [...new Set(projects.flatMap((p) => p.pools.map((x) => x.stake)))].sort(), [projects]);

  const rowsRaw = useMemo(() => {
    const out: Row[] = [];
    for (const p of projects) for (const pool of p.pools) {
      if (coin !== "all" && pool.stake !== coin) continue;
      if (novice && poolLevel(pool.stake, p.token) === "hard") continue;   // beginners: no new-token / small-cap stakes
      const price = prices[pool.stake];
      const chgStake = changes[pool.stake], chgReward = changes[p.token];
      const maxUsd = pool.maxStake && price ? pool.maxStake * price : undefined;
      const row: Row = {
        p, pool, price, capped: false, belowMin: false, chgStake, chgReward, danger: false,
        hc: hedgeCalc(pool, p, hedge, Math.min(amount, maxUsd ?? Infinity), now, maxUsd),
      };
      if (price && pool.apr !== undefined) {
        let coins = amount / price;
        if (pool.maxStake && coins > pool.maxStake) { coins = pool.maxStake; row.capped = true; }
        row.belowMin = !!pool.minStake && coins < pool.minStake;
        const days = Math.max(0, ((p.status === "live" ? p.end - now : p.end - p.start) / 86400_000));
        row.stakeCoins = coins; row.usd = coins * price;
        row.perDay = row.belowMin ? 0 : (row.usd * pool.apr) / 100 / 365;
        row.profit = row.perDay * days;
        // stress test: rewards are paid in the new token and the stake keeps its own price risk —
        // what's left if both move once more like they did in the last 24h?
        if (!row.belowMin && (chgReward !== undefined || chgStake !== undefined)) {
          row.adjusted = row.profit * (1 + (chgReward ?? 0) / 100) + row.usd * ((chgStake ?? 0) / 100);
        }
      }
      row.danger = (chgStake ?? 0) <= -20 || (chgReward ?? 0) <= -30 || (row.adjusted !== undefined && row.profit !== undefined && row.adjusted < 0 && row.profit > 0);
      out.push(row);
    }
    return out;
  }, [projects, prices, changes, hedge, amount, coin, now, novice]);

  // The order must not jump while the amount is being typed (profit depends on the amount through pool caps):
  // it is recomputed ~1 s after typing stops, and a pool the visitor picked stays on top.
  const rowKey = (r: Row) => `${r.p.exchange}:${r.p.id}:${r.pool.stake}`;
  const [orderAmount, setOrderAmount] = useState(amount);
  useEffect(() => { const id = setTimeout(() => setOrderAmount(amount), 900); return () => clearTimeout(id); }, [amount]);
  const [picked, setPicked] = useState<string | null>(null);
  const rank = useMemo(() => {
    const out = [...rowsRaw];
    if (sort === "profit") out.sort((a, b) => (b.profit ?? -1) - (a.profit ?? -1));
    if (sort === "apr") out.sort((a, b) => (b.pool.apr ?? -1) - (a.pool.apr ?? -1));
    // "hedged": real dollar yield — stable stakes use plain APR, volatile ones their hedged APR (or −∞ if not hedgeable)
    const realApr = (r: Row) => (!r.hc.needed ? r.pool.apr ?? -1 : r.hc.possible ? r.hc.hedgedApr ?? -1 : -1e9);
    if (sort === "hedged") out.sort((a, b) => realApr(b) - realApr(a));
    if (sort === "end") out.sort((a, b) => a.p.end - b.p.end);
    return new Map(out.map((r, i) => [rowKey(r), i]));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orderAmount, sort, coin, projects, novice]);
  const rows = useMemo(() => {
    const at = (r: Row) => (rowKey(r) === picked ? -1 : rank.get(rowKey(r)) ?? 1e6);
    return [...rowsRaw].sort((a, b) => at(a) - at(b));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rowsRaw, rank, picked]);

  const pickedRow = picked ? rows.find((r) => rowKey(r) === picked) : undefined;
  // "best" = the most profitable pool (its badge); the summary line shows the picked pool when there is one
  const top = rows.reduce<Row | undefined>((m, r) => ((r.profit ?? 0) > (m?.profit ?? 0) ? r : m), undefined);
  const best = pickedRow ?? top;

  return (
    <div>
      {/* calculator */}
      <div className="card relative overflow-hidden p-5 hover:transform-none sm:p-7" style={{ background: "linear-gradient(135deg, rgb(200 255 61 / 0.07), transparent 55%), var(--color-surface)" }}>
        <div className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-wider text-lime">
          <svg className="size-4" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true"><path d="M5 2h10a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2Zm1 3v3h8V5H6Zm0 5v2h2v-2H6Zm3 0v2h2v-2H9Zm3 0v5h2v-5h-2Zm-6 3v2h2v-2H6Zm3 0v2h2v-2H9Z" /></svg>
          {L.calc}
        </div>
        <div className="mt-5 grid grid-cols-1 gap-5 lg:grid-cols-[1.2fr_1fr] lg:items-end">
          <div>
            <label htmlFor="lp-amount" className="text-sm font-semibold text-ink-2">{L.amount}</label>
            <div className="mt-2 flex items-center gap-2">
              <div className="relative flex-1">
                {inCoin
                  ? <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 font-display text-xl text-ink-3">{coin}</span>
                  : <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 font-display text-2xl text-ink-3">$</span>}
                <input
                  id="lp-amount"
                  inputMode="decimal"
                  autoComplete="off"
                  value={text}
                  onChange={(e) => setText(e.target.value.replace(/[^\d.\s]/g, "").slice(0, 13))}
                  onWheel={(e) => (e.target as HTMLInputElement).blur()}
                  className={`h-16 w-full rounded-2xl border border-line-2 bg-bg/60 font-display text-3xl font-semibold tracking-tight text-ink focus:border-lime/60 focus:outline-none ${inCoin ? "pl-4 pr-24" : "pl-10 pr-4"}`}
                />
              </div>
              {/* $ ⇄ coin: shown once a stake coin is picked */}
              {coinPrice ? (
                <div className="flex h-16 shrink-0 flex-col justify-center gap-1 rounded-2xl border border-line-2 bg-bg/60 p-1" role="group" aria-label={UNIT[lang].label}>
                  {(["usd", "coin"] as const).map((u) => (
                    <button key={u} type="button" onClick={() => toggleUnit(u)} aria-pressed={unit === u}
                      className={`h-7 rounded-lg px-3 text-xs font-bold ${unit === u ? "bg-white/15 text-ink" : "text-ink-3 hover:text-ink"}`}>{u === "usd" ? "USD" : coin}</button>
                  ))}
                </div>
              ) : null}
            </div>
            {coinPrice ? (
              <div className="mt-1.5 font-mono text-xs text-ink-3">
                {inCoin ? `≈ ${fmtUsd(amount)}` : `≈ ${fmtNum(amount / coinPrice)} ${coin}`} · 1 {coin} = {fmtUsd(coinPrice)}
              </div>
            ) : coin === "all" ? <div className="mt-1.5 text-xs text-ink-3">{UNIT[lang].hint}</div> : null}
            <div className="mt-2 flex gap-2">
              {PRESETS.map((v) => (
                <button key={v} onClick={() => setAmount(v)} className={`h-8 rounded-lg px-3 font-mono text-xs font-bold transition-colors ${amount === v ? "bg-lime text-on-accent" : "bg-white/5 text-ink-2 hover:text-ink"}`}>${v.toLocaleString("en-US")}</button>
              ))}
            </div>
          </div>
          <div>
            <div className="text-sm font-semibold text-ink-2">{L.coin}</div>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {["all", ...coins].map((c) => (
                <button key={c} onClick={() => setCoin(c)} className={`h-9 rounded-lg px-3 text-sm font-bold transition-colors ${coin === c ? "bg-white/15 text-ink ring-1 ring-white/20" : "bg-white/[0.04] text-ink-3 hover:text-ink"}`}>{c === "all" ? L.any : c}</button>
              ))}
            </div>
          </div>
        </div>
        {best?.profit ? (
          <div className="mt-6 flex flex-wrap items-center gap-x-3 gap-y-1 rounded-2xl border border-lime/25 bg-lime/[0.06] px-4 py-3 text-sm">
            <span className="font-bold text-lime">★ {L.yourProfit}{pickedRow ? ` · ${PICK[lang].mine}` : ""}:</span>
            <span className="font-mono text-lg font-bold text-ink">{fmtUsd(best.profit)}</span>
            {prices[best.p.token] ? <span className="font-mono text-sm font-bold text-lime">≈ {fmtNum(best.profit / prices[best.p.token])} {best.p.token}</span> : null}
            <span className="text-ink-2">{L.total} · {best.p.name} · {L.stake} {best.pool.stake} · {exchanges[best.p.exchange]?.name}</span>
            {best.adjusted !== undefined && best.danger && (
              <span className="basis-full text-xs font-semibold text-ink-3">{L.ifPrice}: {best.adjusted < 0 ? "−" : ""}{fmtUsd(Math.abs(best.adjusted))}</span>
            )}
          </div>
        ) : null}
      </div>

      {/* sort */}
      <div className="mt-6 flex items-center justify-between gap-3">
        <div className="font-mono text-xs text-ink-3">{rows.length} {L.statLive}</div>
        <div className="flex h-10 items-center rounded-xl border border-line bg-white/[0.02] p-1" role="group">
          {(["profit", "hedged", "apr", "end"] as Sort[]).map((s) => (
            <button key={s} onClick={() => setSort(s)} aria-pressed={sort === s} className={`${s === "hedged" ? "adv " : ""}h-full rounded-lg px-2.5 text-xs font-bold sm:px-3 ${sort === s ? "bg-white/10 text-ink" : "text-ink-3 hover:text-ink"}`}>
              {s === "profit" ? L.sortProfit : s === "apr" ? L.sortApr : s === "hedged" ? L.hedgeApr : L.sortEnd}
            </button>
          ))}
        </div>
      </div>

      {/* rows */}
      <div className="mt-3 space-y-3">
        {rows.map((r, i) => {
          const { p, pool } = r;
          const ex = exchanges[p.exchange];
          const live = p.status === "live";
          const span = p.end - p.start;
          const pct = live ? Math.min(100, Math.max(0, ((now - p.start) / span) * 100)) : 0;
          const isBest = r === top;
          const isPicked = rowKey(r) === picked;
          const lvl = poolLevel(pool.stake, p.token);
          return (
            <article
              key={`${p.id}:${pool.stake}`}
              id={`lp-${p.id}-${pool.stake}`}
              className={`card relative scroll-mt-24 grid gap-4 p-4 sm:p-5 lg:grid-cols-[1.4fr_0.8fr_0.9fr_1fr_auto] lg:items-center ${isPicked ? "ring-2 ring-lime" : isBest ? "ring-1 ring-lime/50" : ""} ${lvl === "hard" ? "adv" : ""}`}
              style={{ ["--tint" as string]: ex?.color, animationDelay: `${Math.min(i, 10) * 30}ms` }}
            >
              {/* project */}
              <div className="flex min-w-0 items-center gap-3">
                <div className="relative">
                  <VenueLogo v={tokenVenue(p.token, p.logo)} size={46} rounded="rounded-2xl" />
                  {ex && <span className="absolute -bottom-1.5 -right-1.5 rounded-lg ring-2 ring-surface"><VenueLogo v={ex} size={22} rounded="rounded-lg" /></span>}
                </div>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <a href={withBase(`/${lang}/lp/${lpSlug(p)}/`)} className="break-words font-bold after:absolute after:inset-0 after:rounded-2xl after:content-['']">{p.name}</a>
                    {r.chgReward !== undefined && (
                      <span className={`font-mono text-xs font-bold ${chgText(r.chgReward)}`} title={`${p.token} ${L.chg24}`}>
                        {p.token} {fmtChg(r.chgReward)} <span className="font-sans font-semibold opacity-75">{L.chg24}</span>
                      </span>
                    )}
                    {isBest && <span className="rounded-md border border-lime/40 px-1.5 py-0.5 text-xs font-semibold text-lime">{BEST[lang]}</span>}
                  </div>
                  <div className="mt-0.5 flex flex-wrap items-center gap-x-2 text-xs font-semibold text-ink-3">
                    <span>{ex?.name}</span>
                    <span>·</span>
                    <span className={live ? "text-lime" : "text-sky"}>{live ? L.live : L.upcoming}</span>
                    <span className={`nov rounded px-1.5 ${LEVEL_CLS[lvl]}`} title={LEVEL_TXT[lang][lvl][1]}>{LEVEL_TXT[lang][lvl][0]}</span>
                    {/* at most two badges per row: best (above) + one of these */}
                    {pool.stake === p.token ? <span className="rounded-md border border-rose/30 px-1.5 text-rose" title={L.priceRiskNote}>{L.priceRisk}</span>
                      : pool.newUsers && !isBest ? <span className="rounded-md border border-amber/30 px-1.5 text-amber">{L.newUsers}</span> : null}
                  </div>
                  <div className="mt-2 h-1.5 w-full max-w-[14rem] overflow-hidden rounded-full bg-white/5" title={`${pct.toFixed(0)}%`}>
                    <div className="h-full rounded-full bg-gradient-to-r from-lime to-teal" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              </div>

              {/* stake → earn */}
              <div className="flex items-center gap-2 text-sm">
                <div>
                  <div className="text-xs font-semibold text-ink-3"><Term k="stake" lang={lang}>{L.stake}</Term></div>
                  <div className="mt-0.5 flex items-center gap-1.5 font-bold"><VenueLogo v={tokenVenue(pool.stake, pool.stakeLogo)} size={20} rounded="rounded-full" />{pool.stake}</div>
                </div>
                <span className="mt-4 text-ink-3">→</span>
                <div>
                  <div className="text-xs font-semibold text-ink-3">{L.earn}</div>
                  <div className="mt-0.5 font-bold">{p.token}</div>
                </div>
              </div>

              {/* apr + limits */}
              <div>
                <div className="text-xs font-semibold text-ink-3"><Term k="apr" lang={lang}>{L.apr}</Term></div>
                <div className={`font-mono text-2xl font-bold tracking-tight ${(pool.apr ?? 0) >= 50 ? "text-lime" : "text-ink"}`}>{pool.apr !== undefined ? `${pool.apr >= 100 ? Math.round(pool.apr) : pool.apr.toFixed(2)}%` : "—"}</div>
                {pool.apr !== undefined && <div className="nov text-xs font-semibold text-lime">{plainProfit(pool.apr, lang)}</div>}
                {sparks[`${p.exchange}:${p.id}:${pool.stake}`] && <Spark points={sparks[`${p.exchange}:${p.id}:${pool.stake}`]} title={`APR · 7d`} />}
                <div className="font-mono text-xs text-ink-3">
                  {pool.minStake ? `${L.min} ${fmtNum(pool.minStake)}` : ""}{pool.minStake && pool.maxStake ? " · " : ""}{pool.maxStake ? `${L.max} ${fmtNum(pool.maxStake)}` : ""}
                </div>
                {r.hc.needed && (
                  <div className={`mt-1.5 rounded-lg border px-2 py-1 ${r.hc.possible && (r.hc.hedgedApr ?? 0) > 0 ? "border-teal/30 bg-teal/[0.07] text-teal" : "border-line text-ink-3"}`} title={L.hedgeNote}>
                    <div className="flex items-center gap-1 text-xs font-semibold opacity-80"><svg className="size-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 3 4.5 6v5.5c0 4.6 3.2 8.4 7.5 9.5 4.3-1.1 7.5-4.9 7.5-9.5V6L12 3Z" /></svg>{L.hedgeApr}</div>
                    <div className="font-mono text-lg font-bold leading-tight">{r.hc.possible && r.hc.hedgedApr !== undefined ? fmtPct(r.hc.hedgedApr) : "—"}</div>
                    {r.hc.possible && r.hc.venue && <div className="text-xs font-semibold opacity-80">{HEDGE_VIA[lang](pool.stake, r.hc.venue)}</div>}
                  </div>
                )}
              </div>

              {/* profit */}
              <div>
                <div className="text-xs font-semibold text-ink-3">{L.yourProfit}</div>
                {r.profit !== undefined ? (
                  <>
                    {r.belowMin ? (
                      // below the pool's minimum stake there is nothing to earn — say so instead of a crossed-out $0.00
                      <div className="text-sm font-bold text-amber">{BELOW[lang](`${fmtNum(pool.minStake ?? 0)} ${pool.stake}`)}</div>
                    ) : (
                      <>
                        <div className="font-mono text-xl font-bold text-ink">{fmtUsd(r.profit)}</div>
                        {/* the same income in the reward token — what actually lands in the account */}
                        {prices[p.token] ? <div className="font-mono text-xs font-semibold text-lime">≈ {fmtNum(r.profit / prices[p.token])} {p.token}</div> : null}
                        <div className="font-mono text-xs text-ink-3">{fmtUsd(r.perDay ?? 0)}{L.perDay}{r.capped ? ` · ${L.capped}` : ""}</div>
                      </>
                    )}
                    {r.adjusted !== undefined && pool.stake !== "USDT" && Math.abs((r.chgReward ?? 0)) + Math.abs(r.chgStake ?? 0) >= 1 && (
                      <div className="mt-1 text-xs font-semibold text-ink-3" title={L.ifPriceNote}>
                        {L.ifPrice}: <span className="font-mono font-bold">{r.adjusted < 0 ? "−" : ""}{fmtUsd(Math.abs(r.adjusted))}</span>
                      </div>
                    )}
                  </>
                ) : <div className="font-mono text-xl font-bold text-ink-3">—</div>}
                <div className="mt-1 text-xs font-semibold text-ink-3">
                  {live ? `${L.endsIn} ${duration(p.end - now, t.time)}` : `${L.startsIn} ${duration(p.start - now, t.time)}`}
                </div>
              </div>

              {/* actions */}
              <div className="flex gap-2 lg:flex-col">
                {/* pick this pool: the summary above follows it and it stays on top while the amount changes */}
                <button type="button" onClick={() => setPicked(isPicked ? null : rowKey(r))} aria-pressed={isPicked}
                  className={`btn relative z-10 h-11 flex-1 px-4 text-sm ${isPicked ? "border border-lime/60 bg-lime/10 text-lime" : "btn-ghost"}`}>{isPicked ? `✓ ${PICK[lang].on}` : PICK[lang].off}</button>
                <a href={withBase(`/${lang}/lp/${lpSlug(p)}/`)} className="btn btn-ghost relative z-10 h-11 flex-1 px-4 text-sm">{OPEN[lang]}</a>
              </div>

              {/* where the price risk can be hedged with futures — visible right away */}
              {(hedge[pool.stake] || (pool.stake !== p.token && hedge[p.token])) && (
                <div className="relative z-10 flex flex-col gap-1.5 lg:col-span-5">
                  <HedgeVenues coin={pool.stake} hedge={hedge[pool.stake]} lang={lang} />
                  {pool.stake !== p.token && <HedgeVenues coin={p.token} hedge={hedge[p.token]} lang={lang} />}
                </div>
              )}

              {/* hedge box + pros & cons — folded under "More" to keep the card light */}
              <details className="group relative z-10 border-t border-line pt-3 lg:col-span-5">
                <summary className="flex min-h-11 cursor-pointer list-none items-center gap-1.5 text-xs font-bold text-ink-3 hover:text-ink [&::-webkit-details-marker]:hidden">
                  <span className="transition-transform group-open:rotate-90">▸</span>{MORE[lang]}
                </summary>
                <div className="nov-1col mt-3 grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,2fr)]">
                  <div className="adv"><HedgeBox r={r} L={L} /></div>
                  <ProsCons pc={poolPC(lang, p, pool, { now, chgStake: r.chgStake, chgReward: r.chgReward, price: r.price, hedge, amountUsd: r.usd ?? amount })} more="+" />
                </div>
              </details>
            </article>
          );
        })}
        {/* the same list continues with exchanges that publish Launchpools only as announcements (OKX, HTX, Bybit…) */}
        {coin === "all" && extra.map((a) => (
          <a key={a.id} href={a.href} className="card grid gap-3 p-4 sm:p-5 lg:grid-cols-[1.4fr_1fr_auto] lg:items-center">
            <span className="flex min-w-0 items-center gap-3">
              <VenueLogo v={a.venue} size={40} rounded="rounded-xl" />
              <span className="min-w-0">
                <span className="flex flex-wrap items-center gap-2 text-xs font-bold text-ink-3">{a.venue.name}<span className="rounded-md bg-white/5 px-1.5 py-0.5 font-semibold">{L.annNews}</span></span>
                <span className="mt-0.5 block break-words font-semibold leading-snug">{a.title}</span>
              </span>
            </span>
            <span className="text-sm text-ink-2">
              {a.reward && <span className="block font-mono font-bold text-lime">{a.reward}</span>}
              {a.endsAt ? <span className="block text-xs text-ink-3">⏳ {duration(Math.max(0, a.endsAt - now), t.time)}</span> : a.date ? <span className="block text-xs text-ink-3">{new Date(a.date).toLocaleDateString(lang === "uk" ? "uk-UA" : lang === "ru" ? "ru-RU" : "en-GB", { day: "numeric", month: "short", timeZone: "UTC" })}</span> : null}
            </span>
            <span className="btn btn-ghost h-10 px-4 text-sm">{t.card.details} →</span>
          </a>
        ))}
      </div>
    </div>
  );
}
