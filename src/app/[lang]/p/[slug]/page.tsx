import { catLabel } from "@/lib/catlabel";
import { ldJson } from "@/lib/ldjson";
import { endedBySlug, endedPromos } from "@/lib/archive";
import { EndedPromo } from "./ended";
import { geoAllowed } from "@/lib/geo";
import { alt } from "@/lib/seo";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getDict, isLocale, type Locale } from "@/lib/i18n";
import { getPromos } from "@/lib/promos";
import { findBySlug, slugOf, statusOf } from "@/lib/slug";
import { compactUsd, duration, fixWording, fmtLabel, localNums, money, nfLocale, noEmoji, num, sentenceCase } from "@/lib/format";
import { SITE, VENUES, HAS_TG } from "@/config/site";
import { VenueLogo } from "@/components/VenueLogo";
import { Icon, type IconName } from "@/components/Icon";
// fact labels get an SVG icon instead of the emoji that used to be part of the text
/** Key facts grouped under one label each (audit 12.11: "Who can join" twice in a row), list dashes dropped,
 *  near-duplicate lines merged (the longer one stays). */
function factGroups(facts: Array<{ k: FactKey; text: string }>): Array<[FactKey, string[]]> {
  const words = (x: string) => new Set(x.toLowerCase().replace(/[^\p{L}\p{N}%]+/gu, " ").split(" ").filter((w) => w.length > 2));
  const same = (a: string, b: string) => { const A = words(a), B = words(b); const n = [...A].filter((w) => B.has(w)).length; return n / Math.max(1, Math.min(A.size, B.size)) >= 0.7; };
  const out = new Map<FactKey, string[]>();
  for (const f of facts) {
    const text = f.text.replace(/^\s*[-–—•*]\s*/, "").trim();
    if (!text) continue;
    const list = out.get(f.k) ?? [];
    const dup = list.findIndex((x) => same(x, text));
    if (dup < 0) list.push(text); else if (text.length > list[dup].length) list[dup] = text;
    out.set(f.k, list);
  }
  return [...out];
}
const FACT_ICON: Record<FactKey, IconName> = { period: "clock", who: "user", min: "cash", how: "checkCircle", payout: "gift", kyc: "id", region: "globe" };
import { SaveButton } from "@/components/SaveButton";
import { HideButton } from "@/components/HideButton";
import { SummaryTiles } from "@/components/SummaryTiles";
import { Share } from "@/components/Share";
import { PromoCard, CAT_STYLE, ValueLine } from "@/components/PromoCard";
import { Footer } from "@/components/Sections";
import type { Block, FactKey } from "@/lib/details";
import { deadlineReminder, googleCalUrl, icsHref, type CalEvent } from "@/lib/ics";
import { EarnCalc } from "@/components/EarnCalc";
import { SiteTour, TourButton } from "@/components/SiteTour";
import { PROMO_TOUR } from "@/lib/tours/promo";
import { tourOf } from "@/lib/tours/types";
import { titleOf } from "@/lib/titletpl";
import { combosFor, type ComboWhy } from "@/lib/combos";
import { FORM_BADGE, FORM_CLS, FORM_TEXT, timingChips } from "@/lib/payout-i18n";
import { withBase } from "@/lib/base";
import { regionName } from "@/lib/regions";
import { getTokens, isStableSym } from "@/lib/tokens";
import { prices } from "@/lib/pools";

export const revalidate = 900;
export const dynamicParams = false; // every page is pre-rendered at build (required by the static GitHub Pages export)
/** Pre-render every current promo (needed for the static GitHub Pages build). */
export async function generateStaticParams() {
  const { promos } = await getPromos();
  // + pages of promos that ended in the last 90 days ("Акція завершилась" instead of a 404)
  return [...promos.map((p) => ({ slug: slugOf(p) })), ...endedPromos(promos).map((e) => ({ slug: e.slug }))];
}

type Params = Promise<{ lang: string; slug: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { lang, slug } = await params;
  if (!isLocale(lang)) return {};
  const live = (await getPromos(lang)).promos;
  const p = findBySlug(live, slug);
  if (!p) {
    const e = endedBySlug(live, slug);
    if (!e) return { title: "404" };
    const tt = lang === "en" ? e.title : (e.titles[lang] ?? fixWording(e.title, lang));
    return { title: `${({ uk: "Завершилась", en: "Ended", ru: "Завершилась" } as const)[lang]}: ${tt}`, robots: { index: false, follow: true }, alternates: alt(lang, `/p/${slug}`) };
  }
  const t = getDict(lang);
  // a real sentence instead of "Bybit · Реферальна · 250 USDT" (audit 14.11): reward, what to do, deadline, what the page gives
  const D = ({
    uk: { per: (x: string) => `до ${x} на 1 людину`, pool: (x: string) => `фонд ${x}`, till: (d: string) => `до ${d}`, tail: "Умови українською, ризики і як забрати нагороду." },
    en: { per: (x: string) => `up to ${x} per person`, pool: (x: string) => `pool ${x}`, till: (d: string) => `until ${d}`, tail: "Plain-language terms, risks and how to claim." },
    ru: { per: (x: string) => `до ${x} на 1 человека`, pool: (x: string) => `фонд ${x}`, till: (d: string) => `до ${d}`, tail: "Условия по-русски, риски и как забрать награду." },
  } as const)[lang];
  const pm = p.meta;
  const amount = pm?.perUser ? D.per(money(pm.perUser.amount, pm.perUser.unit, lang)) : p.reward ? D.pool(fmtLabel(p.reward.label, lang)) : pm?.apr ? `+${num(pm.apr, lang)}% APR` : "";
  const till = p.endsAt ? D.till(new Date(p.endsAt).toLocaleDateString(lang === "uk" ? "uk-UA" : lang === "ru" ? "ru-RU" : "en-GB", { day: "numeric", month: "long", timeZone: "UTC" })) : "";
  const bits = `${p.venue.name} · ${catLabel(p, lang, t.cat)}${amount ? `: ${amount}` : ""}${till ? `, ${till}` : ""}. ${D.tail}`;
  // browser tab / search / Telegram preview: no emoji, no SHOUTING, at most ~90 characters (audit 12.11)
  const head = sentenceCase(noEmoji(p.title)).replace(/\s{2,}/g, " ").trim();
  // audit 23.11 (SEO): titles ran 24–118 characters and Google cuts at ~60 — our structured title ("Earn: USDT → до 10% APR")
  // with the venue in front says the same in half the length; the raw headline stays the fallback
  const tpl = titleOf(p, lang);
  const base = tpl ?? head;
  const named = base.toLowerCase().includes(p.venue.name.toLowerCase()) ? base : `${p.venue.name}: ${base}`;
  const cap = (x: string, n: number) => (x.length > n ? `${x.slice(0, n - 2).replace(/[\s,.:;—–-]+\S*$/, "")}…` : x);
  // audit 2 (25.11): 243 titles ran past 60 characters with " · PromoRadar" (13) added by the layout template
  const title = p.venue.kind === "airdrop" ? `${cap(head, 38)} Airdrop` : cap(named, 47);
  // audit 23.11 (SEO): 9 Biconomy pages shared one description — the promo's own headline makes each unique
  const desc = cap(`${tpl && tpl !== head ? `${head}${/[.!?…]$/.test(head) ? "" : "."} ` : ""}${bits}`, 155);   // Google shows ~155 (audit 2)
  // share card made by scripts/og-cards.mjs after the build (amount, deadline, exchange)
  const image = `https://${SITE.domain}/og/${slug}.png`;
  return {
    title, description: desc, alternates: alt(lang, `/p/${slug}`),
    openGraph: { title, description: desc, images: [{ url: image, width: 1200, height: 630 }] },
    twitter: { card: "summary_large_image", title, description: desc, images: [image] },
  };
}

