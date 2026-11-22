import type { Tour } from "./types";

/** /t/<coin>/ — one coin across all exchanges (app/[lang]/t/[sym]/page.tsx). Empty sections are not rendered → skipped. */
export const TOKEN_TOUR: Tour = {
  id: "token",
  name: { uk: "Сторінка монети", en: "Coin page", ru: "Страница монеты" },
  steps: {
    uk: [
      { title: "Сторінка монети", text: "Усе про одну монету з усіх бірж: акції, Launchpool і ставки Earn. Порожні розділи не показуються — якщо якогось немає, зараз такого просто немає." },
      { sel: "token-head", title: "Монета і ціна", text: "Тікер і коротко, що є на сторінці. Справа — поточна ціна і зміна за 24 години: зелена — ціна зросла, червона — впала. У стейблкоїнів ціни немає: вони коштують ≈ $1." },
      { sel: "token-unlock", title: "Наступний розлок", text: "Коли розблокується наступна частина монет, на яку суму в доларах і яка це частка капіталізації. Великий розлок часто тисне на ціну. Натисніть, щоб відкрити календар розлоків." },
      { sel: "token-promos", title: "Акції з цією монетою", text: "Акції бірж, де нагорода — ця монета. Картки ті самі, що на головній: оцінка «≈ $», максимум на 1 людину, фонд і час до кінця. Число біля заголовка — скільки таких акцій." },
      { sel: "token-lpreward", title: "Launchpool: отримати монету", text: "Пули, де за стейк інших монет нараховують цю монету.", points: ["Стейк USDT · 12.3% — що покласти і річний відсоток (APR)", "для нових — пул лише для нових користувачів біржі", "Справа — скільки до старту або до кінця", "Натисніть — відкриється сторінка пулу"] },
      { sel: "token-lpstake", title: "Launchpool: покласти монету", text: "Пули, куди можна покласти саме цю монету й отримувати інший токен. Найвищий відсоток — першим.", points: ["Стейк X → Y — що кладете і що отримуєте", "ліміт — скільки максимум приймає пул від однієї людини", "Справа — APR, річний відсоток"] },
      { sel: "token-earn", title: "Ставки Earn", text: "Де ця монета приносить відсотки за зберігання на біржі; найвища ставка — першою.", points: ["гнучкий — можна забрати будь-коли", "фікс. N дн. — гроші заморожені на N днів", "ончейн — стейкінг у мережі через біржу", "для нових — лише для нових користувачів (стоять у кінці)", "ліміт — максимальна сума під цю ставку", "Справа — APR; натисніть, щоб відкрити Earn на біржі"] },
      { sel: "token-related", title: "Інші монети", text: "Монети, по яких зараз найбільше акцій і пулів, — перехід на їхні сторінки. «← Усі токени» вгорі повертає до повного списку." },
    ],
    en: [
      { title: "Coin page", text: "Everything about one coin across all exchanges: promos, Launchpools and Earn rates. Empty sections are not shown — if one is missing, there is simply nothing like it right now." },
      { sel: "token-head", title: "Coin and price", text: "The ticker and what the page covers. On the right: the current price and the 24-hour change — green means up, red means down. Stablecoins show no price: they are worth ≈ $1." },
      { sel: "token-unlock", title: "Next unlock", text: "When the next batch of coins unlocks, its dollar value and what share of the market cap it is. A big unlock often weighs on the price. Tap to open the unlock calendar." },
      { sel: "token-promos", title: "Promos paying this coin", text: "Exchange promos whose reward is this coin. The cards are the same as on the home page: the “≈ $” estimate, max per person, pool and time left. The number by the heading is how many there are." },
      { sel: "token-lpreward", title: "Launchpool: earn the coin", text: "Pools that pay this coin for staking other coins.", points: ["Stake USDT · 12.3% — what to stake and the yearly rate (APR)", "new users — a pool for the exchange’s new users only", "On the right — time to start or to the end", "Tap — opens the pool’s page"] },
      { sel: "token-lpstake", title: "Launchpool: stake the coin", text: "Pools where you can stake this very coin and earn another token. Highest rate first.", points: ["Stake X → Y — what you put in and what you get", "cap — the most the pool accepts from one person", "On the right — APR, the yearly rate"] },
      { sel: "token-earn", title: "Earn rates", text: "Where this coin earns interest for being kept on an exchange; the best rate first.", points: ["flexible — withdraw any time", "fixed N d — the money is locked for N days", "on-chain — network staking through the exchange", "new users — new users only (listed last)", "cap — the most you can put in at this rate", "On the right — APR; tap to open Earn on the exchange"] },
      { sel: "token-related", title: "Other coins", text: "Coins with the most promos and pools right now — links to their pages. “← All tokens” at the top takes you back to the full list." },
    ],
    ru: [
      { title: "Страница монеты", text: "Всё об одной монете со всех бирж: акции, Launchpool и ставки Earn. Пустые разделы не показываются — если какого-то нет, сейчас такого просто нет." },
      { sel: "token-head", title: "Монета и цена", text: "Тикер и коротко, что есть на странице. Справа — текущая цена и изменение за 24 часа: зелёное — цена выросла, красное — упала. У стейблкоинов цены нет: они стоят ≈ $1." },
      { sel: "token-unlock", title: "Следующий разлок", text: "Когда разблокируется следующая часть монет, на какую сумму в долларах и какая это доля капитализации. Крупный разлок часто давит на цену. Нажмите, чтобы открыть календарь разлоков." },
      { sel: "token-promos", title: "Акции с этой монетой", text: "Акции бирж, где награда — эта монета. Карточки те же, что на главной: оценка «≈ $», максимум на 1 человека, фонд и время до конца. Число у заголовка — сколько таких акций." },
      { sel: "token-lpreward", title: "Launchpool: получить монету", text: "Пулы, где за стейк других монет начисляют эту монету.", points: ["Стейк USDT · 12.3% — что положить и годовой процент (APR)", "для новых — пул только для новых пользователей биржи", "Справа — сколько до старта или до конца", "Нажмите — откроется страница пула"] },
      { sel: "token-lpstake", title: "Launchpool: положить монету", text: "Пулы, куда можно положить именно эту монету и получать другой токен. Самый высокий процент — первым.", points: ["Стейк X → Y — что кладёте и что получаете", "лимит — сколько максимум пул принимает от одного человека", "Справа — APR, годовой процент"] },
      { sel: "token-earn", title: "Ставки Earn", text: "Где эта монета приносит проценты за хранение на бирже; самая высокая ставка — первой.", points: ["гибкий — можно забрать в любой момент", "фикс. N дн. — деньги заморожены на N дней", "ончейн — стейкинг в сети через биржу", "для новых — только для новых пользователей (стоят в конце)", "лимит — максимальная сумма под эту ставку", "Справа — APR; нажмите, чтобы открыть Earn на бирже"] },
      { sel: "token-related", title: "Другие монеты", text: "Монеты, по которым сейчас больше всего акций и пулов, — переход на их страницы. «← Все токены» вверху возвращает к полному списку." },
    ],
  },
};
