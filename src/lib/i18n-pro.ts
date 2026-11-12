import type { Locale } from "./i18n";

/** Strings for the advanced sections: Funding Radar, Fixed yield (Pendle), Insights. */
export const PROX: Record<Locale, {
  fundTitle: string; fundSub: string; fundHow: string; coin: string; spread: string; shortOn: string; longOn: string; vol: string; minVol: string; search: string; all: string; perYear: string; every: string; note: string; down: string; calm: string;
  fixTitle: string; fixSub: string; fixCols: [string, string, string, string, string]; fixNote: string; fixGuide: string; days: string;
  insTitle: string; insSub: string; listTitle: string; listSub: string; listCols: [string, string, string, string, string, string]; median: string; decayTitle: string; decaySub: string; decayCols: [string, string, string, string]; noData: string; method: string;
  sinceTitle: string; sinceNew: (n: number) => string; sinceNone: string;
}> = {
  uk: {
    fundTitle: "Funding Radar", fundSub: "Фандинг безстрокових ф'ючерсів на 5 біржах у % річних і різниця між ними. Шорт там, де фандинг найвищий, і лонг там, де найнижчий, — заробіток на різниці без ризику ціни (carry).",
    fundHow: "Додатний фандинг = лонги платять шортам. Ставка змінюється кожен період нарахування — це поточне значення, а не гарантія.",
    coin: "Монета", spread: "Різниця", shortOn: "Шорт", longOn: "Лонг", vol: "Обсяг 24г", minVol: "Мін. обсяг", search: "Пошук монети…", all: "Усі", perYear: "/рік", every: "кожні {h} год", note: "Комісії входу/виходу на двох біржах (~0,2–0,4%) і ризик ліквідації однієї з ніг не враховані. Різні інтервали нарахування (1/4/8 год) уже приведені до річних.", down: "біржа недоступна", calm: "Без екстремальних (>300%)",
    fixTitle: "Фіксована дохідність (Pendle)", fixSub: "PT-токени Pendle на стейблкоїнах: купуєте зі знижкою — до дати погашення отримуєте відому наперед дохідність.", fixCols: ["Ринок", "Мережа", "Фікс. APY", "Погашення", "Ліквідність"], fixNote: "Фіксується лише дохідність. Якщо сам актив (особливо синтетичний стейблкоїн) втратить прив'язку — PT теж подешевшає. Продаж до погашення — за ринковою ціною.", fixGuide: "Як правильно вкласти — покрокова методичка", days: "дн.",
    insTitle: "Аналітика Launchpool", insSub: "Що відбувається з токенами після Launchpool і як змінюється APR — за нашими даними.",
    listTitle: "Токени після Launchpool", listSub: "Ціна в перший день торгів на Gate → через 7 і 30 днів і зараз. Відповідає на питання: продавати одразу чи тримати.", listCols: ["Токен", "Біржа", "Старт пулу", "+7 днів", "+30 днів", "Зараз"], median: "Медіана",
    decayTitle: "Як падає APR", decaySub: "Стартовий APR (оцінка біржі на старті) проти фінального — для завершених пулів Gate.", decayCols: ["Пул", "Стартовий APR", "Фінальний", "Фінал / старт"], noData: "Поки замало даних.", method: "Ціни — денні свічки Gate (закриття дня). Токени без пари на Gate пропущені.",
    sinceTitle: "З вашого останнього візиту", sinceNew: (n) => `${n} нових акцій — позначені «нове для вас»`, sinceNone: "Нових акцій з останнього візиту немає",
  },
  en: {
    fundTitle: "Funding Radar", fundSub: "Perpetual funding on 5 exchanges in % per year and the spread between them. Short where funding is highest and long where it's lowest — earning the difference without price risk (carry).",
    fundHow: "Positive funding = longs pay shorts. The rate changes every funding period — this is the current value, not a guarantee.",
    coin: "Coin", spread: "Spread", shortOn: "Short", longOn: "Long", vol: "24h volume", minVol: "Min volume", search: "Search coin…", all: "All", perYear: "/yr", every: "every {h}h", note: "Entry/exit fees on two exchanges (~0.2–0.4%) and liquidation risk on one leg aren't included. Different funding intervals (1/4/8h) are already annualised.", down: "exchange unavailable", calm: "Hide extremes (>300%)",
    fixTitle: "Fixed yield (Pendle)", fixSub: "Pendle PT tokens on stablecoins: buy at a discount and get a yield known in advance by maturity.", fixCols: ["Market", "Chain", "Fixed APY", "Maturity", "Liquidity"], fixNote: "Only the yield is fixed. If the asset itself (especially a synthetic stablecoin) depegs, PT falls too. Selling before maturity is at the market price.", fixGuide: "How to invest correctly — step-by-step guide", days: "d",
    insTitle: "Launchpool insights", insSub: "What happens to tokens after a Launchpool and how APR changes — from our data.",
    listTitle: "Tokens after a Launchpool", listSub: "Price on the first trading day on Gate → after 7 and 30 days and now. Answers: sell right away or hold?", listCols: ["Token", "Exchange", "Pool start", "+7 days", "+30 days", "Now"], median: "Median",
    decayTitle: "How APR falls", decaySub: "Starting APR (exchange estimate at launch) vs the final one — finished Gate pools.", decayCols: ["Pool", "Start APR", "Final", "Final / start"], noData: "Not enough data yet.", method: "Prices are Gate daily candles (close). Tokens without a Gate pair are skipped.",
    sinceTitle: "Since your last visit", sinceNew: (n) => `${n} new promos — marked "new for you"`, sinceNone: "No new promos since your last visit",
  },
  ru: {
    fundTitle: "Funding Radar", fundSub: "Фандинг бессрочных фьючерсов на 5 биржах в % годовых и разница между ними. Шорт там, где фандинг выше всего, и лонг там, где ниже, — заработок на разнице без риска цены (carry).",
    fundHow: "Положительный фандинг = лонги платят шортам. Ставка меняется каждый период начисления — это текущее значение, а не гарантия.",
    coin: "Монета", spread: "Разница", shortOn: "Шорт", longOn: "Лонг", vol: "Объём 24ч", minVol: "Мин. объём", search: "Поиск монеты…", all: "Все", perYear: "/год", every: "каждые {h} ч", note: "Комиссии входа/выхода на двух биржах (~0,2–0,4%) и риск ликвидации одной из ног не учтены. Разные интервалы начисления (1/4/8 ч) уже приведены к годовым.", down: "биржа недоступна", calm: "Без экстремальных (>300%)",
    fixTitle: "Фиксированная доходность (Pendle)", fixSub: "PT-токены Pendle на стейблкоинах: покупаете со скидкой — к дате погашения получаете известную заранее доходность.", fixCols: ["Рынок", "Сеть", "Фикс. APY", "Погашение", "Ликвидность"], fixNote: "Фиксируется только доходность. Если сам актив (особенно синтетический стейблкоин) потеряет привязку — PT тоже подешевеет. Продажа до погашения — по рыночной цене.", fixGuide: "Как правильно вложить — пошаговая методичка", days: "дн.",
    insTitle: "Аналитика Launchpool", insSub: "Что происходит с токенами после Launchpool и как меняется APR — по нашим данным.",
    listTitle: "Токены после Launchpool", listSub: "Цена в первый день торгов на Gate → через 7 и 30 дней и сейчас. Отвечает на вопрос: продавать сразу или держать.", listCols: ["Токен", "Биржа", "Старт пула", "+7 дней", "+30 дней", "Сейчас"], median: "Медиана",
    decayTitle: "Как падает APR", decaySub: "Стартовый APR (оценка биржи на старте) против финального — для завершённых пулов Gate.", decayCols: ["Пул", "Стартовый APR", "Финальный", "Финал / старт"], noData: "Пока мало данных.", method: "Цены — дневные свечи Gate (закрытие дня). Токены без пары на Gate пропущены.",
    sinceTitle: "С вашего последнего визита", sinceNew: (n) => `${n} новых акций — отмечены «новое для вас»`, sinceNone: "Новых акций с последнего визита нет",
  },
};
