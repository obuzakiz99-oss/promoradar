import type { Tour } from "./types";

/** /fixed/: Pendle PT markets on stablecoins (app/[lang]/fixed/page.tsx + components/TableTools.tsx). */
export const FIXED_TOUR: Tour = {
  id: "fixed",
  name: { uk: "Фіксована дохідність", en: "Fixed yield", ru: "Фиксированная доходность" },
  steps: {
    uk: [
      { title: "Що таке фіксована дохідність", text: "У протоколі Pendle можна купити PT-токен стейблкоїна зі знижкою. У дату погашення він обмінюється на повну вартість — тож дохідність відома наперед і не залежить від того, як потім зміняться ставки. Тут зібрано такі ринки на стейблкоїнах." },
      { sel: "fixed-tabs", title: "Розділи дохідності", text: "«Launchpool» і «Earn бірж» — дохід на біржі, «DeFi-пули» — змінна дохідність у протоколах, «Фіксована» — відома наперед (ця сторінка). Справа — коли дані оновились." },
      { sel: "fixed-guide", title: "Покрокова методичка", text: "Якщо ви ще не купували PT, почніть звідси: інструкція показує, як підключити гаманець, вибрати ринок і купити PT на Pendle, і на що зважати." },
      { sel: "table-tools", title: "Пошук і відбір", text: "Інструменти над таблицею.", points: ["Пошук — за назвою ринку або мережею", "Мережа — лише ринки в одній мережі", "Строк — до 30 днів, 30–90 днів, понад 90 днів", "«N з M» — скільки ринків видно зараз", "Сортування — «Більша ліквідність», «Вищий APY», «Раніше погашення»; вибір запам'ятовується"] },
      { sel: "fixed-row", title: "Рядок ринку", text: "Один рядок — один PT-токен.", points: ["Ринок — назва PT; клік відкриває ринок на Pendle ↗", "Мережа — де купувати", "Фікс. APY — річна дохідність, якщо тримати до погашення", "Погашення — дата і скільки днів лишилось", "Ліквідність — скільки грошей у ринку: більше = легше купити й продати без втрат"] },
      { sel: "fixed-note", title: "Головний ризик", text: "Фіксується лише дохідність, а не сам актив. Якщо стейблкоїн (особливо синтетичний) втратить прив'язку до долара, PT теж подешевшає. Продати раніше погашення можна, але за ринковою ціною." },
      { title: "Як обрати", text: "Для першого разу беріть ринок із великою ліквідністю і строком, на який гроші вам точно не знадобляться: дохід гарантований лише в дату погашення." },
    ],
    en: [
      { title: "What fixed yield is", text: "On Pendle you can buy a stablecoin’s PT token at a discount. At maturity it is redeemed at full value, so the yield is known in advance and doesn’t depend on how rates move later. These are such markets on stablecoins." },
      { sel: "fixed-tabs", title: "Yield sections", text: "“Launchpool” and “Exchange Earn” — income on an exchange, “DeFi pools” — floating yield in protocols, “Fixed” — known in advance (this page). On the right: when the data was updated." },
      { sel: "fixed-guide", title: "Step-by-step guide", text: "If you have never bought a PT, start here: the guide shows how to connect a wallet, pick a market and buy PT on Pendle, and what to watch out for." },
      { sel: "table-tools", title: "Search and filters", text: "Tools above the table.", points: ["Search — by market name or chain", "Chain — markets on one chain only", "Term — under 30 days, 30–90 days, over 90 days", "“N of M” — how many markets are shown", "Sort — “Most liquidity”, “Highest APY”, “Earliest maturity”; your choice is remembered"] },
      { sel: "fixed-row", title: "A market row", text: "One row is one PT token.", points: ["Market — the PT name; click to open it on Pendle ↗", "Chain — where to buy", "Fixed APY — yearly yield if held to maturity", "Maturity — the date and days left", "Liquidity — money in the market: more = easier to buy and sell without losses"] },
      { sel: "fixed-note", title: "The main risk", text: "Only the yield is fixed, not the asset. If the stablecoin (especially a synthetic one) loses its dollar peg, PT falls too. You can sell before maturity, but at the market price." },
      { title: "How to choose", text: "For a first try, take a market with large liquidity and a term during which you surely won’t need the money: the yield is guaranteed only at maturity." },
    ],
    ru: [
      { title: "Что такое фиксированная доходность", text: "В протоколе Pendle можно купить PT-токен стейблкоина со скидкой. В дату погашения он обменивается на полную стоимость — поэтому доходность известна заранее и не зависит от того, как потом изменятся ставки. Здесь собраны такие рынки на стейблкоинах." },
      { sel: "fixed-tabs", title: "Разделы доходности", text: "«Launchpool» и «Earn бирж» — доход на бирже, «DeFi-пулы» — переменная доходность в протоколах, «Фиксированная» — известная заранее (эта страница). Справа — когда данные обновились." },
      { sel: "fixed-guide", title: "Пошаговая методичка", text: "Если вы ещё не покупали PT, начните отсюда: инструкция показывает, как подключить кошелёк, выбрать рынок и купить PT на Pendle, и на что обратить внимание." },
      { sel: "table-tools", title: "Поиск и отбор", text: "Инструменты над таблицей.", points: ["Поиск — по названию рынка или сети", "Сеть — только рынки в одной сети", "Срок — до 30 дней, 30–90 дней, более 90 дней", "«N из M» — сколько рынков видно сейчас", "Сортировка — «Больше ликвидность», «Выше APY», «Раньше погашение»; выбор запоминается"] },
      { sel: "fixed-row", title: "Строка рынка", text: "Одна строка — один PT-токен.", points: ["Рынок — название PT; клик открывает рынок на Pendle ↗", "Сеть — где покупать", "Фикс. APY — годовая доходность, если держать до погашения", "Погашение — дата и сколько дней осталось", "Ликвидность — сколько денег в рынке: больше = легче купить и продать без потерь"] },
      { sel: "fixed-note", title: "Главный риск", text: "Фиксируется только доходность, а не сам актив. Если стейблкоин (особенно синтетический) потеряет привязку к доллару, PT тоже подешевеет. Продать до погашения можно, но по рыночной цене." },
      { title: "Как выбрать", text: "Для первого раза берите рынок с большой ликвидностью и сроком, на который деньги вам точно не понадобятся: доход гарантирован только в дату погашения." },
    ],
  },
};
