"use client";
import { useNovice } from "./NoviceToggle";
import { Term } from "./Term";
import { plainProfit } from "@/lib/level";
import { useMemo, useState } from "react";
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
  const [exPick, setEx] = useState("all");   // exchange filter (chips + clickable exchange names)

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
      <div className="mt-3 space-y-2">
        {list.length === 0 && <div className="rounded-2xl border border-dashed border-line-2 p-8 text-center text-ink-2">{A.none}</div>}
        {list.map((o, i) => {
          const v = exchanges[o.exchange];
          const top = i === 0 && !o.newUsers;
          return (
            <div key={`${o.exchange}${o.type}${o.days}${i}`} className={`card grid grid-cols-[auto_1fr_auto] items-center gap-x-4 gap-y-3 p-4 ${top ? "ring-1 ring-lime/50" : ""}`} style={{ ["--tint" as string]: v.color }}>
              <button type="button" onClick={() => setEx(o.exchange)} title={v.name}><VenueLogo v={v} size={40} /></button>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <button type="button" onClick={() => setEx(o.exchange)} className="inline-flex min-h-8 items-center font-bold hover:text-lime hover:underline">{v.name}</button>
                  {top && <span className="rounded-md bg-lime px-1.5 py-0.5 text-xs font-extrabold uppercase text-on-accent">{A.best}</span>}
                  {o.newUsers && <span className="rounded-md bg-amber/15 px-1.5 py-0.5 text-xs font-extrabold uppercase text-amber">{A.newUsers}</span>}
                </div>
                <div className="mt-0.5 text-xs font-semibold text-ink-3">
                  <Term k={o.type === "fixed" ? "fixed" : o.type === "onchain" ? "onchain" : "flexible"} lang={lang}>{A.type[o.type]}</Term>{o.days ? ` · ${o.days} ${A.days}` : ""}{o.minAmount ? ` · ${A.min} ${o.minAmount}` : ""}{o.maxAmount ? ` · ${A.max} ${o.maxAmount} ${o.coin}` : ""}
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="text-right">
                  <div className="font-mono text-2xl font-bold tracking-tight text-ink">{pct(o.apr)}</div>
                  {o.aprMax ? <div className="font-mono text-xs font-bold text-lime">{A.upTo} {pct(o.aprMax)}{o.tierNote ? ` · ${o.tierNote}` : ""}</div> : <div className="text-xs text-ink-3">{A.base}</div>}
                  {o.apr > 0 && <div className="nov text-xs font-semibold text-lime">{plainProfit(o.apr, lang)}</div>}
                  {o.apr > 0 && qty > 0 && (() => {
                    // capped offers (max amount) earn only on the part up to the cap
                    const base = o.maxAmount ? Math.min(qty, o.maxAmount) : qty;
                    const yr = (base * o.apr) / 100;
                    return (
                      <div className="mt-1 font-mono text-xs font-semibold text-lime">
                        +{fmtCoin(yr / 12)} {o.coin}{C.mo}
                        <span className="text-ink-3"> · {fmtCoin(yr)} {o.coin}{C.yr}{price && !STABLE.test(o.coin) ? ` ≈ ${fmtUsd(yr * price)}` : ""}</span>
                      </div>
                    );
                  })()}
                </div>
                <a href={o.url} target="_blank" rel="noopener" className="btn btn-ghost hidden h-10 px-4 text-sm sm:inline-flex">{A.open} ↗</a>
              </div>
              <div className="col-span-3 border-t border-line pt-3">
                <ProsCons lang={lang} pc={earnPC(lang, o, avg)} max={2} />
              </div>
            </div>
          );
        })}
      </div>

    </div>
  );
}
