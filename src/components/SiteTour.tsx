"use client";
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";

/**
 * "How to use the site" tour (owner 21.11): on the first visit a small prompt asks "first time here?"; yes → a step-by-step
 * walk over the home page that highlights one element at a time and says what it is for. Nothing is hidden or changed
 * (unlike the beginner mode removed 06.11). Replay: any link to `?tour=1` (hero, footer, /learn/).
 * Targets are `[data-tour=…]` attributes; a step whose element is missing or not visible (the radar on phones) is skipped.
 */
type L = "uk" | "en" | "ru";
type Step = { sel?: string; title: string; text: string };
const KEY = "pr:tour";
const TOP = 76;                                   // below the sticky 64px header

const UI: Record<L, { ask: string; askSub: string; yes: string; no: string; next: string; back: string; done: string; skip: string; of: string; label: string }> = {
  uk: { ask: "Вперше на PromoRadar?", askSub: "Покажемо за хвилину, що тут для чого.", yes: "Так, покажіть", no: "Ні, я розберусь", next: "Далі", back: "Назад", done: "Зрозуміло", skip: "Пропустити", of: "з", label: "Як користуватися сайтом" },
  en: { ask: "First time on PromoRadar?", askSub: "A one-minute tour of what is where.", yes: "Yes, show me", no: "No thanks", next: "Next", back: "Back", done: "Got it", skip: "Skip", of: "of", label: "How to use the site" },
  ru: { ask: "Впервые на PromoRadar?", askSub: "Покажем за минуту, что здесь для чего.", yes: "Да, покажите", no: "Нет, разберусь", next: "Далее", back: "Назад", done: "Понятно", skip: "Пропустить", of: "из", label: "Как пользоваться сайтом" },
};

