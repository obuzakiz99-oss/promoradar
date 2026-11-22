import type { Tour } from "./types";

/** /t/ — the coin index (components/TokenIndex.tsx). */
export const TOKENS_TOUR: Tour = {
  id: "tokens",
  name: { uk: "За монетою", en: "By coin", ru: "По монете" },
  steps: {
    uk: [
      { title: "Акції за монетою", text: "Тут усе зібрано навколо однієї монети: в яких акціях її роздають, у яких Launchpool її дають за стейк і де на неї найвищий відсоток Earn. Зручно, якщо монета у вас уже є або вас цікавить конкретний токен." },
      { sel: "tokens-search", title: "Пошук монети", text: "Введіть тікер — наприклад, SOL або USDT. Плитки фільтруються одразу, точний збіг стоїть першим." },
      { sel: "tokens-promos", title: "«З акціями»", text: "Перша група — монети, які зараз роздають в акціях бірж; вгорі ті, де найбільше акцій і пулів. Число біля назви — скільки монет у групі. Показано перші 30, решту відкриває «Показати ще»." },
      { sel: "tokens-tile", title: "Плитка монети", text: "Натисніть, щоб відкрити сторінку монети. Під тікером — коротко, що по ній є:", points: ["N акцій — скільки акцій роздають цю монету", "N Launchpool — у скількох пулах її дають або приймають у стейк", "Earn до X% — найвища звичайна ставка Earn (без пропозицій лише для нових)", "Стейблкоїни (USDT, USDC) показують без акцій: їх платить майже кожна акція"] },
      { sel: "tokens-lp", title: "«З Launchpool»", text: "Монети без акцій, але з Launchpool: їх можна отримати за стейк інших монет або самі покласти в пул." },
      { sel: "tokens-earn", title: "«Лише Earn»", text: "Монети, на які зараз є тільки Earn — відсотки за те, що монета лежить на біржі. На сторінці монети ставки всіх бірж стоять поруч." },
    ],
    en: [
      { title: "Promos by coin", text: "Everything here is grouped around one coin: which promos give it away, which Launchpools pay it for staking, and where it earns the highest Earn rate. Handy if you already hold a coin or care about a specific token." },
      { sel: "tokens-search", title: "Find a coin", text: "Type a ticker — say SOL or USDT. The tiles filter as you type, an exact match comes first." },
      { sel: "tokens-promos", title: "“With promos”", text: "The first group: coins exchanges are giving away in promos right now, those with the most promos and pools on top. The number by the heading is how many coins are in the group. The first 30 are shown, “Show more” opens the rest." },
      { sel: "tokens-tile", title: "Coin tile", text: "Tap to open the coin’s page. Under the ticker — what there is for it:", points: ["N promos — how many promos give this coin away", "N Launchpool — how many pools pay it or accept it as a stake", "Earn up to X% — the best regular Earn rate (new-user-only offers left out)", "Stablecoins (USDT, USDC) show no promos: nearly every promo pays them"] },
      { sel: "tokens-lp", title: "“With a Launchpool”", text: "Coins with no promos but with a Launchpool: you can get them by staking other coins, or stake them in a pool yourself." },
      { sel: "tokens-earn", title: "“Earn only”", text: "Coins that only have Earn now — interest for keeping the coin on an exchange. The coin’s page puts every exchange’s rate side by side." },
    ],
    ru: [
      { title: "Акции по монете", text: "Здесь всё собрано вокруг одной монеты: в каких акциях её раздают, в каких Launchpool её дают за стейк и где на неё самый высокий процент Earn. Удобно, если монета у вас уже есть или вас интересует конкретный токен." },
      { sel: "tokens-search", title: "Поиск монеты", text: "Введите тикер — например, SOL или USDT. Плитки фильтруются сразу, точное совпадение стоит первым." },
      { sel: "tokens-promos", title: "«С акциями»", text: "Первая группа — монеты, которые сейчас раздают в акциях бирж; вверху те, где больше всего акций и пулов. Число у заголовка — сколько монет в группе. Показаны первые 30, остальные открывает «Показать ещё»." },
      { sel: "tokens-tile", title: "Плитка монеты", text: "Нажмите, чтобы открыть страницу монеты. Под тикером — коротко, что по ней есть:", points: ["N акций — сколько акций раздают эту монету", "N Launchpool — в скольких пулах её дают или принимают в стейк", "Earn до X% — самая высокая обычная ставка Earn (без предложений только для новых)", "Стейблкоины (USDT, USDC) показаны без акций: их платит почти каждая акция"] },
      { sel: "tokens-lp", title: "«С Launchpool»", text: "Монеты без акций, но с Launchpool: их можно получить за стейк других монет или самому положить в пул." },
      { sel: "tokens-earn", title: "«Только Earn»", text: "Монеты, на которые сейчас есть только Earn — проценты за то, что монета лежит на бирже. На странице монеты ставки всех бирж стоят рядом." },
    ],
  },
};
