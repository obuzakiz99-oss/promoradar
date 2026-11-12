import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getDict, isLocale, type Locale } from "@/lib/i18n";
import { getPromos } from "@/lib/promos";
import { findBySlug, slugOf, statusOf } from "@/lib/slug";
import { compactUsd, duration } from "@/lib/format";
import { SITE, VENUES } from "@/config/site";
import { VenueLogo } from "@/components/VenueLogo";
import { Icon, type IconName } from "@/components/Icon";
// fact labels get an SVG icon instead of the emoji that used to be part of the text
const FACT_ICON: Record<FactKey, IconName> = { period: "clock", who: "user", min: "cash", how: "checkCircle", payout: "gift", kyc: "id", region: "globe" };
import { SaveButton } from "@/components/SaveButton";
import { Share } from "@/components/Share";
import { PromoCard, CAT_STYLE } from "@/components/PromoCard";
import { Footer } from "@/components/Sections";
import type { Block, FactKey } from "@/lib/details";
import { deadlineReminder, googleCalUrl, icsHref, type CalEvent } from "@/lib/ics";
import { EarnCalc } from "@/components/EarnCalc";
import { titleOf } from "@/lib/titletpl";
import { FORM_BADGE, FORM_CLS, FORM_TEXT, timingChips } from "@/lib/payout-i18n";
import { withBase } from "@/lib/base";
import { getTokens, isStableSym } from "@/lib/tokens";

export const revalidate = 900;
export const dynamicParams = false; // every page is pre-rendered at build (required by the static GitHub Pages export)
/** Pre-render every current promo (needed for the static GitHub Pages build). */
export async function generateStaticParams() {
  const { promos } = await getPromos();
  return promos.map((p) => ({ slug: slugOf(p) }));
}

type Params = Promise<{ lang: string; slug: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { lang, slug } = await params;
  if (!isLocale(lang)) return {};
  const p = findBySlug((await getPromos(lang)).promos, slug);
  if (!p) return { title: "404" };
  const t = getDict(lang);
  const bits = [p.venue.name, t.cat[p.category], p.reward?.label, p.meta?.apr ? `+${p.meta.apr}% APR` : ""].filter(Boolean).join(" · ");
  const title = p.venue.kind === "airdrop" ? `${p.title} Airdrop` : `${p.title} — ${p.venue.name}`;
  // share card made by scripts/og-cards.mjs after the build (amount, deadline, exchange)
  const image = `https://${SITE.domain}/og/${slug}.png`;
  return {
    title, description: bits, alternates: { canonical: `/${lang}/p/${slug}` },
    openGraph: { title, description: bits, images: [{ url: image, width: 1200, height: 630 }] },
    twitter: { card: "summary_large_image", title, description: bits, images: [image] },
  };
}

