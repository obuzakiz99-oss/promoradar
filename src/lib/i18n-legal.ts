import type { Locale } from "./i18n";

export type LegalSlug = "about" | "privacy" | "terms" | "api";
type Doc = { title: string; sub: string; blocks: Array<[string, string]> };

export const LEGAL_NAV: Record<Locale, Array<[LegalSlug, string]>> = {
  uk: [["about", "Про нас"], ["privacy", "Конфіденційність"], ["terms", "Умови використання"], ["api", "API"]],
  en: [["about", "About"], ["privacy", "Privacy"], ["terms", "Terms of use"], ["api", "API"]],
  ru: [["about", "О нас"], ["privacy", "Конфиденциальность"], ["terms", "Условия использования"], ["api", "API"]],
};

const ISSUES = "https://github.com/obuzakiz99-oss/promoradar/issues";

export const LEGAL: Record<Locale, Record<Exclude<LegalSlug, "api">, Doc>> = {
  uk: {
    about: { title: "Про PromoRadar", sub: "Агрегатор промоакцій криптобірж і DeFi-протоколів: Launchpool, Earn, airdrop, змагання, бонуси — в одному місці.", blocks: [
      ["Що ми робимо", "Кожні 30 хвилин автоматично збираємо акції з офіційних джерел бірж і протоколів: їхніх API, оголошень, офіційних Telegram-каналів і блогів, а також відкриті дані DefiLlama. Рахуємо APR, прибуток, ризики і показуємо все в одному форматі."],
      ["Незалежність", "Ми не є біржею і не зберігаємо ваші кошти. Частина посилань — реферальні: якщо ви зареєструєтеся за ними, біржа може заплатити нам комісію. На умови для вас і на порядок акцій у списках це не впливає."],
      ["Точність", "Дані беруться автоматично і можуть відставати від біржі на кілька хвилин або містити помилки джерела. Перед участю завжди перевіряйте умови на сторінці організатора — посилання є біля кожної акції."],
      ["Зв'язок", `Помилки, пропозиції, нові джерела акцій — пишіть через GitHub: ${ISSUES}`],
    ] },
    privacy: { title: "Конфіденційність", sub: "Коротко: ми не збираємо ваших персональних даних і не маємо акаунтів.", blocks: [
      ["Які дані ми зберігаємо", "Жодних на наших серверах. Збережені акції (★), ваш трекер, вибрана країна і мова зберігаються лише у вашому браузері (localStorage) і нікуди не передаються. Їх можна видалити, очистивши дані сайту в браузері."],
      ["Хостинг", "Сайт розміщено на GitHub Pages. GitHub як хостинг може технічно обробляти IP-адреси відвідувачів для безпеки й роботи сервісу — див. GitHub Privacy Statement."],
      ["Файли cookie та аналітика", "Зараз ми не використовуємо cookie, аналітику чи рекламні трекери. Якщо вони з'являться, ми оновимо цю сторінку і, де потрібно, попросимо вашої згоди."],
      ["Зовнішні сайти", "Посилання ведуть на сайти бірж і протоколів — у них свої правила конфіденційності."],
      ["Зв'язок", `Питання щодо даних: ${ISSUES}`],
    ] },
    terms: { title: "Умови використання", sub: "Користуючись сайтом, ви погоджуєтесь з цими умовами.", blocks: [
      ["Не фінансова порада", "Уся інформація має довідковий характер і не є інвестиційною, фінансовою чи податковою порадою. Рішення ви ухвалюєте самостійно."],
      ["Ризики", "Криптовалюти, DeFi і торгівля з плечем пов'язані з високим ризиком, аж до повної втрати коштів. APR — це оцінка біржі на момент оновлення, а не гарантований дохід."],
      ["Умови акцій", "Акції проводять біржі та протоколи; умови встановлюють і змінюють вони. Ми не відповідаємо за виплати, зміну правил, регіональні обмеження чи дії третіх сторін."],
      ["Реферальні посилання", "Деякі посилання є реферальними; ми можемо отримувати винагороду від бірж."],
      ["Обмеження відповідальності", "Сайт надається «як є». Ми не гарантуємо безперервну роботу, точність і повноту даних і не несемо відповідальності за збитки від їх використання."],
      ["Зміни", "Умови можуть оновлюватися; актуальна версія завжди на цій сторінці."],
    ] },
  },
  en: {
    about: { title: "About PromoRadar", sub: "An aggregator of crypto exchange and DeFi promos: Launchpools, Earn, airdrops, competitions, bonuses — in one place.", blocks: [
      ["What we do", "Every 30 minutes we automatically collect promos from official sources: exchange and protocol APIs, announcements, official Telegram channels and blogs, plus DefiLlama open data. We calculate APR, profit and risks and show everything in one format."],
      ["Independence", "We're not an exchange and never hold your funds. Some links are referral links: if you sign up through them, the exchange may pay us a commission. This doesn't change your terms or the order of promos in our lists."],
      ["Accuracy", "Data is collected automatically and can lag the exchange by a few minutes or contain source errors. Always check the terms on the organiser's page before joining — every promo links to it."],
      ["Contact", `Bugs, ideas, new promo sources — write via GitHub: ${ISSUES}`],
    ] },
    privacy: { title: "Privacy", sub: "In short: we collect no personal data and have no accounts.", blocks: [
      ["What we store", "Nothing on our servers. Saved promos (★), your tracker, chosen country and language live only in your browser (localStorage) and are never sent anywhere. Clear the site's data in your browser to remove them."],
      ["Hosting", "The site is hosted on GitHub Pages. As the host, GitHub may technically process visitors' IP addresses for security and operation — see the GitHub Privacy Statement."],
      ["Cookies and analytics", "We currently use no cookies, analytics or ad trackers. If that changes we'll update this page and ask for consent where required."],
      ["External sites", "Links lead to exchange and protocol sites, which have their own privacy policies."],
      ["Contact", `Data questions: ${ISSUES}`],
    ] },
    terms: { title: "Terms of use", sub: "By using the site you agree to these terms.", blocks: [
      ["Not financial advice", "All information is for reference only and is not investment, financial or tax advice. You make your own decisions."],
      ["Risks", "Crypto, DeFi and leveraged trading carry high risk, up to a total loss of funds. APR is the exchange's estimate at refresh time, not guaranteed income."],
      ["Promo terms", "Promos are run by exchanges and protocols, which set and change the terms. We're not responsible for payouts, rule changes, regional restrictions or third-party actions."],
      ["Referral links", "Some links are referral links; we may be rewarded by exchanges."],
      ["Limitation of liability", "The site is provided 'as is'. We don't guarantee uninterrupted operation or the accuracy and completeness of data, and aren't liable for losses from using it."],
      ["Changes", "These terms may be updated; the current version is always on this page."],
    ] },
  },
  ru: {
    about: { title: "О PromoRadar", sub: "Агрегатор промоакций криптобирж и DeFi-протоколов: Launchpool, Earn, airdrop, соревнования, бонусы — в одном месте.", blocks: [
      ["Что мы делаем", "Каждые 30 минут автоматически собираем акции из официальных источников бирж и протоколов: их API, анонсов, официальных Telegram-каналов и блогов, а также открытые данные DefiLlama. Считаем APR, прибыль, риски и показываем всё в одном формате."],
      ["Независимость", "Мы не биржа и не храним ваши средства. Часть ссылок — реферальные: если вы зарегистрируетесь по ним, биржа может заплатить нам комиссию. На условия для вас и порядок акций в списках это не влияет."],
      ["Точность", "Данные собираются автоматически и могут отставать от биржи на несколько минут или содержать ошибки источника. Перед участием всегда проверяйте условия на странице организатора — ссылка есть у каждой акции."],
      ["Связь", `Ошибки, предложения, новые источники акций — пишите через GitHub: ${ISSUES}`],
    ] },
    privacy: { title: "Конфиденциальность", sub: "Коротко: мы не собираем ваших персональных данных и не имеем аккаунтов.", blocks: [
      ["Какие данные мы храним", "Никаких на наших серверах. Сохранённые акции (★), ваш трекер, выбранная страна и язык хранятся только в вашем браузере (localStorage) и никуда не передаются. Удалить их можно, очистив данные сайта в браузере."],
      ["Хостинг", "Сайт размещён на GitHub Pages. GitHub как хостинг может технически обрабатывать IP-адреса посетителей для безопасности и работы сервиса — см. GitHub Privacy Statement."],
      ["Cookie и аналитика", "Сейчас мы не используем cookie, аналитику или рекламные трекеры. Если они появятся, мы обновим эту страницу и, где нужно, попросим вашего согласия."],
      ["Внешние сайты", "Ссылки ведут на сайты бирж и протоколов — у них свои правила конфиденциальности."],
      ["Связь", `Вопросы о данных: ${ISSUES}`],
    ] },
    terms: { title: "Условия использования", sub: "Пользуясь сайтом, вы соглашаетесь с этими условиями.", blocks: [
      ["Не финансовый совет", "Вся информация носит справочный характер и не является инвестиционным, финансовым или налоговым советом. Решения вы принимаете самостоятельно."],
      ["Риски", "Криптовалюты, DeFi и торговля с плечом связаны с высоким риском, вплоть до полной потери средств. APR — это оценка биржи на момент обновления, а не гарантированный доход."],
      ["Условия акций", "Акции проводят биржи и протоколы; условия устанавливают и меняют они. Мы не отвечаем за выплаты, изменение правил, региональные ограничения или действия третьих лиц."],
      ["Реферальные ссылки", "Некоторые ссылки реферальные; мы можем получать вознаграждение от бирж."],
      ["Ограничение ответственности", "Сайт предоставляется «как есть». Мы не гарантируем бесперебойную работу, точность и полноту данных и не несём ответственности за убытки от их использования."],
      ["Изменения", "Условия могут обновляться; актуальная версия всегда на этой странице."],
    ] },
  },
};

