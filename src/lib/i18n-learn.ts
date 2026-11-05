import type { Locale } from "./i18n";

type Steps = Array<[string, string]>;
export interface LearnDict {
  nav: string; toggle: string; toggleHint: string;
  banner: string; bannerLink: string; bannerOff: string;
  hubTitle: string; hubSub: string;
  cards: Record<"start" | "how" | "safety" | "quiz" | "glossary", [string, string]>;
  open: string; back: string;
  start: { title: string; sub: string; steps: Steps; tip: string; next: string };
  how: { title: string; sub: string; sections: Array<{ id: string; title: string; level: string; steps: Steps; watch: string }>; links: string };
  safety: { title: string; sub: string; rules: Steps };
  quiz: {
    title: string; sub: string; q: Array<{ id: string; text: string; opts: Array<[string, string]> }>;
    result: string; again: string; perMonth: string; perDays: string; noAccount: string; why: Record<string, string>; empty: string;
  };
  glossary: { title: string; sub: string; search: string };
}

const uk: LearnDict = {
  nav: "Новачкам", toggle: "Новачок", toggleHint: "Режим новачка: простіші акції, пояснення термінів, прибуток у доларах",
  banner: "Режим новачка: показуємо простіші й безпечніші варіанти, складні (ф'ючерси, DeFi, хедж) сховані. Наводьте на підкреслені слова — там пояснення.",
  bannerLink: "З чого почати →", bannerOff: "Вимкнути",
  hubTitle: "Новачкам", hubSub: "Усе, щоб заробити на акціях бірж, навіть якщо ви ніколи не купували криптовалюту.",
  cards: {
    start: ["Старт з нуля", "Від гривні до першого заробітку за 15 хвилин"],
    how: ["Як взяти участь", "Launchpool, Earn, бонуси і змагання — покроково"],
    safety: ["Безпека", "10 правил, щоб не втратити гроші через шахраїв"],
    quiz: ["Що мені підходить?", "4 питання — і 3 конкретні варіанти саме для вас"],
    glossary: ["Словник", "APR, стейк, KYC та інші слова простою мовою"],
  },
  open: "Відкрити", back: "← Новачкам",
  start: {
    title: "Старт з нуля", sub: "Шлях від звичайних грошей до першого доходу на біржі. Найпростіший і найбезпечніший варіант — стейблкоїни.",
    steps: [
      ["Оберіть одну велику біржу", "Binance, Bybit, OKX, Bitget або Gate — у них найбільше акцій. Відкрийте сайт біржі тільки з нашого списку або набравши адресу вручну."],
      ["Зареєструйтеся і пройдіть KYC", "Пошта або телефон + паспорт і селфі. Займає 5–15 хвилин. Без KYC більшість акцій недоступні."],
      ["Увімкніть 2FA", "Google Authenticator у налаштуваннях безпеки. Це головний захист від крадіжки акаунта."],
      ["Купіть USDT", "Розділ «Купити крипту» → P2P (оплата з картки іншій людині, біржа гарантує угоду) або «Картка». Почніть з невеликої суми: $20–100."],
      ["Покладіть USDT в Earn або Launchpool", "Earn → гнучкий USDT: відсотки щодня, забрати можна будь-коли. Або Launchpool зі стейком USDT — отримуватимете нові токени."],
      ["Заберіть винагороду", "Раз на кілька днів продавайте отримані токени Launchpool за USDT — нові токени часто дешевшають після лістингу."],
    ],
    tip: "Порада: не вкладайте гроші, які можуть знадобитися найближчим часом, і не купуйте «монети, що точно виростуть» з Telegram-каналів.",
    next: "Що далі: пройдіть тест «Що мені підходить?» — підберемо варіанти з поточних акцій.",
  },
  how: {
    title: "Як взяти участь", sub: "Покрокові інструкції для кожного типу акцій. Назви кнопок на біржах схожі — шукайте їх у меню «Earn», «Заробіток» або «Події».",
    sections: [
      { id: "launchpool", title: "Launchpool / GemPool / PoolX", level: "easy",
        steps: [["Відкрийте сторінку Launchpool біржі", "Кнопка «Стейкати» на нашому сайті веде одразу туди."], ["Оберіть пул зі стейком USDT", "Це найпростіше: ціна USDT не змінюється. Пули зі стейком нового токена — для досвідчених."], ["Натисніть «Stake» і введіть суму", "Не більше «Макс.» — понад ліміт винагорода не нараховується."], ["Забирайте нагороду", "Токени нараховуються щогодини або щодня. Наприкінці пулу заберіть стейк назад (Redeem/Unstake)."]],
        watch: "Зверніть увагу: APR падає, коли приходить більше учасників, а новий токен може подешевшати." },
      { id: "earn", title: "Earn (депозит на біржі)", level: "easy",
        steps: [["Розділ Earn / Simple Earn / Заощадження", "Знайдіть USDT або USDC."], ["Гнучкий або фіксований", "Гнучкий — забрати будь-коли; фіксований — вища ставка, але гроші заблоковані на строк."], ["Subscribe і сума", "Підвищена ставка часто діє лише на першу невелику суму (наприклад, до 500 USDT) — це видно в описі."], ["Відсотки щодня", "Їх видно в історії Earn. Забрати — кнопка Redeem."]],
        watch: "Зверніть увагу: «до 600% APR» — зазвичай лише для нових користувачів і на $100–200." },
      { id: "bonus", title: "Бонуси новачкам", level: "easy",
        steps: [["Зареєструйтеся за посиланням акції", "Бонуси дають лише новим акаунтам на цій біржі."], ["Виконайте завдання", "Зазвичай: KYC, перший депозит, перша угода на певну суму."], ["Заберіть бонус у «Центрі нагород»", "Часто це купон на оплату комісій, а не живі гроші — читайте умови."]],
        watch: "Зверніть увагу: бонуси на ф'ючерси можна використати лише в торгівлі з плечем — це ризиковано." },
      { id: "competition", title: "Торгові змагання", level: "hard",
        steps: [["Натисніть «Join/Register»", "Без реєстрації в змаганні торгівля не рахується."], ["Торгуйте вказану пару", "Приз ділиться між тими, хто наторгував найбільший обсяг або прибуток."], ["Порахуйте комісії", "Щоб потрапити в призи, часто треба наторгувати так багато, що комісії більші за приз."]],
        watch: "Не для новачків: більшість змагань — на ф'ючерсах з плечем." },
    ],
    links: "Сторінки Launchpool бірж",
  },
  safety: {
    title: "Безпека", sub: "Найчастіше новачки втрачають гроші не на ринку, а через шахраїв. Ці правила закривають 95% ризиків.",
    rules: [
      ["Ніколи не показуйте seed-фразу і паролі", "Жодна біржа, «підтримка» чи «адмін» їх не просить. Хто просить — шахрай."],
      ["Відкривайте біржу лише з закладок", "Фішингові сайти копіюють дизайн і мають схожі адреси (binance-promo.com тощо). Посилання на нашому сайті ведуть на офіційні домени."],
      ["Увімкніть 2FA і код антифішингу", "Код антифішингу з'являтиметься в кожному справжньому листі біржі."],
      ["Підтримка не пише першою", "Повідомлення в Telegram від «Binance Support» — завжди шахраї."],
      ["Не переказуйте гроші «для отримання виграшу»", "Справжні акції ніколи не вимагають заплатити, щоб забрати приз."],
      ["Не вірте «гарантованому прибутку»", "Обіцянки «+5% на день» чи «подвоїмо депозит» — це піраміди."],
      ["Не купуйте токени з порад у чатах", "«Сигнали» і «інсайди» зазвичай від тих, хто хоче вам продати."],
      ["Тримайте гроші на великих біржах", "Невідомі біржі та «інвестплатформи» можуть просто закритися."],
      ["Перевіряйте адресу перед переказом", "Віруси підміняють скопійовану адресу гаманця. Звіряйте перші й останні символи."],
      ["Починайте з малої суми", "Спершу $20–50, щоб зрозуміти, як усе працює."],
    ],
  },
  quiz: {
    title: "Що мені підходить?", sub: "4 питання — і ми підберемо варіанти з акцій, що діють просто зараз.",
    q: [
      { id: "amount", text: "Яку суму готові вкласти?", opts: [["100", "До $100"], ["1000", "$100–1 000"], ["5000", "Більше $1 000"]] },
      { id: "term", text: "На який строк?", opts: [["short", "Хочу забрати будь-коли"], ["month", "Місяць-два"], ["long", "Пів року і більше"]] },
      { id: "risk", text: "Як ставитеся до ризику?", opts: [["none", "Не хочу втрачати навіть трохи"], ["some", "Готовий до невеликих коливань"], ["high", "Готовий ризикувати заради більшого"]] },
      { id: "account", text: "У вас уже є акаунт на біржі?", opts: [["no", "Ні, ще немає"], ["yes", "Так, є"]] },
    ],
    result: "Вам підходить", again: "Пройти ще раз", perMonth: "за місяць", perDays: "за {d} дн.", noAccount: "Спершу: Старт з нуля →",
    why: { earn: "Earn на стейблкоїні: ціна не змінюється, забрати можна будь-коли", lp: "Launchpool зі стейком USDT: отримуєте нові токени, USDT не дешевшає", lpMajor: "Launchpool зі стейком великої монети: дохід вищий, але ціна монети коливається", bonus: "Бонус для нових користувачів цієї біржі", fixed: "Фіксований Earn: ставка вища, гроші заблоковані на строк" },
    empty: "Зараз немає відповідних варіантів — загляньте завтра.",
  },
  glossary: { title: "Словник", sub: "Криптослова простою мовою. Ці ж пояснення з'являються, коли наводите на підкреслені слова на сайті.", search: "Пошук слова…" },
};

