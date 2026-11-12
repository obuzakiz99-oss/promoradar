import Link from "next/link";
import type { Locale } from "@/lib/i18n";
import { Updated } from "./Updated";

/**
 * Tabs inside the four main sections (audit 08.11: one menu item per user question, the old pages become tabs).
 *  Акції      — all promos · airdrops · by coin · exchange rating
 *  Дохідність — Launchpool · Earn · DeFi pools · fixed yield; Launchpool has its own row: now · APR history · analytics · hedge
 *  Календар   — promos · token unlocks
 */
type L = Locale;
type Tab = { id: string; href: string; label: Record<L, string>; adv?: boolean };

const PROMO: Tab[] = [
  { id: "all", href: "/#promos", label: { uk: "Усі акції", en: "All promos", ru: "Все акции" } },
  { id: "drops", href: "/drops/", label: { uk: "Аірдропи", en: "Airdrops", ru: "Аирдропы" } },
  { id: "tokens", href: "/t/", label: { uk: "За монетою", en: "By coin", ru: "По монете" } },
  { id: "exchanges", href: "/exchanges/", label: { uk: "Рейтинг бірж", en: "Exchange rating", ru: "Рейтинг бирж" } },
];
const YIELD: Tab[] = [
  { id: "lp", href: "/launchpools/", label: { uk: "Launchpool", en: "Launchpool", ru: "Launchpool" } },
  { id: "earn", href: "/earn/", label: { uk: "Earn бірж", en: "Exchange Earn", ru: "Earn бирж" } },
  { id: "dex", href: "/dex/", label: { uk: "DeFi-пули", en: "DeFi pools", ru: "DeFi-пулы" } },
  { id: "fixed", href: "/fixed/", label: { uk: "Фіксована", en: "Fixed", ru: "Фиксированная" } },
];
const LP: Tab[] = [
  { id: "lp", href: "/launchpools/", label: { uk: "Зараз", en: "Now", ru: "Сейчас" } },
  { id: "history", href: "/history/", label: { uk: "Історія APR", en: "APR history", ru: "История APR" } },
  { id: "insights", href: "/insights/", label: { uk: "Що з токеном після", en: "Token after the pool", ru: "Что с токеном после" } },
  { id: "hedge", href: "/hedge/", label: { uk: "Хедж", en: "Hedge", ru: "Хедж" } },
];
const CAL: Tab[] = [
  { id: "calendar", href: "/calendar/", label: { uk: "Акції", en: "Promos", ru: "Акции" } },
  { id: "unlocks", href: "/unlocks/", label: { uk: "Розлоки токенів", en: "Token unlocks", ru: "Разлоки токенов" } },
];

function Row({ tabs, active, lang, small, label }: { tabs: Tab[]; active: string; lang: L; small?: boolean; label: string }) {
  return (
    // audit 08.11: section tabs = underline (not lime fills, which belong to filter chips); the second level = segmented control
    small ? (
      <nav className="scroll-x mt-3 flex max-w-full gap-1 rounded-xl border border-line bg-white/[0.02] p-1 sm:w-fit" aria-label={label}>
        {tabs.map((x) => (
          <Link key={x.id} href={`/${lang}${x.href}`} aria-current={active === x.id ? "page" : undefined}
            className={`flex h-9 shrink-0 items-center rounded-lg px-3.5 text-[13px] font-bold transition-colors ${active === x.id ? "bg-white/10 text-ink" : "text-ink-2 hover:bg-white/5 hover:text-ink"}`}>
            {x.label[lang]}
          </Link>
        ))}
      </nav>
    ) : (
      <nav className="scroll-x flex max-w-full gap-6 border-b border-line" aria-label={label}>
        {tabs.map((x) => (
          <Link key={x.id} href={`/${lang}${x.href}`} aria-current={active === x.id ? "page" : undefined}
            className={`relative flex h-11 shrink-0 items-center text-[15px] font-bold transition-colors ${active === x.id ? "text-ink" : "text-ink-3 hover:text-ink"}`}>
            {x.label[lang]}
            {active === x.id && <span aria-hidden="true" className="absolute inset-x-0 -bottom-px h-0.5 rounded-full bg-lime" />}
          </Link>
        ))}
      </nav>
    )
  );
}

export function PromoTabs({ lang, active }: { lang: L; active: "all" | "drops" | "tokens" | "exchanges" }) {
  return <Row tabs={PROMO} active={active} lang={lang} label="Promos" />;
}

export type YieldTab = "lp" | "earn" | "dex" | "fixed" | "history" | "insights" | "hedge";
export function YieldTabs({ lang, active, updated }: { lang: L; active: YieldTab; updated?: number }) {
  const lpGroup = ["lp", "history", "insights", "hedge"].includes(active);
  return (
    <div>
      <div className="flex flex-wrap items-center gap-3">
        <Row tabs={YIELD} active={lpGroup ? "lp" : active} lang={lang} label="Yield" />
        {updated ? <Updated at={updated} lang={lang} /> : null}
      </div>
      {lpGroup && <Row tabs={LP} active={active} lang={lang} small label="Launchpool" />}
    </div>
  );
}

export function CalendarTabs({ lang, active, updated }: { lang: L; active: "calendar" | "unlocks"; updated?: number }) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <Row tabs={CAL} active={active} lang={lang} label="Calendar" />
      {updated ? <Updated at={updated} lang={lang} /> : null}
    </div>
  );
}
