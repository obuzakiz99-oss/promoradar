"use client";
import { useEffect, useState } from "react";
import { setNovice } from "./NoviceToggle";

/** One-time bottom prompt for first-time visitors: offer beginner mode. Never shown again after any answer. */
export function FirstVisit({ text, yes, no }: { text: string; yes: string; no: string }) {
  const [show, setShow] = useState(false);
  useEffect(() => {
    let seen = true;
    try { seen = localStorage.getItem("pr:novice") !== null || localStorage.getItem("pr:asked") !== null; } catch { /* storage blocked → don't nag */ }
    if (seen) return;
    const t = setTimeout(() => setShow(true), 1500);
    return () => clearTimeout(t);
  }, []);
  const answer = (on: boolean) => {
    try { localStorage.setItem("pr:asked", "1"); } catch { /* ignore */ }
    setNovice(on);
    setShow(false);
  };
  if (!show) return null;
  return (
    <div role="dialog" aria-live="polite" className="fixed inset-x-3 bottom-3 z-50 mx-auto max-w-xl animate-fade-up rounded-2xl border border-lime/30 bg-surface/95 p-4 shadow-2xl backdrop-blur-xl sm:bottom-5 sm:p-5">
      <p className="text-sm font-semibold leading-relaxed text-ink">{text}</p>
      <div className="mt-3 flex gap-2">
        <button type="button" onClick={() => answer(true)} className="btn btn-primary h-10 px-5 text-sm">{yes}</button>
        <button type="button" onClick={() => answer(false)} className="btn btn-ghost h-10 px-4 text-sm">{no}</button>
      </div>
    </div>
  );
}
