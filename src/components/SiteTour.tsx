"use client";
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import type { TourStep } from "@/lib/tours/types";

/**
 * "How to use the site" tours (owner 21.11, per page since 22.11): one element highlighted at a time with a short
 * explanation; nothing on the page is hidden or changed (unlike the beginner mode removed 06.11).
 *  • steps come from src/lib/tours/<page>.ts — the server page passes only its own language;
 *  • targets are `[data-tour=…]`; a step whose element is missing or invisible is skipped;
 *  • start: <TourButton> on the page (event "pr:tour"), `?tour=<anything>` in the address, or the prompt below.
 * Prompts (localStorage):
 *  `pr:tour` unset          → "First time on PromoRadar?" (yes → this page's tour; no → never ask again);
 *  `pr:tour` = done         → a newcomer: on the first visit of each other page "Explain this page?" (`pr:tour:<id>`);
 *  `pr:tour` = no / qa      → never ask (qa = automated tests).
 */
type L = "uk" | "en" | "ru";
const KEY = "pr:tour";
const TOP = 76;                                   // below the sticky 64px header
export const TOUR_EVENT = "pr:tour";

const UI: Record<L, { ask: string; askSub: string; yes: string; no: string; page: (n: string) => string; pageSub: string; later: string; never: string; next: string; back: string; done: string; skip: string; of: string }> = {
  uk: { ask: "Вперше на PromoRadar?", askSub: "Покажемо, що на цій сторінці для чого.", yes: "Так, покажіть", no: "Ні, я розберусь", page: (n) => `Пояснити сторінку «${n}»?`, pageSub: "Коротко покажемо, що тут для чого.", later: "Не зараз", never: "Більше не питати", next: "Далі", back: "Назад", done: "Зрозуміло", skip: "Пропустити", of: "з" },
  en: { ask: "First time on PromoRadar?", askSub: "A quick tour of what is where on this page.", yes: "Yes, show me", no: "No thanks", page: (n) => `Explain the “${n}” page?`, pageSub: "A quick tour of what is where here.", later: "Not now", never: "Don’t ask again", next: "Next", back: "Back", done: "Got it", skip: "Skip", of: "of" },
  ru: { ask: "Впервые на PromoRadar?", askSub: "Покажем, что на этой странице для чего.", yes: "Да, покажите", no: "Нет, разберусь", page: (n) => `Объяснить страницу «${n}»?`, pageSub: "Коротко покажем, что здесь для чего.", later: "Не сейчас", never: "Больше не спрашивать", next: "Далее", back: "Назад", done: "Понятно", skip: "Пропустить", of: "из" },
};

const visible = (el: Element) => { const r = el.getBoundingClientRect(); return r.width > 4 && r.height > 4 && getComputedStyle(el).visibility !== "hidden"; };
const find = (sel?: string) => (sel ? [...document.querySelectorAll(`[data-tour="${sel}"]`)].find(visible) ?? null : null);
const get = (k: string) => { try { return localStorage.getItem(k); } catch { return "no"; } };   // storage blocked → don't nag
const put = (k: string, v: string) => { try { localStorage.setItem(k, v); } catch { /* storage blocked */ } };

type Box = { top: number; left: number; width: number; height: number };

/** «Term — explanation» → the term in bold. */
function Point({ s }: { s: string }) {
  const k = s.indexOf(" — ");
  return <li className="relative pl-3.5 before:absolute before:left-0 before:top-[0.6em] before:size-1.5 before:rounded-full before:bg-lime/70">{k > 0 ? <><b className="font-bold text-ink">{s.slice(0, k)}</b>{s.slice(k)}</> : s}</li>;
}

