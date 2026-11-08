import { lpSlug } from "@/lib/lpslug";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getDict, isLocale } from "@/lib/i18n";
import { TOOLS } from "@/lib/i18n-tools";
import { getPromos } from "@/lib/promos";
import { getPools, isStable, LP_API } from "@/lib/pools";
import { getEarn } from "@/lib/earn";
import { getDexPools } from "@/lib/dexpools";
import { venueOf } from "@/config/site";
import { slugOf, statusOf } from "@/lib/slug";
import { withBase } from "@/lib/base";
import { BestBoard, type PromoItem, type SafeItem } from "@/components/BestBoard";
import { PageHeader } from "@/components/PageHeader";
import { Footer } from "@/components/Sections";
import type { Venue } from "@/lib/types";

export const revalidate = 900;

/** "No price risk" means the big dollar stablecoins only — yield-bearing / synthetic "stables" (sUSDX, APXUSD…) can depeg. */
const SAFE = /^(USDT|USDC|USDC\.E|DAI|USDS|FDUSD|USD1|PYUSD)$/i;
type Params = Promise<{ lang: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { lang } = await params;
  if (!isLocale(lang)) return {};
  return { title: TOOLS[lang].bestTitle, description: TOOLS[lang].bestSub };
}

const dexVenue = (name: string, slug: string, logo?: string): Venue => {
  let h = 0; for (const c of slug) h = (h * 31 + c.charCodeAt(0)) % 360;
  return { id: slug, name, kind: "defi", color: `hsl(${h} 65% 60%)`, ink: "#0b0d10", monogram: name.slice(0, 2).toUpperCase(), logo };
};

export default async function Best({ params }: { params: Params }) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  const t = getDict(lang), T = TOOLS[lang];
  const [{ promos, fetchedAt }, pools, earn, dex] = await Promise.all([getPromos(lang), getPools(), getEarn(), getDexPools()]);
  const now = fetchedAt;
  const A = t.aprHub;

  // 1) no price risk: stablecoin Earn (best per exchange), stable-stake Launchpools, stablecoin DEX pools without IL
  const bestEarn = new Map<string, SafeItem>();
  for (const o of earn.offers) {
    if (!SAFE.test(o.coin) || o.newUsers || o.type === "fixed") continue;
    const key = `earn:${o.exchange}`;
    if ((bestEarn.get(key)?.apr ?? -1) >= o.apr) continue;
    bestEarn.set(key, { key, venue: venueOf(o.exchange), title: `${o.coin} · ${A.type[o.type]}`, sub: `${venueOf(o.exchange).name} Earn${o.tierNote ? ` · ↑ ${o.tierNote}` : ""}`, apr: o.apr, aprMax: o.aprMax, url: o.url });
  }
  const lpSafe: SafeItem[] = pools.projects.filter((p) => p.status === "live").flatMap((p) => p.pools.filter((x) => SAFE.test(x.stake) && (x.apr ?? 0) > 0).map((x) => ({
    key: `lp:${p.id}:${x.stake}`, venue: venueOf(p.exchange), title: `${x.stake} → ${p.token} · Launchpool`,
    sub: `${venueOf(p.exchange).name}${x.minStake ? ` · min ${x.minStake} ${x.stake}` : ""}${x.newUsers ? " · *" : ""}`, apr: x.apr!, capUsd: x.maxStake, url: withBase(`/${lang}/lp/${lpSlug(p)}/`),
  })));
  const dexSafe: SafeItem[] = dex.pools.filter((p) => p.stable && !p.il && p.tvl >= 50e6 && p.apy <= 30 && p.symbol.split(/[-/ ]+/).every((s) => SAFE.test(s))).sort((a, b) => Math.min(b.apy, b.apy30d ?? b.apy) - Math.min(a.apy, a.apy30d ?? a.apy)).slice(0, 4).map((p) => ({
    key: `dex:${p.id}`, venue: dexVenue(p.project, p.slug, p.logo), title: `${p.symbol} · ${p.project}`, sub: `${p.chain} · TVL $${Math.round(p.tvl / 1e6)}M`, apr: p.apy, url: p.url ?? `https://defillama.com/yields/pool/${p.id}`,
  }));
  const safe = [...bestEarn.values(), ...lpSafe, ...dexSafe].sort((a, b) => b.apr - a.apr).slice(0, 10);

  // 3) biggest live prize pools
  const top: PromoItem[] = promos.filter((p) => (p.reward?.usd ?? 0) > 0 && statusOf(p, now) !== "upcoming").sort((a, b) => b.reward!.usd! - a.reward!.usd!).slice(0, 6)
    .map((p) => ({ key: p.id, venue: p.venue, title: p.title, usd: p.reward!.usd!, label: t.cat[p.category], href: withBase(`/${lang}/p/${slugOf(p)}/`) }));

  const live = pools.projects.filter((p) => p.status === "live");
  const exchanges = Object.fromEntries(LP_API.map((id) => [id, venueOf(id)]));
  return (
    <>
      <main className="mx-auto max-w-7xl px-4 pb-20 pt-10 sm:px-6">
        <PageHeader lang={lang} title={T.bestTitle} sub={T.bestSub} updated={fetchedAt} nav={<a href={withBase(`/${lang}/learn/quiz/`)} className="inline-flex min-h-11 items-center text-sm font-bold text-ink-3 hover:text-ink">← {({"uk":"Підібрати мені","en":"Pick for me","ru":"Подобрать мне"} as Record<string, string>)[lang]}</a>} />
        <BestBoard lang={lang} safe={safe} pools={live} hedge={pools.hedge} prices={pools.prices} exchanges={exchanges} promos={top} now={now} />
        <p className="mt-10 text-xs text-ink-3">{t.lp.disclaimer} {t.aprHub.note}</p>
      </main>
      <Footer t={t} fetchedAt={fetchedAt} lang={lang} />
    </>
  );
}
