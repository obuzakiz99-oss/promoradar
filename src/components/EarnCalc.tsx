"use client";
import { useState } from "react";
import { nfLocale, num } from "@/lib/format";
import type { Locale } from "@/lib/i18n";
import type { Promo } from "@/lib/types";

type M = NonNullable<Promo["meta"]>;
const STABLE = /^(USD|USDT|USDC|FDUSD|USD1|DAI)$/;

const TX: Record<Locale, {
  title: string; sub: string; input: Record<"trade" | "deposit" | "stake" | "hold" | "buy" | "apr" | "any", string>;
  short: (x: string) => string; passed: string; tier: (r: string) => string; next: (x: string, r: string) => string; upTo: (r: string, shared: boolean) => string;
  share: string; fee: (x: string, pct: string) => string; net: (x: string) => string; netNeg: (x: string) => string; keep: string; keepLock: string; keepDual: string; keepFut: string; keepVol: string;
  perDay: string; perMonth: string; untilEnd: string; note: string; days: (n: number) => string;
}> = {
  uk: {
    title: "Скільки отримаю я", sub: "Введіть свою суму — порахуємо за умовами акції.",
    input: { trade: "Мій обсяг торгівлі, $", deposit: "Я внесу депозит $", stake: "Я застейкаю $", hold: "Я триматиму $", buy: "Я куплю на $", apr: "Я покладу $", any: "Моя сума $" },
    short: (x) => `До порогу не вистачає ${x} — нагороди не буде.`, passed: "✓ Поріг пройдено.", tier: (r) => `Ваш рівень нагороди: ${r}`,
    next: (x, r) => `Ще ${x} — і наступний рівень: ${r}`, upTo: (r, shared) => `Нагорода: до ${r} (${shared ? "залежить від інших учасників" : "залежить від того, які умови ви виконаєте"}).`,
    share: "Нагорода ділиться між учасниками — точну суму біржа порахує після кінця акції.",
    fee: (x, pct) => `Комісія біржі за цей обсяг ≈ ${x} (${pct} — залежить від вашого VIP-рівня і типу ордера).`,
    net: (x) => `Чистими після комісії ≈ ${x}.`, netNeg: (x) => `Комісія більша за нагороду: ${x}. Це варто лише якщо ви й так торгуєте.`,
    keep: "Гроші лишаються вашими. Ризик — лише зміна ціни, якщо це не стейблкоїн.", keepLock: "Гроші заблоковані на строк продукту: якщо забрати раніше, відсотки згорають. Плюс ризик ціни, якщо це не стейблкоїн.", keepDual: "Це не депозит: біржа може повернути вам іншу монету за гіршим курсом, ніж зараз.", keepFut: "Ф'ючерси з плечем: можна втратити більше, ніж принесе нагорода (ліквідація). Торгуйте сумою, яку не шкода.", keepVol: "Обсяг торгівлі — не витрата: ви купуєте і продаєте, витрачаєте лише комісію (і ризикуєте ціною під час угоди).",
    perDay: "за день", perMonth: "за 30 днів", untilEnd: "до кінця акції", note: "Оцінка за опублікованими умовами. Біржа може змінити правила — перевіряйте оригінал.",
    days: (n) => `${n} дн.`,
  },
  en: {
    title: "What would I get", sub: "Enter your amount — we'll work it out from the promo's rules.",
    input: { trade: "I'll trade $", deposit: "I'll deposit $", stake: "I'll stake $", hold: "I'll hold $", buy: "I'll buy for $", apr: "I'll put in $", any: "My amount $" },
    short: (x) => `${x} short of the entry threshold — no reward.`, passed: "✓ Threshold reached.", tier: (r) => `Your reward tier: ${r}`,
    next: (x, r) => `${x} more for the next tier: ${r}`, upTo: (r, shared) => `Reward: up to ${r} (${shared ? "depends on other participants" : "depends on which tasks you complete"}).`,
    share: "The reward is shared between participants — the exchange calculates the exact amount after the end.",
    fee: (x, pct) => `Exchange fee for this volume ≈ ${x} (${pct} — depends on your VIP level and order type).`,
    net: (x) => `Net after fees ≈ ${x}.`, netNeg: (x) => `Fees exceed the reward: ${x}. Only worth it if you trade anyway.`,
    keep: "The money stays yours. The only risk is the price moving, unless it's a stablecoin.", keepLock: "The money is locked for the product's term: take it out early and the interest is lost. Plus price risk unless it's a stablecoin.", keepDual: "This is not a deposit: the exchange may pay you back in the other coin at a worse rate than now.", keepFut: "Leveraged futures: you can lose more than the reward pays (liquidation). Trade only what you can afford to lose.", keepVol: "Trading volume isn't spent: you buy and sell, paying only fees (and price risk while in a trade).",
    perDay: "per day", perMonth: "per 30 days", untilEnd: "until the end", note: "Estimate from the published rules. The exchange may change them — check the original.",
    days: (n) => `${n} d`,
  },
  ru: {
    title: "Сколько получу я", sub: "Введите свою сумму — посчитаем по условиям акции.",
    input: { trade: "Мой объём торговли, $", deposit: "Я внесу депозит $", stake: "Я застейкаю $", hold: "Я буду держать $", buy: "Я куплю на $", apr: "Я положу $", any: "Моя сумма $" },
    short: (x) => `До порога не хватает ${x} — награды не будет.`, passed: "✓ Порог пройден.", tier: (r) => `Ваш уровень награды: ${r}`,
    next: (x, r) => `Ещё ${x} — и следующий уровень: ${r}`, upTo: (r, shared) => `Награда: до ${r} (${shared ? "зависит от других участников" : "зависит от того, какие условия вы выполните"}).`,
    share: "Награда делится между участниками — точную сумму биржа посчитает после окончания акции.",
    fee: (x, pct) => `Комиссия биржи за этот объём ≈ ${x} (${pct} — зависит от вашего VIP-уровня и типа ордера).`,
    net: (x) => `Чистыми после комиссии ≈ ${x}.`, netNeg: (x) => `Комиссия больше награды: ${x}. Это стоит того, только если вы и так торгуете.`,
    keep: "Деньги остаются вашими. Риск — только изменение цены, если это не стейблкоин.", keepLock: "Деньги заблокированы на срок продукта: если забрать раньше, проценты сгорают. Плюс риск цены, если это не стейблкоин.", keepDual: "Это не депозит: биржа может вернуть вам другую монету по худшему курсу, чем сейчас.", keepFut: "Фьючерсы с плечом: можно потерять больше, чем принесёт награда (ликвидация). Торгуйте суммой, которую не жалко.", keepVol: "Объём торговли — не расход: вы покупаете и продаёте, тратите только комиссию (и рискуете ценой во время сделки).",
    perDay: "в день", perMonth: "за 30 дней", untilEnd: "до конца акции", note: "Оценка по опубликованным условиям. Биржа может изменить правила — проверяйте оригинал.",
    days: (n) => `${n} дн.`,
  },
};

