"use client";
import { useNovice } from "./NoviceToggle";
import { Term } from "./Term";
import { plainProfit } from "@/lib/level";
import { useMemo, useState } from "react";
import type { Dict, Locale } from "@/lib/i18n";
import type { EarnOffer } from "@/lib/earn";
import type { Venue } from "@/lib/types";
import { VenueLogo } from "./VenueLogo";
import { ProsCons } from "./ProsCons";
import { earnPC } from "@/lib/proscons";

const pct = (x: number) => `${x >= 100 ? Math.round(x) : x >= 10 ? x.toFixed(1) : x.toFixed(2)}%`;

export function EarnBoard({ offers, popular, exchanges, t, lang }: { offers: EarnOffer[]; popular: string[]; exchanges: Record<string, Venue>; t: Dict; lang: Locale }) {
  const A = t.aprHub;
  const [coinPick, setCoin] = useState("USDT");
  const novice = useNovice();
  const coin = novice && !/^(USDT|USDC)$/.test(coinPick) ? "USDT" : coinPick;   // beginners: dollar stablecoins only
  const [q, setQ] = useState("");
  const [type, setType] = useState<"all" | EarnOffer["type"]>("all");

  const byCoin = useMemo(() => {
    const m = new Map<string, EarnOffer[]>();
    for (const o of offers) m.set(o.coin, [...(m.get(o.coin) ?? []), o]);
    return m;
  }, [offers]);
  const coins = useMemo(() => [...byCoin.keys()].sort(), [byCoin]);
  const matches = q ? coins.filter((c) => c.toLowerCase().startsWith(q.toLowerCase())).slice(0, 12) : [];

  // regular offers ranked by base APR; new-user promos listed after them (they're capped and not for everyone)
  const list = useMemo(() => (byCoin.get(coin) ?? []).filter((o) => type === "all" || o.type === type)
    .sort((a, b) => Number(!!a.newUsers) - Number(!!b.newUsers) || b.apr - a.apr || (b.aprMax ?? 0) - (a.aprMax ?? 0)), [byCoin, coin, type]);

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
              <button key={c} onClick={() => setCoin(c)} className={`${/^(USDT|USDC)$/.test(c) ? "" : "adv "}h-9 rounded-lg px-3 text-sm font-bold transition-colors ${coin === c ? "bg-lime text-[#0b0f05]" : "bg-white/[0.05] text-ink-2 hover:text-ink"}`}>{c}</button>
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
      <div className="mt-3 space-y-2">
        {list.length === 0 && <div className="rounded-2xl border border-dashed border-line-2 p-8 text-center text-ink-2">{A.none}</div>}
        {list.map((o, i) => {
          const ex = exchanges[o.exchange];
          const top = i === 0 && !o.newUsers;
          return (
            <div key={`${o.exchange}${o.type}${o.days}${i}`} className={`card grid grid-cols-[auto_1fr_auto] items-center gap-x-4 gap-y-3 p-4 ${top ? "ring-1 ring-lime/50" : ""}`} style={{ ["--tint" as string]: ex.color }}>
              <VenueLogo v={ex} size={40} />
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-bold">{ex.name}</span>
                  {top && <span className="rounded-md bg-lime px-1.5 py-0.5 text-[10px] font-extrabold uppercase text-[#0b0f05]">{A.best}</span>}
                  {o.newUsers && <span className="rounded-md bg-amber/15 px-1.5 py-0.5 text-[10px] font-extrabold uppercase text-amber">🎁 {A.newUsers}</span>}
                </div>
                <div className="mt-0.5 text-xs font-semibold text-ink-3">
                  <Term k={o.type === "fixed" ? "fixed" : "flexible"} lang={lang}>{A.type[o.type]}</Term>{o.days ? ` · ${o.days} ${A.days}` : ""}{o.minAmount ? ` · ${A.min} ${o.minAmount}` : ""}{o.maxAmount ? ` · ${A.max} ${o.maxAmount} ${o.coin}` : ""}
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="text-right">
                  <div className="font-mono text-2xl font-bold tracking-tight text-ink">{pct(o.apr)}</div>
                  {o.aprMax ? <div className="font-mono text-xs font-bold text-lime">{A.upTo} {pct(o.aprMax)}{o.tierNote ? ` · ${o.tierNote}` : ""}</div> : <div className="text-[11px] text-ink-3">{A.base}</div>}
                  {o.apr > 0 && <div className="nov text-[11px] font-semibold text-lime">{plainProfit(o.apr, lang)}</div>}
                </div>
                <a href={o.url} target="_blank" rel="noopener" className="btn btn-ghost hidden h-10 px-4 text-sm sm:inline-flex">{A.open} ↗</a>
              </div>
              <div className="col-span-3 border-t border-line pt-3">
                <ProsCons pc={earnPC(lang, o, avg)} max={2} />
              </div>
            </div>
          );
        })}
      </div>

      {/* grid of popular coins */}
      <h2 className="mt-14 font-display text-2xl font-semibold tracking-tight">{A.grid}</h2>
      <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {grid.map(({ c, best, boosted, n }) => (
          <button key={c} onClick={() => { setCoin(c); window.scrollTo({ top: 0, behavior: "smooth" }); }} className="card p-4 text-left">
            <div className="flex items-center justify-between">
              <span className="font-display text-lg font-semibold">{c}</span>
              <span className="font-mono text-[11px] text-ink-3">{n} {A.exchanges}</span>
            </div>
            <div className="mt-3 flex items-end justify-between gap-2">
              <div>
                <div className="font-mono text-2xl font-bold">{pct(best.apr)}</div>
                <div className="mt-0.5 flex items-center gap-1.5 text-xs font-semibold text-ink-3"><VenueLogo v={exchanges[best.exchange]} size={16} rounded="rounded" />{exchanges[best.exchange].name}</div>
              </div>
              {(boosted.aprMax ?? 0) > best.apr && (
                <div className="text-right font-mono text-xs font-bold text-lime">{A.upTo} {pct(boosted.aprMax!)}<div className="font-sans text-[10px] font-semibold text-ink-3">{exchanges[boosted.exchange].name}</div></div>
              )}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
