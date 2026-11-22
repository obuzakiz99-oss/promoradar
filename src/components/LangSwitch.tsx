"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LOCALES, type Locale } from "@/lib/i18n";

const LABEL: Record<Locale, string> = { uk: "UA", en: "EN", ru: "RU" };

export function LangSwitch({ current }: { current: Locale }) {
  const path = usePathname() || "/";
  const rest = path.replace(/^\/(uk|en|ru)(?=\/|$)/, "");
  return (
    <div className="flex items-center rounded-full border border-line bg-white/[0.02] p-0.5 text-xs font-bold" role="group" aria-label="Мова / Language">
      {LOCALES.map((l) => (
        <Link
          key={l}
          href={`/${l}${rest}`}
          onClick={(e) => {
            try { localStorage.setItem("pr:lang", l); } catch {}
            // keep filters / anchors (audit 14.11: switching language dropped the home filters)
            if (location.search || location.hash) { e.preventDefault(); location.assign(`${e.currentTarget.href.split(/[?#]/)[0]}${location.search}${location.hash}`); }
          }}
          aria-current={l === current ? "true" : undefined}
          className={`inline-flex min-h-10 min-w-10 justify-center items-center rounded-full px-2.5 py-1.5 transition-colors ${l === current ? "bg-white/10 text-ink" : "text-ink-3 hover:text-ink"}`}
        >
          {LABEL[l]}
        </Link>
      ))}
    </div>
  );
}
