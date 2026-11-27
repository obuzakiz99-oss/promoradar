import { ldJson } from "@/lib/ldjson";
import type { Locale } from "@/lib/i18n";

/**
 * "How to get a bonus on <exchange>" — the question people search for (owner 27.11: search pages). General steps that hold
 * for every centralised exchange, plus FAQ structured data; the exchange's own conditions stay in each promo's rules.
 */
const TX: Record<Locale, { h: (v: string) => string; steps: (v: string) => Array<[string, string]>; faqH: string; faq: (v: string, n: number, nNew: number) => Array<[string, string]> }> = {
  uk: {
    h: (v) => `Як отримати бонус на ${v}`,
    steps: (v) => [
      ["Відкрийте офіційний сайт", `Реєструйтеся лише на справжньому сайті ${v} або за посиланням з акції на цій сторінці. Підозріле посилання можна перевірити в нашому інструменті «Це справжня біржа?».`],
      ["Пройдіть верифікацію (KYC)", "Майже всі бонуси нараховують лише після перевірки особи: паспорт або ID-картка і селфі. Без неї бонус не прийде, а вивести кошти не вийде."],
      ["Виберіть акцію і натисніть «Взяти участь»", "У багатьох акціях треба окремо зареєструватися на сторінці акції — без цієї кнопки виконані умови не зарахують."],
      ["Виконайте умову", "Депозит, обсяг торгівлі або стейкінг — що саме і на яку суму, написано в умовах кожної акції вище. Калькулятор на сторінці акції покаже, скільки реально залишиться після комісій."],
      ["Заберіть нагороду", "Частину бонусів біржа зараховує сама, частину треба забрати вручну в центрі нагород (Rewards). Купони на ф'ючерси вивести не можна — тільки прибуток з них."],
    ],
    faqH: "Часті питання",
    faq: (v, n, nNew) => [
      [`Які зараз є бонуси на ${v}?`, n ? `Активних акцій ${v} зараз: ${n}${nNew ? ` (для нових користувачів: ${nNew})` : ""}. Список вище оновлюється кожні 30 хвилин.` : `Зараз активних акцій ${v} немає. Нові з'являються на цій сторінці автоматично.`],
      [`Чи можна вивести бонус ${v}?`, "Лише якщо він нараховується в монетах (наприклад, USDT). Купони, ваучери на ф'ючерси й trial fund вивести не можна — тільки прибуток, зароблений з їхньою допомогою."],
      [`Чи потрібна верифікація на ${v}, щоб отримати бонус?`, "Так, майже завжди. Деякі акції також недоступні для окремих країн — це вказано в умовах."],
      ["Чи можна отримати бонус новачка двічі?", "Ні. Бонус для нових користувачів дається один раз на людину; кілька акаунтів — порушення правил."],
    ],
  },
  en: {
    h: (v) => `How to get a bonus on ${v}`,
    steps: (v) => [
      ["Open the official site", `Sign up only on the real ${v} site or through the link in a promo on this page. You can check a suspicious link with our 'Is this the real exchange?' tool.`],
      ["Verify your identity (KYC)", "Almost every bonus is credited only after identity verification: a passport or ID card and a selfie. Without it the bonus won't arrive and withdrawals are blocked."],
      ["Pick a promo and press 'Join'", "Many promos need a separate registration on the promo page — without that button, completed tasks don't count."],
      ["Meet the condition", "A deposit, trading volume or staking — exactly what and how much is in each promo's rules above. The calculator on the promo page shows what is really left after fees."],
      ["Claim the reward", "Some bonuses are credited automatically, others must be claimed in the rewards centre. Futures coupons cannot be withdrawn — only the profit made with them."],
    ],
    faqH: "FAQ",
    faq: (v, n, nNew) => [
      [`What bonuses does ${v} have right now?`, n ? `Live ${v} promos right now: ${n}${nNew ? ` (for new users: ${nNew})` : ""}. The list above updates every 30 minutes.` : `There are no live ${v} promos right now. New ones appear on this page automatically.`],
      [`Can I withdraw a ${v} bonus?`, "Only if it is paid in coins (e.g. USDT). Coupons, futures vouchers and trial funds cannot be withdrawn — only the profit made with them."],
      [`Do I need KYC on ${v} to get a bonus?`, "Yes, almost always. Some promos also exclude certain countries — the rules say which."],
      ["Can I get the newcomer bonus twice?", "No. A new-user bonus is given once per person; several accounts break the rules."],
    ],
  },
  ru: {
    h: (v) => `Как получить бонус на ${v}`,
    steps: (v) => [
      ["Откройте официальный сайт", `Регистрируйтесь только на настоящем сайте ${v} или по ссылке из акции на этой странице. Подозрительную ссылку можно проверить нашим инструментом «Это настоящая биржа?».`],
      ["Пройдите верификацию (KYC)", "Почти все бонусы начисляют только после проверки личности: паспорт или ID-карта и селфи. Без неё бонус не придёт, а вывести средства не получится."],
      ["Выберите акцию и нажмите «Участвовать»", "Во многих акциях нужно отдельно зарегистрироваться на странице акции — без этой кнопки выполненные условия не засчитают."],
      ["Выполните условие", "Депозит, объём торговли или стейкинг — что именно и на какую сумму, написано в условиях каждой акции выше. Калькулятор на странице акции покажет, сколько реально останется после комиссий."],
      ["Заберите награду", "Часть бонусов биржа начисляет сама, часть нужно забрать вручную в центре наград (Rewards). Купоны на фьючерсы вывести нельзя — только прибыль с них."],
    ],
    faqH: "Частые вопросы",
    faq: (v, n, nNew) => [
      [`Какие сейчас есть бонусы на ${v}?`, n ? `Активных акций ${v} сейчас: ${n}${nNew ? ` (для новых пользователей: ${nNew})` : ""}. Список выше обновляется каждые 30 минут.` : `Сейчас активных акций ${v} нет. Новые появляются на этой странице автоматически.`],
      [`Можно ли вывести бонус ${v}?`, "Только если он начисляется в монетах (например, USDT). Купоны, ваучеры на фьючерсы и trial fund вывести нельзя — только прибыль, заработанную с их помощью."],
      [`Нужна ли верификация на ${v}, чтобы получить бонус?`, "Да, почти всегда. Некоторые акции также недоступны для отдельных стран — это указано в условиях."],
      ["Можно ли получить бонус новичка дважды?", "Нет. Бонус для новых пользователей даётся один раз на человека; несколько аккаунтов — нарушение правил."],
    ],
  },
};

