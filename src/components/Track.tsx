"use client";
import { useEffect } from "react";

/**
 * What visitors DO on the site (owner 27.11: "немає трекінгу як користуються"), counted as GoatCounter events — no cookies,
 * no ids, nothing personal; the owner sees totals per event on promoradar.goatcounter.com:
 *  out/<host>               — a click to an exchange / outside site ("Взяти участь", Telegram …)
 *  click/<section>/<label>  — buttons, tabs, filter chips, FAQ items (numbers stripped: "Бонуси 13" → "Бонуси")
 *  search/<section>/<text>  — what people look for in the site's search boxes (short, letters and digits only)
 *  calc/<section>           — someone typed an amount into a calculator (once per page view)
 *  stay/<section>           — the page stayed open and visible 30 s (views minus these ≈ who left at once)
 */
type GC = { count: (o: { path: string; title?: string; event: boolean }) => void };

export function Track() {
  useEffect(() => {
    const gc = () => (window as unknown as { goatcounter?: GC }).goatcounter;
    const section = () => location.pathname.split("/").filter(Boolean)[1] ?? "home";
    const recent = new Map<string, number>();
    const send = (path: string, title?: string) => {
      const now = Date.now();
      if ((recent.get(path) ?? 0) > now - 2000) return;   // double clicks / re-renders count once
      recent.set(path, now);
      try { gc()?.count({ path: path.slice(0, 120), title: title?.slice(0, 80), event: true }); } catch { /* counter blocked — fine */ }
    };
    const clean = (s: string) => s.replace(/\s+/g, " ").replace(/[\d.,%$+−-]+/g, " ").replace(/\s+/g, " ").trim().slice(0, 40);

    const onClick = (e: MouseEvent) => {
      const t = e.target as Element | null;
      if (!t?.closest) return;
      const a = t.closest("a[href]") as HTMLAnchorElement | null;
      if (a) {
        try {
          const u = new URL(a.href, location.href);
          if (/^https?:$/.test(u.protocol) && u.host !== location.host) send(`out/${u.host.replace(/^www\./, "")}`, `${section()}: ${clean(a.textContent ?? "")}`);
        } catch { /* bad href */ }
        return;
      }
      const b = t.closest("button, [role=tab], [role=option], summary") as HTMLElement | null;
      if (!b) return;
      const label = clean(b.getAttribute("aria-label") || b.textContent || "");
      if (/\p{L}/u.test(label)) send(`click/${section()}/${label}`);
    };
    const calcSeen = new Set<string>();
    const onChange = (e: Event) => {
      const i = e.target as HTMLInputElement | null;
      if (!i || i.tagName !== "INPUT") return;
      if (i.type === "number") {
        const s = section();
        if (!calcSeen.has(s)) { calcSeen.add(s); send(`calc/${s}`); }
        return;
      }
      if (i.type === "search" || /пошук|поиск|search/i.test(i.placeholder || "")) {
        const q = i.value.toLowerCase().replace(/[^\p{L}\d ]+/gu, " ").replace(/\s+/g, " ").trim().slice(0, 30);
        if (q.length >= 2) send(`search/${section()}/${q}`);
      }
    };
    // "stay/<section>": the visitor kept the page open and visible for 30 s — page views minus these = who left at once
    let seen = 0, last = Date.now(), done = false, page = location.pathname;
    const tick = () => {
      if (location.pathname !== page) { page = location.pathname; seen = 0; done = false; last = Date.now(); return; }   // in-site navigation = a new page view
      if (done) return;
      if (document.visibilityState === "visible") seen += Date.now() - last;
      last = Date.now();
      if (seen >= 30_000) { done = true; send(`stay/${section()}`); }
    };
    const timer = window.setInterval(tick, 5000);
    const onVis = () => { tick(); last = Date.now(); };
    document.addEventListener("visibilitychange", onVis);
    document.addEventListener("click", onClick, true);
    document.addEventListener("change", onChange, true);
    return () => { window.clearInterval(timer); document.removeEventListener("visibilitychange", onVis); document.removeEventListener("click", onClick, true); document.removeEventListener("change", onChange, true); };
  }, []);
  return null;
}
