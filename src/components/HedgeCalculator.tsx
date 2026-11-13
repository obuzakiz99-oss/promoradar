"use client";
import { useMemo, useState } from "react";
import { nfLocale } from "@/lib/format";
import type { Locale } from "@/lib/i18n";

import { TOOLS } from "@/lib/i18n-tools";

import type { HedgeOption } from "@/lib/hedge-options";
import { Select } from "./Select";

// number format follows the page language (audit 12.11)
const fmtOf = (lc: string) => ({
  usd: (x: number) => `${x < 0 ? "−" : ""}$${Math.abs(x).toLocaleString(lc, { maximumFractionDigits: Math.abs(x) < 100 ? 2 : 0 })}`,
  num: (x: number) => x.toLocaleString(lc, { maximumFractionDigits: x < 1 ? 6 : x < 100 ? 4 : 0 }),
});

// input guards and the pool's per-person limit (audit 12.11: −500 $, leverage 0 → "$∞", leverage 100 → "+0%" with no warning)
const LIM: Record<string, [number, number]> = { capital: [0, 1e9], price: [1e-12, 1e9], apr: [0, 1e5], days: [0, 3650], funding: [-1000, 1000], leverage: [1, 20], mmr: [0, 10], fees: [0, 50] };
const clampV = (k: string, x: number) => { const [lo, hi] = LIM[k] ?? [-Infinity, Infinity]; return Number.isFinite(x) ? Math.min(hi, Math.max(lo, x)) : lo; };
const CAP_TX = {
  uk: { cap: (m: string) => `Ліміт пулу на одну людину ≈ ${m} — рахуємо з цієї суми`, risky: "Ліквідація надто близько: ціні досить трохи вирости. Зменште плече." },
  en: { cap: (m: string) => `The pool's per-person limit is ≈ ${m} — we calculate with that amount`, risky: "Liquidation is too close: a small price rise is enough. Lower the leverage." },
  ru: { cap: (m: string) => `Лимит пула на одного человека ≈ ${m} — считаем от этой суммы`, risky: "Ликвидация слишком близко: цене хватит немного вырасти. Снизьте плечо." },
} as const;

