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
  const [pos, setPos] = useState<{ top?: number; bottom?: number; left: number }>({ left: 0 });
  const btn = useRef<HTMLButtonElement>(null);
  // right-aligned to the button, clamped to the screen (audit 14.11: at 360 px it opened off the left edge);
  // audit 19.11: phones keep a 72px tab bar at the bottom — near it the ".ics" row opened underneath the bar
  const place = (r: DOMRect) => {
    const left = Math.max(8, Math.min(r.right - 224, window.innerWidth - 232));
    const floor = window.innerHeight - (window.innerWidth < 768 ? 72 : 0);
    setPos(floor - r.bottom > 120 ? { top: r.bottom + 4, left } : { bottom: window.innerHeight - r.top + 4, left });
  };
  const toggle = () => {
    const r = btn.current?.getBoundingClientRect();
    if (r) place(r);
    setOpen((x) => !x);
  };
  const root = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const off = (e: PointerEvent) => { if (!root.current?.contains(e.target as Node)) setOpen(false); };
    const esc = (e: KeyboardEvent) => { if (e.key === "Escape") { setOpen(false); btn.current?.focus(); } };
    document.addEventListener("pointerdown", off);
    // page scroll closes the fixed menu (it would float away); tabbing inside the menu must not
    const close = () => {
      const r = btn.current?.getBoundingClientRect();
      // button scrolled away: close — unless focus is in here (audit 21.11: Tab starts a smooth scroll to the button; an
      // Enter pressed before it ends opened the menu while the button was still off screen, and the scroll closed it)
      const kbd = root.current?.contains(document.activeElement);
      if (!r || (!kbd && (r.bottom < 0 || r.top > window.innerHeight))) { setOpen(false); return; }
      place(r);
    };
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
    btn.current?.focus();
  };
  return (
    <div ref={root} className={`relative inline-block ${open ? "z-30" : ""}`} onBlur={(e) => { if (open && !root.current?.contains(e.relatedTarget as Node | null)) setOpen(false); }}>
      <button ref={btn} type="button" onClick={toggle} aria-expanded={open} aria-label={TX[lang].add} title={TX[lang].add}
        className={`grid size-10 place-items-center rounded-lg border transition ${open ? "border-lime/50 text-lime" : "border-line text-ink-3 hover:border-line-2 hover:text-ink"}`}>
        <Icon name="calendar" className="size-4" />
      </button>
      {open && (
        <div style={pos} className="fixed z-50 flex w-56 flex-col rounded-xl border border-line-2 bg-surface p-1.5 text-left shadow-2xl">
          <a href={googleCalUrl(ev)} target="_blank" rel="noopener" onClick={() => setOpen(false)} className="rounded-lg px-3 py-2.5 text-sm font-semibold hover:bg-white/5">Google Calendar</a>
          <button type="button" onClick={ics} className="rounded-lg px-3 py-2.5 text-left text-sm font-semibold hover:bg-white/5">{TX[lang].ics}</button>
        </div>
      )}
    </div>
  );
}
