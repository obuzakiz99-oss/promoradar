/**
 * How each exchange pays promo rewards — facts read on the exchanges' own pages (date in `checked`).
 * Shown on /[lang]/v/<id> next to statistics computed from the rules of that venue's live promos.
 * RE-CHECK when a programme changes; never add a fact without an official source.
 */
type L = "uk" | "en" | "ru";
export interface PayoutFacts { src: string; checked: string; facts: Record<L, string[]> }

export const PAYOUT_FACTS: Record<string, PayoutFacts> = {
  bybit: {
    src: "https://www.bybit.com/en/help-center/article/Bybit-Referral-Program-General-FAQ", checked: "2026-11-08",
    facts: {
      uk: ["Кожна нагорода спершу 3 дні проходить перевірку, потім з'являється в Rewards Hub.", "Нагороду треба забрати вручну протягом 10 днів — інакше вона згорає.", "Діє денний ліміт виплат: якщо його вичерпано, забираєте наступного дня (поки є місячний фонд).", "Серед типів нагород — Fee Saver (лише знижка на комісії, вивести не можна) і Position Airdrop (торговий ваучер)."],
      en: ["Every reward first goes through a 3-day review, then appears in the Rewards Hub.", "You must claim it manually within 10 days, or it expires.", "There is a daily payout limit: if it's used up, claim the next day (while the monthly pool lasts).", "Reward types include Fee Savers (fee discount only, not withdrawable) and Position Airdrops (trading vouchers)."],
      ru: ["Каждая награда сначала 3 дня проходит проверку, затем появляется в Rewards Hub.", "Награду нужно забрать вручную в течение 10 дней — иначе она сгорает.", "Действует дневной лимит выплат: если он исчерпан, забираете на следующий день (пока есть месячный фонд).", "Среди типов наград — Fee Saver (только скидка на комиссии, вывести нельзя) и Position Airdrop (торговый ваучер)."],
    },
  },
  mexc: {
    src: "https://www.mexc.com/rewards-hub", checked: "2026-11-08",
    facts: {
      uk: ["Перед завданнями відкрийте Rewards Hub — це вважається реєстрацією в акції.", "Нагороду треба забрати вручну; перевірка триває до 7 календарних днів, потім вона з'являється в Rewards Hub → My Rewards.", "Ф'ючерсний бонус не виводиться — лише прибуток з нього. Будь-який переказ з ф'ючерсного рахунку до використання бонусу скасовує весь бонус.", "Токен-ваучер треба обміняти за 14 днів — після цього монети ваші, їх можна вивести."],
      en: ["Open the Rewards Hub before doing tasks — that counts as registering for the event.", "Rewards must be claimed manually; the review takes up to 7 calendar days, then they appear under Rewards Hub → My Rewards.", "Futures bonuses can't be withdrawn — only the profit made with them. Any transfer out of the futures account before the bonus is used cancels the whole bonus.", "Token vouchers must be redeemed within 14 days — then the coins are yours and withdrawable."],
      ru: ["Перед заданиями откройте Rewards Hub — это считается регистрацией в акции.", "Награду нужно забрать вручную; проверка длится до 7 календарных дней, затем она появляется в Rewards Hub → My Rewards.", "Фьючерсный бонус не выводится — только прибыль с него. Любой перевод с фьючерсного счёта до использования бонуса отменяет весь бонус.", "Токен-ваучер нужно обменять за 14 дней — после этого монеты ваши, их можно вывести."],
    },
  },
  binance: {
    src: "https://www.binance.com/en/support/announcement", checked: "2026-11-08",
    facts: {
      uk: ["Більшість акцій платять токен-ваучерами в Rewards Hub (часто протягом 48 годин після завдання, після перевірки).", "Ваучер треба обміняти до закінчення строку — у правилах поточних акцій це 14–30 днів. Після обміну це звичайні монети, їх можна вивести.", "Нагороди за утримання й Earn зазвичай зараховуються одразу на спотовий рахунок."],
      en: ["Most promos pay token vouchers to the Rewards Hub (often within 48 hours of a task, after a review).", "Redeem the voucher before it expires — 14–30 days in current promo rules. After redeeming they are regular, withdrawable coins.", "Holding and Earn rewards usually go straight to the Spot account."],
      ru: ["Большинство акций платят токен-ваучерами в Rewards Hub (часто в течение 48 часов после задания, после проверки).", "Ваучер нужно обменять до окончания срока — в правилах текущих акций это 14–30 дней. После обмена это обычные монеты, их можно вывести.", "Награды за удержание и Earn обычно зачисляются сразу на спотовый счёт."],
    },
  },
  cryptocom: {
    src: "https://help.crypto.com/en/articles/3124990-app-referral-programme", checked: "2026-11-08",
    facts: {
      uk: ["Реферальні нагороди приходять обом протягом 24 годин після кожного кроку обсягу торгів.", "Призи місячного лідерборду — на гаманець у застосунку протягом 7 днів після кінця місяця."],
      en: ["Referral rewards reach both of you within 24 hours of each trading-volume step.", "Monthly leaderboard prizes go to the app wallet within 7 days after the month ends."],
      ru: ["Реферальные награды приходят обоим в течение 24 часов после каждого шага объёма торгов.", "Призы месячного лидерборда — на кошелёк в приложении в течение 7 дней после конца месяца."],
    },
  },
  kraken: {
    src: "https://support.kraken.com/articles/kraken-app-referral-program", checked: "2026-11-08",
    facts: {
      uk: ["Реферальний бонус зараховується протягом 14 днів після виконання умов — фіксовані $20 у вашій основній валюті (наприклад, €20 у BTC).", "Винагороди за стейблкоїни виплачуються в тому ж стейблкоїні прямо на баланс, без блокування."],
      en: ["The referral bonus is credited within 14 days after the terms are met — a fixed $20 in your default currency (e.g. €20 in BTC).", "Stablecoin rewards are paid in the same stablecoin straight into your balance, no lock-up."],
      ru: ["Реферальный бонус зачисляется в течение 14 дней после выполнения условий — фиксированные $20 в вашей основной валюте (например, €20 в BTC).", "Вознаграждения за стейблкоины выплачиваются в том же стейблкоине прямо на баланс, без блокировки."],
    },
  },
  aster: {
    src: "https://docs.asterdex.com/program-and-rewards/trade-and-earn", checked: "2026-11-08",
    facts: {
      uk: ["Trade & Earn: нагороди за тиждень приходять автоматично в USDF на ф'ючерсний рахунок протягом 7 робочих днів.", "Реферальні відрахування нараховуються в реальному часі й надходять наступного дня — у тому активі, яким друг платив комісію."],
      en: ["Trade & Earn: weekly rewards arrive automatically in USDF to the futures account within 7 business days.", "Referral rebates accrue in real time and arrive the next day, in the asset your friend paid fees in."],
      ru: ["Trade & Earn: награды за неделю приходят автоматически в USDF на фьючерсный счёт в течение 7 рабочих дней.", "Реферальные отчисления начисляются в реальном времени и поступают на следующий день — в том активе, которым друг платил комиссию."],
    },
  },
  lighter: {
    src: "https://docs.lighter.xyz/programs/referral-program", checked: "2026-11-08",
    facts: {
      uk: ["Реферальні виплати — щопонеділка токенами LIT за попередній тиждень, мінімум $1. Ціна LIT може змінюватися."],
      en: ["Referral payouts every Monday in LIT tokens for the previous week, $1 minimum. The LIT price can change."],
      ru: ["Реферальные выплаты — каждый понедельник токенами LIT за прошлую неделю, минимум $1. Цена LIT может меняться."],
    },
  },
  paradex: {
    src: "https://docs.paradex.trade/docs/xp-referrals/xp", checked: "2026-11-08",
    facts: {
      uk: ["XP нараховуються щосереди за минулий тиждень. Це бали, а не гроші — вивести їх не можна.", "Токени DIME з партнерської програми TAP заблоковані на 3 місяці після її завершення."],
      en: ["XP is credited every Wednesday for the past week. It's points, not money — it can't be withdrawn.", "DIME tokens from the TAP affiliate programme are locked for 3 months after it ends."],
      ru: ["XP начисляются каждую среду за прошлую неделю. Это баллы, а не деньги — вывести их нельзя.", "Токены DIME из партнёрской программы TAP заблокированы на 3 месяца после её окончания."],
    },
  },
};
