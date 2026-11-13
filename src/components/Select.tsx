"use client";
import { useEffect, useId, useRef, useState, type ReactNode } from "react";

export interface SelectOption<V extends string> { value: V; label: ReactNode; text?: string }

/**
 * Site-styled dropdown instead of the native <select> (owner 13.11: the OS menu — orange highlight, system font,
 * "↕" in every row — looked foreign). Button + listbox: arrows / Home / End / Enter / Esc / type-to-jump,
 * closes on outside click, opens upwards when there is no room below, long lists scroll.
 */
export function Select<V extends string>({ value, onChange, options, label, className = "", menuClassName = "", align = "left", title }: {
  value: V;
  onChange: (v: V) => void;
  options: SelectOption<V>[];
  /** accessible name (shown to screen readers only) */
  label: string;
  /** trigger classes: height, border, colours, text size */
  className?: string;
  menuClassName?: string;
  align?: "left" | "right";
  title?: string;
}) {
  const [open, setOpen] = useState(false);
  const [up, setUp] = useState(false);
  const [act, setAct] = useState(0);
  const root = useRef<HTMLDivElement>(null);
  const list = useRef<HTMLUListElement>(null);
  const btn = useRef<HTMLButtonElement>(null);
  const typed = useRef({ s: "", t: 0 });
  const id = useId();
  const cur = Math.max(0, options.findIndex((o) => o.value === value));

  useEffect(() => {
    if (!open) return;
    const off = (e: PointerEvent) => { if (!root.current?.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("pointerdown", off);
    return () => document.removeEventListener("pointerdown", off);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    list.current?.focus({ preventScroll: true });
    list.current?.querySelector<HTMLElement>(`[data-i="${act}"]`)?.scrollIntoView({ block: "nearest" });
  }, [open, act]);

  const show = () => {
    const r = btn.current?.getBoundingClientRect();
    if (r) setUp(window.innerHeight - r.bottom < Math.min(320, options.length * 40 + 16) && r.top > window.innerHeight - r.bottom);
    setAct(cur);
    setOpen(true);
  };
  const choose = (i: number) => {
    const o = options[i];
    if (o) onChange(o.value);
    setOpen(false);
    btn.current?.focus();
  };
  const textOf = (o: SelectOption<V>) => (o.text ?? (typeof o.label === "string" ? o.label : String(o.value))).toLowerCase();

  const onListKey = (e: React.KeyboardEvent) => {
    const n = options.length;
    if (e.key === "ArrowDown") { e.preventDefault(); setAct((a) => Math.min(n - 1, a + 1)); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setAct((a) => Math.max(0, a - 1)); }
    else if (e.key === "Home") { e.preventDefault(); setAct(0); }
    else if (e.key === "End") { e.preventDefault(); setAct(n - 1); }
    else if (e.key === "Enter" || e.key === " ") { e.preventDefault(); choose(act); }
    else if (e.key === "Escape") { e.preventDefault(); setOpen(false); btn.current?.focus(); }
    else if (e.key === "Tab") setOpen(false);
    else if (e.key.length === 1) {
      const now = Date.now();
      typed.current = { s: (now - typed.current.t < 700 ? typed.current.s : "") + e.key.toLowerCase(), t: now };
      const i = options.findIndex((o) => textOf(o).startsWith(typed.current.s));
      if (i >= 0) setAct(i);
    }
  };

  return (
    <div ref={root} className="relative">
      <button ref={btn} type="button" title={title} aria-label={label} aria-haspopup="listbox" aria-expanded={open} aria-controls={open ? id : undefined}
        onClick={() => (open ? setOpen(false) : show())}
        onKeyDown={(e) => { if (e.key === "ArrowDown" || e.key === "ArrowUp") { e.preventDefault(); show(); } }}
        className={`flex w-full items-center gap-2 text-left focus:outline-none focus-visible:border-lime/60 ${className}`}>
        <span className="min-w-0 flex-1 truncate">{options[cur]?.label}</span>
        <svg className={`size-4 shrink-0 text-ink-3 transition-transform ${open ? "rotate-180" : ""}`} viewBox="0 0 20 20" fill="currentColor" aria-hidden="true"><path d="M5.2 7.6a.75.75 0 0 1 1.06 0L10 11.3l3.74-3.7a.75.75 0 1 1 1.06 1.06l-4.27 4.24a.75.75 0 0 1-1.06 0L5.2 8.66a.75.75 0 0 1 0-1.06Z" /></svg>
      </button>
      {open && (
        <ul ref={list} id={id} role="listbox" tabIndex={-1} aria-label={label} aria-activedescendant={`${id}-${act}`} onKeyDown={onListKey}
          className={`absolute z-50 max-h-80 min-w-full overflow-y-auto overscroll-contain rounded-2xl border border-line-2 bg-surface p-1.5 shadow-2xl focus:outline-none ${up ? "bottom-full mb-1.5" : "top-full mt-1.5"} ${align === "right" ? "right-0" : "left-0"} ${menuClassName}`}>
          {options.map((o, i) => {
            const sel = i === cur;
            return (
              <li key={o.value} id={`${id}-${i}`} data-i={i} role="option" aria-selected={sel}
                onPointerMove={() => setAct(i)} onClick={() => choose(i)}
                className={`flex min-h-10 cursor-pointer items-center gap-2 whitespace-nowrap rounded-xl px-3 text-sm font-bold ${i === act ? "bg-white/[0.07]" : ""} ${sel ? "text-lime" : i === act ? "text-ink" : "text-ink-2"}`}>
                <span className="min-w-0 flex-1">{o.label}</span>
                <svg className={`size-4 shrink-0 ${sel ? "text-lime" : "invisible"}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.25" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M20 6 9 17l-5-5" /></svg>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
