"use client";
import { useState } from "react";
import type { Locale } from "@/lib/i18n";
import type { Promo } from "@/lib/types";

type M = NonNullable<Promo["meta"]>;
const STABLE = /^(USD|USDT|USDC|FDUSD|USD1|DAI)$/;

const TX: Record<Locale, {
  title: string; sub: string; input: Record<"trade" | "deposit" | "stake" | "hold" | "buy" | "apr" | "any", string>;
  short: (x: string) => string; passed: string; tier: (r: string) => string; next: (x: string, r: string) => string; upTo: (r: string) => string;
  share: string; fee: (x: string, pct: string) => string; net: (x: string) => string; netNeg: (x: string) => string; keep: string; keepVol: string;
  perDay: string; perMonth: string; untilEnd: string; note: string; days: (n: number) => string;
}> = {
  uk: {
    title: "🧮 Скільки отримаю я", sub: "Введіть свою суму — порахуємо за умовами акції.",
    input: { trade: "Я наторгую на $", deposit: "Я внесу депозит $", stake: "Я застейкаю $", hold: "Я триматиму $", buy: "Я куплю на $", apr: "Я покладу $", any: "Моя сума $" },
    short: (x) => `До порогу не вистачає ${x} — нагороди не буде.`, passed: "✓ Поріг пройдено.", tier: (r) => `Ваш рівень нагороди: ${r}`,
    next: (x, r) => `Ще ${x} — і наступний рівень: ${r}`, upTo: (r) => `Нагорода: до ${r} (залежить від інших учасників).`,
    share: "Нагорода ділиться між учасниками — точну суму біржа порахує після кінця акції.",
    fee: (x, pct) => `Комісія біржі за цей обсяг ≈ ${x} (${pct} — залежить від вашого VIP-рівня і типу ордера).`,
    net: (x) => `Чистими після комісії ≈ ${x}.`, netNeg: (x) => `⚠ Комісія більша за нагороду: ${x}. Це варто лише якщо ви й так торгуєте.`,
    keep: "Гроші лишаються вашими. Ризик — лише зміна ціни, якщо це не стейблкоїн.", keepVol: "Обсяг торгівлі — не витрата: ви купуєте і продаєте, витрачаєте лише комісію (і ризикуєте ціною під час угоди).",
    perDay: "за день", perMonth: "за 30 днів", untilEnd: "до кінця акції", note: "Оцінка за опублікованими умовами. Біржа може змінити правила — перевіряйте оригінал.",
    days: (n) => `${n} дн.`,
  },
  en: {
    title: "🧮 What would I get", sub: "Enter your amount — we'll work it out from the promo's rules.",
    input: { trade: "I'll trade $", deposit: "I'll deposit $", stake: "I'll stake $", hold: "I'll hold $", buy: "I'll buy for $", apr: "I'll put in $", any: "My amount $" },
    short: (x) => `${x} short of the entry threshold — no reward.`, passed: "✓ Threshold reached.", tier: (r) => `Your reward tier: ${r}`,
    next: (x, r) => `${x} more for the next tier: ${r}`, upTo: (r) => `Reward: up to ${r} (depends on other participants).`,
    share: "The reward is shared between participants — the exchange calculates the exact amount after the end.",
    fee: (x, pct) => `Exchange fee for this volume ≈ ${x} (${pct} — depends on your VIP level and order type).`,
    net: (x) => `Net after fees ≈ ${x}.`, netNeg: (x) => `⚠ Fees exceed the reward: ${x}. Only worth it if you trade anyway.`,
    keep: "The money stays yours. The only risk is the price moving, unless it's a stablecoin.", keepVol: "Trading volume isn't spent: you buy and sell, paying only fees (and price risk while in a trade).",
    perDay: "per day", perMonth: "per 30 days", untilEnd: "until the end", note: "Estimate from the published rules. The exchange may change them — check the original.",
    days: (n) => `${n} d`,
  },
  ru: {
    title: "🧮 Сколько получу я", sub: "Введите свою сумму — посчитаем по условиям акции.",
    input: { trade: "Я наторгую на $", deposit: "Я внесу депозит $", stake: "Я застейкаю $", hold: "Я буду держать $", buy: "Я куплю на $", apr: "Я положу $", any: "Моя сумма $" },
    short: (x) => `До порога не хватает ${x} — награды не будет.`, passed: "✓ Порог пройден.", tier: (r) => `Ваш уровень награды: ${r}`,
    next: (x, r) => `Ещё ${x} — и следующий уровень: ${r}`, upTo: (r) => `Награда: до ${r} (зависит от других участников).`,
    share: "Награда делится между участниками — точную сумму биржа посчитает после окончания акции.",
    fee: (x, pct) => `Комиссия биржи за этот объём ≈ ${x} (${pct} — зависит от вашего VIP-уровня и типа ордера).`,
    net: (x) => `Чистыми после комиссии ≈ ${x}.`, netNeg: (x) => `⚠ Комиссия больше награды: ${x}. Это стоит того, только если вы и так торгуете.`,
    keep: "Деньги остаются вашими. Риск — только изменение цены, если это не стейблкоин.", keepVol: "Объём торговли — не расход: вы покупаете и продаёте, тратите только комиссию (и рискуете ценой во время сделки).",
    perDay: "в день", perMonth: "за 30 дней", untilEnd: "до конца акции", note: "Оценка по опубликованным условиям. Биржа может изменить правила — проверяйте оригинал.",
    days: (n) => `${n} дн.`,
  },
};

