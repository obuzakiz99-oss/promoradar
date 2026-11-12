"use client";
import { setNovice } from "./NoviceToggle";

/** Thin strip under the header, visible only in novice mode (.nov). */
export function NoviceBanner({ text, link, linkLabel, off }: { text: string; link: string; linkLabel: string; off: string }) {
  return (
    <div className="nov border-b border-lime/20 bg-lime/[0.06]">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-x-4 gap-y-1.5 px-4 py-2.5 text-xs font-semibold text-ink-2 sm:px-6 sm:text-sm">
        <span className="min-w-0 flex-1">{text}</span>
        <a href={link} className="font-bold text-lime hover:underline">{linkLabel}</a>
        <button type="button" onClick={() => setNovice(false)} className="text-ink-3 hover:text-ink">{off}</button>
      </div>
    </div>
  );
}
