import type { Payout, PayoutForm } from "./payout";

type L = "uk" | "en" | "ru";

/** Short badge for cards and filters. */
export const FORM_BADGE: Record<L, Record<PayoutForm, string>> = {
  uk: { cash: "💵 Можна вивести", voucher: "🎟 Ваучер / бонус", mixed: "💵+🎟 Гроші й ваучери", points: "⭐ Бали, не гроші" },
  en: { cash: "💵 Withdrawable", voucher: "🎟 Voucher / bonus", mixed: "💵+🎟 Cash & vouchers", points: "⭐ Points, not money" },
  ru: { cash: "💵 Можно вывести", voucher: "🎟 Ваучер / бонус", mixed: "💵+🎟 Деньги и ваучеры", points: "⭐ Баллы, не деньги" },
};
export const FORM_CLS: Record<PayoutForm, string> = {
  cash: "bg-lime/10 text-lime", voucher: "bg-amber/10 text-amber", mixed: "bg-teal/10 text-teal", points: "bg-violet/10 text-violet",
};

/** What each form means, in one sentence (promo page). */
export const FORM_TEXT: Record<L, Record<PayoutForm | "unknown", string>> = {
  uk: {
    cash: "За правилами нагорода приходить звичайними монетами на ваш рахунок, і її можна вивести або продати.",
    voucher: "Нагорода — ваучер або бонус: ним можна торгувати чи зменшувати комісії, але сам бонус вивести не можна (зазвичай лише прибуток з нього).",
    mixed: "Частина нагород — звичайні монети, які можна вивести, частина — ваучери чи бонуси, які вивести не можна. Дивіться, що саме дають за ваш крок.",
    points: "Нагорода — бали (XP / points). Це не гроші: їхня цінність залежить від того, чи й як проєкт обміняє їх на токени.",
    unknown: "Біржа не пише, чи це гроші, які можна вивести, чи ваучер. Перевірте деталі нагороди на біржі, перш ніж розраховувати на гроші.",
  },
  en: {
    cash: "Per the rules, the reward arrives as regular coins in your account — you can withdraw or sell it.",
    voucher: "The reward is a voucher or bonus: you can trade with it or cut fees, but the bonus itself can't be withdrawn (usually only the profit made with it).",
    mixed: "Some rewards are regular coins you can withdraw, others are vouchers or bonuses you can't. Check what your step pays.",
    points: "The reward is points (XP). Not money: their value depends on whether and how the project converts them into tokens.",
    unknown: "The exchange doesn't say whether this is withdrawable money or a voucher. Check the reward details on the exchange before counting on cash.",
  },
  ru: {
    cash: "По правилам награда приходит обычными монетами на ваш счёт, её можно вывести или продать.",
    voucher: "Награда — ваучер или бонус: им можно торговать или уменьшать комиссии, но сам бонус вывести нельзя (обычно только прибыль с него).",
    mixed: "Часть наград — обычные монеты, которые можно вывести, часть — ваучеры или бонусы, которые вывести нельзя. Смотрите, что дают за ваш шаг.",
    points: "Награда — баллы (XP / points). Это не деньги: их ценность зависит от того, обменяет ли их проект на токены.",
    unknown: "Биржа не пишет, деньги ли это, которые можно вывести, или ваучер. Проверьте детали награды на бирже, прежде чем рассчитывать на деньги.",
  },
};

const days = (lang: L, n: number) => {
  if (lang === "en") return `${n} day${n === 1 ? "" : "s"}`;
  const m10 = n % 10, m100 = n % 100;
  const one = m10 === 1 && m100 !== 11, few = m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14);
  return lang === "uk" ? `${n} ${one ? "день" : few ? "дні" : "днів"}` : `${n} ${one ? "день" : few ? "дня" : "дней"}`;
};

/** Small timing chips: claim manually within N days / arrives automatically / review / paid within. */
export function timingChips(po: Payout, lang: L): string[] {
  const out: string[] = [];
  const T = {
    uk: { claim: (d: string) => `✋ Забрати вручну за ${d}`, manual: "✋ Треба забрати вручну", auto: "⚡ Приходить автоматично", review: (d: string) => `🔍 Перевірка до ${d}`, pay: (d: string) => `⏱ Виплата протягом ${d}` },
    en: { claim: (d: string) => `✋ Claim manually within ${d}`, manual: "✋ Must be claimed manually", auto: "⚡ Paid automatically", review: (d: string) => `🔍 Review up to ${d}`, pay: (d: string) => `⏱ Paid within ${d}` },
    ru: { claim: (d: string) => `✋ Забрать вручную за ${d}`, manual: "✋ Нужно забрать вручную", auto: "⚡ Приходит автоматически", review: (d: string) => `🔍 Проверка до ${d}`, pay: (d: string) => `⏱ Выплата в течение ${d}` },
  }[lang];
  if (po.claimDays) out.push(T.claim(days(lang, po.claimDays)));
  else if (po.manual) out.push(T.manual);
  else if (po.auto) out.push(T.auto);
  if (po.reviewDays) out.push(T.review(days(lang, po.reviewDays)));
  if (po.payDays) out.push(T.pay(po.payDays === 1 && !po.reviewDays ? (lang === "en" ? "24 hours" : lang === "uk" ? "доби" : "суток") : days(lang, po.payDays)));
  return out;
}
