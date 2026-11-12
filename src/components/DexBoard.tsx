"use client";
import { Fragment, useEffect, useMemo, useState } from "react";
import type { Dict, Locale } from "@/lib/i18n";
import type { DexPool } from "@/lib/dexpools";
import { VenueLogo } from "./VenueLogo";
import { Term } from "./Term";
import { ProsCons } from "./ProsCons";
import { compactUsd, num } from "@/lib/format";
import { dexPC } from "@/lib/proscons";

type Sort = "apy" | "tvl" | "reward";
const PAGE = 40;
const EXPLAIN: Record<Locale, string> = { uk: "Умови й ризики", en: "Terms & risks", ru: "Условия и риски" };
const PC_SR: Record<Locale, (p: number, c: number) => string> = { uk: (p, c) => `плюсів: ${p}, ризиків: ${c}`, en: (p, c) => `pros: ${p}, risks: ${c}`, ru: (p, c) => `плюсов: ${p}, рисков: ${c}` };
const GO: Record<Locale, (x: string) => string> = { uk: (x) => `Перейти на ${x}`, en: (x) => `Go to ${x}`, ru: (x) => `Перейти на ${x}` };
const STATS: Record<Locale, string> = { uk: "Історія APY (DefiLlama)", en: "APY history (DefiLlama)", ru: "История APY (DefiLlama)" };
const WHAT: Record<Locale, (pr: string, s: string, ch: string) => string> = {
  uk: (pr, s, ch) => `Пул ${s} у протоколі ${pr} (мережа ${ch}). Ви вносите монети зі свого гаманця і отримуєте частку комісій та/або нагород протоколу. Дохідність змінюється щодня — нижче плюси, мінуси та ризики.`,
  en: (pr, s, ch) => `The ${s} pool on ${pr} (${ch}). You deposit coins from your own wallet and earn a share of fees and/or protocol rewards. The yield changes daily — pros, cons and risks below.`,
  ru: (pr, s, ch) => `Пул ${s} в протоколе ${pr} (сеть ${ch}). Вы вносите монеты со своего кошелька и получаете долю комиссий и/или наград протокола. Доходность меняется ежедневно — ниже плюсы, минусы и риски.`,
};
// built-in earnings calculator: one amount for the whole table, income shown next to every pool
const CALC: Record<Locale, { amount: string; col: (a: string) => string; mo: string; yr: string; d: string; w: string; title: (a: string, apy: string) => string; note: string; il: string }> = {
  uk: { amount: "Сума, $", col: (a) => `Дохід з ${a}`, mo: "/міс", yr: "/рік", d: "день", w: "тиждень", title: (a, apy) => `Якщо вкласти ${a} під ${apy} річних`, note: "Розрахунок за поточним APY — він змінюється щодня. Без урахування комісій мережі.", il: "Пул з двох різних монет: якщо ціни розійдуться, можлива непостійна втрата (IL) — дохід може бути меншим." },
  en: { amount: "Amount, $", col: (a) => `Income on ${a}`, mo: "/mo", yr: "/yr", d: "day", w: "week", title: (a, apy) => `If you put in ${a} at ${apy} a year`, note: "Based on the current APY, which changes daily. Network fees not included.", il: "Two different coins in the pool: if their prices diverge, impermanent loss (IL) can eat into the income." },
  ru: { amount: "Сумма, $", col: (a) => `Доход с ${a}`, mo: "/мес", yr: "/год", d: "день", w: "неделя", title: (a, apy) => `Если вложить ${a} под ${apy} годовых`, note: "Расчёт по текущему APY — он меняется ежедневно. Без учёта комиссий сети.", il: "Пул из двух разных монет: если цены разойдутся, возможна непостоянная потеря (IL) — доход может быть меньше." },
};
// site-wide number format: uk/ru "$1 000", en "$1,000"
const usdFmt = (lang: Locale) => (x: number) => "$" + (x >= 1000 ? num(Math.round(x), lang, 0) : x >= 10 ? x.toFixed(0) : x.toFixed(2));
const digits = (s: string) => s.replace(/[^0-9.]/g, "");
const TVLS = [500_000, 1_000_000, 10_000_000, 100_000_000];
const pct = (x?: number) => (x === undefined ? "—" : `${x >= 100 ? Math.round(x) : x.toFixed(2)}%`);

function logo(p: DexPool) {
  let h = 0; for (const c of p.slug) h = (h * 31 + c.charCodeAt(0)) % 360;
  return { name: p.project, logo: p.logo, color: `hsl(${h} 65% 60%)`, ink: "#0b0d10", monogram: p.project.slice(0, 2).toUpperCase() };
}

