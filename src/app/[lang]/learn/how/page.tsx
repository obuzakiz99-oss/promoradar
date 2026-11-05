import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getDict, isLocale } from "@/lib/i18n";
import { LEARN } from "@/lib/i18n-learn";
import { LEVEL_CLS, LEVEL_TXT, type Level } from "@/lib/level";
import { LP_ANN } from "@/lib/pools";
import { GUIDES } from "@/lib/guides";
import Link from "next/link";
import { venueOf } from "@/config/site";
import { Footer } from "@/components/Sections";
import { LearnHeader, Steps } from "@/components/LearnNav";
import { VenueLogo } from "@/components/VenueLogo";

type Params = Promise<{ lang: string }>;

/** Official Launchpool / Earn pages, simplest exchanges first. */
const PAGES: Record<string, string> = {
  binance: "https://www.binance.com/en/launchpool", bybit: "https://www.bybit.com/en/trade/spot/launchpool", gate: "https://www.gate.com/launchpool",
  bitget: "https://www.bitget.com/launchhub/poolx", kucoin: "https://www.kucoin.com/gempool", mexc: "https://www.mexc.com/launchpool", ...LP_ANN,
};

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { lang } = await params;
  if (!isLocale(lang)) return {};
  return { title: LEARN[lang].how.title, description: LEARN[lang].how.sub };
}

export default async function LearnHow({ params }: { params: Params }) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  const t = getDict(lang), H = LEARN[lang].how;
  return (
    <>
      <main className="mx-auto max-w-3xl px-4 pb-20 pt-10 sm:px-6">
        <LearnHeader lang={lang} active="how" title={H.title} sub={H.sub} />
        <div className="mt-8 rounded-2xl border border-lime/25 bg-lime/[0.05] p-5">
          <h2 className="text-sm font-bold uppercase tracking-wider text-lime">{LEARN[lang].guides}</h2>
          {(["cex", "dex"] as const).map((kind) => {
            const list = GUIDES[lang].filter((g) => (venueOf(g.venue).kind === "cex") === (kind === "cex"));
            return (
              <div key={kind} className={kind === "dex" ? "adv mt-4" : "mt-3"}>
                <div className="mb-2 text-xs font-bold text-ink-3">{kind === "cex" ? "CEX" : "DEX / DeFi"} · {list.length}</div>
                <div className="flex flex-wrap gap-2">
                  {list.map((g) => (
                    <Link key={g.id} href={`/${lang}/learn/guide/${g.id}`} className="flex h-10 items-center gap-2 rounded-xl border border-line bg-white/[0.03] pl-1.5 pr-3.5 text-sm font-bold hover:border-lime/50">
                      <VenueLogo v={venueOf(g.venue)} size={26} rounded="rounded-lg" />{venueOf(g.venue).name}{g.steps.some((s) => s.img) ? " 📷" : ""}
                    </Link>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
        <nav className="mt-6 flex flex-wrap gap-2 text-sm font-bold">
          {H.sections.map((s) => <a key={s.id} href={`#${s.id}`} className="text-lime hover:underline">#{s.title.split(" /")[0].split(" (")[0]}</a>)}
        </nav>
        {H.sections.map((s) => {
          const lvl = s.level as Level;
          return (
            <section key={s.id} id={s.id} className="mt-12 scroll-mt-20">
              <div className="flex flex-wrap items-center gap-3">
                <h2 className="font-display text-2xl font-semibold tracking-tight">{s.title}</h2>
                <span className={`rounded-md px-2 py-0.5 text-xs font-bold ${LEVEL_CLS[lvl]}`} title={LEVEL_TXT[lang][lvl][1]}>{LEVEL_TXT[lang][lvl][0]}</span>
              </div>
              <div className="mt-5"><Steps steps={s.steps} /></div>
              <p className="mt-4 text-sm leading-relaxed text-ink-3">⚠️ {s.watch}</p>
            </section>
          );
        })}
        <section className="mt-14">
          <h2 className="font-display text-xl font-semibold tracking-tight">{H.links}</h2>
          <div className="mt-4 flex flex-wrap gap-2">
            {Object.entries(PAGES).map(([id, url]) => {
              const v = venueOf(id);
              return (
                <a key={id} href={url} target="_blank" rel="noopener" className="flex h-10 items-center gap-2 rounded-xl border border-line bg-white/[0.02] pl-1.5 pr-3 text-sm font-bold text-ink-2 hover:border-line-2 hover:text-ink">
                  <VenueLogo v={v} size={26} rounded="rounded-lg" />{v.name}
                </a>
              );
            })}
          </div>
        </section>
      </main>
      <Footer t={t} fetchedAt={Date.now()} lang={lang} />
    </>
  );
}
