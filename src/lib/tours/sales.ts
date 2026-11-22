import type { Tour } from "./types";

/** /sales/: public token sales and pre-IPO tokens (app/[lang]/sales/page.tsx). */
export const SALES_TOUR: Tour = {
  id: "sales",
  name: { uk: "Токен-сейли", en: "Token sales", ru: "Токен-сейлы" },
  steps: {
    uk: [
      { title: "Що таке токен-сейл", text: "Публічний продаж нового токена до того, як він почне торгуватися: Launchpad бірж, Binance Wallet, IDO на лаунчпадах. Тут видно, що йде зараз і що стартує найближчим часом. Приватні раунди й «пресейли» ми не показуємо: серед них багато скаму." },
      { sel: "sales-tabs", title: "Розділи календаря", text: "«Акції» — старти й завершення акцій, «Розлоки токенів» — коли виходять заблоковані монети, «Токен-сейли» — ця сторінка. Позначка поруч — коли оновились дані." },
      { sel: "sales-how", title: "Як узяти участь", text: "Три кроки, однакові майже для всіх сейлів: перевірити умови (KYC, ліміти, розподіл), заздалегідь підготувати гроші на біржі чи в гаманці в потрібній мережі й подати заявку у вікно підписки." },
      { sel: "sales-risk", title: "Ризик", text: "Сейл не гарантує заробіток: після лістингу ціна може впасти нижче ціни продажу. Вкладайте лише ту суму, яку готові втратити." },
      { sel: "sales-preipo", title: "Pre-IPO токени", text: "Токени, прив'язані до акцій компанії ще до її виходу на біржу. Один блок — одна компанія, усередині всі біржі, де токен є зараз.", points: ["Підписка — купівля за ціною розміщення", "Торгівля — токен уже можна купити чи продати", "Акція — промо з нагородою в цьому токені", "+N — ще стільки акцій на цій біржі", "Це не самі акції компанії, а токен біржі, що відстежує їхню ціну"] },
      { sel: "sales-group", title: "Групи сейлів", text: "Сейли розкладено за станом, число поруч — скільки їх.", points: ["Ідуть зараз — підписка відкрита, є дата кінця", "Скоро — відомо, коли старт", "Оголошені, дата ще не відома — проєкт анонсовано, але дати немає"] },
      { sel: "sales-row", title: "Рядок сейлу", text: "Назва проєкту і де проходить продаж.", points: ["Біржа — Launchpad централізованої біржі", "Гаманець — продаж у Web3-гаманці біржі (наприклад, Binance Wallet)", "Лаунчпад — IDO на окремій платформі", "Нижче — майданчик і категорія проєкту"] },
      { sel: "sales-time", title: "Строки й гроші", text: "Скільки часу лишилось і масштаб продажу.", points: ["Старт через / кінець через — жовтим, якщо лишилось менше 2 днів", "Збирають — скільки проєкт хоче залучити на сейлі", "Оцінка проєкту (FDV) — вартість усіх токенів за ціною сейлу: що вона вища, то дорожче ви купуєте проєкт"] },
      { sel: "sales-actions", title: "Нагадування й деталі", text: "Кнопка з календариком додає нагадування в Google Calendar або файлом .ics: за годину до старту або за 6 годин до кінця підписки. «Деталі →» відкриває сторінку на PromoRadar, «Деталі ↗» — сайт біржі чи ICO Drops." },
    ],
    en: [
      { title: "What a token sale is", text: "A public sale of a new token before it starts trading: exchange launchpads, Binance Wallet, IDOs on launchpads. Here you see what is live now and what starts soon. We leave out private rounds and “presales” — many of them are scams." },
      { sel: "sales-tabs", title: "Calendar sections", text: "“Promos” — promo starts and ends, “Token unlocks” — when locked coins come out, “Token sales” — this page. The tag next to them shows when the data was updated." },
      { sel: "sales-how", title: "How to take part", text: "Three steps that fit almost every sale: check the rules (KYC, limits, allocation), prepare the money in advance on the exchange or in a wallet on the right chain, and subscribe during the window." },
      { sel: "sales-risk", title: "Risk", text: "A sale doesn’t guarantee profit: after the listing the price can drop below the sale price. Only put in what you can afford to lose." },
      { sel: "sales-preipo", title: "Pre-IPO tokens", text: "Tokens tied to a company’s shares before it goes public. One block per company, inside — every exchange that has the token now.", points: ["Subscription — buy at the offer price", "Trading — the token can already be bought or sold", "Promo — a promo paid in this token", "+N — that many more promos on this exchange", "These are not the company’s shares but an exchange token tracking their price"] },
      { sel: "sales-group", title: "Sale groups", text: "Sales are grouped by state; the number is how many.", points: ["Live now — subscription is open and has an end date", "Coming up — the start date is known", "Announced, date not known yet — the project is announced without a date"] },
      { sel: "sales-row", title: "A sale row", text: "The project name and where the sale runs.", points: ["Exchange — a centralised exchange launchpad", "Wallet — a sale in the exchange’s Web3 wallet (e.g. Binance Wallet)", "Launchpad — an IDO on a separate platform", "Below — the venue and project category"] },
      { sel: "sales-time", title: "Timing and money", text: "Time left and the size of the sale.", points: ["Starts in / ends in — amber when under 2 days", "Raising — how much the project wants to raise in the sale", "Project valuation (FDV) — the value of all tokens at the sale price: the higher it is, the more you pay for the project"] },
      { sel: "sales-actions", title: "Reminder and details", text: "The calendar button adds a reminder to Google Calendar or as an .ics file: an hour before the start or 6 hours before the subscription ends. “Details →” opens a page on PromoRadar, “Details ↗” the exchange or ICO Drops site." },
    ],
    ru: [
      { title: "Что такое токен-сейл", text: "Публичная продажа нового токена до того, как он начнёт торговаться: Launchpad бирж, Binance Wallet, IDO на лаунчпадах. Здесь видно, что идёт сейчас и что стартует в ближайшее время. Приватные раунды и «пресейлы» мы не показываем: среди них много скама." },
      { sel: "sales-tabs", title: "Разделы календаря", text: "«Акции» — старты и завершения акций, «Разлоки токенов» — когда выходят заблокированные монеты, «Токен-сейлы» — эта страница. Пометка рядом — когда обновились данные." },
      { sel: "sales-how", title: "Как участвовать", text: "Три шага, одинаковые почти для всех сейлов: проверить условия (KYC, лимиты, распределение), заранее подготовить деньги на бирже или в кошельке в нужной сети и подать заявку в окно подписки." },
      { sel: "sales-risk", title: "Риск", text: "Сейл не гарантирует заработок: после листинга цена может упасть ниже цены продажи. Вкладывайте только ту сумму, которую готовы потерять." },
      { sel: "sales-preipo", title: "Pre-IPO токены", text: "Токены, привязанные к акциям компании ещё до её выхода на биржу. Один блок — одна компания, внутри все биржи, где токен есть сейчас.", points: ["Подписка — покупка по цене размещения", "Торговля — токен уже можно купить или продать", "Акция — промо с наградой в этом токене", "+N — ещё столько акций на этой бирже", "Это не сами акции компании, а токен биржи, отслеживающий их цену"] },
      { sel: "sales-group", title: "Группы сейлов", text: "Сейлы разложены по состоянию, число рядом — сколько их.", points: ["Идут сейчас — подписка открыта, есть дата конца", "Скоро — известно, когда старт", "Объявлены, дата ещё не известна — проект анонсирован, но даты нет"] },
      { sel: "sales-row", title: "Строка сейла", text: "Название проекта и где проходит продажа.", points: ["Биржа — Launchpad централизованной биржи", "Кошелёк — продажа в Web3-кошельке биржи (например, Binance Wallet)", "Лаунчпад — IDO на отдельной платформе", "Ниже — площадка и категория проекта"] },
      { sel: "sales-time", title: "Сроки и деньги", text: "Сколько времени осталось и масштаб продажи.", points: ["Старт через / конец через — жёлтым, если осталось меньше 2 дней", "Собирают — сколько проект хочет привлечь на сейле", "Оценка проекта (FDV) — стоимость всех токенов по цене сейла: чем она выше, тем дороже вы покупаете проект"] },
      { sel: "sales-actions", title: "Напоминание и детали", text: "Кнопка с календариком добавляет напоминание в Google Calendar или файлом .ics: за час до старта или за 6 часов до конца подписки. «Детали →» открывает страницу на PromoRadar, «Детали ↗» — сайт биржи или ICO Drops." },
    ],
  },
};
