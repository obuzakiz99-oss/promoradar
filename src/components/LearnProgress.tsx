"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Icon, type IconName } from "./Icon";

const SEEN = "pr:learn:seen";
const read = (k: string, d: string) => { try { return localStorage.getItem(k) ?? d; } catch { return d; } };

/** Marks a beginner page as read (used by the hub to light up the next step). */
export function LearnSeen({ id }: { id: string }) {
  useEffect(() => {
    try { const s = new Set<string>(JSON.parse(read(SEEN, "[]"))); s.add(id); localStorage.setItem(SEEN, JSON.stringify([...s])); } catch { /* blocked storage */ }
  }, [id]);
  return null;
}

export interface LearnCard { id: string; href: string; icon: IconName; title: string; sub: string }
const TX = {
  uk: { next: "Наступний крок", done: "Пройдено", open: "Відкрити", progress: (n: number, of: number) => `Пройдено ${n} з ${of}`, hint: "Почніть з першого кроку — ми підсвітимо, що робити далі.", all: "Усе пройдено — можна переходити до акцій" },
  en: { next: "Next step", done: "Done", open: "Open", progress: (n: number, of: number) => `${n} of ${of} done`, hint: "Start with the first step — we'll highlight what to do next.", all: "All done — time to pick a promo" },
  ru: { next: "Следующий шаг", done: "Пройдено", open: "Открыть", progress: (n: number, of: number) => `Пройдено ${n} из ${of}`, hint: "Начните с первого шага — мы подсветим, что делать дальше.", all: "Всё пройдено — можно переходить к акциям" },
} as const;

/**
 * Beginner hub as a path (owner 13.11: highlight what to do). "Start" counts once all its steps are ticked, the quiz once
 * it has a result, the other pages once opened; the first unfinished card is the highlighted next step.
 */
export function LearnCards({ cards, lang, startTotal, promosHref }: { cards: LearnCard[]; lang: "uk" | "en" | "ru"; startTotal: number; promosHref: string }) {
  const L = TX[lang];
  const [done, setDone] = useState<Set<string> | null>(null);
  useEffect(() => {
    const d = new Set<string>();
    try {
      const seen: string[] = JSON.parse(read(SEEN, "[]"));
      const start: number[] = JSON.parse(read("pr:steps:start", "[]"));
      if (start.length >= startTotal) d.add("start");
      if (read("pr:learn:quiz", "") === "1") d.add("quiz");
      seen.filter((x) => x !== "start" && x !== "quiz").forEach((x) => d.add(x));
    } catch { /* blocked storage */ }
    setDone(d);
  }, [startTotal]);
  const n = done ? cards.filter((c) => done.has(c.id)).length : 0;
  const next = done ? cards.find((c) => !done.has(c.id))?.id : cards[0].id;
  return (
    <>
      <div className="mt-8 flex flex-wrap items-center gap-3 text-sm font-semibold text-ink-3">
        <div className="h-2 w-48 overflow-hidden rounded-full bg-white/5"><div className="h-full rounded-full bg-lime transition-all" style={{ width: `${(n / cards.length) * 100}%` }} /></div>
        <span className="text-ink-2">{L.progress(n, cards.length)}</span>
        <span className="font-normal">· {next ? L.hint : <Link href={promosHref} className="font-bold text-lime hover:underline">{L.all} →</Link>}</span>
      </div>
      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map((c, i) => {
          const isNext = c.id === next, isDone = !!done?.has(c.id);
          return (
            <Link key={c.id} href={c.href}
              className={`card group relative flex flex-col p-6 ${isNext ? "border-lime/60 bg-lime/[0.06] shadow-[0_0_0_1px_rgba(214,255,90,0.25),0_12px_40px_-12px_rgba(214,255,90,0.35)]" : isDone ? "opacity-75" : ""}`}>
              {isNext && <span className="absolute -top-3 left-5 rounded-md bg-lime px-2 py-0.5 text-xs font-bold text-on-accent">{L.next}</span>}
              <span className="flex items-center justify-between">
                <span className={`grid size-12 place-items-center rounded-2xl ${isDone ? "bg-lime text-on-accent" : "bg-lime/10 text-lime"}`}>
                  {isDone ? <Icon name="check" className="size-6" /> : <Icon name={c.icon} className="size-6" />}
                </span>
                <span className="font-mono text-xs text-ink-3">{isDone ? `✓ ${L.done}` : `${i + 1}/${cards.length}`}</span>
              </span>
              <h2 className="mt-5 text-lg font-bold">{c.title}</h2>
              <p className="mt-2 flex-1 text-sm leading-relaxed text-ink-2">{c.sub}</p>
              <span className={`mt-5 text-sm font-bold group-hover:underline ${isNext ? "text-lime" : isDone ? "text-ink-3" : "text-lime"}`}>{L.open} →</span>
            </Link>
          );
        })}
      </div>
    </>
  );
}