const en: LearnDict = {
  nav: "Beginners", toggle: "Beginner", toggleHint: "Beginner mode: simpler promos, explained terms, profit in dollars",
  banner: "Beginner mode: we show simpler and safer options and hide advanced ones (futures, DeFi, hedging). Hover the underlined words for explanations.",
  bannerLink: "Where to start →", bannerOff: "Turn off",
  hubTitle: "Beginners", hubSub: "Everything you need to earn from exchange promos, even if you've never bought crypto.",
  cards: {
    start: ["Start from zero", "From your bank card to your first income in 15 minutes"],
    how: ["How to join", "Launchpool, Earn, bonuses and competitions — step by step"],
    safety: ["Safety", "10 rules so scammers don't get your money"],
    quiz: ["What suits me?", "4 questions — 3 concrete options just for you"],
    glossary: ["Glossary", "APR, stake, KYC and other words in plain language"],
  },
  open: "Open", back: "← Beginners",
  start: {
    title: "Start from zero", sub: "From regular money to your first income on an exchange. The simplest and safest option is stablecoins.",
    steps: [
      ["Pick one big exchange", "Binance, Bybit, OKX, Bitget or Gate have the most promos. Open the exchange only from our list or by typing the address yourself."],
      ["Sign up and pass KYC", "Email or phone + passport and selfie. Takes 5–15 minutes. Most promos need KYC."],
      ["Turn on 2FA", "Google Authenticator in the security settings. Your main protection against account theft."],
      ["Buy USDT", "'Buy crypto' → P2P (you pay another person by card, the exchange guarantees the deal) or 'Card'. Start small: $20–100."],
      ["Put USDT into Earn or a Launchpool", "Earn → flexible USDT: daily interest, withdraw any time. Or a Launchpool with USDT stake — you receive new tokens."],
      ["Collect rewards", "Every few days sell the Launchpool tokens for USDT — new tokens often fall after listing."],
    ],
    tip: "Tip: don't invest money you may need soon, and don't buy 'coins that will surely pump' from Telegram channels.",
    next: "Next: take the 'What suits me?' quiz — we'll pick options from today's promos.",
  },
  how: {
    title: "How to join", sub: "Step-by-step for each promo type. Button names differ a little — look in the 'Earn', 'Rewards' or 'Events' menu.",
    sections: [
      { id: "launchpool", title: "Launchpool / GemPool / PoolX", level: "easy",
        steps: [["Open the exchange's Launchpool page", "The 'Stake' button on our site goes straight there."], ["Pick a pool with USDT stake", "Simplest: USDT doesn't change price. Pools staking the new token are for advanced users."], ["Press 'Stake' and enter an amount", "No more than 'Max' — nothing is paid above the cap."], ["Collect rewards", "Tokens accrue hourly or daily. When the pool ends, take your stake back (Redeem/Unstake)."]],
        watch: "Note: APR falls as more people join, and the new token can drop in price." },
      { id: "earn", title: "Earn (exchange deposit)", level: "easy",
        steps: [["Earn / Simple Earn / Savings", "Find USDT or USDC."], ["Flexible or fixed", "Flexible — withdraw any time; fixed — higher rate, locked for a term."], ["Subscribe and amount", "Boosted rates often apply only to a small first amount (e.g. up to 500 USDT) — check the description."], ["Daily interest", "See it in Earn history. Withdraw with Redeem."]],
        watch: "Note: 'up to 600% APR' is usually new users only and on $100–200." },
      { id: "bonus", title: "New-user bonuses", level: "easy",
        steps: [["Sign up via the promo link", "Bonuses only go to new accounts on that exchange."], ["Complete the tasks", "Usually: KYC, first deposit, first trade of a certain size."], ["Claim in the Rewards Center", "Often it's a fee voucher, not cash — read the terms."]],
        watch: "Note: futures bonuses can only be used for leveraged trading — risky." },
      { id: "competition", title: "Trading competitions", level: "hard",
        steps: [["Press 'Join/Register'", "Without registering, your trades don't count."], ["Trade the listed pair", "The prize is split among the biggest volume or PnL."], ["Count the fees", "Reaching the prizes often takes so much volume that fees exceed the prize."]],
        watch: "Not for beginners: most competitions are on leveraged futures." },
    ],
    links: "Exchange Launchpool pages",
  },
  safety: {
    title: "Safety", sub: "Beginners lose money to scammers more often than to the market. These rules cover 95% of the risk.",
    rules: [
      ["Never share your seed phrase or passwords", "No exchange, 'support' or 'admin' ever asks for them. Whoever asks is a scammer."],
      ["Open exchanges only from bookmarks", "Phishing sites copy the design and use look-alike addresses. Links on our site go to official domains."],
      ["Turn on 2FA and an anti-phishing code", "The code appears in every genuine email from the exchange."],
      ["Support never messages first", "A Telegram DM from 'Binance Support' is always a scam."],
      ["Never pay 'to receive a prize'", "Real promos never ask you to pay to collect a reward."],
      ["Don't trust 'guaranteed profit'", "'+5% a day' or 'we double your deposit' are Ponzi schemes."],
      ["Don't buy tokens from chat tips", "'Signals' and 'insider info' usually come from people selling to you."],
      ["Keep money on big exchanges", "Unknown exchanges and 'investment platforms' can just disappear."],
      ["Check the address before sending", "Malware swaps copied wallet addresses. Compare the first and last characters."],
      ["Start small", "First $20–50 to learn how everything works."],
    ],
  },
  quiz: {
    title: "What suits me?", sub: "4 questions — we'll pick options from promos running right now.",
    q: [
      { id: "amount", text: "How much do you want to put in?", opts: [["100", "Up to $100"], ["1000", "$100–1,000"], ["5000", "Over $1,000"]] },
      { id: "term", text: "For how long?", opts: [["short", "I want to withdraw any time"], ["month", "A month or two"], ["long", "Six months or more"]] },
      { id: "risk", text: "How do you feel about risk?", opts: [["none", "I don't want to lose anything"], ["some", "Small swings are fine"], ["high", "I'll risk more for more"]] },
      { id: "account", text: "Do you already have an exchange account?", opts: [["no", "Not yet"], ["yes", "Yes"]] },
    ],
    result: "Good fit for you", again: "Retake", perMonth: "a month", perDays: "in {d} days", noAccount: "First: Start from zero →",
    why: { earn: "Stablecoin Earn: price doesn't move, withdraw any time", lp: "Launchpool with USDT stake: earn new tokens, USDT doesn't fall", lpMajor: "Launchpool staking a big coin: higher income, but the coin's price moves", bonus: "New-user bonus on this exchange", fixed: "Fixed Earn: higher rate, money locked for a term" },
    empty: "No suitable options right now — check back tomorrow.",
  },
  glossary: { title: "Glossary", sub: "Crypto words in plain language. The same explanations pop up when you hover underlined words on the site.", search: "Search a word…" },
};

