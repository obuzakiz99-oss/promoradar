import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getDict, isLocale } from "@/lib/i18n";
import { REWARDS } from "@/lib/i18n-rewards";
import { Footer } from "@/components/Sections";
import { LearnHeader } from "@/components/LearnNav";
import { Icon, type IconName } from "@/components/Icon";

type Params = Promise<{ lang: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { lang } = await params;
  if (!isLocale(lang)) return {};
  return { title: REWARDS[lang].title, description: REWARDS[lang].sub };
}

const CASH_CLS = { yes: "bg-lime/10 text-lime", no: "bg-rose/10 text-rose", profit: "bg-amber/10 text-amber" } as const;

export default async function LearnRewards({ params }: { params: Params }) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  const t = getDict(lang), R = REWARDS[lang];
  return (
    <>
      <main className="mx-auto max-w-7xl px-4 pb-20 pt-10 sm:px-6">
        <LearnHeader lang={lang} active="rewards" title={R.title} sub={R.sub} />

        <div className="mt-8 grid grid-cols-1 gap-3 md:grid-cols-2 [&>*]:min-w-0">
          {R.types.map((x) => (
            <section key={x.id} id={x.id} className="card scroll-mt-20 p-5 hover:transform-none">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0">
                  <h2 className="flex items-center gap-2 text-lg font-bold leading-snug"><Icon name={x.icon as IconName} className="size-5 text-lime" />{x.name}</h2>
                  <div className="mt-0.5 text-xs text-ink-3 [overflow-wrap:anywhere]">{x.alias}</div>
                </div>
                <span className={`shrink-0 rounded-md px-2 py-0.5 text-xs font-bold ${CASH_CLS[x.cash]}`}>{x.cash === "yes" ? R.yes : x.cash === "no" ? R.no : R.profit}</span>
              </div>
              <p className="mt-3 text-sm leading-relaxed text-ink-2">{x.what}</p>
              <div className="mt-3 grid grid-cols-1 gap-2 text-sm sm:grid-cols-2">
                <div>
                  <div className="text-xs font-bold uppercase tracking-wider text-lime">✓ {R.canT}</div>
                  <ul className="mt-1 space-y-1 text-ink-2">{x.can.map((c) => <li key={c}>{c}</li>)}</ul>
                </div>
                <div>
                  <div className="text-xs font-bold uppercase tracking-wider text-rose">✗ {R.cannotT}</div>
                  <ul className="mt-1 space-y-1 text-ink-2">{x.cannot.map((c) => <li key={c}>{c}</li>)}</ul>
                </div>
              </div>
              <p className="mt-3 rounded-lg bg-white/[0.03] px-3 py-2 text-xs leading-relaxed text-ink-2">{x.tip}</p>
            </section>
          ))}
        </div>

        <h2 className="mt-12 font-display text-2xl font-semibold tracking-tight">{R.rulesT}</h2>
        <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
          {R.rules.map(([h, b], i) => (
            <div key={h} className="card p-5 hover:transform-none">
              <div className="flex items-start gap-3">
                <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-amber/10 font-mono text-xs font-bold text-amber">{i + 1}</span>
                <div>
                  <h3 className="font-bold leading-snug">{h}</h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-ink-2">{b}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        <section className="card mt-8 p-6 hover:transform-none ring-1 ring-lime/20">
          <h2 className="font-display text-xl font-semibold tracking-tight">{R.checkT}</h2>
          <ul className="mt-3 space-y-2 text-sm text-ink-2">{R.check.map((c) => <li key={c} className="flex gap-2"><span className="text-lime">•</span>{c}</li>)}</ul>
        </section>
      </main>
      <Footer t={t} fetchedAt={Date.now()} lang={lang} />
    </>
  );
}
