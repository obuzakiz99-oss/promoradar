import type { Tour } from "./types";

/** /lp/<slug>/: one Launchpool project (app/[lang]/lp/[slug]/page.tsx). */
export const LP_TOUR: Tour = {
  id: "lp",
  name: { uk: "Сторінка пулу", en: "Pool page", ru: "Страница пула" },
  steps: {
    uk: [
      { title: "Сторінка одного пулу", text: "Усе про один Launchpool: коли він іде, що можна стейкати, скільки заробите з вашою сумою, як узяти участь і в чому ризики. Зверху — статус: «Триває», «Скоро» або «Пул завершено»." },
      { sel: "lp-facts", title: "Головні факти", text: "Чотири плитки.", points: ["Старт і Завершення — дати пулу; під ними «до кінця» або «старт через»", "Фонд винагород — скільки токенів роздають усім і ≈ в доларах", "Учасників — скільки людей уже в пулі: що більше, то менша ваша частка"] },
      { sel: "lp-cta", title: "Як потрапити в пул", text: "«Взяти участь на …» відкриває пул на сайті біржі. «Умови з перекладом» — офіційне оголошення біржі нашою мовою, «Офіційні умови» — оригінал на біржі." },
      { sel: "lp-pool", title: "Що можна стейкати", text: "Картка для кожної монети стейку.", points: ["APR зараз — річний відсоток; «на старті» — яким він був спочатку", "APR з хеджем — дохід у доларах, якщо прибрати ризик ціни шортом", "Ліміт на людину — мін. і макс. стейк", "Застейкано всього — сума всіх учасників", "Розрахунковий APR — за поточною ціною токена; набагато нижчий за біржовий означає, що токен подешевшав або людей стало більше"] },
      { sel: "lp-charts", title: "Як змінюється пул", text: "Графіки за нашими знімками кожні 30 хвилин: APR, кількість учасників і скільки застейкано в доларах — окремою лінією для кожної монети стейку. Падіння APR зазвичай означає, що в пул заходять нові люди." },
      { sel: "lp-calc", title: "Скільки можна заробити", text: "Оцінка до кінця пулу за поточним APR: зі стейком $100, $1 000 і на максимум, який дозволяє пул. Під сумою — скільки це за день. «Менше мінімуму» — така сума не проходить за правилами пулу." },
      { sel: "lp-steps", title: "Як узяти участь", text: "Покрокова інструкція для цієї біржі: реєстрація, куди перейти і що натиснути. «Повна інструкція по біржі» — довший гайд з усіма розділами." },
      { sel: "lp-pros", title: "Плюси і мінуси", text: "Чесний розбір пулу для стейку $1 000: що добре (✓) і чого остерігатися (✕) — падіння ціни токена, ліміти, особливі умови, чи можна захеджуватися." },
      { sel: "lp-how", title: "Як працює Launchpool", text: "Три коротких пояснення: що це, звідки береться APR і які ризики. Якщо ви вперше на Launchpool — прочитайте перед тим, як заходити." },
    ],
    en: [
      { title: "One pool’s page", text: "Everything about one Launchpool: when it runs, what you can stake, what you earn with your amount, how to join and the risks. At the top: the status — “Live”, “Soon” or “Pool ended”." },
      { sel: "lp-facts", title: "Key facts", text: "Four tiles.", points: ["Start and End — the pool dates; below them “ends in” or “starts in”", "Reward fund — how many tokens are given out to everyone, ≈ in dollars", "Participants — how many are in the pool already: the more, the smaller your share"] },
      { sel: "lp-cta", title: "How to get in", text: "“Join on …” opens the pool on the exchange’s site. “Rules on our site” is the exchange’s official announcement translated, “Official rules” is the original on the exchange." },
      { sel: "lp-pool", title: "What you can stake", text: "A card for each stake coin.", points: ["APR now — the yearly rate; “at launch” — what it was at the start", "Hedged APR — dollar income with the price risk removed by a short", "Per-person limit — min and max stake", "Total staked — everyone’s stake together", "Estimated APR — at the current token price; far below the exchange APR means the token got cheaper or more people joined"] },
      { sel: "lp-charts", title: "How the pool changes", text: "Charts from our snapshots every 30 minutes: APR, participants and value staked in dollars — a line for each stake coin. A falling APR usually means new people are joining." },
      { sel: "lp-calc", title: "How much you can earn", text: "An estimate until the pool ends at the current APR: with $100, $1,000 and at the maximum the pool allows. Below each sum — how much that is per day. “Below the minimum” — the rules don’t accept that amount." },
      { sel: "lp-steps", title: "How to join", text: "A step-by-step guide for this exchange: sign-up, where to go and what to press. “Full exchange guide” is the longer guide with every section." },
      { sel: "lp-pros", title: "Pros and cons", text: "An honest breakdown for a $1,000 stake: what is good (✓) and what to watch out for (✕) — the token’s price falling, limits, special conditions, whether you can hedge." },
      { sel: "lp-how", title: "How Launchpool works", text: "Three short explanations: what it is, where APR comes from and the risks. If this is your first Launchpool, read them before you join." },
    ],
    ru: [
      { title: "Страница одного пула", text: "Всё об одном Launchpool: когда он идёт, что можно стейкать, сколько заработаете с вашей суммой, как участвовать и в чём риски. Сверху — статус: «Идёт», «Скоро» или «Пул завершён»." },
      { sel: "lp-facts", title: "Главные факты", text: "Четыре плитки.", points: ["Старт и Завершение — даты пула; под ними «до конца» или «старт через»", "Фонд наград — сколько токенов раздают всем и ≈ в долларах", "Участников — сколько людей уже в пуле: чем больше, тем меньше ваша доля"] },
      { sel: "lp-cta", title: "Как попасть в пул", text: "«Участвовать на …» открывает пул на сайте биржи. «Условия с переводом» — официальный анонс биржи на нашем языке, «Официальные условия» — оригинал на бирже." },
      { sel: "lp-pool", title: "Что можно стейкать", text: "Карточка для каждой монеты стейка.", points: ["APR сейчас — годовой процент; «на старте» — каким он был вначале", "APR с хеджем — доход в долларах, если убрать ценовой риск шортом", "Лимит на человека — мин. и макс. стейк", "Застейкано всего — сумма всех участников", "Расчётный APR — по текущей цене токена; намного ниже биржевого — токен подешевел или людей стало больше"] },
      { sel: "lp-charts", title: "Как меняется пул", text: "Графики по нашим снимкам каждые 30 минут: APR, число участников и сколько застейкано в долларах — отдельной линией для каждой монеты стейка. Падение APR обычно значит, что в пул заходят новые люди." },
      { sel: "lp-calc", title: "Сколько можно заработать", text: "Оценка до конца пула по текущему APR: со стейком $100, $1 000 и на максимум, который допускает пул. Под суммой — сколько это за день. «Меньше минимума» — такая сумма не проходит по правилам пула." },
      { sel: "lp-steps", title: "Как участвовать", text: "Пошаговая инструкция для этой биржи: регистрация, куда перейти и что нажать. «Полная инструкция по бирже» — более длинный гайд со всеми разделами." },
      { sel: "lp-pros", title: "Плюсы и минусы", text: "Честный разбор пула для стейка $1 000: что хорошо (✓) и чего остерегаться (✕) — падение цены токена, лимиты, особые условия, можно ли захеджироваться." },
      { sel: "lp-how", title: "Как работает Launchpool", text: "Три коротких объяснения: что это, откуда берётся APR и какие риски. Если вы впервые на Launchpool — прочитайте перед тем, как заходить." },
    ],
  },
};
