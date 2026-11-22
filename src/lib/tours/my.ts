import type { Tour } from "./types";

/** /my/ — saved promos (components/MyBoard.tsx). Empty list → only my-empty is rendered; with promos → the rest. */
export const MY_TOUR: Tour = {
  id: "my",
  name: { uk: "Мої акції", en: "My promos", ru: "Мои акции" },
  steps: {
    uk: [
      { title: "Мої акції", text: "Ваш особистий список: акції, які ви зберегли зірочкою ★, з вашим статусом участі, заробітком і нотатками. Усе зберігається лише в цьому браузері — реєстрація не потрібна, але на іншому пристрої чи після очищення браузера списку не буде." },
      { sel: "my-empty", title: "Поки порожньо", text: "Щоб акція з'явилась тут, натисніть ★ на її картці в стрічці або на сторінці акції. Скільки збережено, видно на зірочці в меню. Далі тут можна вести облік: у чому берете участь, скільки заробили і коли дедлайн." },
      { sel: "my-stats", title: "Підсумки", text: "Чотири плитки над списком:", points: ["Усього заробили — сума з полів «Заробив, $» усіх збережених акцій", "Беру участь · активних — скільки акцій зі статусом «Беру участь»", "Експорт CSV — завантажити список як таблицю (Excel, Google Таблиці)", "Дедлайни в календар (.ics) — файл для календаря з нагадуванням за день до кінця; число — скільки дедлайнів у ньому"] },
      { sel: "my-filters", title: "Фільтр і сортування", text: "Статус і сортування запам'ятовуються в цьому браузері.", points: ["Усі, Беру участь, Збережено, Завершено, Пропустив — фільтр за вашим статусом; число — скільки акцій", "Завершились — дедлайн минув або акції вже немає в стрічці", "Пошук — з'являється, коли збережено понад 5 акцій", "Біржа — лише одна біржа", "Сортування — «Скоро дедлайн», «Нещодавно збережені», «Більше заробив», «За біржею»"] },
      { sel: "my-row", title: "Рядок акції", text: "Назва веде на сторінку акції, під нею — біржа і скільки лишилось; менше 2 днів — «дедлайн скоро».", points: ["Статус — «Збережено», «Беру участь», «Завершено» або «Пропустив»", "Заробив, $ — скільки отримали; сума піде в «Усього заробили»", "Нотатка — що завгодно для себе: суму депозиту, дату виплати", "✕ — прибрати акцію зі списку"] },
    ],
    en: [
      { title: "My promos", text: "Your own list: promos you saved with the ★, with your status, earnings and notes. Everything is stored in this browser only — no sign-up needed, but the list won’t be on another device or after clearing the browser." },
      { sel: "my-empty", title: "Empty for now", text: "To add a promo here, tap ★ on its card in the feed or on its page. The star in the menu shows how many are saved. Then this page tracks what you joined, what you earned and when the deadlines are." },
      { sel: "my-stats", title: "Totals", text: "Four tiles above the list:", points: ["Total earned — the sum of the “Earned, $” fields of all saved promos", "Joined · active — how many promos have the “Joined” status", "Export CSV — download the list as a spreadsheet (Excel, Google Sheets)", "Deadlines to calendar (.ics) — a calendar file with a reminder a day before each end; the number is how many deadlines it holds"] },
      { sel: "my-filters", title: "Filter and sort", text: "The status filter and the sort are remembered in this browser.", points: ["All, Joined, Saved, Done, Skipped — filter by your status; the number is how many", "Ended — the deadline has passed or the promo is no longer in the feed", "Search — appears once more than 5 promos are saved", "Exchange — one exchange only", "Sort — “Deadline soon”, “Recently saved”, “Most earned”, “By exchange”"] },
      { sel: "my-row", title: "A promo row", text: "The title opens the promo’s page; below it — the exchange and time left; under 2 days — “deadline soon”.", points: ["Status — “Saved”, “Joined”, “Done” or “Skipped”", "Earned, $ — what you received; it adds to “Total earned”", "Note — anything for yourself: the deposit, the payout date", "✕ — remove the promo from the list"] },
    ],
    ru: [
      { title: "Мои акции", text: "Ваш личный список: акции, которые вы сохранили звёздочкой ★, с вашим статусом участия, заработком и заметками. Всё хранится только в этом браузере — регистрация не нужна, но на другом устройстве или после очистки браузера списка не будет." },
      { sel: "my-empty", title: "Пока пусто", text: "Чтобы акция появилась здесь, нажмите ★ на её карточке в ленте или на странице акции. Сколько сохранено, видно на звёздочке в меню. Дальше здесь можно вести учёт: в чём участвуете, сколько заработали и когда дедлайн." },
      { sel: "my-stats", title: "Итоги", text: "Четыре плитки над списком:", points: ["Всего заработали — сумма из полей «Заработал, $» всех сохранённых акций", "Участвую · активных — сколько акций со статусом «Участвую»", "Экспорт CSV — скачать список как таблицу (Excel, Google Таблицы)", "Дедлайны в календарь (.ics) — файл для календаря с напоминанием за день до конца; число — сколько дедлайнов в нём"] },
      { sel: "my-filters", title: "Фильтр и сортировка", text: "Статус и сортировка запоминаются в этом браузере.", points: ["Все, Участвую, Сохранено, Завершено, Пропустил — фильтр по вашему статусу; число — сколько акций", "Завершились — дедлайн прошёл или акции уже нет в ленте", "Поиск — появляется, когда сохранено больше 5 акций", "Биржа — только одна биржа", "Сортировка — «Скоро дедлайн», «Недавно сохранённые», «Больше заработал», «По бирже»"] },
      { sel: "my-row", title: "Строка акции", text: "Название ведёт на страницу акции, под ним — биржа и сколько осталось; меньше 2 дней — «дедлайн скоро».", points: ["Статус — «Сохранено», «Участвую», «Завершено» или «Пропустил»", "Заработал, $ — сколько получили; сумма пойдёт во «Всего заработали»", "Заметка — что угодно для себя: сумму депозита, дату выплаты", "✕ — убрать акцию из списка"] },
    ],
  },
};
