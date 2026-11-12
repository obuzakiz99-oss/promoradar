"use client";
import { useState } from "react";
import type { PC } from "@/lib/proscons";

/** Compact pros (green ✓) and cons (red ✕). Shows `max` of each, the rest behind a toggle. */
// the "show the rest" toggle: a real 32px target with words, not a bare "+ 1" (audit 12.11)
const MORE_TX: Record<string, { more: (n: number) => string; less: string }> = {
  uk: { more: (n) => `Ще ${n}`, less: "Згорнути" }, en: { more: (n) => `${n} more`, less: "Show less" }, ru: { more: (n) => `Ещё ${n}`, less: "Свернуть" },
};

export function ProsCons({ pc, max = 3, className = "", lang = "uk" }: { pc: PC; max?: number; more?: string; className?: string; lang?: string }) {
  const M = MORE_TX[lang] ?? MORE_TX.uk;
  const [open, setOpen] = useState(false);
  const extra = Math.max(0, pc.pros.length - max) + Math.max(0, pc.cons.length - max);
  const pros = open ? pc.pros : pc.pros.slice(0, max);
  const cons = open ? pc.cons : pc.cons.slice(0, max);
  if (!pc.pros.length && !pc.cons.length) return null;
  return (
    <div className={`grid gap-x-6 gap-y-1.5 text-[12.5px] leading-snug sm:grid-cols-2 ${className}`}>
      <ul className="space-y-1.5">
        {pros.map((x) => (
          <li key={x} className="flex gap-2 text-ink-2"><span className="mt-px grid size-4 shrink-0 place-items-center rounded-full bg-lime/15 text-xs font-black text-lime">✓</span>{x}</li>
        ))}
      </ul>
      <ul className="space-y-1.5">
        {cons.map((x) => (
          <li key={x} className="flex gap-2 text-ink-2"><span className="mt-px grid size-4 shrink-0 place-items-center rounded-full bg-rose/15 text-xs font-black text-rose">✕</span>{x}</li>
        ))}
      </ul>
      {extra > 0 && (
        <button type="button" onClick={() => setOpen((v) => !v)} aria-expanded={open}
          className="-ml-2 inline-flex min-h-8 items-center justify-self-start rounded-lg px-2 text-xs font-bold text-ink-3 hover:bg-white/5 hover:text-ink sm:col-span-2">
          {open ? M.less : M.more(extra)}
        </button>
      )}
    </div>
  );
}
