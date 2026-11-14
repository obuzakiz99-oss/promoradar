"use client";
import { useNovice } from "./NoviceToggle";
import { Term } from "./Term";
import { plainProfit } from "@/lib/level";
import { Fragment, useMemo, useState } from "react";
import type { Dict, Locale } from "@/lib/i18n";
import type { EarnOffer } from "@/lib/earn";
import type { Venue } from "@/lib/types";
import { VenueLogo } from "./VenueLogo";
import { HedgeVenues } from "./HedgeVenues";
import type { Hedge } from "@/lib/pools";
const HEDGED: Record<Locale, { title: string; how: (earn: string, f: string, ex: string) => string }> = {
  uk: { title: "APR з хеджем", how: (e, f, ex) => `Earn ${e} + фандинг шорту ${f} на ${ex} · у доларах, без ризику ціни (комісії входу/виходу ~0.2% окремо)` },
  en: { title: "APR with hedge", how: (e, f, ex) => `Earn ${e} + short funding ${f} on ${ex} · in dollars, no price risk (entry/exit fees ~0.2% extra)` },
  ru: { title: "APR с хеджем", how: (e, f, ex) => `Earn ${e} + фандинг шорта ${f} на ${ex} · в долларах, без риска цены (комиссии входа/выхода ~0.2% отдельно)` },
};
import { ProsCons } from "./ProsCons";
import { earnPC } from "@/lib/proscons";

const EXPLAIN: Record<Locale, string> = { uk: "Умови й ризики", en: "Terms & risks", ru: "Условия и риски" };
const COLS: Record<Locale, { ex: string; income: string; limits: string }> = {
  uk: { ex: "Біржа · тип", income: "Дохід з вашої суми", limits: "Ліміти" },
  en: { ex: "Exchange · type", income: "Income on your amount", limits: "Limits" },
  ru: { ex: "Биржа · тип", income: "Доход с вашей суммы", limits: "Лимиты" },
};
const DWMY: Record<Locale, string[]> = { uk: ["день", "тиждень", "місяць", "рік"], en: ["day", "week", "month", "year"], ru: ["день", "неделя", "месяц", "год"] };
const EX_ALL: Record<Locale, string> = { uk: "Усі біржі", en: "All exchanges", ru: "Все биржи" };
const pct = (x: number) => `${x >= 100 ? Math.round(x) : x >= 10 ? x.toFixed(1) : x.toFixed(2)}%`;

const CALC: Record<Locale, { amount: string; mo: string; yr: string; note: string }> = {
  uk: { amount: "Сума", mo: "/міс", yr: "/рік", note: "Дохід рахується в тій самій монеті, яку ви вкладаєте; у доларах — за поточною ціною." },
  en: { amount: "Amount", mo: "/mo", yr: "/yr", note: "Income is paid in the same coin you deposit; dollar figures use the current price." },
  ru: { amount: "Сумма", mo: "/мес", yr: "/год", note: "Доход считается в той же монете, которую вы вкладываете; в долларах — по текущей цене." },
};
const STABLE = /^(USDT|USDC|FDUSD|USD1|DAI|USDS|USDE|PYUSD|TUSD)$/;
const fmtCoin = (n: number) => (n >= 1000 ? Math.round(n).toLocaleString("uk-UA") : n >= 1 ? +n.toFixed(2) + "" : +n.toPrecision(3) + "");
const fmtUsd = (n: number) => `$${n >= 1000 ? Math.round(n).toLocaleString("uk-UA") : n >= 10 ? n.toFixed(0) : n.toFixed(2)}`;

