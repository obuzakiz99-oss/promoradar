import type { Promo } from "@/lib/types";
import type { Locale } from "@/lib/i18n";
import { compactUsd, money, num } from "@/lib/format";
import { FORM_BADGE } from "@/lib/payout-i18n";

/**
 * "Коротко" — three plain lines at the top of a promo page (owner 27.11: make the site easier for people who don't know
 * crypto): what you get, what to do, how risky. The full rules, table and calculator stay below for whoever wants them.
 */
type M = NonNullable<Promo["meta"]>;
const TX: Record<Locale, {
  h: string; get: string; todo: string; risk: string; until: (d: string) => string;
  approx: (x: string) => string; upTo: (x: string) => string; apr: (x: string) => string; depends: string;
  act: Record<"trade" | "deposit" | "stake" | "hold" | "buy", (a: string) => string>; free: string; ref: string; earn: string; comp: string; other: string;
  hi: string; mid: string; low: string; lowStable: string; price: string;
}> = {
  uk: {
    h: "Коротко", get: "Що отримаєте", todo: "Що зробити", risk: "Ризик", until: (d) => `до ${d}`,
    approx: (x) => `реально ≈ ${x}`, upTo: (x) => `до ${x} на людину`, apr: (x) => `${x}% річних на вашу суму`, depends: "залежить від умов — дивіться нижче",
    act: { trade: (a) => `зареєструватися й наторгувати від ${a}`, deposit: (a) => `зареєструватися й поповнити рахунок від ${a}`, stake: (a) => `зареєструватися й покласти від ${a}`, hold: (a) => `зареєструватися й тримати від ${a} на рахунку`, buy: (a) => `зареєструватися й купити від ${a}` },
    free: "зареєструватися й виконати прості завдання — без депозиту", ref: "запросити друзів за своїм посиланням", earn: "покласти монети в Earn і чекати — відсотки капають щодня", comp: "торгувати: нагороду визначає місце в рейтингу", other: "виконати умови акції (кроки нижче)",
    hi: "Високий: ф'ючерси або плече — можна втратити більше, ніж отримаєте", mid: "Середній: треба торгувати, комісії з'їдають частину нагороди", low: "Низький: ф'ючерсів і плеча не потрібно", lowStable: "Низький: гроші лишаються у стейблкоїні (≈ $1)", price: "Середній: ціна самої монети може впасти сильніше, ніж принесуть відсотки",
  },
  en: {
    h: "In short", get: "What you get", todo: "What to do", risk: "Risk", until: (d) => `until ${d}`,
    approx: (x) => `realistic ≈ ${x}`, upTo: (x) => `up to ${x} per person`, apr: (x) => `${x}% a year on your amount`, depends: "depends on the conditions — see below",
    act: { trade: (a) => `sign up and trade at least ${a}`, deposit: (a) => `sign up and deposit at least ${a}`, stake: (a) => `sign up and stake at least ${a}`, hold: (a) => `sign up and hold at least ${a}`, buy: (a) => `sign up and buy at least ${a}` },
    free: "sign up and do simple tasks — no deposit", ref: "invite friends with your link", earn: "put coins in Earn and wait — interest every day", comp: "trade: your leaderboard place decides the reward", other: "meet the promo's conditions (steps below)",
    hi: "High: futures or leverage — you can lose more than you get", mid: "Medium: you have to trade, fees eat part of the reward", low: "Low: no futures or leverage needed", lowStable: "Low: your money stays in a stablecoin (≈ $1)", price: "Medium: the coin's own price can fall more than the interest brings",
  },
  ru: {
    h: "Коротко", get: "Что получите", todo: "Что сделать", risk: "Риск", until: (d) => `до ${d}`,
    approx: (x) => `реально ≈ ${x}`, upTo: (x) => `до ${x} на человека`, apr: (x) => `${x}% годовых на вашу сумму`, depends: "зависит от условий — смотрите ниже",
    act: { trade: (a) => `зарегистрироваться и наторговать от ${a}`, deposit: (a) => `зарегистрироваться и пополнить счёт от ${a}`, stake: (a) => `зарегистрироваться и положить от ${a}`, hold: (a) => `зарегистрироваться и держать от ${a} на счёте`, buy: (a) => `зарегистрироваться и купить от ${a}` },
    free: "зарегистрироваться и выполнить простые задания — без депозита", ref: "пригласить друзей по своей ссылке", earn: "положить монеты в Earn и ждать — проценты каждый день", comp: "торговать: награду определяет место в рейтинге", other: "выполнить условия акции (шаги ниже)",
    hi: "Высокий: фьючерсы или плечо — можно потерять больше, чем получите", mid: "Средний: нужно торговать, комиссии съедают часть награды", low: "Низкий: фьючерсы и плечо не нужны", lowStable: "Низкий: деньги остаются в стейблкоине (≈ $1)", price: "Средний: цена самой монеты может упасть сильнее, чем принесут проценты",
  },
};
const STABLE = /^(USDT|USDC|USD1|FDUSD|USDE|DAI|PYUSD|USD)$/i;
const RISKY = /\b(futures?|perps?|perpetual|margin|leverage|options?)\b/i;

