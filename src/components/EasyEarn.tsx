import { earnYear } from "@/lib/earn-calc";
import Link from "next/link";
import type { Locale } from "@/lib/i18n";
import type { EarnOffer } from "@/lib/earn";
import { VENUES, venueOf } from "@/config/site";
import { num } from "@/lib/format";
import { VenueLogo } from "./VenueLogo";
import { AutoTerms } from "./AutoTerms";

/**
 * "Найпростіший спосіб — USDT у гнучкий Earn" (owner 27.11: the beginners' tab should show the easiest things to do):
 * the three best flexible USDT rates on big, known exchanges, no new-user-only or capped teaser rates, in plain words.
 */
const BIG = new Set(["binance", "bybit", "okx", "bitget", "kucoin", "gate", "mexc", "htx", "kraken", "bingx", "whitebit"]);
const TX: Record<Locale, { h: string; sub: string; per: (x: string) => string; all: string }> = {
  uk: { h: "Найпростіший спосіб: USDT у гнучкий Earn", sub: "Як депозит у банку: кладете USDT (≈ $1 за монету), відсотки капають щодня, забрати можна будь-коли. Ставка може змінюватися.", per: (x) => `$1 000 → ≈ +$${x} за місяць`, all: "Усі ставки Earn →" },
  en: { h: "The easiest way: USDT in flexible Earn", sub: "Like a bank deposit: put in USDT (≈ $1 per coin), interest every day, withdraw any time. The rate can change.", per: (x) => `$1,000 → ≈ +$${x} a month`, all: "All Earn rates →" },
  ru: { h: "Самый простой способ: USDT в гибкий Earn", sub: "Как депозит в банке: кладёте USDT (≈ $1 за монету), проценты капают каждый день, забрать можно в любой момент. Ставка может меняться.", per: (x) => `$1 000 → ≈ +$${x} в месяц`, all: "Все ставки Earn →" },
};

export function EasyEarn({ offers, lang }: { offers: EarnOffer[]; lang: Locale }) {
  const best = new Map<string, EarnOffer>();
  for (const o of offers) {
    if (o.coin !== "USDT" || o.type !== "flexible" || !BIG.has(o.exchange) || !VENUES[o.exchange] || o.newUsers || !(o.apr > 0) || o.apr > 30) continue;
    if (o.minAmount && o.minAmount > 1000) continue;
    const prev = best.get(o.exchange);
    if (!prev || o.apr > prev.apr) best.set(o.exchange, o);
  }
  const top = [...best.values()].sort((a, b) => b.apr - a.apr).slice(0, 3);
  if (!top.length) return null;
  const T = TX[lang];
  return (
    <section className="mt-12 rounded-2xl border border-lime/25 bg-lime/[0.04] p-5 sm:p-6">
      <h2 className="font-display text-xl font-semibold tracking-tight sm:text-2xl">💵 <AutoTerms text={T.h} lang={lang} /></h2>
      <p className="mt-1 max-w-2xl text-sm text-ink-2"><AutoTerms text={T.sub} lang={lang} /></p>
      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
        {top.map((o) => (
          <Link key={o.exchange} href={`/${lang}/earn/?ex=${o.exchange}`} className="card flex items-center gap-3 p-4">
            <VenueLogo v={venueOf(o.exchange)} size={32} rounded="rounded-lg" />
            <div className="min-w-0">
              <div className="font-bold text-ink">{VENUES[o.exchange].name} · <span className="text-lime">{num(o.apr, lang)}%</span></div>
              <div className="text-xs text-ink-3">{T.per(num(Math.round(earnYear(o, 1000) / 12 * 10) / 10, lang, 1)) /* audit 28.11: boosted tier counts */}</div>
            </div>
          </Link>
        ))}
      </div>
      <Link href={`/${lang}/earn/`} className="mt-4 inline-block text-sm font-bold text-lime hover:underline">{T.all}</Link>
    </section>
  );
}
