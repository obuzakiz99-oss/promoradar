import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getDict, isLocale, type Locale } from "@/lib/i18n";
import { getPromos } from "@/lib/promos";
import { findBySlug, slugOf, statusOf } from "@/lib/slug";
import { compactUsd, duration } from "@/lib/format";
import { SITE, VENUES } from "@/config/site";
import { VenueLogo } from "@/components/VenueLogo";
import { SaveButton } from "@/components/SaveButton";
import { Share } from "@/components/Share";
import { PromoCard, CAT_STYLE } from "@/components/PromoCard";
import { Footer } from "@/components/Sections";
import type { Block, FactKey } from "@/lib/details";
import { deadlineReminder, googleCalUrl, icsHref, type CalEvent } from "@/lib/ics";

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
  return { title, description: bits, alternates: { canonical: `/${lang}/p/${slug}` } };
}

const RULES_TX: Record<Locale, {
  title: string; keyTitle: string; keySub: string; translate: string; original: (v: string) => string; note: (v: string) => string; partial: string;
  none: (v: string) => string; more: string; signup: (v: string) => string; fact: Record<FactKey, string>;
  noteTr: (v: string) => string; keySubTr: string;
  calTitle: string; calIcs: string; calNote: string; geoTitle: string; geoOnly: (r: string) => string; geoNoUA: string; geoNoEU: string; geoAll: string; forNew: string;
  minTitle: string; from: string; kind: Record<"trade" | "deposit" | "stake" | "hold" | "buy", string>;
  perUser: string; upTo: string; noCap: string; published: string; noEnd: string; left: string; poolShared: string; noCapShort: string;
}> = {
  uk: {
    calTitle: "Дедлайн акції", calIcs: "iPhone / Outlook", calNote: "нагадування за день до кінця",
    geoTitle: "Для кого", geoOnly: (r) => (r === "region" ? "Лише для окремих регіонів — перевірте свою країну в умовах" : `Лише для регіону ${r}`), geoNoUA: "⚠ В умовах Україна серед обмежених країн", geoNoEU: "⚠ В умовах ЄС/ЄЕЗ серед обмежених регіонів", geoAll: "Обмежень для України в умовах не знайдено", forNew: "🆕 Лише для нових користувачів",
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
    fact: { period: "⏱ Період", who: "👤 Хто може брати участь", min: "💵 Мінімальні вимоги", how: "✅ Як взяти участь", payout: "🎁 Коли видадуть нагороди", kyc: "🪪 Верифікація (KYC)", region: "🌍 Обмеження по країнах" },
  },
  en: {
    calTitle: "Promo deadline", calIcs: "iPhone / Outlook", calNote: "reminder a day before the end",
    geoTitle: "Who it's for", geoOnly: (r) => (r === "region" ? "Selected regions only — check your country in the rules" : `${r} region only`), geoNoUA: "⚠ The rules list Ukraine as restricted", geoNoEU: "⚠ The rules list the EU/EEA as restricted", geoAll: "No restriction for Ukraine found in the rules", forNew: "🆕 New users only",
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
    fact: { period: "⏱ Period", who: "👤 Who can join", min: "💵 Minimum requirements", how: "✅ How to join", payout: "🎁 When rewards are paid", kyc: "🪪 Verification (KYC)", region: "🌍 Country restrictions" },
  },
  ru: {
    calTitle: "Дедлайн акции", calIcs: "iPhone / Outlook", calNote: "напоминание за день до конца",
    geoTitle: "Для кого", geoOnly: (r) => (r === "region" ? "Только для отдельных регионов — проверьте свою страну в условиях" : `Только для региона ${r}`), geoNoUA: "⚠ В условиях Украина среди ограниченных стран", geoNoEU: "⚠ В условиях ЕС/ЕЭЗ среди ограниченных регионов", geoAll: "Ограничений для Украины в условиях не найдено", forNew: "🆕 Только для новых пользователей",
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
    fact: { period: "⏱ Период", who: "👤 Кто может участвовать", min: "💵 Минимальные требования", how: "✅ Как участвовать", payout: "🎁 Когда выдадут награды", kyc: "🪪 Верификация (KYC)", region: "🌍 Ограничения по странам" },
  },
};

