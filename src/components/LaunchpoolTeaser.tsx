import Link from "next/link";
import type { Dict, Locale } from "@/lib/i18n";
import type { PoolsData } from "@/lib/pools";
import { venueOf } from "@/config/site";
import { compactUsd } from "@/lib/format";
import { VenueLogo } from "./VenueLogo";

/** Homepage banner that sends people to the Launchpool Radar. */
export function LaunchpoolTeaser({ t, lang, data }: { t: Dict; lang: Locale; data: PoolsData }) {
  const live = data.projects.filter((p) => p.status !== "ended");
  const top = live.flatMap((p) => p.pools.map((x) => ({ p, x }))).filter((r) => r.x.apr !== undefined).sort((a, b) => b.x.apr! - a.x.apr!).slice(0, 3);
  const rewards = live.reduce((s, p) => s + (p.rewardUsd ?? 0), 0);
  return (
    <section className="mx-auto max-w-7xl px-4 pt-6 sm:px-6">
      <Link
        href={`/${lang}/launchpools`}
        className="card group relative grid grid-cols-1 gap-6 overflow-hidden p-6 sm:p-8 lg:grid-cols-[1fr_1.2fr] lg:items-center"
        style={{ background: "radial-gradient(40rem 20rem at 0% 0%, rgb(200 255 61 / 0.10), transparent 60%), var(--color-surface)" }}
      >
        <div>
          <div className="text-xs font-extrabold uppercase tracking-wider text-lime">{t.lp.kicker}</div>
          <div className="mt-2 font-display text-2xl font-semibold tracking-tight sm:text-3xl"><span className="text-gradient">Launchpool</span> Radar</div>
          <p className="mt-2 max-w-md text-sm text-ink-2">{t.lp.title} · {live.flatMap((p) => p.pools).length} {t.lp.statLive}{rewards ? ` · ${compactUsd(rewards)}` : ""}</p>
          <span className="btn btn-primary mt-5 h-11 px-5">{t.lp.calc} →</span>
        </div>
        <div className="grid gap-2">
          {top.map(({ p, x }) => (
            <div key={`${p.id}${x.stake}`} className="flex items-center gap-3 rounded-2xl border border-line bg-bg/40 px-4 py-3">
              <VenueLogo v={venueOf(p.exchange)} size={30} rounded="rounded-lg" />
              <div className="min-w-0 flex-1">
                <div className="break-words text-sm font-bold">{p.name}</div>
                <div className="text-xs text-ink-3">{t.lp.stake} {x.stake} → {p.token}</div>
              </div>
              <div className="font-mono text-lg font-bold text-lime">{x.apr! >= 100 ? Math.round(x.apr!) : x.apr!.toFixed(1)}%</div>
            </div>
          ))}
        </div>
      </Link>
    </section>
  );
}
