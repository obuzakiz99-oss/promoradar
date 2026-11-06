"use client";
import { useMemo, useState } from "react";
import type { Locale } from "@/lib/i18n";
import type { Venue } from "@/lib/types";
import type { Backtest, Extra, PlanData } from "@/lib/money";
import { VenueLogo } from "./VenueLogo";

const TX: Record<Locale, {
  planTitle: string; planSub: string; have: string; lp: (stake: string, token: string, ex: string) => string; forDays: (d: number) => string; perMonth: string;
  earn: (coin: string, ex: string) => string; rest: string; bonus: string; total: string; go: string; none: string;
  btTitle: string; btSub: (d: number) => string; would: string; inLp: string; inEarn: (apr: string) => string; top: string; held: (v: string) => string; note: string; noBt: string; yearly: string; extraTitle: string; bonusTile: string; welcome: string; newEarn: string; withExtras: string; extraNote: string;
}> = {
  uk: {
    planTitle: "Ваш план на сьогодні", planSub: "Введіть суму — покажемо, куди її покласти просто зараз і скільки це принесе.", have: "У мене є",
    lp: (s, t, e) => `Launchpool: стейк ${s} → ${t} на ${e}`, forDays: (d) => `за ${d} дн.`, perMonth: "/ місяць",
    earn: (c, e) => `Earn ${c} на ${e} — забрати будь-коли`, rest: "решта суми", bonus: "Бонус новачку", total: "Разом ≈ за 30 днів", go: "Відкрити", none: "Зараз немає простих варіантів — загляньте пізніше.",
    btTitle: "Скільки ви могли б заробити", btSub: (d) => `Якби ${d} днів тому ви тримали суму в найкращих Launchpool на стейблкоїнах (до ліміту кожного пулу), а решту — в Earn USDT, і одразу продавали нагороди:`,
    would: "зараз мали б", inLp: "з Launchpool", inEarn: (a) => `з Earn USDT (${a}, за поточною ставкою)`, top: "Найприбутковіші пули", held: (v) => `Якби тримали отримані токени, а не продавали: ${v}`,
    note: "Розрахунок на реальних даних бірж за фінальним APR кожного пулу (він нижчий за стартовий — тобто оцінка обережна). Минулий результат не гарантує майбутнього.", noBt: "Поки замало даних для розрахунку.", yearly: "річних", extraTitle: "+ Разові бонуси новачкам (доступні зараз)", bonusTile: "бонуси новачкам", welcome: "Бонус за реєстрацію", newEarn: "Підвищена ставка для нових", withExtras: "Разом з бонусами", extraNote: "Отримати можна один раз на кожній біржі; бонус часто видають купоном. Це поточні пропозиції бірж, а не гарантія.",
  },
  en: {
    planTitle: "Your plan for today", planSub: "Enter an amount — we'll show where to put it right now and what it brings.", have: "I have",
    lp: (s, t, e) => `Launchpool: stake ${s} → ${t} on ${e}`, forDays: (d) => `in ${d} d`, perMonth: "/ month",
    earn: (c, e) => `Earn ${c} on ${e} — withdraw any time`, rest: "the rest", bonus: "New-user bonus", total: "Total ≈ in 30 days", go: "Open", none: "No simple options right now — check back later.",
    btTitle: "What you could have earned", btSub: (d) => `If ${d} days ago you had kept the amount in the best stablecoin Launchpools (up to each pool's cap) and the rest in USDT Earn, selling rewards right away:`,
    would: "you'd now have", inLp: "from Launchpools", inEarn: (a) => `from USDT Earn (${a}, at today's rate)`, top: "Most profitable pools", held: (v) => `If you had kept the reward tokens instead of selling: ${v}`,
    note: "Calculated on real exchange data using each pool's final APR (lower than the launch APR — a cautious estimate). Past results don't guarantee future ones.", noBt: "Not enough data yet.", yearly: "a year", extraTitle: "+ One-time newcomer bonuses (available now)", bonusTile: "newcomer bonuses", welcome: "Sign-up bonus", newEarn: "Boosted new-user rate", withExtras: "Total with bonuses", extraNote: "Each can be claimed once per exchange; bonuses are often vouchers. These are the exchanges' current offers, not a guarantee.",
  },
  ru: {
    planTitle: "Ваш план на сегодня", planSub: "Введите сумму — покажем, куда её положить прямо сейчас и сколько это принесёт.", have: "У меня есть",
    lp: (s, t, e) => `Launchpool: стейк ${s} → ${t} на ${e}`, forDays: (d) => `за ${d} дн.`, perMonth: "/ месяц",
    earn: (c, e) => `Earn ${c} на ${e} — забрать в любой момент`, rest: "остаток суммы", bonus: "Бонус новичку", total: "Итого ≈ за 30 дней", go: "Открыть", none: "Сейчас нет простых вариантов — загляните позже.",
    btTitle: "Сколько вы могли бы заработать", btSub: (d) => `Если бы ${d} дней назад вы держали сумму в лучших Launchpool на стейблкоинах (до лимита каждого пула), а остаток — в Earn USDT, и сразу продавали награды:`,
    would: "сейчас имели бы", inLp: "с Launchpool", inEarn: (a) => `с Earn USDT (${a}, по текущей ставке)`, top: "Самые прибыльные пулы", held: (v) => `Если бы держали полученные токены, а не продавали: ${v}`,
    note: "Расчёт на реальных данных бирж по финальному APR каждого пула (он ниже стартового — то есть оценка осторожная). Прошлый результат не гарантирует будущего.", noBt: "Пока мало данных для расчёта.", yearly: "годовых", extraTitle: "+ Разовые бонусы новичкам (доступны сейчас)", bonusTile: "бонусы новичкам", welcome: "Бонус за регистрацию", newEarn: "Повышенная ставка для новых", withExtras: "Итого с бонусами", extraNote: "Получить можно один раз на каждой бирже; бонус часто выдают купоном. Это текущие предложения бирж, а не гарантия.",
  },
};

