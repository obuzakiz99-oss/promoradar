import type { ReactNode } from "react";
import { Updated } from "./Updated";
import { Hint } from "./Hint";
import type { Locale } from "@/lib/i18n";

/** One page header for every page (audit 08.11): tabs/back link · H1 · description · "updated …". */
export function PageHeader({ title, sub, nav, updated, lang }: { title: ReactNode; sub?: ReactNode; nav?: ReactNode; updated?: number; lang: Locale }) {
  return (
    <header>
      {nav}
      <h1 className={`${nav ? "mt-8" : ""} font-display text-[1.9rem] font-semibold leading-tight tracking-tight sm:text-5xl`}>{title}</h1>
      {sub && (typeof sub === "string" && sub.length > 90 && /[.!?]\s/.test(sub)
        // long intros (audit 12.11): the first sentence stays, the rest is behind a "?"
        ? <p className="mt-3 flex max-w-2xl flex-wrap items-center gap-2 text-ink-2 sm:text-lg">{sub.slice(0, sub.search(/[.!?]\s/) + 1)} <Hint lang={lang}>{sub}</Hint></p>
        : <p className="mt-3 max-w-2xl text-ink-2 sm:text-lg">{sub}</p>)}
      {updated ? <div className="mt-4"><Updated at={updated} lang={lang} /></div> : null}
    </header>
  );
}
