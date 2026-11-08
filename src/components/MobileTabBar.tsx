"use client";
import { usePathname } from "next/navigation";
import { useEffect } from "react";
import { useSaved } from "./SaveButton";

type L = "uk" | "en" | "ru";
const I = {
  promos: <path d="M20.6 13.4 13.4 20.6a2 2 0 0 1-2.8 0L3 13V3h10l7.6 7.6a2 2 0 0 1 0 2.8ZM7.5 7.5h.01" />,
  yield: <path d="M3 17l6-6 4 4 8-8M14 7h7v7" />,
  cal: <><rect x="3" y="4.5" width="18" height="16" rx="2.5" /><path d="M3 9.5h18M8 2.5v4M16 2.5v4" /></>,
  learn: <path d="M22 10 12 5 2 10l10 5 10-5ZM6 12v5c3 2 9 2 12 0v-5" />,
  star: <path d="m12 3 2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9L12 3Z" />,
};

/**
 * Bottom tab bar on phones (audit 08.11): the 4 sections + ★, like an app (the site is also a PWA).
 * Also scrolls every horizontal tab strip so its active tab is in view.
 */
export function MobileTabBar({ lang, base }: { lang: L; base: string }) {
  const seg = (usePathname() ?? "").split("/").filter(Boolean)[1] ?? "";
  const saved = useSaved().length;
  useEffect(() => {
    document.querySelectorAll<HTMLElement>(".scroll-x [aria-current='page']").forEach((el) => el.scrollIntoView({ block: "nearest", inline: "center" }));
  }, [seg]);
  const items: Array<{ href: string; label: string; icon: React.ReactNode; on: boolean; badge?: number }> = [
    { href: `${base}/${lang}/#promos`, label: { uk: "Акції", en: "Promos", ru: "Акции" }[lang], icon: I.promos, on: ["", "p", "v", "drops", "t", "bonuses"].includes(seg) },
    { href: `${base}/${lang}/launchpools/`, label: { uk: "Дохідність", en: "Yield", ru: "Доходность" }[lang], icon: I.yield, on: ["launchpools", "earn", "dex", "lp", "fixed", "history", "insights", "hedge"].includes(seg) },
    { href: `${base}/${lang}/calendar/`, label: { uk: "Календар", en: "Calendar", ru: "Календарь" }[lang], icon: I.cal, on: ["calendar", "unlocks"].includes(seg) },
    { href: `${base}/${lang}/learn/`, label: { uk: "Новачкам", en: "Beginners", ru: "Новичкам" }[lang], icon: I.learn, on: ["learn", "best", "check"].includes(seg) },
    { href: `${base}/${lang}/my/`, label: { uk: "Мої", en: "Saved", ru: "Мои" }[lang], icon: I.star, on: seg === "my", badge: saved },
  ];
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-5 border-t border-line bg-bg/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl md:hidden" aria-label="Sections">
      {items.map((x) => (
        <a key={x.href} href={x.href} aria-current={x.on ? "page" : undefined}
          className={`relative flex min-h-14 flex-col items-center justify-center gap-0.5 text-xs font-semibold ${x.on ? "text-lime" : "text-ink-3 hover:text-ink"}`}>
          <svg className="size-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{x.icon}</svg>
          {x.label}
          {x.badge ? <span className="absolute right-[22%] top-1.5 grid min-w-4 place-items-center rounded-full bg-amber px-1 text-xs font-bold leading-4 text-on-accent">{x.badge}</span> : null}
        </a>
      ))}
    </nav>
  );
}
