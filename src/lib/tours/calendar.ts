import type { Tour } from "./types";

/** /calendar/: promo and Launchpool starts / ends for the next 45 days (components/CalendarBoard.tsx). */
export const CALENDAR_TOUR: Tour = {
  id: "calendar",
  name: { uk: "Календар акцій", en: "Promo calendar", ru: "Календарь акций" },
  steps: {
    uk: [
      { title: "Для чого календар", text: "Тут по днях зібрано, що стартує і що закінчується найближчі 45 днів: акції бірж і пули Launchpool. Зручно, щоб не пропустити старт підписки чи останній день для виконання умов." },
      { sel: "calendar-tabs", title: "Три календарі", text: "Перемикайте, що саме показати.", points: ["Акції — старти й завершення акцій і пулів", "Розлоки токенів — коли на ринок виходять заблоковані монети", "Токен-сейли — продажі нових токенів", "Позначка поруч — коли оновились дані: зелена — свіжі, жовта — давно не оновлювались"] },
      { sel: "calendar-utc", title: "Час — за UTC", text: "Усі години на сторінці вказано за UTC. У Києві взимку це +2 години, улітку +3: подія о 12:00 UTC взимку — це 14:00 за Києвом." },
      { sel: "calendar-day", title: "Дні", text: "Події згруповано по днях: «Сьогодні», «Завтра», далі дати. Заголовок дня прилипає вгорі екрана, поки гортаєте його події." },
      { sel: "calendar-row", title: "Подія", text: "Один рядок — одна подія.", points: ["Час — коли саме (UTC)", "Старт (синім) — акція чи пул відкривається, можна долучатися", "Кінець (жовтим) — останній момент участі, після нього умови вже не зарахують", "Назва — натисніть, щоб відкрити умови на PromoRadar (для Launchpool — сторінку пулів)"] },
      { sel: "calendar-add", title: "Додати в календар", text: "Кнопка з календариком додає подію у ваш календар.", points: ["Google Calendar — відкриє готову подію в Google", "iPhone / Outlook (.ics) — завантажить файл для Календаря iPhone чи Outlook, з нагадуванням за 2 години", "В описі події — посилання на умови на PromoRadar і на сторінку біржі"] },
      { sel: "calendar-more", title: "Більше днів", text: "Спочатку видно 7 днів із подіями. «Показати ще 7 днів» відкриває наступні — до 45 днів уперед." },
      { title: "Порада", text: "Додайте в календар «Кінець» акцій, у яких берете участь, — так ви не пропустите останній день, щоб наторгувати обсяг чи виконати завдання." },
    ],
    en: [
      { title: "What the calendar is for", text: "Everything that starts or ends in the next 45 days, day by day: exchange promos and Launchpool pools. Handy so you don’t miss a subscription start or the last day to meet the terms." },
      { sel: "calendar-tabs", title: "Three calendars", text: "Switch what to show.", points: ["Promos — starts and ends of promos and pools", "Token unlocks — when locked coins hit the market", "Token sales — sales of new tokens", "The tag next to them — when the data was updated: green is fresh, amber is stale"] },
      { sel: "calendar-utc", title: "Times are UTC", text: "Every time on this page is UTC. Convert to your own time zone: for example, 12:00 UTC is 14:00 in Kyiv in winter and 15:00 in summer." },
      { sel: "calendar-day", title: "Days", text: "Events are grouped by day: “Today”, “Tomorrow”, then dates. The day heading sticks to the top while you scroll its events." },
      { sel: "calendar-row", title: "An event", text: "One row, one event.", points: ["Time — exactly when (UTC)", "Starts (blue) — the promo or pool opens, you can join", "Ends (amber) — the last moment to take part; after it nothing counts", "Title — tap to open the terms on PromoRadar (for Launchpool, the pools page)"] },
      { sel: "calendar-add", title: "Add to calendar", text: "The calendar button adds the event to your own calendar.", points: ["Google Calendar — opens a ready event in Google", "iPhone / Outlook (.ics) — downloads a file for iPhone Calendar or Outlook, with a reminder 2 hours ahead", "The event description links to the terms on PromoRadar and to the exchange page"] },
      { sel: "calendar-more", title: "More days", text: "The first 7 days with events are shown. “Show 7 more days” opens the next ones — up to 45 days ahead." },
      { title: "Tip", text: "Add the “Ends” of the promos you take part in — then you won’t miss the last day to trade the volume or finish the tasks." },
    ],
    ru: [
      { title: "Для чего календарь", text: "Здесь по дням собрано, что стартует и что заканчивается в ближайшие 45 дней: акции бирж и пулы Launchpool. Удобно, чтобы не пропустить старт подписки или последний день для выполнения условий." },
      { sel: "calendar-tabs", title: "Три календаря", text: "Переключайте, что именно показать.", points: ["Акции — старты и завершения акций и пулов", "Разлоки токенов — когда на рынок выходят заблокированные монеты", "Токен-сейлы — продажи новых токенов", "Пометка рядом — когда обновились данные: зелёная — свежие, жёлтая — давно не обновлялись"] },
      { sel: "calendar-utc", title: "Время — по UTC", text: "Всё время на странице указано по UTC. В Киеве зимой это +2 часа, летом +3: событие в 12:00 UTC зимой — это 14:00 по Киеву." },
      { sel: "calendar-day", title: "Дни", text: "События сгруппированы по дням: «Сегодня», «Завтра», дальше даты. Заголовок дня прилипает вверху экрана, пока листаете его события." },
      { sel: "calendar-row", title: "Событие", text: "Одна строка — одно событие.", points: ["Время — когда именно (UTC)", "Старт (синим) — акция или пул открывается, можно участвовать", "Конец (жёлтым) — последний момент участия, после него условия уже не засчитают", "Название — нажмите, чтобы открыть условия на PromoRadar (для Launchpool — страницу пулов)"] },
      { sel: "calendar-add", title: "Добавить в календарь", text: "Кнопка с календариком добавляет событие в ваш календарь.", points: ["Google Calendar — откроет готовое событие в Google", "iPhone / Outlook (.ics) — скачает файл для Календаря iPhone или Outlook, с напоминанием за 2 часа", "В описании события — ссылки на условия на PromoRadar и на страницу биржи"] },
      { sel: "calendar-more", title: "Больше дней", text: "Сначала видно 7 дней с событиями. «Показать ещё 7 дней» открывает следующие — до 45 дней вперёд." },
      { title: "Совет", text: "Добавьте в календарь «Конец» акций, в которых участвуете, — так вы не пропустите последний день, чтобы наторговать объём или выполнить задания." },
    ],
  },
};
