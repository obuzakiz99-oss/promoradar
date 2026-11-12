"use client";
import { useSyncExternalStore } from "react";

/**
 * Hidden promos (audit 12.11: "not for me" next to the ★): kept in localStorage per browser, like saved ones.
 * The feed leaves them out and offers "show hidden" so nothing is lost for good.
 */
const KEY = "pr:hidden";
const EVT = "pr:hidden-change";

let cache: { raw: string | null; ids: string[] } = { raw: null, ids: [] };
function snapshot(): string[] {
  let raw: string | null = null;
  try { raw = localStorage.getItem(KEY); } catch { /* blocked */ }
  if (raw !== cache.raw) { let ids: string[] = []; try { ids = JSON.parse(raw || "[]"); } catch { /* bad json */ } cache = { raw, ids }; }
  return cache.ids;
}
const EMPTY: string[] = [];
function subscribe(cb: () => void) {
  window.addEventListener(EVT, cb);
  window.addEventListener("storage", cb);
  return () => { window.removeEventListener(EVT, cb); window.removeEventListener("storage", cb); };
}
export function useHidden(): string[] {
  return useSyncExternalStore(subscribe, snapshot, () => EMPTY);
}
export function toggleHidden(id: string) {
  const ids = snapshot();
  const next = ids.includes(id) ? ids.filter((x) => x !== id) : [id, ...ids].slice(0, 500);
  try { localStorage.setItem(KEY, JSON.stringify(next)); } catch { /* blocked */ }
  window.dispatchEvent(new Event(EVT));
}
export function clearHidden() {
  try { localStorage.removeItem(KEY); } catch { /* blocked */ }
  window.dispatchEvent(new Event(EVT));
}

const TX = {
  uk: { hide: "Приховати", show: "Повернути в стрічку" },
  en: { hide: "Hide", show: "Show in the feed again" },
  ru: { hide: "Скрыть", show: "Вернуть в ленту" },
} as const;

export function HideButton({ id, lang }: { id: string; lang: "uk" | "en" | "ru" }) {
  const hidden = useHidden().includes(id);
  const label = hidden ? TX[lang].show : TX[lang].hide;
  return (
    <button
      type="button"
      onClick={(e) => { e.preventDefault(); e.stopPropagation(); toggleHidden(id); }}
      aria-pressed={hidden}
      title={label}
      aria-label={label}
      className={`relative z-10 grid size-8 place-items-center rounded-lg border transition-colors after:absolute after:-inset-1 after:content-[''] ${hidden ? "border-line-2 bg-white/10 text-ink" : "border-line bg-white/[0.02] text-ink-3 hover:border-line-2 hover:text-ink"}`}
    >
      <svg className="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        {hidden
          ? <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Zm10 3a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z" />
          : <path d="M10.7 5.1A10 10 0 0 1 12 5c6.5 0 10 7 10 7a17 17 0 0 1-2.2 3.2M6.6 6.6C3.9 8.4 2 12 2 12s3.5 7 10 7c1.9 0 3.6-.6 5-1.4M9.9 9.9a3 3 0 0 0 4.2 4.2M2 2l20 20" />}
      </svg>
    </button>
  );
}