const STEPS: Record<L, Step[]> = {
  uk: [
    { sel: "radar", title: "Радар бірж", text: "Кожна точка — біржа. Що ближче до центру, то більше в неї зараз акцій. Натисніть на точку, щоб побачити її найкращі акції." },
    { sel: "stats", title: "Коротко про зараз", text: "Скільки акцій активні, найбільша сума, яку може отримати одна людина, і зі скількох бірж ми збираємо дані. Нижче — коли список оновився востаннє." },
    { sel: "sections", title: "Розділи акцій", text: "«Усі акції» — повний список. «Аірдропи» — роздачі токенів. «0% комісії» — де зараз торгувати без комісії. «За монетою» — усе по одному токену." },
    { sel: "tools", title: "Пошук, сортування, фільтри", text: "Шукайте біржу чи монету. «Найвигідніші» ставить першими акції, де звичайний учасник реально отримає більше. «Фільтри» — без вкладень, поріг до $100, для нових користувачів, тип біржі, ваша країна." },
    { sel: "cats", title: "Типи акцій", text: "Змагання, бонуси за депозит, Earn, реферальні та інші. Число поруч — скільки таких акцій активні зараз." },
    { sel: "card", title: "Картка акції", text: "Зверху біржа, тип акції і позначки: «Нова», «Скоро кінець». Заголовок — суть акції простими словами, без рекламних слів біржі." },
    { sel: "card-money", title: "Скільки можна отримати", text: "«≈ $…» — наша оцінка, скільки отримає звичайний учасник після витрат. «На 1 людину» — максимум за правилами, «Фонд» — на всіх учасників. Справа — скільки часу лишилось. Кнопка нижче відкриває умови й кроки участі." },
    { sel: "card-actions", title: "Зберегти або приховати", text: "★ зберігає акцію в «Мої» — там зручно стежити за тим, що вам цікаво. Перекреслене око прибирає акцію зі стрічки." },
    { sel: "nav", title: "Інші розділи", text: "«Дохідність» — Launchpool, Earn і DeFi-пули з відсотками. «Розлоки» — коли розблоковуються токени. «Новачкам» — основи крипти й безпеки. «Мої» — збережені акції." },
    { title: "Готово", text: "Почніть із сортування «Найвигідніші» і фільтра «Без вкладень». Повторити тур можна за посиланням «Як користуватися сайтом» вгорі й унизу головної." },
  ],
  en: [
    { sel: "radar", title: "Exchange radar", text: "Each dot is an exchange. The closer to the centre, the more promos it runs right now. Tap a dot to see its best promos." },
    { sel: "stats", title: "Right now", text: "How many promos are live, the most one person can get, and how many exchanges we collect from. Below: when the list was last updated." },
    { sel: "sections", title: "Promo sections", text: "“All promos” is the full list. “Airdrops” are token giveaways. “0% fees” shows where to trade with no fees. “By coin” gathers everything for one token." },
    { sel: "tools", title: "Search, sort, filters", text: "Search for an exchange or a coin. “Best value” puts first the promos where an ordinary participant actually gets more. “Filters”: no deposit, entry under $100, new users, exchange type, your country." },
    { sel: "cats", title: "Promo types", text: "Competitions, deposit bonuses, Earn, referrals and more. The number shows how many are live now." },
    { sel: "card", title: "Promo card", text: "At the top: the exchange, the promo type and tags like “New” or “Ending soon”. The title is the gist in plain words, without the exchange’s ad copy." },
    { sel: "card-money", title: "What you can get", text: "“≈ $…” is our estimate of what an ordinary participant gets after costs. “Per person” is the maximum by the rules, “Pool” is shared by everyone. On the right: time left. The button below opens the rules and steps." },
    { sel: "card-actions", title: "Save or hide", text: "★ saves the promo to “Saved”, handy for keeping track. The crossed-out eye removes it from your feed." },
    { sel: "nav", title: "Other sections", text: "“Yield”: Launchpool, Earn and DeFi pools with interest. “Unlocks”: when tokens unlock. “Beginners”: crypto and safety basics. “Saved”: your saved promos." },
    { title: "Done", text: "Start with the “Best value” sort and the “No deposit” filter. You can replay this tour with the “How to use the site” link at the top and bottom of the home page." },
  ],
  ru: [
    { sel: "radar", title: "Радар бирж", text: "Каждая точка — биржа. Чем ближе к центру, тем больше у неё сейчас акций. Нажмите на точку, чтобы увидеть её лучшие акции." },
    { sel: "stats", title: "Коротко о сейчас", text: "Сколько акций активны, наибольшая сумма, которую может получить один человек, и со скольких бирж мы собираем данные. Ниже — когда список обновился в последний раз." },
    { sel: "sections", title: "Разделы акций", text: "«Все акции» — полный список. «Аирдропы» — раздачи токенов. «0% комиссии» — где сейчас торговать без комиссии. «По монете» — всё по одному токену." },
    { sel: "tools", title: "Поиск, сортировка, фильтры", text: "Ищите биржу или монету. «Самые выгодные» ставит первыми акции, где обычный участник реально получит больше. «Фильтры» — без вложений, порог до $100, для новых пользователей, тип биржи, ваша страна." },
    { sel: "cats", title: "Типы акций", text: "Соревнования, бонусы за депозит, Earn, реферальные и другие. Число рядом — сколько таких акций активны сейчас." },
    { sel: "card", title: "Карточка акции", text: "Сверху биржа, тип акции и пометки: «Новая», «Скоро конец». Заголовок — суть акции простыми словами, без рекламных слов биржи." },
    { sel: "card-money", title: "Сколько можно получить", text: "«≈ $…» — наша оценка, сколько получит обычный участник после затрат. «На 1 человека» — максимум по правилам, «Фонд» — на всех участников. Справа — сколько времени осталось. Кнопка ниже открывает условия и шаги участия." },
    { sel: "card-actions", title: "Сохранить или скрыть", text: "★ сохраняет акцию в «Мои» — там удобно следить за тем, что вам интересно. Перечёркнутый глаз убирает акцию из ленты." },
    { sel: "nav", title: "Другие разделы", text: "«Доходность» — Launchpool, Earn и DeFi-пулы с процентами. «Разлоки» — когда разблокируются токены. «Новичкам» — основы крипты и безопасности. «Мои» — сохранённые акции." },
    { title: "Готово", text: "Начните с сортировки «Самые выгодные» и фильтра «Без вложений». Повторить тур можно по ссылке «Как пользоваться сайтом» вверху и внизу главной." },
  ],
};

const visible = (el: Element) => { const r = el.getBoundingClientRect(); return r.width > 0 && r.height > 0 && getComputedStyle(el).visibility !== "hidden"; };
const find = (sel?: string) => (sel ? [...document.querySelectorAll(`[data-tour="${sel}"]`)].find(visible) ?? null : null);
const store = (v: string) => { try { localStorage.setItem(KEY, v); } catch { /* storage blocked */ } };

type Box = { top: number; left: number; width: number; height: number };

