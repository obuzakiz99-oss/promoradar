"use client";
import { plural } from "@/lib/format";
import { useEffect, useState } from "react";
import type { Locale } from "@/lib/i18n";
import type { Country, ScoreRow } from "@/lib/scorecards";
import { VenueLogo } from "./VenueLogo";

type Key = "score" | "promos" | "poolUsd" | "perUserMedian" | "entryMedian" | "noDepositPct" | "launchpools" | "usdtEarn";

const TX: Record<Locale, {
  country: string; any: string; ua: string; eu: string; cols: Record<Key, string>; kyc: string; newUsers: string; hidden: (n: number) => string;
  none: string; promos: string; open: string; how: string;
}> = {
  uk: {
    country: "Країна", any: "🌍 Будь-яка", ua: "🇺🇦 Україна", eu: "🇪🇺 ЄС",
    cols: { score: "Бал", promos: "Акцій", poolUsd: "Фонди", perUserMedian: "На 1 людину (медіана)", entryMedian: "Поріг (медіана)", noDepositPct: "Без вкладень", launchpools: "Launchpool", usdtEarn: "USDT Earn" },
    kyc: "KYC у правилах", newUsers: "лише для нових", hidden: (n) => `${n} ${plural(n, "uk", "promo")} не для цієї країни`, none: "—", promos: "акцій", open: "Акції біржі →",
    how: "Бал 0–100: кількість акцій (35%), скільки можна отримати одній людині (30%), наскільки низький поріг (20%), частка акцій без вкладень (10%), Launchpool і ставка USDT Earn (5%). Рахується автоматично з поточних акцій — без платних місць.",
  },
  en: {
    country: "Country", any: "🌍 Any", ua: "🇺🇦 Ukraine", eu: "🇪🇺 EU",
    cols: { score: "Score", promos: "Promos", poolUsd: "Pools", perUserMedian: "Per person (median)", entryMedian: "Entry (median)", noDepositPct: "No deposit", launchpools: "Launchpool", usdtEarn: "USDT Earn" },
    kyc: "KYC in rules", newUsers: "new users only", hidden: (n) => `${n} promos not for this country`, none: "—", promos: "promos", open: "Exchange promos →",
    how: "Score 0–100: number of promos (35%), what one person can get (30%), how low the entry is (20%), share of no-deposit promos (10%), Launchpools and USDT Earn rate (5%). Calculated automatically from current promos — no paid placements.",
  },
  ru: {
    country: "Страна", any: "🌍 Любая", ua: "🇺🇦 Украина", eu: "🇪🇺 ЕС",
    cols: { score: "Балл", promos: "Акций", poolUsd: "Фонды", perUserMedian: "На 1 человека (медиана)", entryMedian: "Порог (медиана)", noDepositPct: "Без вложений", launchpools: "Launchpool", usdtEarn: "USDT Earn" },
    kyc: "KYC в правилах", newUsers: "только для новых", hidden: (n) => `${n} ${plural(n, "ru", "promo")} не для этой страны`, none: "—", promos: "акций", open: "Акции биржи →",
    how: "Балл 0–100: количество акций (35%), сколько может получить один человек (30%), насколько низкий порог (20%), доля акций без вложений (10%), Launchpool и ставка USDT Earn (5%). Считается автоматически по текущим акциям — без платных мест.",
  },
};

const usd = (x?: number) => (x === undefined ? undefined : x >= 1e6 ? `$${(x / 1e6).toFixed(1)}M` : x >= 1e3 ? `$${(x / 1e3).toFixed(x >= 1e4 ? 0 : 1)}K` : `$${Math.round(x)}`);

