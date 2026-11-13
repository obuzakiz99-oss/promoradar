import type { ReactNode } from "react";

const LABEL = { uk: "Пояснення", en: "Explanation", ru: "Пояснение" } as const;

/**
 * A small "?" that opens the explanation (audit 12.11: explanations go behind a hint, the page keeps one line).
 * <details>-based, so it works in server components and without JS; the panel floats over the content.
 */
export function Hint({ children, lang = "uk", align = "left" }: { children: ReactNode; lang?: "uk" | "en" | "ru"; align?: "left" | "right" }) {
  return (
    <details className="group relative inline-block align-middle">
      <summary aria-label={LABEL[lang]} title={LABEL[lang]}
        className="grid size-6 cursor-pointer relative before:absolute before:-inset-2 before:content-[''] list-none place-items-center rounded-full border border-line bg-white/[0.03] font-sans text-xs font-bold text-ink-3 hover:border-line-2 hover:text-ink group-open:border-lime/50 group-open:text-lime [&::-webkit-details-marker]:hidden">?</summary>
      <div className={`absolute top-8 z-40 w-72 max-w-[85vw] max-sm:fixed max-sm:inset-x-4 max-sm:bottom-20 max-sm:top-auto max-sm:w-auto max-sm:max-w-none rounded-xl border border-line-2 bg-surface p-3 text-left font-sans text-xs font-normal normal-case leading-relaxed tracking-normal text-ink-2 shadow-2xl ${align === "right" ? "right-0" : "left-0"}`}>
        {children}
      </div>
    </details>
  );
}
