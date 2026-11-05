import type { Locale } from "./i18n";
import type { Guide, GuideSection } from "./guides";

/**
 * Text-only guides for every exchange and DEX (user chose "б для всіх бірж та декс", 06.11).
 * Steps come from per-product templates; each venue only supplies its real product names, verified links and network.
 * No screenshots: most exchanges don't show their pages to automated browsers.
 */
type Kind = "launchpool" | "earn" | "rewards" | "boosthub" | "wallet" | "vault" | "lp" | "points" | "fixed";
interface Product { kind: Kind; name: string; url: string }
interface VenueSpec { venue: string; products: Product[]; chain?: string; wallet?: string; note?: Partial<Record<Locale, string>> }

const CEX: VenueSpec[] = [
  { venue: "binance", products: [{ kind: "launchpool", name: "Launchpool", url: "https://www.binance.com/en/launchpool" }, { kind: "earn", name: "Simple Earn", url: "https://www.binance.com/en/simple-earn" }] },
  { venue: "bybit", products: [{ kind: "launchpool", name: "Launchpool", url: "https://www.bybit.com/en/trade/spot/launchpool" }, { kind: "earn", name: "Bybit Earn", url: "https://www.bybit.com/en/earn/home" }] },
  { venue: "okx", products: [{ kind: "launchpool", name: "Jumpstart", url: "https://www.okx.com/jumpstart" }, { kind: "earn", name: "Simple Earn / Flash Earn", url: "https://www.okx.com/earn/simple-earn" }] },
  { venue: "gate", products: [{ kind: "launchpool", name: "Launchpool", url: "https://www.gate.com/launchpool" }, { kind: "earn", name: "Simple Earn", url: "https://www.gate.com/simple-earn" }],
    note: { uk: "Сторінки Launchpool і Earn на Gate недоступні з країн ЄС — там відкриється Gate EU з іншим набором продуктів.", en: "Gate's Launchpool and Earn pages aren't available from EU countries — you'll be sent to Gate EU with different products.", ru: "Страницы Launchpool и Earn на Gate недоступны из стран ЕС — откроется Gate EU с другим набором продуктов." } },
  { venue: "mexc", products: [{ kind: "launchpool", name: "Launchpool", url: "https://www.mexc.com/launchpool" }, { kind: "earn", name: "MEXC Earn", url: "https://www.mexc.com/earn" }] },
  { venue: "kucoin", products: [{ kind: "launchpool", name: "GemPool", url: "https://www.kucoin.com/gempool" }, { kind: "earn", name: "KuCoin Earn", url: "https://www.kucoin.com/earn" }] },
  { venue: "lbank", products: [{ kind: "boosthub", name: "BoostHub", url: "https://www.lbank.com/boosthub" }] },
  { venue: "htx", products: [{ kind: "earn", name: "HTX Earn", url: "https://www.htx.com/en-us/financial/earn/" }] },
  { venue: "bingx", products: [{ kind: "launchpool", name: "Launchpool", url: "https://bingx.com/en/launchpool" }] },
  { venue: "phemex", products: [{ kind: "launchpool", name: "Launchpool", url: "https://phemex.com/earn-crypto/launchpool" }] },
  { venue: "bitmart", products: [{ kind: "earn", name: "BitMart Earn", url: "https://www.bitmart.com/en-US/earn" }, { kind: "rewards", name: "Rewards Hub", url: "https://www.bitmart.com/en-US/rewards-hub" }] },
  { venue: "coinex", products: [{ kind: "earn", name: "Flexible Earn", url: "https://www.coinex.com/en/financial" }] },
  { venue: "xt", products: [{ kind: "rewards", name: "Rewards Hub", url: "https://www.xt.com/en/activity/rewards-hub" }] },
  { venue: "weex", products: [{ kind: "rewards", name: "Rewards Hub", url: "https://www.weex.com/rewardhub" }] },
  { venue: "bitunix", products: [{ kind: "earn", name: "Bitunix Earn", url: "https://www.bitunix.com/earn/financial-management" }, { kind: "rewards", name: "Welfare Center", url: "https://www.bitunix.com/activity/welfare-center" }] },
  { venue: "whitebit", products: [{ kind: "earn", name: "Crypto Lending", url: "https://whitebit.com/earn" }] },
  { venue: "bitrue", products: [{ kind: "earn", name: "Staking", url: "https://www.bitrue.com/staking" }] },
  { venue: "kraken", products: [{ kind: "earn", name: "Kraken Earn", url: "https://www.kraken.com" }],
    note: { uk: "Earn у Kraken доступний не в усіх країнах — перевірте, чи є пункт Earn у меню вашого акаунта.", en: "Kraken Earn isn't available in every country — check whether Earn appears in your account menu.", ru: "Earn у Kraken доступен не во всех странах — проверьте, есть ли пункт Earn в меню вашего аккаунта." } },
];