// number format follows the page language (audit 12.11)
const fmtOf = (lc: string) => {
  const usd = (x: number) => `$${x.toLocaleString(lc, { maximumFractionDigits: x < 10 ? 2 : 0 })}`;
  return { usd, amt: (a: number, u: string) => (STABLE.test(u) ? usd(a) : `${a.toLocaleString(lc, { maximumFractionDigits: 4 })} ${u}`) };
};

/** The reward the minimum-entry rule line itself names ("reach 120,000 USDx … can receive 2 USDT"). */
// audit 27.11 (accuracy): on /uk and /ru the rule line is already translated ("можуть отримати 2 USDT") — the English-only
// match never fired there and the Gate CFD minimum still showed "≤ $962"
const entryPay = (t?: string): number | undefined => {
  const x = t?.match(/(?:\b(?:receive|get|earn|win|claim|rewarded with)|отрима\p{L}*|получ\p{L}*|виграт\p{L}*|выигра\p{L}*)\s+(?:a\s+|до\s+)?\$?(\d[\d,  ]*(?:[.,]\d+)?)\s*(?:USDT|USDC|USD)\b/iu);
  if (!x) return undefined;
  const raw = x[1].trim().replace(/[  ]/g, "").replace(/,(?=\d{3}(\D|$))/g, "").replace(",", ".");
  const n = Number(raw);
  return Number.isFinite(n) ? n : undefined;
};

