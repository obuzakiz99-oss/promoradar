import Link from "next/link";
import type { Dict, Locale } from "@/lib/i18n";
import { Updated } from "./Updated";

export type AprTab = "lp" | "earn" | "dex" | "funding" | "fixed";
const EXTRA: Record<Locale, { funding: string; fixed: string }> = {
  uk: { funding: "Фандинг", fixed: "Фікс. дохідність" },
  en: { funding: "Funding", fixed: "Fixed yield" },
  ru: { funding: "Фандинг", fixed: "Фикс. доходность" },
};

/** Switcher between the APR Radar sections (+ data freshness). Advanced tabs are hidden in beginner mode. */
export function AprTabs({ t, lang, active, updated }: { t: Dict; lang: Locale; active: AprTab; updated?: number }) {
  const tabs: Array<{ id: AprTab; href: string; label: string; icon: string; adv?: boolean }> = [
    { id: "lp", href: `/${lang}/launchpools`, label: t.aprHub.tabLp, icon: "🚀" },
    { id: "earn", href: `/${lang}/earn`, label: t.aprHub.tabEarn, icon: "🏦" },
    { id: "dex", href: `/${lang}/dex`, label: t.aprHub.tabDex, icon: "🦄", adv: true },
  ];
  return (
    <div className="flex flex-wrap items-center gap-3">
      <nav className="scroll-x flex max-w-full gap-1 rounded-2xl border border-line bg-white/[0.02] p-1 sm:w-fit" aria-label="APR Radar">
        {tabs.map((x) => (
          <Link
            key={x.id}
            href={x.href}
            aria-current={active === x.id ? "page" : undefined}
            className={`${x.adv && active !== x.id ? "adv " : ""}flex h-11 shrink-0 items-center gap-2 rounded-xl px-4 text-sm font-bold transition-colors ${active === x.id ? "bg-lime text-on-accent" : "text-ink-2 hover:bg-white/5 hover:text-ink"}`}
          >
            <span aria-hidden="true">{x.icon}</span>{x.label}
          </Link>
        ))}
      </nav>
      {updated ? <Updated at={updated} lang={lang} /> : null}
    </div>
  );
}