/** Google Translate view of the official page (the page itself is public). */
function translateUrl(url: string, lang: Locale): string | undefined {
  if (lang === "en" || url.startsWith("https://t.me/")) return undefined;
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

export default async function PromoPage({ params }: { params: Params }) {
  const { lang, slug } = await params;
  if (!isLocale(lang)) notFound();
  const t = getDict(lang);
  const { promos, fetchedAt, details } = await getPromos(lang);
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
  const det = details?.[p.id];
  const cal: CalEvent | undefined = p.endsAt && p.endsAt > fetchedAt ? {
    uid: p.id.replace(/[^a-z0-9]/gi, "-"), title: `⏳ ${R.calTitle}: ${p.title}`.slice(0, 180), at: deadlineReminder(p.endsAt, fetchedAt),
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
    [t.detail.reward, m.apr !== undefined ? <span className="text-[#7ee787]">+{m.apr}% APR</span> : p.reward ? p.reward.label + (p.reward.usd && p.reward.unit !== "USD" ? ` (≈${compactUsd(p.reward.usd)})` : "") : t.detail.noData],
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
      <main className="mx-auto max-w-5xl px-4 pb-20 pt-8 sm:px-6">
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
              {(m.hot ?? 0) >= 60 && <span className="rounded-md bg-amber/10 px-2 py-1 text-amber">🔥 {m.hot}°</span>}
            </div>
            <h1 className="mt-3 font-display text-2xl font-semibold leading-tight tracking-tight sm:text-4xl">{isAggregator ? `${p.title} — Airdrop` : p.title}</h1>
            <p className="mt-2 text-ink-2">{p.venue.name}</p>
          </div>
        </header>

        <div className="mt-8 flex flex-wrap items-center gap-3">
          <a href={joinUrl} target="_blank" rel="noopener" className="btn btn-primary h-12 px-6 text-base">{p.category === "farming" ? t.card.open : t.card.join} ↗</a>
          {refUrl && <a href={refUrl} target="_blank" rel="sponsored noopener" className="btn btn-ghost h-12 px-6 text-base">{R.signup(p.venue.name)} ↗</a>}
          {p.category !== "farming" && <a href="#rules" className="btn btn-ghost h-12 px-6 text-base">{R.title} ↓</a>}
          <SaveButton id={p.id} labelAdd={t.saved.add} labelRemove={t.saved.remove} size="lg" />
        </div>

        {/* the three things people ask first: when it starts, when it ends, how much one person can get */}
        {p.category !== "farming" && (
          <div className={`mt-8 grid gap-3 sm:grid-cols-2 ${m.minEntry ? "lg:grid-cols-4" : "lg:grid-cols-3"}`}>
            <div className="card p-4 hover:transform-none">
              <div className="text-[11px] font-bold uppercase tracking-wider text-ink-3">{t.detail.start}</div>
              <div className="mt-1 font-mono text-sm font-bold text-ink">{p.startsAt ? dateFull(p.startsAt, lang) : p.publishedAt ? `${R.published} ${dateFull(p.publishedAt, lang)}` : "—"}</div>
            </div>
            <div className="card p-4 hover:transform-none">
              <div className="text-[11px] font-bold uppercase tracking-wider text-ink-3">{t.detail.end}</div>
              <div className="mt-1 font-mono text-sm font-bold text-ink">{p.endsAt ? dateFull(p.endsAt, lang) : R.noEnd}</div>
              {p.endsAt && <div className={`mt-0.5 text-xs font-bold ${p.endsAt - now < 3 * 86400_000 ? "text-rose" : "text-lime"}`}>⏳ {R.left} {duration(p.endsAt - now, t.time)}</div>}
              {cal && (
                <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[11px] font-bold">
                  <a href={googleCalUrl(cal)} target="_blank" rel="noopener" className="text-sky hover:underline">📅 Google</a>
                  <a href={icsHref([cal])} download={`promo-${slug.split("-")[0]}.ics`} className="text-sky hover:underline">📅 {R.calIcs}</a>
                  <span className="font-normal text-ink-3">{R.calNote}</span>
                </div>
              )}
            </div>
            <div className="card p-4 hover:transform-none ring-1 ring-lime/20">
              <div className="text-[11px] font-bold uppercase tracking-wider text-ink-3">{R.perUser}</div>
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
                <div className="text-[11px] font-bold uppercase tracking-wider text-ink-3">{R.minTitle}</div>
                <div className="mt-1 font-mono text-lg font-bold text-amber">{R.kind[m.minEntry.kind]} {R.from} {m.minEntry.unit === "USD" ? "$" : ""}{m.minEntry.amount.toLocaleString("en-US")}{m.minEntry.unit !== "USD" ? ` ${m.minEntry.unit}` : ""}</div>
                <div className="mt-1 line-clamp-2 text-[11px] leading-snug text-ink-3">“{m.minEntry.text}”</div>
              </div>
            )}
          </div>
        )}

        {/* who can join: region-exclusive / restricted countries / new users only */}
        {p.category !== "farming" && (m.geo || m.forNew || det) && (
          <div className="mt-3 flex flex-wrap items-center gap-2 rounded-2xl border border-line bg-white/[0.02] px-4 py-3 text-sm">
            <span className="text-[11px] font-bold uppercase tracking-wider text-ink-3">{R.geoTitle}:</span>
            {m.geo?.only && <span className="rounded-md bg-amber/10 px-2 py-0.5 font-bold text-amber">🌍 {R.geoOnly(m.geo.only)}</span>}
            {m.geo?.noUA && <span className="rounded-md bg-rose/10 px-2 py-0.5 font-bold text-rose">{R.geoNoUA}</span>}
            {m.geo?.noEU && <span className="rounded-md bg-rose/10 px-2 py-0.5 font-bold text-rose">{R.geoNoEU}</span>}
            {m.forNew && <span className="rounded-md bg-sky/10 px-2 py-0.5 font-bold text-sky">{R.forNew}</span>}
            {!m.geo?.only && !m.geo?.noUA && det && <span className="font-semibold text-ink-2">✓ {R.geoAll}</span>}
            {m.geo?.text && <span className="block w-full text-xs text-ink-3">“{m.geo.text}”</span>}
          </div>
        )}

        {/* key points pulled from the official rules */}
        {det && det.facts.length > 0 && (
          <section className="card mt-4 p-6 hover:transform-none ring-1 ring-lime/15">
            <h2 className="font-display text-xl font-semibold tracking-tight">📌 {R.keyTitle}</h2>
            <p className="mt-1 text-xs text-ink-3">{(det.translated ?? 0) > 0 ? R.keySubTr : R.keySub}</p>
            <dl className="mt-4 divide-y divide-line">
              {det.facts.map((f, i) => (
                <div key={i} className="grid gap-1 py-3 text-sm sm:grid-cols-[11rem_1fr] sm:gap-4">
                  <dt className="font-semibold text-ink-3">{R.fact[f.k]}</dt>
                  <dd className="text-ink">{f.text}</dd>
                </div>
              ))}
            </dl>
          </section>
        )}

        <div className="mt-10 grid gap-4 lg:grid-cols-[1.4fr_1fr]">
          <section className="card p-6 hover:transform-none">
            <h2 className="text-xs font-bold uppercase tracking-wider text-ink-3">{t.detail.facts}</h2>
            <dl className="mt-4 divide-y divide-line">
              {facts.map(([k, v]) => (
                <div key={k} className="grid grid-cols-[9rem_1fr] gap-4 py-3 text-sm">
                  <dt className="font-semibold text-ink-3">{k}</dt>
                  <dd className="font-semibold text-ink">{v}</dd>
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
              <div className={`text-sm font-bold ${isAggregator ? "text-amber" : "text-lime"}`}>{isAggregator ? `⚠ ${t.detail.aggregator}` : `✓ ${t.detail.official}`}</div>
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
            <h2 className="font-display text-xl font-semibold tracking-tight">📜 {R.title}</h2>
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

        <div className="mt-8 flex flex-wrap items-center justify-between gap-4 border-t border-line pt-6">
          <Share title={p.title} label={t.detail.share} copyLabel={t.detail.copy} copiedLabel={t.detail.copied} />
          <a href={SITE.telegram} target="_blank" rel="noopener" className="text-sm font-semibold text-ink-3 hover:text-ink">⚑ {t.detail.report}</a>
        </div>

        {related.length > 0 && (
          <section className="mt-14">
            <h2 className="font-display text-2xl font-semibold tracking-tight">{t.detail.related}</h2>
            <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {related.map((r, i) => <PromoCard key={r.id} p={r} t={t} lang={lang} now={now} index={i} />)}
            </div>
          </section>
        )}
      </main>
      <Footer t={t} fetchedAt={fetchedAt} lang={lang} />
    </>
  );
}