export function EarnBoard({ offers, popular, exchanges, t, lang, hedge = {}, prices = {} }: { offers: EarnOffer[]; popular: string[]; exchanges: Record<string, Venue>; t: Dict; lang: Locale; hedge?: Record<string, Hedge>; prices?: Record<string, number> }) {
  const A = t.aprHub;
  const [coinPick, setCoin] = useState("USDT");
  const novice = useNovice();
  const coin = novice && !/^(USDT|USDC)$/.test(coinPick) ? "USDT" : coinPick;   // beginners: dollar stablecoins only
  // calculator: the amount is typed in the coin itself or in dollars; APR is applied to the coin amount
  const price = STABLE.test(coin) ? 1 : prices[coin];
  const [amtText, setAmt] = useState("1000");
  const [unit, setUnit] = useState<"coin" | "usd">("usd");
  const typed = Number(amtText.replace(/[^0-9.]/g, "")) || 0;
  const qty = unit === "usd" ? (price ? typed / price : 0) : typed;
  const C = CALC[lang];
  const [q, setQ] = useState("");
  const [type, setType] = useState<"all" | EarnOffer["type"]>("all");
  const [exPick, setEx] = useState("all");
  const [openId, setOpenId] = useState<string | null>(null);   // exchange filter (chips + clickable exchange names)

  const byCoin = useMemo(() => {
    const m = new Map<string, EarnOffer[]>();
    for (const o of offers) m.set(o.coin, [...(m.get(o.coin) ?? []), o]);
    return m;
  }, [offers]);
  const coins = useMemo(() => [...byCoin.keys()].sort(), [byCoin]);
  const matches = q ? coins.filter((c) => c.toLowerCase().startsWith(q.toLowerCase())).slice(0, 12) : [];

  // regular offers ranked by base APR; new-user promos listed after them (they're capped and not for everyone)
  const coinExchanges = useMemo(() => [...new Set((byCoin.get(coin) ?? []).map((o) => o.exchange))].filter((id) => exchanges[id]), [byCoin, coin, exchanges]);
  const ex: string = (coinExchanges as string[]).includes(exPick) ? exPick : "all";
  const list = useMemo(() => (byCoin.get(coin) ?? []).filter((o) => (type === "all" || o.type === type) && (ex === "all" || o.exchange === ex))
    .sort((a, b) => Number(!!a.newUsers) - Number(!!b.newUsers) || b.apr - a.apr || (b.aprMax ?? 0) - (a.aprMax ?? 0)), [byCoin, coin, type, ex]);

  const avg = useMemo(() => {
    const regular = (byCoin.get(coin) ?? []).filter((o) => !o.newUsers);
    return regular.length ? regular.reduce((s, o) => s + o.apr, 0) / regular.length : 0;
  }, [byCoin, coin]);

  const grid = useMemo(() => popular.filter((c) => byCoin.get(c)?.some((o) => !o.newUsers)).map((c) => {
    const os = byCoin.get(c)!.filter((o) => !o.newUsers);
    const best = os.reduce((m, o) => (o.apr > m.apr ? o : m), os[0]);
    const boosted = os.reduce((m, o) => ((o.aprMax ?? o.apr) > (m.aprMax ?? m.apr) ? o : m), os[0]);
    return { c, best, boosted, n: new Set(os.map((o) => o.exchange)).size };
  }), [popular, byCoin]);

  return (
    <div>
      {/* coin picker */}
      <div className="card p-5 hover:transform-none sm:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center">
          <div className="flex flex-wrap gap-1.5">
            {popular.filter((c) => byCoin.has(c)).map((c) => (
              <button key={c} onClick={() => setCoin(c)} className={`${/^(USDT|USDC)$/.test(c) ? "" : "adv "}h-9 rounded-lg px-3 text-sm font-bold transition-colors ${coin === c ? "bg-lime text-on-accent" : "bg-white/[0.05] text-ink-2 hover:text-ink"}`}>{c}</button>
            ))}
          </div>
          <div className="adv relative lg:ml-auto lg:w-56">
            <input value={q} onChange={(e) => setQ(e.target.value.toUpperCase())} placeholder={A.search}
              className="h-10 w-full rounded-xl border border-line bg-white/[0.03] px-3 text-sm font-semibold text-ink placeholder:text-ink-3 focus:border-lime/50 focus:outline-none" />
            {matches.length > 0 && (
              <div className="absolute left-0 right-0 top-11 z-20 max-h-64 overflow-auto rounded-xl border border-line-2 bg-surface p-1 shadow-2xl">
                {matches.map((c) => (
                  <button key={c} onClick={() => { setCoin(c); setQ(""); }} className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm font-bold hover:bg-white/5">
                    {c}<span className="font-mono text-xs text-ink-3">{byCoin.get(c)!.length}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* offers for the coin */}
      <div className="mt-6 flex flex-wrap items-end justify-between gap-3">
        <h2 className="font-display text-2xl font-semibold tracking-tight">{coin} <span className="text-ink-3">· {list.length} {A.offers}</span></h2>
        <div className="flex h-10 items-center rounded-xl border border-line bg-white/[0.02] p-1">
          {(["all", "flexible", "fixed", "onchain"] as const).map((x) => (
            <button key={x} onClick={() => setType(x)} className={`h-full rounded-lg px-3 text-xs font-bold ${type === x ? "bg-white/10 text-ink" : "text-ink-3 hover:text-ink"}`}>{x === "all" ? A.all : A.type[x]}</button>
          ))}
        </div>
      </div>
      {/* exchange chips — tap to see only that exchange */}
      {coinExchanges.length > 1 && (
        <div className="scroll-x mt-3 flex gap-1.5 md:flex-wrap">
          <button onClick={() => setEx("all")} className={`h-9 shrink-0 rounded-lg px-3 text-xs font-bold ${ex === "all" ? "bg-lime text-on-accent" : "bg-white/[0.05] text-ink-2 hover:text-ink"}`}>{EX_ALL[lang]}</button>
          {coinExchanges.map((id) => (
            <button key={id} onClick={() => setEx(ex === id ? "all" : id)} aria-pressed={ex === id}
              className={`flex h-9 shrink-0 items-center gap-1.5 rounded-lg pl-1 pr-3 text-xs font-bold ${ex === id ? "bg-lime text-on-accent" : "bg-white/[0.05] text-ink-2 hover:text-ink"}`}>
              <VenueLogo v={exchanges[id]} size={24} rounded="rounded-md" />{exchanges[id].name}
            </button>
          ))}
        </div>
      )}
      {/* calculator: amount in the coin or in dollars → income per offer in the coin (+ dollars) */}
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <label className="flex h-11 items-center gap-2 rounded-xl border border-lime/40 bg-lime/[0.06] pl-3 pr-1 text-sm font-bold text-ink">
          {C.amount}
          <input value={amtText} onChange={(e) => setAmt(e.target.value.replace(/[^0-9.]/g, "").slice(0, 12))} inputMode="decimal"
            className="h-9 w-28 rounded-lg border border-line bg-surface px-2 font-mono text-sm text-ink focus:border-lime/50 focus:outline-none" />
        </label>
        {!STABLE.test(coin) && (
          <div className="flex h-11 items-center rounded-xl border border-line bg-white/[0.02] p-1" role="group">
            {(["coin", "usd"] as const).map((u) => (
              <button key={u} type="button" disabled={u === "usd" && !price} aria-pressed={unit === u}
                onClick={() => { if (u === unit) return; if (price) setAmt(String(u === "coin" ? +(typed / price).toPrecision(6) : Math.round(typed * price))); setUnit(u); }}
                className={`h-full rounded-lg px-3 text-xs font-bold ${unit === u ? "bg-white/10 text-ink" : "text-ink-3 hover:text-ink"}`}>{u === "coin" ? coin : "USD"}</button>
            ))}
          </div>
        )}
        {!STABLE.test(coin) && price ? <span className="font-mono text-xs text-ink-3">{unit === "usd" ? `≈ ${fmtCoin(qty)} ${coin}` : `≈ ${fmtUsd(qty * price)}`} · 1 {coin} = {fmtUsd(price)}</span> : null}
        <span className="basis-full text-xs text-ink-3">{C.note}</span>
      </div>
      {hedge[coin] && <HedgeVenues coin={coin} hedge={hedge[coin]} lang={lang} className="mt-2 text-xs" />}
      {(() => {
        // Earn in the coin + a short of the same size = income in dollars without the price risk
        const perps = hedge[coin]?.perps ?? [];
        const best = list.filter((o) => !o.newUsers).reduce((m, o) => Math.max(m, o.apr), 0);
        if (!perps.length || !best) return null;
        const f = perps.reduce((m, x) => (x.fundingApr > m.fundingApr ? x : m), perps[0]);
        const total = best + f.fundingApr;
        return (
          <div className={`mt-2 inline-flex flex-wrap items-baseline gap-x-2 rounded-lg border px-3 py-1.5 text-xs font-semibold ${total > 0 ? "border-teal/30 bg-teal/[0.07] text-teal" : "border-line text-ink-3"}`}>
            <span>{HEDGED[lang].title}:</span>
            <span className="font-mono text-base font-bold">≈ {pct(total)}</span>
            <span className="opacity-80">{HEDGED[lang].how(pct(best), `${f.fundingApr >= 0 ? "+" : "−"}${pct(Math.abs(f.fundingApr))}`, f.ex)}</span>
          </div>
        );
      })()}
      {list.length === 0 && <div className="mt-3 rounded-2xl border border-dashed border-line-2 p-8 text-center text-ink-2">{A.none}</div>}
      {(() => {
        // the same look as the DeFi-pools table (owner 14.11): rows + "Terms & risks" unfolding under the row; cards on phones
        const rows = list.map((o, i) => {
          const v = exchanges[o.exchange];
          const key = `${o.exchange}${o.type}${o.days}${i}`;
          const top = i === 0 && !o.newUsers;
          const base = o.maxAmount ? Math.min(qty, o.maxAmount) : qty;   // capped offers earn only up to the cap
          const yr = o.apr > 0 && qty > 0 ? (base * o.apr) / 100 : 0;
          return { o, v, key, top, yr, pc: earnPC(lang, o, avg) };
        });
        type R = (typeof rows)[number];
        const usdOf = (x: number) => (price && !STABLE.test(coin) ? ` ≈ ${fmtUsd(x * price)}` : "");
        const nameCell = ({ o, v, top }: R) => (
          <div className="flex items-center gap-3">
            <button type="button" onClick={() => setEx(o.exchange)} title={v.name}><VenueLogo v={v} size={32} rounded="rounded-lg" /></button>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-1.5">
                <button type="button" onClick={() => setEx(o.exchange)} className="font-bold hover:text-lime hover:underline">{v.name}</button>
                {top && <span className="rounded bg-lime/15 px-1 text-xs font-bold text-lime">{A.best}</span>}
                {o.newUsers && <span className="rounded bg-amber/10 px-1 text-xs font-bold text-amber">{A.newUsers}</span>}
              </div>
              <div className="text-xs font-semibold text-ink-3">
                <Term k={o.type === "fixed" ? "fixed" : o.type === "onchain" ? "onchain" : "flexible"} lang={lang}>{A.type[o.type]}</Term>{o.days ? ` · ${o.days} ${A.days}` : ""}
              </div>
            </div>
          </div>
        );
        const aprCell = (o: EarnOffer) => (
          <>
            <div className={`font-mono text-base font-bold ${o.apr >= 10 ? "text-lime" : "text-ink"}`}>{pct(o.apr)}</div>
            {o.aprMax ? <div className="font-mono text-xs font-semibold text-lime">{A.upTo} {pct(o.aprMax)}{o.tierNote ? ` · ${o.tierNote}` : ""}</div> : null}
            {o.apr > 0 && <div className="nov text-xs font-semibold text-lime">{plainProfit(o.apr, lang)}</div>}
          </>
        );
        const limits = (o: EarnOffer) => [o.minAmount ? `${A.min} ${fmtCoin(o.minAmount)}` : "", o.maxAmount ? `${A.max} ${fmtCoin(o.maxAmount)}` : ""].filter(Boolean).join(" · ") || "—";
        const pcButton = ({ key, pc }: R, cls = "") => {
          const open = openId === key;
          return (
            <button type="button" onClick={() => setOpenId(open ? null : key)} aria-expanded={open} className={`btn btn-ghost h-9 gap-2 px-3 text-xs ${open ? "border-lime/50 text-ink" : ""} ${cls}`}>
              {EXPLAIN[lang]}
              <span aria-hidden="true" className="font-mono">{pc.pros.length ? <span className="text-lime">✓{pc.pros.length} </span> : null}{pc.cons.length ? <span className="text-rose">✕{pc.cons.length}</span> : null}</span>
            </button>
          );
        };
        const detail = ({ o, v, yr, pc }: R) => (
          <div className="grid gap-4 lg:grid-cols-2 [&>*]:min-w-0">
            <div className="rounded-xl border border-lime/30 bg-lime/[0.05] p-4">
              <div className="text-sm font-bold">{v.name} · {o.coin} · {pct(o.apr)}</div>
              <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
                {([[DWMY[lang][0], 365], [DWMY[lang][1], 52], [DWMY[lang][2], 12], [DWMY[lang][3], 1]] as const).map(([k, n]) => (
                  <div key={k} className="rounded-lg bg-white/[0.04] px-3 py-2"><div className="text-xs font-bold uppercase tracking-wider text-ink-3">{k}</div>
                    <div className="font-mono text-base font-bold text-lime">+{fmtCoin(yr / n)} {o.coin}</div>
                    {price && !STABLE.test(o.coin) ? <div className="font-mono text-xs text-ink-3">≈ {fmtUsd((yr / n) * price)}</div> : null}</div>
                ))}
              </div>
              <div className="mt-2 font-mono text-xs text-ink-3">{COLS[lang].limits}: {limits(o)}</div>
            </div>
            <div className="flex flex-col gap-4 rounded-xl border border-line bg-white/[0.02] p-4">
              <ProsCons lang={lang} pc={pc} max={10} />
              <div className="mt-auto flex flex-wrap gap-2"><a href={o.url} target="_blank" rel="noopener" className="btn btn-primary h-10 px-4 text-sm">{A.open} {v.name} ↗</a></div>
            </div>
          </div>
        );
        if (!rows.length) return null;
        return (
          <>
            {/* phone: cards */}
            <div className="mt-3 grid gap-3 sm:hidden">
              {rows.map((r) => (
                <div key={r.key} className={`card p-4 hover:transform-none ${r.top ? "ring-1 ring-lime/50" : ""}`}>
                  <div className="flex items-start gap-3">
                    <div className="min-w-0 flex-1">{nameCell(r)}</div>
                    <div className="text-right">{aprCell(r.o)}</div>
                  </div>
                  <div className="mt-3 grid grid-cols-2 gap-2 font-mono text-xs">
                    <div><div className="font-sans text-ink-3">{COLS[lang].income}</div><span className="font-bold text-lime">+{fmtCoin(r.yr / 12)} {r.o.coin}</span>{C.mo}</div>
                    <div><div className="font-sans text-ink-3">{COLS[lang].limits}</div>{limits(r.o)}</div>
                  </div>
                  <div className="mt-3">{pcButton(r, "w-full justify-center")}</div>
                  {openId === r.key && <div className="mt-3">{detail(r)}</div>}
                </div>
              ))}
            </div>
            {/* table */}
            <div className="mt-3 overflow-x-auto rounded-2xl border border-line max-sm:hidden">
              <table className="w-full min-w-[820px] text-left text-sm">
                <thead className="bg-white/[0.03] text-xs font-bold uppercase tracking-wider text-ink-3">
                  <tr>
                    <th className="px-4 py-3">{COLS[lang].ex}</th>
                    <th className="px-4 py-3 text-right"><Term k="apr" lang={lang} align="right">APR</Term></th>
                    <th className="px-4 py-3 text-right text-lime">{COLS[lang].income}</th>
                    <th className="px-4 py-3 text-right">{COLS[lang].limits}</th>
                    <th className="px-4 py-3" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {rows.map((r) => {
                    const open = openId === r.key;
                    return (
                      <Fragment key={r.key}>
                        <tr className={`hover:bg-white/[0.025] ${open ? "bg-white/[0.025]" : ""}`}>
                          <td className="px-4 py-3">{nameCell(r)}</td>
                          <td className="px-4 py-3 text-right">{aprCell(r.o)}</td>
                          <td className="whitespace-nowrap px-4 py-3 text-right font-mono">
                            {r.yr > 0 ? <>
                              <div className="font-bold text-lime">+{fmtCoin(r.yr / 12)} {r.o.coin}<span className="text-xs font-semibold text-ink-3">{C.mo}</span></div>
                              <div className="text-xs text-ink-3">{fmtCoin(r.yr)} {r.o.coin}{C.yr}{usdOf(r.yr)}</div>
                            </> : <span className="text-ink-3">—</span>}
                          </td>
                          <td className="px-4 py-3 text-right font-mono text-xs text-ink-2">{limits(r.o)}</td>
                          <td className="px-4 py-3 text-right"><div className="flex justify-end gap-2">
                            {pcButton(r, "whitespace-nowrap")}
                            <a href={r.o.url} target="_blank" rel="noopener" className="btn btn-ghost h-9 px-3 text-xs">{A.open} ↗</a>
                          </div></td>
                        </tr>
                        {open && <tr className="bg-white/[0.025]"><td colSpan={5} className="px-4 pb-4 pt-1">{detail(r)}</td></tr>}
                      </Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        );
      })()}

    </div>
  );
}