const RULES_TX: Record<Locale, {
  title: string; keyTitle: string; keySub: string; translate: string; original: (v: string) => string; note: (v: string) => string; partial: string;
  none: (v: string) => string; more: string; signup: (v: string) => string; fact: Record<FactKey, string>;
  noteTr: (v: string) => string; keySubTr: string; coinMore: string;
  calTitle: string; calIcs: string; calNote: string; geoTitle: string; geoOnly: (r: string) => string; geoNoUA: string; geoNoEU: string; geoAll: string; forNew: string;
  minTitle: string; from: string; kind: Record<"trade" | "deposit" | "stake" | "hold" | "buy", string>;
  perUser: string; upTo: string; noCap: string; published: string; noEnd: string; left: string; poolShared: string; noCapShort: string;
}> = {
  uk: {
    coinMore: "усі акції та стейкінг", calTitle: "Дедлайн акції", calIcs: "iPhone / Outlook", calNote: "нагадування за день до кінця",
    geoTitle: "Для кого", geoOnly: (r) => (r === "region" ? "Лише для окремих регіонів — перевірте свою країну в умовах" : `Лише для регіону ${r}`), geoNoUA: "В умовах Україна серед обмежених країн", geoNoEU: "В умовах ЄС/ЄЕЗ серед обмежених регіонів", geoAll: "Обмежень для України в умовах не знайдено", forNew: "Лише для нових користувачів",
    noteTr: (v) => `Машинний переклад (DeepL) офіційних умов ${v}. Якщо щось незрозуміло або розходиться — діє оригінал на сайті біржі.`,
    keySubTr: "Ключові рядки з офіційних правил біржі (машинний переклад). Повний текст — нижче.",
    minTitle: "Щоб отримати хоч щось", from: "від", kind: { trade: "Торгівля", deposit: "Депозит", stake: "Стейк", hold: "Тримати", buy: "Купівля" },
    published: "опубліковано", noEnd: "Біржа не вказала дату завершення", left: "залишилось", poolShared: "Максимум на людину не вказано · спільний фонд", noCapShort: "Максимум на одну людину біржа не вказала — дивіться умови нижче",
    perUser: "Можна заробити (1 людина)", upTo: "до", noCap: "Біржа не вказує максимум на одну людину — нагорода ділиться між учасниками за правилами акції (див. нижче).",
    title: "Умови та правила", keyTitle: "Головне з правил", keySub: "Ключові рядки з офіційних правил біржі (мовою оригіналу). Повний текст — нижче.",
    translate: "Перекласти українською", original: (v) => `Оригінал на ${v}`,
    note: (v) => `Повний текст умов з офіційного оголошення ${v}, мовою оригіналу. Якщо щось розходиться — діють правила на сайті біржі.`,
    partial: "Біржа публікує тут лише короткий опис — повні правила за посиланням «Оригінал».",
    none: (v) => `Повний текст умов цієї акції опубліковано лише на сторінці ${v} — натисніть «Оригінал» або «Перекласти українською» вище.`,
    more: "Показати всі умови", signup: (v) => `Реєстрація на ${v}`,
    fact: { period: "Період", who: "Хто може брати участь", min: "Мінімальні вимоги", how: "Як взяти участь", payout: "Коли видадуть нагороди", kyc: "Верифікація (KYC)", region: "Обмеження по країнах" },
  },
  en: {
    coinMore: "all promos & staking", calTitle: "Promo deadline", calIcs: "iPhone / Outlook", calNote: "reminder a day before the end",
    geoTitle: "Who it's for", geoOnly: (r) => (r === "region" ? "Selected regions only — check your country in the rules" : `${r} region only`), geoNoUA: "The rules list Ukraine as restricted", geoNoEU: "The rules list the EU/EEA as restricted", geoAll: "No restriction for Ukraine found in the rules", forNew: "New users only",
    noteTr: (v) => `Full conditions from the official ${v} announcement. If anything differs, the rules on the exchange's site apply.`,
    keySubTr: "Key lines from the exchange's official rules. Full text below.",
    minTitle: "To get anything at all", from: "from", kind: { trade: "Trade", deposit: "Deposit", stake: "Stake", hold: "Hold", buy: "Buy" },
    published: "published", noEnd: "The exchange gave no end date", left: "left", poolShared: "No per-person maximum stated · shared pool", noCapShort: "The exchange states no per-person maximum — see the rules below",
    perUser: "One person can get", upTo: "up to", noCap: "The exchange doesn't state a per-person maximum — the reward is split between participants under the rules (see below).",
    title: "Conditions & rules", keyTitle: "Key points", keySub: "Key lines from the exchange's official rules. Full text below.",
    translate: "", original: (v) => `Original on ${v}`,
    note: (v) => `Full conditions from the official ${v} announcement. If anything differs, the rules on the exchange's site apply.`,
    partial: "The exchange only publishes a short summary here — full rules via “Original”.",
    none: (v) => `The full conditions of this promo are published only on ${v}'s page — tap “Original” above.`,
    more: "Show all conditions", signup: (v) => `Sign up on ${v}`,
    fact: { period: "Period", who: "Who can join", min: "Minimum requirements", how: "How to join", payout: "When rewards are paid", kyc: "Verification (KYC)", region: "Country restrictions" },
  },
  ru: {
    coinMore: "все акции и стейкинг", calTitle: "Дедлайн акции", calIcs: "iPhone / Outlook", calNote: "напоминание за день до конца",
    geoTitle: "Для кого", geoOnly: (r) => (r === "region" ? "Только для отдельных регионов — проверьте свою страну в условиях" : `Только для региона ${r}`), geoNoUA: "В условиях Украина среди ограниченных стран", geoNoEU: "В условиях ЕС/ЕЭЗ среди ограниченных регионов", geoAll: "Ограничений для Украины в условиях не найдено", forNew: "Только для новых пользователей",
    noteTr: (v) => `Машинный перевод (DeepL) официальных условий ${v}. Если что-то непонятно или расходится — действует оригинал на сайте биржи.`,
    keySubTr: "Ключевые строки из официальных правил биржи (машинный перевод). Полный текст — ниже.",
    minTitle: "Чтобы получить хоть что-то", from: "от", kind: { trade: "Торговля", deposit: "Депозит", stake: "Стейк", hold: "Держать", buy: "Покупка" },
    published: "опубликовано", noEnd: "Биржа не указала дату окончания", left: "осталось", poolShared: "Максимум на человека не указан · общий фонд", noCapShort: "Максимум на одного человека биржа не указала — смотрите условия ниже",
    perUser: "Можно заработать (1 человек)", upTo: "до", noCap: "Биржа не указывает максимум на одного человека — награда делится между участниками по правилам акции (см. ниже).",
    title: "Условия и правила", keyTitle: "Главное из правил", keySub: "Ключевые строки из официальных правил биржи (на языке оригинала). Полный текст — ниже.",
    translate: "Перевести на русский", original: (v) => `Оригинал на ${v}`,
    note: (v) => `Полный текст условий из официального объявления ${v}, на языке оригинала. Если что-то расходится — действуют правила на сайте биржи.`,
    partial: "Биржа публикует здесь только краткое описание — полные правила по ссылке «Оригинал».",
    none: (v) => `Полный текст условий этой акции опубликован только на странице ${v} — нажмите «Оригинал» или «Перевести на русский» выше.`,
    more: "Показать все условия", signup: (v) => `Регистрация на ${v}`,
    fact: { period: "Период", who: "Кто может участвовать", min: "Минимальные требования", how: "Как участвовать", payout: "Когда выдадут награды", kyc: "Верификация (KYC)", region: "Ограничения по странам" },
  },
};

