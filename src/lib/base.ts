/**
 * URL prefix when the site is served from a sub-path (GitHub Pages: /promoradar).
 * next/link adds it automatically; plain <a href> and static asset paths must use `withBase()`.
 */
export const BASE = process.env.NEXT_PUBLIC_BASE_PATH || "";
export const withBase = (path: string) => `${BASE}${path}`;
/** True when built as a static export (GitHub Pages): no server routes at runtime. */
export const STATIC = process.env.NEXT_PUBLIC_STATIC === "1";
