import { alt, withOg } from "@/lib/seo";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getDict, isLocale } from "@/lib/i18n";
import { TOOLS } from "@/lib/i18n-tools";
import { getPromos } from "@/lib/promos";
import { VENUES } from "@/config/site";
import { slugOf } from "@/lib/slug";
import { compactUsd, fmtLabel, money, noEmoji, plural } from "@/lib/format";
import { VenueLogo } from "@/components/VenueLogo";
import { PageHeader } from "@/components/PageHeader";
import { withBase } from "@/lib/base";
import { Footer } from "@/components/Sections";
import type { Promo } from "@/lib/types";

export const revalidate = 900;
type Params = Promise<{ lang: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { lang } = await params;
  if (!isLocale(lang)) return {};
  return withOg({ alternates: alt(lang, "/bonuses"), title: TOOLS[lang].bonusTitle, description: TOOLS[lang].bonusSub });
}

/** A promo counts as a new-user offer when it's a deposit/welcome bonus or explicitly targets newcomers. */
// the same set as the "Бонуси" filter on the promo list (category bonus) plus anything marked "for new users" — audit 08.11:
// the page showed 1 promo while the list filter said 29
// audit 14.11: community / P2P-merchant / VIP / region-only campaigns are not new-user bonuses
const NOT_NEW = /\b(appreciation|merchants?|vip|institutional|market makers?|affiliates?|kol|ambassadors?)\b/i;
// audit 2 (25.11): a trading competition is not a newcomer bonus (Coinstore "0-fee sprint" showed "up to $15K per newcomer")
// audit 27.11 (sections): Gate "Exclusively for returning CFD traders" (meta.audience) showed "до $962 новачку"
const isNewUser = (p: Promo) => !p.meta?.geo?.only && !p.meta?.audience && p.category !== "competition" && !NOT_NEW.test(p.titleOrig ?? p.title) && (
  p.category === "bonus" || !!p.meta?.forNew
  || (p.venue.kind === "cex" && /\b(new users?|newcomers?|welcome|first[- ](deposit|trade|convert)|sign[- ]?up|starter|journey|new to)\b/i.test(p.titleOrig ?? p.title)));
/** What one newcomer can get: the per-person amount from the rules (a prize pool is not a bonus). */
// audit 27.11: Coinstore "10% cashback on losses … 50,000 USDT max per user" — a cap on a % refund is not what one gets
const perHead = (p: Promo) => (/\bwin|\bwon|вигр|выигр|\d\s?%\s*(cashback|кешбек|кэшбэк|of (your |the )?loss)/i.test(p.meta?.perUser?.text ?? "") ? 0 : p.meta?.perUser?.usd ?? 0);
/** "новачку" only when the promo is really for newcomers; other bonuses say "на людину". */
const forNewcomer = (p: Promo) => !!p.meta?.forNew || /\b(new users?|newcomers?|welcome|first[- ](deposit|trade|convert)|sign[- ]?up|starter|new to)\b/i.test(p.titleOrig ?? p.title);   // "win $30,000" is a prize, not a bonus

export default async function Bonuses({ params }: { params: Params }) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  const t = getDict(lang), T = TOOLS[lang];
  const { promos, fetchedAt } = await getPromos(lang);
  const groups = new Map<string, Promo[]>();
  for (const p of promos.filter(isNewUser)) groups.set(p.venue.id, [...(groups.get(p.venue.id) ?? []), p]);
  const rows = [...groups].map(([id, list]) => {
    const sorted = [...list].sort((a, b) => perHead(b) - perHead(a));
    return { id, list: sorted, best: sorted[0] };
  }).sort((a, b) => perHead(b.best) - perHead(a.best) || b.list.length - a.list.length);

  return (
    <>
      <main className="mx-auto max-w-7xl px-4 pb-20 pt-10 sm:px-6">
        <PageHeader lang={lang} title={T.bonusTitle} sub={T.bonusSub} updated={fetchedAt} nav={<a href={withBase(`/${lang}/#promos`)} className="inline-flex min-h-11 items-center text-sm font-bold text-ink-3 hover:text-ink">← {({"uk":"Усі акції","en":"All promos","ru":"Все акции"} as Record<string, string>)[lang]}</a>} />
        {rows.length === 0 ? <p className="mt-10 text-ink-3">{T.noBonus}</p> : (
          <div className="mt-8 space-y-3">
            {rows.map(({ id, list, best }) => {
              const cfg = VENUES[id];
              const v = list[0].venue;
              return (
                <section key={id} className="card grid grid-cols-1 gap-4 p-5 hover:transform-none lg:grid-cols-[1fr_1.6fr_auto] lg:items-start" style={{ ["--tint" as string]: v.color }}>
                  <div className="flex items-center gap-3">
                    <VenueLogo v={v} size={44} />
                    <div>
                      <div className="text-lg font-bold">{v.name}</div>
                      <div className="text-xs font-semibold text-ink-3">{list.length} {plural(list.length, lang, "promo")}</div>
                      {perHead(best) > 0 && <div className="mt-1 font-mono text-xl font-bold text-lime">{({ uk: "до ", en: "up to ", ru: "до " } as const)[lang]}{compactUsd(perHead(best), lang)}<span className="ml-1 font-sans text-xs font-semibold text-ink-3">{(forNewcomer(best) ? { uk: "новачку", en: "per newcomer", ru: "новичку" } as const : { uk: "на людину", en: "per person", ru: "на человека" } as const)[lang]}</span></div>}
                    </div>
                  </div>
                  <ul className="space-y-1.5 text-sm">
                    {list.slice(0, 5).map((p) => (
                      <li key={p.id} className="flex gap-2">
                        <span className="text-lime">•</span>
                        <Link href={`/${lang}/p/${slugOf(p)}`} className="break-words font-semibold text-ink underline decoration-line-2 underline-offset-4 hover:text-lime hover:decoration-lime/60">{noEmoji(p.title)}{p.meta?.perUser ? <span className="ml-1.5 font-mono text-xs font-bold text-lime">({({ uk: "до", en: "up to", ru: "до" } as const)[lang]} {money(p.meta.perUser.amount, p.meta.perUser.unit, lang)})</span> : p.reward ? <span className="ml-1.5 font-mono text-xs font-bold text-ink-3">({({ uk: "фонд", en: "pool", ru: "фонд" } as const)[lang]} {fmtLabel(p.reward.label, lang)})</span> : null}</Link>
                      </li>
                    ))}
                  </ul>
                  {cfg && <a href={cfg.refUrl || cfg.site} target="_blank" rel={cfg.refUrl ? "sponsored noopener" : "noopener"} className="btn btn-ghost h-11 px-5">{T.colJoin} ↗{cfg.refUrl && <span className="ml-1.5 rounded bg-white/10 px-1 py-0.5 text-xs font-bold uppercase tracking-wide text-ink-3" title={({ uk: "Реферальне посилання: ми можемо отримати комісію від біржі. Для вас умови ті самі.", en: "Referral link: we may earn a commission from the exchange. Your terms are the same.", ru: "Реферальная ссылка: мы можем получить комиссию от биржи. Для вас условия те же." } as const)[lang]}>{({ uk: "реф.", en: "ref", ru: "реф." } as const)[lang]}</span>}</a>}
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
