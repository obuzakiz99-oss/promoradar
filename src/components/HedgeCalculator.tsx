"use client";
import { useMemo, useState } from "react";
import type { Locale } from "@/lib/i18n";

import { TOOLS } from "@/lib/i18n-tools";

import type { HedgeOption } from "@/lib/hedge-options";

const usd = (x: number) => `${x < 0 ? "−" : ""}$${Math.abs(x).toLocaleString("en-US", { maximumFractionDigits: Math.abs(x) < 100 ? 2 : 0 })}`;
const num = (x: number) => x.toLocaleString("en-US", { maximumFractionDigits: x < 1 ? 6 : x < 100 ? 4 : 0 });

export function HedgeCalculator({ options, lang }: { options: HedgeOption[]; lang: Locale }) {
  const T = TOOLS[lang];
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
  const r = useMemo(() => {
    const qty = v.capital / v.price;
    const margin = v.capital / v.leverage;
    // isolated short is liquidated when margin − N·u = mmr·N·(1+u)  →  u = (1/L − mmr) / (1 + mmr)
    const liq = v.price * (1 + (1 / v.leverage - v.mmr / 100) / (1 + v.mmr / 100));
    const rewards = (v.capital * v.apr) / 100 * (v.days / 365);
    const funding = (v.capital * v.funding) / 100 * (v.days / 365);
    const costs = (v.capital * v.fees) / 100;
    const net = rewards + funding - costs;
    const total = v.capital + margin;
    return { qty, margin, liq, rewards, funding, costs, net, total, netApr: total > 0 && v.days > 0 ? (net / total) * (365 / v.days) * 100 : 0 };
  }, [v]);
  const fill = (s: string) => s.replace("{q}", num(r.qty)).replace("{c}", v.coin).replace("{a}", usd(v.capital)).replace("{v}", v.venue).replace("{l}", String(v.leverage)).replace("{m}", usd(r.margin));

  const field = (k: keyof typeof v, label: string, step = "any") => (
    <label className="block">
      <span className="text-xs font-semibold text-ink-3">{label}</span>
      <input type="number" step={step} value={v[k] as number} onChange={(e) => { setSel("custom"); setV((s) => ({ ...s, [k]: Number(e.target.value) })); }}
        className="mt-1 h-11 w-full rounded-xl border border-line bg-white/[0.03] px-3 font-mono text-sm text-ink focus:border-lime/50 focus:outline-none" />
    </label>
  );

  return (
    <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_1.1fr]">
      <div className="card p-5 hover:transform-none sm:p-6">
        <label className="block">
          <span className="text-xs font-semibold text-ink-3">{T.pickPool}</span>
          <select value={sel} onChange={(e) => pick(e.target.value)} className="mt-1 h-11 w-full rounded-xl border border-line bg-surface px-3 text-sm font-bold text-ink focus:border-lime/50 focus:outline-none">
            {options.map((o) => <option key={o.key} value={o.key}>{o.label}</option>)}
            <option value="custom">{T.custom}</option>
          </select>
        </label>
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
        {preset?.maxUsd && v.capital > preset.maxUsd && <p className="mt-3 text-xs font-semibold text-amber">max ≈ {usd(preset.maxUsd)}</p>}
      </div>

      <div className="space-y-4">
        <div className="card p-5 hover:transform-none sm:p-6">
          <h2 className="text-xs font-bold uppercase tracking-wider text-ink-3">{T.plan}</h2>
          <ol className="mt-3 space-y-2.5 text-sm">
            {[T.step1, T.step2, T.step3, T.step4, T.step5].map((s, i) => (
              <li key={i} className="flex gap-3"><span className="grid size-6 shrink-0 place-items-center rounded-md bg-lime/10 font-mono text-xs font-bold text-lime">{i + 1}</span><span className="text-ink-2">{fill(s)}</span></li>
            ))}
          </ol>
          <div className="mt-4 rounded-xl bg-white/[0.03] px-4 py-3 text-sm">
            {T.liq}: <span className="font-mono font-bold text-ink">${num(r.liq)}</span> <span className="text-ink-3">{T.liqUp.replace("{x}", `${((r.liq / v.price - 1) * 100).toFixed(0)}%`)}</span>
          </div>
        </div>
        <div className="card p-5 hover:transform-none sm:p-6">
          <dl className="space-y-2 text-sm">
            {[[T.capitalTotal, usd(r.total)], [T.rewards, `+${usd(r.rewards)}`], [T.fundingTotal, `${r.funding >= 0 ? "+" : ""}${usd(r.funding)}`], [T.costs, `−${usd(r.costs)}`]].map(([k, x]) => (
              <div key={k} className="flex justify-between gap-4"><dt className="text-ink-3">{k}</dt><dd className="font-mono font-bold">{x}</dd></div>
            ))}
            <div className="flex justify-between gap-4 border-t border-line pt-3 text-base"><dt className="font-bold">{T.net}</dt><dd className={`font-mono font-bold ${r.net >= 0 ? "text-lime" : "text-ink-3"}`}>{r.net >= 0 ? "+" : ""}{usd(r.net)}</dd></div>
            <div className="flex justify-between gap-4"><dt className="text-ink-3">{T.netApr}</dt><dd className="font-mono font-bold">{r.netApr.toFixed(1)}%</dd></div>
          </dl>
        </div>
        <p className="text-xs leading-relaxed text-ink-3">{T.hedgeWarn}</p>
      </div>
    </div>
  );
}
