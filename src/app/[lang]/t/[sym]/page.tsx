import { lpSlug } from "@/lib/lpslug";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getDict, isLocale, type Locale } from "@/lib/i18n";
import { getTokens, isStableSym } from "@/lib/tokens";
import { venueOf } from "@/config/site";
import { compactUsd, duration } from "@/lib/format";
import { withBase } from "@/lib/base";
import { VenueLogo } from "@/components/VenueLogo";
import { PromoCard } from "@/components/PromoCard";
import { Footer } from "@/components/Sections";
import { getUnlocks } from "@/lib/unlocks";

export const revalidate = 900;
export const dynamicParams = false;
export async function generateStaticParams() {
  const { tokens } = await getTokens();
  return [...tokens.keys()].map((sym) => ({ sym }));
}

type Params = Promise<{ lang: string; sym: string }>;

const TOKEN_TX: Record<Locale, {
  title: (s: string) => string; desc: (s: string) => string; back: string; price: string; promos: (s: string) => string; lpReward: (s: string) => string; lpStake: (s: string) => string;
  earn: (s: string) => string; none: string; stake: string; apr: string; ends: string; starts: string; flexible: string; fixed: (d: number) => string; onchain: string; open: string;
  newUsers: string; cap: string; all: string; perPerson: string;
}> = {
  uk: {
    title: (s) => `${s}: акції, Launchpool і стейкінг`, desc: (s) => `Де зараз роздають ${s}, де його застейкати під найвищий відсоток і в яких Launchpool його можна отримати — з усіх бірж в одному місці.`,
    back: "Усі токени", price: "Ціна", promos: (s) => `Акції, де роздають ${s}`, lpReward: (s) => `Launchpool: застейкайте — отримайте ${s}`, lpStake: (s) => `Launchpool, де можна застейкати ${s}`,
    earn: (s) => `Найкращі ставки Earn на ${s}`, none: "Зараз немає.", stake: "Стейк", apr: "APR", ends: "кінець через", starts: "старт через", flexible: "гнучкий", fixed: (d) => `фікс. ${d} дн.`, onchain: "on-chain",
    open: "Відкрити", newUsers: "для нових", cap: "ліміт", all: "Усі токени", perPerson: "на 1 людину",
  },
  en: {
    title: (s) => `${s}: promos, Launchpools and staking`, desc: (s) => `Where ${s} is being given away right now, where to stake it at the best rate and which Launchpools pay it out — all exchanges in one place.`,
    back: "All tokens", price: "Price", promos: (s) => `Promos giving away ${s}`, lpReward: (s) => `Launchpools: stake and get ${s}`, lpStake: (s) => `Launchpools where you can stake ${s}`,
    earn: (s) => `Best Earn rates for ${s}`, none: "None right now.", stake: "Stake", apr: "APR", ends: "ends in", starts: "starts in", flexible: "flexible", fixed: (d) => `fixed ${d} d`, onchain: "on-chain",
    open: "Open", newUsers: "new users", cap: "cap", all: "All tokens", perPerson: "per person",
  },
  ru: {
    title: (s) => `${s}: акции, Launchpool и стейкинг`, desc: (s) => `Где сейчас раздают ${s}, где его застейкать под самый высокий процент и в каких Launchpool его можно получить — все биржи в одном месте.`,
    back: "Все токены", price: "Цена", promos: (s) => `Акции, где раздают ${s}`, lpReward: (s) => `Launchpool: застейкайте — получите ${s}`, lpStake: (s) => `Launchpool, где можно застейкать ${s}`,
    earn: (s) => `Лучшие ставки Earn на ${s}`, none: "Сейчас нет.", stake: "Стейк", apr: "APR", ends: "конец через", starts: "старт через", flexible: "гибкий", fixed: (d) => `фикс. ${d} дн.`, onchain: "on-chain",
    open: "Открыть", newUsers: "для новых", cap: "лимит", all: "Все токены", perPerson: "на 1 человека",
  },
};

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { lang, sym } = await params;
  if (!isLocale(lang)) return {};
  const T = TOKEN_TX[lang];
  return { title: T.title(sym), description: T.desc(sym), alternates: { canonical: `/${lang}/t/${sym}` } };
}