const ru: LearnDict = {
  nav: "Новичкам", toggle: "Новичок", toggleHint: "Режим новичка: простые акции, объяснения терминов, прибыль в долларах",
  banner: "Режим новичка: показываем более простые и безопасные варианты, сложные (фьючерсы, DeFi, хедж) скрыты. Наводите на подчёркнутые слова — там объяснения.",
  bannerLink: "С чего начать →", bannerOff: "Выключить",
  hubTitle: "Новичкам", hubSub: "Всё, чтобы заработать на акциях бирж, даже если вы никогда не покупали криптовалюту.",
  cards: {
    start: ["Старт с нуля", "От обычных денег до первого заработка за 15 минут"],
    how: ["Как участвовать", "Launchpool, Earn, бонусы и соревнования — пошагово"],
    safety: ["Безопасность", "10 правил, чтобы не потерять деньги из-за мошенников"],
    quiz: ["Что мне подходит?", "4 вопроса — и 3 конкретных варианта именно для вас"],
    glossary: ["Словарь", "APR, стейк, KYC и другие слова простым языком"],
  },
  open: "Открыть", back: "← Новичкам",
  start: {
    title: "Старт с нуля", sub: "Путь от обычных денег к первому доходу на бирже. Самый простой и безопасный вариант — стейблкоины.",
    steps: [
      ["Выберите одну большую биржу", "Binance, Bybit, OKX, Bitget или Gate — у них больше всего акций. Открывайте сайт биржи только из нашего списка или набрав адрес вручную."],
      ["Зарегистрируйтесь и пройдите KYC", "Почта или телефон + паспорт и селфи. Занимает 5–15 минут. Без KYC большинство акций недоступно."],
      ["Включите 2FA", "Google Authenticator в настройках безопасности. Главная защита от кражи аккаунта."],
      ["Купите USDT", "Раздел «Купить крипту» → P2P (оплата с карты другому человеку, биржа гарантирует сделку) или «Карта». Начните с небольшой суммы: $20–100."],
      ["Положите USDT в Earn или Launchpool", "Earn → гибкий USDT: проценты каждый день, забрать можно когда угодно. Или Launchpool со стейком USDT — будете получать новые токены."],
      ["Забирайте награду", "Раз в несколько дней продавайте полученные токены Launchpool за USDT — новые токены часто дешевеют после листинга."],
    ],
    tip: "Совет: не вкладывайте деньги, которые могут понадобиться в ближайшее время, и не покупайте «монеты, которые точно вырастут» из Telegram-каналов.",
    next: "Что дальше: пройдите тест «Что мне подходит?» — подберём варианты из текущих акций.",
  },
  how: {
    title: "Как участвовать", sub: "Пошаговые инструкции для каждого типа акций. Названия кнопок на биржах похожи — ищите в меню «Earn», «Заработок» или «События».",
    sections: [
      { id: "launchpool", title: "Launchpool / GemPool / PoolX", level: "easy",
        steps: [["Откройте страницу Launchpool биржи", "Кнопка «Стейкать» на нашем сайте ведёт сразу туда."], ["Выберите пул со стейком USDT", "Это проще всего: цена USDT не меняется. Пулы со стейком нового токена — для опытных."], ["Нажмите «Stake» и введите сумму", "Не больше «Макс.» — сверх лимита награда не начисляется."], ["Забирайте награду", "Токены начисляются каждый час или день. В конце пула заберите стейк обратно (Redeem/Unstake)."]],
        watch: "Обратите внимание: APR падает, когда приходит больше участников, а новый токен может подешеветь." },
      { id: "earn", title: "Earn (депозит на бирже)", level: "easy",
        steps: [["Раздел Earn / Simple Earn / Сбережения", "Найдите USDT или USDC."], ["Гибкий или фиксированный", "Гибкий — забрать когда угодно; фиксированный — ставка выше, но деньги заблокированы на срок."], ["Subscribe и сумма", "Повышенная ставка часто действует только на первую небольшую сумму (например, до 500 USDT) — это видно в описании."], ["Проценты каждый день", "Их видно в истории Earn. Забрать — кнопка Redeem."]],
        watch: "Обратите внимание: «до 600% APR» — обычно только для новых пользователей и на $100–200." },
      { id: "bonus", title: "Бонусы новичкам", level: "easy",
        steps: [["Зарегистрируйтесь по ссылке акции", "Бонусы дают только новым аккаунтам на этой бирже."], ["Выполните задания", "Обычно: KYC, первый депозит, первая сделка на определённую сумму."], ["Заберите бонус в «Центре наград»", "Часто это купон на оплату комиссий, а не живые деньги — читайте условия."]],
        watch: "Обратите внимание: бонусы на фьючерсы можно использовать только в торговле с плечом — это рискованно." },
      { id: "competition", title: "Торговые соревнования", level: "hard",
        steps: [["Нажмите «Join/Register»", "Без регистрации в соревновании торговля не засчитывается."], ["Торгуйте указанную пару", "Приз делится между теми, кто наторговал больше всех объёма или прибыли."], ["Посчитайте комиссии", "Чтобы попасть в призы, часто надо наторговать так много, что комиссии больше приза."]],
        watch: "Не для новичков: большинство соревнований — на фьючерсах с плечом." },
    ],
    links: "Страницы Launchpool бирж",
  },
  safety: {
    title: "Безопасность", sub: "Чаще всего новички теряют деньги не на рынке, а из-за мошенников. Эти правила закрывают 95% рисков.",
    rules: [
      ["Никогда не показывайте seed-фразу и пароли", "Ни биржа, ни «поддержка», ни «админ» их не просят. Кто просит — мошенник."],
      ["Открывайте биржу только из закладок", "Фишинговые сайты копируют дизайн и используют похожие адреса. Ссылки на нашем сайте ведут на официальные домены."],
      ["Включите 2FA и антифишинговый код", "Код будет в каждом настоящем письме биржи."],
      ["Поддержка не пишет первой", "Сообщение в Telegram от «Binance Support» — всегда мошенники."],
      ["Не переводите деньги «для получения выигрыша»", "Настоящие акции никогда не требуют заплатить, чтобы забрать приз."],
      ["Не верьте «гарантированной прибыли»", "Обещания «+5% в день» или «удвоим депозит» — это пирамиды."],
      ["Не покупайте токены по советам из чатов", "«Сигналы» и «инсайды» обычно от тех, кто хочет вам продать."],
      ["Держите деньги на больших биржах", "Неизвестные биржи и «инвестплатформы» могут просто закрыться."],
      ["Проверяйте адрес перед переводом", "Вирусы подменяют скопированный адрес кошелька. Сверяйте первые и последние символы."],
      ["Начинайте с малой суммы", "Сначала $20–50, чтобы понять, как всё работает."],
    ],
  },
  quiz: {
    title: "Что мне подходит?", sub: "4 вопроса — и мы подберём варианты из акций, которые идут прямо сейчас.",
    q: [
      { id: "amount", text: "Какую сумму готовы вложить?", opts: [["100", "До $100"], ["1000", "$100–1 000"], ["5000", "Больше $1 000"]] },
      { id: "term", text: "На какой срок?", opts: [["short", "Хочу забрать когда угодно"], ["month", "Месяц-два"], ["long", "Полгода и больше"]] },
      { id: "risk", text: "Как относитесь к риску?", opts: [["none", "Не хочу терять даже немного"], ["some", "Готов к небольшим колебаниям"], ["high", "Готов рисковать ради большего"]] },
      { id: "account", text: "У вас уже есть аккаунт на бирже?", opts: [["no", "Нет, ещё нет"], ["yes", "Да, есть"]] },
    ],
    result: "Вам подходит", again: "Пройти ещё раз", perMonth: "в месяц", perDays: "за {d} дн.", noAccount: "Сначала: Старт с нуля →",
    why: { earn: "Earn на стейблкоине: цена не меняется, забрать можно когда угодно", lp: "Launchpool со стейком USDT: получаете новые токены, USDT не дешевеет", lpMajor: "Launchpool со стейком крупной монеты: доход выше, но цена монеты колеблется", bonus: "Бонус для новых пользователей этой биржи", fixed: "Фиксированный Earn: ставка выше, деньги заблокированы на срок" },
    empty: "Сейчас нет подходящих вариантов — загляните завтра.",
  },
  glossary: { title: "Словарь", sub: "Криптослова простым языком. Эти же объяснения появляются, когда наводите на подчёркнутые слова на сайте.", search: "Поиск слова…" },
};

export const LEARN: Record<Locale, LearnDict> = { uk, en, ru };
