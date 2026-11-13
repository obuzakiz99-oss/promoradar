"use client";
import { useEffect, useRef, useState } from "react";
import { googleCalUrl, icsFile, type CalEvent } from "@/lib/ics";
import { Icon } from "./Icon";

const TX = {
  uk: { add: "Додати в календар", ics: "iPhone / Outlook (.ics)" },
  en: { add: "Add to calendar", ics: "iPhone / Outlook (.ics)" },
  ru: { add: "Добавить в календарь", ics: "iPhone / Outlook (.ics)" },
} as const;

/** A small calendar button with a Google / .ics menu; the .ics is built on click, so long tables stay light. */
export function CalAdd({ ev, lang, file }: { ev: CalEvent; lang: "uk" | "en" | "ru"; file: string }) {
  const [open, setOpen] = useState(false);
  // the menu is fixed to the viewport: tables scroll sideways (overflow), which would clip an absolute menu
  const [pos, setPos] = useState<{ top?: number; bottom?: number; right: number }>({ right: 0 });
  const btn = useRef<HTMLButtonElement>(null);
  const toggle = () => {
    const r = btn.current?.getBoundingClientRect();
    if (r) setPos(window.innerHeight - r.bottom > 120 ? { top: r.bottom + 4, right: window.innerWidth - r.right } : { bottom: window.innerHeight - r.top + 4, right: window.innerWidth - r.right });
    setOpen((x) => !x);
  };
  const root = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const off = (e: PointerEvent) => { if (!root.current?.contains(e.target as Node)) setOpen(false); };
    const esc = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("pointerdown", off);
    const close = () => setOpen(false);
    document.addEventListener("keydown", esc);
    window.addEventListener("scroll", close, { passive: true, capture: true });
    return () => { document.removeEventListener("pointerdown", off); document.removeEventListener("keydown", esc); window.removeEventListener("scroll", close, { capture: true }); };
  }, [open]);
  const ics = () => {
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([icsFile([ev])], { type: "text/calendar" }));
    a.download = `${file.replace(/[^a-z0-9]+/gi, "-").slice(0, 40)}.ics`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
    setOpen(false);
  };
  return (
    <div ref={root} className={`relative inline-block ${open ? "z-30" : ""}`}>
      <button ref={btn} type="button" onClick={toggle} aria-expanded={open} aria-label={TX[lang].add} title={TX[lang].add}
        className={`grid size-9 place-items-center rounded-lg border transition ${open ? "border-lime/50 text-lime" : "border-line text-ink-3 hover:border-line-2 hover:text-ink"}`}>
        <Icon name="calendar" className="size-4" />
      </button>
      {open && (
        <div style={pos} className="fixed z-50 flex w-56 flex-col rounded-xl border border-line-2 bg-surface p-1.5 shadow-2xl">
          <a href={googleCalUrl(ev)} target="_blank" rel="noopener" onClick={() => setOpen(false)} className="rounded-lg px-3 py-2.5 text-sm font-semibold hover:bg-white/5">Google Calendar</a>
          <button type="button" onClick={ics} className="rounded-lg px-3 py-2.5 text-left text-sm font-semibold hover:bg-white/5">{TX[lang].ics}</button>
        </div>
      )}
    </div>
  );
}
