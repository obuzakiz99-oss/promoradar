"use client";
import { useMemo, useState } from "react";
import { nfLocale } from "@/lib/format";
import type { Locale } from "@/lib/i18n";
import type { Venue } from "@/lib/types";
import type { Hedge, PoolProject } from "@/lib/pools";
import { TOOLS } from "@/lib/i18n-tools";
import { hedgeCalc } from "@/lib/proscons";
import { VenueLogo } from "./VenueLogo";
import { withBase } from "@/lib/base";
import { lpSlug } from "@/lib/lpslug";

export interface SafeItem { key: string; venue: Venue; title: string; sub: string; apr: number; aprMax?: number; capUsd?: number; url: string }
export interface PromoItem { key: string; venue: Venue; title: string; usd: number; label: string; href: string }

const pct = (x: number) => `${x >= 100 ? Math.round(x) : x.toFixed(x >= 10 ? 1 : 2)}%`;
const usd = (x: number) => (x >= 1e6 ? `$${(x / 1e6).toFixed(1)}M` : x >= 1e4 ? `$${Math.round(x / 1e3)}K` : `$${x.toFixed(x < 10 ? 2 : 0)}`);

export function BestBoard({ lang, safe, pools, hedge, prices, exchanges, promos, now }: {
  lang: Locale; safe: SafeItem[]; pools: PoolProject[]; hedge: Record<string, Hedge>; prices: Record<string, number>;
  exchanges: Record<string, Venue>; promos: PromoItem[]; now: number;
}) {
  const T = TOOLS[lang];
  const [text, setText] = useState("1000");
  const amount = Math.max(0, Number(text.replace(/[^\d.]/g, "")) || 0);
  const month = (apr: number, cap?: number) => (Math.min(amount, cap ?? Infinity) * apr) / 100 / 12;

  const hedged = useMemo(() => {
    const rows: Array<{ key: string; p: PoolProject; stake: string; apr: number; hedged: number; venue?: string; capUsd?: number }> = [];
    for (const p of pools) for (const pool of p.pools) {
      const price = prices[pool.stake];
      const capUsd = pool.maxStake && price ? pool.maxStake * price : undefined;
      const hc = hedgeCalc(pool, p, hedge, Math.min(amount, capUsd ?? Infinity), now, capUsd);
      if (!hc.needed || !hc.possible || (hc.hedgedApr ?? 0) <= 0) continue;
      rows.push({ key: `${p.id}${pool.stake}`, p, stake: pool.stake, apr: pool.apr ?? 0, hedged: hc.hedgedApr!, venue: hc.venue, capUsd: hc.sensibleUsd ?? capUsd });
    }
    return rows.sort((a, b) => b.hedged - a.hedged).slice(0, 5);
  }, [pools, hedge, prices, amount, now]);

  const Section = ({ title, sub, children }: { title: string; sub: string; children: React.ReactNode }) => (
    <section className="mt-10">
      <h2 className="font-display text-2xl font-semibold tracking-tight">{title}</h2>
      <p className="mt-1 text-sm text-ink-3">{sub}</p>
      <div className="mt-4 space-y-2">{children}</div>
    </section>
  );
  const Row = ({ v, title, sub, right, rightSub, href }: { v: Venue; title: string; sub: string; right: string; rightSub?: string; href: string }) => (
    <a href={href} target={href.startsWith("http") ? "_blank" : undefined} rel="noopener" className="card grid grid-cols-[auto_1fr_auto] items-center gap-4 p-4" style={{ ["--tint" as string]: v.color }}>
      <VenueLogo v={v} size={40} />
      <div className="min-w-0"><div className="break-words font-bold">{title}</div><div className="break-words text-xs font-semibold text-ink-3">{sub}</div></div>
      <div className="text-right"><div className="font-mono text-xl font-bold text-ink">{right}</div>{rightSub && <div className="font-mono text-xs font-bold text-lime">{rightSub}</div>}</div>
    </a>
  );

  return (
    <div>
      <div className="card mt-8 flex flex-wrap items-center gap-4 p-5 hover:transform-none">
        <label htmlFor="best-amt" className="text-sm font-semibold text-ink-2">{T.amount}</label>
        <div className="relative w-56">
          <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 font-display text-xl text-ink-3">$</span>
          <input id="best-amt" inputMode="decimal" value={text} onChange={(e) => setText(e.target.value.replace(/[^\d.]/g, "").slice(0, 12))}
            className="h-12 w-full rounded-xl border border-line-2 bg-bg/60 pl-8 pr-3 font-display text-2xl font-semibold text-ink focus:border-lime/60 focus:outline-none" />
        </div>
        <div className="flex gap-2">
          {[100, 1000, 10000].map((v) => <button key={v} onClick={() => setText(String(v))} className={`h-9 rounded-lg px-3 font-mono text-xs font-bold ${amount === v ? "bg-lime text-on-accent" : "bg-white/5 text-ink-2 hover:text-ink"}`}>${v.toLocaleString(nfLocale(lang))}</button>)}
        </div>
      </div>

      <Section title={`${T.safe}`} sub={T.safeSub}>
        {safe.length ? safe.map((s) => (
          <Row key={s.key} v={s.venue} title={s.title} sub={s.sub} href={s.url}
            right={pct(s.apr)} rightSub={`${usd(month(s.apr, s.capUsd))} ${T.perMonth}${s.aprMax ? ` · ↑${pct(s.aprMax)}` : ""}`} />
        )) : <p className="text-ink-3">{T.none}</p>}
      </Section>

      <Section title={`${T.hedged}`} sub={T.hedgedSub}>
        {hedged.length ? hedged.map((h) => (
          <Row key={h.key} v={exchanges[h.p.exchange]} title={`${h.p.name}: ${h.stake} → ${h.p.token}`} sub={`APR ${pct(h.apr)} · short ${h.stake} @ ${h.venue} · ${T.est}`} href={withBase(`/${lang}/lp/${lpSlug(h.p)}/`)}
            right={`≈${pct(h.hedged)}`} rightSub={`${usd(month(h.hedged, h.capUsd))} ${T.perMonth}`} />
        )) : <p className="text-ink-3">{T.none}</p>}
      </Section>

      <Section title={`${T.promos}`} sub={T.promosSub}>
        {promos.map((p) => <Row key={p.key} v={p.venue} title={p.title} sub={p.venue.name} href={p.href} right={usd(p.usd)} rightSub={p.label} />)}
      </Section>
    </div>
  );
}
