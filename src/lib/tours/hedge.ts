import type { Tour } from "./types";

/** /hedge/ — the Launchpool hedge calculator (components/HedgeCalculator.tsx). Every target always renders. */
export const HEDGE_TOUR: Tour = {
  id: "hedge",
  name: { uk: "Калькулятор хеджу", en: "Hedge calculator", ru: "Калькулятор хеджа" },
  steps: {
    uk: [
      { title: "Що рахує калькулятор", text: "Стратегія «стейк + шорт»: ви купуєте монету й кладете її в Launchpool, а на ф'ючерсах відкриваєте шорт на ту саму кількість. Падіння ціни компенсує шорт, і ви заробляєте APR пулу майже без ризику ціни. Калькулятор показує план, ціну ліквідації і чистий результат." },
      { sel: "hedge-pick", title: "Пул", text: "Виберіть живий пул зі списку — ціна, APR, строк, фандинг і комісії підставляться самі. «Свої параметри» — якщо хочете ввести все вручну. Будь-яка зміна поля теж перемикає на свої параметри." },
      { sel: "hedge-inputs", title: "Сума, ціна, APR, дні", text: "Основа розрахунку.", points: ["Сума в стейк, $ — скільки кладете в пул (якщо пул має ліміт на людину, рахуємо з ліміту)", "Ціна монети, $ — поточна ціна", "APR пулу, % — річна ставка нагород", "Днів — скільки триматимете стейк і шорт"] },
      { sel: "hedge-inputs", title: "Фандинг, плече, маржа, комісії", text: "Параметри шорту.", points: ["Фандинг шорту, %/рік — плюс: вам платять за шорт, мінус: платите ви", "Плече шорту — що більше, то менше маржі, але ліквідація ближче", "Маржа обслуговування, % — правило біржі для ліквідації (за замовчуванням 0.5%)", "Комісії + прослизання (вхід+вихід), % — усі витрати на угоди"] },
      { sel: "hedge-plan", title: "План", text: "П'ять кроків з вашими цифрами: скільки монет купити на споті, застейкати, на якій біржі й з яким плечем відкрити шорт і скільки на нього потрібно маржі. Далі — щодня продавати нагороди, а наприкінці закрити все разом." },
      { sel: "hedge-liq", title: "Ціна ліквідації", text: "При якій ціні біржа примусово закриє ваш шорт і на скільки % для цього має вирости монета. Якщо запас менший за 15%, рядок стає червоним: «Ліквідація надто близько» — зменште плече." },
      { sel: "hedge-result", title: "Результат", text: "Підсумок за весь строк.", points: ["Потрібний капітал — стейк плюс маржа шорту", "Нагороди за період — що дасть пул", "Фандинг за період — дохід або витрата шорту", "Комісії та прослизання — витрати", "Чистий результат і Чистий APR на весь капітал — що лишиться"] },
      { title: "Про ризики", text: "Різкий ріст ціни може ліквідувати шорт, фандинг може стати від'ємним, а APR пулу падає, коли в нього заходять інші. Тримайте запас маржі. Як саме падає APR, дивіться у вкладці «Історія й аналітика»." },
    ],
    en: [
      { title: "What the calculator does", text: "The “stake + short” strategy: you buy a coin and put it in a Launchpool, and open a short for the same amount on perps. The short offsets a price drop, so you earn the pool’s APR with little price risk. The calculator shows the plan, the liquidation price and the net result." },
      { sel: "hedge-pick", title: "Pool", text: "Pick a live pool from the list — price, APR, term, funding and fees fill in by themselves. “Custom” lets you type everything. Editing any field also switches to custom." },
      { sel: "hedge-inputs", title: "Amount, price, APR, days", text: "The basis of the calculation.", points: ["Amount to stake, $ — what you put in the pool (if the pool has a per-person limit, we use the limit)", "Coin price, $ — the current price", "Pool APR, % — the yearly reward rate", "Days — how long you keep the stake and the short"] },
      { sel: "hedge-inputs", title: "Funding, leverage, margin, fees", text: "The short’s settings.", points: ["Short funding, %/yr — plus: you are paid for the short, minus: you pay", "Short leverage — higher means less margin but liquidation closer", "Maintenance margin, % — the exchange’s liquidation rule (0.5% by default)", "Fees + slippage (in+out), % — all trading costs"] },
      { sel: "hedge-plan", title: "Plan", text: "Five steps with your figures: how many coins to buy on spot, stake, where and at what leverage to open the short and how much margin it needs. Then sell the rewards daily and close everything together at the end." },
      { sel: "hedge-liq", title: "Liquidation price", text: "The price at which the exchange force-closes your short, and how much the coin must rise for that. If the buffer is under 15%, the line turns red: “Liquidation is too close” — lower the leverage." },
      { sel: "hedge-result", title: "Result", text: "Totals for the whole term.", points: ["Capital needed — stake plus the short’s margin", "Rewards for the period — what the pool pays", "Funding for the period — the short’s income or cost", "Fees and slippage — costs", "Net result and Net APR on all capital — what is left"] },
      { title: "About the risks", text: "A sharp pump can liquidate the short, funding can turn negative, and the pool’s APR drops as others join. Keep spare margin. See how APR falls in the “History & insights” tab." },
    ],
    ru: [
      { title: "Что считает калькулятор", text: "Стратегия «стейк + шорт»: вы покупаете монету и кладёте её в Launchpool, а на фьючерсах открываете шорт на то же количество. Падение цены компенсирует шорт, и вы зарабатываете APR пула почти без риска цены. Калькулятор показывает план, цену ликвидации и чистый результат." },
      { sel: "hedge-pick", title: "Пул", text: "Выберите живой пул из списка — цена, APR, срок, фандинг и комиссии подставятся сами. «Свои параметры» — если хотите ввести всё вручную. Любое изменение поля тоже переключает на свои параметры." },
      { sel: "hedge-inputs", title: "Сумма, цена, APR, дни", text: "Основа расчёта.", points: ["Сумма в стейк, $ — сколько кладёте в пул (если у пула лимит на человека, считаем от лимита)", "Цена монеты, $ — текущая цена", "APR пула, % — годовая ставка наград", "Дней — сколько будете держать стейк и шорт"] },
      { sel: "hedge-inputs", title: "Фандинг, плечо, маржа, комиссии", text: "Параметры шорта.", points: ["Фандинг шорта, %/год — плюс: вам платят за шорт, минус: платите вы", "Плечо шорта — чем больше, тем меньше маржи, но ликвидация ближе", "Поддерживающая маржа, % — правило биржи для ликвидации (по умолчанию 0.5%)", "Комиссии + проскальзывание (вход+выход), % — все расходы на сделки"] },
      { sel: "hedge-plan", title: "План", text: "Пять шагов с вашими цифрами: сколько монет купить на споте, застейкать, на какой бирже и с каким плечом открыть шорт и сколько на него нужно маржи. Дальше — ежедневно продавать награды, а в конце закрыть всё вместе." },
      { sel: "hedge-liq", title: "Цена ликвидации", text: "При какой цене биржа принудительно закроет ваш шорт и на сколько % для этого должна вырасти монета. Если запас меньше 15%, строка становится красной: «Ликвидация слишком близко» — снизьте плечо." },
      { sel: "hedge-result", title: "Результат", text: "Итог за весь срок.", points: ["Нужный капитал — стейк плюс маржа шорта", "Награды за период — что даст пул", "Фандинг за период — доход или расход шорта", "Комиссии и проскальзывание — расходы", "Чистый результат и Чистый APR на весь капитал — что останется"] },
      { title: "О рисках", text: "Резкий рост цены может ликвидировать шорт, фандинг может стать отрицательным, а APR пула падает, когда в него заходят другие. Держите запас маржи. Как именно падает APR, смотрите во вкладке «История и аналитика»." },
    ],
  },
};