const RULES_TX: Record<Locale, {
  title: string; keyTitle: string; keySub: string; translate: string; original: (v: string) => string; note: (v: string) => string; partial: string;
  none: (v: string) => string; more: string; signup: (v: string) => string; fact: Record<FactKey, string>;
  noteTr: (v: string) => string; keySubTr: string; coinMore: string;
  calTitle: string; calIcs: string; calNote: string; geoTitle: string; geoOnly: (r: string) => string; geoNoUA: string; geoNoEU: string; geoAll: string; geoVague: string; geoOcc: string; geoNone: string; forNew: string;
  minTitle: string; from: string; kind: Record<"trade" | "deposit" | "stake" | "hold" | "buy", string>;
  perUser: string; upTo: string; noCap: string; published: string; noEnd: string; left: string; poolShared: string; noCapShort: string;
}> = {
  uk: {
    coinMore: "усі акції та стейкінг", calTitle: "Дедлайн акції", calIcs: "iPhone / Outlook", calNote: "нагадування за день до кінця",
    geoTitle: "Для кого", geoOnly: (r) => (r === "region" ? "Лише для окремих регіонів — перевірте свою країну в умовах" : `Лише для регіону: ${regionName(r, "uk")}`), geoNoUA: "В умовах Україна серед обмежених країн", geoNoEU: "В умовах ЄС/ЄЕЗ серед обмежених регіонів", geoAll: "У списку обмежених країн України немає", geoVague: "Є обмеження за країнами, але список не наведено — перевірте свою країну на сайті біржі", geoOcc: "крім окупованих територій", geoNone: "Країни в умовах не згадано — перевірте на сайті біржі", forNew: "Лише для нових користувачів",
    noteTr: (v) => `Машинний переклад (DeepL) офіційних умов ${v}. Якщо щось незрозуміло або розходиться — діє оригінал на сайті біржі.`,
    keySubTr: "Ключові рядки з офіційних правил біржі (машинний переклад). Повний текст — нижче.",
    minTitle: "Щоб отримати хоч щось", from: "від", kind: { trade: "Торгівля", deposit: "Депозит", stake: "Стейк", hold: "Тримати", buy: "Купівля" },
    published: "опубліковано", noEnd: "Біржа не вказала дату завершення", left: "залишилось", poolShared: "Максимум на людину не вказано · спільний фонд", noCapShort: "Максимум на одну людину біржа не вказала — дивіться умови нижче",
    perUser: "Можна заробити (1 людина)", upTo: "до", noCap: "Біржа не вказує максимум на одну людину — нагорода ділиться між учасниками за правилами акції (див. нижче).",
    title: "Умови та правила", keyTitle: "Головне з правил", keySub: "Ключові рядки з офіційних правил біржі (мовою оригіналу). Повний текст — нижче.",
    translate: "Google-переклад оригіналу", original: (v) => `Оригінал на ${v}`,
    note: (v) => `Повний текст умов з офіційного оголошення ${v}, мовою оригіналу. Якщо щось розходиться — діють правила на сайті біржі.`,
    partial: "Біржа публікує тут лише короткий опис — повні правила за посиланням «Оригінал».",
    none: (v) => `Повний текст умов цієї акції опубліковано лише на сторінці ${v} — натисніть «Оригінал» або «Google-переклад оригіналу» вище.`,
    more: "Показати всі умови", signup: (v) => `Реєстрація на ${v}`,
    fact: { period: "Період", who: "Хто може брати участь", min: "Мінімальні вимоги", how: "Як взяти участь", payout: "Коли видадуть нагороди", kyc: "Верифікація (KYC)", region: "Обмеження по країнах" },
  },
  en: {
    coinMore: "all promos & staking", calTitle: "Promo deadline", calIcs: "iPhone / Outlook", calNote: "reminder a day before the end",
    geoTitle: "Who it's for", geoOnly: (r) => (r === "region" ? "Selected regions only — check your country in the rules" : `${r} region only`), geoNoUA: "The rules list Ukraine as restricted", geoNoEU: "The rules list the EU/EEA as restricted", geoAll: "Ukraine is not on the restricted-countries list", geoVague: "Country limits apply but are not listed — check your country on the exchange site", geoOcc: "except the occupied territories", geoNone: "The rules do not mention countries — check on the exchange site", forNew: "New users only",
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
    geoTitle: "Для кого", geoOnly: (r) => (r === "region" ? "Только для отдельных регионов — проверьте свою страну в условиях" : `Только для региона: ${regionName(r, "ru")}`), geoNoUA: "В условиях Украина среди ограниченных стран", geoNoEU: "В условиях ЕС/ЕЭЗ среди ограниченных регионов", geoAll: "Украины нет в списке ограниченных стран", geoVague: "Есть ограничения по странам, но список не приведён — проверьте свою страну на сайте биржи", geoOcc: "кроме оккупированных территорий", geoNone: "Страны в условиях не упомянуты — проверьте на сайте биржи", forNew: "Только для новых пользователей",
    noteTr: (v) => `Машинный перевод (DeepL) официальных условий ${v}. Если что-то непонятно или расходится — действует оригинал на сайте биржи.`,
    keySubTr: "Ключевые строки из официальных правил биржи (машинный перевод). Полный текст — ниже.",
    minTitle: "Чтобы получить хоть что-то", from: "от", kind: { trade: "Торговля", deposit: "Депозит", stake: "Стейк", hold: "Держать", buy: "Покупка" },
    published: "опубликовано", noEnd: "Биржа не указала дату окончания", left: "осталось", poolShared: "Максимум на человека не указан · общий фонд", noCapShort: "Максимум на одного человека биржа не указала — смотрите условия ниже",
    perUser: "Можно заработать (1 человек)", upTo: "до", noCap: "Биржа не указывает максимум на одного человека — награда делится между участниками по правилам акции (см. ниже).",
    title: "Условия и правила", keyTitle: "Главное из правил", keySub: "Ключевые строки из официальных правил биржи (на языке оригинала). Полный текст — ниже.",
    translate: "Google-перевод оригинала", original: (v) => `Оригинал на ${v}`,
    note: (v) => `Полный текст условий из официального объявления ${v}, на языке оригинала. Если что-то расходится — действуют правила на сайте биржи.`,
    partial: "Биржа публикует здесь только краткое описание — полные правила по ссылке «Оригинал».",
    none: (v) => `Полный текст условий этой акции опубликован только на странице ${v} — нажмите «Оригинал» или «Google-перевод оригинала» выше.`,
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
// audit 27.11 (texts): "🔗👉 Дізнатися більше", "🛒👉 Внести зараз", a lone "👉" or "👉 https://…" — dead calls to action
// from the post (no link here); rules cells kept "3,000 USDT" under "150 000 USDT"
const CTA_LINE = /^[\s\p{Extended_Pictographic}\u{FE0F}\u{200D}→➡]*[\p{Extended_Pictographic}→➡][\s\p{Extended_Pictographic}\u{FE0F}\u{200D}→➡]*(https?:\/\/\S+|[^\d\n]{0,45})$/u;
function Rules({ blocks: all, more, lang }: { blocks: Block[]; more: string; lang: string }) {
  const L = (x: string) => localNums(x, lang);
  const blocks = all.filter((b) => b.t === "tr" || !CTA_LINE.test(b.x.trim()) || /[:：]$/.test(b.x.trim()))
    .map((b) => ({ ...b, x: L(b.x), cells: b.cells?.map(L) }));
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
          <summary className="inline-flex cursor-pointer list-none items-center gap-1 pt-2 text-sm font-bold text-lime group-open:hidden [&::-webkit-details-marker]:hidden"><Icon name="chevronDown" className="size-4" /> {more}</summary>
          <div className="space-y-2">{groups.slice(cut).map((g, i) => render(g, cut + i))}</div>
        </details>
      )}
    </div>
  );
}

