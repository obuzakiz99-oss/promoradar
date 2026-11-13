import type { Promo } from "@/lib/types";
import type { Dict, Locale } from "@/lib/i18n";
import { ago, compactUsd, duration, money, num, shortDate } from "@/lib/format";
import { slugOf, statusOf } from "@/lib/slug";
import { withBase } from "@/lib/base";
import { VenueLogo } from "./VenueLogo";
import { SaveButton } from "./SaveButton";
import { HideButton } from "./HideButton";
import { ComboPanel } from "./ComboPanel";
import type { Combo } from "@/lib/combos";
import { LEVEL_CLS, LEVEL_TXT, promoLevel } from "@/lib/level";
import { FORM_BADGE, FORM_CLS } from "@/lib/payout-i18n";
import { titleOf } from "@/lib/titletpl";
import { Badge, type Tone } from "./Badge";
import type { Value } from "@/lib/value";

/** "What you'd really get" line (value.ts): expected net $ for one ordinary participant, with how sure it is. */
const VAL: Record<Locale, { high: string; mid: string; low: string; apr: string; loss: string; cost: (x: string) => string; why: Record<Value["basis"], string> }> = {
  uk: { high: "Реально", mid: "Очікувано", low: "Оцінка", apr: "на $1 000 понад звичайний earn", loss: "Витрати з'їдають бонус", cost: (x) => `мінус комісії/заморозка ≈ ${x}`,
    why: { stated: "сума з правил для мінімальної участі", max: "лише «до …» з правил — більшість отримує менше", chance: "пул ÷ приблизна кількість учасників (шанс)", apr: "дохід за строк акції на $1 000 понад звичайні 5% річних", none: "" } },
  en: { high: "Realistic", mid: "Expected", low: "Estimate", apr: "on $1,000 over regular earn", loss: "Costs eat the bonus", cost: (x) => `minus fees/lock-up ≈ ${x}`,
    why: { stated: "amount from the rules for the minimum entry", max: "only an 'up to' figure — most people get less", chance: "pool ÷ rough number of participants (a chance)", apr: "income for the period on $1,000 above a regular 5% a year", none: "" } },
  ru: { high: "Реально", mid: "Ожидаемо", low: "Оценка", apr: "на $1 000 сверх обычного earn", loss: "Расходы съедают бонус", cost: (x) => `минус комиссии/заморозка ≈ ${x}`,
    why: { stated: "сумма из правил для минимального участия", max: "только «до …» из правил — большинство получает меньше", chance: "пул ÷ примерное число участников (шанс)", apr: "доход за срок акции на $1 000 сверх обычных 5% годовых", none: "" } },
};
function ValueLine({ v, lang }: { v?: Value; lang: Locale }) {
  if (!v || v.net === undefined || v.gross === undefined) return null;
  const L = VAL[lang];
  const usd = (x: number) => (x >= 1000 ? compactUsd(x) : `$${x >= 10 ? Math.round(x) : x.toFixed(x >= 1 ? 1 : 2)}`);
  const title = [L.why[v.basis], v.cost ? L.cost(usd(v.cost)) : ""].filter(Boolean).join("; ");
  if (v.net <= 0) return <div title={title} className="mb-2 text-xs font-bold text-amber">{L.loss}</div>;
  const tone = v.conf === "high" ? "text-lime" : v.conf === "mid" ? "text-ink" : "text-ink-2";
  return (
    <div title={title} className="mb-2 flex items-baseline gap-1.5 text-xs font-semibold text-ink-3">
      <span>{L[v.conf]}</span>
      <span className={`font-mono text-sm font-bold ${tone}`}>{v.mech === "apr" ? "+" : "≈ "}{usd(v.net)}</span>
      {v.mech === "apr" && <span>{L.apr}</span>}
    </div>
  );
}

export const CAT_STYLE: Record<Promo["category"], { dot: string; text: string }> = {
  airdrop:     { dot: "#c8ff3d", text: "text-lime" },
  competition: { dot: "#ffb547", text: "text-amber" },
  bonus:       { dot: "#3de0c8", text: "text-teal" },
  earn:        { dot: "#5ab8ff", text: "text-sky" },
  farming:     { dot: "#7ee787", text: "text-success" },
  listing:     { dot: "#a38bff", text: "text-violet" },
  referral:    { dot: "#ff6b8b", text: "text-rose" },
  other:       { dot: "#6b7685", text: "text-ink-2" },
};

