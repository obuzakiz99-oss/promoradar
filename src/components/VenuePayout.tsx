import type { Locale } from "@/lib/i18n";
import type { Promo } from "@/lib/types";
import { PAYOUT_FACTS } from "@/config/payout-facts";
import { FORM_BADGE, FORM_CLS } from "@/lib/payout-i18n";
import { withBase } from "@/lib/base";

const X: Record<Locale, {
  title: (v: string) => string; facts: string; stats: (n: number) => string; unknown: string; pay: (d: number, n: number) => string;
  manual: (k: number, n: number) => string; auto: (k: number, n: number) => string; src: string; checked: string; more: string; none: string;
}> = {
  uk: {
    title: (v) => `Як платить ${v}`, facts: "З офіційних правил біржі", stats: (n) => `Що кажуть правила акцій на сайті зараз (${n})`,
    unknown: "Не вказано", pay: (d, n) => `Типова виплата — до ${d} дн. після акції (з ${n})`, manual: (k, n) => `Забирати вручну: ${k} з ${n}`, auto: (k, n) => `Автоматично: ${k} з ${n}`,
    src: "Джерело", checked: "перевірено", more: "Що таке ваучери, бонуси й бали →", none: "Біржа в правилах своїх акцій майже не пише, як і коли платить. Перевіряйте деталі нагороди на біржі.",
  },
  en: {
    title: (v) => `How ${v} pays`, facts: "From the exchange's official rules", stats: (n) => `What the rules of its promos on the site say (${n})`,
    unknown: "Not stated", pay: (d, n) => `Typical payout — within ${d} days after the promo (of ${n})`, manual: (k, n) => `Claim manually: ${k} of ${n}`, auto: (k, n) => `Automatic: ${k} of ${n}`,
    src: "Source", checked: "checked", more: "Vouchers, bonuses and points explained →", none: "The exchange rarely says in its promo rules how and when it pays. Check the reward details on the exchange.",
  },
  ru: {
    title: (v) => `Как платит ${v}`, facts: "Из официальных правил биржи", stats: (n) => `Что говорят правила акций на сайте сейчас (${n})`,
    unknown: "Не указано", pay: (d, n) => `Типичная выплата — до ${d} дн. после акции (из ${n})`, manual: (k, n) => `Забирать вручную: ${k} из ${n}`, auto: (k, n) => `Автоматически: ${k} из ${n}`,
    src: "Источник", checked: "проверено", more: "Что такое ваучеры, бонусы и баллы →", none: "Биржа в правилах своих акций почти не пишет, как и когда платит. Проверяйте детали награды на бирже.",
  },
};

const median = (xs: number[]) => { const s = [...xs].sort((a, b) => a - b); return s[Math.floor((s.length - 1) / 2)]; };

/** "How <exchange> pays": verified facts (config/payout-facts.ts) + what the rules of its live promos say. */
export function VenuePayout({ venueId, venueName, promos, lang }: { venueId: string; venueName: string; promos: Promo[]; lang: Locale }) {
  const T = X[lang];
  const F = PAYOUT_FACTS[venueId];
  const ps = promos.filter((p) => p.category !== "farming");
  if (!F && !ps.length) return null;
  const forms = { cash: 0, voucher: 0, mixed: 0, points: 0, unknown: 0 };
  ps.forEach((p) => { forms[p.meta?.payout?.form ?? "unknown"]++; });
  const days = ps.map((p) => p.meta?.payout?.payDays).filter((d): d is number => !!d);
  const manual = ps.filter((p) => p.meta?.payout?.manual).length;
  const auto = ps.filter((p) => p.meta?.payout?.auto).length;
  const said = ps.length - forms.unknown;
  return (
    <section id="payout" className="card mt-6 scroll-mt-20 p-6 hover:transform-none">
      <h2 className="font-display text-xl font-semibold tracking-tight">{T.title(venueName)}</h2>
      {F && (
        <div className="mt-4">
          <div className="text-xs font-bold uppercase tracking-wider text-ink-3">{T.facts}</div>
          <ul className="mt-2 space-y-2 text-sm leading-relaxed text-ink-2">
            {F.facts[lang].map((f) => <li key={f} className="flex gap-2"><span className="text-lime">•</span><span className="min-w-0 [overflow-wrap:anywhere]">{f}</span></li>)}
          </ul>
          <a href={F.src} target="_blank" rel="noopener" className="mt-2 inline-block text-xs font-semibold text-ink-3 hover:text-ink">{T.src} ↗ · {T.checked} {F.checked.split("-").reverse().join(".")}</a>
        </div>
      )}
      {ps.length > 0 && (
        <div className="mt-5">
          <div className="text-xs font-bold uppercase tracking-wider text-ink-3">{T.stats(ps.length)}</div>
          <div className="mt-2 flex flex-wrap gap-2 text-xs font-bold">
            {(["cash", "mixed", "voucher", "points"] as const).filter((k) => forms[k]).map((k) => (
              <span key={k} className={`rounded-md px-2 py-1 ${FORM_CLS[k]}`}>{FORM_BADGE[lang][k]}: {forms[k]}</span>
            ))}
            {forms.unknown > 0 && <span className="rounded-md bg-white/5 px-2 py-1 text-ink-2">{T.unknown}: {forms.unknown}</span>}
            {days.length > 0 && <span className="rounded-md bg-white/5 px-2 py-1 text-ink-2">{T.pay(median(days), days.length)}</span>}
            {manual > 0 && <span className="rounded-md bg-white/5 px-2 py-1 text-ink-2">{T.manual(manual, ps.length)}</span>}
            {auto > 0 && <span className="rounded-md bg-white/5 px-2 py-1 text-ink-2">{T.auto(auto, ps.length)}</span>}
          </div>
          {!F && said === 0 && !days.length && <p className="mt-3 text-sm text-ink-3">{T.none}</p>}
        </div>
      )}
      <a href={withBase(`/${lang}/learn/rewards/`)} className="mt-4 inline-block text-sm font-semibold text-lime hover:underline">{T.more}</a>
    </section>
  );
}
