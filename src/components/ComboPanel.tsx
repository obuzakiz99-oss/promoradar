"use client";
import { useState } from "react";
import { COMBO_UI, COMBO_WHY, type ComboWhy } from "@/lib/combos";

export interface ComboItem { id: string; href: string; title: string; usd?: number; left?: string }

const usd = (x: number) => (x >= 1e6 ? `$${+(x / 1e6).toFixed(1)}M` : x >= 1e3 ? `$${+(x / 1e3).toFixed(1)}K` : `$${Math.round(x)}`);

/**
 * "Combine with N more" on a promo card (audit 12.11): opens right inside the card — what is shared, the other
 * promos with their value and time left, the combined total — instead of jumping to another page.
 */
export function ComboPanel({ items, why, ownUsd, lang }: { items: ComboItem[]; why: ComboWhy; ownUsd?: number; lang: "uk" | "en" | "ru" }) {
  const [open, setOpen] = useState(false);
  const U = COMBO_UI[lang];
  const total = (ownUsd ?? 0) + items.reduce((s, x) => s + (x.usd ?? 0), 0);
  return (
    <div className="relative z-10 mt-3">
      <button type="button" onClick={() => setOpen((x) => !x)} aria-expanded={open}
        className={`inline-flex min-h-8 items-center gap-1.5 rounded-lg border px-2.5 text-xs font-semibold transition-colors ${open ? "border-teal/50 bg-teal/10 text-teal" : "border-teal/30 text-teal hover:bg-teal/10"}`}>
        <svg className="size-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m12 2 10 5-10 5L2 7l10-5Zm-10 10 10 5 10-5M2 17l10 5 10-5" /></svg>
        {U.btn(items.length)}
        <span aria-hidden="true" className={`transition-transform ${open ? "rotate-180" : ""}`}>▾</span>
      </button>
      {open && (
        <div className="mt-2 rounded-xl border border-teal/25 bg-teal/[0.05] p-3">
          <p className="text-xs text-ink-2">{U.lead(COMBO_WHY[lang][why])}</p>
          <ul className="mt-2 space-y-1.5">
            {items.map((x) => (
              <li key={x.id}>
                <a href={x.href} className="group flex items-baseline gap-2 rounded-lg px-1.5 py-1 hover:bg-white/5">
                  <span className="min-w-0 flex-1 text-xs font-semibold text-ink group-hover:text-lime">{x.title}</span>
                  {x.usd ? <span className="shrink-0 font-mono text-xs font-bold text-lime">{usd(x.usd)}</span> : null}
                  {x.left ? <span className="shrink-0 font-mono text-xs text-ink-3">{x.left}</span> : null}
                </a>
              </li>
            ))}
          </ul>
          {total > 0 && <p className="mt-2 text-xs font-bold text-ink">{U.sum(usd(total))}</p>}
          <p className="mt-1 text-xs text-ink-3">{U.check}</p>
        </div>
      )}
    </div>
  );
}