export function SiteTour({ lang, id, name, steps: all }: { lang: L; id: string; name: string; steps: TourStep[] }) {
  const U = UI[lang];
  // only the steps whose element is on this page right now (a promo without a calculator, an empty table…), so that
  // «3 of 7» counts what the user will see
  const [steps, setSteps] = useState<TourStep[]>(all);
  const [ask, setAsk] = useState<"" | "new" | "page">("");
  const [i, setI] = useState(-1);                 // -1 = tour closed
  const [box, setBox] = useState<Box | null>(null);
  const [card, setCard] = useState<{ top: number; left: number } | null>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const primary = useRef<HTMLButtonElement>(null);
  const back = useRef<Element | null>(null);
  const dir = useRef(1);

  const start = useCallback(() => { back.current = document.activeElement; setSteps(all.filter((s) => !s.sel || find(s.sel))); setAsk(""); dir.current = 1; setI(0); }, [all]);

  // `?tour=…` → straight into the tour; else the prompt (see the header comment)
  useEffect(() => {
    // before 22.11 only the home page had a tour: anyone who answered then has seen it
    if (get(KEY) && !get(`${KEY}:v`)) { put(`${KEY}:home`, "done"); put(`${KEY}:v`, "2"); }
    const q = new URLSearchParams(location.search);
    let t: ReturnType<typeof setTimeout> | undefined;
    if (q.has("tour")) {
      q.delete("tour");
      history.replaceState(null, "", location.pathname + (q.size ? `?${q}` : "") + location.hash);
      t = setTimeout(start, 400);
    } else {
      const g = get(KEY);
      const mode = g === null ? "new" : g === "done" && get(`${KEY}:${id}`) === null ? "page" : "";
      if (mode) t = setTimeout(() => setAsk(mode), 1500);
    }
    const onStart = () => start();
    addEventListener(TOUR_EVENT, onStart);
    return () => { clearTimeout(t); removeEventListener(TOUR_EVENT, onStart); };
  }, [id, start]);

  const close = useCallback(() => {
    if (get(KEY) !== "no" && get(KEY) !== "qa") put(KEY, "done");
    put(`${KEY}:${id}`, "done"); put(`${KEY}:v`, "2");
    setI(-1); setBox(null); setCard(null);
    const el = back.current as HTMLElement | null;
    if (el && typeof el.focus === "function" && document.contains(el)) el.focus({ preventScroll: true });
  }, [id]);
  const go = useCallback((d: number) => { dir.current = d; setI((x) => Math.min(steps.length - 1, Math.max(0, x + d))); }, [steps.length]);

  // a step whose element is missing / hidden is skipped in the direction of travel
  useEffect(() => {
    if (i < 0) return;
    const s = steps[i];
    if (s.sel && !find(s.sel)) {
      const n = i + dir.current;
      if (n >= 0 && n < steps.length) setI(n); else if (n < 0) { dir.current = 1; setI(i + 1); }
      return;
    }
    const el = find(s.sel);
    if (el) {
      // scroll so that the element AND the card below it fit between the sticky header and the phone tab bar
      // (centring the element alone left no room for the card next to tall targets — tour test 21.11)
      const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
      const r = el.getBoundingClientRect(), vh = innerHeight, bar = innerWidth < 768 ? 72 : 0;
      const ch = cardRef.current?.offsetHeight || 300, h = r.height + 12;
      const fixed = getComputedStyle(el).position === "fixed" || !!el.closest("header");
      if (!fixed) {
        const room = vh - bar - TOP - 16;
        const off = h + 12 + ch <= room ? TOP + (room - h - 12 - ch) / 2 : TOP;
        const to = Math.max(0, scrollY + r.top - 6 - off);
        // a long way (the source line at the end of a 50-row table) jumps: a 10 000px smooth scroll took seconds
        scrollTo({ top: to, behavior: reduce || Math.abs(to - scrollY) > vh * 1.5 ? "auto" : "smooth" });
      }
    }
  }, [i, steps]);

  // keep the highlight on the element while the page scrolls / resizes
  useEffect(() => {
    if (i < 0) return;
    let raf = 0;
    const tick = () => {
      const el = find(steps[i].sel);
      if (el) {
        // the frame is clipped to the screen sideways (a wide table scrolls inside its own box)
        const r = el.getBoundingClientRect(), pad = 6, l = Math.max(4, r.left - pad), rt = Math.min(innerWidth - 4, r.right + pad);
        setBox((b) => {
          const n = { top: r.top - pad, left: l, width: Math.max(0, rt - l), height: r.height + pad * 2 };
          return b && Math.abs(b.top - n.top) < 0.5 && Math.abs(b.left - n.left) < 0.5 && Math.abs(b.width - n.width) < 0.5 && Math.abs(b.height - n.height) < 0.5 ? b : n;
        });
      } else setBox(null);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [i, steps]);

  // place the explanation card below the element, else above, else beside, else docked (phones: above the tab bar)
  useLayoutEffect(() => {
    if (i < 0) return;
    const c = cardRef.current;
    if (!c) return;
    const vw = innerWidth, vh = innerHeight, ch = c.offsetHeight, cw = c.offsetWidth, gap = 12, g = 16;
    const bottomBar = vw < 768 ? 72 : 0;
    if (!box) { setCard({ top: Math.max(g, (vh - ch) / 2), left: (vw - cw) / 2 }); return; }
    const clampTop = (t: number) => Math.max(g, Math.min(t, vh - bottomBar - g - ch));
    let left = Math.min(Math.max(g, box.left + box.width / 2 - cw / 2), vw - cw - g);
    const below = box.top + box.height + gap, above = box.top - gap - ch;
    let top: number;
    if (below + ch <= vh - bottomBar - g) top = below;
    else if (above >= g) top = above;
    else if (box.left + box.width + gap + cw <= vw - g) { left = box.left + box.width + gap; top = clampTop(box.top); }
    else if (box.left - gap - cw >= g) { left = box.left - gap - cw; top = clampTop(box.top); }
    else top = clampTop(vh - bottomBar - g - ch);
    setCard((p) => (p && Math.abs(p.top - top) < 0.5 && Math.abs(p.left - left) < 0.5 ? p : { top, left }));
  }, [i, box]);

  useEffect(() => { if (i >= 0) primary.current?.focus({ preventScroll: true }); }, [i]);

  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") { e.preventDefault(); close(); }
    else if (e.key === "ArrowRight") { e.preventDefault(); if (i < steps.length - 1) go(1); }
    else if (e.key === "ArrowLeft") { e.preventDefault(); go(-1); }
    else if (e.key === "Tab") {
      // keep focus inside the card while the tour is open
      const f = [...(cardRef.current?.querySelectorAll<HTMLElement>("button") ?? [])];
      if (!f.length) return;
      const k = f.indexOf(document.activeElement as HTMLElement);
      const n = e.shiftKey ? (k <= 0 ? f.length - 1 : k - 1) : (k === f.length - 1 ? 0 : k + 1);
      e.preventDefault(); f[n].focus();
    }
  };

  if (ask) return (
    <div role="dialog" aria-labelledby="tour-ask" className="fixed inset-x-3 bottom-20 z-50 mx-auto max-w-md animate-fade-up rounded-2xl border border-lime/30 bg-surface/95 p-4 shadow-2xl backdrop-blur-xl md:bottom-5 sm:p-5">
      <p id="tour-ask" className="font-bold text-ink">{ask === "new" ? U.ask : U.page(name)}</p>
      <p className="mt-1 text-sm text-ink-2">{ask === "new" ? U.askSub : U.pageSub}</p>
      <div className="mt-3 flex flex-wrap gap-2">
        <button type="button" onClick={start} className="btn btn-primary h-11 px-5 text-sm">{U.yes}</button>
        {ask === "new"
          ? <button type="button" onClick={() => { put(KEY, "no"); put(`${KEY}:v`, "2"); setAsk(""); }} className="btn btn-ghost h-11 px-4 text-sm">{U.no}</button>
          : <>
              <button type="button" onClick={() => { put(`${KEY}:${id}`, "no"); setAsk(""); }} className="btn btn-ghost h-11 px-4 text-sm">{U.later}</button>
              <button type="button" onClick={() => { put(KEY, "no"); setAsk(""); }} className="inline-flex h-11 items-center px-2 text-sm font-semibold text-ink-3 hover:text-ink">{U.never}</button>
            </>}
      </div>
    </div>
  );
  if (i < 0 || !steps.length) return null;

  const s = steps[i], last = i === steps.length - 1;
  return (
    <div className="fixed inset-0 z-[70]" onKeyDown={onKey}>
      {/* the page stays visible but not clickable; the highlight is a hole cut by a huge shadow, its frame an outline
          (a Tailwind ring is a box-shadow too and was overridden by the dimming shadow) */}
      <div className="absolute inset-0" onClick={close} aria-hidden="true" style={box ? undefined : { background: "rgb(3 5 8 / 0.72)" }} />
      {box && (
        <div aria-hidden="true" className="tour-spot pointer-events-none fixed rounded-2xl outline outline-2 outline-lime transition-all duration-200"
          style={{ top: box.top, left: box.left, width: box.width, height: box.height, boxShadow: "0 0 0 9999px rgb(3 5 8 / 0.72)" }} />
      )}
      <div ref={cardRef} role="dialog" aria-modal="true" aria-labelledby="tour-t" aria-describedby="tour-x"
        className="fixed flex max-h-[calc(100dvh-7rem)] w-[min(25rem,calc(100vw-2rem))] flex-col rounded-2xl border border-lime/40 bg-surface p-5 shadow-2xl md:max-h-[calc(100dvh-2rem)]"
        style={card ? { top: card.top, left: card.left } : { top: -9999, left: 0 }}>
        <div className="flex items-center justify-between gap-3 text-xs font-bold text-ink-3">
          <span>{i + 1} {U.of} {steps.length}</span>
          {!last && <button type="button" onClick={close} className="inline-flex min-h-6 items-center hover:text-ink">{U.skip}</button>}
        </div>
        <h2 id="tour-t" className="mt-2 text-lg font-bold text-ink">{s.title}</h2>
        <div id="tour-x" className="mt-1.5 min-h-0 overflow-y-auto text-sm leading-relaxed text-ink-2">
          <p>{s.text}</p>
          {s.points?.length ? <ul className="mt-2 space-y-1.5">{s.points.map((x) => <Point key={x} s={x} />)}</ul> : null}
        </div>
        <div className="mt-4 flex shrink-0 items-center justify-between gap-2">
          {i > 0 ? <button type="button" onClick={() => go(-1)} className="btn btn-ghost h-10 px-4 text-sm">{U.back}</button> : <span />}
          <button ref={primary} type="button" onClick={() => (last ? close() : go(1))} className="btn btn-primary h-10 px-5 text-sm">{last ? U.done : U.next}</button>
        </div>
      </div>
    </div>
  );
}

const BTN: Record<L, string> = { uk: "Як користуватися сторінкою", en: "How to use this page", ru: "Как пользоваться страницей" };

/** The "how to use this page" button: starts the page's <SiteTour>. */
export function TourButton({ lang, className = "" }: { lang: L; className?: string }) {
  return (
    <button type="button" onClick={() => dispatchEvent(new Event(TOUR_EVENT))}
      className={`inline-flex min-h-11 items-center gap-2 text-sm font-bold text-ink-2 hover:text-ink md:min-h-8 ${className}`}>
      <span aria-hidden="true" className="grid size-5 place-items-center rounded-full border border-line-2 text-xs text-lime">?</span>
      {BTN[lang]}
    </button>
  );
}
