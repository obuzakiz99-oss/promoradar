"use client";
import { useEffect, useState } from "react";
import type { Locale } from "@/lib/i18n";

const TX: Record<Locale, { upd: (m: string) => string; fresh: (n: number) => string; next: (m: number) => string; justNow: string; min: (n: number) => string; hr: (n: number) => string }> = {
  uk: { upd: (m) => `Оновлено ${m}`, fresh: (n) => `${n} нових за добу`, next: (m) => `наступне оновлення ≈ через ${m} хв`, justNow: "щойно", min: (n) => `${n} хв тому`, hr: (n) => `${n} год тому` },
  en: { upd: (m) => `Updated ${m}`, fresh: (n) => `${n} new in 24 h`, next: (m) => `next update in ≈ ${m} min`, justNow: "just now", min: (n) => `${n} min ago`, hr: (n) => `${n} h ago` },
  ru: { upd: (m) => `Обновлено ${m}`, fresh: (n) => `${n} новых за сутки`, next: (m) => `следующее обновление ≈ через ${m} мин`, justNow: "только что", min: (n) => `${n} мин назад`, hr: (n) => `${n} ч назад` },
};

/** "Updated 4 min ago · 37 new in 24 h · next update in ≈ 26 min" — real numbers from the last build (every 30 min). */
export function LiveLine({ at, newDay, lang }: { at: number; newDay: number; lang: Locale }) {
  const T = TX[lang];
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => { setNow(Date.now()); const i = setInterval(() => setNow(Date.now()), 30_000); return () => clearInterval(i); }, []);
  const age = now === null ? 0 : Math.max(0, now - at);
  const mins = Math.round(age / 60_000);
  const ago = mins < 1 ? T.justNow : mins < 90 ? T.min(mins) : T.hr(Math.round(mins / 60));
  const next = Math.max(1, 30 - (mins % 30));
  return (
    <p className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs font-semibold text-ink-3">
      <span className={`size-1.5 rounded-full ${mins > 90 ? "bg-amber" : "bg-lime"}`} />
      <span suppressHydrationWarning>{T.upd(ago)}</span>
      {newDay > 0 && <><span>·</span><span className="text-lime">{T.fresh(newDay)}</span></>}
      {now !== null && mins <= 90 && <><span>·</span><span suppressHydrationWarning>{T.next(next)}</span></>}
    </p>
  );
}