const DEX: VenueSpec[] = [
  { venue: "hyperliquid", chain: "Arbitrum (USDC)", wallet: "MetaMask / Rabby", products: [{ kind: "vault", name: "HLP Vault", url: "https://app.hyperliquid.xyz/vaults" }, { kind: "points", name: "Hyperliquid", url: "https://app.hyperliquid.xyz" }] },
  { venue: "lighter", chain: "Ethereum / Arbitrum", wallet: "MetaMask / Rabby", products: [{ kind: "points", name: "Lighter", url: "https://app.lighter.xyz" }] },
  { venue: "aster", chain: "BNB Chain / Arbitrum", wallet: "MetaMask / Rabby", products: [{ kind: "points", name: "Aster", url: "https://www.asterdex.com" }] },
  { venue: "pancakeswap", chain: "BNB Chain", wallet: "MetaMask / Trust Wallet", products: [{ kind: "lp", name: "PancakeSwap Liquidity / Farms", url: "https://pancakeswap.finance" }] },
  { venue: "raydium", chain: "Solana", wallet: "Phantom / Solflare", products: [{ kind: "lp", name: "Raydium Liquidity", url: "https://raydium.io" }] },
  { venue: "gmx", chain: "Arbitrum / Avalanche", wallet: "MetaMask / Rabby", products: [{ kind: "vault", name: "GM / GLV pools", url: "https://app.gmx.io/pools" }] },
  { venue: "meteora", chain: "Solana", wallet: "Phantom / Solflare", products: [{ kind: "lp", name: "Meteora DLMM", url: "https://www.meteora.ag" }] },
  { venue: "bluefin", chain: "Sui", wallet: "Sui Wallet / Slush", products: [{ kind: "points", name: "Bluefin", url: "https://bluefin.io" }] },
  { venue: "edgex", chain: "Ethereum / Arbitrum", wallet: "MetaMask / Rabby", products: [{ kind: "points", name: "edgeX", url: "https://www.edgex.exchange" }] },
  { venue: "aerodrome", chain: "Base", wallet: "MetaMask / Coinbase Wallet", products: [{ kind: "lp", name: "Aerodrome Liquidity", url: "https://aerodrome.finance/liquidity" }] },
  { venue: "pendle", chain: "Ethereum / Arbitrum / Base", wallet: "MetaMask / Rabby", products: [{ kind: "fixed", name: "Pendle PT", url: "https://www.pendle.finance" }] },
];

