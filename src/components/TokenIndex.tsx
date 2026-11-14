"use client";
import { langOf, plural } from "@/lib/format";
import { useState } from "react";
import { VenueLogo } from "./VenueLogo";
import { coinLogos, coinMonogram } from "@/lib/coinlogo";

export interface TokenRow { sym: string; logo?: string; href: string; promos: number; lp: number; earnMax?: number; score: number }

/** Searchable grid of all token pages. */
export function TokenIndex({ rows, labels }: { rows: TokenRow[]; labels: { search: string; promos: string; lp: string; earn: string; empty: string; gPromos: string; gLp: string; gEarn: string; more: (n: number) => string } }) {
  const [q, setQ] = useState("");
  const s = q.trim().toUpperCase();
  const list = s ? rows.filter((r) => r.sym.includes(s)).sort((a, b) => Number(b.sym === s) - Number(a.sym === s) || Number(b.sym.startsWith(s)) - Number(a.sym.startsWith(s)) || b.score - a.score) : rows;
  // without a search: three groups (with promos · with a Launchpool · Earn only), the first 30 of each shown
  // (audit 14.11: ~300 equal tiles, 13 550 px on a phone)
  const groups: Array<[string, TokenRow[]]> = s ? [["", list]] : [
    [labels.gPromos, rows.filter((r) => r.promos > 0)],
    [labels.gLp, rows.filter((r) => !r.promos && r.lp > 0)],
    [labels.gEarn, rows.filter((r) => !r.promos && !r.lp)],
  ];
  const [all, setAll] = useState<Record<string, boolean>>({});
  const tile = (r: TokenRow) => (
    <a key={r.sym} href={r.href} className="card flex items-center gap-3 p-3">
      <VenueLogo v={{ name: r.sym, logo: r.logo, color: "#2a3140", ink: "#e8ecf1", monogram: coinMonogram(r.sym) }} alts={coinLogos(r.sym)} size={34} rounded="rounded-full" />
      <div className="min-w-0">
        <div className="break-all font-bold">{r.sym}</div>
        <div className="text-xs font-semibold text-ink-3">
          {[r.promos ? `${r.promos} ${plural(r.promos, langOf(labels.promos), "promo")}` : "", r.lp ? `${r.lp} ${labels.lp}` : "", r.earnMax ? `${labels.earn} ${r.earnMax.toFixed(1)}%` : ""].filter(Boolean).join(" · ")}
        </div>
      </div>
    </a>
  );
  return (
    <>
      <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={labels.search} aria-label={labels.search}
        className="mt-6 h-12 w-full max-w-md rounded-xl border border-line bg-white/[0.03] px-4 text-base font-medium text-ink placeholder:text-ink-3 focus:border-lime/50 focus:outline-none" />
      {list.length ? groups.filter(([, g]) => g.length).map(([h, g]) => (
        <section key={h || "search"} className="mt-8">
          {h && <h2 className="font-display text-xl font-semibold tracking-tight">{h} <span className="font-mono text-base text-ink-3">{g.length}</span></h2>}
          <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">{(s || all[h] ? g : g.slice(0, 30)).map(tile)}</div>
          {!s && !all[h] && g.length > 30 && <button type="button" onClick={() => setAll((x) => ({ ...x, [h]: true }))} className="btn btn-ghost mt-3 h-10 px-4 text-sm">{labels.more(g.length - 30)}</button>}
        </section>
      )) : <p className="mt-8 text-ink-3">{labels.empty}</p>}
    </>
  );
}