// beginner walkthrough 27.11: Bybit's page had only 4 trading contests — a newcomer found nothing to do there
const EASY: Record<Locale, (v: string) => { h: string; b: string; earn: string; bonuses: string }> = {
  uk: (v) => ({ h: `Що тут може новачок`, b: `Зараз у ${v} немає простих акцій для новачка — лише змагання для трейдерів. Найпростіше на цій біржі — покласти USDT в Earn: відсотки щодня, забрати можна будь-коли.`, earn: `Ставки Earn на ${v} →`, bonuses: "Прості бонуси на інших біржах →" }),
  en: (v) => ({ h: "What a beginner can do here", b: `${v} has no easy promos right now — only contests for traders. The simplest thing here is USDT in Earn: interest every day, withdraw any time.`, earn: `Earn rates on ${v} →`, bonuses: "Easy bonuses on other exchanges →" }),
  ru: (v) => ({ h: "Что здесь может новичок", b: `Сейчас у ${v} нет простых акций для новичка — только соревнования для трейдеров. Проще всего на этой бирже — положить USDT в Earn: проценты каждый день, забрать можно в любой момент.`, earn: `Ставки Earn на ${v} →`, bonuses: "Простые бонусы на других биржах →" }),
};

export function VenueHowTo({ lang, name, live, liveNew, id, easy = 1 }: { lang: Locale; name: string; live: number; liveNew: number; id?: string; easy?: number }) {
  const T = TX[lang], faq = T.faq(name, live, liveNew), E = EASY[lang](name);
  return (
    <section className="mt-16">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: ldJson({ "@context": "https://schema.org", "@type": "FAQPage",
        mainEntity: faq.map(([q, a]) => ({ "@type": "Question", name: q, acceptedAnswer: { "@type": "Answer", text: a } })) }) }} />
      {id && easy === 0 && (
        <div className="mb-6 rounded-2xl border border-lime/25 bg-lime/[0.04] p-5">
          <div className="font-bold text-ink">🌱 {E.h}</div>
          <p className="mt-1 text-sm leading-relaxed text-ink-2">{E.b}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <a href={`/${lang}/earn/?ex=${id}`} className="btn btn-primary h-10 px-4 text-sm">{E.earn}</a>
            <a href={`/${lang}/bonuses/`} className="btn btn-ghost h-10 px-4 text-sm">{E.bonuses}</a>
          </div>
        </div>
      )}
      <h2 className="font-display text-2xl font-semibold tracking-tight">{T.h(name)}</h2>
      <ol className="mt-5 grid grid-cols-1 gap-3 md:grid-cols-2">
        {T.steps(name).map(([h, b], i) => (
          <li key={h} className="card flex gap-3 p-5 hover:transform-none">
            <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-lime/10 font-mono text-xs font-bold text-lime">{i + 1}</span>
            <div className="min-w-0"><div className="font-bold text-ink">{h}</div><p className="mt-1 text-sm leading-relaxed text-ink-2">{b}</p></div>
          </li>
        ))}
      </ol>
      <h3 className="mt-8 text-lg font-bold">{T.faqH}</h3>
      <div className="mt-3 space-y-2">
        {faq.map(([q, a]) => (
          <details key={q} className="card p-4 hover:transform-none">
            <summary className="cursor-pointer font-semibold text-ink">{q}</summary>
            <p className="mt-2 text-sm leading-relaxed text-ink-2">{a}</p>
          </details>
        ))}
      </div>
    </section>
  );
}
