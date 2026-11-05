"use client";
import { useSyncExternalStore } from "react";

/** Saved promos live in localStorage (per browser). Tabs/components stay in sync via a custom event. */
const KEY = "pr:saved";
const EVT = "pr:saved-change";

function read(): string[] {
  try { return JSON.parse(localStorage.getItem(KEY) || "[]"); } catch { return []; }
}
let cache: { raw: string | null; ids: string[] } = { raw: null, ids: [] };
function snapshot(): string[] {
  let raw: string | null = null;
  try { raw = localStorage.getItem(KEY); } catch {}
  if (raw !== cache.raw) cache = { raw, ids: read() };
  return cache.ids;
}
const EMPTY: string[] = [];
function subscribe(cb: () => void) {
  window.addEventListener(EVT, cb);
  window.addEventListener("storage", cb);
  return () => { window.removeEventListener(EVT, cb); window.removeEventListener("storage", cb); };
}

export function useSaved(): string[] {
  return useSyncExternalStore(subscribe, snapshot, () => EMPTY);
}

export function toggleSaved(id: string) {
  const ids = read();
  const next = ids.includes(id) ? ids.filter((x) => x !== id) : [id, ...ids].slice(0, 300);
  try { localStorage.setItem(KEY, JSON.stringify(next)); } catch {}
  window.dispatchEvent(new Event(EVT));
}

export function SaveButton({ id, labelAdd, labelRemove, size = "sm" }: { id: string; labelAdd: string; labelRemove: string; size?: "sm" | "lg" }) {
  const saved = useSaved().includes(id);
  return (
    <button
      type="button"
      onClick={(e) => { e.preventDefault(); e.stopPropagation(); toggleSaved(id); }}
      aria-pressed={saved}
      title={saved ? labelRemove : labelAdd}
      aria-label={saved ? labelRemove : labelAdd}
      className={`relative z-10 grid place-items-center rounded-lg border transition-colors ${size === "lg" ? "size-12" : "size-8"} ${saved ? "border-amber/50 bg-amber/15 text-amber" : "border-line bg-white/[0.02] text-ink-3 hover:border-line-2 hover:text-ink"}`}
    >
      <svg className={size === "lg" ? "size-5" : "size-4"} viewBox="0 0 20 20" fill={saved ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
        <path strokeLinejoin="round" d="m10 2.6 2.2 4.6 5 .7-3.6 3.5.9 5-4.5-2.4-4.5 2.4.9-5L2.8 7.9l5-.7L10 2.6Z" />
      </svg>
    </button>
  );
}