type T = Record<Locale, { title: string; steps: Array<[string, string]> }>;
// {n} = product name, {v} = venue, {c} = network, {w} = wallets
const TPL: Record<Kind, T> = {
  launchpool: {
    uk: { title: "{n}: стейк → нові токени", steps: [["Пройдіть верифікацію (KYC)", "Без неї винагороду в {n} зазвичай не нараховують."], ["Відкрийте сторінку {n}", "Там список поточних пулів: що блокувати, який токен отримаєте, APR і скільки днів залишилось."], ["Оберіть простий пул", "Найпростіше — пул зі стейком USDT/USDC або токена самої біржі. Пули зі стейком нового токена — для досвідчених."], ["Натисніть Stake і введіть суму", "Не більше ліміту на акаунт («Max») — понад нього винагорода не нараховується."], ["Забирайте винагороду", "Токени нараховуються щогодини або щодня (залежить від біржі). Наприкінці заберіть стейк (Redeem / Unstake) — правила дострокового виходу дивіться на картці пулу."]] },
    en: { title: "{n}: stake → new tokens", steps: [["Verify your identity (KYC)", "Without it {n} usually doesn't pay rewards."], ["Open the {n} page", "It lists running pools: what to lock, which token you get, APR and days left."], ["Pick a simple pool", "Easiest: a pool staking USDT/USDC or the exchange's own token. Pools staking the new token are for advanced users."], ["Press Stake and enter an amount", "Stay within the per-account cap ('Max') — nothing is paid above it."], ["Collect rewards", "Tokens accrue hourly or daily (depends on the exchange). At the end take your stake back (Redeem / Unstake) — early-exit rules are on the pool card."]] },
    ru: { title: "{n}: стейк → новые токены", steps: [["Пройдите верификацию (KYC)", "Без неё награду в {n} обычно не начисляют."], ["Откройте страницу {n}", "Там список текущих пулов: что блокировать, какой токен получите, APR и сколько дней осталось."], ["Выберите простой пул", "Проще всего — пул со стейком USDT/USDC или токена самой биржи. Пулы со стейком нового токена — для опытных."], ["Нажмите Stake и введите сумму", "Не больше лимита на аккаунт («Max») — сверх него награда не начисляется."], ["Забирайте награду", "Токены начисляются каждый час или день (зависит от биржи). В конце заберите стейк (Redeem / Unstake) — правила досрочного выхода смотрите на карточке пула."]] },
  },
  earn: {
    uk: { title: "{n}: відсотки на USDT", steps: [["Відкрийте {n}", "Знайдіть USDT або USDC через пошук монети."], ["Оберіть тип", "Гнучкий — забрати можна будь-коли, ставка змінюється. Фіксований — ставка вища, але гроші заблоковані на строк."], ["Перевірте ліміти підвищеної ставки", "Високий APR часто діє лише на першу невелику суму або тільки для нових користувачів — це написано в описі продукту."], ["Натисніть Subscribe і введіть суму", "Відсотки нараховуються щодня — їх видно в історії Earn."], ["Забрати гроші", "Кнопка Redeem. Для фіксованого — після завершення строку."]] },
    en: { title: "{n}: interest on USDT", steps: [["Open {n}", "Search for USDT or USDC."], ["Choose the type", "Flexible — withdraw any time, the rate changes. Fixed — higher rate, money locked for a term."], ["Check the boosted-rate limits", "A high APR often applies only to a small first amount or new users — it's in the product description."], ["Press Subscribe and enter an amount", "Interest accrues daily — see it in Earn history."], ["Withdraw", "Press Redeem. Fixed products: after the term ends."]] },
    ru: { title: "{n}: проценты на USDT", steps: [["Откройте {n}", "Найдите USDT или USDC через поиск монеты."], ["Выберите тип", "Гибкий — забрать можно когда угодно, ставка меняется. Фиксированный — ставка выше, но деньги заблокированы на срок."], ["Проверьте лимиты повышенной ставки", "Высокий APR часто действует только на первую небольшую сумму или только для новых пользователей — это написано в описании продукта."], ["Нажмите Subscribe и введите сумму", "Проценты начисляются каждый день — их видно в истории Earn."], ["Забрать деньги", "Кнопка Redeem. Для фиксированного — после окончания срока."]] },
  },
  rewards: {
    uk: { title: "{n}: завдання і бонуси", steps: [["Відкрийте {n}", "Тут зібрані поточні акції біржі: бонуси новачкам, завдання, розіграші."], ["Натисніть Join / Register в акції", "Без реєстрації в конкретній акції дії не зараховуються."], ["Виконайте умови", "Зазвичай: KYC, депозит, угода на певну суму. Уважно: бонуси «на ф'ючерси» можна використати лише в торгівлі з плечем."], ["Заберіть нагороду", "У тому ж розділі (Claim). Часто це купон на комісії, а не живі гроші."]] },
    en: { title: "{n}: tasks and bonuses", steps: [["Open {n}", "It collects the exchange's current promos: new-user bonuses, tasks, draws."], ["Press Join / Register on a promo", "Without registering for that promo your actions don't count."], ["Meet the conditions", "Usually: KYC, a deposit, a trade of a certain size. Careful: 'futures' bonuses only work in leveraged trading."], ["Claim the reward", "In the same section (Claim). Often it's a fee voucher, not cash."]] },
    ru: { title: "{n}: задания и бонусы", steps: [["Откройте {n}", "Здесь собраны текущие акции биржи: бонусы новичкам, задания, розыгрыши."], ["Нажмите Join / Register в акции", "Без регистрации в конкретной акции действия не засчитываются."], ["Выполните условия", "Обычно: KYC, депозит, сделка на определённую сумму. Внимательно: бонусы «на фьючерсы» можно использовать только в торговле с плечом."], ["Заберите награду", "В том же разделе (Claim). Часто это купон на комиссии, а не живые деньги."]] },
  },
  boosthub: {
    uk: { title: "{n}: два пули на кожен проєкт", steps: [["Пройдіть верифікацію", "Без KYC участь недоступна."], ["Відкрийте {n}", "У кожного проєкту два пули: Smart Pool (реєстрація — приз ділиться між учасниками) і пул ф'ючерсних позицій."], ["Smart Pool — найпростіше", "Натисніть «Register» — і ви в розіграші частки призового фонду, нічого не блокуючи. Є ліміт винагороди на людину."], ["Пул ф'ючерсних позицій — для досвідчених", "Винагорода за утримання чистої ф'ючерсної позиції. Позиція з плечем може принести збиток більший за приз."]] },
    en: { title: "{n}: two pools per project", steps: [["Verify your identity", "KYC is required."], ["Open {n}", "Each project has two pools: a Smart Pool (register — the prize is split among participants) and a futures-position pool."], ["Smart Pool — the easy one", "Press 'Register' to share the prize pool without locking anything. There's a per-person reward cap."], ["Futures-position pool — advanced", "Rewards for holding a net futures position. A leveraged position can lose more than the prize."]] },
    ru: { title: "{n}: два пула на каждый проект", steps: [["Пройдите верификацию", "Без KYC участие недоступно."], ["Откройте {n}", "У каждого проекта два пула: Smart Pool (регистрация — приз делится между участниками) и пул фьючерсных позиций."], ["Smart Pool — самый простой", "Нажмите «Register» — и вы в розыгрыше доли призового фонда, ничего не блокируя. Есть лимит награды на человека."], ["Пул фьючерсных позиций — для опытных", "Награда за удержание чистой фьючерсной позиции. Позиция с плечом может принести убыток больше приза."]] },
  },
  wallet: {
    uk: { title: "Підготовка: гаманець і гроші", steps: [["Встановіть гаманець", "{w}. Запишіть seed-фразу на папері і нікому її не показуйте."], ["Купіть USDC на біржі", "Звичайна біржа (Binance, Bybit, OKX…) → купити USDC через P2P або картку."], ["Виведіть у правильну мережу", "{v} працює в мережі {c}. При виведенні з біржі оберіть саме її — помилка в мережі = втрачені гроші. Спершу надішліть невелику тестову суму."], ["Підключіть гаманець до {v}", "Кнопка Connect на сайті. Перевірте адресу сайту — фішингові копії DeFi-сайтів трапляються дуже часто."]] },
    en: { title: "Setup: wallet and funds", steps: [["Install a wallet", "{w}. Write the seed phrase on paper and never show it to anyone."], ["Buy USDC on an exchange", "A regular exchange (Binance, Bybit, OKX…) → buy USDC via P2P or card."], ["Withdraw to the right network", "{v} runs on {c}. Pick exactly that network when withdrawing — a wrong network means lost funds. Send a small test amount first."], ["Connect the wallet to {v}", "The Connect button on the site. Double-check the address — phishing copies of DeFi sites are very common."]] },
    ru: { title: "Подготовка: кошелёк и деньги", steps: [["Установите кошелёк", "{w}. Запишите seed-фразу на бумаге и никому её не показывайте."], ["Купите USDC на бирже", "Обычная биржа (Binance, Bybit, OKX…) → купить USDC через P2P или карту."], ["Выведите в правильную сеть", "{v} работает в сети {c}. При выводе с биржи выберите именно её — ошибка в сети = потерянные деньги. Сначала отправьте небольшую тестовую сумму."], ["Подключите кошелёк к {v}", "Кнопка Connect на сайте. Проверьте адрес сайта — фишинговые копии DeFi-сайтов встречаются очень часто."]] },
  },
  vault: {
    uk: { title: "{n}: внесок у сховище ліквідності", steps: [["Відкрийте {n}", "Сховище (vault) — спільний пул, який заробляє на торгівлі інших людей: комісіях і їхніх збитках."], ["Подивіться APR за 30 днів", "Дохід не гарантований: у погані для сховища місяці він буває від'ємним."], ["Внесіть суму (Deposit)", "Перевірте період блокування — деякі сховища не дозволяють вивести гроші кілька днів після внеску."], ["Виведення", "Кнопка Withdraw після закінчення блокування."]] },
    en: { title: "{n}: deposit into a liquidity vault", steps: [["Open {n}", "A vault is a shared pool that earns from other people's trading: fees and their losses."], ["Look at the 30-day APR", "Income isn't guaranteed: in bad months for the vault it can be negative."], ["Deposit an amount", "Check the lock-up — some vaults don't allow withdrawals for a few days after depositing."], ["Withdraw", "Press Withdraw once the lock-up ends."]] },
    ru: { title: "{n}: взнос в хранилище ликвидности", steps: [["Откройте {n}", "Хранилище (vault) — общий пул, который зарабатывает на торговле других людей: комиссиях и их убытках."], ["Посмотрите APR за 30 дней", "Доход не гарантирован: в плохие для хранилища месяцы он бывает отрицательным."], ["Внесите сумму (Deposit)", "Проверьте период блокировки — некоторые хранилища не позволяют вывести деньги несколько дней после взноса."], ["Вывод", "Кнопка Withdraw после окончания блокировки."]] },
  },
  lp: {
    uk: { title: "{n}: надати ліквідність", steps: [["Відкрийте {n}", "Пули показують TVL, APR і пару монет."], ["Оберіть пул стейблкоїнів", "Пара на кшталт USDC/USDT майже не має impermanent loss. Пари з волатильними монетами — для досвідчених."], ["Додайте ліквідність (Add Liquidity)", "Зазвичай потрібні обидві монети пари в однаковій вартості. Підтвердіть транзакцію в гаманці (потрібен газ у монеті мережі)."], ["Застейкайте LP-токени, якщо є ферма", "На деяких DEX нагорода в їхньому токені нараховується лише за застейкані LP (Farms / Gauges)."], ["Виведення", "Remove Liquidity — отримаєте обидві монети назад у поточній пропорції."]] },
    en: { title: "{n}: provide liquidity", steps: [["Open {n}", "Pools show TVL, APR and the coin pair."], ["Pick a stablecoin pool", "A pair like USDC/USDT has almost no impermanent loss. Pairs with volatile coins are for advanced users."], ["Add Liquidity", "Usually both coins in equal value. Confirm the transaction in the wallet (you need gas in the network's coin)."], ["Stake LP tokens if there's a farm", "On some DEXes the token reward is paid only for staked LP (Farms / Gauges)."], ["Withdraw", "Remove Liquidity — you get both coins back in the current proportion."]] },
    ru: { title: "{n}: предоставить ликвидность", steps: [["Откройте {n}", "Пулы показывают TVL, APR и пару монет."], ["Выберите пул стейблкоинов", "Пара вроде USDC/USDT почти не имеет impermanent loss. Пары с волатильными монетами — для опытных."], ["Добавьте ликвидность (Add Liquidity)", "Обычно нужны обе монеты пары в равной стоимости. Подтвердите транзакцию в кошельке (нужен газ в монете сети)."], ["Застейкайте LP-токены, если есть ферма", "На некоторых DEX награда в их токене начисляется только за застейканные LP (Farms / Gauges)."], ["Вывод", "Remove Liquidity — получите обе монеты обратно в текущей пропорции."]] },
  },
  points: {
    uk: { title: "{n}: поінти за торгівлю", steps: [["Внесіть USDC (Deposit)", "Після підключення гаманця."], ["Поінти нараховуються за активність", "Зазвичай за обсяг торгівлі, утримання позицій або участь у пулах. Правила — у розділі Points / Rewards на сайті."], ["Поінти ≠ гроші", "Їх можуть обміняти на токен в аірдропі, а можуть і ні — гарантій немає."], ["Обережно з плечем", "Це ф'ючерсна біржа: торгівля з плечем може швидко з'їсти депозит. Торгівля «заради поінтів» часто коштує більше комісіями, ніж приносить."]] },
    en: { title: "{n}: points for trading", steps: [["Deposit USDC", "After connecting the wallet."], ["Points are earned by activity", "Usually trading volume, holding positions or joining pools. Rules are in the Points / Rewards section."], ["Points ≠ money", "They may be converted into a token airdrop — or not; there are no guarantees."], ["Careful with leverage", "This is a futures exchange: leveraged trading can wipe a deposit fast. Trading 'for points' often costs more in fees than it earns."]] },
    ru: { title: "{n}: поинты за торговлю", steps: [["Внесите USDC (Deposit)", "После подключения кошелька."], ["Поинты начисляются за активность", "Обычно за объём торговли, удержание позиций или участие в пулах. Правила — в разделе Points / Rewards на сайте."], ["Поинты ≠ деньги", "Их могут обменять на токен в аирдропе, а могут и нет — гарантий нет."], ["Осторожно с плечом", "Это фьючерсная биржа: торговля с плечом может быстро съесть депозит. Торговля «ради поинтов» часто стоит комиссиями больше, чем приносит."]] },
  },
  fixed: {
    uk: { title: "{n}: фіксована дохідність", steps: [["Відкрийте ринки Pendle", "Кожен ринок — актив з датою погашення (maturity)."], ["Купіть PT", "PT продається дешевше за базовий актив; до дати погашення він дорожчає до повної вартості — це і є фіксована дохідність."], ["Тримайте до погашення", "Продати раніше можна, але ціна PT до погашення коливається."], ["Ризик базового активу", "Фіксується лише дохідність. Якщо сам актив (наприклад, синтетичний стейблкоїн) втратить прив'язку — PT теж подешевшає."]] },
    en: { title: "{n}: fixed yield", steps: [["Open Pendle markets", "Each market is an asset with a maturity date."], ["Buy PT", "PT trades below the underlying asset and rises to full value by maturity — that's the fixed yield."], ["Hold to maturity", "You can sell earlier, but PT's price moves before maturity."], ["Underlying risk", "Only the yield is fixed. If the asset itself (e.g. a synthetic stablecoin) depegs, PT falls too."]] },
    ru: { title: "{n}: фиксированная доходность", steps: [["Откройте рынки Pendle", "Каждый рынок — актив с датой погашения (maturity)."], ["Купите PT", "PT продаётся дешевле базового актива; к дате погашения он дорожает до полной стоимости — это и есть фиксированная доходность."], ["Держите до погашения", "Продать раньше можно, но цена PT до погашения колеблется."], ["Риск базового актива", "Фиксируется только доходность. Если сам актив (например, синтетический стейблкоин) потеряет привязку — PT тоже подешевеет."]] },
  },
};

