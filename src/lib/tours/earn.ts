import type { Tour } from "./types";

/** /earn/: exchange Earn / Savings rates per coin (components/EarnBoard.tsx). */
export const EARN_TOUR: Tour = {
  id: "earn",
  name: { uk: "Earn бірж", en: "Exchange Earn", ru: "Earn бирж" },
  steps: {
    uk: [
      { title: "Навіщо ця сторінка", text: "Earn — це відсотки, які біржа платить за те, що ваші монети лежать у неї. Тут ставки шести великих бірж зведено в одну таблицю: оберіть монету — і побачите, де на неї платять найбільше і скільки це у грошах." },
      { sel: "earn-tabs", title: "Розділи дохідності", text: "«Launchpool» — нові токени за стейк, «Earn бірж» — відсотки на біржі (ця сторінка), «DeFi-пули» — дохід у протоколах з власного гаманця, «Фіксована» — дохідність, відома наперед. Справа — коли дані оновились." },
      { sel: "earn-venues", title: "Звідки ставки", text: "Біржі, які ми опитуємо, і скільки продуктів Earn у кожної. Зелена крапка — дані свіжі, червона — біржа зараз не відповіла, її ставок може бракувати." },
      { sel: "earn-coin", title: "Оберіть монету", text: "Кнопки — популярні монети, за замовчуванням USDT. Іншу монету знайдіть у полі «Інша монета…»: почніть вводити тікер і виберіть зі списку." },
      { sel: "earn-type", title: "Тип продукту", text: "Зліва — монета і скільки для неї пропозицій.", points: ["Гнучкий — забрати можна будь-коли, ставка змінюється", "Фіксований — гроші заблоковані на N днів, ставка зазвичай вища", "Ончейн-стейкінг — біржа стейкає монету в її мережі", "Усі — без відбору"] },
      { sel: "earn-ex", title: "Лише одна біржа", text: "Натисніть біржу, щоб лишити тільки її пропозиції; «Усі біржі» — повернути всі. Те саме робить клік по назві чи логотипу біржі в таблиці." },
      { sel: "earn-calc", title: "Ваша сума", text: "Введіть суму — у колонці «Дохід з вашої суми» з'явиться заробіток. Для нестабільних монет суму можна ввести в монеті або в USD. Дохід платять у тій самій монеті. Нижче можуть бути ф'ючерси для хеджу і рядок «APR з хеджем» — дохід у доларах, якщо відкрити шорт на ту ж суму." },
      { sel: "earn-cols", title: "Колонки таблиці", text: "Нагорі — найкраща звичайна ставка; пропозиції лише для нових користувачів — нижче.", points: ["Біржа · тип — назва, «Найкраща ставка», «Для нових користувачів», тип і строк у днях", "APR — річна ставка; «до X%» — підвищена, зазвичай лише на невелику суму", "Дохід з вашої суми — за місяць і за рік, ≈ у доларах", "Ліміти — мінімум і максимум суми"] },
      { sel: "earn-actions", title: "Умови й ризики", text: "Кнопка розгортає деталі: дохід за день, тиждень, місяць і рік, ліміти, плюси (✓) і ризики (✕) порівняно із середньою ставкою. «Відкрити ↗» веде просто на сторінку продукту на біржі." },
      { title: "Порада", text: "Порівнюйте звичайні ставки, а не «до X%»: підвищений відсоток часто діє лише на першу сотню доларів. Стейблкоїни (USDT, USDC) не залежать від ціни, решта монет можуть подешевшати сильніше, ніж принесе відсоток." },
    ],
    en: [
      { title: "What this page is for", text: "Earn is the interest an exchange pays for keeping your coins with it. Here the rates of six big exchanges are in one table: pick a coin and see where it pays most and how much that is in money." },
      { sel: "earn-tabs", title: "Yield sections", text: "“Launchpool” — new tokens for staking, “Exchange Earn” — interest on an exchange (this page), “DeFi pools” — income in protocols from your own wallet, “Fixed” — yield known in advance. On the right: when the data was updated." },
      { sel: "earn-venues", title: "Where the rates come from", text: "The exchanges we query and how many Earn products each has. A green dot means fresh data, red — the exchange did not answer and some of its rates may be missing." },
      { sel: "earn-coin", title: "Pick a coin", text: "The buttons are popular coins, USDT by default. Find any other coin in the “Other coin…” box: start typing the ticker and pick it from the list." },
      { sel: "earn-type", title: "Product type", text: "On the left: the coin and how many offers it has.", points: ["Flexible — withdraw any time, the rate floats", "Fixed — locked for N days, usually a higher rate", "On-chain staking — the exchange stakes the coin on its network", "All — no filter"] },
      { sel: "earn-ex", title: "One exchange only", text: "Tap an exchange to keep only its offers; “All exchanges” brings them all back. Clicking an exchange name or logo in the table does the same." },
      { sel: "earn-calc", title: "Your amount", text: "Type an amount and the “Income on your amount” column shows what you earn. For volatile coins you can type it in the coin or in USD. Income is paid in the same coin. Below may be futures for a hedge and an “APR with hedge” line — dollar income if you short the same amount." },
      { sel: "earn-cols", title: "Table columns", text: "The best regular rate is on top; offers for new users only come after.", points: ["Exchange · type — name, “Best rate”, “New users only”, type and term in days", "APR — yearly rate; “up to X%” is a boosted rate, usually on a small amount only", "Income on your amount — per month and per year, ≈ in dollars", "Limits — minimum and maximum amount"] },
      { sel: "earn-actions", title: "Terms & risks", text: "The button unfolds the details: income per day, week, month and year, limits, pros (✓) and risks (✕) compared with the average rate. “Open ↗” goes straight to the product page on the exchange." },
      { title: "Tip", text: "Compare regular rates, not “up to X%”: a boosted rate often covers only the first hundred dollars. Stablecoins (USDT, USDC) don’t depend on price; other coins can lose more value than the interest brings." },
    ],
    ru: [
      { title: "Зачем эта страница", text: "Earn — это проценты, которые биржа платит за то, что ваши монеты лежат у неё. Здесь ставки шести крупных бирж сведены в одну таблицу: выберите монету — и увидите, где на неё платят больше всего и сколько это в деньгах." },
      { sel: "earn-tabs", title: "Разделы доходности", text: "«Launchpool» — новые токены за стейк, «Earn бирж» — проценты на бирже (эта страница), «DeFi-пулы» — доход в протоколах со своего кошелька, «Фиксированная» — доходность, известная заранее. Справа — когда данные обновились." },
      { sel: "earn-venues", title: "Откуда ставки", text: "Биржи, которые мы опрашиваем, и сколько продуктов Earn у каждой. Зелёная точка — данные свежие, красная — биржа сейчас не ответила, её ставок может не хватать." },
      { sel: "earn-coin", title: "Выберите монету", text: "Кнопки — популярные монеты, по умолчанию USDT. Другую монету найдите в поле «Другая монета…»: начните вводить тикер и выберите из списка." },
      { sel: "earn-type", title: "Тип продукта", text: "Слева — монета и сколько для неё предложений.", points: ["Гибкий — забрать можно в любой момент, ставка меняется", "Фиксированный — деньги заблокированы на N дней, ставка обычно выше", "Ончейн-стейкинг — биржа стейкает монету в её сети", "Все — без отбора"] },
      { sel: "earn-ex", title: "Только одна биржа", text: "Нажмите биржу, чтобы оставить только её предложения; «Все биржи» — вернуть все. То же делает клик по названию или логотипу биржи в таблице." },
      { sel: "earn-calc", title: "Ваша сумма", text: "Введите сумму — в колонке «Доход с вашей суммы» появится заработок. Для нестабильных монет сумму можно ввести в монете или в USD. Доход платят в той же монете. Ниже могут быть фьючерсы для хеджа и строка «APR с хеджем» — доход в долларах, если открыть шорт на ту же сумму." },
      { sel: "earn-cols", title: "Колонки таблицы", text: "Сверху — лучшая обычная ставка; предложения только для новых пользователей — ниже.", points: ["Биржа · тип — название, «Лучшая ставка», «Для новых пользователей», тип и срок в днях", "APR — годовая ставка; «до X%» — повышенная, обычно только на небольшую сумму", "Доход с вашей суммы — за месяц и за год, ≈ в долларах", "Лимиты — минимум и максимум суммы"] },
      { sel: "earn-actions", title: "Условия и риски", text: "Кнопка раскрывает детали: доход за день, неделю, месяц и год, лимиты, плюсы (✓) и риски (✕) в сравнении со средней ставкой. «Открыть ↗» ведёт прямо на страницу продукта на бирже." },
      { title: "Совет", text: "Сравнивайте обычные ставки, а не «до X%»: повышенный процент часто действует только на первую сотню долларов. Стейблкоины (USDT, USDC) не зависят от цены, остальные монеты могут подешеветь сильнее, чем принесёт процент." },
    ],
  },
};
