import type { ReactNode } from "react";

/**
 * The one badge (audit 08.11, round 3): soft (tinted fill) or outline × semantic tone. Caption size, sentence case,
 * no emoji — every local badge variant goes through this.
 */
export type Tone = "neutral" | "accent" | "success" | "warning" | "danger" | "info";
const SOFT: Record<Tone, string> = {
  neutral: "bg-white/[0.06] text-ink-2", accent: "bg-lime/15 text-lime", success: "bg-teal/15 text-teal",
  warning: "bg-amber/15 text-amber", danger: "bg-rose/15 text-rose", info: "bg-sky/15 text-sky",
};
const OUTLINE: Record<Tone, string> = {
  neutral: "border-line-2 text-ink-2", accent: "border-lime/40 text-lime", success: "border-teal/40 text-teal",
  warning: "border-amber/40 text-amber", danger: "border-rose/40 text-rose", info: "border-sky/40 text-sky",
};

export function Badge({ tone = "neutral", variant = "soft", title, className = "", children }: { tone?: Tone; variant?: "soft" | "outline"; title?: string; className?: string; children: ReactNode }) {
  return (
    <span title={title} className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-semibold leading-5 ${variant === "soft" ? SOFT[tone] : `border ${OUTLINE[tone]}`} ${className}`}>
      {children}
    </span>
  );
}