const UNLOCK_TX: Record<Locale, (d: string, left: string) => string> = { uk: (d, l) => `Наступний розлок: ${d} (через ${l})`, en: (d, l) => `Next unlock: ${d} (in ${l})`, ru: (d, l) => `Следующий разлок: ${d} (через ${l})` };
const UNLOCK_CAP: Record<Locale, string> = { uk: "капіталізації", en: "of market cap", ru: "капитализации" };
const fmtPrice = (x: number) => (x >= 1000 ? `$${x.toLocaleString("en-US", { maximumFractionDigits: 0 })}` : x >= 1 ? `$${x.toFixed(2)}` : `$${x.toPrecision(3)}`);

export default async function TokenPage({ params }: { params: Params }) {
  const { lang, sym } = await params;
  if (!isLocale(lang)) notFound();
  const t = getDict(lang), T = TOKEN_TX[lang];
  const { tokens, fetchedAt } = await getTokens(lang);
  const tk = tokens.get(sym);
  if (!tk) notFound();
  const now = fetchedAt;
  const coinV = { name: sym, logo: tk.logo, color: "#2a3140", ink: "#e8ecf1", monogram: sym.slice(0, 3) };
  const stable = isStableSym(sym);
  const unlock = stable ? undefined : (await getUnlocks()).rows.find((u) => u.sym === sym && u.date > now);
  const related = [...tokens.values()].filter((x) => x.sym !== sym).sort((a, b) => (b.promos.length + b.lpReward.length) - (a.promos.length + a.lpReward.length)).slice(0, 24);

  const Section = ({ title, children, n }: { title: string; children: React.ReactNode; n: number }) => (
    <section className="mt-10">
      <h2 className="font-display text-2xl font-semibold tracking-tight">{title} <span className="font-mono text-base text-ink-3">{n}</span></h2>
      {n ? children : <p className="mt-3 text-sm text-ink-3">{T.none}</p>}
    </section>
  );

  return (
    <>
      <main className="mx-auto max-w-7xl px-4 pb-20 pt-8 sm:px-6">
        <nav className="text-sm font-semibold text-ink-3"><Link href={`/${lang}/t`} className="hover:text-ink">← {T.back}</Link></nav>
        <header className="mt-6 flex flex-col gap-5 rounded-[2rem] border border-line bg-bg-2 p-6 sm:flex-row sm:items-center sm:p-10">
          <VenueLogo v={coinV} size={72} rounded="rounded-full" />
          <div className="flex-1">
            <h1 className="font-display text-3xl font-semibold tracking-tight sm:text-5xl">{sym}</h1>
            <p className="mt-2 max-w-2xl text-sm text-ink-2">{T.desc(sym)}</p>
          </div>
          {tk.price !== undefined && !stable && (
            <div className="text-right">
              <div className="text-xs font-bold uppercase tracking-wider text-ink-3">{T.price}</div>
              <div className="font-mono text-2xl font-bold">{fmtPrice(tk.price)}</div>
              {tk.change !== undefined && <div className={`font-mono text-sm font-bold ${tk.change >= 0 ? "text-lime" : "text-rose"}`}>{tk.change >= 0 ? "+" : ""}{tk.change.toFixed(1)}% · 24h</div>}
            </div>
          )}
        </header>
        {unlock && (
          <a href={withBase(`/${lang}/unlocks/`)} className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-1 rounded-2xl border border-amber/30 bg-amber/[0.06] px-5 py-3.5 text-sm">
            <span className="font-bold text-amber">🔓 {UNLOCK_TX[lang](new Date(unlock.date).toISOString().slice(0, 10), duration(unlock.date - now, t.time))}</span>
            <span className="font-mono text-ink-2">{compactUsd(unlock.usd)} · {unlock.pctCap.toFixed(2)}% {UNLOCK_CAP[lang]}</span>
            <span className="text-ink-3">{unlock.sale}</span>
          </a>
        )}

        {!stable && (
          <Section title={T.promos(sym)} n={tk.promos.length}>
            <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {tk.promos.slice(0, 30).map((p, i) => <PromoCard key={p.id} p={p} t={t} lang={lang} now={now} index={i} />)}
            </div>
          </Section>
        )}

        <Section title={T.lpReward(sym)} n={tk.lpReward.length}>
          <div className="mt-5 grid grid-cols-1 gap-3 md:grid-cols-2">
            {tk.lpReward.map((p) => (
              <a key={p.id} href={withBase(`/${lang}/lp/${lpSlug(p)}/`)} className="card flex items-center gap-3 p-4">
                <VenueLogo v={venueOf(p.exchange)} size={32} rounded="rounded-lg" />
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-bold">{venueOf(p.exchange).name} · {p.name}</div>
                  <div className="mt-0.5 flex flex-wrap gap-x-3 font-mono text-xs text-ink-3">
                    {p.pools.map((x) => <span key={x.stake}>{T.stake} {x.stake}{x.apr ? ` · ${x.apr.toFixed(1)}%` : ""}{x.newUsers ? ` · ${T.newUsers}` : ""}</span>)}
                  </div>
                </div>
                <span className="shrink-0 font-mono text-xs font-bold text-ink-2">{p.start > now ? `${T.starts} ${duration(p.start - now, t.time)}` : `${T.ends} ${duration(p.end - now, t.time)}`}</span>
              </a>
            ))}
          </div>
        </Section>

        <Section title={T.lpStake(sym)} n={tk.lpStake.length}>
          <div className="mt-5 grid grid-cols-1 gap-3 md:grid-cols-2">
            {tk.lpStake.sort((a, b) => (b.pool.apr ?? 0) - (a.pool.apr ?? 0)).map(({ project: p, pool }) => (
              <a key={`${p.id}:${pool.stake}`} href={withBase(`/${lang}/lp/${lpSlug(p)}/`)} className="card flex items-center gap-3 p-4">
                <VenueLogo v={venueOf(p.exchange)} size={32} rounded="rounded-lg" />
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-bold">{T.stake} {pool.stake} → {p.token}</div>
                  <div className="mt-0.5 font-mono text-xs text-ink-3">{venueOf(p.exchange).name}{pool.maxStake ? ` · ${T.cap} ${pool.maxStake.toLocaleString("en-US")} ${pool.stake}` : ""}{pool.newUsers ? ` · ${T.newUsers}` : ""} · {p.start > now ? `${T.starts} ${duration(p.start - now, t.time)}` : `${T.ends} ${duration(p.end - now, t.time)}`}</div>
                </div>
                {pool.apr !== undefined && <span className="shrink-0 font-mono text-lg font-bold text-lime">{pool.apr.toFixed(1)}%</span>}
              </a>
            ))}
          </div>
        </Section>

        <Section title={T.earn(sym)} n={tk.earn.length}>
          <div className="mt-5 overflow-hidden rounded-2xl border border-line">
            {tk.earn.map((o, i) => (
              <a key={i} href={o.url} target="_blank" rel="noopener" className="flex items-center gap-3 border-b border-line px-4 py-3 last:border-0 hover:bg-white/[0.03]">
                <VenueLogo v={venueOf(o.exchange)} size={28} rounded="rounded-lg" />
                <span className="text-sm font-bold">{venueOf(o.exchange).name}</span>
                <span className="text-xs text-ink-3">{o.type === "fixed" ? T.fixed(o.days ?? 0) : o.type === "onchain" ? T.onchain : T.flexible}{o.newUsers ? ` · ${T.newUsers}` : ""}{o.maxAmount ? ` · ${T.cap} ${o.maxAmount.toLocaleString("en-US")}` : ""}</span>
                <span className="ml-auto font-mono text-lg font-bold text-lime">{o.apr.toFixed(2)}%</span>
              </a>
            ))}
          </div>
        </Section>

        {related.length > 0 && (
          <section className="mt-16">
            <h2 className="text-xs font-bold uppercase tracking-wider text-ink-3">{T.all}</h2>
            <div className="mt-4 flex flex-wrap gap-2">
              {related.map((x) => (
                <Link key={x.sym} href={`/${lang}/t/${x.sym}`} className="flex h-9 items-center gap-2 rounded-xl border border-line bg-white/[0.02] pl-1.5 pr-3 text-sm font-bold text-ink-2 hover:border-line-2 hover:text-ink">
                  <VenueLogo v={{ name: x.sym, logo: x.logo, color: "#2a3140", ink: "#e8ecf1", monogram: x.sym.slice(0, 3) }} size={22} rounded="rounded-full" /> {x.sym}
                </Link>
              ))}
            </div>
          </section>
        )}
      </main>
      <Footer t={t} fetchedAt={fetchedAt} lang={lang} />
    </>
  );
}
