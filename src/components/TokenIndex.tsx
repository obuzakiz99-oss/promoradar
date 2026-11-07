"use client";
import { useState } from "react";
import { VenueLogo } from "./VenueLogo";

export interface TokenRow { sym: string; logo?: string; href: string; promos: number; lp: number; earnMax?: number; score: number }

/** Searchable grid of all token pages. */
export function TokenIndex({ rows, labels }: { rows: TokenRow[]; labels: { search: string; promos: string; lp: string; earn: string; empty: string } }) {
  const [q, setQ] = useState("");
  const s = q.trim().toUpperCase();
  const list = s ? rows.filter((r) => r.sym.includes(s)).sort((a, b) => Number(b.sym === s) - Number(a.sym === s) || Number(b.sym.startsWith(s)) - Number(a.sym.startsWith(s)) || b.score - a.score) : rows;
  return (
    <>
      <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={labels.search} autoFocus
        className="mt-6 h-12 w-full max-w-md rounded-xl border border-line bg-white/[0.03] px-4 text-base font-medium text-ink placeholder:text-ink-3 focus:border-lime/50 focus:outline-none" />
      {list.length ? (
        <div className="mt-6 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
          {list.map((r) => (
            <a key={r.sym} href={r.href} className="card flex items-center gap-3 p-3">
              <VenueLogo v={{ name: r.sym, logo: r.logo, color: "#2a3140", ink: "#e8ecf1", monogram: r.sym.slice(0, 3) }} size={34} rounded="rounded-full" />
              <div className="min-w-0">
                <div className="break-all font-bold">{r.sym}</div>
                <div className="font-mono text-[10px] text-ink-3">
                  {[r.promos ? `${r.promos} ${labels.promos}` : "", r.lp ? `${r.lp} ${labels.lp}` : "", r.earnMax ? `${labels.earn} ${r.earnMax.toFixed(1)}%` : ""].filter(Boolean).join(" · ")}
                </div>
              </div>
            </a>
          ))}
        </div>
      ) : <p className="mt-8 text-ink-3">{labels.empty}</p>}
    </>
  );
}
