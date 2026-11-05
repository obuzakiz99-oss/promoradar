import Link from "next/link";
import { Logo } from "./Logo";
import { LangSwitch } from "./LangSwitch";
import type { Dict, Locale } from "@/lib/i18n";
import { SITE } from "@/config/site";
import { withBase } from "@/lib/base";
import { TOOLS } from "@/lib/i18n-tools";
import { LEARN } from "@/lib/i18n-learn";
import { NoviceToggle } from "./NoviceToggle";
import { NoviceBanner } from "./NoviceBanner";

export function Header({ lang, t }: { lang: Locale; t: Dict }) {
  return (
    <header className="sticky top-0 z-40 border-b border-line/60 bg-bg/70 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-7xl items-center gap-6 px-4 sm:px-6">
        <Link href={`/${lang}`} aria-label={SITE.name}><Logo name={SITE.name} /></Link>
        <nav className="hidden items-center gap-0.5 whitespace-nowrap text-sm font-semibold text-ink-2 md:flex">
          <a href={withBase(`/${lang}#promos`)} className="rounded-lg px-3 py-2 hover:text-ink">{t.nav.promos}</a>
          <Link href={`/${lang}/launchpools`} className="rounded-lg px-3 py-2 hover:text-ink">
            {t.aprHub.nav} <span className="ml-1 rounded-md bg-lime/15 px-1.5 py-0.5 text-[10px] font-extrabold text-lime">NEW</span>
          </Link>
          <Link href={`/${lang}/tools`} className="rounded-lg px-3 py-2 hover:text-ink">{TOOLS[lang].nav}</Link>
          <Link href={`/${lang}/learn`} className="rounded-lg px-3 py-2 hover:text-ink">{LEARN[lang].nav}</Link>
          <a href={withBase(`/${lang}#how`)} className="hidden rounded-lg px-3 py-2 hover:text-ink 2xl:block">{t.nav.how}</a>
          <a href={withBase(`/${lang}#sources`)} className="hidden rounded-lg px-3 py-2 hover:text-ink xl:block">{t.nav.sources}</a>
          <a href={withBase(`/${lang}#pro`)} className="hidden rounded-lg px-3 py-2 hover:text-ink lg:block">
            {t.nav.pro}
          </a>
        </nav>
        <div className="ml-auto flex items-center gap-2 sm:gap-3">
          <NoviceToggle label={LEARN[lang].toggle} hint={LEARN[lang].toggleHint} />
          <LangSwitch current={lang} />
          <a href={SITE.telegram} target="_blank" rel="noopener" className="btn btn-ghost hidden h-9 px-3.5 text-sm lg:inline-flex">
            <TgIcon /> {t.nav.telegram}
          </a>
        </div>
      </div>
      <NoviceBanner text={LEARN[lang].banner} link={withBase(`/${lang}/learn/start/`)} linkLabel={LEARN[lang].bannerLink} off={LEARN[lang].bannerOff} />
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
