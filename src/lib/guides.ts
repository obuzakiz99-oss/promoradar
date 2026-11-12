import type { Locale } from "./i18n";
import { venueOf } from "@/config/site";
import { autoGuides } from "./guides-auto";

/**
 * Exchange-specific step-by-step guides. Facts come from the exchange's own page / FAQ (source + date shown on the page);
 * screenshots are of PUBLIC pages only (public/guides/*), steps behind the login are described in text.
 */
export interface GuideStep { h: string; b: string; img?: string; alt?: string }
export interface GuideSection { title: string; url: string; level: "easy" | "medium" | "hard"; steps: GuideStep[] }
export interface Guide { id: string; venue: string; url: string; checked: string; title: string; sub: string; level: "easy" | "medium" | "hard"; steps: GuideStep[]; sections?: GuideSection[]; facts: string[]; source: string }

const bitget: Record<Locale, Guide> = {
  uk: {
    id: "bitget-poolx", venue: "bitget", url: "https://www.bitget.com/launchhub/poolx", checked: "2026-11-06", level: "medium",
    title: "PoolX на Bitget — покроково", sub: "Блокуєте монету на Bitget — щогодини отримуєте новий токен. Розблокувати можна будь-коли.",
    steps: [
      { h: "Зареєструйтеся і пройдіть верифікацію", b: "За правилами PoolX винагороду отримують лише користувачі, які пройшли перевірку особи (паспорт + селфі)." },
      { h: "Відкрийте сторінку PoolX", b: "Меню Earn → PoolX або кнопка «Стейкати» на нашому сайті. На вкладці «Ongoing» — пули, що тривають зараз: яку монету блокувати, що отримаєте, APR і скільки залишилось часу.", img: "/guides/bitget-poolx-1.jpg", alt: "Сторінка Bitget PoolX зі списком пулів" },
      { h: "Купіть монету пулу", b: "Наприклад, у пулі на скриншоті блокують ETH, щоб отримати BGB. ETH можна купити в розділі «Купити крипту» або обміняти з USDT через Convert. Пам'ятайте: ціна ETH змінюється." },
      { h: "Натисніть «Lock» і введіть суму", b: "Кнопка праворуч від пулу. У вікні видно ліміт на один акаунт — понад нього винагорода не нараховується.", img: "/guides/bitget-poolx-2.jpg", alt: "Картка пулу з кнопкою Lock" },
      { h: "Отримуйте винагороду щогодини", b: "Якщо ви заблокували монети протягом години H, суму врахують у годину H+1, а винагорода прийде в годину H+2." },
      { h: "Розблокуйте, коли захочете", b: "За FAQ Bitget монети можна розблокувати в будь-який момент. Отримані токени можна продати за USDT — нові токени часто дешевшають." },
    ],
    facts: [
      "Бонус за довгострокове зберігання: Bitget бере найменший щоденний залишок монети за останні 15 днів і додає його (× множник) до вашої суми блокування — винагорода може зрости аж удвічі.",
      "Торгові бонуси, позикові кошти та ще не зараховані депозити в бонус не входять.",
      "Автоматизована чи повторна участь ботами — дискваліфікація.",
    ],
    source: "Джерело: сторінка і FAQ Bitget PoolX",
  },
  en: {
    id: "bitget-poolx", venue: "bitget", url: "https://www.bitget.com/launchhub/poolx", checked: "2026-11-06", level: "medium",
    title: "PoolX on Bitget — step by step", sub: "Lock a coin on Bitget and receive a new token every hour. You can unlock any time.",
    steps: [
      { h: "Sign up and verify your identity", b: "Per PoolX rules, only identity-verified users receive rewards (passport + selfie)." },
      { h: "Open the PoolX page", b: "Earn → PoolX, or the 'Stake' button on our site. The 'Ongoing' tab lists running pools: which coin to lock, what you get, APR and time left.", img: "/guides/bitget-poolx-1.jpg", alt: "Bitget PoolX page with pools" },
      { h: "Buy the pool's coin", b: "In the pool on the screenshot you lock ETH to get BGB. Buy ETH via 'Buy crypto' or swap from USDT with Convert. Remember: ETH's price moves." },
      { h: "Press 'Lock' and enter an amount", b: "The button is on the right of the pool. The window shows the per-account cap — nothing is paid above it.", img: "/guides/bitget-poolx-2.jpg", alt: "Pool card with the Lock button" },
      { h: "Get rewards every hour", b: "If you lock during hour H, your amount is counted at H+1 and rewards arrive at H+2." },
      { h: "Unlock whenever you want", b: "Per Bitget's FAQ you can unlock at any time. Sell the received tokens for USDT — new tokens often drop." },
    ],
    facts: [
      "Long-term holding boost: Bitget takes your lowest daily balance of the coin over the last 15 days and adds it (× multiplier) to your locked amount — up to double the reward.",
      "Trading bonuses, borrowed funds and uncredited deposits don't count toward the boost.",
      "Automated or repeated participation by bots leads to disqualification.",
    ],
    source: "Source: Bitget PoolX page and FAQ",
  },
  ru: {
    id: "bitget-poolx", venue: "bitget", url: "https://www.bitget.com/launchhub/poolx", checked: "2026-11-06", level: "medium",
    title: "PoolX на Bitget — пошагово", sub: "Блокируете монету на Bitget — каждый час получаете новый токен. Разблокировать можно в любой момент.",
    steps: [
      { h: "Зарегистрируйтесь и пройдите верификацию", b: "По правилам PoolX награду получают только пользователи, прошедшие проверку личности (паспорт + селфи)." },
      { h: "Откройте страницу PoolX", b: "Меню Earn → PoolX или кнопка «Стейкать» на нашем сайте. Во вкладке «Ongoing» — текущие пулы: какую монету блокировать, что получите, APR и сколько осталось времени.", img: "/guides/bitget-poolx-1.jpg", alt: "Страница Bitget PoolX со списком пулов" },
      { h: "Купите монету пула", b: "Например, в пуле на скриншоте блокируют ETH, чтобы получить BGB. ETH можно купить в разделе «Купить крипту» или обменять из USDT через Convert. Помните: цена ETH меняется." },
      { h: "Нажмите «Lock» и введите сумму", b: "Кнопка справа от пула. В окне виден лимит на один аккаунт — сверх него награда не начисляется.", img: "/guides/bitget-poolx-2.jpg", alt: "Карточка пула с кнопкой Lock" },
      { h: "Получайте награду каждый час", b: "Если вы заблокировали монеты в течение часа H, сумму учтут в час H+1, а награда придёт в час H+2." },
      { h: "Разблокируйте, когда захотите", b: "По FAQ Bitget монеты можно разблокировать в любой момент. Полученные токены можно продать за USDT — новые токены часто дешевеют." },
    ],
    facts: [
      "Бонус за долгосрочное хранение: Bitget берёт наименьший дневной остаток монеты за последние 15 дней и добавляет его (× множитель) к вашей сумме блокировки — награда может вырасти до двух раз.",
      "Торговые бонусы, заёмные средства и ещё не зачисленные депозиты в бонус не входят.",
      "Автоматизированное или повторное участие ботами — дисквалификация.",
    ],
    source: "Источник: страница и FAQ Bitget PoolX",
  },
};