const TXT: Record<Locale, { titleCex: string; titleDex: string; subCex: string; subDex: string; source: string; facts: string[]; factsDex: string[] }> = {
  uk: { titleCex: "{v}: як заробити на акціях", titleDex: "{v}: як заробити на DEX", subCex: "Покрокові інструкції для продуктів {v}. Назви кнопок можуть трохи відрізнятися — орієнтуйтесь на розділи Earn / Rewards.", subDex: "Децентралізована біржа: без акаунта, через гаманець. Складніше і ризиковіше, ніж звичайна біржа.", source: "Складено за офіційними сторінками продуктів {v}", facts: ["Починайте з невеликої суми, поки не розберетеся.", "Відкривайте сайт біржі лише за посиланнями нижче або із закладок."], factsDex: ["Ризик смарт-контракту: навіть великі протоколи зламують.", "Кожна транзакція коштує газу — на малих сумах комісії з'їдають дохід.", "Ніхто з підтримки не просить seed-фразу."] },
  en: { titleCex: "{v}: how to earn from promos", titleDex: "{v}: how to earn on the DEX", subCex: "Step-by-step for {v}'s products. Button names may differ a little — look in the Earn / Rewards sections.", subDex: "A decentralised exchange: no account, works through a wallet. Harder and riskier than a regular exchange.", source: "Based on {v}'s official product pages", facts: ["Start with a small amount until you get the hang of it.", "Open the exchange only via the links below or your bookmarks."], factsDex: ["Smart-contract risk: even big protocols get hacked.", "Every transaction costs gas — on small amounts fees eat the income.", "No real support ever asks for your seed phrase."] },
  ru: { titleCex: "{v}: как заработать на акциях", titleDex: "{v}: как заработать на DEX", subCex: "Пошаговые инструкции для продуктов {v}. Названия кнопок могут немного отличаться — ориентируйтесь на разделы Earn / Rewards.", subDex: "Децентрализованная биржа: без аккаунта, через кошелёк. Сложнее и рискованнее обычной биржи.", source: "Составлено по официальным страницам продуктов {v}", facts: ["Начинайте с небольшой суммы, пока не разберётесь.", "Открывайте сайт биржи только по ссылкам ниже или из закладок."], factsDex: ["Риск смарт-контракта: даже крупные протоколы взламывают.", "Каждая транзакция стоит газа — на малых суммах комиссии съедают доход.", "Никакая поддержка не просит seed-фразу."] },
};