const PRESETS = [100, 1000, 10000];
const usd = (x: number, d = x < 10 ? 2 : 0) => `$${x.toLocaleString("en-US", { maximumFractionDigits: d, minimumFractionDigits: 0 })}`;
const sgn = (x: number) => `${x >= 0 ? "+" : "−"}${usd(Math.abs(x))}`;

export function MoneyBlock({ lang, plan, bt, venues, extras = [] }: { lang: Locale; plan: PlanData; bt?: Backtest; venues: Record<string, Venue>; extras?: Extra[] }) {
  const T = TX[lang];
  const [amount, setAmount] = useState(1000);
  const [btAmount, setBtAmount] = useState(1000);

  // highest APR first: stable Launchpools up to their caps, plain Earn for whatever is left (or instead, if it pays more)
  const rows = useMemo(() => {
    type Opt = { apr: number; cap: number; row: (put: number) => { key: string; venue: Venue; text: string; put: number; income: number; when: string; url: string } };
    const opts: Opt[] = plan.lp.map((p) => {
      const d = Math.min(30, p.daysLeft);
      return { apr: p.apr, cap: p.cap ?? Infinity, row: (put: number) => ({ key: `lp:${p.exchange}:${p.token}`, venue: venues[p.exchange], text: T.lp(p.stake, p.token, venues[p.exchange]?.name ?? p.exchange), put, income: (put * p.apr) / 100 * (d / 365), when: `${p.apr.toFixed(1)}% · ${T.forDays(d)}`, url: p.url }) };
    });
    if (plan.earn) {
      const e = plan.earn;
      opts.push({ apr: e.apr, cap: e.cap ?? Infinity, row: (put: number) => ({ key: "earn", venue: venues[e.exchange], text: T.earn(e.coin, venues[e.exchange]?.name ?? e.exchange), put, income: (put * e.apr) / 100 / 12, when: `${e.apr.toFixed(1)}% · ${T.forDays(30)}`, url: e.url }) });
    }
    let left = amount;
    const out = [];
    for (const o of opts.sort((a, b) => b.apr - a.apr)) {
      if (left <= 0) break;
      const put = Math.min(left, o.cap);
      out.push(o.row(put));
      left -= put;
    }
    return out;
  }, [amount, plan, venues, T]);
  const total = rows.reduce((s, r) => s + r.income, 0);
  const res = bt ? bt.results.find((r) => r.amount === btAmount) ?? bt.results[0] : undefined;
  // one-time newcomer bonuses on top (new-user Earn pays only on what you put in, up to its cap)
  const bonusAdd = res ? extras.reduce((s, x) => s + (x.kind === "newEarn" && x.cap ? x.usd * Math.min(1, res.amount / x.cap) : x.usd), 0) : 0;
  const btTotal = res ? res.profit + bonusAdd : 0;

  const Presets = ({ v, set }: { v: number; set: (n: number) => void }) => (
    <div className="flex gap-1.5">
      {PRESETS.map((p) => <button key={p} type="button" onClick={() => set(p)} className={`h-8 rounded-lg px-2.5 font-mono text-xs font-bold ${v === p ? "bg-lime text-[#0b0f05]" : "bg-white/[0.05] text-ink-2 hover:text-ink"}`}>{usd(p)}</button>)}
    </div>
  );

  return (
    <section className={`mx-auto grid max-w-7xl gap-4 px-4 pt-6 sm:px-6 ${bt ? "lg:grid-cols-2" : ""}`}>
      {/* today's plan */}
      <div className="card p-5 hover:transform-none sm:p-6" style={{ background: "linear-gradient(135deg, rgb(200 255 61 / 0.07), transparent 55%), var(--color-surface)" }}>
        <h2 className="font-display text-xl font-semibold tracking-tight sm:text-2xl">🎯 {T.planTitle}</h2>
        <p className="mt-1 text-sm text-ink-3">{T.planSub}</p>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <label className="flex h-12 items-center gap-2 rounded-xl border border-line bg-white/[0.03] px-3 focus-within:border-lime/50">
            <span className="text-sm font-semibold text-ink-3">{T.have} $</span>
            <input type="number" min={10} step={50} value={amount} onChange={(e) => setAmount(Math.max(0, Number(e.target.value) || 0))} className="w-28 bg-transparent font-mono text-xl font-bold text-ink focus:outline-none" />
          </label>
          <Presets v={amount} set={setAmount} />
        </div>
        {rows.length === 0 ? <p className="mt-5 text-sm text-ink-3">{T.none}</p> : (
          <ol className="mt-5 space-y-2">
            {rows.map((r, i) => (
              <li key={r.key}>
                <a href={r.url} target="_blank" rel="noopener" className="flex items-center gap-3 rounded-xl border border-line bg-white/[0.02] px-3 py-2.5 hover:border-lime/40">
                  <span className="grid size-6 shrink-0 place-items-center rounded-md bg-lime/10 font-mono text-xs font-bold text-lime">{i + 1}</span>
                  {r.venue && <VenueLogo v={r.venue} size={28} rounded="rounded-lg" />}
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-bold">{r.text}</span>
                    <span className="block font-mono text-[11px] text-ink-3">{usd(r.put)} · {r.when}</span>
                  </span>
                  <span className="shrink-0 font-mono text-sm font-bold text-lime">+{usd(r.income)}</span>
                </a>
              </li>
            ))}
            {plan.bonus && (
              <li>
                <a href={plan.bonus.href} className="flex items-center gap-3 rounded-xl border border-dashed border-line-2 px-3 py-2.5 hover:border-lime/40">
                  <span className="grid size-6 shrink-0 place-items-center rounded-md bg-amber/10 text-xs">🎁</span>
                  <VenueLogo v={plan.bonus.venue} size={28} rounded="rounded-lg" />
                  <span className="min-w-0 flex-1"><span className="block text-[11px] font-bold text-amber">{T.bonus}</span><span className="block truncate text-sm font-semibold">{plan.bonus.title}</span></span>
                  {plan.bonus.label && <span className="shrink-0 font-mono text-xs font-bold text-amber">{plan.bonus.label}</span>}
                </a>
              </li>
            )}
          </ol>
        )}
        {rows.length > 0 && (
          <div className="mt-4 flex items-baseline justify-between border-t border-line pt-3">
            <span className="text-sm font-semibold text-ink-2">{T.total}</span>
            <span className="font-display text-2xl font-semibold text-lime">+{usd(total)}</span>
          </div>
        )}
      </div>

      {/* backtest — removed from the home page 06.11 (user: "$50 за 3 місяці це смішно"); kept for possible reuse */}
      {bt && res && (
      <div className="card p-5 hover:transform-none sm:p-6">
        <h2 className="font-display text-xl font-semibold tracking-tight sm:text-2xl">💰 {T.btTitle}</h2>
        <p className="mt-1 text-sm text-ink-3">{T.btSub(bt.days)}</p>
        {!res || bt.poolsUsed === 0 ? <p className="mt-5 text-sm text-ink-3">{T.noBt}</p> : (
          <>
            <div className="mt-4"><Presets v={btAmount} set={setBtAmount} /></div>
            <div className="mt-5 flex flex-wrap items-end gap-x-4 gap-y-1">
              <span className="font-mono text-lg text-ink-3">{usd(res.amount)} →</span>
              <span className="font-display text-4xl font-semibold text-gradient">{usd(res.amount + btTotal)}</span>
              <span className="font-mono text-sm font-bold text-lime">{sgn(btTotal)} · {((btTotal / res.amount) * 100).toFixed(1)}%</span>
            </div>
            <div className="mt-1 text-xs text-ink-3">{T.would}</div>
            <dl className={`mt-4 grid gap-2 text-sm ${bonusAdd > 0 ? "grid-cols-3" : "grid-cols-2"}`}>
              <div className="rounded-xl bg-white/[0.03] px-3 py-2"><dt className="text-[11px] font-semibold text-ink-3">{T.inLp}</dt><dd className="font-mono font-bold">+{usd(res.lpPart)}</dd></div>
              <div className="rounded-xl bg-white/[0.03] px-3 py-2"><dt className="text-[11px] font-semibold text-ink-3">{T.inEarn(`${bt.idleApr.toFixed(1)}%`)}</dt><dd className="font-mono font-bold">+{usd(res.idlePart)}</dd></div>
              {bonusAdd > 0 && <div className="rounded-xl bg-lime/[0.08] px-3 py-2"><dt className="text-[11px] font-semibold text-lime">{T.bonusTile}</dt><dd className="font-mono font-bold text-lime">+{usd(bonusAdd)}</dd></div>}
            </dl>
            {res.pools.length > 0 && (
              <div className="mt-4">
                <div className="text-[11px] font-bold uppercase tracking-wider text-ink-3">{T.top}</div>
                <ul className="mt-2 space-y-1.5">
                  {res.pools.slice(0, 3).map((p) => (
                    <li key={`${p.exchange}:${p.token}:${p.start}`} className="flex items-center gap-2 text-sm">
                      {venues[p.exchange] && <VenueLogo v={venues[p.exchange]} size={20} rounded="rounded-md" />}
                      <span className="font-semibold">{p.stake} → {p.token}</span>
                      <span className="text-xs text-ink-3">{new Date(p.start).toLocaleDateString(lang === "en" ? "en-GB" : lang === "ru" ? "ru-RU" : "uk-UA", { day: "numeric", month: "short" })} · {p.apr.toFixed(1)}%</span>
                      <span className="ml-auto font-mono text-xs font-bold text-lime">+{usd(p.earned)}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {extras.length > 0 && (() => {
              // new-user Earn only pays on what you actually put in (up to its cap)
              const ex = extras.map((x) => ({ ...x, got: x.kind === "newEarn" && x.cap ? x.usd * Math.min(1, res.amount / x.cap) : x.usd }));
              const add = ex.reduce((s, x) => s + x.got, 0);
              return (
                <div className="mt-4 rounded-xl border border-lime/25 bg-lime/[0.05] p-3">
                  <div className="text-[11px] font-bold uppercase tracking-wider text-lime">{T.extraTitle}</div>
                  <ul className="mt-2 space-y-1.5">
                    {ex.map((x) => (
                      <li key={x.key}>
                        <a href={x.url} {...(x.url.startsWith("http") ? { target: "_blank", rel: "noopener" } : {})} className="flex items-center gap-2 text-sm hover:text-lime">
                          {venues[x.exchange] && <VenueLogo v={venues[x.exchange]} size={20} rounded="rounded-md" />}
                          <span className="min-w-0 flex-1 truncate"><span className="font-semibold">{x.kind === "welcome" ? T.welcome : T.newEarn}</span> <span className="text-xs text-ink-3">· {x.title}</span></span>
                          <span className="shrink-0 font-mono text-xs font-bold text-lime">+{usd(x.got)}</span>
                        </a>
                      </li>
                    ))}
                  </ul>
                  <div className="mt-3 flex flex-wrap items-baseline justify-between gap-2 border-t border-lime/20 pt-2">
                    <span className="text-xs font-semibold text-ink-2">{T.withExtras}</span>
                    <span className="font-mono text-sm font-bold text-lime">{usd(res.amount)} → {usd(res.amount + res.profit + add)} <span className="text-ink-3">({sgn(res.profit + add)})</span></span>
                  </div>
                  <p className="mt-1.5 text-[11px] leading-relaxed text-ink-3">{T.extraNote}</p>
                </div>
              );
            })()}
            {res.heldDelta !== undefined && Math.abs(res.heldDelta) >= 0.01 && (
              <p className="mt-4 text-xs font-semibold text-ink-2">{T.held(`${sgn(res.lpPart + res.heldDelta + res.idlePart)} ${res.heldDelta < 0 ? "↓" : "↑"}`)}</p>
            )}
            <p className="mt-3 text-[11px] leading-relaxed text-ink-3">{T.note}</p>
          </>
        )}
      </div>
      )}
    </section>
  );
}