/** Hand-written manual for the Fixed yield tab (Pendle PT). Facts: Pendle docs + app (PT redeems 1:1 for the accounting asset at maturity). */
const PENDLE_URL = "https://app.pendle.finance/trade/markets";
const pendle: Record<Locale, Guide> = {
  uk: {
    id: "pendle-pt", venue: "pendle", url: PENDLE_URL, checked: "2026-11-12", level: "hard",
    title: "Фіксована дохідність на Pendle — повна методичка",
    sub: "Як правильно вкласти стейблкоїни під фіксований відсоток через PT-токени Pendle: що підготувати, як купити, як забрати гроші і де можна втратити.",
    steps: [
      { h: "Зрозумійте, що ви купуєте", b: "PT (Principal Token) — це право отримати 1 одиницю базового активу (наприклад, 1 USDe) у дату погашення. Сьогодні PT продається дешевше — скажімо, за 0,97. Різниця між ціною купівлі та 1,00 і є вашим фіксованим прибутком. Відсоток у колонці «Фікс. APY» — це ця різниця, перерахована в річні." },
      { h: "Порахуйте, скільки заробите", b: "Прибуток ≈ сума × APY × днів до погашення / 365. Приклад: $1 000 під 10% на 90 днів ≈ $24. Беріть ринок, де до погашення стільки днів, скільки ви готові не чіпати гроші: продаж раніше — за ринковою ціною, без гарантованого відсотка." },
      { h: "Виберіть ринок у нашій таблиці", b: "Дивіться на три колонки разом: APY, дату погашення і ліквідність. Високий APY на маловідомому стейблкоїні — це плата за ризик, а не подарунок. Для першого разу краще ринки з ліквідністю від $10M і стейблкоїнами, про які ви вже чули. Колонка «Мережа» показує, де саме лежить ринок — гроші треба мати саме в цій мережі." },
      { h: "Підготуйте гаманець", b: "Потрібен некастодіальний гаманець — Rabby або MetaMask (розширення для браузера). Seed-фразу запишіть на папері й нікому не показуйте: ні «підтримці», ні сайтам. Біржовий акаунт для Pendle не підходить — купувати PT можна лише з власного гаманця." },
      { h: "Переведіть USDC і трохи монети для комісій", b: "Виведіть USDC (або USDT) з біржі на адресу гаманця саме в мережі ринку — Arbitrum, Base, BNB Chain або Ethereum. Також потрібна монета для оплати газу: ETH для Ethereum, Arbitrum і Base, BNB для BNB Chain — у L2-мережах вистачить $3–5. В Ethereum комісії значно вищі, тому суми до кількох тисяч доларів вигідніше розміщувати в Arbitrum чи Base. Спершу надішліть невелику тестову суму." },
      { h: "Відкрийте ринок і підключіть гаманець", b: "Натисніть назву ринку в нашій таблиці — відкриється сторінка Pendle одразу на вкладці PT. Перевірте адресу: app.pendle.finance. Натисніть «Connect Wallet» і підтвердіть підключення в гаманці. Переконайтеся, що вгорі вибрано ту саму мережу, що й у таблиці." },
      { h: "Купуйте саме PT, а не YT", b: "У блоці Swap має бути вибрано PT. YT — зовсім інший продукт: до дати погашення він дешевшає до нуля, це ставка на зростання відсотків. Переплутати їх — найдорожча помилка новачка." },
      { h: "Введіть суму та перевірте деталі", b: "Виберіть монету, якою платите (USDC — Pendle сам обміняє її через агрегатор), і суму. Перед підтвердженням подивіться: скільки PT отримаєте, фіксований APY після покупки і Price Impact. Якщо Price Impact понад 0,5% — суму краще розбити або вибрати ринок з більшою ліквідністю." },
      { h: "Підтвердьте дві транзакції", b: "Спершу Approve — дозвіл контракту Pendle списати ваш USDC (краще дозволити рівно потрібну суму, а не «безлімітно»). Потім сама покупка. Після цього PT з'явиться в гаманці та в розділі Dashboard на Pendle." },
      { h: "Чекайте дати погашення", b: "Нічого натискати не треба: ціна PT щодня наближається до 1,00. У Dashboard видно поточну вартість. Тимчасові коливання ціни на ваш результат у дату погашення не впливають." },
    ],
    sections: [
      {
        title: "Як забрати гроші після погашення", url: "https://app.pendle.finance/trade/dashboard", level: "medium",
        steps: [
          { h: "Відкрийте Dashboard → Redeem", b: "Після дати погашення PT більше не дорожчає. Гроші не повертаються автоматично — натисніть Redeem і обміняйте PT 1:1 на базовий актив." },
          { h: "Обміняйте актив назад на USDC", b: "Ви отримаєте базовий актив ринку (наприклад, USDe або sUSDe), а не обов'язково USDC. За потреби обміняйте його в самому Pendle або через агрегатор (1inch, CowSwap) і перевірте курс." },
          { h: "Або вкладіть знову", b: "Відкрийте нашу таблицю ще раз і виберіть новий ринок — ставки змінюються щодня." },
        ],
      },
      {
        title: "Якщо гроші потрібні раніше", url: PENDLE_URL, level: "medium",
        steps: [
          { h: "Продайте PT на тій самій сторінці", b: "У Swap виберіть Sell PT. Ціна буде ринковою: якщо ставки на ринку зросли відтоді, як ви купили, отримаєте менше, ніж очікували, а можете піти й у невеликий мінус." },
          { h: "Порівняйте з очікуванням до погашення", b: "Часто вигідніше дочекатися дати погашення, ніж продавати з дисконтом. Тому вкладайте лише ті гроші, які не знадобляться до цієї дати." },
        ],
      },
    ],
    facts: [
      "Фіксується лише відсоток. Якщо сам стейблкоїн втратить прив'язку до долара (особливо синтетичний — USDe, USD0 тощо), PT подешевшає разом із ним.",
      "Ризик смарт-контрактів: Pendle і базовий протокол — це код, у якому можуть знайтися вразливості. Не кладіть усе в один ринок.",
      "APY у таблиці — на момент оновлення. Ваш відсоток фіксується за ціною, за якою ви купили, а в таблиці далі змінюється.",
      "Великі суми відносно ліквідності ринку погіршують ціну — дивіться на Price Impact.",
      "Ніколи не вводьте seed-фразу на сайтах і не підписуйте незрозумілі транзакції. Pendle ніколи не пише першим у Telegram чи Discord.",
      "Після погашення відкликайте дозволи (Approve) через revoke.cash, якщо більше не користуєтеся ринком.",
      "Прибуток може оподатковуватися — перевірте правила своєї країни.",
    ],
    source: "Джерело: документація та застосунок Pendle",
  },
  en: {
    id: "pendle-pt", venue: "pendle", url: PENDLE_URL, checked: "2026-11-12", level: "hard",
    title: "Fixed yield on Pendle — the complete guide",
    sub: "How to put stablecoins to work at a fixed rate with Pendle PT tokens: what to prepare, how to buy, how to get your money back and where you can lose.",
    steps: [
      { h: "Understand what you buy", b: "PT (Principal Token) is a claim on 1 unit of the underlying asset (e.g. 1 USDe) at maturity. Today PT trades cheaper — say 0.97. The gap between your price and 1.00 is your fixed profit. The 'Fixed APY' column is that gap expressed per year." },
      { h: "Work out what you'll earn", b: "Profit ≈ amount × APY × days to maturity / 365. Example: $1,000 at 10% for 90 days ≈ $24. Pick a market whose maturity matches how long you can leave the money alone: selling early is at the market price, with no guaranteed rate." },
      { h: "Pick a market in our table", b: "Read three columns together: APY, maturity and liquidity. A high APY on an obscure stablecoin is payment for risk, not a gift. For a first try, prefer markets with $10M+ liquidity and stablecoins you've heard of. The 'Chain' column tells you which network your money must be on." },
      { h: "Set up a wallet", b: "You need a self-custody wallet — Rabby or MetaMask (browser extension). Write the seed phrase on paper and never show it to anyone: not 'support', not websites. An exchange account won't work — PT is bought from your own wallet." },
      { h: "Send USDC plus a little gas coin", b: "Withdraw USDC (or USDT) from an exchange to your wallet address on the market's network — Arbitrum, Base, BNB Chain or Ethereum. You also need gas: ETH on Ethereum, Arbitrum and Base, BNB on BNB Chain — $3–5 is enough on L2s. Ethereum fees are much higher, so amounts up to a few thousand dollars work better on Arbitrum or Base. Send a small test amount first." },
      { h: "Open the market and connect", b: "Click the market name in our table — Pendle opens on the PT tab. Check the address: app.pendle.finance. Press 'Connect Wallet' and approve in your wallet. Make sure the network at the top matches the table." },
      { h: "Buy PT, not YT", b: "The Swap box must be set to PT. YT is a different product: it decays to zero by maturity and is a bet on rates going up. Mixing them up is the costliest beginner mistake." },
      { h: "Enter the amount and check details", b: "Choose what you pay with (USDC — Pendle routes it through an aggregator) and the amount. Before confirming, check: how much PT you get, the fixed APY after the trade and Price Impact. If Price Impact is above 0.5%, split the amount or pick a deeper market." },
      { h: "Confirm two transactions", b: "First Approve — permission for Pendle's contract to spend your USDC (approve the exact amount, not 'unlimited'). Then the purchase itself. PT then shows up in your wallet and in Pendle's Dashboard." },
      { h: "Wait for maturity", b: "Nothing to press: PT's price drifts toward 1.00 every day. Dashboard shows the current value. Price swings along the way don't change what you get at maturity." },
    ],
    sections: [
      {
        title: "Getting your money out after maturity", url: "https://app.pendle.finance/trade/dashboard", level: "medium",
        steps: [
          { h: "Dashboard → Redeem", b: "After maturity PT stops growing. Funds aren't returned automatically — press Redeem to swap PT 1:1 for the underlying asset." },
          { h: "Swap back to USDC", b: "You receive the market's underlying asset (e.g. USDe or sUSDe), not necessarily USDC. Swap it in Pendle itself or via an aggregator (1inch, CowSwap) if needed, and check the rate." },
          { h: "Or reinvest", b: "Open our table again and pick a new market — rates change daily." },
        ],
      },
      {
        title: "If you need the money earlier", url: PENDLE_URL, level: "medium",
        steps: [
          { h: "Sell PT on the same page", b: "In Swap choose Sell PT. The price is the market price: if rates rose since you bought, you get less than expected, possibly a small loss." },
          { h: "Compare with holding", b: "Waiting for maturity often beats selling at a discount. So only put in money you won't need before that date." },
        ],
      },
    ],
    facts: [
      "Only the rate is fixed. If the stablecoin itself depegs (especially synthetic ones — USDe, USD0 and the like), PT falls with it.",
      "Smart-contract risk: Pendle and the underlying protocol are code that may have bugs. Don't put everything in one market.",
      "The table's APY is as of the last update. Your rate locks at the price you buy at; the table keeps moving.",
      "Large amounts relative to market liquidity worsen your price — watch Price Impact.",
      "Never enter your seed phrase on websites or sign transactions you don't understand. Pendle never DMs first on Telegram or Discord.",
      "After maturity, revoke approvals at revoke.cash if you no longer use the market.",
      "Profits may be taxable — check your country's rules.",
    ],
    source: "Source: Pendle docs and app",
  },
  ru: {
    id: "pendle-pt", venue: "pendle", url: PENDLE_URL, checked: "2026-11-12", level: "hard",
    title: "Фиксированная доходность на Pendle — полная методичка",
    sub: "Как правильно вложить стейблкоины под фиксированный процент через PT-токены Pendle: что подготовить, как купить, как забрать деньги и где можно потерять.",
    steps: [
      { h: "Поймите, что вы покупаете", b: "PT (Principal Token) — это право получить 1 единицу базового актива (например, 1 USDe) в дату погашения. Сегодня PT продаётся дешевле — скажем, за 0,97. Разница между ценой покупки и 1,00 и есть ваша фиксированная прибыль. Процент в колонке «Фикс. APY» — эта разница, пересчитанная в годовые." },
      { h: "Посчитайте, сколько заработаете", b: "Прибыль ≈ сумма × APY × дней до погашения / 365. Пример: $1 000 под 10% на 90 дней ≈ $24. Берите рынок, где до погашения столько дней, сколько вы готовы не трогать деньги: продажа раньше — по рыночной цене, без гарантированного процента." },
      { h: "Выберите рынок в нашей таблице", b: "Смотрите на три колонки вместе: APY, дату погашения и ликвидность. Высокий APY на малоизвестном стейблкоине — плата за риск, а не подарок. Для первого раза лучше рынки с ликвидностью от $10M и стейблкоинами, о которых вы уже слышали. Колонка «Сеть» показывает, где именно лежит рынок — деньги нужно иметь именно в этой сети." },
      { h: "Подготовьте кошелёк", b: "Нужен некастодиальный кошелёк — Rabby или MetaMask (расширение для браузера). Seed-фразу запишите на бумаге и никому не показывайте: ни «поддержке», ни сайтам. Биржевой аккаунт для Pendle не подходит — покупать PT можно только со своего кошелька." },
      { h: "Переведите USDC и немного монеты для комиссий", b: "Выведите USDC (или USDT) с биржи на адрес кошелька именно в сети рынка — Arbitrum, Base, BNB Chain или Ethereum. Также нужна монета для оплаты газа: ETH для Ethereum, Arbitrum и Base, BNB для BNB Chain — в L2-сетях хватит $3–5. В Ethereum комиссии намного выше, поэтому суммы до нескольких тысяч долларов выгоднее размещать в Arbitrum или Base. Сначала отправьте небольшую тестовую сумму." },
      { h: "Откройте рынок и подключите кошелёк", b: "Нажмите название рынка в нашей таблице — откроется страница Pendle сразу на вкладке PT. Проверьте адрес: app.pendle.finance. Нажмите «Connect Wallet» и подтвердите подключение в кошельке. Убедитесь, что вверху выбрана та же сеть, что и в таблице." },
      { h: "Покупайте именно PT, а не YT", b: "В блоке Swap должен быть выбран PT. YT — совсем другой продукт: к дате погашения он дешевеет до нуля, это ставка на рост процентов. Перепутать их — самая дорогая ошибка новичка." },
      { h: "Введите сумму и проверьте детали", b: "Выберите монету, которой платите (USDC — Pendle сам обменяет её через агрегатор), и сумму. Перед подтверждением посмотрите: сколько PT получите, фиксированный APY после покупки и Price Impact. Если Price Impact больше 0,5% — сумму лучше разбить или выбрать рынок с большей ликвидностью." },
      { h: "Подтвердите две транзакции", b: "Сначала Approve — разрешение контракту Pendle списать ваш USDC (лучше разрешить ровно нужную сумму, а не «безлимитно»). Потом сама покупка. После этого PT появится в кошельке и в разделе Dashboard на Pendle." },
      { h: "Ждите даты погашения", b: "Ничего нажимать не нужно: цена PT каждый день приближается к 1,00. В Dashboard видна текущая стоимость. Временные колебания цены на ваш результат в дату погашения не влияют." },
    ],
    sections: [
      {
        title: "Как забрать деньги после погашения", url: "https://app.pendle.finance/trade/dashboard", level: "medium",
        steps: [
          { h: "Откройте Dashboard → Redeem", b: "После даты погашения PT больше не дорожает. Деньги не возвращаются автоматически — нажмите Redeem и обменяйте PT 1:1 на базовый актив." },
          { h: "Обменяйте актив обратно на USDC", b: "Вы получите базовый актив рынка (например, USDe или sUSDe), а не обязательно USDC. При необходимости обменяйте его в самом Pendle или через агрегатор (1inch, CowSwap) и проверьте курс." },
          { h: "Или вложите снова", b: "Откройте нашу таблицу ещё раз и выберите новый рынок — ставки меняются каждый день." },
        ],
      },
      {
        title: "Если деньги нужны раньше", url: PENDLE_URL, level: "medium",
        steps: [
          { h: "Продайте PT на той же странице", b: "В Swap выберите Sell PT. Цена будет рыночной: если ставки на рынке выросли с момента покупки, получите меньше, чем ожидали, а можете уйти и в небольшой минус." },
          { h: "Сравните с ожиданием до погашения", b: "Часто выгоднее дождаться даты погашения, чем продавать с дисконтом. Поэтому вкладывайте только те деньги, которые не понадобятся до этой даты." },
        ],
      },
    ],
    facts: [
      "Фиксируется только процент. Если сам стейблкоин потеряет привязку к доллару (особенно синтетический — USDe, USD0 и т. п.), PT подешевеет вместе с ним.",
      "Риск смарт-контрактов: Pendle и базовый протокол — это код, в котором могут найтись уязвимости. Не кладите всё в один рынок.",
      "APY в таблице — на момент обновления. Ваш процент фиксируется по цене, по которой вы купили, а в таблице продолжает меняться.",
      "Крупные суммы относительно ликвидности рынка ухудшают цену — смотрите на Price Impact.",
      "Никогда не вводите seed-фразу на сайтах и не подписывайте непонятные транзакции. Pendle никогда не пишет первым в Telegram или Discord.",
      "После погашения отзывайте разрешения (Approve) через revoke.cash, если больше не пользуетесь рынком.",
      "Прибыль может облагаться налогом — проверьте правила своей страны.",
    ],
    source: "Источник: документация и приложение Pendle",
  },
};

const all = (l: Locale) => [bitget[l], pendle[l], ...autoGuides(l, (id) => venueOf(id).name)];
/** Hand-made guides (with screenshots) first, then the template ones for every other exchange and DEX. */
export const GUIDES: Record<Locale, Guide[]> = { uk: all("uk"), en: all("en"), ru: all("ru") };
export const GUIDE_IDS = GUIDES.en.map((g) => g.id);
