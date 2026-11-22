import type { Tour } from "./types";

/** /learn/ — the beginner hub (components/LearnProgress.tsx LearnCards). The tour explains the section, not crypto. */
export const LEARN_TOUR: Tour = {
  id: "learn",
  name: { uk: "Новачкам", en: "Beginners", ru: "Новичкам" },
  steps: {
    uk: [
      { title: "Розділ «Новачкам»", text: "Тут — основи: як купити першу криптовалюту, як брати участь в акціях і як не потрапити до шахраїв. Розділи йдуть по порядку, від простого до складнішого; можна відкривати будь-який." },
      { sel: "learn-progress", title: "Ваш прогрес", text: "Скільки розділів ви вже пройшли. Розділ зараховується, коли ви його відкрили; «Старт з нуля» — коли позначили всі кроки, «Підібрати мені» — коли отримали результат. Прогрес зберігається в цьому браузері; коли пройдете все, тут з'явиться посилання до акцій." },
      { sel: "learn-next", title: "Наступний крок", text: "Картка з позначкою «Наступний крок» — те, що варто відкрити зараз. Пройдені картки стають блідішими й отримують «✓ Пройдено»." },
      { sel: "learn-cards", title: "Розділи", text: "Кожна картка — окрема сторінка; номер угорі справа — порядок.", points: ["Старт з нуля — від гривні до першого доходу, кроки можна позначати", "Підібрати мені — сума й досвід → 3 варіанти саме для вас", "Як взяти участь — Launchpool, Earn, бонуси й змагання покроково", "Типи нагород — гроші, ваучер чи бонус", "Безпека — 10 правил проти шахраїв", "Словник — APR, стейк, KYC простою мовою"] },
      { sel: "learn-check", title: "«Це справжня біржа?»", text: "Вставте посилання з чату, реклами чи листа — перевіримо, чи це офіційний сайт або канал біржі, чи підробка. Робіть це щоразу, перш ніж вводити пароль або переказувати гроші." },
      { title: "З чого почати", text: "Ніколи не купували криптовалюту — відкрийте «Старт з нуля». Уже маєте акаунт на біржі — «Підібрати мені» одразу покаже, що взяти." },
    ],
    en: [
      { title: "The “Beginners” section", text: "The basics: how to buy your first crypto, how to join promos and how not to fall for scammers. The pages go in order, from simple to harder; you can open any of them." },
      { sel: "learn-progress", title: "Your progress", text: "How many pages you have done. A page counts once opened; “Start from zero” once all its steps are ticked, “Pick for me” once it gives a result. Progress is kept in this browser; when everything is done, a link to the promos appears here." },
      { sel: "learn-next", title: "Next step", text: "The card tagged “Next step” is the one to open now. Done cards fade and get “✓ Done”." },
      { sel: "learn-cards", title: "The pages", text: "Each card is its own page; the number top right is the order.", points: ["Start from zero — from your bank card to your first yield, with steps to tick", "Pick for me — amount and experience → 3 options just for you", "How to join — Launchpool, Earn, bonuses and competitions step by step", "Reward types — cash, voucher or bonus", "Safety — 10 rules against scammers", "Glossary — APR, stake, KYC in plain words"] },
      { sel: "learn-check", title: "“Is it the real exchange?”", text: "Paste a link from a chat, an ad or an email — we check whether it is the exchange’s official site or channel, or a fake. Do it every time before typing a password or sending money." },
      { title: "Where to start", text: "Never bought crypto — open “Start from zero”. Already have an exchange account — “Pick for me” shows what to take right away." },
    ],
    ru: [
      { title: "Раздел «Новичкам»", text: "Здесь — основы: как купить первую криптовалюту, как участвовать в акциях и как не попасться мошенникам. Разделы идут по порядку, от простого к сложному; можно открывать любой." },
      { sel: "learn-progress", title: "Ваш прогресс", text: "Сколько разделов вы уже прошли. Раздел засчитывается, когда вы его открыли; «Старт с нуля» — когда отмечены все шаги, «Подобрать мне» — когда получен результат. Прогресс хранится в этом браузере; когда пройдёте всё, здесь появится ссылка на акции." },
      { sel: "learn-next", title: "Следующий шаг", text: "Карточка с пометкой «Следующий шаг» — то, что стоит открыть сейчас. Пройденные карточки становятся бледнее и получают «✓ Пройдено»." },
      { sel: "learn-cards", title: "Разделы", text: "Каждая карточка — отдельная страница; номер вверху справа — порядок.", points: ["Старт с нуля — от обычных денег до первого дохода, шаги можно отмечать", "Подобрать мне — сумма и опыт → 3 варианта именно для вас", "Как участвовать — Launchpool, Earn, бонусы и соревнования пошагово", "Типы наград — деньги, ваучер или бонус", "Безопасность — 10 правил против мошенников", "Словарь — APR, стейк, KYC простым языком"] },
      { sel: "learn-check", title: "«Это настоящая биржа?»", text: "Вставьте ссылку из чата, рекламы или письма — проверим, официальный ли это сайт или канал биржи, или подделка. Делайте это каждый раз, прежде чем вводить пароль или переводить деньги." },
      { title: "С чего начать", text: "Никогда не покупали криптовалюту — откройте «Старт с нуля». Уже есть аккаунт на бирже — «Подобрать мне» сразу покажет, что взять." },
    ],
  },
};