export function DexBoard({ pools: initial, chains, categories, t, lang, fullUrl }: { pools: DexPool[]; chains: string[]; categories: string[]; t: Dict; lang: Locale; fullUrl?: string }) {
  // the page ships only the top pools (light HTML); the full list (~1500) loads right after from the static JSON
  const [pools, setPools] = useState(initial);
  useEffect(() => {
    if (!fullUrl) return;
    fetch(fullUrl).then((r) => r.json()).then((j) => Array.isArray(j?.pools) && j.pools.length > initial.length && setPools(j.pools)).catch(() => {});
  }, [fullUrl, initial.length]);
  const A = t.aprHub;
  const [openId, setOpenId] = useState<string | null>(null);
  const [cat, setCat] = useState("DEX");
  const [chain, setChain] = useState("all");
  const [stable, setStable] = useState(false);
  const [noIl, setNoIl] = useState(false);
  const [minTvl, setMinTvl] = useState(1_000_000);
  const [q, setQ] = useState("");
  const [sort, setSort] = useState<Sort>("apy");
  const [limit, setLimit] = useState(PAGE);
  const [amtText, setAmt] = useState("1000");
  // empty field → the default amount (the placeholder), never "$0.00" everywhere
  const amount = Math.min(1e9, Number(digits(amtText)) || 1000);
  const C = CALC[lang];
  const money = usdFmt(lang);
  useEffect(() => setLimit(PAGE), [cat, chain, stable, noIl, minTvl, q, sort]);

  const list = useMemo(() => {
    const s = q.trim().toLowerCase();
    const l = pools.filter((p) => (cat === "all" || p.category === cat) && (chain === "all" || p.chain === chain) && (!stable || p.stable) && (!noIl || !p.il)
      && p.tvl >= minTvl && (!s || `${p.symbol} ${p.project} ${p.meta ?? ""}`.toLowerCase().includes(s)));
    if (sort === "apy") l.sort((a, b) => b.apy - a.apy);
    if (sort === "tvl") l.sort((a, b) => b.tvl - a.tvl);
    if (sort === "reward") l.sort((a, b) => (b.apyReward ?? 0) - (a.apyReward ?? 0));
    return l;
  }, [pools, cat, chain, stable, noIl, minTvl, q, sort]);

  const reset = () => { setCat("all"); setChain("all"); setStable(false); setNoIl(false); setMinTvl(TVLS[0]); setQ(""); };
  const pcButton = (p: DexPool, pc: ReturnType<typeof dexPC>, open: boolean, cls = "") => (
    <button type="button" onClick={() => setOpenId(open ? null : p.id)} aria-expanded={open} className={`btn btn-primary h-9 gap-2 px-3 text-xs ${cls}`}>
      {EXPLAIN[lang]}
      <span aria-hidden="true" className="font-mono">✓{pc.pros.length} ✕{pc.cons.length}</span>
      <span className="sr-only">({PC_SR[lang](pc.pros.length, pc.cons.length)})</span>
    </button>
  );
  const detail = (p: DexPool, pc: ReturnType<typeof dexPC>) => (
    <>
    <p className="mb-3 max-w-3xl text-sm text-ink-2">{WHAT[lang](p.project, p.symbol, p.chain)}</p>
    {/* the calculator, in detail */}
    <div className="mb-4 max-w-3xl rounded-xl border border-lime/30 bg-lime/[0.05] p-4">
      <div className="text-sm font-bold">🧮 {C.title(money(amount), pct(p.apy))}</div>
      <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
        {([[C.d, 365], [C.w, 52], [C.mo.replace("/", ""), 12], [C.yr.replace("/", ""), 1]] as const).map(([k, n]) => (
          <div key={k} className="rounded-lg bg-white/[0.04] px-3 py-2"><div className="text-xs font-bold uppercase tracking-wider text-ink-3">{k}</div><div className="font-mono text-base font-bold text-lime">+{money((amount * p.apy) / 100 / n)}</div></div>
        ))}
      </div>
      <p className="mt-2 text-xs text-ink-3">{C.note}{p.il ? ` ${C.il}` : ""}</p>
    </div>
    <ProsCons lang={lang} pc={pc} max={10} />
    <div className="mt-4 flex flex-wrap gap-2">
      {p.url && <a href={p.url} target="_blank" rel="noopener" className="btn btn-primary h-10 px-4 text-sm">{GO[lang](p.project)} ↗</a>}
      <a href={`https://defillama.com/yields/pool/${p.id}`} target="_blank" rel="noopener" className="btn btn-ghost h-10 px-4 text-sm">{STATS[lang]} ↗</a>
    </div>
    </>
  );

  const sel = "h-10 appearance-none rounded-xl border border-line bg-surface pl-3 pr-8 text-sm font-bold text-ink focus:border-lime/50 focus:outline-none";
  const toggle = (on: boolean) => `h-10 rounded-xl border px-3 text-sm font-bold transition-colors ${on ? "border-lime/60 bg-lime/10 text-ink" : "border-line bg-white/[0.02] text-ink-3 hover:text-ink"}`;

  return (
    <div>
      {/* category tabs */}
      <div className="scroll-x flex gap-1.5">
        {["DEX", "all", ...categories.filter((c) => c !== "DEX")].map((c) => (
          <button key={c} className="chip" data-on={cat === c} onClick={() => setCat(c)}>{c === "all" ? A.all : c}</button>
        ))}
      </div>

      {/* filters */}
      <div className="z-30 -mx-4 mt-4 flex flex-wrap items-center gap-2 border-b border-line/60 bg-bg/85 px-4 py-3 backdrop-blur-xl sm:sticky sm:top-16 sm:-mx-6 sm:px-6">
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={A.searchPool}
          className="h-10 w-full rounded-xl border border-line bg-white/[0.03] px-3 text-sm font-medium text-ink placeholder:text-ink-3 focus:border-lime/50 focus:outline-none sm:w-56" />
        <label className="relative">
          <span className="sr-only">{A.chain}</span>
          <select value={chain} onChange={(e) => setChain(e.target.value)} className={sel}>
            <option value="all">{A.chain}: {A.all}</option>
            {chains.slice(0, 60).map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </label>
        <label className="relative">
          <span className="sr-only">{A.minTvl}</span>
          <select value={minTvl} onChange={(e) => setMinTvl(Number(e.target.value))} className={sel}>
            {TVLS.map((v) => <option key={v} value={v}>{A.minTvl} {compactUsd(v)}</option>)}
          </select>
        </label>
        <label className="flex h-10 items-center gap-2 rounded-xl border border-lime/40 bg-lime/[0.06] pl-3 pr-1 text-sm font-bold text-ink">
          🧮 {C.amount}
          <input value={amtText} onChange={(e) => setAmt(digits(e.target.value).slice(0, 10))} inputMode="decimal" placeholder="1000" aria-label={C.amount}
            className="h-8 w-24 rounded-lg border border-line bg-surface px-2 font-mono text-sm text-ink focus:border-lime/50 focus:outline-none" />
        </label>
        <button className={toggle(stable)} onClick={() => setStable((x) => !x)} aria-pressed={stable}>{A.stable}</button>
        <button className={toggle(noIl)} onClick={() => setNoIl((x) => !x)} aria-pressed={noIl}>{A.noIl}</button>
        <div className="flex h-10 items-center rounded-xl border border-line bg-white/[0.02] p-1 sm:ml-auto">
          {(["apy", "tvl", "reward"] as Sort[]).map((s) => (
            <button key={s} onClick={() => setSort(s)} className={`h-full rounded-lg px-3 text-xs font-bold ${sort === s ? "bg-white/10 text-ink" : "text-ink-3 hover:text-ink"}`}>
              {s === "apy" ? A.sortApy : s === "tvl" ? A.sortTvl : A.sortReward}
            </button>
          ))}
        </div>
      </div>

      {list.length === 0 && (
        <div className="mt-4 rounded-2xl border border-dashed border-line p-8 text-center">
          <p className="text-sm text-ink-2">{t.filters.empty}</p>
          <button type="button" onClick={reset} className="btn btn-ghost mt-3 h-10 px-4 text-sm">{t.filters.reset}</button>
        </div>
      )}

      {/* phone: cards (a 940px table is unreadable on a 390px screen) */}
      {list.length > 0 && (
        <div className="mt-4 grid gap-3 sm:hidden">
          {list.slice(0, limit).map((p) => {
            const pc = dexPC(lang, p);
            const open = openId === p.id;
            return (
              <div key={p.id} className="card p-4 hover:transform-none">
                <div className="flex items-start gap-3">
                  <VenueLogo v={logo(p)} size={32} rounded="rounded-lg" />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-1.5 font-mono text-sm font-bold">
                      {p.symbol}
                      {p.stable && <span className="rounded bg-teal/10 px-1 font-sans text-xs text-teal">{A.stableTag}</span>}
                      {p.il && <span className="rounded bg-amber/10 px-1 font-sans text-xs text-amber">{A.il}</span>}
                    </div>
                    <div className="break-words text-xs font-semibold text-ink-3">{p.project} · {p.chain}</div>
                  </div>
                  <div className={`font-mono text-lg font-bold ${p.apy >= 20 ? "text-lime" : "text-ink"}`}>{pct(p.apy)}</div>
                </div>
                <div className="mt-3 grid grid-cols-3 gap-2 font-mono text-xs">
                  <div><div className="font-sans text-ink-3">{C.col(money(amount))}</div><span className="font-bold text-lime">{money((amount * p.apy) / 100 / 12)}</span>{C.mo}</div>
                  <div><div className="font-sans text-ink-3">{A.colTvl}</div>{compactUsd(p.tvl)}</div>
                  <div><div className="font-sans text-ink-3">{A.colAvg}</div>{pct(p.apy30d)}</div>
                </div>
                <div className="mt-3">{pcButton(p, pc, open, "w-full justify-center")}</div>
                {open && <div className="mt-3">{detail(p, pc)}</div>}
              </div>
            );
          })}
        </div>
      )}

      {/* table */}
      <div className={`mt-4 overflow-x-auto rounded-2xl border border-line max-sm:hidden ${list.length === 0 ? "hidden" : ""}`}>
        <table className="w-full min-w-[940px] text-left text-sm">
          <thead className="bg-white/[0.03] text-xs font-bold uppercase tracking-wider text-ink-3">
            <tr>
              <th className="px-4 py-3">{A.colPool}</th><th className="px-4 py-3">{A.colChain}</th><th className="px-4 py-3 text-right"><Term k="tvl" lang={lang} align="right">{A.colTvl}</Term></th>
              <th className="px-4 py-3 text-right"><Term k="apy" lang={lang} align="right">{A.colApy}</Term></th><th className="px-4 py-3 text-right text-lime">{C.col(money(amount))}</th><th className="px-4 py-3 text-right">{A.colSplit}</th><th className="px-4 py-3 text-right">{A.colAvg}</th><th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {list.slice(0, limit).map((p) => {
              const pc = dexPC(lang, p);
              const open = openId === p.id;
              return (
              <Fragment key={p.id}>
              <tr className={`hover:bg-white/[0.025] ${open ? "bg-white/[0.025]" : ""}`}>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <VenueLogo v={logo(p)} size={32} rounded="rounded-lg" />
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-1.5 font-mono text-[13px] font-bold">
                        {p.symbol}
                        {p.stable && <span className="rounded bg-teal/10 px-1 font-sans text-xs text-teal">{A.stableTag}</span>}
                        {p.il && <span className="rounded bg-amber/10 px-1 font-sans text-xs text-amber"><Term k="il" lang={lang}>{A.il}</Term></span>}
                      </div>
                      <div className="break-words text-xs font-semibold text-ink-3">{p.project}{p.meta ? ` · ${p.meta}` : ""}</div>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3 text-ink-2">{p.chain}</td>
                <td className="px-4 py-3 text-right font-mono">{compactUsd(p.tvl)}</td>
                <td className={`px-4 py-3 text-right font-mono text-base font-bold ${p.apy >= 20 ? "text-lime" : "text-ink"}`}>{pct(p.apy)}</td>
                <td className="whitespace-nowrap px-4 py-3 text-right font-mono">
                  <div className="font-bold text-lime">{money((amount * p.apy) / 100 / 12)}<span className="text-xs font-semibold text-ink-3">{C.mo}</span></div>
                  <div className="text-xs text-ink-3">{money((amount * p.apy) / 100)}{C.yr}</div>
                </td>
                <td className="px-4 py-3 text-right font-mono text-xs text-ink-2">
                  {p.apyBase === undefined && p.apyReward === undefined ? <span className="text-ink-3">—</span> : <>{pct(p.apyBase ?? 0)} + <span className="text-success">{pct(p.apyReward ?? 0)}</span></>}
                </td>
                <td className="px-4 py-3 text-right font-mono text-xs text-ink-3">{pct(p.apy30d)}</td>
                <td className="px-4 py-3 text-right">
                  <div className="flex justify-end">{pcButton(p, pc, open, "whitespace-nowrap")}</div>
                </td>
              </tr>
              {open && (
                <tr className="bg-white/[0.025]">
                  <td colSpan={8} className="px-4 pb-4 pt-1">
                    {detail(p, pc)}
                  </td>
                </tr>
              )}
              </Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
      <div className="mt-4 flex items-center justify-between gap-3 text-xs text-ink-3">
        <span className="font-mono">{Math.min(limit, list.length)} {A.shown} {A.of} {list.length}</span>
        {list.length > limit && <button onClick={() => setLimit((l) => l + PAGE)} className="btn btn-ghost h-10 px-5 text-sm">{A.more}</button>}
      </div>
    </div>
  );
}
