import type { Locale } from "./i18n";

/**
 * Search-intent articles (owner 27.11: "сторінки-статті під пошукові запити"). Plain explanations for beginners, each
 * ending with a link to the live list on the site. General education only — no advice on what to buy; numbers in the
 * examples are illustrations, the real conditions are always in the exchange's rules.
 */
export interface Article { id: string; title: string; sub: string; cta: [string, string]; sections: Array<{ h: string; p: string[] }>; faq: Array<[string, string]> }

const uk: Article[] = [
  {
    id: "what-is-launchpool",
    title: "Що таке Launchpool і як на ньому заробити",
    sub: "Launchpool простими словами: як біржі роздають нові токени за стейкінг, скільки реально можна отримати і де ризики.",
    cta: ["/launchpools", "Відкрити всі Launchpool зараз"],
    sections: [
      { h: "Launchpool простими словами", p: [
        "Launchpool — це акція біржі, де ви на кілька днів «заморожуєте» (стейкаєте) монету, а натомість щогодини або щодня отримуєте новий токен, який біржа ось-ось додасть у торгівлю.",
        "Ваші монети не витрачаються: після завершення пулу (або раніше, якщо правила дозволяють) ви забираєте їх назад разом із нагородою. Такі пули є на Binance, Bybit, Bitget (PoolX), Gate, MEXC та інших біржах.",
      ] },
      { h: "Скільки можна отримати", p: [
        "Загальна нагорода пулу ділиться між усіма учасниками пропорційно до суми. Біржа показує APR — річну ставку, але пул триває лише кілька днів, тому реальний дохід значно менший за цифру APR.",
        "Приклад: 1 000 USDT у пулі з APR 20% на 7 днів дадуть приблизно 1 000 × 20% × 7 / 365 ≈ 3,8 USDT у новому токені. Майже в кожному пулі є ліміт на один акаунт — понад нього нагорода не нараховується.",
      ] },
      { h: "Головні ризики", p: [
        "Ціна монети, яку ви стейкаєте, може впасти за ці дні — і з'їсти всю нагороду. Найменший ризик — у пулах зі стейблкоїнами (USDT, USDC).",
        "Новий токен після лістингу часто дешевшає, тому нагороду зазвичай продають одразу. Для участі майже завжди потрібна верифікація (KYC), а деякі пули недоступні для окремих країн.",
      ] },
      { h: "Як взяти участь — коротко", p: [
        "Зареєструйтеся на біржі й пройдіть верифікацію → купіть монету пулу (або візьміть стейблкоїн, якщо є такий пул) → відкрийте сторінку Launchpool і натисніть «Stake» → після завершення заберіть монети й нагороду.",
        "На PromoRadar зібрані всі активні пули з різних бірж: APR, ліміт, скільки лишилося до кінця і чи можна захиститися від падіння ціни.",
      ] },
    ],
    faq: [
      ["Чи можна втратити гроші на Launchpool?", "Самі монети біржа повертає, але їхня ціна може впасти. У стейблкоїнах цей ризик мінімальний."],
      ["Launchpool і Launchpad — це одне й те саме?", "Ні. У Launchpool ви стейкаєте монети й отримуєте токен безкоштовно. У Launchpad ви купуєте новий токен за фіксованою ціною — це вже покупка з ризиком."],
      ["Коли приходить нагорода?", "Залежить від біржі: на Bitget і Binance — щогодини, на інших — щодня або в кінці пулу. Точно — у правилах пулу."],
    ],
  },
  {
    id: "exchange-signup-bonus",
    title: "Бонус за реєстрацію на біржі: як це працює і де підступ",
    sub: "Що насправді означає «до 5 000 USDT новачкам», які умови треба виконати і чи можна вивести бонус.",
    cta: ["/bonuses", "Дивитися бонуси для новачків"],
    sections: [
      { h: "Що таке welcome-бонус", p: [
        "Біржі платять новим користувачам за реєстрацію, верифікацію, перший депозит і перші угоди. Це маркетинг: біржа розраховує, що ви залишитесь і платитимете комісії.",
        "Великі суми в рекламі («до 5 000 USDT») — це максимум за всі завдання разом. Більшість новачків отримує від кількох до кількох десятків доларів.",
      ] },
      { h: "Які бувають бонуси", p: [
        "Купони на ф'ючерси (trial fund): ними можна торгувати, але вивести не можна — виводиться лише прибуток. Знижки на комісію. Кешбек за першу покупку. Іноді — справжні USDT, які можна вивести.",
        "Перед участю подивіться, у якому вигляді приходить бонус: «voucher», «coupon», «trial fund» — це не гроші на рахунку.",
      ] },
      { h: "Типові умови", p: [
        "Зазвичай треба пройти KYC, поповнити рахунок на певну суму (наприклад, від 100 USDT) і наторгувати обсяг. Бонус діє обмежений час — часто 7–14 днів.",
        "Вимога «обсяг торгівлі 10 000 USDT» не означає, що треба мати 10 000: це сума всіх угод. Але кожна угода коштує комісію, тож порахуйте, чи бонус її перекриває.",
      ] },
      { h: "Як не прогадати", p: [
        "Читайте правила повністю, а не заголовок. Не торгуйте ф'ючерсами з плечем лише заради бонусу — так втрачають більше, ніж отримують. Реєструйтеся тільки на офіційному сайті біржі.",
        "На PromoRadar біля кожного бонусу показано, що саме ви отримаєте, мінімальну суму і скільки реально залишиться після комісій.",
      ] },
    ],
    faq: [
      ["Чи можна вивести бонус за реєстрацію?", "Лише якщо це справжні USDT. Купони на ф'ючерси й trial fund вивести не можна — тільки прибуток з них."],
      ["Чи можна отримати бонус двічі?", "Ні, бонус для новачків дається один раз на людину. Кілька акаунтів — порушення правил і привід заблокувати всі."],
      ["Потрібна верифікація?", "Майже завжди так: без KYC бонус не нараховують і не дають вивести кошти."],
    ],
  },
  {
    id: "apr-vs-apy",
    title: "APR і APY: як порахувати реальний дохід",
    sub: "Чим APR відрізняється від APY, чому «600% APR» не означає шести депозитів, і як рахувати дохід за кілька днів.",
    cta: ["/earn", "Порівняти ставки Earn на біржах"],
    sections: [
      { h: "Що таке APR", p: [
        "APR — річна ставка без складних відсотків. 10% APR означає: якщо тримати 1 000 USDT рівно рік за цією ставкою, отримаєте 100 USDT.",
        "Формула для коротшого строку: сума × APR × днів / 365. Наприклад, 1 000 USDT під 10% APR на 30 днів ≈ 8,2 USDT.",
      ] },
      { h: "Що таке APY", p: [
        "APY враховує реінвестування — коли нараховані відсотки теж починають приносити дохід. Тому APY завжди трохи більший за APR при тій самій ставці.",
        "При невеликих ставках різниця мала: 10% APR з щоденним нарахуванням ≈ 10,5% APY.",
      ] },
      { h: "Чому великі ставки оманливі", p: [
        "«600% APR» на Earn зазвичай діє кілька днів і на маленьку суму, наприклад до 200 USDT. На 2 дні це 200 × 600% × 2 / 365 ≈ 6,6 USDT — а не шість депозитів.",
        "Підвищена ставка часто тільки для новачків або тільки на перший депозит. Решта суми отримує звичайну, значно нижчу ставку.",
      ] },
      { h: "Що ще впливає на дохід", p: [
        "Ставка «гнучкого» (flexible) Earn може змінюватися щодня. Ставки на волатильні монети (не стейблкоїни) не захищають від падіння ціни самої монети.",
        "На PromoRadar калькулятор на сторінці кожної акції рахує дохід за реальний строк і з урахуванням ліміту.",
      ] },
    ],
    faq: [
      ["Що краще — високий APR чи стабільна монета?", "Для новачка важливіше, щоб сама монета не падала: 5% у USDT часто дають більше, ніж 30% у монеті, яка подешевшала на 20%."],
      ["Чи гарантована ставка?", "Фіксований (locked) Earn — так, на весь строк. Гнучкий — ні, біржа може змінювати ставку."],
      ["Як перевести APR у дохід за місяць?", "Поділіть APR на 12: 12% APR ≈ 1% на місяць від суми."],
    ],
  },
  {
    id: "how-to-get-airdrop",
    title: "Як отримати аірдроп і не потрапити на скам",
    sub: "Що таке аірдроп, як біржі й проєкти роздають токени, які завдання справжні, а які — пастка.",
    cta: ["/drops", "Активні аірдропи на біржах"],
    sections: [
      { h: "Що таке аірдроп", p: [
        "Аірдроп — безкоштовна роздача токенів. Біржі роздають токени за прості дії (депозит, торгівля, завдання), а проєкти — активним користувачам своїх мереж і додатків.",
        "Біржові аірдропи найпростіші для новачка: усе відбувається всередині акаунта біржі, без гаманців і підписів транзакцій.",
      ] },
      { h: "Які бувають", p: [
        "CandyBomb і подібні (Bitget, Gate, MEXC): виконуєте завдання — отримуєте частку пулу токенів. Аірдроп для власників монети (наприклад, BNB на Binance HODLer). Аірдропи проєктів за активність у мережі — складніші й ризиковіші.",
        "Майже завжди нагорода ділиться між учасниками, тож чим більше людей, тим менша частка.",
      ] },
      { h: "Ознаки скаму", p: [
        "Справжній аірдроп ніколи не просить seed-фразу, приватний ключ або «плату за отримання». Підозріло, якщо вас просять підключити гаманець на незнайомому сайті чи підписати транзакцію з дозволом на всі токени.",
        "Посилання на аірдроп беріть лише з офіційного сайту або каналу біржі. У PromoRadar є перевірка посилань «Це справжня біржа?».",
      ] },
      { h: "Як брати участь безпечно", p: [
        "Починайте з біржових аірдропів, де потрібен лише акаунт. Для аірдропів у мережах тримайте окремий гаманець з невеликою сумою.",
        "Отримані токени часто дешевшають після лістингу — вирішуйте заздалегідь, коли продасте.",
      ] },
    ],
    faq: [
      ["Аірдроп — це справді безкоштовно?", "Біржові — так, але часто треба виконати умову (депозит чи обсяг торгівлі), а це може коштувати комісію."],
      ["Чому просять seed-фразу?", "Це завжди шахрайство. Жоден справжній аірдроп не потребує seed-фрази чи приватного ключа."],
      ["Коли нараховують токени?", "Зазвичай після завершення акції, протягом кількох днів або тижнів — дата є в правилах."],
    ],
  },
  {
    id: "trading-competition",
    title: "Торгові змагання на біржах: чи варто брати участь",
    sub: "Як працюють торгові змагання (trading competitions), хто насправді забирає призи і коли участь має сенс для новачка.",
    cta: ["/", "Дивитися активні змагання"],
    sections: [
      { h: "Як працює змагання", p: [
        "Біржа оголошує призовий фонд і рахує ваш обсяг торгівлі або прибуток за період. Призи отримують топ-учасники рейтингу, іноді ще й усі, хто наторгував мінімальний обсяг.",
        "«Фонд 1 000 000 USDT» — це на всіх. Головні призи забирають великі трейдери з обсягами в мільйони.",
      ] },
      { h: "Що реально отримує новачок", p: [
        "Найчастіше — невеликий фіксований бонус за мінімальний обсяг (наприклад, 5–20 USDT) або участь у розіграші. Для цього треба наторгувати певну суму, а кожна угода коштує комісію.",
        "Порахуйте заздалегідь: обсяг × комісія (0,05–0,1%) — і порівняйте з нагородою. На PromoRadar це рахується автоматично.",
      ] },
      { h: "Ризики", p: [
        "Змагання з ф'ючерсами підштовхують торгувати з плечем — так легко втратити депозит. Гонитва за рейтингом рідко окупається для невеликих сум.",
        "Деякі змагання лише для нових користувачів, для певних країн або для клієнтів окремого партнера — перевірте умови участі.",
      ] },
      { h: "Коли участь має сенс", p: [
        "Якщо ви й так торгуєте на цій біржі — змагання дає додатковий бонус за те, що ви робите. Якщо ні — простіші й безпечніші варіанти: бонуси за депозит, Launchpool, Earn.",
      ] },
    ],
    faq: [
      ["Чи можна виграти з маленьким депозитом?", "Головний приз — майже ні. Фіксовані бонуси за мінімальний обсяг — так, якщо вони перекривають комісію."],
      ["Обсяг торгівлі — це мій депозит?", "Ні, це сума всіх угод. 100 USDT, куплені й продані 10 разів, дають близько 2 000 USDT обсягу."],
      ["Як виплачують призи?", "Зазвичай після завершення та перевірки, часто купонами на ф'ючерси, а не USDT — дивіться правила."],
    ],
  },
  {
    id: "stablecoin-earn",
    title: "Як заробляти на стейблкоїнах: Earn на біржах простими словами",
    sub: "Simple Earn, гнучкі й фіксовані вклади в USDT і USDC: скільки платять, які ризики і як вибрати.",
    cta: ["/earn", "Ставки на USDT і USDC на всіх біржах"],
    sections: [
      { h: "Що таке Earn", p: [
        "Earn (Simple Earn, Savings) — це «депозит» на біржі: ви кладете монети, біржа нараховує відсотки. Гнучкий (flexible) можна забрати будь-коли, фіксований (locked) — лише після строку, зате ставка зазвичай вища.",
        "Стейблкоїни (USDT, USDC) прив'язані до долара, тож ви не ризикуєте падінням ціни, як з BTC чи новими токенами.",
      ] },
      { h: "Скільки платять", p: [
        "Звичайні ставки на USDT/USDC — кілька відсотків річних. Підвищені 10–30% зазвичай діють лише для новачків, на невелику суму або кілька днів.",
        "Ставка «гнучкого» Earn змінюється. Порівнюйте біржі за базовою ставкою, а не за максимальною цифрою «до».",
      ] },
      { h: "Ризики", p: [
        "Головний ризик — сама біржа: якщо вона збанкрутує або заблокує виведення, гроші можуть зависнути. Тому не тримайте все на одній біржі й обирайте великі, перевірені майданчики.",
        "DeFi-пули (на DEX) можуть платити більше, але мають ризики смарт-контрактів — це для досвідчених.",
      ] },
      { h: "Як почати", p: [
        "Купіть USDT або USDC на біржі → відкрийте розділ Earn → виберіть гнучкий продукт для початку → введіть суму й підтвердіть. Відсотки нараховуються щодня.",
        "На PromoRadar зведені ставки Earn з десятків бірж із фільтром «лише стейблкоїни».",
      ] },
    ],
    faq: [
      ["Чи безпечно тримати USDT в Earn?", "Ризик ціни мінімальний, але залишається ризик самої біржі. Розподіляйте суму між кількома надійними біржами."],
      ["Що вигідніше — гнучкий чи фіксований?", "Фіксований зазвичай платить більше, але гроші заблоковані до кінця строку. Для початку зручніший гнучкий."],
      ["Коли нараховують відсотки?", "На більшості бірж — щодня, наступного дня після внесення."],
    ],
  },
];

