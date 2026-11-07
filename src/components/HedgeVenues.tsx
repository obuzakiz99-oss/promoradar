import type { Locale } from "@/lib/i18n";
import type { Hedge } from "@/lib/pools";

/** Futures (USDT perpetual) page of a coin on each exchange we read funding from. */
const FUT: Record<string, (c: string) => string> = {
  Binance: (c) => `https://www.binance.com/en/futures/${c}USDT`,
  Bybit: (c) => `https://www.bybit.com/trade/usdt/${c}USDT`,
  Gate: (c) => `https://www.gate.com/futures/USDT/${c}_USDT`,
  MEXC: (c) => `https://futures.mexc.com/exchange/${c}_USDT`,
  OKX: (c) => `https://www.okx.com/trade-swap/${c.toLowerCase()}-usdt-swap`,
  Bitget: (c) => `https://www.bitget.com/futures/usdt/${c}USDT`,
};
const TX: Record<Locale, { hedge: (c: string) => string; none: (c: string) => string; tip: string; recv: string; pay: string }> = {
  uk: { hedge: (c) => `Хедж ${c} ф'ючерсом:`, none: (c) => `Ф'ючерса на ${c} немає — захиститись від падіння ціни не вийде`, tip: "Шорт на ту ж суму знімає ризик ціни. Число — фандинг за рік для шорту.", recv: "шорт отримує фандинг", pay: "шорт платить фандинг" },
  en: { hedge: (c) => `Hedge ${c} with futures:`, none: (c) => `No futures for ${c} — the price risk can't be hedged`, tip: "A short of the same size removes the price risk. The number is the yearly funding for a short.", recv: "short receives funding", pay: "short pays funding" },
  ru: { hedge: (c) => `Хедж ${c} фьючерсом:`, none: (c) => `Фьючерса на ${c} нет — защититься от падения цены не получится`, tip: "Шорт на ту же сумму снимает ценовой риск. Число — фандинг за год для шорта.", recv: "шорт получает фандинг", pay: "шорт платит фандинг" },
};
const fmt = (x: number) => `${x >= 0 ? "+" : "−"}${Math.abs(x) >= 100 ? Math.round(Math.abs(x)) : Math.abs(x).toFixed(1)}%`;

/** Exchanges where `coin` can be shorted (perpetual futures), best funding first, each linking to that futures pair. */
export function HedgeVenues({ coin, hedge, lang, className = "" }: { coin: string; hedge?: Hedge; lang: Locale; className?: string }) {
  const T = TX[lang];
  if (!hedge) return null;
  const perps = [...hedge.perps].sort((a, b) => b.fundingApr - a.fundingApr);
  if (!perps.length) return <div className={`text-[11px] font-semibold text-ink-3 ${className}`}>⚠ {T.none(coin)}</div>;
  return (
    <div className={`flex flex-wrap items-center gap-1 text-[11px] font-semibold ${className}`} title={T.tip}>
      <span className="text-ink-3">🛡 {T.hedge(coin)}</span>
      {perps.map((x) => (
        <a key={x.ex} href={FUT[x.ex]?.(coin) ?? "#"} target="_blank" rel="noopener"
          className="inline-flex items-center gap-1 rounded-md border border-line bg-white/[0.03] px-1.5 py-0.5 text-ink-2 hover:border-line-2 hover:text-ink"
          title={`${x.ex}: ${x.fundingApr >= 0 ? T.recv : T.pay} ${fmt(x.fundingApr)}`}>
          {x.ex} <span className={`font-mono ${x.fundingApr >= 0 ? "text-lime" : "text-rose"}`}>{fmt(x.fundingApr)}</span>
        </a>
      ))}
    </div>
  );
}
