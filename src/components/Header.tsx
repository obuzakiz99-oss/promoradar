import Link from "next/link";
import { Logo } from "./Logo";
import { LangSwitch } from "./LangSwitch";
import type { Dict, Locale } from "@/lib/i18n";
import { HAS_PRO, HAS_TG, SITE } from "@/config/site";
import { withBase } from "@/lib/base";
import { LEARN } from "@/lib/i18n-learn";
import { NavLinks, type NavItem } from "./NavLinks";
import { MyStar } from "./MyStar";

export function Header({ lang, t }: { lang: Locale; t: Dict }) {
  // one list for desktop and the phone menu; `wide` = only on big screens in the desktop bar
  // `match` = first path segment(s) after the language that belong to this item (highlighted as the current page)
  // audit 08.11: one item per user question; the old pages are tabs inside these sections (components/SectionTabs.tsx)
  const items: NavItem[] = [
    { href: withBase(`/${lang}/#promos`), label: t.nav.promos, match: ["", "p", "v", "drops", "t", "bonuses"] },
    { href: withBase(`/${lang}/launchpools/`), label: { uk: "Дохідність", en: "Yield", ru: "Доходность" }[lang], match: ["launchpools", "earn", "dex", "lp", "fixed", "history", "insights", "hedge"] },
    { href: withBase(`/${lang}/calendar/`), label: { uk: "Календар", en: "Calendar", ru: "Календарь" }[lang], match: ["calendar", "unlocks"] },
    { href: withBase(`/${lang}/learn/`), label: LEARN[lang].nav, match: ["learn", "best", "check"] },
    ...(HAS_PRO ? [{ href: withBase(`/${lang}/#pro`), label: t.nav.pro, wide: "lg:block", match: ["pro"] }] : []),
  ];
  return (
    <header className="sticky top-0 z-40 border-b border-line/60 bg-bg/70 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-7xl items-center gap-4 px-4 sm:px-6 md:gap-6">
        <Link href={`/${lang}`} aria-label={SITE.name}><Logo name={SITE.name} /></Link>
        <nav className="hidden items-center gap-0.5 whitespace-nowrap text-sm font-semibold text-ink-2 md:flex">
          <NavLinks items={items} />
        </nav>
        <div className="ml-auto flex items-center gap-2 sm:gap-3">
          <MyStar href={withBase(`/${lang}/my/`)} label={({ uk: "Мої акції", en: "My promos", ru: "Мои акции" } as const)[lang]} />
          <span className="hidden sm:block"><LangSwitch current={lang} /></span>
          {HAS_TG && (
            <a href={SITE.telegram} target="_blank" rel="noopener" className="btn btn-ghost hidden h-9 px-3.5 text-sm lg:inline-flex">
              <TgIcon /> {t.nav.telegram}
            </a>
          )}
          {/* phone menu: <details> works without JavaScript */}
          <details className="group relative md:hidden">
            <summary aria-label="Menu" className="grid size-9 cursor-pointer list-none place-items-center rounded-xl border border-line bg-white/[0.03] text-ink [&::-webkit-details-marker]:hidden">
              <svg className="size-5 group-open:hidden" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true"><path d="M3 5h14v1.6H3V5Zm0 4.2h14v1.6H3V9.2Zm0 4.2h14V15H3v-1.6Z" /></svg>
              <svg className="hidden size-5 group-open:block" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true"><path d="m5.1 4 4.9 4.9L14.9 4 16 5.1 11.1 10l4.9 4.9-1.1 1.1-4.9-4.9L5.1 16 4 14.9 8.9 10 4 5.1 5.1 4Z" /></svg>
            </summary>
            <nav className="absolute right-0 top-12 w-64 rounded-2xl border border-line-2 bg-surface p-2 shadow-2xl">
              <NavLinks items={items} phone />
              {HAS_TG && <a href={SITE.telegram} target="_blank" rel="noopener" className="flex h-11 items-center gap-2 rounded-xl px-3 text-sm font-semibold text-ink-2 hover:bg-white/5 hover:text-ink"><TgIcon /> {t.nav.telegram}</a>}
              <div className="mt-1 border-t border-line px-2 pt-3 pb-1"><LangSwitch current={lang} /></div>
            </nav>
          </details>
        </div>
      </div>
    </header>
  );
}

export function TgIcon({ className = "size-4" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M21.9 4.3 18.7 19.4c-.2 1-.9 1.3-1.7.8l-4.8-3.5-2.3 2.2c-.3.3-.5.5-1 .5l.3-4.9 8.9-8c.4-.3-.1-.5-.6-.2L6.6 13.2l-4.7-1.5c-1-.3-1-1 .2-1.5L20.5 3c.9-.3 1.6.2 1.4 1.3Z" />
    </svg>
  );
}
