import type { Locale } from "@/lib/i18n";
import { GLOSSARY, type TermKey } from "@/lib/glossary";

/**
 * A word with a plain-language explanation on hover / tap / keyboard focus (pure CSS, works on the server).
 * `children` overrides the visible text (defaults to the glossary term).
 */
export function Term({ k, lang, children, align = "left" }: { k: TermKey; lang: Locale; children?: React.ReactNode; align?: "left" | "right" }) {
  const [name, def] = GLOSSARY[lang][k] ?? GLOSSARY.en[k];
  return (
    <span tabIndex={0} className="term group relative inline-block rounded-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-lime/60">
      {children ?? name}
      <span role="tooltip"
        className={`invisible absolute top-full z-50 mt-1.5 w-64 whitespace-normal before:absolute before:-top-2 before:inset-x-0 before:h-2 before:content-[''] max-w-[75vw] rounded-xl border border-line-2 bg-surface px-3 py-2.5 text-left text-xs font-medium normal-case leading-relaxed tracking-normal text-ink-2 opacity-0 shadow-xl transition group-hover:visible group-hover:opacity-100 group-focus:visible group-focus:opacity-100 group-data-[off]:invisible group-data-[off]:opacity-0 ${align === "right" ? "right-0" : "left-0"}`}>
        <b className="text-ink">{name}</b> — {def}
      </span>
    </span>
  );
}
