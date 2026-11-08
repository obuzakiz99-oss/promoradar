import Link from "next/link";
import { Updated } from "./Updated";
import type { Locale } from "@/lib/i18n";
import { TOOLS } from "@/lib/i18n-tools";

export const TOOL_IDS = ["best", "calendar", "my", "hedge", "bonuses", "history", "check"] as const;
export type ToolId = (typeof TOOL_IDS)[number];
export const TOOL_ICON: Record<ToolId, string> = { best: "🎯", calendar: "📅", my: "⭐", hedge: "🛡", bonuses: "🎁", history: "📈", check: "🔍" };

/** Horizontal switcher between tool pages. */
export function ToolsNav({ lang, active }: { lang: Locale; active?: ToolId }) {
  const T = TOOLS[lang];
  return (
    <nav className="scroll-x flex gap-1 rounded-2xl border border-line bg-white/[0.02] p-1 sm:w-fit" aria-label={T.nav}>
      {TOOL_IDS.map((id) => (
        <Link
          key={id}
          href={`/${lang}/${id}`}
          aria-current={active === id ? "page" : undefined}
          className={`flex h-10 shrink-0 items-center gap-2 rounded-xl px-3.5 text-sm font-bold transition-colors ${active === id ? "bg-lime text-on-accent" : "text-ink-2 hover:bg-white/5 hover:text-ink"}`}
        >
          <span aria-hidden="true">{TOOL_ICON[id]}</span>{T.tools[id][0]}
        </Link>
      ))}
    </nav>
  );
}

/** Page header used by every tool page. */
export function ToolHeader({ lang, active, title, sub, updated }: { lang: Locale; active: ToolId; title: string; sub: string; updated?: number }) {
  return (
    <header>
      <ToolsNav lang={lang} active={active} />
      <h1 className="mt-8 font-display text-3xl font-semibold tracking-tight sm:text-5xl">{title}</h1>
      <p className="mt-3 max-w-2xl text-ink-2 sm:text-lg">{sub}</p>
      {updated ? <div className="mt-4"><Updated at={updated} lang={lang} /></div> : null}
    </header>
  );
}
