import Link from "next/link";
import type { Dict, Locale } from "@/lib/i18n";

/** Switcher between the three APR Radar sections. */
export function AprTabs({ t, lang, active }: { t: Dict; lang: Locale; active: "lp" | "earn" | "dex" }) {
  const tabs = [
    { id: "lp", href: `/${lang}/launchpools`, label: t.aprHub.tabLp, icon: "🚀" },
    { id: "earn", href: `/${lang}/earn`, label: t.aprHub.tabEarn, icon: "🏦" },
    { id: "dex", href: `/${lang}/dex`, label: t.aprHub.tabDex, icon: "🦄" },
  ] as const;
  return (
    <nav className="scroll-x flex gap-1 rounded-2xl border border-line bg-white/[0.02] p-1 sm:w-fit" aria-label="APR Radar">
      {tabs.map((x) => (
        <Link
          key={x.id}
          href={x.href}
          aria-current={active === x.id ? "page" : undefined}
          className={`flex h-11 shrink-0 items-center gap-2 rounded-xl px-4 text-sm font-bold transition-colors ${active === x.id ? "bg-lime text-[#0b0f05]" : "text-ink-2 hover:bg-white/5 hover:text-ink"}`}
        >
          <span aria-hidden="true">{x.icon}</span>{x.label}
        </Link>
      ))}
    </nav>
  );
}
