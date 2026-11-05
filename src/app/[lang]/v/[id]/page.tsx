import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getDict, isLocale } from "@/lib/i18n";
import { getPromos } from "@/lib/promos";
import { VENUES, venueOf } from "@/config/site";
import { GUIDES } from "@/lib/guides";
import { LEARN } from "@/lib/i18n-learn";
import { VenueLogo } from "@/components/VenueLogo";
import { PromoExplorer } from "@/components/PromoExplorer";
import { Footer } from "@/components/Sections";

export const revalidate = 900;
export const dynamicParams = false; // every page is pre-rendered at build (required by the static GitHub Pages export)
export function generateStaticParams() { return Object.keys(VENUES).map((id) => ({ id })); }

type Params = Promise<{ lang: string; id: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { lang, id } = await params;
  if (!isLocale(lang) || !VENUES[id]) return {};
  const t = getDict(lang);
  return { title: `${VENUES[id].name} — ${t.venue.promos}`, alternates: { canonical: `/${lang}/v/${id}` } };
}

export default async function VenuePage({ params }: { params: Params }) {
  const { lang, id } = await params;
  if (!isLocale(lang) || !VENUES[id]) notFound();
  const t = getDict(lang);
  const cfg = VENUES[id];
  const v = venueOf(id);
  const { promos, fetchedAt } = await getPromos();
  const mine = promos.filter((p) => p.venue.id === id);
  const others = Object.keys(VENUES).filter((k) => k !== id);

  return (
    <>
      <main className="mx-auto max-w-7xl px-4 pb-20 pt-8 sm:px-6">
        <nav className="text-sm font-semibold text-ink-3"><Link href={`/${lang}#promos`} className="hover:text-ink">← {t.detail.back}</Link></nav>
        <header className="relative mt-6 overflow-hidden rounded-[2rem] border border-line bg-bg-2 p-6 sm:p-10">
          <div className="pointer-events-none absolute -right-20 -top-20 size-80 rounded-full opacity-20 blur-3xl" style={{ background: v.color }} />
          <div className="relative flex flex-col gap-6 sm:flex-row sm:items-center">
            <VenueLogo v={v} size={80} rounded="rounded-2xl" />
            <div className="flex-1">
              <div className="text-xs font-bold uppercase tracking-wider text-ink-3">{t.kinds[v.kind]}</div>
              <h1 className="mt-1 font-display text-3xl font-semibold tracking-tight sm:text-5xl">{v.name}</h1>
              <p className="mt-2 font-mono text-sm text-ink-2">{mine.length} {t.venue.count}</p>
            </div>
            <div className="flex flex-wrap gap-3">
              <a href={cfg.refUrl || cfg.site} target="_blank" rel={cfg.refUrl ? "sponsored noopener" : "noopener"} className="btn btn-primary h-12 px-6">{t.venue.join} ↗</a>
              <a href={cfg.site} target="_blank" rel="noopener" className="btn btn-ghost h-12 px-6">{t.venue.site} ↗</a>
              {GUIDES[lang].some((g) => g.id === id || g.venue === id) && <Link href={`/${lang}/learn/guide/${GUIDES[lang].find((g) => g.id === id || g.venue === id)!.id}`} className="btn btn-ghost h-12 px-6">🧭 {LEARN[lang].cards.how[0]}</Link>}
            </div>
          </div>
        </header>

        <section className="mt-10">
          <h2 className="mb-5 font-display text-2xl font-semibold tracking-tight">{t.venue.promos}</h2>
          <PromoExplorer promos={mine} t={t} lang={lang} serverNow={fetchedAt} showKinds={false} />
        </section>

        <section className="mt-16">
          <h2 className="text-xs font-bold uppercase tracking-wider text-ink-3">{t.venue.all}</h2>
          <div className="mt-4 flex flex-wrap gap-2">
            {others.map((k) => (
              <Link key={k} href={`/${lang}/v/${k}`} className="flex h-10 items-center gap-2 rounded-xl border border-line bg-white/[0.02] pl-1.5 pr-3 text-sm font-bold text-ink-2 hover:border-line-2 hover:text-ink">
                <VenueLogo v={venueOf(k)} size={28} rounded="rounded-lg" /> {VENUES[k].name}
              </Link>
            ))}
          </div>
        </section>
      </main>
      <Footer t={t} fetchedAt={fetchedAt} lang={lang} />
    </>
  );
}
