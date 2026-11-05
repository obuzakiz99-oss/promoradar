"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LOCALES, type Locale } from "@/lib/i18n";

const LABEL: Record<Locale, string> = { uk: "UA", en: "EN", ru: "RU" };

export function LangSwitch({ current }: { current: Locale }) {
  const path = usePathname() || "/";
  const rest = path.replace(/^\/(uk|en|ru)(?=\/|$)/, "");
  return (
    <div className="flex items-center rounded-full border border-line bg-white/[0.02] p-0.5 text-xs font-bold" role="group" aria-label="Language">
      {LOCALES.map((l) => (
        <Link
          key={l}
          href={`/${l}${rest}`}
          onClick={() => { try { localStorage.setItem("pr:lang", l); } catch {} }}
          aria-current={l === current ? "true" : undefined}
          className={`rounded-full px-2.5 py-1.5 transition-colors ${l === current ? "bg-white/10 text-ink" : "text-ink-3 hover:text-ink"}`}
        >
          {LABEL[l]}
        </Link>
      ))}
    </div>
  );
}
