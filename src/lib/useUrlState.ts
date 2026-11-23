"use client";
import { useEffect, useRef } from "react";

/**
 * Keep a board's filters in the URL (audit 23.11: DEX / Earn filters could not be shared or bookmarked).
 * `vals` are the current values as strings; `apply` receives the values read from the URL once, on load.
 * A value equal to its default is left out of the URL.
 */
export function useUrlState(vals: Record<string, string>, defaults: Record<string, string>, apply: (from: Record<string, string>) => void) {
  const ready = useRef(false);
  useEffect(() => {
    try {
      const u = new URLSearchParams(location.search);
      const got = Object.fromEntries(Object.keys(defaults).filter((k) => u.has(k)).map((k) => [k, u.get(k)!.slice(0, 80)]));
      if (Object.keys(got).length) apply(got);
    } catch { /* no URL */ }
    ready.current = true;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const sig = JSON.stringify(vals);
  useEffect(() => {
    if (!ready.current) return;
    const u = new URLSearchParams(location.search);
    for (const [k, v] of Object.entries(vals)) { if (v && v !== defaults[k]) u.set(k, v); else u.delete(k); }
    const qs = u.toString();
    history.replaceState(history.state, "", `${location.pathname}${qs ? `?${qs}` : ""}${location.hash}`);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sig]);
}
