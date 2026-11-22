import type { Tour } from "./types";

/** /v/<exchange>/ — one exchange (app/[lang]/v/[id]/page.tsx, VenuePayout.tsx, PromoExplorer.tsx, PromoCard.tsx). */
export const VENUE_TOUR: Tour = {
  id: "venue",
  name: { uk: "Сторінка біржі", en: "Exchange page", ru: "Страница биржи" },
  steps: {
    uk: [
      { title: "Сторінка біржі", text: "Усе про одну біржу: її активні акції, як вона виплачує нагороди, і посилання на офіційний сайт. Сюди ведуть точки радара на головній і список майданчиків унизу сторінки." },
      { sel: "venue-head", title: "Біржа", text: "Тип майданчика, назва і скільки в неї зараз акцій.", points: ["Зареєструватися ↗ — реєстрація на біржі (для DEX — «Відкрити …»)", "реф. — реферальне посилання: ми можемо отримати комісію від біржі, для вас умови ті самі", "Сайт ↗ — офіційний сайт без реферального посилання", "Як взяти участь — покрокова інструкція для цієї біржі (є не для всіх)"] },
      { sel: "venue-noauto", title: "Дані з затримкою", text: "Ця біржа не дає автоматично читати свої акції, тому тут їх може бути менше або вони з'являються із затримкою. Кнопка справа веде на офіційну сторінку акцій — там список завжди повний." },
      { sel: "venue-payout", title: "Як платить біржа", text: "Що знати до участі: чи будуть це живі гроші і коли.", points: ["З офіційних правил біржі — перевірені факти, джерело і дата перевірки", "Можна вивести, Ваучер / бонус, Бали, не гроші — у чому платять її акції на сайті зараз", "Типова виплата — до N дн. після кінця акції", "Забирати вручну / Автоматично — чи треба самому натиснути «забрати»"] },
      { sel: "venue-promos", title: "Акції біржі", text: "Та сама стрічка, що на головній, лише для цієї біржі.", points: ["Пошук і сортування — «Найвигідніші», «Нові», «Скоро завершуються»…", "Фільтри — статус, країна, «Без вкладень», «Поріг до $100», «Для нових»", "Типи — змагання, бонуси, Earn тощо, з кількістю", "★ на картці — зберегти в «Мої»"] },
      { sel: "card-money", title: "Скільки можна отримати", text: "«≈ $…» — наша оцінка, скільки отримає звичайний учасник після витрат. «Максимум на 1 людину» — стеля за правилами, «Фонд» — на всіх учасників. Натисніть на картку — відкриються умови й кроки участі." },
      { sel: "venue-others", title: "Інші майданчики", text: "Перехід на сторінки інших бірж і DEX — щоб порівняти, хто зараз дає більше." },
    ],
    en: [
      { title: "Exchange page", text: "Everything about one exchange: its live promos, how it pays rewards, and links to its official site. The radar dots on the home page and the venue list at the bottom lead here." },
      { sel: "venue-head", title: "The exchange", text: "Venue type, name and how many promos it runs now.", points: ["Sign up ↗ — register on the exchange (for a DEX — “Open …”)", "ref — a referral link: we may earn a commission from the exchange, your terms are the same", "Website ↗ — the official site, no referral link", "How to join — a step-by-step guide for this exchange (not for all)"] },
      { sel: "venue-noauto", title: "Data with a delay", text: "This exchange doesn’t let its promos be read automatically, so fewer may show here, or with a delay. The button on the right opens its official promo page — the full list is always there." },
      { sel: "venue-payout", title: "How the exchange pays", text: "What to know before joining: is it real money, and when.", points: ["From the exchange’s official rules — verified facts, the source and the check date", "Withdrawable, Voucher / bonus, Points, not money — how its promos on the site pay now", "Typical payout — within N days after the promo ends", "Claim manually / Automatic — whether you must press “claim” yourself"] },
      { sel: "venue-promos", title: "The exchange’s promos", text: "The same feed as on the home page, for this exchange only.", points: ["Search and sort — “Best value”, “Newest”, “Ending soon”…", "Filters — status, country, “No deposit”, “Entry under $100”, “New users”", "Types — competitions, bonuses, Earn and more, with counts", "★ on a card — save it to “Saved”"] },
      { sel: "card-money", title: "What you can get", text: "“≈ $…” is our estimate of what an ordinary participant gets after costs. “Max per person” is the cap by the rules, “Pool” is shared by everyone. Tap a card for the rules and steps." },
      { sel: "venue-others", title: "Other venues", text: "Links to the other exchanges and DEXs — to compare who pays more right now." },
    ],
    ru: [
      { title: "Страница биржи", text: "Всё об одной бирже: её активные акции, как она выплачивает награды, и ссылки на официальный сайт. Сюда ведут точки радара на главной и список площадок внизу страницы." },
      { sel: "venue-head", title: "Биржа", text: "Тип площадки, название и сколько у неё сейчас акций.", points: ["Зарегистрироваться ↗ — регистрация на бирже (для DEX — «Открыть …»)", "реф. — реферальная ссылка: мы можем получить комиссию от биржи, для вас условия те же", "Сайт ↗ — официальный сайт без реферальной ссылки", "Как участвовать — пошаговая инструкция для этой биржи (есть не для всех)"] },
      { sel: "venue-noauto", title: "Данные с задержкой", text: "Эта биржа не даёт автоматически читать свои акции, поэтому здесь их может быть меньше или они появляются с задержкой. Кнопка справа ведёт на официальную страницу акций — там список всегда полный." },
      { sel: "venue-payout", title: "Как платит биржа", text: "Что знать до участия: будут ли это живые деньги и когда.", points: ["Из официальных правил биржи — проверенные факты, источник и дата проверки", "Можно вывести, Ваучер / бонус, Баллы, не деньги — чем платят её акции на сайте сейчас", "Типичная выплата — до N дн. после конца акции", "Забирать вручную / Автоматически — нужно ли самому нажать «забрать»"] },
      { sel: "venue-promos", title: "Акции биржи", text: "Та же лента, что на главной, только для этой биржи.", points: ["Поиск и сортировка — «Самые выгодные», «Новые», «Скоро завершатся»…", "Фильтры — статус, страна, «Без вложений», «Порог до $100», «Для новых»", "Типы — соревнования, бонусы, Earn и другие, с количеством", "★ на карточке — сохранить в «Мои»"] },
      { sel: "card-money", title: "Сколько можно получить", text: "«≈ $…» — наша оценка, сколько получит обычный участник после затрат. «Максимум на 1 человека» — потолок по правилам, «Фонд» — на всех участников. Нажмите на карточку — откроются условия и шаги участия." },
      { sel: "venue-others", title: "Другие площадки", text: "Переход на страницы других бирж и DEX — чтобы сравнить, кто сейчас даёт больше." },
    ],
  },
};
