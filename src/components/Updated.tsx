"use client";
import { useEffect, useState } from "react";
import type { Locale } from "@/lib/i18n";

const TXT: Record<Locale, (m: number) => string> = {
  uk: (m) => (m < 1 ? "оновлено щойно" : m < 60 ? `оновлено ${m} хв тому` : `оновлено ${Math.round(m / 60)} год тому`),
  en: (m) => (m < 1 ? "updated just now" : m < 60 ? `updated ${m} min ago` : `updated ${Math.round(m / 60)} h ago`),
  ru: (m) => (m < 1 ? "обновлено только что" : m < 60 ? `обновлено ${m} мин назад` : `обновлено ${Math.round(m / 60)} ч назад`),
};

/** "updated 12 min ago" — green while fresh (site rebuilds every 30 min), amber when the data is getting old. */
export function Updated({ at, lang }: { at: number; lang: Locale }) {
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    setNow(Date.now());
    const i = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(i);
  }, []);
  if (now === null || !at) return null;
  const m = Math.max(0, Math.round((now - at) / 60_000));
  const fresh = m <= 45;
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-bold ${fresh ? "border-lime/25 bg-lime/[0.06] text-lime" : "border-amber/30 bg-amber/10 text-amber"}`}
      title={new Date(at).toLocaleString()}>
      <span className={`size-1.5 rounded-full ${fresh ? "bg-lime" : "bg-amber"}`} />{TXT[lang](m)}
    </span>
  );
}
