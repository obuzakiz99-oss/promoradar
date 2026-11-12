import Link from "next/link";
import type { Locale } from "@/lib/i18n";
import { Updated } from "./Updated";
import { Icon, type IconName } from "./Icon";

export type TraderTab = "fixed" | "insights" | "unlocks";
export const TRADER_NAV: Record<Locale, string> = { uk: "Трейдерам", en: "Traders", ru: "Трейдерам" };
const L: Record<Locale, Record<TraderTab, string>> = {
  uk: { fixed: "Фікс. дохідність", insights: "Аналітика Launchpool", unlocks: "Розлоки токенів" },
  en: { fixed: "Fixed yield", insights: "Launchpool insights", unlocks: "Token unlocks" },
  ru: { fixed: "Фикс. доходность", insights: "Аналитика Launchpool", unlocks: "Разлоки токенов" },
};
const ICON: Record<TraderTab, IconName> = { fixed: "pin", insights: "chart", unlocks: "unlock" };

/** Section for experienced users (token unlocks, Pendle fixed yield, Launchpool analytics) — kept out of APR Radar. */
export function TraderTabs({ lang, active, updated }: { lang: Locale; active: TraderTab; updated?: number }) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <nav className="scroll-x flex max-w-full gap-1 rounded-2xl border border-line bg-white/[0.02] p-1 sm:w-fit" aria-label={TRADER_NAV[lang]}>
        {(["unlocks", "fixed", "insights"] as const).map((id) => (
          <Link key={id} href={`/${lang}/${id}`} aria-current={active === id ? "page" : undefined}
            className={`flex h-11 shrink-0 items-center gap-2 rounded-xl px-4 text-sm font-bold transition-colors ${active === id ? "bg-lime text-on-accent" : "text-ink-2 hover:bg-white/5 hover:text-ink"}`}>
            <Icon name={ICON[id]} />{L[lang][id]}
          </Link>
        ))}
      </nav>
      {updated ? <Updated at={updated} lang={lang} /> : null}
    </div>
  );
}
