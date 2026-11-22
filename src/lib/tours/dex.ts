import type { Tour } from "./types";

/** /dex/: DEX & DeFi pools from DefiLlama (components/DexBoard.tsx). */
export const DEX_TOUR: Tour = {
  id: "dex",
  name: { uk: "DeFi-пули", en: "DeFi pools", ru: "DeFi-пулы" },
  steps: {
    uk: [
      { title: "Навіщо ця сторінка", text: "DeFi-пули — це дохід поза біржами: ви вносите монети зі свого гаманця в протокол (обмінник, кредитування, фарм) і отримуєте частку комісій та нагород. Тут тисячі пулів з усіх мереж за відкритими даними DefiLlama — з фільтрами і калькулятором." },
      { sel: "dex-tabs", title: "Розділи дохідності", text: "«Launchpool» і «Earn бірж» — дохід на біржі, «DeFi-пули» — у протоколах з власного гаманця (ця сторінка), «Фіксована» — дохідність, відома наперед. Справа — коли дані оновились." },
      { sel: "dex-stats", title: "Масштаб", text: "Скільки пулів, протоколів і мереж у списку і скільки грошей (TVL) у них разом." },
      { sel: "dex-cats", title: "Тип протоколу", text: "«Біржі (DEX)» — пули ліквідності для обміну, «Кредитування» — даєте монети в борг під відсоток, «Ліквідний стейкінг», «Агрегатори дохідності», «Фарм» та інші. «Усі» — без відбору." },
      { sel: "dex-filters", title: "Фільтри", text: "Звужують список до того, що вам підходить.", points: ["Токен або протокол… — пошук, напр. «USDC» чи «Aave»", "Мережа — Ethereum, Arbitrum, Base…", "Мін. TVL — ховає малі пули (за замовчуванням від $1M: там менше ризику)", "Лише стейблкоїни — пули без ризику ціни", "Без ризику IL — без непостійної втрати"] },
      { sel: "dex-amount", title: "Сума, $", text: "Одна сума для всієї таблиці: у колонці «Дохід з $…» біля кожного пулу видно заробіток за місяць і за рік. Порожнє поле — рахуємо для $1 000." },
      { sel: "dex-sort", title: "Сортування", text: "«За APY» — найвища дохідність, «За TVL» — найбільші й зазвичай надійніші пули, «За винагородами» — де найбільша частина доходу йде нагородами в токенах протоколу." },
      { sel: "dex-cols", title: "Колонки таблиці", text: "Позначки біля пулу: «стейбл» — лише стейблкоїни, «Ризик IL» — дві різні монети.", points: ["Пул — монети і протокол", "Мережа — де працює пул", "TVL — скільки грошей у пулі", "APY — дохідність за рік; «з хеджем» — якщо прибрати ризик ціни шортом", "Дохід з $… — за місяць і рік", "База + винагороди — з комісій і з нагород; Сер. 30д — середній APY за місяць"] },
      { sel: "dex-actions", title: "Умови й ризики", text: "Відкриває деталі пулу: дохід за день, тиждень, місяць і рік, хедж ціни (де шортити і APY з хеджем), плюси й ризики, історію APY і кнопку «Перейти на …» — на сайт протоколу." },
      { sel: "dex-more", title: "Більше пулів", text: "Скільки пулів показано зі скількох і поточний поріг TVL. «Показати ще» додає наступні 40. Порада: високий APY рідко тримається довго — порівнюйте його із «Сер. 30д»." },
    ],
    en: [
      { title: "What this page is for", text: "DeFi pools are income outside exchanges: you deposit coins from your own wallet into a protocol (a swap, lending, a farm) and earn a share of fees and rewards. Here are thousands of pools across all chains from DefiLlama open data, with filters and a calculator." },
      { sel: "dex-tabs", title: "Yield sections", text: "“Launchpool” and “Exchange Earn” — income on an exchange, “DeFi pools” — in protocols from your own wallet (this page), “Fixed” — yield known in advance. On the right: when the data was updated." },
      { sel: "dex-stats", title: "Scale", text: "How many pools, protocols and chains are listed and how much money (TVL) they hold together." },
      { sel: "dex-cats", title: "Protocol type", text: "“DEX” — liquidity pools for swaps, “Lending” — you lend coins for interest, “Liquid Staking”, “Yield Aggregator”, “Farm” and more. “All” — no filter." },
      { sel: "dex-filters", title: "Filters", text: "Narrow the list to what suits you.", points: ["Token or protocol… — search, e.g. “USDC” or “Aave”", "Chain — Ethereum, Arbitrum, Base…", "Min TVL — hides small pools (from $1M by default: less risk there)", "Stables only — pools with no price risk", "No IL risk — no impermanent loss"] },
      { sel: "dex-amount", title: "Amount, $", text: "One amount for the whole table: the “Income on $…” column shows each pool’s earnings per month and per year. Empty field — we count $1,000." },
      { sel: "dex-sort", title: "Sort", text: "“By APY” — highest yield, “By TVL” — the largest and usually sturdier pools, “By rewards” — where most of the income is paid in the protocol’s tokens." },
      { sel: "dex-cols", title: "Table columns", text: "Tags by the pool: “stable” — stablecoins only, “IL risk” — two different coins.", points: ["Pool — the coins and the protocol", "Chain — where the pool runs", "TVL — how much money is in the pool", "APY — yearly yield; “hedged” — with the price risk removed by a short", "Income on $… — per month and year", "Base + rewards — from fees and from rewards; 30d avg — the month’s average APY"] },
      { sel: "dex-actions", title: "Terms & risks", text: "Opens the pool details: income per day, week, month and year, the price hedge (where to short and APY with hedge), pros and risks, APY history and a “Go to …” button to the protocol’s site." },
      { sel: "dex-more", title: "More pools", text: "How many pools are shown out of how many and the current TVL floor. “Show more” adds the next 40. Tip: a very high APY rarely lasts — compare it with the “30d avg”." },
    ],
    ru: [
      { title: "Зачем эта страница", text: "DeFi-пулы — это доход вне бирж: вы вносите монеты со своего кошелька в протокол (обменник, кредитование, фарм) и получаете долю комиссий и наград. Здесь тысячи пулов во всех сетях по открытым данным DefiLlama — с фильтрами и калькулятором." },
      { sel: "dex-tabs", title: "Разделы доходности", text: "«Launchpool» и «Earn бирж» — доход на бирже, «DeFi-пулы» — в протоколах со своего кошелька (эта страница), «Фиксированная» — доходность, известная заранее. Справа — когда данные обновились." },
      { sel: "dex-stats", title: "Масштаб", text: "Сколько пулов, протоколов и сетей в списке и сколько денег (TVL) в них вместе." },
      { sel: "dex-cats", title: "Тип протокола", text: "«Биржи (DEX)» — пулы ликвидности для обмена, «Кредитование» — даёте монеты в долг под процент, «Ликвидный стейкинг», «Агрегаторы доходности», «Фарм» и другие. «Все» — без отбора." },
      { sel: "dex-filters", title: "Фильтры", text: "Сужают список до того, что вам подходит.", points: ["Токен или протокол… — поиск, напр. «USDC» или «Aave»", "Сеть — Ethereum, Arbitrum, Base…", "Мин. TVL — скрывает мелкие пулы (по умолчанию от $1M: там меньше риска)", "Только стейблы — пулы без ценового риска", "Без IL-риска — без непостоянной потери"] },
      { sel: "dex-amount", title: "Сумма, $", text: "Одна сумма для всей таблицы: в колонке «Доход с $…» у каждого пула виден заработок за месяц и за год. Пустое поле — считаем для $1 000." },
      { sel: "dex-sort", title: "Сортировка", text: "«По APY» — самая высокая доходность, «По TVL» — самые крупные и обычно надёжнее пулы, «По наградам» — где большая часть дохода идёт наградами в токенах протокола." },
      { sel: "dex-cols", title: "Колонки таблицы", text: "Пометки у пула: «стейбл» — только стейблкоины, «Риск IL» — две разные монеты.", points: ["Пул — монеты и протокол", "Сеть — где работает пул", "TVL — сколько денег в пуле", "APY — доходность за год; «с хеджем» — если убрать ценовой риск шортом", "Доход с $… — за месяц и год", "База + награды — из комиссий и из наград; Ср. 30д — средний APY за месяц"] },
      { sel: "dex-actions", title: "Условия и риски", text: "Открывает детали пула: доход за день, неделю, месяц и год, хедж цены (где шортить и APY с хеджем), плюсы и риски, историю APY и кнопку «Перейти на …» — на сайт протокола." },
      { sel: "dex-more", title: "Больше пулов", text: "Сколько пулов показано из скольких и текущий порог TVL. «Показать ещё» добавляет следующие 40. Совет: высокий APY редко держится долго — сравнивайте его со «Ср. 30д»." },
    ],
  },
};