const KIND_LABEL: Record<Promo["venue"]["kind"], string> = { cex: "CEX", dex: "DEX", defi: "DeFi", airdrop: "Airdrop" };

const Arrow = ({ className = "size-3.5" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 16 16" fill="currentColor" aria-hidden="true"><path d="M5.2 2.8a.8.8 0 0 0 0 1.6h5.27L2.83 12.03a.8.8 0 1 0 1.14 1.14L11.6 5.53v5.27a.8.8 0 0 0 1.6 0V3.6a.8.8 0 0 0-.8-.8H5.2Z" /></svg>
);

function ReqIcon({ k }: { k: string }) {
  const p: Record<string, string> = {
    telegram: "M21.9 4.3 18.7 19.4c-.2 1-.9 1.3-1.7.8l-4.8-3.5-2.3 2.2c-.3.3-.5.5-1 .5l.3-4.9 8.9-8c.4-.3-.1-.5-.6-.2L6.6 13.2l-4.7-1.5c-1-.3-1-1 .2-1.5L20.5 3c.9-.3 1.6.2 1.4 1.3Z",
    x: "M17.8 3h3.1l-6.8 7.7 8 10.3h-6.3l-4.9-6.4L5.3 21H2.2l7.3-8.3L1.8 3h6.4l4.4 5.8L17.8 3Zm-1.1 16.2h1.7L7.4 4.7H5.6l11.1 14.5Z",
    email: "M3 5h18a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1Zm9 7.2L4.4 7H4v.4l8 5.6 8-5.6V7h-.4L12 12.2Z",
    discord: "M19.3 5.3A17 17 0 0 0 15 4l-.5 1a15.6 15.6 0 0 0-5 0L9 4a17 17 0 0 0-4.3 1.3C2 9.4 1.3 13.4 1.6 17.3A17 17 0 0 0 6.9 20l1.1-1.8-1.7-.8.4-.3a12 12 0 0 0 10.6 0l.4.3-1.7.8 1.1 1.8a17 17 0 0 0 5.3-2.7c.4-4.5-.7-8.5-3.1-12ZM8.7 14.9c-1 0-1.9-1-1.9-2.1s.8-2.1 1.9-2.1 1.9 1 1.9 2.1-.8 2.1-1.9 2.1Zm6.6 0c-1 0-1.9-1-1.9-2.1s.8-2.1 1.9-2.1 1.9 1 1.9 2.1-.8 2.1-1.9 2.1Z",
    kyc: "M12 2 4 5v6c0 5 3.4 9.7 8 11 4.6-1.3 8-6 8-11V5l-8-3Zm0 6a2.5 2.5 0 1 1 0 5 2.5 2.5 0 0 1 0-5Zm0 12c-2-.7-3.7-2.1-4.6-4 1.4-1 3-1.5 4.6-1.5s3.2.5 4.6 1.5c-.9 1.9-2.6 3.3-4.6 4Z",
    phone: "M7 2h10a2 2 0 0 1 2 2v16a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2Zm0 3v13h10V5H7Zm5 14.2a1 1 0 1 0 0 2 1 1 0 0 0 0-2Z",
  };
  return <svg className="size-3.5" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d={p[k] ?? p.kyc} /></svg>;
}

const FRESH: Record<Locale, string> = { uk: "нове для вас", en: "new for you", ru: "новое для вас" };
const MORE: Record<Locale, string> = { uk: "Умови та як взяти участь", en: "Rules & how to join", ru: "Условия и как участвовать" };
const PER: Record<Locale, (v: string) => string> = { uk: (v) => `до ${v} на 1 людину`, en: (v) => `up to ${v} per person`, ru: (v) => `до ${v} на 1 человека` };
const GEO_ONLY: Record<Locale, (r: string) => string> = {
  uk: (r) => (r === "region" ? "Лише для окремих регіонів" : `Лише ${r}`), en: (r) => (r === "region" ? "Selected regions only" : `${r} only`), ru: (r) => (r === "region" ? "Только для отдельных регионов" : `Только ${r}`),
};
const NO_UA: Record<Locale, string> = { uk: "Обмеження для України", en: "Not for Ukraine", ru: "Ограничение для Украины" };
const FOR_NEW: Record<Locale, string> = { uk: "Для нових користувачів", en: "New users", ru: "Для новых пользователей" };
const NO_DEP: Record<Locale, string> = { uk: "Без вкладень", en: "No deposit", ru: "Без вложений" };
const MIN: Record<Locale, string> = { uk: "поріг від", en: "entry from", ru: "порог от" };
const PER_T: Record<Locale, string> = { uk: "Максимум на 1 людину", en: "Max per person", ru: "Максимум на 1 человека" };

export function PromoCard({ p, t, lang, now, index, fresh, pin, combos }: { p: Promo; t: Dict; lang: Locale; now: number; index: number; fresh?: boolean; pin?: { tag: string; cls: string }; combos?: Combo[] }) {
  const cs = CAT_STYLE[p.category];
  const isNew = p.publishedAt > 0 && now - p.publishedAt < 48 * 3600_000;
  // "Join" goes straight to this promo's own page on the exchange (a farm pool's own page for farming)
  const left = p.endsAt ? p.endsAt - now : undefined;
  const urgent = left !== undefined && left < 3 * 86400_000;
  const notStarted = p.startsAt && p.startsAt > now;
  const m = p.meta ?? {};
  const isFarm = p.category === "farming" && m.apr !== undefined;
  const isDrop = p.venue.kind === "airdrop";
  const href = withBase(`/${lang}/p/${slugOf(p)}/`);
  const st = statusOf(p, now);
  const lvl = promoLevel(p);
  const own = titleOf(p, lang);
  const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();
  // SHOUTING HEADLINES ("YOUR WAVE OF AIRDROPS STARTS NOW!") → sentence case, tickers kept
  const calm = (raw: string) => { const s = raw.replace(/[🀀-🫿☀-➿️‍]/gu, "").replace(/\s{2,}/g, " ").trim(); const letters = s.replace(/[^A-Za-z]/g, ""); if (letters.length < 12 || (s.match(/[A-Z]/g)?.length ?? 0) / letters.length < 0.7) return s; const low = s.toLowerCase(); const i = low.search(/[a-zа-яіїєґ]/i); return i < 0 ? low : low.slice(0, i) + low[i].toUpperCase() + low.slice(i + 1); };

  return (
    <article
      className={`card group relative flex min-w-0 flex-col p-5 animate-fade-up ${p.sponsored ? "ring-1 ring-lime/40" : ""} ${lvl === "hard" ? "adv" : ""} ${fresh ? "ring-1 ring-lime/60" : ""}`}
      style={{ animationDelay: `${Math.min(index, 12) * 35}ms`, ["--tint" as string]: p.venue.color }}
    >
      {/* solid backing under the tinted badge (owner 13.11: the card border showed through it) */}
      {pin && <span className="absolute -top-3 left-4 z-10 rounded-md bg-surface"><Badge tone={pin.cls as Tone} className="ring-1 ring-current/30">{pin.tag}</Badge></span>}
      {/* header (audit 12.11, phones): logo · name + category · two icon buttons; the status badge sits on the name
          line so the exchange name keeps its width instead of breaking into four lines */}
      <div className="flex items-start gap-3">
        <VenueLogo v={p.venue} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="min-w-0 break-words text-sm font-bold">{p.venue.name}</span>
            <span className="rounded border border-line px-1 py-px font-mono text-xs font-bold tracking-wider text-ink-3">{KIND_LABEL[p.venue.kind]}</span>
            {/* one status badge (most important first) */}
            {p.sponsored ? <Badge tone="accent">{t.card.sponsored}</Badge>
              : st === "ending" ? <Badge tone="danger">{cap(t.status.ending)}</Badge>
              : fresh ? <Badge tone="accent">{cap(FRESH[lang])}</Badge>
              : st === "upcoming" ? <Badge tone="info">{cap(t.status.upcoming)}</Badge>
              : isDrop && (m.hot ?? 0) >= 60 ? <Badge tone="warning">{m.hot}°</Badge>
              : isNew ? <Badge tone="accent" variant="outline">{cap(t.card.new)}</Badge>
              : null}
          </div>
          <div className={`mt-0.5 flex flex-wrap items-center gap-x-1.5 text-xs font-semibold ${cs.text}`}>
            <span className="inline-flex items-center gap-1.5 whitespace-nowrap"><span className="size-1.5 rounded-full" style={{ background: cs.dot }} />{t.cat[p.category]}</span>
            <span className={`nov ml-1 rounded px-1.5 py-px text-xs font-bold ${LEVEL_CLS[lvl]}`} title={LEVEL_TXT[lang][lvl][1]}>{LEVEL_TXT[lang][lvl][0]}</span>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          <HideButton id={p.id} lang={lang} />
          <SaveButton id={p.id} labelAdd={t.saved.add} labelRemove={t.saved.remove} />
        </div>
      </div>

      {/* body */}
      {isFarm ? (
        <div className="mt-4">
          <h3 className="break-words font-mono text-[0.98rem] font-bold leading-snug text-ink">
            <a href={href} className="after:absolute after:inset-0 after:rounded-2xl focus-visible:outline-none">{p.title}</a>
          </h3>
          <div className="mt-2 flex flex-wrap gap-1.5 text-xs font-semibold text-ink-3">
            {m.chain && <span className="rounded-md bg-white/5 px-1.5 py-0.5">{m.chain}</span>}
            {p.tags.includes("stable") && <span className="rounded-md bg-teal/10 px-1.5 py-0.5 text-teal">stable</span>}
          </div>
        </div>
      ) : (
        <>
          {/* our own short title from the parsed facts; the exchange's headline stays below in small type (audit 08.11) */}
          <h3 className="mt-4 line-clamp-2 break-words text-base font-bold leading-snug text-ink">
            <a href={href} title={own ? calm(p.title) : undefined} className="after:absolute after:inset-0 after:rounded-2xl focus-visible:outline-none">
              {own ?? calm(isDrop ? `${p.title} — Airdrop` : p.title)}
            </a>
          </h3>
          {isDrop && m.actions && (
            <p className="mt-2 line-clamp-1 text-sm leading-snug text-ink-2"><span className="font-semibold text-ink-3">{t.card.actions}: </span>{m.actions}</p>
          )}
        </>
      )}

      {/* who it is for + what is paid — at most 2 badges, one style, no emoji (audit 08.11) */}
      {(() => {
        const b: Array<[string, string]> = [];
        // one badge per card (audit 12.11), the most decisive first: can't join → region → no deposit → new users → payout form
        if (m.geo?.noUA) b.push([NO_UA[lang].replace(/^⚠\s*/, ""), "danger"]);
        if (m.geo?.only) b.push([GEO_ONLY[lang](m.geo.only), "warning"]);
        if (m.noDeposit && !own?.startsWith(NO_DEP[lang]) && pin?.cls !== "success") b.push([NO_DEP[lang], "success"]);
        if (m.forNew) b.push([FOR_NEW[lang], "info"]);
        if (m.payout?.form) b.push([FORM_BADGE[lang][m.payout.form], "neutral"]);
        return b.length ? (
          <div className="mt-2.5 flex flex-wrap gap-1.5 text-xs font-semibold">
            {b.slice(0, 1).map(([x, tone]) => <Badge key={x} tone={tone as Tone} variant="outline">{x}</Badge>)}
          </div>
        ) : null;
      })()}

      {/* footer */}
      <div className="mt-auto pt-5">
        {!isFarm && <ValueLine v={m.value} lang={lang} />}
        <div className="flex items-end justify-between gap-3">
          {isFarm ? (
            <div>
              <div className="text-xs font-bold uppercase tracking-wider text-ink-3">{t.card.apr}</div>
              <div className="mt-0.5 font-mono text-2xl font-bold tracking-tight text-success">+{m.apr}%</div>
              {m.baseApr ? <div className="font-mono text-xs text-ink-3">+{m.baseApr}% {t.card.base}</div> : null}
            </div>
          ) : m.perUser && p.reward ? (
            <div>
              <div className="text-xs font-bold uppercase tracking-wider text-ink-3">{PER_T[lang]}</div>
              <div className="mt-0.5 font-mono text-xl font-bold tracking-tight text-lime">{money(m.perUser.amount, m.perUser.unit, lang)}{m.perUser.usd && !/^USD/.test(m.perUser.unit) ? <span className="text-xs font-semibold text-ink-3"> ≈ {compactUsd(m.perUser.usd)}</span> : null}</div>
              <div className="mt-0.5 font-mono text-xs text-ink-3">{t.card.pool}: {p.reward.label}{p.reward.usd && !/^USD/.test(p.reward.unit) ? ` ≈ ${compactUsd(p.reward.usd)}` : ""}</div>
              {m.minEntry && <div className="mt-0.5 font-mono text-xs font-bold text-amber">{MIN[lang]} ${num(m.minEntry.amount, lang)}</div>}
            </div>
          ) : p.reward ? (
            <div>
              <div className="text-xs font-bold uppercase tracking-wider text-ink-3">{t.card.pool}</div>
              <div className="mt-0.5 font-mono text-xl font-bold tracking-tight text-ink">{p.reward.label}{p.reward.usd && !/^USD/.test(p.reward.unit) ? <span className="text-xs font-semibold text-ink-3"> ≈ {compactUsd(p.reward.usd)}</span> : null}</div>
              {m.perUser && <div className="mt-0.5 font-mono text-xs font-bold text-lime">{PER[lang](money(m.perUser.amount, m.perUser.unit, lang))}</div>}
              {m.minEntry && <div className="mt-0.5 font-mono text-xs font-bold text-amber">{MIN[lang]} ${num(m.minEntry.amount, lang)}</div>}
            </div>
          ) : m.perUser ? (
            <div>
              <div className="text-xs font-bold uppercase tracking-wider text-ink-3">{PER_T[lang]}</div>
              <div className="mt-0.5 font-mono text-xl font-bold tracking-tight text-lime">{money(m.perUser.amount, m.perUser.unit, lang)}{m.perUser.usd && !/^USD/.test(m.perUser.unit) ? <span className="text-xs font-semibold text-ink-3"> ≈ {compactUsd(m.perUser.usd)}</span> : null}</div>
            </div>
          ) : isDrop && m.requires?.length ? (
            <div>
              <div className="text-xs font-bold uppercase tracking-wider text-ink-3">{t.card.requires}</div>
              <div className="mt-1.5 flex gap-1.5 text-ink-2">
                {m.requires.map((r) => <span key={r} title={t.req[r] ?? r} className="grid size-6 place-items-center rounded-md bg-white/5"><ReqIcon k={r} /></span>)}
              </div>
            </div>
          ) : <div />}

          <div className="text-right text-xs font-semibold">
            {isFarm ? (
              <>
                <div className="text-ink-3">{t.card.tvl}</div>
                <div className="mt-0.5 font-mono text-sm font-bold text-ink">{compactUsd(m.tvlUsd ?? 0)}</div>
              </>
            ) : notStarted ? (
              <>
                <div className="text-ink-3">{t.card.soon}</div>
                <div className="mt-0.5 font-mono text-sm font-bold text-sky">{shortDate(p.startsAt!, lang)}</div>
              </>
            ) : left !== undefined ? (
              <>
                <div className="text-ink-3">{t.card.endsIn}</div>
                <div className={`mt-0.5 font-mono text-sm font-bold ${urgent ? "text-rose" : "text-ink"}`}>{duration(left, t.time)}</div>
              </>
            ) : p.publishedAt ? (
              <>
                <div className="text-ink-3">{t.card.started}</div>
                <div className="mt-0.5 font-mono text-sm font-bold text-ink-2">{ago(now - p.publishedAt, t.time)}</div>
              </>
            ) : (
              <div className="text-ink-3">{t.card.ongoing}</div>
            )}
          </div>
        </div>

        {/* stackable with other promos on this exchange (audit 12.11): opens a short list right in the card */}
        {combos && combos.length > 0 && (
          <ComboPanel lang={lang} why={combos[0].why} ownUsd={m.perUser?.usd}
            items={combos.map(({ p: q }) => ({ id: q.id, href: withBase(`/${lang}/p/${slugOf(q)}/`), title: titleOf(q, lang) ?? q.title, usd: q.meta?.perUser?.usd, left: q.endsAt ? duration(q.endsAt - now, t.time) : undefined }))} />
        )}
        {/* 07.11 user: every link first leads to the short explanation page; the exchange link lives there */}
        <div className="relative z-10 mt-4 grid">
          <a href={href} className="btn btn-ghost">
            {MORE[lang]}
            <Arrow className="size-3.5 transition-transform group-hover:translate-x-0.5" />
          </a>
        </div>
        {m.source && (
          <div className="mt-3 text-xs font-medium text-ink-3">
            {t.card.via}: {m.source}{m.confirmed ? ` · ✓ ${t.card.confirmed}` : ""}
          </div>
        )}
      </div>
    </article>
  );
}