const fill = (s: string, m: Record<string, string>) => s.replace(/\{(\w)\}/g, (_, k) => m[k] ?? "");

export function autoGuides(lang: Locale, venueName: (id: string) => string): Guide[] {
  const X = TXT[lang];
  const build = (spec: VenueSpec, dex: boolean): Guide => {
    const v = venueName(spec.venue);
    const base = { v, c: spec.chain ?? "", w: spec.wallet ?? "" };
    const sections: GuideSection[] = [];
    if (dex) { const t = TPL.wallet[lang]; sections.push({ title: fill(t.title, base), url: spec.products[0].url, level: "hard", steps: t.steps.map(([h, b]) => ({ h: fill(h, base), b: fill(b, base) })) }); }
    for (const p of spec.products) {
      const m = { ...base, n: p.name }, t = TPL[p.kind][lang];
      const level = dex ? "hard" : p.kind === "boosthub" ? "medium" : "easy";
      sections.push({ title: fill(t.title, m), url: p.url, level, steps: t.steps.map(([h, b]) => ({ h: fill(h, m), b: fill(b, m) })) });
    }
    return {
      id: spec.venue, venue: spec.venue, url: spec.products[0].url, checked: "2026-11-06", level: dex ? "hard" : "easy",
      title: fill(dex ? X.titleDex : X.titleCex, base), sub: fill(dex ? X.subDex : X.subCex, base),
      steps: [], sections, facts: [...(spec.note?.[lang] ? [spec.note[lang]!] : []), ...(dex ? X.factsDex : X.facts)], source: fill(X.source, base),
    };
  };
  return [...CEX.map((s) => build(s, false)), ...DEX.map((s) => build(s, true))];
}
