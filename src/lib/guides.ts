import type { Locale } from "./i18n";
import { venueOf } from "@/config/site";
import { autoGuides } from "./guides-auto";

/**
 * Exchange-specific step-by-step guides. Facts come from the exchange's own page / FAQ (source + date shown on the page);
 * screenshots are of PUBLIC pages only (public/guides/*), steps behind the login are described in text.
 */
export interface GuideStep { h: string; b: string; img?: string; alt?: string }
export interface GuideSection { title: string; url: string; level: "easy" | "medium" | "hard"; steps: GuideStep[] }
export interface Guide { id: string; venue: string; url: string; checked: string; title: string; sub: string; level: "easy" | "medium" | "hard"; steps: GuideStep[]; sections?: GuideSection[]; facts: string[]; source: string }

const bitget: Record<Locale, Guide> = {
  uk: {
    id: "bitget-poolx", venue: "bitget", url: "https://www.bitget.com/launchhub/poolx", checked: "2026-11-06", level: "medium",
    title: "PoolX на Bitget — покроково", sub: "Блокуєте монету на Bitget — щогодини отримуєте новий токен. Розблокувати можна будь-коли.",
    steps: [
      { h: "Зареєструйтеся і пройдіть верифікацію", b: "За правилами PoolX винагороду отримують лише користувачі, які пройшли перевірку особи (паспорт + селфі)." },
      { h: "Відкрийте сторінку PoolX", b: "Меню Earn → PoolX або кнопка «Стейкати» на нашому сайті. На вкладці «Ongoing» — пули, що тривають зараз: яку монету блокувати, що отримаєте, APR і скільки залишилось часу.", img: "/guides/bitget-poolx-1.jpg", alt: "Сторінка Bitget PoolX зі списком пулів" },
      { h: "Купіть монету пулу", b: "Наприклад, у пулі на скриншоті блокують ETH, щоб отримати BGB. ETH можна купити в розділі «Купити крипту» або обміняти з USDT через Convert. Пам'ятайте: ціна ETH змінюється." },
      { h: "Натисніть «Lock» і введіть суму", b: "Кнопка праворуч від пулу. У вікні видно ліміт на один акаунт — понад нього винагорода не нараховується.", img: "/guides/bitget-poolx-2.jpg", alt: "Картка пулу з кнопкою Lock" },
      { h: "Отримуйте винагороду щогодини", b: "Якщо ви заблокували монети протягом години H, суму врахують у годину H+1, а винагорода прийде в годину H+2." },
      { h: "Розблокуйте, коли захочете", b: "За FAQ Bitget монети можна розблокувати в будь-який момент. Отримані токени можна продати за USDT — нові токени часто дешевшають." },
    ],
    facts: [
      "Бонус за довгострокове зберігання: Bitget бере найменший щоденний залишок монети за останні 15 днів і додає його (× множник) до вашої суми блокування — винагорода може зрости аж удвічі.",
      "Торгові бонуси, позикові кошти та ще не зараховані депозити в бонус не входять.",
      "Автоматизована чи повторна участь ботами — дискваліфікація.",
    ],
    source: "Джерело: сторінка і FAQ Bitget PoolX",
  },
  en: {
    id: "bitget-poolx", venue: "bitget", url: "https://www.bitget.com/launchhub/poolx", checked: "2026-11-06", level: "medium",
    title: "PoolX on Bitget — step by step", sub: "Lock a coin on Bitget and receive a new token every hour. You can unlock any time.",
    steps: [
      { h: "Sign up and verify your identity", b: "Per PoolX rules, only identity-verified users receive rewards (passport + selfie)." },
      { h: "Open the PoolX page", b: "Earn → PoolX, or the 'Stake' button on our site. The 'Ongoing' tab lists running pools: which coin to lock, what you get, APR and time left.", img: "/guides/bitget-poolx-1.jpg", alt: "Bitget PoolX page with pools" },
      { h: "Buy the pool's coin", b: "In the pool on the screenshot you lock ETH to get BGB. Buy ETH via 'Buy crypto' or swap from USDT with Convert. Remember: ETH's price moves." },
      { h: "Press 'Lock' and enter an amount", b: "The button is on the right of the pool. The window shows the per-account cap — nothing is paid above it.", img: "/guides/bitget-poolx-2.jpg", alt: "Pool card with the Lock button" },
      { h: "Get rewards every hour", b: "If you lock during hour H, your amount is counted at H+1 and rewards arrive at H+2." },
      { h: "Unlock whenever you want", b: "Per Bitget's FAQ you can unlock at any time. Sell the received tokens for USDT — new tokens often drop." },
    ],
    facts: [
      "Long-term holding boost: Bitget takes your lowest daily balance of the coin over the last 15 days and adds it (× multiplier) to your locked amount — up to double the reward.",
      "Trading bonuses, borrowed funds and uncredited deposits don't count toward the boost.",
      "Automated or repeated participation by bots leads to disqualification.",
    ],
    source: "Source: Bitget PoolX page and FAQ",
  },
  ru: {
    id: "bitget-poolx", venue: "bitget", url: "https://www.bitget.com/launchhub/poolx", checked: "2026-11-06", level: "medium",
    title: "PoolX на Bitget — пошагово", sub: "Блокируете монету на Bitget — каждый час получаете новый токен. Разблокировать можно в любой момент.",
    steps: [
      { h: "Зарегистрируйтесь и пройдите верификацию", b: "По правилам PoolX награду получают только пользователи, прошедшие проверку личности (паспорт + селфи)." },
      { h: "Откройте страницу PoolX", b: "Меню Earn → PoolX или кнопка «Стейкать» на нашем сайте. Во вкладке «Ongoing» — текущие пулы: какую монету блокировать, что получите, APR и сколько осталось времени.", img: "/guides/bitget-poolx-1.jpg", alt: "Страница Bitget PoolX со списком пулов" },
      { h: "Купите монету пула", b: "Например, в пуле на скриншоте блокируют ETH, чтобы получить BGB. ETH можно купить в разделе «Купить крипту» или обменять из USDT через Convert. Помните: цена ETH меняется." },
      { h: "Нажмите «Lock» и введите сумму", b: "Кнопка справа от пула. В окне виден лимит на один аккаунт — сверх него награда не начисляется.", img: "/guides/bitget-poolx-2.jpg", alt: "Карточка пула с кнопкой Lock" },
      { h: "Получайте награду каждый час", b: "Если вы заблокировали монеты в течение часа H, сумму учтут в час H+1, а награда придёт в час H+2." },
      { h: "Разблокируйте, когда захотите", b: "По FAQ Bitget монеты можно разблокировать в любой момент. Полученные токены можно продать за USDT — новые токены часто дешевеют." },
    ],
    facts: [
      "Бонус за долгосрочное хранение: Bitget берёт наименьший дневной остаток монеты за последние 15 дней и добавляет его (× множитель) к вашей сумме блокировки — награда может вырасти до двух раз.",
      "Торговые бонусы, заёмные средства и ещё не зачисленные депозиты в бонус не входят.",
      "Автоматизированное или повторное участие ботами — дисквалификация.",
    ],
    source: "Источник: страница и FAQ Bitget PoolX",
  },
};

const all = (l: Locale) => [bitget[l], ...autoGuides(l, (id) => venueOf(id).name)];
/** Hand-made guides (with screenshots) first, then the template ones for every other exchange and DEX. */
export const GUIDES: Record<Locale, Guide[]> = { uk: all("uk"), en: all("en"), ru: all("ru") };
export const GUIDE_IDS = GUIDES.en.map((g) => g.id);