/** "How much would I get" for one promo: threshold check, reward tier, exchange fees, net — or interest for APR promos. */
/** `lock`: a fixed-term / locked product or Dual Investment (read from the title and rules on the page) — changes the risk line. */
export function EarnCalc({ lang, m, endsAt, now, lock }: { lang: Locale; m: M; endsAt?: number; now: number; lock?: "lock" | "dual" | "futures" }) {
  const T = TX[lang];
  const { usd, amt } = fmtOf(nfLocale(lang));
  const kind = m.aprPct !== undefined ? "apr" : m.minEntry?.kind ?? (m.tiers?.length ? "trade" : "any");
  // audit 27.11 (sections): an Earn APR took a futures-volume rule as its minimum deposit (Ourbit Aave: $50 000), and a
  // 0.01 USDT minimum made every figure "$0" with no quick buttons — the APR minimum is a deposit-type rule of $100+
  const aprMin = m.aprPct !== undefined && m.minEntry && m.minEntry.kind !== "trade" ? m.minEntry : undefined;
  const raw0 = kind === "apr" ? aprMin?.amount : m.minEntry?.amount ?? m.tiers?.[0]?.min;
  const start = raw0 !== undefined && raw0 >= (kind === "apr" ? 100 : 1) ? raw0 : 1000;
  const [v, setV] = useState(start);

  const lines: Array<{ text: string; tone?: "good" | "bad" | "muted" }> = [];
  let big: string | undefined;

  if (m.aprPct !== undefined && aprMin && v < aprMin.amount) {
    // audit 23.11 (round 5): KuCoin KCUSD showed "+$5,75 for 30 days" on $1 000 although no bonus is paid below 50 000 USDT
    lines.push({ text: T.short(usd(aprMin.amount - v)), tone: "bad" });
  } else if (m.aprPct !== undefined) {
    const day = (v * m.aprPct) / 100 / 365;
    const left = m.aprDays ?? (endsAt && endsAt > now ? Math.max(1, Math.round((endsAt - now) / 86400_000)) : undefined);
    // boosted promo rates (> 50 %) last days and apply to a capped amount — show per day, not "a month" (audit 14.11: +$205)
    big = `${m.aprUpTo ? "≤ " : "+"}${m.aprPct > 50 ? `${usd(day)} ${T.perDay}` : `${usd(day * 30)} ${T.perMonth}`}`;
    if (m.aprUpTo) lines.push({ text: ({ uk: "Це максимальна ставка («до»): базова зазвичай значно нижча, решта — за умови (обсяг, рівень, позиція).", en: "This is the maximum (“up to”) rate: the base is usually much lower, the rest depends on conditions.", ru: "Это максимальная ставка («до»): базовая обычно значительно ниже, остальное — при условиях." } as const)[lang], tone: "bad" });
    if (m.aprPct > 50) lines.push({ text: ({ uk: "Підвищена ставка зазвичай діє кілька днів і на обмежену суму — строк і ліміт дивіться в умовах.", en: "A boosted rate usually lasts a few days and covers a capped amount — check the term and limit in the rules.", ru: "Повышенная ставка обычно действует несколько дней и на ограниченную сумму — срок и лимит смотрите в условиях." } as const)[lang], tone: "bad" });
    lines.push({ text: m.aprPct > 50 ? `${num(m.aprPct, lang)}% APR` : `+${usd(day)} ${T.perDay} · ${num(m.aprPct, lang)}% APR` });
    if (left && m.aprPct <= 50) lines.push({ text: m.aprDays
      ? `+${usd(day * left)} ${({ uk: "загалом", en: "in total", ru: "всего" } as const)[lang]} (${T.days(left)}, ${num(m.aprPct * left / 365, lang)}% ${({ uk: "від суми", en: "of the amount", ru: "от суммы" } as const)[lang]})`
      : `+${usd(day * left)} ${T.untilEnd} (${T.days(left)})` });
    lines.push({ text: lock === "futures" ? T.keepFut : lock === "dual" ? T.keepDual : lock === "lock" ? T.keepLock : T.keep, tone: lock ? "bad" : "muted" });
  } else {
    // audit 23.11: $100 below the first tier (Toobit: >= $1 000 -> 60 USDT) fell through to the top prize "<= $12 000" --
    // the first reward tier is the real threshold when it is above the stated minimum
    const min = Math.max(m.minEntry?.amount ?? 0, m.tiers?.[0]?.min ?? 0);
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
      } else if (m.perUser && entryPay(m.minEntry?.text) !== undefined && entryPay(m.minEntry?.text)! < m.perUser.amount && v < (m.minEntry?.amount ?? 0) * 2) {
        // weekly audit 26.11: Gate CFD at the 120,000 minimum showed "≤ $962" — the rules pay 2 USDT there; 962 is the top tier
        const e = entryPay(m.minEntry?.text)!;
        big = amt(e, "USDT");
        lines.push({ text: ({ uk: `На мінімальному порозі за правилами — ${amt(e, "USDT")}; до ${amt(m.perUser.amount, m.perUser.unit)} — лише за значно більший обсяг.`, en: `At the minimum the rules pay ${amt(e, "USDT")}; up to ${amt(m.perUser.amount, m.perUser.unit)} only for a much bigger volume.`, ru: `На минимальном пороге по правилам — ${amt(e, "USDT")}; до ${amt(m.perUser.amount, m.perUser.unit)} — только за значительно больший объём.` } as const)[lang] });
        rewardUsd = e;
      } else if (m.perUser) {
        big = `≤ ${amt(m.perUser.amount, m.perUser.unit)}`;
        // audit 18.11: a fixed tier ladder (Bitget 50 / 400 / 6,000) was explained as "depends on other participants"
        const shared = !m.value || (["pool_share", "top_n", "lucky_draw", "first_n", "unknown"] as string[]).includes(m.value.mech);
        lines.push({ text: T.upTo(amt(m.perUser.amount, m.perUser.unit), shared) });
        rewardUsd = m.perUser.usd;
      } else {
        lines.push({ text: T.share, tone: "muted" });
      }
    }
    if (kind === "trade") {
      const rate = m.futures ? 0.0005 : 0.001;
      const fee = v * rate;
      lines.push({ text: T.fee(usd(fee), `${num(rate * 100, lang)}%`) /* audit 27.11 (evening): "0.05%" stayed English in uk/ru */, tone: "muted" });
      if (rewardUsd !== undefined && v >= min) {
        const net = rewardUsd - fee;
        lines.push(net >= 0 ? { text: T.net(usd(net)), tone: "good" } : { text: T.netNeg(`−${usd(-net)}`), tone: "bad" });
      }
      lines.push(lock === "futures" ? { text: T.keepFut, tone: "bad" } : { text: T.keepVol, tone: "muted" });
    } else if (kind === "deposit" || kind === "stake" || kind === "hold") {
      lines.push(lock === "futures" ? { text: T.keepFut, tone: "bad" } : { text: T.keep, tone: "muted" });
    }
  }

  return (
    <section className="card mt-4 p-5 hover:transform-none ring-1 ring-sky/20 sm:p-6">
      <h2 className="font-display text-xl font-semibold tracking-tight">{T.title}</h2>
      <p className="mt-1 text-xs text-ink-3">{T.sub}</p>
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <label className="flex h-12 items-center gap-2 rounded-xl border border-line bg-white/[0.03] px-3 focus-within:border-sky/50">
          <span className="text-sm font-semibold text-ink-3">{T.input[kind]}</span>
          <input type="number" min={0} step={50} value={v || ""} placeholder="0" onChange={(e) => setV(Math.max(0, Number(e.target.value) || 0))}
            className="w-28 bg-transparent font-mono text-xl font-bold text-ink focus:outline-none" />
        </label>
        <div className="flex gap-1.5">
          {[...new Set([start, start * 2, start * 10].map((x) => Math.round(x)))].filter((x) => x > 0).map((x) => (
            <button key={x} type="button" onClick={() => setV(x)} className={`h-8 rounded-lg px-2.5 font-mono text-xs font-bold ${v === x ? "bg-sky text-on-accent" : "bg-white/[0.05] text-ink-2 hover:text-ink"}`}>{usd(x)}</button>
          ))}
        </div>
        {big && <span className="ml-auto font-display text-2xl font-semibold text-lime">{big}</span>}
      </div>
      <ul className="mt-4 space-y-1.5 text-sm">
        {lines.map((l, i) => (
          <li key={i} className={l.tone === "good" ? "font-semibold text-lime" : l.tone === "bad" ? "font-semibold text-rose" : l.tone === "muted" ? "text-ink-3" : "text-ink"}>{l.text}</li>
        ))}
      </ul>
      {m.aprPct === undefined && m.tiers && m.tiers.length > 1 && (
        <div className="mt-3 flex flex-wrap gap-1.5 text-xs font-mono">
          {m.tiers.map((t) => <span key={t.min} className={`rounded-md px-1.5 py-0.5 ${t.min <= v ? "bg-lime/10 text-lime" : "bg-white/5 text-ink-3"}`}>≥{usd(t.min)} → {t.reward}</span>)}
        </div>
      )}
      <p className="mt-3 text-xs text-ink-3">{T.note}</p>
    </section>
  );
}