const dateFull = (ts: number, lang: Locale) =>
  new Date(ts).toLocaleString(lang === "uk" ? "uk-UA" : lang === "ru" ? "ru-RU" : "en-GB", { day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit", timeZone: "UTC" }) + " UTC";

const PAY_TX: Record<Locale, { title: string; unknown: string; quote: string; more: string; remind: string; calTitle: string; calDesc: (claim?: number) => string }> = {
  uk: { title: "Що ви реально отримаєте", unknown: "Тип нагороди не вказано", quote: "Що сказано в правилах:", more: "Що таке ваучери, бонуси й бали →",
    remind: "Нагадати забрати нагороду:", calTitle: "🎁 Забрати нагороду", calDesc: (c) => `Перевірте Центр нагород на біржі й заберіть нагороду${c ? ` — на це є ${c} дн., потім вона згорає` : ""}.` },
  en: { title: "What you actually get", unknown: "Reward type not stated", quote: "What the rules say:", more: "Vouchers, bonuses and points explained →",
    remind: "Remind me to claim the reward:", calTitle: "🎁 Claim your reward", calDesc: (c) => `Check the exchange's rewards center and claim your reward${c ? ` — you have ${c} days before it expires` : ""}.` },
  ru: { title: "Что вы реально получите", unknown: "Тип награды не указан", quote: "Что сказано в правилах:", more: "Что такое ваучеры, бонусы и баллы →",
    remind: "Напомнить забрать награду:", calTitle: "🎁 Забрать награду", calDesc: (c) => `Проверьте Центр наград на бирже и заберите награду${c ? ` — на это есть ${c} дн., потом она сгорит` : ""}.` },
};

const COMBO_TX: Record<Locale, { title: string; sub: (v: string) => string; why: Record<ComboWhy, string>; upTo: string; sum: (x: string, n: number) => string; note: string }> = {
  uk: {
    title: "Можна поєднати", sub: (v) => `Ці акції ${v} йдуть одночасно й рахують ту саму дію — один обсяг або депозит може зарахуватися одразу в кілька.`,
    why: { "trade-futures": "той самий обсяг ф'ючерсів", "trade-spot": "той самий обсяг споту", deposit: "той самий депозит", stake: "той самий стейк", free: "теж без вкладень" },
    upTo: "до", sum: (x, n) => `Разом реально ≈${x} на людину з ${n} акцій`, note: "Деякі біржі не зараховують обсяг двічі або забороняють участь у кількох кампаніях — перевірте це в правилах кожної акції.",
  },
  en: {
    title: "Can be combined", sub: (v) => `These ${v} promos run at the same time and count the same action — one volume or deposit may count in several at once.`,
    why: { "trade-futures": "same futures volume", "trade-spot": "same spot volume", deposit: "same deposit", stake: "same stake", free: "also no deposit" },
    upTo: "up to", sum: (x, n) => `Realistically ≈${x} per person across ${n} promos`, note: "Some exchanges don't count volume twice or forbid joining several campaigns — check each promo's rules.",
  },
  ru: {
    title: "Можно совместить", sub: (v) => `Эти акции ${v} идут одновременно и считают одно и то же действие — один объём или депозит может засчитаться сразу в несколько.`,
    why: { "trade-futures": "тот же объём фьючерсов", "trade-spot": "тот же объём спота", deposit: "тот же депозит", stake: "тот же стейк", free: "тоже без вложений" },
    upTo: "до", sum: (x, n) => `Вместе реально ≈${x} на человека из ${n} акций`, note: "Некоторые биржи не засчитывают объём дважды или запрещают участие в нескольких кампаниях — проверьте это в правилах каждой акции.",
  },
};
const UI_TX: Record<Locale, {
  reward: string; action: string; time: string; who: string; allUsers: string; cat: Record<"competition" | "referral" | "airdrop" | "listing" | "bonus" | "earn" | "other", string>; fund: string; noAmount: string; noDeposit: string; tasks: string; seeRules: string;
  left: string; startsIn: string; noEnd: string; forAll: string; uaOk: string; notUA: string; onlyNew: string; kyc: string; region: (r: string) => string;
  todo: string; good: string; more: string; ex: string; exTasks: string; quote: string;
  s: { reg: (v: string, kyc: boolean, nw: boolean) => string; act: Record<"trade" | "deposit" | "stake" | "hold" | "buy", (a: string, fut: boolean) => string>; free: string; rank: string; join: string; auto: string; manual: string; unknown: string };
}> = {
  uk: {
    reward: "Нагорода", action: "Що зробити", time: "Час", who: "Хто може", allUsers: "Усі користувачі",
    cat: { competition: "Торгувати — рейтинг", referral: "Запросити друзів", airdrop: "Виконати завдання", listing: "Торгувати новим токеном", bonus: "Депозит або торгівля", earn: "Покласти в Earn", other: "Виконати умови" }, fund: "фонд", noAmount: "не вказано", noDeposit: "Без вкладень", tasks: "Завдання", seeRules: "див. умови",
    left: "залишилось", startsIn: "старт через", noEnd: "без дати", forAll: "Обмежень не знайдено", uaOk: "Україна", notUA: "Не для України", onlyNew: "Лише нові", kyc: "KYC", region: (r) => (r === "region" ? "Окремі регіони" : `Лише ${regionName(r, "uk")}`),
    todo: "Що зробити", good: "Що варто знати", more: "Показати умови повністю", ex: "Завдання на сторінці біржі", exTasks: "Кожне завдання — окрема нагорода", quote: "Як написано в правилах",
    s: {
      reg: (v, kyc, nw) => `Зареєструйтесь на ${v}${nw ? " (новий акаунт)" : ""}${kyc ? " і пройдіть KYC" : ""}`,
      act: { trade: (a, f) => `Торгуйте на суму від ${a}${f ? " на ф'ючерсах" : ""}`, deposit: (a) => `Внесіть депозит від ${a}`, stake: (a) => `Застейкайте від ${a}`, hold: (a) => `Тримайте на рахунку від ${a}`, buy: (a) => `Купіть на суму від ${a}` },
      free: "Виконайте завдання акції — без вкладень", rank: "Торгуйте: місце в рейтингу визначає нагороду", join: "Натисніть «Приєднатися» (Join / Register) на сторінці акції — обсяг до цього не рахується", auto: "Нагорода прийде на рахунок автоматично", manual: "Заберіть нагороду вручну після завершення", unknown: "Як отримати нагороду — дивіться в умовах (часто треба натиснути «Забрати»)",
    },
  },
  en: {
    reward: "Reward", action: "What to do", time: "Time", who: "Who can join", allUsers: "All users",
    cat: { competition: "Trade — leaderboard", referral: "Invite friends", airdrop: "Do the tasks", listing: "Trade the new token", bonus: "Deposit or trade", earn: "Put in Earn", other: "Meet the conditions" }, fund: "pool", noAmount: "not stated", noDeposit: "No deposit", tasks: "Tasks", seeRules: "see the rules",
    left: "left", startsIn: "starts in", noEnd: "no end date", forAll: "No restrictions found", uaOk: "Ukraine", notUA: "Not for Ukraine", onlyNew: "New users only", kyc: "KYC", region: (r) => (r === "region" ? "Some regions" : `${r} only`),
    todo: "What to do", good: "Good to know", more: "Show the full conditions", ex: "Tasks on the exchange page", exTasks: "Each task is a separate reward", quote: "As written in the rules",
    s: {
      reg: (v, kyc, nw) => `Sign up on ${v}${nw ? " (new account)" : ""}${kyc ? " and pass KYC" : ""}`,
      act: { trade: (a, f) => `Trade from ${a}${f ? " in futures" : ""}`, deposit: (a) => `Deposit from ${a}`, stake: (a) => `Stake from ${a}`, hold: (a) => `Hold from ${a} on your account`, buy: (a) => `Buy for ${a} or more` },
      free: "Do the promo's tasks — no deposit", rank: "Trade: your leaderboard place decides the reward", join: "Press “Join / Register” on the promo page — volume before that does not count", auto: "The reward is credited automatically", manual: "Claim the reward by hand after the end", unknown: "How the reward is paid — see the rules (often you must press “Claim”)",
    },
  },
  ru: {
    reward: "Награда", action: "Что сделать", time: "Время", who: "Кто может", allUsers: "Все пользователи",
    cat: { competition: "Торговать — рейтинг", referral: "Пригласить друзей", airdrop: "Выполнить задания", listing: "Торговать новым токеном", bonus: "Депозит или торговля", earn: "Положить в Earn", other: "Выполнить условия" }, fund: "фонд", noAmount: "не указано", noDeposit: "Без вложений", tasks: "Задания", seeRules: "см. условия",
    left: "осталось", startsIn: "старт через", noEnd: "без даты", forAll: "Ограничений не найдено", uaOk: "Украина", notUA: "Не для Украины", onlyNew: "Только новые", kyc: "KYC", region: (r) => (r === "region" ? "Отдельные регионы" : `Только ${regionName(r, "ru")}`),
    todo: "Что сделать", good: "Что стоит знать", more: "Показать условия полностью", ex: "Задания на странице биржи", exTasks: "Каждое задание — отдельная награда", quote: "Как написано в правилах",
    s: {
      reg: (v, kyc, nw) => `Зарегистрируйтесь на ${v}${nw ? " (новый аккаунт)" : ""}${kyc ? " и пройдите KYC" : ""}`,
      act: { trade: (a, f) => `Торгуйте на сумму от ${a}${f ? " на фьючерсах" : ""}`, deposit: (a) => `Внесите депозит от ${a}`, stake: (a) => `Застейкайте от ${a}`, hold: (a) => `Держите на счёте от ${a}`, buy: (a) => `Купите на сумму от ${a}` },
      free: "Выполните задания акции — без вложений", rank: "Торгуйте: место в рейтинге определяет награду", join: "Нажмите «Участвовать» (Join / Register) на странице акции — объём до этого не учитывается", auto: "Награда придёт на счёт автоматически", manual: "Заберите награду вручную после окончания", unknown: "Как получить награду — смотрите в условиях (часто нужно нажать «Забрать»)",
    },
  },
};

/** "Sign Up & Deposit, Get 40 USDT" + its one-line description from a campaign page (KuCoin-style task lists). */
function tasksOf(blocks: Array<{ t: string; x: string }>): Array<{ title: string; desc?: string }> {
  const out: Array<{ title: string; desc?: string }> = [];
  for (let i = 0; i < blocks.length && out.length < 6; i++) {
    const b = blocks[i], x = b.x.trim();
    if (b.t !== "h" || x.length > 90 || !/(\d[\d,.]*\s?(USDT|USDC|USD|BTC|ETH)\b|\$\s?\d)/.test(x)) continue;
    const next = blocks[i + 1];
    out.push({ title: x, desc: next && next.t !== "h" && next.x.length <= 220 ? next.x.trim() : undefined });
  }
  return out.length >= 2 ? out : [];
}

const FAQ_TX: Record<Locale, { how: string; steps: string; when: string; form: string; claim: string; watch: string; title: string; note: (venue: string) => string }> = {
  uk: { how: "Як це працює — простими словами", steps: "Що зробити", when: "Коли прийде нагорода", form: "У якій формі", claim: "Як отримати", watch: "На що звернути увагу", title: "Часті питання",
    note: (v) => `Пояснення склав AI тільки за офіційними правилами ${v}. Він може помилитися — перед участю звірте важливе з умовами нижче.` },
  en: { how: "How it works — in plain words", steps: "What to do", when: "When the reward arrives", form: "In what form", claim: "How to get it", watch: "Watch out for", title: "Common questions",
    note: (v) => `Explained by AI strictly from ${v}'s official rules. It can make mistakes — check anything important against the terms below.` },
  ru: { how: "Как это работает — простыми словами", steps: "Что сделать", when: "Когда придёт награда", form: "В какой форме", claim: "Как получить", watch: "На что обратить внимание", title: "Частые вопросы",
    note: (v) => `Пояснение составил AI только по официальным правилам ${v}. Он может ошибаться — перед участием сверьте важное с условиями ниже.` },
};

// referral promos: the steps and the reward say who gets what (owner 13.11)
const REF = {
  uk: { both: (x: string) => `${x} вам і стільки ж другу`, link: "Візьміть своє реферальне посилання або код у розділі «Запросити друзів»", friend: (c: string) => `Друг реєструється за вашим посиланням${c ? ` і ${c}` : " і виконує умову акції"}`, does: { trade: (a: string, f: boolean) => `торгує на суму від ${a}${f ? " на ф'ючерсах" : ""}`, deposit: (a: string) => `вносить депозит від ${a}`, stake: (a: string) => `стейкає від ${a}`, hold: (a: string) => `тримає від ${a}`, buy: (a: string) => `купує на суму від ${a}` }, paid: "Бонус нараховується вам після виконання умов другом", paidBoth: "Бонус отримуєте і ви, і друг — після виконання умов" },
  en: { both: (x: string) => `${x} for you and the same for your friend`, link: "Get your referral link or code in “Invite friends”", friend: (c: string) => `Your friend signs up with your link${c ? ` and ${c}` : " and meets the promo condition"}`, does: { trade: (a: string, f: boolean) => `trades ${a} or more${f ? " in futures" : ""}`, deposit: (a: string) => `deposits ${a} or more`, stake: (a: string) => `stakes ${a} or more`, hold: (a: string) => `holds ${a} or more`, buy: (a: string) => `buys ${a} or more` }, paid: "You get the bonus once your friend meets the conditions", paidBoth: "Both you and your friend get the bonus once the conditions are met" },
  ru: { both: (x: string) => `${x} вам и столько же другу`, link: "Возьмите свою реферальную ссылку или код в разделе «Пригласить друзей»", friend: (c: string) => `Друг регистрируется по вашей ссылке${c ? ` и ${c}` : " и выполняет условие акции"}`, does: { trade: (a: string, f: boolean) => `торгует на сумму от ${a}${f ? " на фьючерсах" : ""}`, deposit: (a: string) => `вносит депозит от ${a}`, stake: (a: string) => `стейкает от ${a}`, hold: (a: string) => `держит от ${a}`, buy: (a: string) => `покупает на сумму от ${a}` }, paid: "Бонус начисляется вам после выполнения условий другом", paidBoth: "Бонус получаете и вы, и друг — после выполнения условий" },
} as const;

export default async function PromoPage({ params }: { params: Params }) {
  const { lang, slug } = await params;
  if (!isLocale(lang)) notFound();
  const t = getDict(lang);
  const { promos, fetchedAt, details, faq: faqs } = await getPromos(lang);
  const p = findBySlug(promos, slug);
  if (!p) {
    const e = endedBySlug(promos, slug);
    if (!e) notFound();
    return <EndedPromo e={e} lang={lang} t={t} live={promos} now={fetchedAt} />;
  }
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
  // locked / fixed-term products and Dual Investment carry more than price risk (audit 14.11: "the only risk is the price")
  const ruleText = `${p.titleOrig ?? p.title} ${(det?.blocks ?? []).slice(0, 60).map((b) => b.x).join(" ")}`;
  const flexible = /\b(no|without|zero)[- ]lock(ed)?(-?up| period)?\b|\bflexible\b|без (блокування|періоду блокування|блокировки)/i.test(`${p.titleOrig ?? p.title} ${p.title}`);
  const lock: "lock" | "dual" | "futures" | undefined = m.futures || /\b(futures|perps?|perpetual|leverage)\b/i.test(p.titleOrig ?? p.title) ? "futures"
    : /\bdual (investment|asset|currency)|двовалют|двухвалют/i.test(ruleText) ? "dual"
    : !flexible && /\b(locked|fixed[- ]term|lock[- ]?up|lock period|\d+[- ]day (fixed|locked|term)|early redemption|redeem(ed)? early|достроков|заблоков)/i.test(ruleText) ? "lock" : undefined;
  const ex = faqs?.[p.id]?.[lang];
  const faq = ex?.faq ?? [];
  const FQ = FAQ_TX[lang];
  // token pages this promo appears on (its reward coin and tickers in the headline)
  const { tokens } = await getTokens(lang);
  const coins = [...tokens.values()].filter((x) => !isStableSym(x.sym) && x.promos.some((q) => q.id === p.id)).slice(0, 4);
  const cal: CalEvent | undefined = p.endsAt && p.endsAt > fetchedAt && !p.meta?.standing ? {
    uid: p.id.replace(/[^a-z0-9]/gi, "-"), title: Array.from(`⏳ ${R.calTitle}: ${p.title}`).slice(0, 180).join(""), at: deadlineReminder(p.endsAt, fetchedAt),
    description: `${p.venue.name} · ${dateFull(p.endsAt, lang)}`, url: `https://${SITE.domain}/${lang}/p/${slug}/`,
  } : undefined;
  const tr = translateUrl(p.url, lang);
  // other promos on this exchange the same action counts toward (one volume / deposit → several rewards)
  const combos = combosFor(p, promos, now);
  const C = COMBO_TX[lang];
  // audit 2 (25.11): "Разом до ≈$150K на людину" added 1st-place prizes — the sum is of realistic estimates, contests' tops excluded
  const comboSum = [p, ...combos.map((c) => c.p)].reduce((s2, x) => s2 + (x.meta?.value && x.meta.value.mech !== "apr" && x.meta.value.mech !== "top_n" && x.meta.value.basis !== "chance" && x.meta.value.basis !== "max" ? Math.max(0, x.meta.value.net ?? 0) : 0), 0);
  // audit 23.11: on uk pages a Brazil-only promo showed under "Схожі акції" — the default country there is Ukraine
  // audit 23.11: also no promo the site itself marks as "no better than regular Earn" / "costs eat the bonus"
  const relOk = (x: (typeof promos)[number]) => (lang !== "uk" || geoAllowed(x, "ua")) && !(x.meta?.value?.net !== undefined && x.meta.value.net <= 0);
  const related = [
    ...promos.filter((x) => x.id !== p.id && x.venue.id === p.venue.id && relOk(x)),
    ...promos.filter((x) => x.id !== p.id && x.venue.id !== p.venue.id && x.category === p.category && relOk(x)),
  ].slice(0, 6);

  // dollar value of coin amounts: the exchange's own figure, else the current Gate price of the coin (audit 12.11)
  const { px } = await prices().catch(() => ({ px: {} as Record<string, number> }));
  const inUsd = (amount: number, unit: string, known?: number) => /^(USD|FDUSD|PYUSD|DAI|RLUSD)/i.test(unit) ? undefined : known ?? ( px[unit.toUpperCase()] ? amount * px[unit.toUpperCase()] : undefined);
  const rewardUsd = p.reward && p.reward.unit !== "USD" ? inUsd(p.reward.amount, p.reward.unit, p.reward.usd) : undefined;
  // coin tickers in our title link to their token page ("Аірдроп: WLFI → …"), audit 12.11
  const linkCoins = (text: string): React.ReactNode => {
    if (!coins.length) return text;
    const re = new RegExp(`\\b(${coins.map((c) => c.sym.replace(/[^A-Z0-9]/gi, "")).join("|")})\\b`, "g");
    return text.split(re).map((part, i) => (i % 2 ? <Link key={i} href={`/${lang}/t/${part}`} className="underline decoration-line-2 decoration-2 underline-offset-4 hover:text-lime">{part}</Link> : part));
  };
  const pu = m.perUser;
  // referral promos: is the bonus paid to both sides? (owner 13.11: Pump.fun pays the inviter too, the page didn't say so)
  const refBoth = p.category === "referral" && /\b(both of you|for both|you and your friend|you and the friend|both the referrer|both parties|referrer and (the )?referee|each of you)\b|for you\b.{0,40}\bfor (your|the) friends?|(вам|ви),? (і|й|та) (йому|другу|запрошеному)|і вам,? і (йому|другу)|обидва|вам и (ему|другу)|и вам,? и (ему|другу)/i.test(`${p.titleOrig ?? ""} ${p.title} ${JSON.stringify(det ?? "")}`);
  const puUsd = pu ? inUsd(pu.amount, pu.unit, pu.usd) : undefined;
  const perUserCell: React.ReactNode = pu ? (
    <span>
      <span className="text-lime">{R.upTo} {pu.amount.toLocaleString(nfLocale(lang))} {pu.unit}</span>
      {puUsd !== undefined && pu.unit !== "USD" && !/^USD/.test(pu.unit) && <span className="text-ink-3"> (≈{compactUsd(puUsd, lang)})</span>}
      {pu.text.trim() && <span className="mt-1 block text-xs font-normal text-ink-3">“{pu.text}”</span>}
    </span>
  ) : <span className="font-normal text-ink-2">{p.category === "earn" || m.aprPct !== undefined || m.apr !== undefined ? ({ uk: "Дохід залежить від суми й ставки (APR) — нічого не ділиться між учасниками; ліміт суми дивіться в умовах.", en: "Income depends on the amount and the rate (APR) — nothing is split between participants; see the rules for the amount limit.", ru: "Доход зависит от суммы и ставки (APR) — ничего не делится между участниками; лимит суммы смотрите в условиях." } as const)[lang]
    : p.category === "referral" ? ({ uk: "Нагорода — за кожного друга, який виконав умову.", en: "The reward is per friend who meets the condition.", ru: "Награда — за каждого друга, выполнившего условие." } as const)[lang] : R.noCap}</span>;
  const facts: Array<[string, React.ReactNode]> = [
    [t.detail.reward, m.apr !== undefined ? <span className="text-success">+{num(m.apr, lang)}% APR</span> : p.reward ? <>{fmtLabel(p.reward.label, lang)}{rewardUsd ? <span className="text-ink-3"> ≈ {compactUsd(rewardUsd, lang)}</span> : null}</> : t.detail.noData],
      ...(p.category !== "farming" ? [[R.perUser, perUserCell] as [string, React.ReactNode]] : []),
    [t.detail.start, p.startsAt ? dateFull(p.startsAt, lang) : t.detail.noData],
    [t.detail.end, p.endsAt ? <>{dateFull(p.endsAt, lang)} <span className="text-ink-3">· {duration(p.endsAt - now, t.time)}</span></> : p.evergreen ? t.card.ongoing : t.detail.noData],
    [t.detail.published, p.publishedAt ? dateFull(p.publishedAt, lang) : t.detail.noData],
  ];
  if (m.chain) facts.push([t.detail.chain, m.chain]);
  if (m.tvlUsd) facts.push([t.card.tvl, compactUsd(m.tvlUsd, lang)]);
  facts.push([t.detail.source, m.source ?? `${p.venue.name} · ${new URL(p.url).hostname}`]);

  return (
    <>
      <main className="mx-auto max-w-7xl px-4 pb-20 pt-8 sm:px-6">
        {/* audit 23.11 (SEO): breadcrumbs for search results — Home › exchange › promo */}
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: ldJson({
          "@context": "https://schema.org", "@type": "BreadcrumbList",
          itemListElement: [
            { "@type": "ListItem", position: 1, name: "PromoRadar", item: `https://${SITE.domain}/${lang}/` },
            ...(venueCfg ? [{ "@type": "ListItem", position: 2, name: p.venue.name, item: `https://${SITE.domain}/${lang}/v/${p.venue.id}/` }] : []),
            { "@type": "ListItem", position: venueCfg ? 3 : 2, name: own ?? p.title, item: `https://${SITE.domain}/${lang}/p/${slug}/` },
          ],
        }).replace(/</g, "\\u003c") }} />
        <nav aria-label={({ uk: "Навігація", en: "Breadcrumbs", ru: "Навигация" } as const)[lang]} className="flex flex-wrap items-center gap-2 text-sm font-semibold text-ink-3">
          <Link href={`/${lang}#promos`} className="inline-flex min-h-8 items-center hover:text-ink">← {t.detail.back}</Link>
          <span>/</span>
          {venueCfg ? <Link href={`/${lang}/v/${p.venue.id}`} className="hover:text-ink">{p.venue.name}</Link> : <span>{p.venue.name}</span>}
        </nav>

        <header data-tour="promo-head" className="mt-6 flex flex-col gap-6 md:flex-row md:items-start">
          <VenueLogo v={p.venue} size={72} rounded="rounded-2xl" />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2 text-xs font-bold">
              <span className={`inline-flex items-center gap-1.5 rounded-md bg-white/5 px-2 py-1 ${CAT_STYLE[p.category].text}`}>
                <span className="size-1.5 rounded-full" style={{ background: CAT_STYLE[p.category].dot }} /> {p.meta?.zeroFee && p.category === "other" ? ({ uk: "0% комісії", en: "0% fees", ru: "0% комиссии" } as const)[lang] : catLabel(p, lang, t.cat)}
              </span>
              <span className={`rounded-md px-2 py-1 ${st === "ending" ? "bg-rose/10 text-rose" : st === "upcoming" ? "bg-sky/10 text-sky" : "bg-lime/10 text-lime"}`}>{t.status[st]}</span>
              {m.confirmed && <span className="rounded-md bg-teal/10 px-2 py-1 text-teal">✓ {t.card.confirmed}</span>}
              {(m.hot ?? 0) >= 60 && <span className="rounded-md bg-amber/10 px-2 py-1 text-amber"><Icon name="flame" /> {m.hot}°</span>}
            </div>
            {/* H1 = our short title; the exchange's own headline is in the rules below (audit 12.11: less text up top) */}
            <h1 className={`mt-3 break-words leading-tight tracking-tight ${own ? "font-display text-2xl font-semibold sm:text-4xl" : "text-2xl font-bold sm:text-3xl"}`} title={own ? p.title : undefined}>
              {own ? linkCoins(own) : sentenceCase(noEmoji(isAggregator ? `${p.title} — Airdrop` : p.title))}
            </h1>
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
            <TourButton lang={lang} className="mt-2" />
          </div>
        </header>

        <div data-tour="promo-actions" className="mt-8 flex flex-wrap items-center gap-3">
          <a href={joinUrl} target="_blank" rel="noopener" className="btn btn-primary h-12 px-6 text-base">{p.category === "farming" ? t.card.open : t.card.join} ↗</a>
          {refUrl && <a href={refUrl} target="_blank" rel="sponsored noopener" className="btn btn-ghost h-12 px-6 text-base">{R.signup(p.venue.name)} ↗<span className="ml-1.5 rounded bg-white/10 px-1 py-0.5 text-xs font-bold uppercase tracking-wide text-ink-3" title={({ uk: "Реферальне посилання: ми можемо отримати комісію від біржі. Для вас умови ті самі.", en: "Referral link: we may earn a commission from the exchange. Your terms are the same.", ru: "Реферальная ссылка: мы можем получить комиссию от биржи. Для вас условия те же." } as const)[lang]}>{({ uk: "реф.", en: "ref", ru: "реф." } as const)[lang]}</span></a>}
          {p.category !== "farming" && <a href="#rules" className="btn btn-ghost h-12 px-6 text-base">{R.title} ↓</a>}
          <SaveButton id={p.id} labelAdd={t.saved.add} labelRemove={t.saved.remove} size="lg" />
          <HideButton id={p.id} lang={lang} size="lg" />
        </div>

        {/* DeFi pool pages had only "Open ↗" (audit 14.11): what it is, what can go wrong, how to join */}
        {p.category === "farming" && (() => {
          // audit 2 (25.11): MetaMask / Rabby don't work on Solana or Sui — the wallet hint follows the chain
          const ch = (m.chain ?? "").toLowerCase();
          const wallet = /solana/.test(ch) ? "Phantom, Solflare" : /sui/.test(ch) ? "Slush, Phantom" : /aptos/.test(ch) ? "Petra" : /ton/.test(ch) ? "Tonkeeper" : /tron/.test(ch) ? "TronLink" : /starknet/.test(ch) ? "Ready (Argent), Braavos" : /bitcoin|btc/.test(ch) ? "Xverse, Unisat" : "MetaMask, Rabby";
          const F = ({
            uk: { what: "Що це", whatT: `Пул ліквідності / депозит у протоколі ${p.venue.name}${m.chain ? ` (мережа ${m.chain})` : ""}. Ви вносите монети зі свого гаманця — протокол платить відсоток${m.apr !== undefined ? ` (зараз ≈ ${m.apr}% річних, ставка змінюється щодня)` : ""}.`,
              risk: "Ризики", risks: ["Ставка плаває: показаний APR — це «зараз», а не обіцянка.", "Ризик смарт-контракту: збій чи злам протоколу може коштувати вкладу.", "Якщо в пулі не лише стейблкоїни — можливі непостійні втрати (IL) через зміну ціни.", "Комісія мережі (газ) за вхід і вихід."],
              how: "Як взяти участь", hows: [`Потрібен гаманець (${wallet}) з монетами в потрібній мережі.`, `Відкрийте пул на сайті ${p.venue.name} кнопкою вище, підключіть гаманець і внесіть суму.`, "Почніть з невеликої суми й перевірте, що депозит видно в протоколі."], more: "Порівняти з іншими DeFi-пулами →" },
            en: { what: "What it is", whatT: `A liquidity pool / deposit in ${p.venue.name}${m.chain ? ` (${m.chain} chain)` : ""}. You deposit coins from your own wallet and the protocol pays interest${m.apr !== undefined ? ` (≈ ${m.apr}% a year right now; the rate changes daily)` : ""}.`,
              risk: "Risks", risks: ["The rate floats: the APR shown is “now”, not a promise.", "Smart-contract risk: a bug or hack can cost the deposit.", "If the pool holds more than stablecoins, price moves cause impermanent loss (IL).", "Network fees (gas) to enter and exit."],
              how: "How to join", hows: [`You need a wallet (${wallet}) with coins on the right chain.`, `Open the pool on ${p.venue.name} with the button above, connect the wallet and deposit.`, "Start small and check that the deposit shows up in the protocol."], more: "Compare with other DeFi pools →" },
            ru: { what: "Что это", whatT: `Пул ликвидности / депозит в протоколе ${p.venue.name}${m.chain ? ` (сеть ${m.chain})` : ""}. Вы вносите монеты со своего кошелька — протокол платит процент${m.apr !== undefined ? ` (сейчас ≈ ${m.apr}% годовых, ставка меняется ежедневно)` : ""}.`,
              risk: "Риски", risks: ["Ставка плавает: показанный APR — это «сейчас», а не обещание.", "Риск смарт-контракта: сбой или взлом протокола может стоить вклада.", "Если в пуле не только стейблкоины — возможны непостоянные потери (IL) из-за изменения цены.", "Комиссия сети (газ) за вход и выход."],
              how: "Как участвовать", hows: [`Нужен кошелёк (${wallet}) с монетами в нужной сети.`, `Откройте пул на сайте ${p.venue.name} кнопкой выше, подключите кошелёк и внесите сумму.`, "Начните с небольшой суммы и проверьте, что депозит виден в протоколе."], more: "Сравнить с другими DeFi-пулами →" },
          } as const)[lang];
          return (
            <section data-tour="promo-summary" className="card mt-6 grid gap-6 p-6 hover:transform-none md:grid-cols-3">
              <div><h2 className="font-bold">{F.what}</h2><p className="mt-2 text-sm leading-relaxed text-ink-2">{F.whatT}</p></div>
              <div><h2 className="font-bold">{F.risk}</h2><ul className="mt-2 space-y-1.5 text-sm text-ink-2">{F.risks.map((x) => <li key={x} className="flex gap-2"><span className="text-amber">•</span>{x}</li>)}</ul></div>
              <div><h2 className="font-bold">{F.how}</h2><ol className="mt-2 space-y-1.5 text-sm text-ink-2">{F.hows.map((x, i) => <li key={x} className="flex gap-2"><span className="shrink-0 whitespace-nowrap font-mono text-lime">{i + 1}.</span>{x}</li>)}</ol>
                <a href={withBase(`/${lang}/dex/`)} className="mt-3 inline-flex min-h-11 items-center text-sm font-bold text-lime hover:underline">{F.more}</a></div>
            </section>
          );
        })()}

        {/* the four answers people look for, 2–4 words each; one click opens all four (audit 12.11) */}
        {p.category !== "farming" && (() => {
          const U = UI_TX[lang];
          const po = m.payout;
          const kyc = !!m.requires?.includes("kyc") || !!det?.facts.some((f) => f.k === "kyc");
          const amt = m.minEntry ? money(m.minEntry.amount, m.minEntry.unit === "USD" ? "USD" : m.minEntry.unit, lang) : "";
          const actIcon: Record<string, IconName> = { trade: "trend", deposit: "cash", stake: "bank", hold: "wallet", buy: "cash" };
          // no threshold in the rules → say what kind of thing it is instead of "see the rules"
          const byCat: Partial<Record<string, [IconName, string]>> = { competition: ["trend", U.cat.competition], referral: ["user", U.cat.referral], airdrop: ["checkCircle", U.cat.airdrop], listing: ["trend", U.cat.listing], bonus: ["cash", U.cat.bonus], earn: ["bank", U.cat.earn] };
          const notTradingC = p.category === "competition" && /\b(creator|prediction|predict|pick|demo|guess|quiz|meme contest|post|chat)\b/i.test(p.titleOrig ?? p.title);
          const act: [IconName, string, string] = notTradingC ? ["trend", ({ uk: "Змагання — рейтинг", en: "Contest — leaderboard", ru: "Соревнование — рейтинг" } as const)[lang], "text-ink"]
            : m.zeroFee && !m.minEntry && !m.perUser && !p.reward ? ["trend", ({ uk: "Просто торгувати", en: "Just trade", ru: "Просто торговать" } as const)[lang], "text-teal"]
            : p.category === "referral" ? ["user", ({ uk: "Запросити друга", en: "Invite a friend", ru: "Пригласить друга" } as const)[lang], "text-ink"]
            : m.noDeposit ? ["checkCircle", U.noDeposit, "text-teal"]
            : m.minEntry ? [actIcon[m.minEntry.kind], `${R.kind[m.minEntry.kind]} ${R.from} ${amt}`, "text-amber"]
            : [...(byCat[p.category] ?? (["checkCircle", U.cat.other] as [IconName, string])), "text-ink"];
          const ending = !m.standing && p.endsAt && p.endsAt - now < 3 * 86400_000;
          const whoParts: Array<[string, string]> = [];
          if (m.geo?.noUA) whoParts.push([U.notUA, "text-rose"]);
          else if (m.geo?.only) whoParts.push([U.region(m.geo.only), "text-amber"]);
          // weekly audit 26.11: "Україна · Усі користувачі" was shown even when the rules say nothing about who may join
          // weekly audit 26.11 (2): "Україна" only when the rules list the restricted countries and Ukraine is not on it
          else if (m.geo?.checked) whoParts.push([U.uaOk, "text-ink"]);
          else if (m.geo?.vague) whoParts.push([({ uk: "Є обмеження за країнами", en: "Country limits apply", ru: "Есть ограничения по странам" } as const)[lang], "text-amber"]);
          else if (det) whoParts.push([({ uk: "Регіон у правилах не вказано", en: "Region not stated in the rules", ru: "Регион в правилах не указан" } as const)[lang], "text-ink-2"]);
          whoParts.push(m.forNew ? [U.onlyNew, "text-sky"] : m.audience ? [({ uk: "Лише окремі користувачі", en: "Only some users", ru: "Только отдельные пользователи" } as const)[lang], "text-amber"] : [U.allUsers, "text-ink"]);
          if (kyc) whoParts.push([U.kyc, "text-ink"]);
          const clean = (x: string) => noEmoji(x).replace(/^\s*[-–•]\s*/, "");
          const whoLines = m.geo?.text ? [m.geo.text] : (det?.facts ?? []).filter((f) => f.k === "who" || f.k === "region" || f.k === "kyc").map((f) => f.text).slice(0, 3);
          return (
            <div data-tour="promo-summary">
            {/* weekly audit 26.11: the estimate was only on list cards — the promo page itself had no "Реально отримаєте" */}
            {m.value && <div className="card mt-6 px-6 pt-5 pb-3 hover:transform-none"><ValueLine v={m.value} lang={lang} big /></div>}
            <SummaryTiles lang={lang} tiles={[
              {
                icon: "coins", label: U.reward, tone: "text-lime",
                value: <>{pu && refBoth ? REF[lang].both(`${R.upTo} ${money(pu.amount, pu.unit, lang)}`) : pu ? `${R.upTo} ${money(pu.amount, pu.unit, lang)}` : p.reward ? `${U.fund} ${fmtLabel(p.reward.label, lang)}` : m.aprPct !== undefined ? `+${m.aprPct}% APR` : m.zeroFee ? ({ uk: "0% комісії за торгівлю", en: "0% trading fees", ru: "0% комиссии за торговлю" } as const)[lang] : U.noAmount}
                  {(pu ? puUsd : rewardUsd) ? <span className="text-sm font-normal text-ink-3"> ≈ {compactUsd((pu ? puUsd : rewardUsd)!, lang)}</span> : null}
                  {/* the maximum is the top tier, not what the minimum entry gets (audit 14.11: "до 500 USDT" next to "від 50 USDT") */}
                  {pu && (m.tiers?.length ?? 0) > 1 && <span className="block text-sm font-normal text-ink-3">{({ uk: "за найвищий рівень; поріг входу дає менше", en: "for the top tier; the entry threshold pays less", ru: "за высший уровень; порог входа даёт меньше" } as const)[lang]}</span>}</>,
                body: <>
                  {pu?.text && <p>“{clean(pu.text)}”</p>}
                  {!pu && p.reward && <p>{R.poolShared} {fmtLabel(p.reward.label, lang)}</p>}
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {po?.form ? <span className={`rounded-md px-2 py-0.5 font-bold ${FORM_CLS[po.form]}`}>{FORM_BADGE[lang][po.form]}</span> : null}
                    {po ? timingChips(po, lang).map((c) => <span key={c} className="rounded-md bg-white/5 px-2 py-0.5 font-semibold">{c}</span>) : null}
                  </div>
                  <p className="mt-2 text-ink-3">{FORM_TEXT[lang][po?.form ?? "unknown"]}</p>
                </>,
              },
              { icon: act[0], label: U.action, tone: act[2], value: act[1], body: m.minEntry?.text ? <p>“{clean(m.minEntry.text)}”</p> : undefined },
              {
                icon: "hourglass", label: U.time, tone: ending ? "text-rose" : "text-ink",
                value: m.standing ? ({ uk: "Постійно, без дати завершення", en: "Ongoing, no end date", ru: "Постоянно, без даты окончания" } as const)[lang] : p.startsAt && p.startsAt > now ? `${U.startsIn} ${duration(p.startsAt - now, t.time)}` : p.endsAt ? `${U.left} ${duration(p.endsAt - now, t.time)}` : U.noEnd,
                body: <>
                  <p>{t.detail.start}: {p.startsAt ? dateFull(p.startsAt, lang) : p.publishedAt ? `${R.published} ${dateFull(p.publishedAt, lang)}` : "—"}</p>
                  <p>{t.detail.end}: {p.endsAt && !m.standing ? dateFull(p.endsAt, lang) : R.noEnd}</p>
                  {cal && (
                    <div className="mt-2 flex flex-wrap gap-x-3 font-bold">
                      <a href={googleCalUrl(cal)} target="_blank" rel="noopener" className="inline-flex min-h-8 items-center gap-1 text-sky hover:underline"><Icon name="calendar" /> Google</a>
                      <a href={icsHref([cal])} download={`promo-${slug.split("-")[0]}.ics`} className="inline-flex min-h-8 items-center gap-1 text-sky hover:underline"><Icon name="calendar" /> {R.calIcs}</a>
                    </div>
                  )}
                </>,
              },
              {
                icon: m.geo?.noUA ? "alert" : "user", label: U.who, tone: whoParts[0]?.[1] ?? "text-ink",
                value: whoParts.map((x) => x[0]).join(" · "),
                body: whoLines.length ? <>{whoLines.map((x) => <p key={x}>{clean(x)}</p>)}</> : undefined,
              },
            ]} />
            </div>
          );
        })()}

        {/* what to do — steps, plus the exchange's own task list when its page has one (audit 12.11) */}
        {p.category !== "farming" && (() => {
          const U = UI_TX[lang];
          const kyc = !!m.requires?.includes("kyc") || !!det?.facts.some((f) => f.k === "kyc");
          const amt = m.minEntry ? money(m.minEntry.amount, m.minEntry.unit === "USD" ? "USD" : m.minEntry.unit, lang) : "";
          const needsJoin = p.category !== "earn" && (!!det?.facts.some((f) => f.k === "how" && /register|join|sign ?up|opt.?in|зареєстр|приєдна|натисн|зарегистр|нажмите/i.test(f.text))
            || !!det?.blocks.slice(0, 80).some((b) => /\b(after|once you)\b[^.]{0,40}\b(click|press|tap)(ing|ed)?\b[^.]{0,20}\[?(join|register|sign up)|\[(join|register)( now)?\]/i.test(b.x)));
          // a competition that is not about trading (creators, predictions, demo, chat guesses) gets a neutral step
          const notTrading = /\b(creator|prediction|predict|pick|demo|guess|quiz|meme contest|post|chat)\b/i.test(p.titleOrig ?? p.title);
          // audit 21.11: all the steps (up to 8), not the first 4 — 211 of 289 AI step lists are longer, and the cut
          // often dropped the step that matters ("trade futures via Glavior…")
          const steps: Array<[IconName, string]> = ex?.steps?.length ? ex.steps.slice(0, 8).map((x, i) => [(["user", "trend", "checkCircle", "gift"] as IconName[])[i] ?? "checkCircle", x]) : p.category === "referral" ? [
            ["user", U.s.reg(p.venue.name, kyc, false)],
            ["tag", REF[lang].link],
            ["user", REF[lang].friend(m.minEntry ? REF[lang].does[m.minEntry.kind](amt, !!m.futures) : "")],
            ["gift", refBoth ? REF[lang].paidBoth : REF[lang].paid],
          ] : [
            ["user", U.s.reg(p.venue.name, kyc, !!m.forNew)],
            // join before trading: volume before the "Join" press does not count (audit 14.11)
            ...(needsJoin ? [["target", U.s.join] as [IconName, string]] : []),
            ...(m.noDeposit ? [["checkCircle", U.s.free] as [IconName, string]] : m.minEntry ? [[m.minEntry.kind === "trade" ? "trend" : "cash", U.s.act[m.minEntry.kind](amt, !!m.futures)] as [IconName, string]] : p.category === "earn" && !/\b(loan|borrow|perp|futures|bot|grid|leverage|margin|copy)/i.test(p.titleOrig ?? p.title) ? [["bank", ({ uk: "Підпишіться на продукт у розділі Earn біржі (Subscribe) і вкажіть суму", en: "Subscribe to the product in the exchange's Earn section and enter the amount", ru: "Подпишитесь на продукт в разделе Earn биржи (Subscribe) и укажите сумму" } as const)[lang]] as [IconName, string]]
              : p.category === "airdrop" || p.category === "bonus" || p.category === "other" || p.category === "listing" ? [["checkCircle", ({ uk: "Виконайте умови акції — вони нижче, у розділі «Умови»", en: "Meet the promo's conditions — listed below under “Rules”", ru: "Выполните условия акции — они ниже, в разделе «Условия»" } as const)[lang]] as [IconName, string]]
              : p.category === "competition" ? [["trend", notTrading ? ({ uk: "Виконуйте умови змагання — переможців визначає рейтинг", en: "Meet the contest's conditions — the ranking decides the winners", ru: "Выполняйте условия соревнования — победителей определяет рейтинг" } as const)[lang] : U.s.rank] as [IconName, string]] : []),
            ["gift", m.payout?.manual ? U.s.manual : m.payout?.auto ? U.s.auto : U.s.unknown],
          ];
          const tasks = det ? tasksOf(det.blocks) : [];
          const warn = (ex?.watch?.length ? ex.watch : (det?.facts ?? []).map((f) => f.text).filter((x) => /\b(first|only|exclusive|not eligible|excluded|cannot|limited)\b|перш|лише|виключно|не можуть|обмежен|только|первых/i.test(x)))
            .map((x) => x.replace(/^\s*[-–•]\s*/, "")).filter((x, i, a) => a.indexOf(x) === i).slice(0, 3);
          return (
            <section data-tour="promo-steps" className="card mt-4 p-5 hover:transform-none sm:p-6">
              <h2 className="flex items-center gap-2 font-display text-xl font-semibold tracking-tight"><Icon name="checkCircle" className="size-5 text-lime" /> {U.todo}</h2>
              <ol className={`mt-4 grid gap-3 sm:grid-cols-2 ${steps.length % 3 === 0 || steps.length === 5 ? "lg:grid-cols-3" : "lg:grid-cols-4"}`}>
                {steps.map(([ic, x], i) => (
                  <li key={i} className="flex gap-3 rounded-xl bg-white/[0.03] p-3">
                    <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-lime/10 font-mono text-sm font-bold text-lime">{i + 1}</span>
                    <span className="min-w-0 text-sm leading-snug text-ink [overflow-wrap:anywhere]"><Icon name={ic} className="mr-1 size-4 text-ink-3" />{x}</span>
                  </li>
                ))}
              </ol>
              {tasks.length > 0 && (
                <div className="mt-5">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-ink-3">{U.ex} · <span className="normal-case tracking-normal">{U.exTasks}</span></h3>
                  <ul className="mt-2 divide-y divide-line">
                    {tasks.map((x) => (
                      <li key={x.title} className="py-2.5 text-sm"><span className="font-semibold text-ink">{x.title}</span>{x.desc ? <span className="block text-xs text-ink-3">{x.desc}</span> : null}</li>
                    ))}
                  </ul>
                </div>
              )}
              {warn.length > 0 && (
                <div className="mt-5 rounded-xl border border-amber/25 bg-amber/[0.05] p-3">
                  <h3 className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-amber"><Icon name="alert" /> {U.good}</h3>
                  <ul className="mt-2 space-y-1.5 text-sm text-ink-2">{warn.map((x) => <li key={x} className="flex gap-2"><span className="text-amber">•</span><span className="min-w-0 [overflow-wrap:anywhere]">{x}</span></li>)}</ul>
                </div>
              )}
            </section>
          );
        })()}

        {/* mix promos (audit 12.11): same exchange, same time, the same action counts in each */}
        {combos.length > 0 && (
          <section id="combo" data-tour="promo-combo" className="card mt-6 scroll-mt-24 p-5 hover:transform-none sm:p-6">
            <h2 className="flex items-center gap-2 font-display text-xl font-semibold tracking-tight"><Icon name="layers" className="size-5 text-lime" /> {C.title}</h2>
            <p className="mt-1.5 max-w-3xl text-sm text-ink-2">{C.sub(p.venue.name)}</p>
            <ul className="mt-4 divide-y divide-line">
              {combos.map(({ p: q, why }) => (
                <li key={q.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 py-3">
                  <Link href={`/${lang}/p/${slugOf(q)}/`} className="min-w-0 flex-1 font-semibold hover:text-lime">{titleOf(q, lang) ?? q.title}</Link>
                  <span className="rounded-md border border-line px-2 py-0.5 text-xs font-semibold text-ink-2">{C.why[why]}</span>
                  {q.meta?.perUser?.usd ? <span className="font-mono text-sm font-bold text-lime">{C.upTo} {compactUsd(q.meta.perUser.usd, lang)}</span> : null}
                  {q.endsAt ? <span className="font-mono text-xs text-ink-3">{duration(q.endsAt - now, t.time)}</span> : null}
                </li>
              ))}
            </ul>
            {comboSum > 0 && <p className="mt-3 text-sm font-semibold">{C.sum(compactUsd(comboSum, lang), combos.length + 1)}</p>}
            <p className="mt-2 text-xs text-ink-3"><Icon name="alert" /> {C.note}</p>
          </section>
        )}

        {/* "how much would I get" — only when the amount you put in changes the result (audit 14.11: a calculator on fixed
            vouchers and points airdrops said "✓ threshold passed" for any number) */}
        {p.category !== "farming" && p.category !== "competition" && p.category !== "referral" && !/\b(giveaway|lucky draw|raffle|spin|mystery box|jackpot|competition|contest|leaderboard|tournament|creator)\b/i.test(p.titleOrig ?? p.title) && !m.noDeposit && !/\bpoints?\b|\bXP\b/i.test(p.titleOrig ?? p.title) && (m.aprPct !== undefined || (m.tiers?.length ?? 0) > 1 || (m.minEntry?.amount ?? 0) > 0) && (
          <div data-tour="promo-calc"><EarnCalc lang={lang} m={m} endsAt={p.endsAt} now={now} lock={lock} /></div>
        )}

        {/* everything below is detail: folded by default (audit 12.11); #rules opens it (Chrome expands <details> on a fragment) */}
        <details data-tour="promo-more" className="group mt-6 rounded-2xl border border-line bg-white/[0.015]">
          <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-3 px-5 py-3 text-sm font-bold text-ink-2 hover:text-ink [&::-webkit-details-marker]:hidden">
            <span className="flex items-center gap-2"><Icon name="scroll" className="size-5 text-lime" /> {UI_TX[lang].more}</span>
            <Icon name="chevronDown" className="size-4 transition-transform group-open:rotate-180" />
          </summary>
          <div className="px-1 pb-1 sm:px-2 sm:pb-2">
            <p className="px-4 pt-1 text-sm text-ink-2">{/* audit 23.11: "OKX: OKX: 0% комісії" */}{!p.title.toLowerCase().startsWith(p.venue.name.toLowerCase()) && <span className="text-ink-3">{p.venue.name}: </span>}{sentenceCase(p.title)}</p>
        {/* what the reward really is (cash / voucher / points) and how it is paid — read from the official rules */}
        {/* audit 2 (25.11): "type not stated — the exchange doesn't say if it is money" is noise for interest (APR / Earn)
            and referral rebates — they are paid in the coin; the block stays when the rules do say something */}
        {p.category !== "farming" && det && (m.payout?.form || !(p.category === "earn" || p.category === "referral" || m.value?.mech === "apr" || m.aprPct !== undefined)) && (() => {
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
                  <a href={googleCalUrl(claimCal)} target="_blank" rel="noopener" className="inline-flex min-h-8 items-center gap-1 text-sky hover:underline"><Icon name="calendar" /> Google</a>
                  <a href={icsHref([claimCal])} download={`claim-${slug.split("-")[0]}.ics`} className="inline-flex min-h-8 items-center gap-1 text-sky hover:underline"><Icon name="calendar" /> {R.calIcs}</a>
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
            {!m.geo?.only && !m.geo?.noUA && det && (m.geo?.checked ? <span className="font-semibold text-ink-2">✓ {R.geoAll}{m.geo.occupied ? ` (${R.geoOcc})` : ""}</span>
              : m.geo?.vague ? <span className="rounded-md bg-amber/10 px-2 py-0.5 font-semibold text-amber"><Icon name="alert" /> {R.geoVague}</span>
              : <span className="text-ink-3">{R.geoNone}</span>)}
            {m.geo?.text && <span className="block w-full text-xs text-ink-3">“{m.geo.text}”</span>}
          </div>
        )}

        {/* plain-language explainer — written by AI strictly from the official rules (src/lib/faq.ts) */}
        {ex && (
          <section id="how" className="card mt-4 scroll-mt-20 p-6 hover:transform-none ring-1 ring-sky/20">
            <h2 className="font-display text-xl font-semibold tracking-tight"><Icon name="bulb" className="size-5 text-lime" /> {FQ.how}</h2>
            <p className="mt-1 text-xs text-ink-3">{FQ.note(p.venue.name)}</p>
            <p className="mt-4 text-[15px] leading-relaxed text-ink [overflow-wrap:anywhere]">{ex.summary}</p>
            <div className="mt-6 grid grid-cols-1 gap-3 md:grid-cols-3 [&>*]:min-w-0">
              {([["clock", FQ.when, ex.payout.when], ["gift", FQ.form, ex.payout.form], ["inbox", FQ.claim, ex.payout.how]] as const).map(([ic, k, v]) => (
                <div key={k} className="rounded-xl border border-line bg-white/[0.02] p-4">
                  <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-ink-3"><Icon name={ic} /> {k}</div>
                  <p className="mt-2 text-sm leading-relaxed text-ink [overflow-wrap:anywhere]">{v}</p>
                </div>
              ))}
            </div>
            {(() => {
              // audit 26.11: the first three are already in the "Що варто знати" box under the steps — not twice on one page
              const top = ex.watch.map((x) => x.replace(/^\s*[-–•]\s*/, "")).filter((x, i, a) => a.indexOf(x) === i).slice(0, 3);
              const rest = ex.watch.filter((x) => !top.includes(x.replace(/^\s*[-–•]\s*/, "")));
              return rest.length > 0 && (
              <>
                <h3 className="mt-6 text-xs font-bold uppercase tracking-wider text-ink-3"><Icon name="alert" /> {FQ.watch}</h3>
                <ul className="mt-3 space-y-2 text-sm text-ink-2">
                  {rest.map((x, i) => <li key={i} className="flex gap-2"><span className="text-amber">•</span><span className="min-w-0 [overflow-wrap:anywhere]">{x}</span></li>)}
                </ul>
              </>
              );
            })()}
          </section>
        )}

        {/* key points pulled from the official rules */}
        {det && det.facts.length > 0 && (
          // audit 23.11 (texts): with the plain explainer above, these rule lines repeated the same steps a third time —
          // they stay one tap away instead of filling the page
          <details open={!ex} className="card group mt-4 p-6 hover:transform-none ring-1 ring-lime/15">
            <summary className="cursor-pointer list-none">
              <h2 className="inline font-display text-xl font-semibold tracking-tight"><Icon name="pin" className="size-5 text-lime" /> {R.keyTitle}</h2>
              {ex && <span className="ml-2 text-sm font-semibold text-ink-3 group-open:hidden">{({ uk: "показати", en: "show", ru: "показать" } as const)[lang]} ▾</span>}
            </summary>
            <p className="mt-1 text-xs text-ink-3">{(det.translated ?? 0) > 0 ? R.keySubTr : R.keySub}</p>
            <dl className="mt-4 divide-y divide-line">
              {factGroups(det.facts).map(([k, lines]) => (
                <div key={k} className="grid grid-cols-1 gap-1 py-3 text-sm sm:grid-cols-[11rem_1fr] sm:gap-4">
                  <dt className="flex items-start gap-1.5 font-semibold text-ink-3"><Icon name={FACT_ICON[k]} className="mt-0.5 size-[1.1em]" />{R.fact[k]}</dt>
                  <dd className="min-w-0 text-ink [overflow-wrap:anywhere]">
                    {lines.length === 1 ? lines[0] : <ul className="space-y-1.5">{lines.map((x) => <li key={x} className="flex gap-2"><span className="text-ink-3">•</span><span>{x}</span></li>)}</ul>}
                  </dd>
                </div>
              ))}
            </dl>
          </details>
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
              <p className="mt-2 text-sm leading-relaxed text-ink-2">{p.category === "farming" ? ({ uk: "Дані DefiLlama — відкрита статистика пулів, не оголошення протоколу. Ставку й умови звіряйте на сайті протоколу.", en: "DefiLlama data — open pool statistics, not the protocol’s announcement. Check the rate and terms on the protocol’s site.", ru: "Данные DefiLlama — открытая статистика пулов, не объявление протокола. Ставку и условия сверяйте на сайте протокола." } as const)[lang] : isAggregator ? t.detail.aggregatorNote : t.detail.officialNote}</p>
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
              <Rules blocks={det.blocks} more={R.more} lang={lang} />
            </>
          ) : (
            <p className="mt-3 text-sm leading-relaxed text-ink-2">{R.none(p.venue.name)}</p>
          )}
        </section>}

          </div>
        </details>

        {/* more questions — same AI explainer */}
        {faq.length > 0 && (
          <section id="faq" data-tour="promo-faq" className="card mt-4 scroll-mt-20 p-6 hover:transform-none">
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
            <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: ldJson({
              "@context": "https://schema.org", "@type": "FAQPage",
              mainEntity: faq.map((x) => ({ "@type": "Question", name: x.q, acceptedAnswer: { "@type": "Answer", text: x.a } })),
            }).replace(/</g, "\\u003c") }} />
          </section>
        )}

        <div data-tour="promo-share" className="mt-8 flex flex-wrap items-center justify-between gap-4 border-t border-line pt-6">
          <Share href={`https://${SITE.domain}/${lang}/p/${slug}/`} title={p.title} label={t.detail.share} copyLabel={t.detail.copy} copiedLabel={t.detail.copied} />
          {/* audit 23.11: with no channel set the link opened Telegram's front page */}
          {HAS_TG && <a href={SITE.contact} target="_blank" rel="noopener" className="text-sm font-semibold text-ink-3 hover:text-ink"><Icon name="flag" /> {t.detail.report}</a>}
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
      <SiteTour lang={lang} {...tourOf(PROMO_TOUR, lang)} noAsk />
    </>
  );
}