export function HedgeCalculator({ options, lang }: { options: HedgeOption[]; lang: Locale }) {
  const T = TOOLS[lang];
  const { usd, num } = fmtOf(nfLocale(lang));
  const first = options[0];
  const [sel, setSel] = useState(first?.key ?? "custom");
  const preset = options.find((o) => o.key === sel);
  const [v, setV] = useState({
    capital: 1000, price: first?.price ?? 1, apr: first?.apr ?? 100, days: first?.days ?? 30, funding: first?.fundingApr ?? 0,
    leverage: 3, mmr: 0.5, fees: first?.feesPct ?? 1, coin: first?.coin ?? "TOKEN", venue: first?.venue ?? "MEXC",
  });
  const pick = (key: string) => {
    setSel(key);
    const o = options.find((x) => x.key === key);
    if (o) setV((s) => ({ ...s, price: o.price, apr: o.apr, days: o.days, funding: o.fundingApr, fees: o.feesPct, coin: o.coin, venue: o.venue }));
  };
  const lc = nfLocale(lang);
  const CT = CAP_TX[lang as keyof typeof CAP_TX] ?? CAP_TX.uk;
  const capped = !!preset?.maxUsd && v.capital > preset.maxUsd;
  const r = useMemo(() => {
    const c = Object.fromEntries(Object.entries(v).map(([k, x]) => [k, typeof x === "number" ? clampV(k, x) : x])) as typeof v;
    if (preset?.maxUsd && c.capital > preset.maxUsd) c.capital = preset.maxUsd;
    const qty = c.capital / c.price;
    const margin = c.capital / c.leverage;
    // isolated short is liquidated when margin − N·u = mmr·N·(1+u)  →  u = (1/L − mmr) / (1 + mmr)
    const liq = c.price * (1 + (1 / c.leverage - c.mmr / 100) / (1 + c.mmr / 100));
    const rewards = (c.capital * c.apr) / 100 * (c.days / 365);
    const funding = (c.capital * c.funding) / 100 * (c.days / 365);
    const costs = (c.capital * c.fees) / 100;
    const net = rewards + funding - costs;
    const total = c.capital + margin;
    return { c, qty, margin, liq, rewards, funding, costs, net, total, netApr: total > 0 && c.days > 0 ? (net / total) * (365 / c.days) * 100 : 0 };
  }, [v, preset?.maxUsd]);
  const fill = (s: string) => s.replace("{q}", num(r.qty)).replace("{c}", v.coin).replace("{a}", usd(r.c.capital)).replace("{v}", v.venue).replace("{l}", String(r.c.leverage)).replace("{m}", usd(r.margin));

  const field = (k: keyof typeof v, label: string, step = "any") => (
    <label className="block">
      <span className="text-xs font-semibold text-ink-3">{label}</span>
      <input type="number" step={step} min={LIM[k]?.[0]} max={LIM[k]?.[1]} value={v[k] as number} onChange={(e) => { setSel("custom"); setV((s) => ({ ...s, [k]: Number(e.target.value) })); }}
        className="mt-1 h-11 w-full rounded-xl border border-line bg-white/[0.03] px-3 font-mono text-sm text-ink focus:border-lime/50 focus:outline-none" />
    </label>
  );

  return (
    <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-[1fr_1.1fr]">
      <div className="card p-5 hover:transform-none sm:p-6">
        <div>
          <span className="text-xs font-semibold text-ink-3">{T.pickPool}</span>
          <div className="mt-1">
            <Select label={T.pickPool} value={sel} onChange={pick} className="h-11 rounded-xl border border-line bg-surface px-3 text-sm font-bold text-ink"
              menuClassName="w-full [&_li]:whitespace-normal [&_li]:py-1.5"
              options={[...options.map((o) => ({ value: o.key, label: o.label })), { value: "custom", label: T.custom }]} />
          </div>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-3">
          {field("capital", T.capital, "100")}
          {field("price", T.price)}
          {field("apr", T.apr)}
          {field("days", T.days, "1")}
          {field("funding", T.funding)}
          {field("leverage", T.leverage, "1")}
          {field("mmr", T.mmr)}
          {field("fees", T.fees)}
        </div>
        {capped && <p className="mt-3 rounded-lg bg-amber/10 px-3 py-2 text-xs font-semibold text-amber">{CT.cap(usd(preset!.maxUsd!))}</p>}
      </div>

      <div className="space-y-4">
        <div className="card p-5 hover:transform-none sm:p-6">
          <h2 className="text-xs font-bold uppercase tracking-wider text-ink-3">{T.plan}</h2>
          <ol className="mt-3 space-y-2.5 text-sm">
            {[T.step1, T.step2, T.step3, T.step4, T.step5].map((s, i) => (
              <li key={i} className="flex gap-3"><span className="grid size-6 shrink-0 place-items-center rounded-md bg-lime/10 font-mono text-xs font-bold text-lime">{i + 1}</span><span className="text-ink-2">{fill(s)}</span></li>
            ))}
          </ol>
          {(() => {
            const up = (r.liq / r.c.price - 1) * 100;
            const risky = up < 15;
            return (
              <div className={`mt-4 rounded-xl px-4 py-3 text-sm ${risky ? "bg-rose/10" : "bg-white/[0.03]"}`}>
                {T.liq}: <span className={`font-mono font-bold ${risky ? "text-rose" : "text-ink"}`}>${num(r.liq)}</span> <span className="text-ink-3">{T.liqUp.replace("{x}", `${up.toLocaleString(lc, { maximumFractionDigits: 0 })}%`)}</span>
                {risky && <p className="mt-1 text-xs font-semibold text-rose">{CT.risky}</p>}
              </div>
            );
          })()}
        </div>
        <div className="card p-5 hover:transform-none sm:p-6">
          <dl className="space-y-2 text-sm">
            {[[T.capitalTotal, usd(r.total)], [T.rewards, `+${usd(r.rewards)}`], [T.fundingTotal, `${r.funding >= 0 ? "+" : ""}${usd(r.funding)}`], [T.costs, `−${usd(r.costs)}`]].map(([k, x]) => (
              <div key={k} className="flex justify-between gap-4"><dt className="text-ink-3">{k}</dt><dd className="font-mono font-bold">{x}</dd></div>
            ))}
            <div className="flex justify-between gap-4 border-t border-line pt-3 text-base"><dt className="font-bold">{T.net}</dt><dd className={`font-mono font-bold ${r.net >= 0 ? "text-lime" : "text-ink-3"}`}>{r.net >= 0 ? "+" : ""}{usd(r.net)}</dd></div>
            <div className="flex justify-between gap-4"><dt className="text-ink-3">{T.netApr}</dt><dd className="font-mono font-bold">{r.netApr.toLocaleString(lc, { maximumFractionDigits: 1 })}%</dd></div>
          </dl>
        </div>
        <p className="text-xs leading-relaxed text-ink-3">{T.hedgeWarn}</p>
      </div>
    </div>
  );
}
