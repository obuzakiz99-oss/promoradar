"use client";
import { useEffect, useState } from "react";

export interface CheckStep { h: string; b: string; img?: string; alt?: string }
const DONE: Record<string, (n: number, of: number) => string> = {
  uk: (n, of) => `Виконано ${n} з ${of}`, en: (n, of) => `${n} of ${of} done`, ru: (n, of) => `Выполнено ${n} из ${of}`,
};

/** Numbered guide steps with tick boxes; progress is kept in this browser (localStorage `pr:steps:<id>`). */
export function CheckSteps({ id, steps, lang = "uk", big = false, cols = 1 }: { id: string; steps: CheckStep[]; lang?: string; big?: boolean; cols?: 1 | 2 }) {
  const key = `pr:steps:${id}`;
  const [done, setDone] = useState<number[]>([]);
  useEffect(() => { try { setDone(JSON.parse(localStorage.getItem(key) ?? "[]")); } catch { /* blocked storage */ } }, [key]);
  const toggle = (i: number) => setDone((d) => {
    const n = d.includes(i) ? d.filter((x) => x !== i) : [...d, i];
    try { localStorage.setItem(key, JSON.stringify(n)); } catch { /* ignore */ }
    return n;
  });
  const pct = Math.round((done.length / steps.length) * 100);
  return (
    <div>
      <div className="mb-3 flex items-center gap-3 text-xs font-semibold text-ink-3">
        <div className="h-1.5 w-40 overflow-hidden rounded-full bg-white/5"><div className="h-full rounded-full bg-lime transition-all" style={{ width: `${pct}%` }} /></div>
        {(DONE[lang] ?? DONE.uk)(done.length, steps.length)}
      </div>
      {/* cols=2: long guides read as two columns on wide screens (owner, 12.11) */}
      <ol className={cols === 2 ? "grid gap-4 md:grid-cols-2" : big ? "space-y-6" : "space-y-3"}>
        {steps.map((s, i) => {
          const on = done.includes(i);
          return (
            <li key={s.h} className={`card p-5 hover:transform-none ${big ? "sm:p-6" : ""} ${on ? "opacity-70" : ""}`}>
              <div className="flex gap-4">
                <button type="button" onClick={() => toggle(i)} aria-pressed={on} aria-label={s.h}
                  className={`grid size-9 shrink-0 place-items-center rounded-xl font-mono text-sm font-bold transition ${on ? "bg-lime text-on-accent" : "bg-lime/10 text-lime hover:bg-lime/20"}`}>
                  {on ? "✓" : i + 1}
                </button>
                <div className="min-w-0">
                  <h3 className={`font-bold ${big ? "text-lg" : ""} ${on ? "line-through decoration-lime/60" : ""}`}>{s.h}</h3>
                  <p className="mt-1 text-sm leading-relaxed text-ink-2">{s.b}</p>
                </div>
              </div>
              {s.img && (
                // eslint-disable-next-line @next/next/no-img-element -- static export, plain img
                <img src={s.img} alt={s.alt ?? ""} loading="lazy" className="mt-4 w-full rounded-xl border border-line" />
              )}
            </li>
          );
        })}
      </ol>
    </div>
  );
}