export function PromoTldr({ p, m, lang, futures }: { p: Promo; m: M; lang: Locale; futures: boolean }) {
  const T = TX[lang];
  const v = m.value;
  const get = v?.net !== undefined && v.net > 0 && v.conf !== "low" && v.basis !== "chance" && v.basis !== "max" ? T.approx(compactUsd(v.net, lang))
    : m.aprPct !== undefined ? T.apr(num(m.aprPct, lang))
    : m.perUser ? T.upTo(money(m.perUser.amount, m.perUser.unit, lang))
    : T.depends;
  const form = m.payout?.form ? FORM_BADGE[lang][m.payout.form] : undefined;
  const amt = m.minEntry ? money(m.minEntry.amount, m.minEntry.unit === "USD" ? "USD" : m.minEntry.unit, lang) : "";
  const todo = p.category === "referral" ? T.ref
    : m.noDeposit ? T.free
    : m.minEntry ? T.act[m.minEntry.kind](amt)
    : p.category === "earn" || m.aprPct !== undefined ? T.earn
    : p.category === "competition" ? T.comp
    : T.other;
  const hi = futures || RISKY.test(p.titleOrig ?? p.title);
  const mid = !hi && (p.category === "competition" || m.minEntry?.kind === "trade");
  const head = p.titleOrig ?? p.title;
  const stable = !hi && !mid && (m.minEntry ? STABLE.test(m.minEntry.unit) : /\b(USDT|USDC|USD1|FDUSD|stablecoins?)\b/i.test(head));
  // staking / Earn in an ordinary coin (OPG, PEARL…) is not "low risk": the coin itself can drop (27.11)
  const priceRisk = !hi && !mid && !stable && (p.category === "earn" || m.aprPct !== undefined || m.minEntry?.kind === "stake" || m.minEntry?.kind === "hold" || m.minEntry?.kind === "buy");
  const risk = hi ? { t: T.hi, c: "text-rose", dot: "bg-rose" } : mid || priceRisk ? { t: priceRisk ? T.price : T.mid, c: "text-amber", dot: "bg-amber" } : { t: stable ? T.lowStable : T.low, c: "text-lime", dot: "bg-lime" };
  const end = p.endsAt ? new Date(p.endsAt).toLocaleDateString(lang === "uk" ? "uk-UA" : lang === "ru" ? "ru-RU" : "en-GB", { day: "numeric", month: "long", timeZone: "UTC" }) : undefined;
  const row = (label: string, body: React.ReactNode) => (
    <div className="flex flex-col gap-0.5 sm:flex-row sm:gap-3"><dt className="shrink-0 text-xs font-bold uppercase tracking-wider text-ink-3 sm:w-36 sm:pt-0.5">{label}</dt><dd className="text-sm font-semibold text-ink">{body}</dd></div>
  );
  return (
    <section className="mt-6 rounded-2xl border border-lime/25 bg-lime/[0.04] p-4 sm:p-5">
      <h2 className="text-xs font-bold uppercase tracking-wider text-lime">{T.h}</h2>
      <dl className="mt-3 space-y-2.5">
        {row(T.get, <>{get}{form && <span className="ml-2 rounded-md bg-white/[0.06] px-1.5 py-0.5 text-xs font-bold text-ink-2">{form}</span>}</>)}
        {row(T.todo, <>{todo.charAt(0).toUpperCase() + todo.slice(1)}{end && <span className="text-ink-3"> · {T.until(end)}</span>}</>)}
        {row(T.risk, <span className={`inline-flex items-center gap-2 ${risk.c}`}><span className={`size-2 shrink-0 rounded-full ${risk.dot}`} />{risk.t}</span>)}
      </dl>
    </section>
  );
}