const en: Article[] = [
  {
    id: "what-is-launchpool",
    title: "What is a Launchpool and how to earn from it",
    sub: "Launchpool in plain words: how exchanges hand out new tokens for staking, what you can really get, and the risks.",
    cta: ["/launchpools", "See all live Launchpools"],
    sections: [
      { h: "Launchpool in plain words", p: [
        "A Launchpool is an exchange campaign where you lock (stake) a coin for a few days and receive a new token every hour or day — a token the exchange is about to list.",
        "Your coins are not spent: when the pool ends (or earlier, if the rules allow) you take them back together with the reward. Binance, Bybit, Bitget (PoolX), Gate, MEXC and others run such pools.",
      ] },
      { h: "How much you can get", p: [
        "The pool's total reward is split between all participants in proportion to their stake. The exchange shows an APR — a yearly rate — but a pool lasts only days, so the real income is far smaller than the APR figure.",
        "Example: 1,000 USDT in a 20% APR pool for 7 days gives about 1,000 × 20% × 7 / 365 ≈ 3.8 USDT in the new token. Almost every pool has a per-account cap — nothing is paid above it.",
      ] },
      { h: "Main risks", p: [
        "The coin you stake can drop in price during those days and wipe out the reward. Stablecoin pools (USDT, USDC) carry the least risk.",
        "New tokens often fall after listing, so rewards are usually sold right away. Identity verification (KYC) is almost always required, and some pools exclude certain countries.",
      ] },
      { h: "How to join — in short", p: [
        "Sign up and verify → buy the pool's coin (or use a stablecoin if there is such a pool) → open the Launchpool page and press 'Stake' → when it ends, take back your coins and the reward.",
        "PromoRadar lists every live pool across exchanges: APR, cap, time left and whether you can hedge the price.",
      ] },
    ],
    faq: [
      ["Can I lose money on a Launchpool?", "The exchange returns the coins, but their price can fall. With stablecoins this risk is minimal."],
      ["Is Launchpool the same as Launchpad?", "No. In a Launchpool you stake coins and get the token for free. In a Launchpad you buy a new token at a fixed price — that is a purchase with risk."],
      ["When is the reward paid?", "Depends on the exchange: Bitget and Binance pay hourly, others daily or at the end. The exact schedule is in the pool rules."],
    ],
  },
  {
    id: "exchange-signup-bonus",
    title: "Exchange sign-up bonus: how it works and the catch",
    sub: "What 'up to 5,000 USDT for newcomers' really means, which conditions you must meet and whether you can withdraw it.",
    cta: ["/bonuses", "See newcomer bonuses"],
    sections: [
      { h: "What a welcome bonus is", p: [
        "Exchanges pay new users for signing up, verifying, the first deposit and first trades. It is marketing: the exchange hopes you stay and pay fees.",
        "Big numbers in ads ('up to 5,000 USDT') are the maximum for all tasks together. Most newcomers get from a few to a few dozen dollars.",
      ] },
      { h: "Kinds of bonuses", p: [
        "Futures coupons (trial funds): you can trade with them but not withdraw them — only the profit is withdrawable. Fee discounts. Cashback on the first purchase. Sometimes real USDT you can withdraw.",
        "Before joining, check the form of the bonus: 'voucher', 'coupon', 'trial fund' are not money in your account.",
      ] },
      { h: "Typical conditions", p: [
        "Usually you must pass KYC, deposit a set amount (e.g. from 100 USDT) and reach a trading volume. The bonus is time-limited — often 7–14 days.",
        "A '10,000 USDT trading volume' requirement does not mean you need 10,000: it is the sum of all trades. But every trade costs a fee, so check the bonus covers it.",
      ] },
      { h: "How not to lose out", p: [
        "Read the full rules, not the headline. Don't trade leveraged futures just for a bonus — people lose more than they get. Sign up only on the exchange's official site.",
        "PromoRadar shows next to each bonus what exactly you get, the minimum amount and what is left after fees.",
      ] },
    ],
    faq: [
      ["Can I withdraw a sign-up bonus?", "Only if it is real USDT. Futures coupons and trial funds cannot be withdrawn — only the profit made with them."],
      ["Can I get the bonus twice?", "No, a newcomer bonus is once per person. Several accounts break the rules and can get all of them blocked."],
      ["Is verification needed?", "Almost always: without KYC the bonus is not credited and withdrawals are not allowed."],
    ],
  },
  {
    id: "apr-vs-apy",
    title: "APR vs APY: how to work out your real income",
    sub: "How APR differs from APY, why '600% APR' does not mean six times your deposit, and how to count income for a few days.",
    cta: ["/earn", "Compare Earn rates across exchanges"],
    sections: [
      { h: "What APR is", p: [
        "APR is a yearly rate without compounding. 10% APR means: keep 1,000 USDT for exactly a year at that rate and you get 100 USDT.",
        "For a shorter term: amount × APR × days / 365. For example, 1,000 USDT at 10% APR for 30 days ≈ 8.2 USDT.",
      ] },
      { h: "What APY is", p: [
        "APY includes reinvesting — the interest you earn starts earning too. So APY is always a bit higher than APR at the same rate.",
        "At modest rates the gap is small: 10% APR paid daily ≈ 10.5% APY.",
      ] },
      { h: "Why big rates mislead", p: [
        "'600% APR' on Earn usually lasts a few days and covers a small amount, say up to 200 USDT. For 2 days that is 200 × 600% × 2 / 365 ≈ 6.6 USDT — not six deposits.",
        "Boosted rates are often for newcomers only or for the first deposit only. The rest of the amount earns the normal, much lower rate.",
      ] },
      { h: "What else affects income", p: [
        "A flexible Earn rate can change daily. Rates on volatile coins (not stablecoins) do not protect you from the coin's own price falling.",
        "On PromoRadar the calculator on every promo page counts income for the real term and within the cap.",
      ] },
    ],
    faq: [
      ["Which is better — a high APR or a stable coin?", "For a beginner it matters more that the coin itself doesn't fall: 5% in USDT often beats 30% in a coin that lost 20%."],
      ["Is the rate guaranteed?", "Fixed (locked) Earn — yes, for the whole term. Flexible — no, the exchange can change it."],
      ["How do I turn APR into monthly income?", "Divide the APR by 12: 12% APR ≈ 1% of the amount per month."],
    ],
  },
  {
    id: "how-to-get-airdrop",
    title: "How to get an airdrop without falling for a scam",
    sub: "What an airdrop is, how exchanges and projects give tokens away, which tasks are real and which are traps.",
    cta: ["/drops", "Live exchange airdrops"],
    sections: [
      { h: "What an airdrop is", p: [
        "An airdrop is a free token giveaway. Exchanges give tokens for simple actions (deposit, trading, tasks); projects reward active users of their networks and apps.",
        "Exchange airdrops are the easiest for beginners: everything happens inside your exchange account, with no wallets or transaction signing.",
      ] },
      { h: "Kinds of airdrops", p: [
        "CandyBomb and similar (Bitget, Gate, MEXC): complete tasks, get a share of a token pool. Holder airdrops (e.g. BNB on Binance HODLer). Project airdrops for on-chain activity — harder and riskier.",
        "The reward is almost always split between participants, so the more people join, the smaller your share.",
      ] },
      { h: "Signs of a scam", p: [
        "A real airdrop never asks for your seed phrase, private key or a 'fee to claim'. Be suspicious if you are asked to connect a wallet on an unknown site or sign a transaction approving all your tokens.",
        "Take airdrop links only from the exchange's official site or channel. PromoRadar has a link checker, 'Is this the real exchange?'.",
      ] },
      { h: "How to take part safely", p: [
        "Start with exchange airdrops that need only an account. For on-chain airdrops keep a separate wallet with a small amount.",
        "Tokens you receive often fall after listing — decide in advance when you will sell.",
      ] },
    ],
    faq: [
      ["Is an airdrop really free?", "Exchange ones are, but there is often a condition (deposit or trading volume), which can cost fees."],
      ["Why would someone ask for my seed phrase?", "It is always a scam. No real airdrop needs a seed phrase or private key."],
      ["When are the tokens credited?", "Usually after the campaign ends, within days or weeks — the date is in the rules."],
    ],
  },
  {
    id: "trading-competition",
    title: "Exchange trading competitions: are they worth it",
    sub: "How trading competitions work, who really takes the prizes and when joining makes sense for a beginner.",
    cta: ["/", "See live competitions"],
    sections: [
      { h: "How a competition works", p: [
        "The exchange announces a prize pool and counts your trading volume or profit over a period. Top-ranked traders get the prizes, sometimes also everyone who reaches a minimum volume.",
        "A '1,000,000 USDT pool' is for everyone combined. The main prizes go to big traders with volumes in the millions.",
      ] },
      { h: "What a beginner really gets", p: [
        "Most often a small fixed bonus for a minimum volume (e.g. 5–20 USDT) or a lucky-draw ticket. You need to trade a set amount, and each trade costs a fee.",
        "Work it out beforehand: volume × fee (0.05–0.1%), and compare with the reward. PromoRadar does this automatically.",
      ] },
      { h: "Risks", p: [
        "Futures competitions push you to trade with leverage — an easy way to lose the deposit. Chasing the leaderboard rarely pays off for small amounts.",
        "Some competitions are only for new users, certain countries or a specific partner's clients — check who can join.",
      ] },
      { h: "When it makes sense", p: [
        "If you already trade on that exchange, a competition adds a bonus for what you do anyway. If not, simpler and safer options are deposit bonuses, Launchpools and Earn.",
      ] },
    ],
    faq: [
      ["Can I win with a small deposit?", "The main prize — almost never. Fixed bonuses for a minimum volume — yes, if they cover the fees."],
      ["Is trading volume my deposit?", "No, it is the sum of all trades. 100 USDT bought and sold 10 times gives about 2,000 USDT of volume."],
      ["How are prizes paid?", "Usually after the end and a review, often as futures coupons rather than USDT — see the rules."],
    ],
  },
  {
    id: "stablecoin-earn",
    title: "How to earn on stablecoins: exchange Earn in plain words",
    sub: "Simple Earn, flexible and fixed USDT and USDC products: what they pay, the risks, and how to choose.",
    cta: ["/earn", "USDT and USDC rates on all exchanges"],
    sections: [
      { h: "What Earn is", p: [
        "Earn (Simple Earn, Savings) is a 'deposit' on an exchange: you put coins in and the exchange pays interest. Flexible can be taken out any time; fixed (locked) only after the term, but usually pays more.",
        "Stablecoins (USDT, USDC) are pegged to the dollar, so you don't risk a price drop the way you do with BTC or new tokens.",
      ] },
      { h: "What it pays", p: [
        "Normal USDT/USDC rates are a few percent a year. Boosted 10–30% rates usually apply only to newcomers, a small amount or a few days.",
        "Flexible rates change. Compare exchanges by the base rate, not the 'up to' maximum.",
      ] },
      { h: "Risks", p: [
        "The main risk is the exchange itself: if it goes bust or freezes withdrawals, funds can get stuck. Don't keep everything on one exchange; choose large, established platforms.",
        "DeFi pools (on DEXs) can pay more but carry smart-contract risk — that's for experienced users.",
      ] },
      { h: "How to start", p: [
        "Buy USDT or USDC on an exchange → open Earn → pick a flexible product to start → enter the amount and confirm. Interest is credited daily.",
        "PromoRadar collects Earn rates from dozens of exchanges with a 'stablecoins only' filter.",
      ] },
    ],
    faq: [
      ["Is it safe to keep USDT in Earn?", "Price risk is minimal, but the exchange risk remains. Spread the amount across several reliable exchanges."],
      ["Flexible or fixed — which pays better?", "Fixed usually pays more, but the money is locked until the term ends. Flexible is easier to start with."],
      ["When is interest credited?", "On most exchanges daily, from the day after you subscribe."],
    ],
  },
];

