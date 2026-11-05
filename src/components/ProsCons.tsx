"use client";
import { useState } from "react";
import type { PC } from "@/lib/proscons";

/** Compact pros (green ✓) and cons (red ✕). Shows `max` of each, the rest behind a toggle. */
export function ProsCons({ pc, max = 3, more = "+", className = "" }: { pc: PC; max?: number; more?: string; className?: string }) {
  const [open, setOpen] = useState(false);
  const extra = Math.max(0, pc.pros.length - max) + Math.max(0, pc.cons.length - max);
  const pros = open ? pc.pros : pc.pros.slice(0, max);
  const cons = open ? pc.cons : pc.cons.slice(0, max);
  if (!pc.pros.length && !pc.cons.length) return null;
  return (
    <div className={`grid gap-x-6 gap-y-1.5 text-[12.5px] leading-snug sm:grid-cols-2 ${className}`}>
      <ul className="space-y-1.5">
        {pros.map((x) => (
          <li key={x} className="flex gap-2 text-ink-2"><span className="mt-px grid size-4 shrink-0 place-items-center rounded-full bg-lime/15 text-[10px] font-black text-lime">✓</span>{x}</li>
        ))}
      </ul>
      <ul className="space-y-1.5">
        {cons.map((x) => (
          <li key={x} className="flex gap-2 text-ink-2"><span className="mt-px grid size-4 shrink-0 place-items-center rounded-full bg-rose/15 text-[10px] font-black text-rose">✕</span>{x}</li>
        ))}
      </ul>
      {extra > 0 && (
        <button type="button" onClick={() => setOpen((v) => !v)} className="justify-self-start text-[12px] font-bold text-ink-3 hover:text-ink sm:col-span-2">
          {open ? "−" : `${more} ${extra}`}
        </button>
      )}
    </div>
  );
}
