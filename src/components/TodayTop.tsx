import type { Locale } from "@/lib/i18n";
import type { Promo } from "@/lib/types";
import { slugOf } from "@/lib/slug";
import { withBase } from "@/lib/base";
import { compactUsd } from "@/lib/format";
import { VenueLogo } from "./VenueLogo";
import { ShareTg } from "./ShareTg";

const TX: Record<Locale, {
  title: string; sub: string; best: string; free: string; ending: string; perPerson: string; pool: string; left: (h: number) => string; open: string; share: string; noDep: string;
}> = {
  uk: { title: "🔥 Топ-3 на сьогодні", sub: "Перераховується з кожним оновленням: найбільше на одну людину, без вкладень і те, що ось-ось закінчиться.", best: "Найбільше на 1 людину", free: "Без вкладень", ending: "Встигніть до кінця", perPerson: "до", pool: "фонд", left: (h) => (h < 24 ? `залишилось ${h} год` : `залишилось ${Math.round(h / 24)} дн.`), open: "Умови →", share: "Поділитися", noDep: "участь безкоштовна" },
  en: { title: "🔥 Today's top 3", sub: "Recalculated with every update: most per person, no deposit needed, and about to end.", best: "Most per person", free: "No deposit", ending: "Last chance", perPerson: "up to", pool: "pool", left: (h) => (h < 24 ? `${h} h left` : `${Math.round(h / 24)} d left`), open: "Rules →", share: "Share", noDep: "free to join" },
  ru: { title: "🔥 Топ-3 на сегодня", sub: "Пересчитывается с каждым обновлением: больше всего на одного человека, без вложений и то, что вот-вот закончится.", best: "Больше всего на 1 человека", free: "Без вложений", ending: "Успейте до конца", perPerson: "до", pool: "фонд", left: (h) => (h < 24 ? `осталось ${h} ч` : `осталось ${Math.round(h / 24)} дн.`), open: "Условия →", share: "Поделиться", noDep: "участие бесплатно" },
};

/** Three hand-picked-by-rule cards above the feed. Region-only, restricted, teaser and not-yet-started promos are skipped. */
export function TodayTop({ promos, lang, now, siteUrl }: { promos: Promo[]; lang: Locale; now: number; siteUrl: string }) {
  const T = TX[lang];
  const ok = promos.filter((p) => p.category !== "farming" && !p.meta?.thin && !p.meta?.geo?.only && !p.meta?.geo?.noUA && !(p.startsAt && p.startsAt > now) && !(p.endsAt && p.endsAt < now));
  const val = (p: Promo) => p.meta?.perUser?.usd ?? 0;
  const used = new Set<string>();
  const pick = (xs: Promo[]) => { const p = xs.find((x) => !used.has(x.id)); if (p) used.add(p.id); return p; };

  const best = pick([...ok].filter((p) => val(p) >= 10).sort((a, b) => val(b) - val(a)));
  const free = pick([...ok].filter((p) => p.meta?.noDeposit).sort((a, b) => val(b) - val(a) || (b.reward?.usd ?? 0) - (a.reward?.usd ?? 0) || b.publishedAt - a.publishedAt));
  const ending = pick([...ok].filter((p) => p.endsAt && p.endsAt - now < 72 * 3600_000).sort((a, b) => (val(b) || (b.reward?.usd ?? 0) / 1000) - (val(a) || (a.reward?.usd ?? 0) / 1000)));
  const cards = ([[T.best, best, "text-lime"], [T.free, free, "text-teal"], [T.ending, ending, "text-rose"]] as const).filter(([, p]) => p);
  if (!cards.length) return null;

  return (
    <section className="mx-auto max-w-7xl px-4 pt-8 sm:px-6">
      <h2 className="font-display text-2xl font-semibold tracking-tight">{T.title}</h2>
      <p className="mt-1 text-sm text-ink-3">{T.sub}</p>
      <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-3">
        {cards.map(([label, p, tone]) => {
          const href = withBase(`/${lang}/p/${slugOf(p!)}/`);
          const pu = p!.meta?.perUser;
          const hours = p!.endsAt ? Math.max(1, Math.round((p!.endsAt - now) / 3600_000)) : undefined;
          const main = pu ? `${T.perPerson} ${pu.usd !== undefined ? compactUsd(pu.usd) : `${pu.amount.toLocaleString("en-US")} ${pu.unit}`}` : p!.reward ? `${T.pool} ${p!.reward.label}` : T.noDep;
          return (
            <article key={p!.id} className="card relative flex flex-col p-5" style={{ ["--tint" as string]: p!.venue.color }}>
              <div className={`text-[11px] font-extrabold uppercase tracking-wider ${tone}`}>{label}</div>
              <div className="mt-3 flex items-center gap-2.5">
                <VenueLogo v={p!.venue} size={28} rounded="rounded-lg" />
                <span className="text-sm font-bold">{p!.venue.name}</span>
                {hours !== undefined && <span className={`ml-auto font-mono text-[11px] font-bold ${hours < 48 ? "text-rose" : "text-ink-3"}`}>⏳ {T.left(hours)}</span>}
              </div>
              <h3 className="mt-2 text-[0.98rem] font-bold leading-snug">
                <a href={href} className="after:absolute after:inset-0 after:rounded-[1.25rem]">{p!.title}</a>
              </h3>
              <div className={`mt-3 font-display text-3xl font-semibold ${tone}`}>{main}</div>
              <div className="relative z-10 mt-auto flex items-center justify-between gap-2 pt-4">
                <a href={href} className="text-sm font-bold text-ink-2 hover:text-ink">{T.open}</a>
                <ShareTg url={`${siteUrl}/${lang}/p/${slugOf(p!)}/`} text={`${p!.venue.name}: ${p!.title} — ${main}`} label={T.share} />
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