export const API_DOC: Record<Locale, { title: string; sub: string; note: string; cols: [string, string] }> = {
  uk: { title: "Відкрите API", sub: "Усі дані сайту доступні як JSON — безкоштовно, без ключа. Оновлюються кожні 30 хвилин.", note: "Будь ласка, вказуйте PromoRadar як джерело і не запитуйте частіше, ніж раз на 5 хвилин.", cols: ["Адреса", "Що всередині"] },
  en: { title: "Open API", sub: "All site data is available as JSON — free, no key. Refreshed every 30 minutes.", note: "Please credit PromoRadar as the source and don't poll more often than every 5 minutes.", cols: ["Endpoint", "Contents"] },
  ru: { title: "Открытое API", sub: "Все данные сайта доступны как JSON — бесплатно, без ключа. Обновляются каждые 30 минут.", note: "Пожалуйста, указывайте PromoRadar как источник и не запрашивайте чаще раза в 5 минут.", cols: ["Адрес", "Что внутри"] },
};

export const API_ENDPOINTS: Array<{ path: string; desc: Record<Locale, string> }> = [
  { path: "/api/promos.json", desc: { uk: "Усі акції: біржа, тип, винагорода, дати, посилання", en: "All promos: venue, type, reward, dates, link", ru: "Все акции: биржа, тип, награда, даты, ссылка" } },
  { path: "/api/pools.json", desc: { uk: "Launchpool: пули, APR, ліміти, ціни, хедж-дані", en: "Launchpools: pools, APR, caps, prices, hedge data", ru: "Launchpool: пулы, APR, лимиты, цены, хедж-данные" } },
  { path: "/api/earn.json", desc: { uk: "Ставки Earn бірж по монетах", en: "Exchange Earn rates by coin", ru: "Ставки Earn бирж по монетам" } },
  { path: "/api/dex.json", desc: { uk: "Пули DEX і DeFi (DefiLlama): TVL, APY, тип", en: "DEX & DeFi pools (DefiLlama): TVL, APY, type", ru: "Пулы DEX и DeFi (DefiLlama): TVL, APY, тип" } },
  { path: "/api/funding.json", desc: { uk: "Фандинг ф'ючерсів на 5 біржах, річний, і різниця між ними", en: "Perp funding on 5 exchanges, annualised, and the spread", ru: "Фандинг фьючерсов на 5 биржах, годовой, и разница между ними" } },
  { path: "/api/fixed.json", desc: { uk: "Фіксована дохідність Pendle PT на стейблкоїнах", en: "Pendle PT fixed yields on stablecoins", ru: "Фиксированная доходность Pendle PT на стейблкоинах" } },
  { path: "/rss-uk.xml", desc: { uk: "RSS нових акцій (також -en, -ru)", en: "RSS of new promos (also -en, -ru)", ru: "RSS новых акций (также -en, -ru)" } },
];
