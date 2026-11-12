"use client";
import { useState, type ReactNode } from "react";
import { Icon, type IconName } from "./Icon";

export interface TileData { icon: IconName; label: string; value: ReactNode; tone?: string; body?: ReactNode }

const MORE = { uk: ["Деталі", "Згорнути"], en: ["Details", "Hide"], ru: ["Детали", "Свернуть"] } as const;

/**
 * Promo summary: four tiles (reward · what to do · time · who), 2–4 words each. One click opens the details of all
 * four at once so the row stays even (audit 12.11: opening one tile left the others empty and stretched).
 */
export function SummaryTiles({ tiles, lang }: { tiles: TileData[]; lang: "uk" | "en" | "ru" }) {
  const [open, setOpen] = useState(false);
  const any = tiles.some((t) => t.body);
  return (
    <div className="mt-8">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {tiles.map((t) => (
          <div key={t.label} className="card flex flex-col p-4 hover:transform-none">
            <button type="button" disabled={!any} onClick={() => setOpen((x) => !x)} aria-expanded={open}
              className="flex items-start gap-3 text-left disabled:opacity-100">
              <span className={`grid size-10 shrink-0 place-items-center rounded-xl bg-white/[0.05] ${t.tone ?? "text-ink"}`}><Icon name={t.icon} className="size-5" /></span>
              <span className="min-w-0 flex-1">
                <span className="block text-xs font-semibold text-ink-3">{t.label}</span>
                <span className={`block font-semibold leading-snug [overflow-wrap:anywhere] ${t.tone ?? "text-ink"}`}>{t.value}</span>
              </span>
            </button>
            {open && t.body ? <div className="mt-3 border-t border-line pt-3 text-xs leading-relaxed text-ink-2 [overflow-wrap:anywhere]">{t.body}</div> : null}
          </div>
        ))}
      </div>
      {any && (
        <button type="button" onClick={() => setOpen((x) => !x)} aria-expanded={open}
          className="mt-2 inline-flex min-h-8 items-center gap-1 rounded-lg px-2 text-xs font-semibold text-ink-3 hover:bg-white/5 hover:text-ink">
          {MORE[lang][open ? 1 : 0]} <span aria-hidden="true" className={`transition-transform ${open ? "rotate-180" : ""}`}>▾</span>
        </button>
      )}
    </div>
  );
}