const usd = (x: number) => `$${x.toLocaleString("en-US", { maximumFractionDigits: x < 10 ? 2 : 0 })}`;
const amt = (a: number, u: string) => (STABLE.test(u) ? usd(a) : `${a.toLocaleString("en-US", { maximumFractionDigits: 4 })} ${u}`);

/** "How much would I get" for one promo: threshold check, reward tier, exchange fees, net — or interest for APR promos. */
export function EarnCalc({ lang, m, endsAt, now }: { lang: Locale; m: M; endsAt?: number; now: number }) {
  const T = TX[lang];
  const kind = m.aprPct !== undefined ? "apr" : m.minEntry?.kind ?? (m.tiers?.length ? "trade" : "any");
  const start = m.minEntry?.amount ?? m.tiers?.[0]?.min ?? 1000;
  const [v, setV] = useState(start);

  const lines: Array<{ text: string; tone?: "good" | "bad" | "muted" }> = [];
  let big: string | undefined;

  if (m.aprPct !== undefined) {
    const day = (v * m.aprPct) / 100 / 365;
    const left = endsAt && endsAt > now ? Math.max(1, Math.round((endsAt - now) / 86400_000)) : undefined;
    big = `+${usd(day * 30)} ${T.perMonth}`;
    lines.push({ text: `+${usd(day)} ${T.perDay} · ${m.aprPct}% APR` });
    if (left) lines.push({ text: `+${usd(day * left)} ${T.untilEnd} (${T.days(left)})` });
    lines.push({ text: T.keep, tone: "muted" });
  } else {
    const min = m.minEntry?.amount ?? m.tiers?.[0]?.min ?? 0;
    let rewardUsd: number | undefined;
    if (v < min) {
      lines.push({ text: T.short(usd(min - v)), tone: "bad" });
    } else {
      lines.push({ text: T.passed, tone: "good" });
      const tiers = m.tiers ?? [];
      const mine = [...tiers].reverse().find((t) => t.min <= v);
      const next = tiers.find((t) => t.min > v);
      if (mine) {
        big = mine.reward;
        lines.push({ text: T.tier(mine.reward) });
        if (STABLE.test(mine.unit)) rewardUsd = mine.amount;
        if (next) lines.push({ text: T.next(usd(next.min - v), next.reward), tone: "muted" });
      } else if (m.perUser) {
        big = `≤ ${amt(m.perUser.amount, m.perUser.unit)}`;
        lines.push({ text: T.upTo(amt(m.perUser.amount, m.perUser.unit)) });
        rewardUsd = m.perUser.usd;
      } else {
        lines.push({ text: T.share, tone: "muted" });
      }
    }
    if (kind === "trade") {
      const rate = m.futures ? 0.0005 : 0.001;
      const fee = v * rate;
      lines.push({ text: T.fee(usd(fee), m.futures ? "0.05%" : "0.1%"), tone: "muted" });
      if (rewardUsd !== undefined && v >= min) {
        const net = rewardUsd - fee;
        lines.push(net >= 0 ? { text: T.net(usd(net)), tone: "good" } : { text: T.netNeg(`−${usd(-net)}`), tone: "bad" });
      }
      lines.push({ text: T.keepVol, tone: "muted" });
    } else if (kind === "deposit" || kind === "stake" || kind === "hold") {
      lines.push({ text: T.keep, tone: "muted" });
    }
  }

  return (
    <section className="card mt-4 p-5 hover:transform-none ring-1 ring-sky/20 sm:p-6">
      <h2 className="font-display text-xl font-semibold tracking-tight">{T.title}</h2>
      <p className="mt-1 text-xs text-ink-3">{T.sub}</p>
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <label className="flex h-12 items-center gap-2 rounded-xl border border-line bg-white/[0.03] px-3 focus-within:border-sky/50">
          <span className="text-sm font-semibold text-ink-3">{T.input[kind]}</span>
          <input type="number" min={0} step={50} value={v} onChange={(e) => setV(Math.max(0, Number(e.target.value) || 0))}
            className="w-28 bg-transparent font-mono text-xl font-bold text-ink focus:outline-none" />
        </label>
        <div className="flex gap-1.5">
          {[...new Set([start, start * 2, start * 10].map((x) => Math.round(x)))].filter((x) => x > 0).map((x) => (
            <button key={x} type="button" onClick={() => setV(x)} className={`h-8 rounded-lg px-2.5 font-mono text-xs font-bold ${v === x ? "bg-sky text-[#04121a]" : "bg-white/[0.05] text-ink-2 hover:text-ink"}`}>{usd(x)}</button>
          ))}
        </div>
        {big && <span className="ml-auto font-display text-2xl font-semibold text-lime">{big}</span>}
      </div>
      <ul className="mt-4 space-y-1.5 text-sm">
        {lines.map((l, i) => (
          <li key={i} className={l.tone === "good" ? "font-semibold text-lime" : l.tone === "bad" ? "font-semibold text-rose" : l.tone === "muted" ? "text-ink-3" : "text-ink"}>{l.text}</li>
        ))}
      </ul>
      {m.tiers && m.tiers.length > 1 && (
        <div className="mt-3 flex flex-wrap gap-1.5 text-xs font-mono">
          {m.tiers.map((t) => <span key={t.min} className={`rounded-md px-1.5 py-0.5 ${t.min <= v ? "bg-lime/10 text-lime" : "bg-white/5 text-ink-3"}`}>≥{usd(t.min)} → {t.reward}</span>)}
        </div>
      )}
      <p className="mt-3 text-xs text-ink-3">{T.note}</p>
    </section>
  );
}
