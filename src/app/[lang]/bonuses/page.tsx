import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getDict, isLocale } from "@/lib/i18n";
import { TOOLS } from "@/lib/i18n-tools";
import { getPromos } from "@/lib/promos";
import { VENUES } from "@/config/site";
import { slugOf } from "@/lib/slug";
import { compactUsd } from "@/lib/format";
import { VenueLogo } from "@/components/VenueLogo";
import { ToolHeader } from "@/components/ToolsNav";
import { Footer } from "@/components/Sections";
import type { Promo } from "@/lib/types";

export const revalidate = 900;
type Params = Promise<{ lang: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { lang } = await params;
  if (!isLocale(lang)) return {};
  return { title: TOOLS[lang].bonusTitle, description: TOOLS[lang].bonusSub };
}

/** A promo counts as a new-user offer when it's a deposit/welcome bonus or explicitly targets newcomers. */
const isNewUser = (p: Promo) =>
  p.venue.kind === "cex" && /\b(new users?|newcomers?|welcome|first[- ](deposit|trade|convert)|sign[- ]?up|starter|journey|new to)\b/i.test(p.title);

export default async function Bonuses({ params }: { params: Params }) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  const t = getDict(lang), T = TOOLS[lang];
  const { promos, fetchedAt } = await getPromos(lang);
  const groups = new Map<string, Promo[]>();
  for (const p of promos.filter(isNewUser)) groups.set(p.venue.id, [...(groups.get(p.venue.id) ?? []), p]);
  const rows = [...groups].map(([id, list]) => {
    const best = list.reduce((m, p) => ((p.reward?.usd ?? 0) > (m.reward?.usd ?? 0) ? p : m), list[0]);
    return { id, list, best };
  }).sort((a, b) => (b.best.reward?.usd ?? 0) - (a.best.reward?.usd ?? 0) || b.list.length - a.list.length);

  return (
    <>
      <main className="mx-auto max-w-6xl px-4 pb-20 pt-10 sm:px-6">
        <ToolHeader lang={lang} active="bonuses" title={T.bonusTitle} sub={T.bonusSub} updated={fetchedAt} />
        {rows.length === 0 ? <p className="mt-10 text-ink-3">{T.noBonus}</p> : (
          <div className="mt-8 space-y-3">
            {rows.map(({ id, list, best }) => {
              const cfg = VENUES[id];
              const v = list[0].venue;
              return (
                <section key={id} className="card grid gap-4 p-5 hover:transform-none lg:grid-cols-[1fr_1.6fr_auto] lg:items-start" style={{ ["--tint" as string]: v.color }}>
                  <div className="flex items-center gap-3">
                    <VenueLogo v={v} size={44} />
                    <div>
                      <div className="text-lg font-bold">{v.name}</div>
                      <div className="text-xs font-semibold text-ink-3">{T.colOffers}: {list.length}</div>
                      {best.reward && <div className="mt-1 font-mono text-xl font-bold text-lime">{best.reward.usd ? compactUsd(best.reward.usd) : best.reward.label}</div>}
                    </div>
                  </div>
                  <ul className="space-y-1.5 text-sm">
                    {list.slice(0, 5).map((p) => (
                      <li key={p.id} className="flex gap-2">
                        <span className="text-lime">•</span>
                        <Link href={`/${lang}/p/${slugOf(p)}`} className="line-clamp-2 text-ink-2 hover:text-ink">{p.title}{p.reward ? <span className="ml-1.5 font-mono text-xs font-bold text-ink-3">({p.reward.label})</span> : null}</Link>
                      </li>
                    ))}
                  </ul>
                  {cfg && <a href={cfg.refUrl || cfg.site} target="_blank" rel={cfg.refUrl ? "sponsored noopener" : "noopener"} className="btn btn-primary h-11 px-5">{T.colJoin} ↗</a>}
                </section>
              );
            })}
          </div>
        )}
        <p className="mt-8 text-xs text-ink-3">{t.footer.disclaimer}</p>
      </main>
      <Footer t={t} fetchedAt={fetchedAt} lang={lang} />
    </>
  );
}
