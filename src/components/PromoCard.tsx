import type { Promo } from "@/lib/types";
import type { Dict, Locale } from "@/lib/i18n";
import { ago, compactUsd, duration, shortDate } from "@/lib/format";
import { slugOf, statusOf } from "@/lib/slug";
import { withBase } from "@/lib/base";
import { VenueLogo } from "./VenueLogo";
import { SaveButton } from "./SaveButton";
import { LEVEL_CLS, LEVEL_TXT, promoLevel } from "@/lib/level";

export const CAT_STYLE: Record<Promo["category"], { dot: string; text: string }> = {
  airdrop:     { dot: "#c8ff3d", text: "text-lime" },
  competition: { dot: "#ffb547", text: "text-amber" },
  bonus:       { dot: "#3de0c8", text: "text-teal" },
  earn:        { dot: "#5ab8ff", text: "text-sky" },
  farming:     { dot: "#7ee787", text: "text-[#7ee787]" },
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
const NO_UA: Record<Locale, string> = { uk: "⚠ Обмеження для України", en: "⚠ Not for Ukraine", ru: "⚠ Ограничение для Украины" };
const FOR_NEW: Record<Locale, string> = { uk: "Для нових користувачів", en: "New users", ru: "Для новых пользователей" };
const NO_DEP: Record<Locale, string> = { uk: "Без вкладень", en: "No deposit", ru: "Без вложений" };
const MIN: Record<Locale, string> = { uk: "поріг від", en: "entry from", ru: "порог от" };
const PER_T: Record<Locale, string> = { uk: "До на 1 людину", en: "Per person, up to", ru: "До на 1 человека" };

export function PromoCard({ p, t, lang, now, index, fresh }: { p: Promo; t: Dict; lang: Locale; now: number; index: number; fresh?: boolean }) {
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

  return (
    <article
      className={`card group relative flex flex-col p-5 animate-fade-up ${p.sponsored ? "ring-1 ring-lime/40" : ""} ${lvl === "hard" ? "adv" : ""} ${fresh ? "ring-1 ring-lime/60" : ""}`}
      style={{ animationDelay: `${Math.min(index, 12) * 35}ms`, ["--tint" as string]: p.venue.color }}
    >
      {/* header */}
      <div className="flex items-center gap-3">
        <VenueLogo v={p.venue} />
        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="text-sm font-bold">{p.venue.name}</span>
            <span className="rounded border border-line px-1 py-px font-mono text-[9px] font-bold tracking-wider text-ink-3">{KIND_LABEL[p.venue.kind]}</span>
          </div>
          <div className={`mt-0.5 inline-flex items-center gap-1.5 text-xs font-semibold ${cs.text}`}>
            <span className="size-1.5 rounded-full" style={{ background: cs.dot }} />
            {t.cat[p.category]}
            <span className={`nov ml-1 rounded px-1.5 py-px text-[10px] font-bold ${LEVEL_CLS[lvl]}`} title={LEVEL_TXT[lang][lvl][1]}>{LEVEL_TXT[lang][lvl][0]}</span>
          </div>
        </div>
        <div className="ml-auto flex shrink-0 items-center gap-1.5">
          {/* one badge only, so the exchange name always fits (most important first) */}
          {p.sponsored ? <span className="rounded-md bg-lime px-2 py-1 text-[10px] font-extrabold uppercase tracking-wide text-[#0b0f05]">{t.card.sponsored}</span>
            : st === "ending" ? <span className="rounded-md border border-rose/30 bg-rose/10 px-2 py-1 text-[10px] font-extrabold uppercase tracking-wide text-rose">{t.status.ending}</span>
            : fresh ? <span className="rounded-md bg-lime px-2 py-1 text-[10px] font-extrabold uppercase tracking-wide text-[#0b0f05]">✦ {FRESH[lang]}</span>
            : st === "upcoming" ? <span className="rounded-md border border-sky/30 bg-sky/10 px-2 py-1 text-[10px] font-extrabold uppercase tracking-wide text-sky">{t.status.upcoming}</span>
            : isDrop && (m.hot ?? 0) >= 60 ? <span className="rounded-md border border-amber/30 bg-amber/10 px-2 py-1 text-[10px] font-extrabold uppercase tracking-wide text-amber">🔥 {m.hot}°</span>
            : isNew ? <span className="rounded-md border border-lime/30 bg-lime/10 px-2 py-1 text-[10px] font-extrabold uppercase tracking-wide text-lime">{t.card.new}</span>
            : null}
          <SaveButton id={p.id} labelAdd={t.saved.add} labelRemove={t.saved.remove} />
        </div>
      </div>

      {/* body */}
      {isFarm ? (
        <div className="mt-4">
          <h3 className="break-words font-mono text-[0.98rem] font-bold leading-snug text-ink">
            <a href={href} className="after:absolute after:inset-0 after:rounded-[1.25rem] focus-visible:outline-none">{p.title}</a>
          </h3>
          <div className="mt-2 flex flex-wrap gap-1.5 text-[11px] font-semibold text-ink-3">
            {m.chain && <span className="rounded-md bg-white/5 px-1.5 py-0.5">{m.chain}</span>}
            {p.tags.includes("stable") && <span className="rounded-md bg-teal/10 px-1.5 py-0.5 text-teal">stable</span>}
          </div>
        </div>
      ) : (
        <>
          <h3 className="mt-4 break-words text-[1.02rem] font-bold leading-snug text-ink">
            <a href={href} className="after:absolute after:inset-0 after:rounded-[1.25rem] focus-visible:outline-none">
              {isDrop ? `${p.title} — Airdrop` : p.title}
            </a>
          </h3>
          {isDrop && m.actions && (
            <p className="mt-2 text-sm leading-snug text-ink-2"><span className="font-semibold text-ink-3">{t.card.actions}: </span>{m.actions}</p>
          )}
        </>
      )}

      {/* who it is for */}
      {(m.geo?.only || m.geo?.noUA || m.forNew || m.noDeposit) && (
        <div className="mt-2.5 flex flex-wrap gap-1.5 text-[11px] font-bold">
          {m.geo?.only && <span className="rounded-md bg-amber/10 px-1.5 py-0.5 text-amber">🌍 {GEO_ONLY[lang](m.geo.only)}</span>}
          {m.geo?.noUA && <span className="rounded-md bg-rose/10 px-1.5 py-0.5 text-rose">{NO_UA[lang]}</span>}
          {m.forNew && <span className="rounded-md bg-sky/10 px-1.5 py-0.5 text-sky">🆕 {FOR_NEW[lang]}</span>}
          {m.noDeposit && <span className="rounded-md bg-lime/10 px-1.5 py-0.5 text-lime">🆓 {NO_DEP[lang]}</span>}
        </div>
      )}

      {/* footer */}
      <div className="mt-auto pt-5">
        <div className="flex items-end justify-between gap-3">
          {isFarm ? (
            <div>
              <div className="text-[11px] font-bold uppercase tracking-wider text-ink-3">{t.card.apr}</div>
              <div className="mt-0.5 font-mono text-2xl font-bold tracking-tight text-[#7ee787]">+{m.apr}%</div>
              {m.baseApr ? <div className="font-mono text-[11px] text-ink-3">+{m.baseApr}% {t.card.base}</div> : null}
            </div>
          ) : p.reward ? (
            <div>
              <div className="text-[11px] font-bold uppercase tracking-wider text-ink-3">{t.card.pool}</div>
              <div className="mt-0.5 font-mono text-xl font-bold tracking-tight text-ink">{p.reward.label}</div>
              {m.perUser && <div className="mt-0.5 font-mono text-[11px] font-bold text-lime">{PER[lang](`${m.perUser.amount.toLocaleString("en-US")} ${m.perUser.unit}`)}</div>}
              {m.minEntry && <div className="mt-0.5 font-mono text-[11px] font-bold text-amber">{MIN[lang]} ${m.minEntry.amount.toLocaleString("en-US")}</div>}
            </div>
          ) : m.perUser ? (
            <div>
              <div className="text-[11px] font-bold uppercase tracking-wider text-ink-3">{PER_T[lang]}</div>
              <div className="mt-0.5 font-mono text-xl font-bold tracking-tight text-lime">{m.perUser.amount.toLocaleString("en-US")} {m.perUser.unit}</div>
            </div>
          ) : isDrop && m.requires?.length ? (
            <div>
              <div className="text-[11px] font-bold uppercase tracking-wider text-ink-3">{t.card.requires}</div>
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

        {/* 07.11 user: every link first leads to the short explanation page; the exchange link lives there */}
        <div className="relative z-10 mt-4 grid">
          <a href={href} className="btn btn-primary">
            {MORE[lang]}
            <Arrow className="size-3.5 transition-transform group-hover:translate-x-0.5" />
          </a>
        </div>
        {m.source && (
          <div className="mt-3 text-[11px] font-medium text-ink-3">
            {t.card.via}: {m.source}{m.confirmed ? ` · ✓ ${t.card.confirmed}` : ""}
          </div>
        )}
      </div>
    </article>
  );
}
