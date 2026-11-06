"use client";
import { useEffect, useMemo, useState } from "react";
import type { Locale } from "@/lib/i18n";
import type { FundingEx, FundingRow } from "@/lib/funding";
import { PROX } from "@/lib/i18n-pro";

const pct = (x: number) => `${x > 0 ? "+" : ""}${Math.abs(x) >= 100 ? Math.round(x) : x.toFixed(1)}%`;
const usd = (x?: number) => (x === undefined ? "—" : x >= 1e9 ? `$${(x / 1e9).toFixed(1)}B` : x >= 1e6 ? `$${(x / 1e6).toFixed(0)}M` : `$${Math.round(x / 1e3)}K`);
const VOLS = [0, 1e6, 10e6, 100e6];

const AGO: Record<Locale, (m: number) => string> = { uk: (m) => (m < 1 ? "щойно" : `${m} хв тому`), en: (m) => (m < 1 ? "just now" : `${m} min ago`), ru: (m) => (m < 1 ? "только что" : `${m} мин назад`) };

export function FundingBoard({ rows, exchanges, down, lang, ages = {} }: { rows: FundingRow[]; exchanges: FundingEx[]; down: string[]; lang: Locale; ages?: Partial<Record<FundingEx, number>> }) {
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => { setNow(Date.now()); const i = setInterval(() => setNow(Date.now()), 60_000); return () => clearInterval(i); }, []);
  const P = PROX[lang];
  const [q, setQ] = useState("");
  const [minVol, setMinVol] = useState(10e6);
  const [calm, setCalm] = useState(true);   // hide momentary spikes (|rate| > 300%/yr) — they rarely last long enough to earn
  const list = useMemo(() => rows
    .filter((r) => (!q || r.coin.toLowerCase().includes(q.toLowerCase())) && (minVol === 0 || (r.volUsd ?? 0) >= minVol) && (!calm || Math.max(Math.abs(r.max), Math.abs(r.min)) <= 300))
    .slice(0, 150), [rows, q, minVol, calm]);
  return (
    <div className="mt-8">
      <div className="flex flex-wrap items-center gap-3">
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={P.search}
          className="h-10 w-48 rounded-xl border border-line bg-white/[0.03] px-3 text-sm font-semibold text-ink placeholder:text-ink-3 focus:border-lime/50 focus:outline-none" />
        <div className="flex h-10 items-center rounded-xl border border-line bg-white/[0.02] p-1 text-xs font-bold">
          <span className="px-2 text-ink-3">{P.minVol}</span>
          {VOLS.map((v) => (
            <button key={v} type="button" onClick={() => setMinVol(v)} className={`h-full rounded-lg px-2.5 ${minVol === v ? "bg-white/10 text-ink" : "text-ink-3 hover:text-ink"}`}>{v === 0 ? P.all : usd(v)}</button>
          ))}
        </div>
        <label className="flex h-10 cursor-pointer items-center gap-2 rounded-xl border border-line bg-white/[0.02] px-3 text-xs font-bold text-ink-2"><input type="checkbox" checked={calm} onChange={(e) => setCalm(e.target.checked)} className="accent-lime" />{P.calm}</label>
        {down.length > 0 && <span className="text-xs text-ink-3">{down.join(", ")}: {P.down}</span>}
      </div>
      <div className="mt-4 overflow-x-auto rounded-2xl border border-line">
        <table className="w-full min-w-[860px] text-left text-sm">
          <thead className="bg-white/[0.03] text-[11px] font-bold uppercase tracking-wider text-ink-3">
            <tr>
              <th className="px-4 py-3">{P.coin}</th>
              <th className="px-4 py-3 text-right">{P.spread}</th>
              <th className="px-4 py-3">{P.shortOn} / {P.longOn}</th>
              {exchanges.map((e) => {
                const m = now && ages[e] ? Math.max(0, Math.round((now - ages[e]!) / 60_000)) : undefined;
                return <th key={e} className="px-3 py-3 text-right">{e}{m !== undefined && <span className={`block text-[9px] font-semibold normal-case tracking-normal ${m > 45 ? "text-amber" : "text-ink-3"}`}>{AGO[lang](m)}</span>}</th>;
              })}
              <th className="px-4 py-3 text-right">{P.vol}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {list.map((r) => (
              <tr key={r.coin} className="hover:bg-white/[0.02]">
                <td className="px-4 py-2.5 font-bold">{r.coin}</td>
                <td className="px-4 py-2.5 text-right font-mono font-bold text-lime">{r.spread.toFixed(1)}%</td>
                <td className="px-4 py-2.5 text-xs font-semibold text-ink-2">↓ {r.maxEx} · ↑ {r.minEx}</td>
                {exchanges.map((e) => {
                  const v = r.rates[e];
                  const cls = v === undefined ? "text-ink-3" : e === r.maxEx ? "text-lime font-bold" : e === r.minEx ? "text-sky font-bold" : v < 0 ? "text-rose" : "text-ink-2";
                  return <td key={e} className={`px-3 py-2.5 text-right font-mono text-xs ${cls}`} title={v !== undefined ? P.every.replace("{h}", String(r.hours[e])) : undefined}>{v === undefined ? "—" : pct(v)}</td>;
                })}
                <td className="px-4 py-2.5 text-right font-mono text-xs text-ink-3">{usd(r.volUsd)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
