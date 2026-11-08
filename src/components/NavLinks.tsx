"use client";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

export interface NavItem { href: string; label: ReactNode; wide?: string; adv?: boolean; match: string[] }

/** First path segment after the language: "/uk/earn/" → "earn", "/uk" → "" (home). */
function section(path: string | null): string {
  const parts = (path ?? "").split("/").filter(Boolean);
  return parts[1] ?? "";
}

/** Header links with the current section highlighted (desktop bar or phone menu). */
export function NavLinks({ items, phone = false }: { items: NavItem[]; phone?: boolean }) {
  const cur = section(usePathname());
  return (
    <>
      {items.map((it, i) => {
        const on = it.match.includes(cur);
        const base = phone
          ? `${it.adv ? "adv " : ""}flex h-11 items-center rounded-xl px-3 text-sm font-semibold hover:bg-white/5 hover:text-ink`
          : `${it.wide ? `hidden ${it.wide}` : ""} ${it.adv ? "adv" : ""} relative rounded-lg px-3 py-2 hover:text-ink`;
        return (
          <a key={i} href={it.href} aria-current={on ? "page" : undefined}
            className={`${base} ${on ? "bg-white/[0.07] text-ink" : "text-ink-2"}`}>
            {it.label}
            {on && !phone && <span aria-hidden="true" className="absolute inset-x-3 -bottom-[13px] h-0.5 rounded-full bg-lime" />}
            {on && phone && <span aria-hidden="true" className="ml-auto size-1.5 rounded-full bg-lime" />}
          </a>
        );
      })}
    </>
  );
}
