import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getDict, isLocale, type Locale } from "@/lib/i18n";
import { getPromos } from "@/lib/promos";
import { findBySlug, statusOf } from "@/lib/slug";
import { compactUsd, duration } from "@/lib/format";
import { SITE, VENUES } from "@/config/site";
import { VenueLogo } from "@/components/VenueLogo";
import { SaveButton } from "@/components/SaveButton";
import { Share } from "@/components/Share";
import { PromoCard, CAT_STYLE } from "@/components/PromoCard";
import { Footer } from "@/components/Sections";

export const revalidate = 900;
export const dynamicParams = true;
export function generateStaticParams() { return []; }

type Params = Promise<{ lang: string; slug: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { lang, slug } = await params;
  if (!isLocale(lang)) return {};
  const p = findBySlug((await getPromos()).promos, slug);
  if (!p) return { title: "404" };
  const t = getDict(lang);
  const bits = [p.venue.name, t.cat[p.category], p.reward?.label, p.meta?.apr ? `+${p.meta.apr}% APR` : ""].filter(Boolean).join(" · ");
  const title = p.venue.kind === "airdrop" ? `${p.title} Airdrop` : `${p.title} — ${p.venue.name}`;
  return { title, description: bits, alternates: { canonical: `/${lang}/p/${slug}` } };
}

const dateFull = (ts: number, lang: Locale) =>
  new Date(ts).toLocaleString(lang === "uk" ? "uk-UA" : lang === "ru" ? "ru-RU" : "en-GB", { day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit", timeZone: "UTC" }) + " UTC";

export default async function PromoPage({ params }: { params: Params }) {
  const { lang, slug } = await params;
  if (!isLocale(lang)) notFound();
  const t = getDict(lang);
  const { promos, fetchedAt } = await getPromos();
  const p = findBySlug(promos, slug);
  if (!p) notFound();
  const now = fetchedAt;
  const m = p.meta ?? {};
  const st = statusOf(p, now);
  const isAggregator = p.venue.kind === "airdrop";
  const venueCfg = VENUES[p.venue.id];
  const joinUrl = p.joinUrl || p.url;
  const related = [
    ...promos.filter((x) => x.id !== p.id && x.venue.id === p.venue.id),
    ...promos.filter((x) => x.id !== p.id && x.venue.id !== p.venue.id && x.category === p.category),
  ].slice(0, 6);

  const facts: Array<[string, React.ReactNode]> = [
    [t.detail.reward, m.apr !== undefined ? <span className="text-[#7ee787]">+{m.apr}% APR</span> : p.reward ? p.reward.label + (p.reward.usd && p.reward.unit !== "USD" ? ` (≈${compactUsd(p.reward.usd)})` : "") : t.detail.noData],
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
          <a href={joinUrl} target="_blank" rel={p.joinUrl ? "sponsored noopener" : "noopener"} className="btn btn-primary h-12 px-6 text-base">{p.category === "farming" ? t.card.open : t.card.join} ↗</a>
          <a href={p.url} target="_blank" rel="noopener" className="btn btn-ghost h-12 px-6 text-base">{t.card.details} ↗</a>
          <SaveButton id={p.id} labelAdd={t.saved.add} labelRemove={t.saved.remove} size="lg" />
        </div>

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
