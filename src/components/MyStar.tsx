"use client";
import { useSaved } from "./SaveButton";

/** ★ in the header: my saved promos (/my) with a counter — replaces the "Saved" tab of the list (audit 08.11). */
export function MyStar({ href, label }: { href: string; label: string }) {
  const n = useSaved().length;
  return (
    <a href={href} title={label} aria-label={label}
      className="relative grid size-9 place-items-center rounded-xl border border-line bg-white/[0.03] text-base text-amber hover:border-line-2">
      ★
      {n > 0 && <span className="absolute -right-1.5 -top-1.5 grid min-w-5 place-items-center rounded-full bg-amber px-1 font-mono text-xs font-bold text-[#151005]">{n}</span>}
    </a>
  );
}