export function ScoreBoard({ data, lang, venueBase }: { data: Record<Country, ScoreRow[]>; lang: Locale; venueBase: string }) {
  const T = TX[lang];
  const [c, setC] = useState<Country>(lang === "uk" ? "ua" : "any");
  const [sort, setSort] = useState<Key>("score");
  useEffect(() => { try { const s = localStorage.getItem("pr:country"); if (s === "any" || s === "ua" || s === "eu") setC(s); } catch { /* blocked */ } }, []);
  const pick = (x: Country) => { setC(x); try { localStorage.setItem("pr:country", x); } catch { /* blocked */ } };
  const val = (r: ScoreRow) => (sort === "entryMedian" ? -(r.entryMedian ?? 1e12) : (r[sort] as number | undefined) ?? -1);
  const rows = [...data[c]].sort((a, b) => val(b) - val(a));

  const Th = ({ k, className = "" }: { k: Key; className?: string }) => (
    <th className={`px-3 py-2 text-right ${className}`}>
      <button type="button" onClick={() => setSort(k)} className={`text-[11px] font-bold uppercase tracking-wider ${sort === k ? "text-lime" : "text-ink-3 hover:text-ink"}`}>{T.cols[k]}{sort === k ? " ↓" : ""}</button>
    </th>
  );

  return (
    <div className="mt-6">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs font-bold uppercase tracking-wider text-ink-3">{T.country}:</span>
        {(["any", "ua", "eu"] as Country[]).map((x) => (
          <button key={x} type="button" onClick={() => pick(x)} aria-pressed={c === x}
            className={`h-9 rounded-xl border px-3 text-[13px] font-bold ${c === x ? "border-lime/60 bg-lime/10 text-ink" : "border-line bg-white/[0.02] text-ink-2 hover:text-ink"}`}>{T[x]}</button>
        ))}
      </div>

      {/* desktop table */}
      <div className="mt-5 hidden overflow-x-auto rounded-2xl border border-line lg:block">
        <table className="w-full text-sm">
          <thead className="bg-white/[0.03]">
            <tr>
              <th className="px-3 py-2 text-left text-[11px] font-bold uppercase tracking-wider text-ink-3">#</th>
              <th className="px-3 py-2 text-left text-[11px] font-bold uppercase tracking-wider text-ink-3"></th>
              <Th k="score" /><Th k="promos" /><Th k="poolUsd" /><Th k="perUserMedian" /><Th k="entryMedian" /><Th k="noDepositPct" /><Th k="launchpools" /><Th k="usdtEarn" />
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={r.venue.id} className="border-t border-line hover:bg-white/[0.02]">
                <td className="px-3 py-3 font-mono text-ink-3">{i + 1}</td>
                <td className="px-3 py-3">
                  <a href={`${venueBase}${r.venue.id}/`} className="flex items-center gap-2.5 font-bold hover:text-lime">
                    <VenueLogo v={r.venue} size={28} rounded="rounded-lg" /> {r.venue.name}
                  </a>
                  <div className="mt-1 flex flex-wrap gap-1.5 pl-[38px] text-[10px] font-bold">
                    {r.kycPct !== undefined && <span className="rounded bg-white/5 px-1.5 py-0.5 text-ink-3">{T.kyc} {r.kycPct}%</span>}
                    {r.newUsersPct > 0 && <span className="rounded bg-sky/10 px-1.5 py-0.5 text-sky">{r.newUsersPct}% {T.newUsers}</span>}
                    {r.hidden > 0 && <span className="rounded bg-amber/10 px-1.5 py-0.5 text-amber">{T.hidden(r.hidden)}</span>}
                  </div>
                </td>
                <td className="px-3 py-3 text-right"><span className="rounded-lg bg-lime/10 px-2 py-1 font-mono font-bold text-lime">{r.score}</span></td>
                <td className="px-3 py-3 text-right font-mono">{r.promos}</td>
                <td className="px-3 py-3 text-right font-mono">{usd(r.poolUsd) ?? T.none}</td>
                <td className="px-3 py-3 text-right font-mono">{usd(r.perUserMedian) ?? T.none}{r.perUserMax ? <span className="block text-[10px] text-ink-3">max {usd(r.perUserMax)}</span> : null}</td>
                <td className="px-3 py-3 text-right font-mono">{r.entryMedian === undefined ? T.none : r.entryMedian === 0 ? "$0" : usd(r.entryMedian)}</td>
                <td className="px-3 py-3 text-right font-mono">{r.noDepositPct}%</td>
                <td className="px-3 py-3 text-right font-mono">{r.launchpools || T.none}</td>
                <td className="px-3 py-3 text-right font-mono">{r.usdtEarn ? `${r.usdtEarn.toFixed(1)}%` : T.none}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* phone cards */}
      <div className="mt-5 grid gap-3 lg:hidden">
        <div className="scroll-x -mx-1 flex gap-1.5 px-1">
          {(Object.keys(T.cols) as Key[]).map((k) => (
            <button key={k} type="button" onClick={() => setSort(k)} className={`h-8 shrink-0 rounded-lg px-2.5 text-[11px] font-bold ${sort === k ? "bg-lime text-[#0b0f05]" : "bg-white/[0.05] text-ink-2"}`}>{T.cols[k]}</button>
          ))}
        </div>
        {rows.map((r, i) => (
          <a key={r.venue.id} href={`${venueBase}${r.venue.id}/`} className="card p-4">
            <div className="flex items-center gap-3">
              <span className="font-mono text-sm text-ink-3">{i + 1}</span>
              <VenueLogo v={r.venue} size={32} rounded="rounded-lg" />
              <span className="font-bold">{r.venue.name}</span>
              <span className="ml-auto rounded-lg bg-lime/10 px-2 py-1 font-mono font-bold text-lime">{r.score}</span>
            </div>
            <div className="mt-3 grid grid-cols-3 gap-2 text-center font-mono text-xs">
              <div><div className="text-[10px] text-ink-3">{T.cols.promos}</div>{r.promos}</div>
              <div><div className="text-[10px] text-ink-3">{T.cols.perUserMedian}</div>{usd(r.perUserMedian) ?? T.none}</div>
              <div><div className="text-[10px] text-ink-3">{T.cols.entryMedian}</div>{r.entryMedian === undefined ? T.none : r.entryMedian === 0 ? "$0" : usd(r.entryMedian)}</div>
              <div><div className="text-[10px] text-ink-3">{T.cols.poolUsd}</div>{usd(r.poolUsd) ?? T.none}</div>
              <div><div className="text-[10px] text-ink-3">{T.cols.noDepositPct}</div>{r.noDepositPct}%</div>
              <div><div className="text-[10px] text-ink-3">{T.cols.usdtEarn}</div>{r.usdtEarn ? `${r.usdtEarn.toFixed(1)}%` : T.none}</div>
            </div>
            {(r.kycPct !== undefined || r.hidden > 0) && (
              <div className="mt-2 flex flex-wrap gap-1.5 text-[10px] font-bold">
                {r.kycPct !== undefined && <span className="rounded bg-white/5 px-1.5 py-0.5 text-ink-3">{T.kyc} {r.kycPct}%</span>}
                {r.hidden > 0 && <span className="rounded bg-amber/10 px-1.5 py-0.5 text-amber">{T.hidden(r.hidden)}</span>}
              </div>
            )}
          </a>
        ))}
      </div>
      <p className="mt-5 max-w-3xl text-xs leading-relaxed text-ink-3">{T.how}</p>
    </div>
  );
}
