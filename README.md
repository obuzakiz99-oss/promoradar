# PromoRadar

Агрегатор промоакцій криптобірж: Airdrop / Launchpool, торгові змагання, бонуси за депозит, Earn, лістинг-кампанії, реферальні акції.
Мови: українська, англійська, російська (`/uk`, `/en`, `/ru`; `/` перенаправляє за мовою браузера).

## Запуск локально
```bash
npm install
npm run dev          # http://localhost:3000
npm run build && npm start
```

## Як працюють дані
Лише офіційні/публічні джерела, чесні запити (без обходу захисту від ботів).

| Тип | Джерела | Файл |
|---|---|---|
| API бірж | Binance, Bybit, OKX, Bitget, KuCoin, Gate (сторінка), XT · Bitunix · WEEX (Zendesk), Kraken (блог) | `src/lib/sources/cex.ts` |
| Офіційні Telegram-канали (`t.me/s/…`) | Bitget, MEXC, HTX, BingX, WhiteBIT, CoinEx, Bitrue, Hyperliquid, PancakeSwap, Raydium, GMX, Lighter, Pendle | `src/lib/sources/telegram.ts` |
| API DEX | Lighter | `src/lib/sources/defi.ts` |
| Блоги DEX (Medium) | Aster, Meteora, Pendle, Bluefin, edgeX, Aerodrome | `src/lib/sources/defi.ts` |
| Відкриті дані | DefiLlama Yields — пули DEX/DeFi з бонусним APR (фарм ліквідності) | `src/lib/sources/defi.ts` |
| Airdrop-и | airdrops.io (актуальні кампанії) | `src/lib/sources/defi.ts` |

- `src/lib/parse.ts` — відсіює не-акції (техроботи, делістинги, ринкові новини…), визначає категорію і витягує призовий фонд.
- Однакова акція з двох джерел (API + Telegram) показується один раз.
- Сторінки й `/api/promos` оновлюються раз на 15 хв (ISR). Бази даних не потрібно.
- `/logo?u=…` — кешуючий проксі логотипів (тільки дозволені домени).
- Додати біржу: впишіть її в `CEX`/`DEX` і канал у `TELEGRAM` у `src/config/site.ts`.

## Що налаштувати (`src/config/site.ts`)
| Поле | Що вписати |
|---|---|
| `SITE.name`, `SITE.domain` | назва і домен |
| `SITE.telegram` | посилання на ваш Telegram-канал |
| `EXCHANGES.*.refUrl` | **ваші реферальні посилання** — кнопка «Взяти участь» вестиме на них |
| `SPONSORED` | платні закріплені акції (з позначкою «Реклама») |
| `PRO.checkoutUrl` | посилання на оплату підписки Pro |

## Деплой (Vercel)
1. Створіть репозиторій на GitHub і завантажте туди папку.
2. vercel.com → New Project → імпорт репозиторію → Deploy.
3. Settings → Functions → Region: **Frankfurt (fra1)** (Binance не відповідає на запити з США).
4. Settings → Domains → додайте свій домен.

## Далі (план)
- Gate, MEXC, HTX (потрібен скрапер сторінок — прямі API блокують запити).
- Telegram-бот: постить нові акції з `/api/promos`.
- Pro: оплата, миттєві сповіщення, оцінка прибутку.
- Сторінка кожної акції з перекладом умов на 3 мови.