/** Google Translate view of the official page (the page itself is public). */
function translateUrl(url: string, lang: Locale): string | undefined {
  // OKX sends the translator (and EU visitors) to its OKX Europe home page instead of the campaign → no translate link
  if (lang === "en" || url.startsWith("https://t.me/") || /(^|\.)okx\.com$/.test(new URL(url).hostname)) return undefined;
  return `https://translate.google.com/translate?sl=auto&tl=${lang}&u=${encodeURIComponent(url)}`;
}

function BlockView({ b }: { b: Block }) {
  if (b.t === "h") return <h3 className="pt-3 text-base font-bold text-ink">{b.x}</h3>;
  if (b.t === "li") return <p className="flex gap-2 pl-1"><span className="text-lime">•</span><span>{b.x}</span></p>;
  return <p>{b.x}</p>;
}

/** Original rules: headings, paragraphs, bullet lines and tables (consecutive rows grouped); long texts fold after the first part. */
function Rules({ blocks, more }: { blocks: Block[]; more: string }) {
  const groups: Array<Block | Block[]> = [];
  for (const b of blocks) {
    const last = groups[groups.length - 1];
    if (b.t === "tr" && Array.isArray(last)) last.push(b);
    else groups.push(b.t === "tr" ? [b] : b);
  }
  const render = (g: Block | Block[], i: number) => Array.isArray(g) ? (
    <div key={i} className="overflow-x-auto rounded-xl border border-line">
      <table className="w-full text-left text-xs">
        <tbody>
          {g.map((r, j) => (
            <tr key={j} className={j === 0 ? "bg-white/[0.04] font-bold text-ink" : "border-t border-line"}>
              {(r.cells ?? [r.x]).map((c, k) => <td key={k} className="px-3 py-2 align-top">{c}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  ) : <BlockView key={i} b={g} />;
  const cut = (() => { let n = 0; for (let i = 0; i < groups.length; i++) { n += Array.isArray(groups[i]) ? 4 : 1; if (n >= 28) return i + 1; } return groups.length; })();
  return (
    <div className="mt-4 space-y-2 text-sm leading-relaxed text-ink-2">
      {groups.slice(0, cut).map(render)}
      {cut < groups.length && (
        <details className="group">
          <summary className="cursor-pointer list-none pt-2 text-sm font-bold text-lime group-open:hidden">▾ {more}</summary>
          <div className="space-y-2">{groups.slice(cut).map((g, i) => render(g, cut + i))}</div>
        </details>
      )}
    </div>
  );
}

const dateFull = (ts: number, lang: Locale) =>
  new Date(ts).toLocaleString(lang === "uk" ? "uk-UA" : lang === "ru" ? "ru-RU" : "en-GB", { day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit", timeZone: "UTC" }) + " UTC";

const PAY_TX: Record<Locale, { title: string; unknown: string; quote: string; more: string; remind: string; calTitle: string; calDesc: (claim?: number) => string }> = {
  uk: { title: "Що ви реально отримаєте", unknown: "Форма не вказана", quote: "Що сказано в правилах:", more: "Що таке ваучери, бонуси й бали →",
    remind: "Нагадати забрати нагороду:", calTitle: "🎁 Забрати нагороду", calDesc: (c) => `Перевірте Центр нагород на біржі й заберіть нагороду${c ? ` — на це є ${c} дн., потім вона згорає` : ""}.` },
  en: { title: "What you actually get", unknown: "Form not stated", quote: "What the rules say:", more: "Vouchers, bonuses and points explained →",
    remind: "Remind me to claim the reward:", calTitle: "🎁 Claim your reward", calDesc: (c) => `Check the exchange's rewards center and claim your reward${c ? ` — you have ${c} days before it expires` : ""}.` },
  ru: { title: "Что вы реально получите", unknown: "Форма не указана", quote: "Что сказано в правилах:", more: "Что такое ваучеры, бонусы и баллы →",
    remind: "Напомнить забрать награду:", calTitle: "🎁 Забрать награду", calDesc: (c) => `Проверьте Центр наград на бирже и заберите награду${c ? ` — на это есть ${c} дн., потом она сгорит` : ""}.` },
};

const FAQ_TX: Record<Locale, { how: string; steps: string; when: string; form: string; claim: string; watch: string; title: string; note: (venue: string) => string }> = {
  uk: { how: "Як це працює — простими словами", steps: "Що зробити", when: "Коли прийде нагорода", form: "У якій формі", claim: "Як отримати", watch: "На що звернути увагу", title: "Часті питання",
    note: (v) => `Пояснення склав AI тільки за офіційними правилами ${v}. Він може помилитися — перед участю звірте важливе з умовами нижче.` },
  en: { how: "How it works — in plain words", steps: "What to do", when: "When the reward arrives", form: "In what form", claim: "How to get it", watch: "Watch out for", title: "Common questions",
    note: (v) => `Explained by AI strictly from ${v}'s official rules. It can make mistakes — check anything important against the terms below.` },
  ru: { how: "Как это работает — простыми словами", steps: "Что сделать", when: "Когда придёт награда", form: "В какой форме", claim: "Как получить", watch: "На что обратить внимание", title: "Частые вопросы",
    note: (v) => `Пояснение составил AI только по официальным правилам ${v}. Он может ошибаться — перед участием сверьте важное с условиями ниже.` },
};

export default async function PromoPage({ params }: { params: Params }) {
  const { lang, slug } = await params;
  if (!isLocale(lang)) notFound();
  const t = getDict(lang);
  const { promos, fetchedAt, details, faq: faqs } = await getPromos(lang);
  const p = findBySlug(promos, slug);
  if (!p) notFound();
  const now = fetchedAt;
  const m = p.meta ?? {};
  const st = statusOf(p, now);
  const isAggregator = p.venue.kind === "airdrop";
  const venueCfg = VENUES[p.venue.id];
  // straight to this promo on the exchange; a referral (when the owner sets one) is offered separately
  const joinUrl = p.category === "farming" ? p.joinUrl || p.url : p.url;
  const refUrl = p.category !== "farming" && venueCfg?.refUrl ? venueCfg.refUrl : undefined;
  const R = RULES_TX[lang];
  const own = titleOf(p, lang);
  const det = details?.[p.id];
  const ex = faqs?.[p.id]?.[lang];
  const faq = ex?.faq ?? [];
  const FQ = FAQ_TX[lang];
  // token pages this promo appears on (its reward coin and tickers in the headline)
  const { tokens } = await getTokens(lang);
  const coins = [...tokens.values()].filter((x) => !isStableSym(x.sym) && x.promos.some((q) => q.id === p.id)).slice(0, 4);
  const cal: CalEvent | undefined = p.endsAt && p.endsAt > fetchedAt ? {
    uid: p.id.replace(/[^a-z0-9]/gi, "-"), title: Array.from(`⏳ ${R.calTitle}: ${p.title}`).slice(0, 180).join(""), at: deadlineReminder(p.endsAt, fetchedAt),
    description: `${p.venue.name} · ${dateFull(p.endsAt, lang)}`, url: `https://${SITE.domain}/${lang}/p/${slug}/`,
  } : undefined;
  const tr = translateUrl(p.url, lang);
  const related = [
    ...promos.filter((x) => x.id !== p.id && x.venue.id === p.venue.id),
    ...promos.filter((x) => x.id !== p.id && x.venue.id !== p.venue.id && x.category === p.category),
  ].slice(0, 6);

  const pu = m.perUser;
  const perUserCell: React.ReactNode = pu ? (
    <span>
      <span className="text-lime">{R.upTo} {pu.amount.toLocaleString("en-US")} {pu.unit}</span>
      {pu.usd !== undefined && pu.unit !== "USD" && !/^USD/.test(pu.unit) && <span className="text-ink-3"> (≈{compactUsd(pu.usd)})</span>}
      <span className="mt-1 block text-xs font-normal text-ink-3">“{pu.text}”</span>
    </span>
  ) : <span className="font-normal text-ink-2">{R.noCap}</span>;
  const facts: Array<[string, React.ReactNode]> = [
    [t.detail.reward, m.apr !== undefined ? <span className="text-success">+{m.apr}% APR</span> : p.reward ? p.reward.label + (p.reward.usd && p.reward.unit !== "USD" ? ` (≈${compactUsd(p.reward.usd)})` : "") : t.detail.noData],
      ...(p.category !== "farming" ? [[R.perUser, perUserCell] as [string, React.ReactNode]] : []),
    [t.detail.start, p.startsAt ? dateFull(p.startsAt, lang) : t.detail.noData],
    [t.detail.end, p.endsAt ? <>{dateFull(p.endsAt, lang)} <span className="text-ink-3">· {duration(p.endsAt - now, t.time)}</span></> : p.evergreen ? t.card.ongoing : t.detail.noData],
    [t.detail.published, p.publishedAt ? dateFull(p.publishedAt, lang) : t.detail.noData],
  ];
  if (m.chain) facts.push([t.detail.chain, m.chain]);
  if (m.tvlUsd) facts.push([t.card.tvl, compactUsd(m.tvlUsd)]);
  facts.push([t.detail.source, m.source ?? `${p.venue.name} · ${new URL(p.url).hostname}`]);

  return (
    <>
      <main className="mx-auto max-w-7xl px-4 pb-20 pt-8 sm:px-6">
        <nav className="flex flex-wrap items-center gap-2 text-sm font-semibold text-ink-3">
          <Link href={`/${lang}#promos`} className="hover:text-ink">← {t.detail.back}</Link>
          <span>/</span>
          {venueCfg ? <Link href={`/${lang}/v/${p.venue.id}`} className="hover:text-ink">{p.venue.name}</Link> : <span>{p.venue.name}</span>}
        </nav>

        <header className="mt-6 flex flex-col gap-6 md:flex-row md:items-start">
          <VenueLogo v={p.venue} size={72} rounded="rounded-2xl" />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2 text-xs font-bold">
              <span className={`inline-flex items-center gap-1.5 rounded-md bg-white/5 px-2 py-1 ${CAT_STYLE[p.category].text}`}>
                <span className="size-1.5 rounded-full" style={{ background: CAT_STYLE[p.category].dot }} /> {t.cat[p.category]}
              </span>
              <span className={`rounded-md px-2 py-1 ${st === "ending" ? "bg-rose/10 text-rose" : st === "upcoming" ? "bg-sky/10 text-sky" : "bg-lime/10 text-lime"}`}>{t.status[st]}</span>
              {m.confirmed && <span className="rounded-md bg-teal/10 px-2 py-1 text-teal">✓ {t.card.confirmed}</span>}
              {(m.hot ?? 0) >= 60 && <span className="rounded-md bg-amber/10 px-2 py-1 text-amber"><Icon name="flame" /> {m.hot}°</span>}
            </div>
            {/* H1 = our short title (display font only for short text); the full headline is the subtitle — audit 08.11 */}
            {own ? (
              <>
                <h1 className="mt-3 font-display text-2xl font-semibold leading-tight tracking-tight sm:text-4xl">{own}</h1>
                <p className="mt-2 text-lg leading-snug text-ink-2">{isAggregator ? `${p.title} — Airdrop` : p.title}</p>
              </>
            ) : (
              <h1 className="mt-3 text-2xl font-bold leading-tight tracking-tight sm:text-3xl">{isAggregator ? `${p.title} — Airdrop` : p.title}</h1>
            )}
            <p className="mt-2 text-ink-3">{p.venue.name}</p>
            {coins.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-2">
                {coins.map((c) => (
                  <Link key={c.sym} href={`/${lang}/t/${c.sym}`} className="flex h-8 items-center gap-1.5 rounded-lg border border-line bg-white/[0.03] pl-1 pr-2.5 text-xs font-bold text-ink-2 hover:border-line-2 hover:text-ink">
                    <VenueLogo v={{ name: c.sym, logo: c.logo, color: "#2a3140", ink: "#e8ecf1", monogram: c.sym.slice(0, 3) }} size={20} rounded="rounded-full" />
                    {c.sym} · {R.coinMore}
                  </Link>
                ))}
              </div>
            )}
          </div>
        </header>

        <div className="mt-8 flex flex-wrap items-center gap-3">
          <a href={joinUrl} target="_blank" rel="noopener" className="btn btn-primary h-12 px-6 text-base">{p.category === "farming" ? t.card.open : t.card.join} ↗</a>
          {refUrl && <a href={refUrl} target="_blank" rel="sponsored noopener" className="btn btn-ghost h-12 px-6 text-base">{R.signup(p.venue.name)} ↗<span className="ml-1.5 rounded bg-white/10 px-1 py-0.5 text-xs font-bold uppercase tracking-wide text-ink-3" title={({ uk: "Реферальне посилання: ми можемо отримати комісію від біржі. Для вас умови ті самі.", en: "Referral link: we may earn a commission from the exchange. Your terms are the same.", ru: "Реферальная ссылка: мы можем получить комиссию от биржи. Для вас условия те же." } as const)[lang]}>{({ uk: "реф.", en: "ref", ru: "реф." } as const)[lang]}</span></a>}
          {p.category !== "farming" && <a href="#rules" className="btn btn-ghost h-12 px-6 text-base">{R.title} ↓</a>}
          <SaveButton id={p.id} labelAdd={t.saved.add} labelRemove={t.saved.remove} size="lg" />
        </div>

        {/* the three things people ask first: when it starts, when it ends, how much one person can get */}
        {p.category !== "farming" && (
          <div className={`mt-8 grid gap-3 sm:grid-cols-2 ${m.minEntry ? "lg:grid-cols-4" : "lg:grid-cols-3"}`}>
            <div className="card p-4 hover:transform-none">
              <div className="text-xs font-bold uppercase tracking-wider text-ink-3">{t.detail.start}</div>
              <div className="mt-1 font-mono text-sm font-bold text-ink">{p.startsAt ? dateFull(p.startsAt, lang) : p.publishedAt ? `${R.published} ${dateFull(p.publishedAt, lang)}` : "—"}</div>
            </div>
            <div className="card p-4 hover:transform-none">
              <div className="text-xs font-bold uppercase tracking-wider text-ink-3">{t.detail.end}</div>
              <div className="mt-1 font-mono text-sm font-bold text-ink">{p.endsAt ? dateFull(p.endsAt, lang) : R.noEnd}</div>
              {p.endsAt && <div className={`mt-0.5 text-xs font-bold ${p.endsAt - now < 3 * 86400_000 ? "text-rose" : "text-lime"}`}><Icon name="hourglass" /> {R.left} {duration(p.endsAt - now, t.time)}</div>}
              {cal && (
                <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs font-bold">
                  <a href={googleCalUrl(cal)} target="_blank" rel="noopener" className="text-sky hover:underline"><Icon name="calendar" /> Google</a>
                  <a href={icsHref([cal])} download={`promo-${slug.split("-")[0]}.ics`} className="text-sky hover:underline"><Icon name="calendar" /> {R.calIcs}</a>
                  <span className="font-normal text-ink-3">{R.calNote}</span>
                </div>
              )}
            </div>
            <div className="card p-4 hover:transform-none ring-1 ring-lime/20">
              <div className="text-xs font-bold uppercase tracking-wider text-ink-3">{R.perUser}</div>
              {pu ? (
                <div className="mt-1 font-mono text-lg font-bold text-lime">{R.upTo} {pu.amount.toLocaleString("en-US")} {pu.unit}
                  {pu.usd !== undefined && !/^USD/.test(pu.unit) && <span className="text-sm text-ink-3"> ≈{compactUsd(pu.usd)}</span>}
                </div>
              ) : (
                <div className="mt-1 text-xs leading-snug text-ink-2">{p.reward ? `${R.poolShared} ${p.reward.label}` : R.noCapShort}</div>
              )}
            </div>
            {m.minEntry && (
              <div className="card p-4 hover:transform-none" title={m.minEntry.text}>
                <div className="text-xs font-bold uppercase tracking-wider text-ink-3">{R.minTitle}</div>
                <div className="mt-1 font-mono text-lg font-bold text-amber">{R.kind[m.minEntry.kind]} {R.from} {m.minEntry.unit === "USD" ? "$" : ""}{m.minEntry.amount.toLocaleString("en-US")}{m.minEntry.unit !== "USD" ? ` ${m.minEntry.unit}` : ""}</div>
                <div className="mt-1 text-xs leading-snug text-ink-3">“{m.minEntry.text}”</div>
              </div>
            )}
          </div>
        )}

        {/* "how much would I get" — only when the rules give something to calculate with */}
        {p.category !== "farming" && p.category !== "competition" && !/(giveaway|lucky draw|raffle|spin|mystery box|jackpot|competition|contest|leaderboard|tournament|creator)/i.test(p.titleOrig ?? p.title) && (m.aprPct !== undefined || m.tiers?.length || m.minEntry || m.perUser) && (
          <EarnCalc lang={lang} m={m} endsAt={p.endsAt} now={now} />
        )}

        {/* what the reward really is (cash / voucher / points) and how it is paid — read from the official rules */}
        {p.category !== "farming" && det && (() => {
          const po = m.payout;
          const chips = po ? timingChips(po, lang) : [];
          const PT = PAY_TX[lang];
          // when the reward should show up (promo end + review/payout days) — a calendar reminder to go and claim it
          const claimAt = po?.manual && p.endsAt ? p.endsAt + ((po.payDays ?? po.reviewDays ?? 1) * 86400_000) : undefined;
          const claimCal: CalEvent | undefined = claimAt && claimAt > fetchedAt ? {
            uid: `claim-${p.id.replace(/[^a-z0-9]/gi, "-")}`, title: Array.from(`${PT.calTitle}: ${p.title}`).slice(0, 180).join(""), at: claimAt,
            description: `${p.venue.name} · ${PT.calDesc(po?.claimDays)}`, url: `https://${SITE.domain}/${lang}/p/${slug}/`,
          } : undefined;
          return (
            <section id="payout" className="card mt-4 scroll-mt-20 p-6 hover:transform-none">
              <h2 className="font-display text-xl font-semibold tracking-tight"><Icon name="coins" className="size-5 text-lime" /> {PT.title}</h2>
              <div className="mt-3 flex flex-wrap gap-2 text-sm font-bold">
                {po?.form
                  ? <span className={`rounded-md px-2 py-1 ${FORM_CLS[po.form]}`}>{FORM_BADGE[lang][po.form]}</span>
                  : <span className="rounded-md bg-white/5 px-2 py-1 text-ink-2">{PT.unknown}</span>}
                {chips.map((c) => <span key={c} className="rounded-md bg-white/5 px-2 py-1 text-ink-2">{c}</span>)}
              </div>
              <p className="mt-3 text-sm leading-relaxed text-ink-2">{FORM_TEXT[lang][po?.form ?? "unknown"]}</p>
              {po && po.quotes.length > 0 && (
                <div className="mt-4 rounded-xl border border-line bg-white/[0.02] p-4">
                  <div className="text-xs font-bold uppercase tracking-wider text-ink-3">{PT.quote}</div>
                  <ul className="mt-2 space-y-1.5 text-sm text-ink-2">
                    {po.quotes.map((q, i) => <li key={i} className="[overflow-wrap:anywhere]">“{q}”</li>)}
                  </ul>
                </div>
              )}
              {claimCal && (
                <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm font-bold">
                  <span className="font-semibold text-ink-2"><Icon name="clock" /> {PT.remind}</span>
                  <a href={googleCalUrl(claimCal)} target="_blank" rel="noopener" className="text-sky hover:underline"><Icon name="calendar" /> Google</a>
                  <a href={icsHref([claimCal])} download={`claim-${slug.split("-")[0]}.ics`} className="text-sky hover:underline"><Icon name="calendar" /> {R.calIcs}</a>
                </div>
              )}
              <a href={withBase(`/${lang}/learn/rewards/`)} className="mt-4 block text-sm font-semibold text-lime hover:underline">{PT.more}</a>
            </section>
          );
        })()}

        {/* who can join: region-exclusive / restricted countries / new users only */}
        {p.category !== "farming" && (m.geo || m.forNew || det) && (
          <div className="mt-3 flex flex-wrap items-center gap-2 rounded-2xl border border-line bg-white/[0.02] px-4 py-3 text-sm">
            <span className="text-xs font-bold uppercase tracking-wider text-ink-3">{R.geoTitle}:</span>
            {m.geo?.only && <span className="rounded-md bg-amber/10 px-2 py-0.5 font-bold text-amber"><Icon name="globe" /> {R.geoOnly(m.geo.only)}</span>}
            {m.geo?.noUA && <span className="rounded-md bg-rose/10 px-2 py-0.5 font-bold text-rose"><Icon name="alert" /> {R.geoNoUA}</span>}
            {m.geo?.noEU && <span className="rounded-md bg-rose/10 px-2 py-0.5 font-bold text-rose"><Icon name="alert" /> {R.geoNoEU}</span>}
            {m.forNew && <span className="rounded-md bg-sky/10 px-2 py-0.5 font-bold text-sky">{R.forNew}</span>}
            {!m.geo?.only && !m.geo?.noUA && det && <span className="font-semibold text-ink-2">✓ {R.geoAll}</span>}
            {m.geo?.text && <span className="block w-full text-xs text-ink-3">“{m.geo.text}”</span>}
          </div>
        )}

        {/* plain-language explainer — written by AI strictly from the official rules (src/lib/faq.ts) */}
        {ex && (
          <section id="how" className="card mt-4 scroll-mt-20 p-6 hover:transform-none ring-1 ring-sky/20">
            <h2 className="font-display text-xl font-semibold tracking-tight"><Icon name="bulb" className="size-5 text-lime" /> {FQ.how}</h2>
            <p className="mt-1 text-xs text-ink-3">{FQ.note(p.venue.name)}</p>
            <p className="mt-4 text-[15px] leading-relaxed text-ink [overflow-wrap:anywhere]">{ex.summary}</p>
            <h3 className="mt-6 text-xs font-bold uppercase tracking-wider text-ink-3">{FQ.steps}</h3>
            <ol className="mt-3 space-y-3 text-sm text-ink-2">
              {ex.steps.map((x, i) => (
                <li key={i} className="flex gap-3"><span className="grid size-6 shrink-0 place-items-center rounded-md bg-lime/10 font-mono text-xs font-bold text-lime">{i + 1}</span><span className="min-w-0 [overflow-wrap:anywhere]">{x}</span></li>
              ))}
            </ol>
            <div className="mt-6 grid grid-cols-1 gap-3 md:grid-cols-3 [&>*]:min-w-0">
              {([["clock", FQ.when, ex.payout.when], ["gift", FQ.form, ex.payout.form], ["inbox", FQ.claim, ex.payout.how]] as const).map(([ic, k, v]) => (
                <div key={k} className="rounded-xl border border-line bg-white/[0.02] p-4">
                  <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-ink-3"><Icon name={ic} /> {k}</div>
                  <p className="mt-2 text-sm leading-relaxed text-ink [overflow-wrap:anywhere]">{v}</p>
                </div>
              ))}
            </div>
            {ex.watch.length > 0 && (
              <>
                <h3 className="mt-6 text-xs font-bold uppercase tracking-wider text-ink-3"><Icon name="alert" /> {FQ.watch}</h3>
                <ul className="mt-3 space-y-2 text-sm text-ink-2">
                  {ex.watch.map((x, i) => <li key={i} className="flex gap-2"><span className="text-amber">•</span><span className="min-w-0 [overflow-wrap:anywhere]">{x}</span></li>)}
                </ul>
              </>
            )}
          </section>
        )}

        {/* key points pulled from the official rules */}
        {det && det.facts.length > 0 && (
          <section className="card mt-4 p-6 hover:transform-none ring-1 ring-lime/15">
            <h2 className="font-display text-xl font-semibold tracking-tight"><Icon name="pin" className="size-5 text-lime" /> {R.keyTitle}</h2>
            <p className="mt-1 text-xs text-ink-3">{(det.translated ?? 0) > 0 ? R.keySubTr : R.keySub}</p>
            <dl className="mt-4 divide-y divide-line">
              {det.facts.map((f, i) => (
                <div key={i} className="grid grid-cols-1 gap-1 py-3 text-sm sm:grid-cols-[11rem_1fr] sm:gap-4">
                  <dt className="flex items-center gap-1.5 font-semibold text-ink-3"><Icon name={FACT_ICON[f.k]} />{R.fact[f.k]}</dt>
                  <dd className="min-w-0 text-ink [overflow-wrap:anywhere]">{f.text}</dd>
                </div>
              ))}
            </dl>
          </section>
        )}


        <div className="mt-10 grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)] [&>*]:min-w-0">
          <section className="card p-6 hover:transform-none">
            <h2 className="text-xs font-bold uppercase tracking-wider text-ink-3">{t.detail.facts}</h2>
            <dl className="mt-4 divide-y divide-line">
              {facts.map(([k, v]) => (
                <div key={k} className="grid grid-cols-[minmax(0,8rem)_minmax(0,1fr)] gap-3 py-3 text-sm sm:grid-cols-[9rem_minmax(0,1fr)] sm:gap-4">
                  <dt className="font-semibold text-ink-3">{k}</dt>
                  <dd className="min-w-0 font-semibold text-ink [overflow-wrap:anywhere]">{v}</dd>
                </div>
              ))}
            </dl>
            {m.actions && (
              <div className="mt-4 rounded-xl bg-white/[0.03] p-4 text-sm"><span className="font-bold text-ink-3">{t.card.actions}: </span>{m.actions}</div>
            )}
            {m.requires?.length ? (
              <div className="mt-3 flex flex-wrap gap-2 text-xs font-bold text-ink-2">
                <span className="text-ink-3">{t.card.requires}:</span>
                {m.requires.map((r) => <span key={r} className="rounded-md bg-white/5 px-2 py-1">{t.req[r] ?? r}</span>)}
              </div>
            ) : null}
          </section>

          <aside className="flex flex-col gap-4">
            <div className={`card p-6 hover:transform-none ${isAggregator ? "ring-1 ring-amber/30" : "ring-1 ring-lime/20"}`}>
              <div className={`text-sm font-bold ${isAggregator ? "text-amber" : "text-lime"}`}>{isAggregator ? <><Icon name="alert" /> {t.detail.aggregator}</> : <><Icon name="check" /> {t.detail.official}</>}</div>
              <p className="mt-2 text-sm leading-relaxed text-ink-2">{isAggregator ? t.detail.aggregatorNote : t.detail.officialNote}</p>
            </div>
            <div className="card p-6 hover:transform-none">
              <h2 className="text-xs font-bold uppercase tracking-wider text-ink-3">{t.detail.steps}</h2>
              <ol className="mt-4 space-y-3 text-sm text-ink-2">
                {[t.detail.step1, t.detail.step2, t.detail.step3, t.detail.step4].map((s, i) => (
                  <li key={i} className="flex gap-3"><span className="grid size-6 shrink-0 place-items-center rounded-md bg-lime/10 font-mono text-xs font-bold text-lime">{i + 1}</span>{s}</li>
                ))}
              </ol>
            </div>
          </aside>
        </div>

        {/* full conditions & rules */}
        {p.category !== "farming" && <section id="rules" className="card mt-4 scroll-mt-20 p-6 hover:transform-none">
          <div className="flex flex-wrap items-baseline justify-between gap-3">
            <h2 className="font-display text-xl font-semibold tracking-tight"><Icon name="scroll" className="size-5 text-lime" /> {R.title}</h2>
            <div className="flex flex-wrap gap-3 text-sm font-semibold">
              {tr && <a href={tr} target="_blank" rel="noopener" className="text-lime hover:underline">{R.translate} ↗</a>}
              <a href={p.url} target="_blank" rel="noopener" className="text-ink-2 hover:text-ink">{R.original(p.venue.name)} ↗</a>
            </div>
          </div>
          {det && det.blocks.length > 0 ? (
            <>
              <p className="mt-1 text-xs text-ink-3">{(det.translated ?? 0) > 0.5 ? R.noteTr(p.venue.name) : R.note(p.venue.name)}{det.partial ? ` ${R.partial}` : ""}</p>
              <Rules blocks={det.blocks} more={R.more} />
            </>
          ) : (
            <p className="mt-3 text-sm leading-relaxed text-ink-2">{R.none(p.venue.name)}</p>
          )}
        </section>}

        {/* more questions — same AI explainer */}
        {faq.length > 0 && (
          <section id="faq" className="card mt-4 scroll-mt-20 p-6 hover:transform-none">
            <h2 className="font-display text-xl font-semibold tracking-tight"><Icon name="help" className="size-5 text-lime" /> {FQ.title}</h2>
            <div className="mt-4 divide-y divide-line">
              {faq.map((x, i) => (
                <details key={i} className="group py-3" open={i === 0}>
                  <summary className="cursor-pointer list-none text-sm font-semibold text-ink [overflow-wrap:anywhere] marker:hidden">
                    <span className="mr-2 inline-block text-lime transition-transform group-open:rotate-90">›</span>{x.q}
                  </summary>
                  <p className="mt-2 pl-5 text-sm leading-relaxed text-ink-2 [overflow-wrap:anywhere]">{x.a}</p>
                </details>
              ))}
            </div>
            <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({
              "@context": "https://schema.org", "@type": "FAQPage",
              mainEntity: faq.map((x) => ({ "@type": "Question", name: x.q, acceptedAnswer: { "@type": "Answer", text: x.a } })),
            }).replace(/</g, "\\u003c") }} />
          </section>
        )}

        <div className="mt-8 flex flex-wrap items-center justify-between gap-4 border-t border-line pt-6">
          <Share title={p.title} label={t.detail.share} copyLabel={t.detail.copy} copiedLabel={t.detail.copied} />
          <a href={SITE.telegram} target="_blank" rel="noopener" className="text-sm font-semibold text-ink-3 hover:text-ink"><Icon name="flag" /> {t.detail.report}</a>
        </div>

        {related.length > 0 && (
          <section className="mt-14">
            <h2 className="font-display text-2xl font-semibold tracking-tight">{t.detail.related}</h2>
            <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {related.map((r, i) => <PromoCard key={r.id} p={r} t={t} lang={lang} now={now} index={i} />)}
            </div>
          </section>
        )}
      </main>
      <Footer t={t} fetchedAt={fetchedAt} lang={lang} />
    </>
  );
}