export function SiteTour({ lang }: { lang: L }) {
  const U = UI[lang], steps = STEPS[lang];
  const [ask, setAsk] = useState(false);
  const [i, setI] = useState(-1);                 // -1 = tour closed
  const [box, setBox] = useState<Box | null>(null);
  const [card, setCard] = useState<{ top: number; left: number } | null>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const primary = useRef<HTMLButtonElement>(null);
  const back = useRef<Element | null>(null);
  const dir = useRef(1);

  // first visit → the prompt; `?tour=1` → straight into the tour
  useEffect(() => {
    const q = new URLSearchParams(location.search);
    if (q.get("tour") === "1") {
      q.delete("tour");
      history.replaceState(null, "", location.pathname + (q.size ? `?${q}` : "") + location.hash);
      const t = setTimeout(() => start(), 400);
      return () => clearTimeout(t);
    }
    let seen = true;
    try { seen = localStorage.getItem(KEY) !== null; } catch { /* storage blocked → don't nag */ }
    if (seen) return;
    const t = setTimeout(() => setAsk(true), 1500);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const start = () => { back.current = document.activeElement; setAsk(false); dir.current = 1; setI(0); };
  const close = useCallback(() => {
    store("done"); setI(-1); setBox(null); setCard(null);
    const el = back.current as HTMLElement | null;
    if (el && typeof el.focus === "function" && document.contains(el)) el.focus({ preventScroll: true });
  }, []);
  const go = useCallback((d: number) => { dir.current = d; setI((x) => Math.min(steps.length - 1, Math.max(0, x + d))); }, [steps.length]);

  // a step whose element is missing / hidden is skipped in the direction of travel
  useEffect(() => {
    if (i < 0) return;
    const s = steps[i];
    if (s.sel && !find(s.sel)) {
      const n = i + dir.current;
      if (n >= 0 && n < steps.length) setI(n); else if (n < 0) { dir.current = 1; setI(i + 1); }
      return;
    }
    const el = find(s.sel);
    if (el) {
      // scroll so that the element AND the card below it fit between the sticky header and the phone tab bar
      // (centring the element alone left no room for the card next to tall targets — tour test 21.11)
      const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
      const r = el.getBoundingClientRect(), vh = innerHeight, bar = innerWidth < 768 ? 72 : 0;
      const ch = cardRef.current?.offsetHeight || 300, h = r.height + 12;
      const fixed = getComputedStyle(el).position === "fixed" || !!el.closest("header");
      if (!fixed) {
        const room = vh - bar - TOP - 16;
        const off = h + 12 + ch <= room ? TOP + (room - h - 12 - ch) / 2 : TOP;
        scrollTo({ top: Math.max(0, scrollY + r.top - 6 - off), behavior: reduce ? "auto" : "smooth" });
      }
    }
  }, [i, steps]);

  // keep the highlight on the element while the page scrolls / resizes
  useEffect(() => {
    if (i < 0) return;
    let raf = 0;
    const tick = () => {
      const el = find(steps[i].sel);
      if (el) {
        const r = el.getBoundingClientRect(), pad = 6;
        setBox((b) => {
          const n = { top: r.top - pad, left: r.left - pad, width: r.width + pad * 2, height: r.height + pad * 2 };
          return b && Math.abs(b.top - n.top) < 0.5 && Math.abs(b.left - n.left) < 0.5 && Math.abs(b.width - n.width) < 0.5 && Math.abs(b.height - n.height) < 0.5 ? b : n;
        });
      } else setBox(null);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [i, steps]);

  // place the explanation card below the element, else above, else docked (phones: above the bottom tab bar)
  useLayoutEffect(() => {
    if (i < 0) return;
    const c = cardRef.current;
    if (!c) return;
    const vw = innerWidth, vh = innerHeight, ch = c.offsetHeight, cw = c.offsetWidth, gap = 12, g = 16;
    const bottomBar = vw < 768 ? 72 : 0;
    if (!box) { setCard({ top: Math.max(g, (vh - ch) / 2), left: (vw - cw) / 2 }); return; }
    const clampTop = (t: number) => Math.min(Math.max(g, t), vh - bottomBar - g - ch);
    let left = Math.min(Math.max(g, box.left + box.width / 2 - cw / 2), vw - cw - g);
    const below = box.top + box.height + gap, above = box.top - gap - ch;
    let top: number;
    if (below + ch <= vh - bottomBar - g) top = below;
    else if (above >= g) top = above;
    // no room above or below: beside the element when the screen is wide enough, else docked at the bottom
    else if (box.left + box.width + gap + cw <= vw - g) { left = box.left + box.width + gap; top = clampTop(box.top); }
    else if (box.left - gap - cw >= g) { left = box.left - gap - cw; top = clampTop(box.top); }
    else top = vh - bottomBar - g - ch;
    setCard((p) => (p && Math.abs(p.top - top) < 0.5 && Math.abs(p.left - left) < 0.5 ? p : { top, left }));
  }, [i, box]);

  useEffect(() => { if (i >= 0) primary.current?.focus({ preventScroll: true }); }, [i]);

  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") { e.preventDefault(); close(); }
    else if (e.key === "ArrowRight") { e.preventDefault(); if (i < steps.length - 1) go(1); }
    else if (e.key === "ArrowLeft") { e.preventDefault(); go(-1); }
    else if (e.key === "Tab") {
      // keep focus inside the card while the tour is open
      const f = [...(cardRef.current?.querySelectorAll<HTMLElement>("button") ?? [])];
      if (!f.length) return;
      const k = f.indexOf(document.activeElement as HTMLElement);
      const n = e.shiftKey ? (k <= 0 ? f.length - 1 : k - 1) : (k === f.length - 1 ? 0 : k + 1);
      e.preventDefault(); f[n].focus();
    }
  };

  if (ask) return (
    <div role="dialog" aria-labelledby="tour-ask" className="fixed inset-x-3 bottom-20 z-50 mx-auto max-w-md animate-fade-up rounded-2xl border border-lime/30 bg-surface/95 p-4 shadow-2xl backdrop-blur-xl md:bottom-5 sm:p-5">
      <p id="tour-ask" className="font-bold text-ink">{U.ask}</p>
      <p className="mt-1 text-sm text-ink-2">{U.askSub}</p>
      <div className="mt-3 flex flex-wrap gap-2">
        <button type="button" onClick={start} className="btn btn-primary h-11 px-5 text-sm">{U.yes}</button>
        <button type="button" onClick={() => { store("no"); setAsk(false); }} className="btn btn-ghost h-11 px-4 text-sm">{U.no}</button>
      </div>
    </div>
  );
  if (i < 0) return null;

  const s = steps[i], last = i === steps.length - 1;
  return (
    <div className="fixed inset-0 z-[70]" onKeyDown={onKey}>
      {/* the page stays visible but not clickable; the highlight is a hole cut by a huge shadow, its frame an outline
          (a Tailwind ring is a box-shadow too and was overridden by the dimming shadow) */}
      <div className="absolute inset-0" onClick={close} aria-hidden="true" style={box ? undefined : { background: "rgb(3 5 8 / 0.72)" }} />
      {box && (
        <div aria-hidden="true" className="tour-spot pointer-events-none fixed rounded-2xl outline outline-2 outline-lime transition-all duration-200"
          style={{ top: box.top, left: box.left, width: box.width, height: box.height, boxShadow: "0 0 0 9999px rgb(3 5 8 / 0.72)" }} />
      )}
      <div ref={cardRef} role="dialog" aria-modal="true" aria-labelledby="tour-t" aria-describedby="tour-x"
        className="fixed w-[min(22rem,calc(100vw-2rem))] rounded-2xl border border-lime/40 bg-surface p-5 shadow-2xl"
        style={card ? { top: card.top, left: card.left } : { top: -9999, left: 0 }}>
        <div className="flex items-center justify-between gap-3 text-xs font-bold text-ink-3">
          <span>{i + 1} {U.of} {steps.length}</span>
          {!last && <button type="button" onClick={close} className="inline-flex min-h-6 items-center hover:text-ink">{U.skip}</button>}
        </div>
        <h2 id="tour-t" className="mt-2 text-lg font-bold text-ink">{s.title}</h2>
        <p id="tour-x" className="mt-1.5 text-sm leading-relaxed text-ink-2">{s.text}</p>
        <div className="mt-4 flex items-center justify-between gap-2">
          {i > 0 ? <button type="button" onClick={() => go(-1)} className="btn btn-ghost h-10 px-4 text-sm">{U.back}</button> : <span />}
          <button ref={primary} type="button" onClick={() => (last ? close() : go(1))} className="btn btn-primary h-10 px-5 text-sm">{last ? U.done : U.next}</button>
        </div>
      </div>
    </div>
  );
}

