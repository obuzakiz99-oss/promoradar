import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getDict, isLocale } from "@/lib/i18n";
import { LEARN } from "@/lib/i18n-learn";
import { getEarn } from "@/lib/earn";
import { getPools, isStable } from "@/lib/pools";
import { getPromos } from "@/lib/promos";
import { poolLevel } from "@/lib/level";
import { venueOf } from "@/config/site";
import { slugOf } from "@/lib/slug";
import { withBase } from "@/lib/base";
import { Footer } from "@/components/Sections";
import { LearnHeader } from "@/components/LearnNav";
import { Quiz, type QuizItem } from "@/components/Quiz";

type Params = Promise<{ lang: string }>;

// beginners: only the plain dollar stablecoins; bonuses must really be sign-up / welcome offers on the exchange itself
const SAFE = /^(USDT|USDC)$/;
const WELCOME = /\b(new ?(user|comer)s?|newcomer|welcome|sign ?up|register|first (deposit|trade)|journey|start your)\b/i;
const DEFI = /\b(aave|on-?chain|defi|x ?layer|wallet|dex|futures|perp)\b/i;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { lang } = await params;
  if (!isLocale(lang)) return {};
  return { title: LEARN[lang].quiz.title, description: LEARN[lang].quiz.sub };
}

const TYPE: Record<string, Record<string, string>> = {
  uk: { flexible: "гнучкий", fixed: "фіксований", onchain: "on-chain" }, en: { flexible: "flexible", fixed: "fixed", onchain: "on-chain" }, ru: { flexible: "гибкий", fixed: "фиксированный", onchain: "on-chain" },
};

export default async function LearnQuiz({ params }: { params: Params }) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  const t = getDict(lang), Q = LEARN[lang].quiz;
  const [earn, pools, { promos, fetchedAt }] = await Promise.all([getEarn(), getPools(), getPromos()]);

  const items: QuizItem[] = [];
  // Earn on stablecoins: regular flexible / fixed (sane rates only) and new-user boosts
  const stableEarn = earn.offers.filter((o) => SAFE.test(o.coin) && o.apr > 0).sort((a, b) => b.apr - a.apr);
  for (const o of stableEarn) {
    const kind = o.newUsers ? "newEarn" : o.type === "fixed" ? "fixed" : o.type === "flexible" ? "earn" : null;
    if (!kind || (!o.newUsers && o.apr > 30)) continue;
    items.push({ key: `e:${o.exchange}:${o.coin}:${o.type}:${o.apr}`, kind, venue: venueOf(o.exchange), title: `${o.coin} · ${venueOf(o.exchange).name} Earn (${TYPE[lang][o.type]}${o.days ? `, ${o.days}d` : ""})`, apr: o.apr, capUsd: o.maxAmount, days: o.type === "fixed" ? o.days : undefined, url: o.url, external: true });
  }
  // live Launchpools: stablecoin stake (easy) and big-coin stake (medium)
  const live = pools.projects.filter((p) => p.status === "live");
  const lp = live.flatMap((p) => p.pools.filter((x) => (x.apr ?? 0) > 0 && !x.newUsers).map((x) => ({ p, x, lvl: poolLevel(x.stake, p.token) })))
    .filter((r) => r.lvl !== "hard").sort((a, b) => (b.x.apr ?? 0) - (a.x.apr ?? 0));
  for (const { p, x, lvl } of lp) {
    const px = isStable(x.stake) ? 1 : pools.prices[x.stake];
    items.push({ key: `lp:${p.id}:${x.stake}`, kind: lvl === "easy" ? "lp" : "lpMajor", venue: venueOf(p.exchange), title: `${x.stake} → ${p.token} · Launchpool`, apr: x.apr, capUsd: x.maxStake && px ? x.maxStake * px : undefined, url: p.url, external: true });
  }
  // new-user bonuses from the promo feed (biggest first)
  for (const p of promos.filter((p) => p.category === "bonus" && p.venue.kind === "cex" && WELCOME.test(p.title) && !DEFI.test(p.title) && (!p.endsAt || p.endsAt > fetchedAt)).sort((a, b) => (b.reward?.usd ?? 0) - (a.reward?.usd ?? 0)))
    items.push({ key: `b:${p.id}`, kind: "bonus", venue: p.venue, title: p.title, url: withBase(`/${lang}/p/${slugOf(p)}/`), external: false });

  return (
    <>
      <main className="mx-auto max-w-2xl px-4 pb-20 pt-10 sm:px-6">
        <LearnHeader lang={lang} active="quiz" title={Q.title} sub={Q.sub} />
        <Quiz lang={lang} items={items} startHref={withBase(`/${lang}/learn/start/`)} />
      </main>
      <Footer t={t} fetchedAt={fetchedAt} lang={lang} />
    </>
  );
}
