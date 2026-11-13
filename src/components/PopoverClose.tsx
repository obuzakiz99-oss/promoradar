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
    const key = (e: KeyboardEvent) => { if (e.key === "Escape") open().forEach((d) => { d.open = false; }); };
    const toggle = (e: Event) => { const d = e.target as HTMLDetailsElement; if (d.matches?.("details[data-pop]") && d.open) open().forEach((x) => { if (x !== d && !x.contains(d)) x.open = false; }); };
    document.addEventListener("pointerdown", down);
    document.addEventListener("keydown", key);
    document.addEventListener("toggle", toggle, true);
    return () => { document.removeEventListener("pointerdown", down); document.removeEventListener("keydown", key); document.removeEventListener("toggle", toggle, true); };
  }, []);
  return null;
}