const ru: Article[] = [
  {
    id: "what-is-launchpool",
    title: "Что такое Launchpool и как на нём заработать",
    sub: "Launchpool простыми словами: как биржи раздают новые токены за стейкинг, сколько реально можно получить и в чём риски.",
    cta: ["/launchpools", "Открыть все Launchpool сейчас"],
    sections: [
      { h: "Launchpool простыми словами", p: [
        "Launchpool — это акция биржи, где вы на несколько дней «замораживаете» (стейкаете) монету, а взамен каждый час или день получаете новый токен, который биржа вот-вот добавит в торговлю.",
        "Ваши монеты не тратятся: после окончания пула (или раньше, если правила позволяют) вы забираете их обратно вместе с наградой. Такие пулы есть на Binance, Bybit, Bitget (PoolX), Gate, MEXC и других биржах.",
      ] },
      { h: "Сколько можно получить", p: [
        "Общая награда пула делится между всеми участниками пропорционально сумме. Биржа показывает APR — годовую ставку, но пул длится лишь несколько дней, поэтому реальный доход намного меньше цифры APR.",
        "Пример: 1 000 USDT в пуле с APR 20% на 7 дней дадут примерно 1 000 × 20% × 7 / 365 ≈ 3,8 USDT в новом токене. Почти в каждом пуле есть лимит на один аккаунт — сверх него награда не начисляется.",
      ] },
      { h: "Главные риски", p: [
        "Цена монеты, которую вы стейкаете, может упасть за эти дни — и съесть всю награду. Меньше всего риска — в пулах со стейблкоинами (USDT, USDC).",
        "Новый токен после листинга часто дешевеет, поэтому награду обычно продают сразу. Для участия почти всегда нужна верификация (KYC), а некоторые пулы недоступны для отдельных стран.",
      ] },
      { h: "Как участвовать — коротко", p: [
        "Зарегистрируйтесь на бирже и пройдите верификацию → купите монету пула (или возьмите стейблкоин, если есть такой пул) → откройте страницу Launchpool и нажмите «Stake» → после окончания заберите монеты и награду.",
        "На PromoRadar собраны все активные пулы с разных бирж: APR, лимит, сколько осталось до конца и можно ли защититься от падения цены.",
      ] },
    ],
    faq: [
      ["Можно ли потерять деньги на Launchpool?", "Сами монеты биржа возвращает, но их цена может упасть. В стейблкоинах этот риск минимален."],
      ["Launchpool и Launchpad — это одно и то же?", "Нет. В Launchpool вы стейкаете монеты и получаете токен бесплатно. В Launchpad вы покупаете новый токен по фиксированной цене — это уже покупка с риском."],
      ["Когда приходит награда?", "Зависит от биржи: на Bitget и Binance — каждый час, на других — каждый день или в конце пула. Точно — в правилах пула."],
    ],
  },
  {
    id: "exchange-signup-bonus",
    title: "Бонус за регистрацию на бирже: как это работает и в чём подвох",
    sub: "Что на самом деле значит «до 5 000 USDT новичкам», какие условия нужно выполнить и можно ли вывести бонус.",
    cta: ["/bonuses", "Смотреть бонусы для новичков"],
    sections: [
      { h: "Что такое welcome-бонус", p: [
        "Биржи платят новым пользователям за регистрацию, верификацию, первый депозит и первые сделки. Это маркетинг: биржа рассчитывает, что вы останетесь и будете платить комиссии.",
        "Большие суммы в рекламе («до 5 000 USDT») — это максимум за все задания вместе. Большинство новичков получает от нескольких до нескольких десятков долларов.",
      ] },
      { h: "Какие бывают бонусы", p: [
        "Купоны на фьючерсы (trial fund): ими можно торговать, но вывести нельзя — выводится только прибыль. Скидки на комиссию. Кешбэк за первую покупку. Иногда — настоящие USDT, которые можно вывести.",
        "Перед участием посмотрите, в каком виде приходит бонус: «voucher», «coupon», «trial fund» — это не деньги на счёте.",
      ] },
      { h: "Типичные условия", p: [
        "Обычно нужно пройти KYC, пополнить счёт на определённую сумму (например, от 100 USDT) и наторговать объём. Бонус действует ограниченное время — часто 7–14 дней.",
        "Требование «объём торговли 10 000 USDT» не значит, что нужно иметь 10 000: это сумма всех сделок. Но каждая сделка стоит комиссию, так что посчитайте, перекрывает ли её бонус.",
      ] },
      { h: "Как не прогадать", p: [
        "Читайте правила полностью, а не заголовок. Не торгуйте фьючерсами с плечом только ради бонуса — так теряют больше, чем получают. Регистрируйтесь только на официальном сайте биржи.",
        "На PromoRadar рядом с каждым бонусом показано, что именно вы получите, минимальную сумму и сколько реально останется после комиссий.",
      ] },
    ],
    faq: [
      ["Можно ли вывести бонус за регистрацию?", "Только если это настоящие USDT. Купоны на фьючерсы и trial fund вывести нельзя — только прибыль с них."],
      ["Можно ли получить бонус дважды?", "Нет, бонус для новичков даётся один раз на человека. Несколько аккаунтов — нарушение правил и повод заблокировать все."],
      ["Нужна верификация?", "Почти всегда да: без KYC бонус не начисляют и не дают вывести средства."],
    ],
  },
  {
    id: "apr-vs-apy",
    title: "APR и APY: как посчитать реальный доход",
    sub: "Чем APR отличается от APY, почему «600% APR» не значит шести депозитов и как считать доход за несколько дней.",
    cta: ["/earn", "Сравнить ставки Earn на биржах"],
    sections: [
      { h: "Что такое APR", p: [
        "APR — годовая ставка без сложных процентов. 10% APR означает: если держать 1 000 USDT ровно год по этой ставке, получите 100 USDT.",
        "Формула для меньшего срока: сумма × APR × дней / 365. Например, 1 000 USDT под 10% APR на 30 дней ≈ 8,2 USDT.",
      ] },
      { h: "Что такое APY", p: [
        "APY учитывает реинвестирование — когда начисленные проценты тоже начинают приносить доход. Поэтому APY всегда немного больше APR при той же ставке.",
        "При небольших ставках разница мала: 10% APR с ежедневным начислением ≈ 10,5% APY.",
      ] },
      { h: "Почему большие ставки обманчивы", p: [
        "«600% APR» на Earn обычно действует несколько дней и на маленькую сумму, например до 200 USDT. На 2 дня это 200 × 600% × 2 / 365 ≈ 6,6 USDT — а не шесть депозитов.",
        "Повышенная ставка часто только для новичков или только на первый депозит. Остальная сумма получает обычную, гораздо более низкую ставку.",
      ] },
      { h: "Что ещё влияет на доход", p: [
        "Ставка «гибкого» (flexible) Earn может меняться каждый день. Ставки на волатильные монеты (не стейблкоины) не защищают от падения цены самой монеты.",
        "На PromoRadar калькулятор на странице каждой акции считает доход за реальный срок и с учётом лимита.",
      ] },
    ],
    faq: [
      ["Что лучше — высокий APR или стабильная монета?", "Для новичка важнее, чтобы сама монета не падала: 5% в USDT часто дают больше, чем 30% в монете, подешевевшей на 20%."],
      ["Ставка гарантирована?", "Фиксированный (locked) Earn — да, на весь срок. Гибкий — нет, биржа может менять ставку."],
      ["Как перевести APR в доход за месяц?", "Разделите APR на 12: 12% APR ≈ 1% в месяц от суммы."],
    ],
  },
  {
    id: "how-to-get-airdrop",
    title: "Как получить аирдроп и не попасть на скам",
    sub: "Что такое аирдроп, как биржи и проекты раздают токены, какие задания настоящие, а какие — ловушка.",
    cta: ["/drops", "Активные аирдропы на биржах"],
    sections: [
      { h: "Что такое аирдроп", p: [
        "Аирдроп — бесплатная раздача токенов. Биржи раздают токены за простые действия (депозит, торговля, задания), а проекты — активным пользователям своих сетей и приложений.",
        "Биржевые аирдропы самые простые для новичка: всё происходит внутри аккаунта биржи, без кошельков и подписей транзакций.",
      ] },
      { h: "Какие бывают", p: [
        "CandyBomb и подобные (Bitget, Gate, MEXC): выполняете задания — получаете долю пула токенов. Аирдроп для держателей монеты (например, BNB на Binance HODLer). Аирдропы проектов за активность в сети — сложнее и рискованнее.",
        "Почти всегда награда делится между участниками, так что чем больше людей, тем меньше доля.",
      ] },
      { h: "Признаки скама", p: [
        "Настоящий аирдроп никогда не просит seed-фразу, приватный ключ или «плату за получение». Подозрительно, если вас просят подключить кошелёк на незнакомом сайте или подписать транзакцию с разрешением на все токены.",
        "Ссылки на аирдроп берите только с официального сайта или канала биржи. В PromoRadar есть проверка ссылок «Это настоящая биржа?».",
      ] },
      { h: "Как участвовать безопасно", p: [
        "Начинайте с биржевых аирдропов, где нужен только аккаунт. Для аирдропов в сетях держите отдельный кошелёк с небольшой суммой.",
        "Полученные токены часто дешевеют после листинга — решите заранее, когда продадите.",
      ] },
    ],
    faq: [
      ["Аирдроп — это правда бесплатно?", "Биржевые — да, но часто нужно выполнить условие (депозит или объём торговли), а это может стоить комиссию."],
      ["Почему просят seed-фразу?", "Это всегда мошенничество. Ни один настоящий аирдроп не требует seed-фразы или приватного ключа."],
      ["Когда начисляют токены?", "Обычно после окончания акции, в течение нескольких дней или недель — дата есть в правилах."],
    ],
  },
  {
    id: "trading-competition",
    title: "Торговые соревнования на биржах: стоит ли участвовать",
    sub: "Как работают торговые соревнования (trading competitions), кто на самом деле забирает призы и когда участие имеет смысл для новичка.",
    cta: ["/", "Смотреть активные соревнования"],
    sections: [
      { h: "Как работает соревнование", p: [
        "Биржа объявляет призовой фонд и считает ваш объём торговли или прибыль за период. Призы получают топ-участники рейтинга, иногда ещё и все, кто наторговал минимальный объём.",
        "«Фонд 1 000 000 USDT» — это на всех. Главные призы забирают крупные трейдеры с объёмами в миллионы.",
      ] },
      { h: "Что реально получает новичок", p: [
        "Чаще всего — небольшой фиксированный бонус за минимальный объём (например, 5–20 USDT) или участие в розыгрыше. Для этого нужно наторговать определённую сумму, а каждая сделка стоит комиссию.",
        "Посчитайте заранее: объём × комиссия (0,05–0,1%) — и сравните с наградой. На PromoRadar это считается автоматически.",
      ] },
      { h: "Риски", p: [
        "Соревнования с фьючерсами подталкивают торговать с плечом — так легко потерять депозит. Гонка за рейтингом редко окупается для небольших сумм.",
        "Некоторые соревнования только для новых пользователей, для определённых стран или для клиентов отдельного партнёра — проверьте условия участия.",
      ] },
      { h: "Когда участие имеет смысл", p: [
        "Если вы и так торгуете на этой бирже — соревнование даёт дополнительный бонус за то, что вы делаете. Если нет — проще и безопаснее бонусы за депозит, Launchpool и Earn.",
      ] },
    ],
    faq: [
      ["Можно ли выиграть с маленьким депозитом?", "Главный приз — почти нет. Фиксированные бонусы за минимальный объём — да, если они перекрывают комиссию."],
      ["Объём торговли — это мой депозит?", "Нет, это сумма всех сделок. 100 USDT, купленные и проданные 10 раз, дают около 2 000 USDT объёма."],
      ["Как выплачивают призы?", "Обычно после окончания и проверки, часто купонами на фьючерсы, а не USDT — смотрите правила."],
    ],
  },
  {
    id: "stablecoin-earn",
    title: "Как зарабатывать на стейблкоинах: Earn на биржах простыми словами",
    sub: "Simple Earn, гибкие и фиксированные вклады в USDT и USDC: сколько платят, какие риски и как выбрать.",
    cta: ["/earn", "Ставки на USDT и USDC на всех биржах"],
    sections: [
      { h: "Что такое Earn", p: [
        "Earn (Simple Earn, Savings) — это «депозит» на бирже: вы кладёте монеты, биржа начисляет проценты. Гибкий (flexible) можно забрать в любой момент, фиксированный (locked) — только после срока, зато ставка обычно выше.",
        "Стейблкоины (USDT, USDC) привязаны к доллару, так что вы не рискуете падением цены, как с BTC или новыми токенами.",
      ] },
      { h: "Сколько платят", p: [
        "Обычные ставки на USDT/USDC — несколько процентов годовых. Повышенные 10–30% обычно действуют только для новичков, на небольшую сумму или несколько дней.",
        "Ставка «гибкого» Earn меняется. Сравнивайте биржи по базовой ставке, а не по максимальной цифре «до».",
      ] },
      { h: "Риски", p: [
        "Главный риск — сама биржа: если она обанкротится или заблокирует вывод, деньги могут зависнуть. Поэтому не держите всё на одной бирже и выбирайте крупные, проверенные площадки.",
        "DeFi-пулы (на DEX) могут платить больше, но несут риски смарт-контрактов — это для опытных.",
      ] },
      { h: "Как начать", p: [
        "Купите USDT или USDC на бирже → откройте раздел Earn → выберите для начала гибкий продукт → введите сумму и подтвердите. Проценты начисляются каждый день.",
        "На PromoRadar сведены ставки Earn с десятков бирж с фильтром «только стейблкоины».",
      ] },
    ],
    faq: [
      ["Безопасно ли держать USDT в Earn?", "Риск цены минимален, но остаётся риск самой биржи. Распределяйте сумму между несколькими надёжными биржами."],
      ["Что выгоднее — гибкий или фиксированный?", "Фиксированный обычно платит больше, но деньги заблокированы до конца срока. Для начала удобнее гибкий."],
      ["Когда начисляют проценты?", "На большинстве бирж — каждый день, со следующего дня после внесения."],
    ],
  },
];

export const ARTICLES: Record<Locale, Article[]> = { uk, en, ru };
export const ARTICLE_IDS = uk.map((a) => a.id);
