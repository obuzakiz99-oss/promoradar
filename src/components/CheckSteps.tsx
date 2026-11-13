"use client";
import { useEffect, useState } from "react";

export interface CheckStep { h: string; b: string; img?: string; alt?: string }
// owner 13.11: it was not clear how the progress fills — every step now has a labelled "Done" check and a hint
const MARK: Record<string, { hint: string; mark: string; done: string }> = {
  uk: { hint: "Позначайте кроки, які вже зробили — прогрес збережеться в цьому браузері", mark: "Позначити як зроблене", done: "Зроблено" },
  en: { hint: "Tick the steps you have done — progress is saved in this browser", mark: "Mark as done", done: "Done" },
  ru: { hint: "Отмечайте шаги, которые уже сделали — прогресс сохранится в этом браузере", mark: "Отметить как сделанное", done: "Сделано" },
};
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
  const M = MARK[lang] ?? MARK.uk;
  return (
    <div>
      <div className="mb-3 flex items-center gap-3 text-xs font-semibold text-ink-3">
        <div className="h-1.5 w-40 overflow-hidden rounded-full bg-white/5"><div className="h-full rounded-full bg-lime transition-all" style={{ width: `${pct}%` }} /></div>
        <span>{(DONE[lang] ?? DONE.uk)(done.length, steps.length)}</span>
        {done.length === 0 && <span className="hidden font-normal sm:inline">· {M.hint}</span>}
      </div>
      {/* cols=2: long guides read as two columns on wide screens (owner, 12.11) */}
      <ol className={cols === 2 ? "grid gap-4 md:grid-cols-2" : big ? "space-y-6" : "space-y-3"}>
        {steps.map((s, i) => {
          const on = done.includes(i);
          return (
            <li key={s.h} className={`card p-5 hover:transform-none ${big ? "sm:p-6" : ""} ${on ? "opacity-70" : ""}`}>
              <div className="flex gap-4">
                <span aria-hidden="true" className={`grid size-9 shrink-0 place-items-center rounded-xl font-mono text-sm font-bold transition ${on ? "bg-lime text-on-accent" : "bg-lime/10 text-lime"}`}>
                  {on ? "✓" : i + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <h3 className={`font-bold ${big ? "text-lg" : ""} ${on ? "line-through decoration-lime/60" : ""}`}>{s.h}</h3>
                  <p className="mt-1 text-sm leading-relaxed text-ink-2">{s.b}</p>
                  <button type="button" onClick={() => toggle(i)} aria-pressed={on}
                    className={`mt-3 inline-flex min-h-9 items-center gap-2 rounded-lg border px-3 text-xs font-bold transition ${on ? "border-lime/50 bg-lime/10 text-lime" : "border-line text-ink-2 hover:border-lime/40 hover:text-ink"}`}>
                    <span aria-hidden="true" className={`grid size-4 place-items-center rounded border ${on ? "border-lime bg-lime text-on-accent" : "border-ink-3"}`}>{on ? "✓" : ""}</span>
                    {on ? M.done : M.mark}
                  </button>
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
