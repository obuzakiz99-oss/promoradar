"use client";
import { useEffect } from "react";

/**
 * <details data-pop> are floating menus (venues, calendar, "?" hints). The browser only closes them on a second click
 * of the summary; owner 13.11: a click anywhere outside, or Esc, closes every open one, and opening one closes the others.
 */
export function PopoverClose() {
  useEffect(() => {
    const open = () => [...document.querySelectorAll<HTMLDetailsElement>("details[data-pop][open]")];
    const down = (e: PointerEvent) => { const t = e.target as Node; open().forEach((d) => { if (!d.contains(t)) d.open = false; }); };
    // Esc also hides a glossary tooltip (WCAG 1.4.13); it shows again on the next hover / focus
    const key = (e: KeyboardEvent) => { if (e.key === "Escape") { open().forEach((d) => { const inside = d.contains(document.activeElement); d.open = false; if (inside) d.querySelector<HTMLElement>("summary")?.focus(); }); document.querySelectorAll<HTMLElement>(".term").forEach((t) => t.setAttribute("data-off", "")); } };
    const on = (e: Event) => { const t = (e.target as HTMLElement)?.closest?.(".term"); if (t) t.removeAttribute("data-off"); };
    document.addEventListener("pointerover", on);
    document.addEventListener("focusin", on);
    const toggle = (e: Event) => { const d = e.target as HTMLDetailsElement; if (d.matches?.("details[data-pop]") && d.open) open().forEach((x) => { if (x !== d && !x.contains(d)) x.open = false; }); };
    document.addEventListener("pointerdown", down);
    document.addEventListener("keydown", key);
    document.addEventListener("toggle", toggle, true);
    return () => { document.removeEventListener("pointerdown", down); document.removeEventListener("keydown", key); document.removeEventListener("toggle", toggle, true); document.removeEventListener("pointerover", on); document.removeEventListener("focusin", on); };
  }, []);
  return null;
}
