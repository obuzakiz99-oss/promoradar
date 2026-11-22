import type { Tour } from "./types";

/** /zero-fees/: where to trade with no trading fee (app/[lang]/zero-fees/page.tsx; cards = components/PromoCard.tsx). */
export const ZEROFEES_TOUR: Tour = {
  id: "zerofees",
  name: { uk: "0% комісії", en: "0% fees", ru: "0% комиссии" },
  steps: {
    uk: [
      { title: "Для чого ця сторінка", text: "Біржі й DEX, які зараз не беруть комісію за торгівлю. Якщо ви торгуєте часто, комісії з'їдають помітну частину прибутку, тож нуль — це пряма економія. Список оновлюється сам з оголошень бірж." },
      { sel: "zerofees-standing", title: "Постійно", text: "Пропозиції без дати завершення: нуль комісій діє, доки біржа його не скасує. Число поруч із заголовком — скільки таких пропозицій." },
      { sel: "zerofees-campaigns", title: "Акції на час", text: "Нуль комісій лише до кінця кампанії. Першими стоять ті, що закінчуються раніше; пропозиції лише для окремих регіонів — у кінці списку." },
      { sel: "card", title: "Картка пропозиції", text: "Зверху біржа і тип майданчика (CEX — централізована біржа, DEX — децентралізована). Позначка під заголовком підкаже обмеження, наприклад «Лише для окремих регіонів» чи «Для нових користувачів». Натисніть картку, щоб побачити, на які пари і типи заявок діє нуль." },
      { sel: "card-money", title: "Що отримуєте", text: "«Комісія за торгівлю 0%» — сама пропозиція. Якщо кампанія ще й дає нагороду, тут буде фонд або сума на 1 людину. Справа — «Діє постійно» або скільки часу лишилось до кінця. Кнопка нижче відкриває умови." },
      { sel: "card-actions", title: "Зберегти або приховати", text: "★ додає пропозицію в «Мої», щоб не шукати її знову. Перекреслене око ховає її зі стрічки на головній." },
      { sel: "zerofees-tips", title: "На що звернути увагу", text: "Чотири пастки нульової комісії: часто 0% лише на окремі пари або тільки для maker-ордерів, спред може бути ширшим, частина акцій лише для нових користувачів чи певних країн, а обсяг на таких парах зазвичай не йде в змагання та VIP-рівні. Перевірте їх перед великою угодою." },
    ],
    en: [
      { title: "What this page is for", text: "Exchanges and DEXs that currently charge no trading fee. If you trade often, fees eat a noticeable part of the profit, so zero is a direct saving. The list updates itself from exchange announcements." },
      { sel: "zerofees-standing", title: "Ongoing", text: "Offers with no end date: zero fees stay until the exchange cancels them. The number next to the heading is how many there are." },
      { sel: "zerofees-campaigns", title: "Time-limited campaigns", text: "Zero fees only until the campaign ends. The ones ending soonest come first; offers for selected regions only are at the end." },
      { sel: "card", title: "Offer card", text: "At the top: the exchange and venue type (CEX — centralised exchange, DEX — decentralised). The tag under the title flags limits, such as “Selected regions only” or “New users”. Tap the card to see which pairs and order types are fee-free." },
      { sel: "card-money", title: "What you get", text: "“Trading fee 0%” is the offer itself. If the campaign also pays a reward, you see its pool or the amount per person here. On the right: “Runs ongoing” or the time left. The button below opens the terms." },
      { sel: "card-actions", title: "Save or hide", text: "★ adds the offer to “Saved” so you don’t have to look for it again. The crossed-out eye hides it from the home feed." },
      { sel: "zerofees-tips", title: "What to check", text: "Four catches of zero fees: 0% often covers only some pairs or only maker orders, the spread can be wider, some offers are for new users or certain countries only, and volume on such pairs usually doesn’t count toward competitions or VIP tiers. Check them before a large trade." },
    ],
    ru: [
      { title: "Для чего эта страница", text: "Биржи и DEX, которые сейчас не берут комиссию за торговлю. Если вы торгуете часто, комиссии съедают заметную часть прибыли, так что ноль — прямая экономия. Список обновляется сам из объявлений бирж." },
      { sel: "zerofees-standing", title: "Постоянно", text: "Предложения без даты окончания: ноль комиссий действует, пока биржа его не отменит. Число рядом с заголовком — сколько таких предложений." },
      { sel: "zerofees-campaigns", title: "Акции на время", text: "Ноль комиссий только до конца кампании. Первыми идут те, что заканчиваются раньше; предложения только для отдельных регионов — в конце списка." },
      { sel: "card", title: "Карточка предложения", text: "Сверху биржа и тип площадки (CEX — централизованная биржа, DEX — децентрализованная). Пометка под заголовком подскажет ограничения, например «Только для отдельных регионов» или «Для новых пользователей». Нажмите карточку, чтобы увидеть, на какие пары и типы заявок действует ноль." },
      { sel: "card-money", title: "Что получаете", text: "«Комиссия за торговлю 0%» — само предложение. Если кампания ещё и даёт награду, здесь будет фонд или сумма на 1 человека. Справа — «Действует постоянно» или сколько времени осталось до конца. Кнопка ниже открывает условия." },
      { sel: "card-actions", title: "Сохранить или скрыть", text: "★ добавляет предложение в «Мои», чтобы не искать его снова. Перечёркнутый глаз скрывает его из ленты на главной." },
      { sel: "zerofees-tips", title: "На что обратить внимание", text: "Четыре ловушки нулевой комиссии: часто 0% только на отдельные пары или только для maker-ордеров, спред может быть шире, часть акций только для новых пользователей или определённых стран, а объём на таких парах обычно не идёт в соревнования и VIP-уровни. Проверьте их перед крупной сделкой." },
    ],
  },
};
