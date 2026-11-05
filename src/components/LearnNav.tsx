import Link from "next/link";
import type { Locale } from "@/lib/i18n";
import { LEARN } from "@/lib/i18n-learn";

export const LEARN_IDS = ["start", "how", "safety", "quiz", "glossary"] as const;
export type LearnId = (typeof LEARN_IDS)[number];
export const LEARN_ICON: Record<LearnId, string> = { start: "🌱", how: "🧭", safety: "🛡️", quiz: "🎯", glossary: "📖" };

/** Title block + chips to the other beginner pages. */
export function LearnHeader({ lang, active, title, sub }: { lang: Locale; active: LearnId; title: string; sub: string }) {
  const L = LEARN[lang];
  return (
    <>
      <Link href={`/${lang}/learn`} className="text-sm font-bold text-ink-3 hover:text-ink">{L.back}</Link>
      <h1 className="mt-4 font-display text-3xl font-semibold tracking-tight sm:text-5xl">{LEARN_ICON[active]} {title}</h1>
      <p className="mt-3 max-w-2xl text-ink-2 sm:text-lg">{sub}</p>
      <nav className="scroll-x mt-6 flex gap-1.5" aria-label={L.nav}>
        {LEARN_IDS.map((id) => (
          <Link key={id} href={`/${lang}/learn/${id}`} aria-current={id === active ? "page" : undefined}
            className={`flex h-9 shrink-0 items-center gap-1.5 rounded-full border px-3.5 text-xs font-bold ${id === active ? "border-lime/50 bg-lime/15 text-lime" : "border-line bg-white/[0.02] text-ink-2 hover:text-ink"}`}>
            <span aria-hidden="true">{LEARN_ICON[id]}</span>{L.cards[id][0]}
          </Link>
        ))}
      </nav>
    </>
  );
}

/** Numbered step list. */
export function Steps({ steps }: { steps: Array<[string, string]> }) {
  return (
    <ol className="space-y-3">
      {steps.map(([h, b], i) => (
        <li key={h} className="card flex gap-4 p-5 hover:transform-none">
          <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-lime/10 font-mono text-sm font-bold text-lime">{i + 1}</span>
          <div>
            <h3 className="font-bold">{h}</h3>
            <p className="mt-1 text-sm leading-relaxed text-ink-2">{b}</p>
          </div>
        </li>
      ))}
    </ol>
  );
}
