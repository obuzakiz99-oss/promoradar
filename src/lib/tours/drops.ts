import type { Tour } from "./types";

/** /drops/: exchange airdrops and giveaways grouped by type (app/[lang]/drops/page.tsx, lib/drops.ts). */
export const DROPS_TOUR: Tour = {
  id: "drops",
  name: { uk: "Аірдропи", en: "Airdrops", ru: "Аирдропы" },
  steps: {
    uk: [
      { title: "Що на цій сторінці", text: "Усі способи, якими біржі роздають токени, крім Launchpool і Earn. Акції розкладено за типом роздачі, і для кожного типу пояснено, як саме на ньому заробити і чим ризикуєте." },
      { sel: "drops-jump", title: "Швидкі переходи", text: "Кнопки ведуть до розділів сторінки, число — скільки там акцій. Порожні розділи не показуємо.", points: ["Стейблкоїни без вкладень — USDT/USDC за вікторини й завдання", "Можна забрати зараз — роздача вже йде, встигніть забрати", "Власникам монет — за утримання BNB, GT тощо", "Launchpad і гаманці — нові токени до лістингу", "За завдання, Learn & Earn — частка фонду за дії чи уроки", "Бали — поінти, які згодом обміняють на токен"] },
      { sel: "drops-head", title: "Заголовок розділу", text: "Назва типу роздачі, скільки зараз таких акцій і складність: «Просто» — підходить новачкам, «Середньо» — треба трохи розібратися, «Для досвідчених» — можна втратити більше, ніж заробити. Нижче — одне речення, що це за роздача." },
      { sel: "drops-list", title: "Акції розділу", text: "Один рядок — одна акція: біржа, назва і справа фонд нагород, якщо біржа його назвала. Натисніть рядок — відкриється сторінка з умовами, кроками й оцінкою, скільки реально можна отримати." },
      { sel: "drops-more", title: "Решта акцій", text: "Спочатку видно 8 акцій розділу. «Показати ще» розгортає решту, «Згорнути» ховає їх назад." },
      { sel: "drops-how", title: "Як заробити і ризик", text: "Покрокова інструкція саме для цього типу роздачі: що натиснути, яку умову виконати, коли продавати отримане. Внизу — «Ризик»: що може піти не так. На телефоні цей блок стоїть під списком акцій." },
      { title: "З чого почати", text: "Новачкам найпростіше почати зі «Стейблкоїни без вкладень» і «Learn & Earn»: гроші вкладати не треба. І ніколи не вводьте seed-фразу на сайтах «claim» — забирайте нагороди лише на офіційному сайті біржі." },
    ],
    en: [
      { title: "What is on this page", text: "Every way exchanges give tokens away besides Launchpool and Earn. Promos are grouped by type of giveaway, and each type explains exactly how to earn from it and what you risk." },
      { sel: "drops-jump", title: "Quick links", text: "The buttons jump to sections of the page; the number is how many promos are there. Empty sections are hidden.", points: ["Stablecoins with no deposit — USDT/USDC for quizzes and tasks", "Claim now — the payout is already on, claim in time", "Holder airdrops — for holding BNB, GT and the like", "Launchpads and wallets — new tokens before listing", "Tasks, Learn & Earn — a share of a pool for actions or lessons", "Points — points later swapped for a token"] },
      { sel: "drops-head", title: "Section heading", text: "The type of giveaway, how many such promos are live and the difficulty: “Easy” suits beginners, “Medium” needs a little understanding, “Advanced” means you can lose more than you earn. Below — one sentence on what this giveaway is." },
      { sel: "drops-list", title: "Promos in the section", text: "One row, one promo: the exchange, the title and, on the right, the reward pool if the exchange named it. Tap a row to open its page with the terms, steps and our estimate of what you can really get." },
      { sel: "drops-more", title: "The rest", text: "The first 8 promos of a section are shown. “Show more” opens the rest, “Show less” folds them back." },
      { sel: "drops-how", title: "How to earn and the risk", text: "A step-by-step guide for this exact type: what to press, which condition to meet, when to sell what you got. At the bottom — “Risk”: what can go wrong. On a phone this block comes after the list." },
      { title: "Where to start", text: "Beginners are best off with “Stablecoins with no deposit” and “Learn & Earn”: no money in. And never enter a seed phrase on “claim” sites — only claim rewards on the exchange’s official site." },
    ],
    ru: [
      { title: "Что на этой странице", text: "Все способы, которыми биржи раздают токены, кроме Launchpool и Earn. Акции разложены по типу раздачи, и для каждого типа объяснено, как именно на нём заработать и чем рискуете." },
      { sel: "drops-jump", title: "Быстрые переходы", text: "Кнопки ведут к разделам страницы, число — сколько там акций. Пустые разделы не показываем.", points: ["Стейблкоины без вложений — USDT/USDC за викторины и задания", "Можно забрать сейчас — раздача уже идёт, успейте забрать", "Держателям монет — за удержание BNB, GT и т. п.", "Launchpad и кошельки — новые токены до листинга", "За задания, Learn & Earn — доля фонда за действия или уроки", "Баллы — поинты, которые потом обменяют на токен"] },
      { sel: "drops-head", title: "Заголовок раздела", text: "Название типа раздачи, сколько сейчас таких акций и сложность: «Просто» — подходит новичкам, «Средне» — нужно немного разобраться, «Для опытных» — можно потерять больше, чем заработать. Ниже — одно предложение, что это за раздача." },
      { sel: "drops-list", title: "Акции раздела", text: "Одна строка — одна акция: биржа, название и справа фонд наград, если биржа его назвала. Нажмите строку — откроется страница с условиями, шагами и оценкой, сколько реально можно получить." },
      { sel: "drops-more", title: "Остальные акции", text: "Сначала видно 8 акций раздела. «Показать ещё» разворачивает остальные, «Свернуть» прячет их обратно." },
      { sel: "drops-how", title: "Как заработать и риск", text: "Пошаговая инструкция именно для этого типа раздачи: что нажать, какое условие выполнить, когда продавать полученное. Внизу — «Риск»: что может пойти не так. На телефоне этот блок стоит под списком акций." },
      { title: "С чего начать", text: "Новичкам проще всего начать со «Стейблкоины без вложений» и «Learn & Earn»: деньги вкладывать не нужно. И никогда не вводите seed-фразу на сайтах «claim» — забирайте награды только на официальном сайте биржи." },
    ],
  },
};
