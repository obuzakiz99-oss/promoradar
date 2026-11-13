"use client";
import { useEffect, useMemo, useState } from "react";

type Pt = { t: number; apy: number; tvl: number };
const RANGES = [30, 90, 365] as const;
const TX = {
  uk: { title: "Історія APY", d: "дн", y: "рік", min: "мін", avg: "серед", max: "макс", load: "Завантаження…", fail: "Історія зараз недоступна", now: "зараз", src: "дані: DefiLlama" },
  en: { title: "APY history", d: "d", y: "1y", min: "min", avg: "avg", max: "max", load: "Loading…", fail: "History is unavailable right now", now: "now", src: "data: DefiLlama" },
  ru: { title: "История APY", d: "дн", y: "год", min: "мин", avg: "сред", max: "макс", load: "Загрузка…", fail: "История сейчас недоступна", now: "сейчас", src: "данные: DefiLlama" },
} as const;
const cache = new Map<string, Pt[]>();
const pct = (x: number) => `${x >= 100 ? x.toFixed(0) : x.toFixed(2)}%`;

/**
 * Our own APY chart for a DeFi pool (owner 13.11: show the history on the site instead of sending people to DefiLlama).
 * Loaded only when the pool's details are opened; the public DefiLlama chart API allows browser requests.
 */
export function ApyHistory({ id, lang }: { id: string; lang: "uk" | "en" | "ru" }) {
  const L = TX[lang];
  const [pts, setPts] = useState<Pt[] | null | "fail">(cache.get(id) ?? null);
  const [range, setRange] = useState<(typeof RANGES)[number]>(90);
  const [hover, setHover] = useState<number | null>(null);

  useEffect(() => {
    if (cache.has(id)) return;
    let live = true;
    fetch(`https://yields.llama.fi/chart/${encodeURIComponent(id)}`)
      .then((r) => (r.ok ? r.json() : Promise.reject(r.status)))
      .then((j) => {
        const list: Pt[] = (j?.data ?? []).map((x: { timestamp: string; apy: number | null; tvlUsd: number }) => ({ t: Date.parse(x.timestamp), apy: x.apy ?? 0, tvl: x.tvlUsd })).filter((x: Pt) => Number.isFinite(x.t));
        cache.set(id, list);
        if (live) setPts(list);
      })
      .catch(() => live && setPts("fail"));
    return () => { live = false; };
  }, [id]);

  const view = useMemo(() => {
    if (!Array.isArray(pts) || !pts.length) return null;
    const from = pts[pts.length - 1].t - range * 86400_000;
    const v = pts.filter((p) => p.t >= from);
    if (v.length < 2) return null;
    const ys = v.map((p) => p.apy);
    // a few extreme days would flatten the line: cap the scale at the 98th percentile
    const sorted = [...ys].sort((a, b) => a - b);
    const top = Math.max(sorted[Math.floor(sorted.length * 0.98)] ?? 0, ys[ys.length - 1]) * 1.08 || 1;
    return { v, min: sorted[0], max: sorted[sorted.length - 1], avg: ys.reduce((a, b) => a + b, 0) / ys.length, top };
  }, [pts, range]);

  const W = 560, H = 140;
  const x = (i: number) => (view ? (i / (view.v.length - 1)) * W : 0);
  const y = (a: number) => (view ? H - (Math.min(a, view.top) / view.top) * H : 0);
  const line = view ? view.v.map((p, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(p.apy).toFixed(1)}`).join("") : "";
  const h = hover !== null && view ? view.v[hover] : null;
  const date = (t: number) => new Date(t).toLocaleDateString(lang === "uk" ? "uk-UA" : lang === "ru" ? "ru-RU" : "en-GB", { day: "numeric", month: "short", year: range === 365 ? "2-digit" : undefined });

  return (
    <div className="rounded-xl border border-line bg-white/[0.02] p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="text-sm font-bold">{L.title}</div>
        <div className="flex gap-1" role="group" aria-label={L.title}>
          {RANGES.map((r) => (
            <button key={r} type="button" onClick={() => setRange(r)} aria-pressed={range === r}
              className={`h-8 rounded-lg px-2.5 font-mono text-xs font-bold ${range === r ? "bg-lime text-on-accent" : "text-ink-3 hover:bg-white/5 hover:text-ink"}`}>
              {r === 365 ? L.y : `${r}${L.d}`}
            </button>
          ))}
        </div>
      </div>
      {pts === null ? <p className="py-10 text-center text-xs text-ink-3">{L.load}</p>
        : !view ? <p className="py-10 text-center text-xs text-ink-3">{L.fail}</p> : (
          <>
            <div className="mt-2 font-mono text-xs text-ink-3">
              {h ? <span><span className="text-ink-2">{date(h.t)}</span> · <b className="text-lime">{pct(h.apy)}</b></span>
                : <span>{L.min} <b className="text-ink-2">{pct(view.min)}</b> · {L.avg} <b className="text-ink-2">{pct(view.avg)}</b> · {L.max} <b className="text-ink-2">{pct(view.max)}</b></span>}
            </div>
            <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className="mt-2 h-32 w-full touch-none" role="img" aria-label={`${L.title}: ${pct(view.min)}–${pct(view.max)}`}
              onPointerMove={(e) => { const r = e.currentTarget.getBoundingClientRect(); setHover(Math.max(0, Math.min(view.v.length - 1, Math.round(((e.clientX - r.left) / r.width) * (view.v.length - 1))))); }}
              onPointerLeave={() => setHover(null)}>
              <line x1="0" x2={W} y1={y(view.avg)} y2={y(view.avg)} stroke="currentColor" className="text-ink-3" strokeDasharray="3 4" strokeWidth="1" vectorEffect="non-scaling-stroke" opacity="0.5" />
              <path d={`${line}L${W},${H}L0,${H}Z`} className="fill-lime/10" />
              <path d={line} fill="none" stroke="currentColor" className="text-lime" strokeWidth="2" vectorEffect="non-scaling-stroke" strokeLinejoin="round" />
              {h && hover !== null && <line x1={x(hover)} x2={x(hover)} y1="0" y2={H} stroke="currentColor" className="text-ink-2" strokeWidth="1" vectorEffect="non-scaling-stroke" />}
            </svg>
            <div className="mt-1 flex justify-between font-mono text-xs text-ink-3">
              <span>{date(view.v[0].t)}</span>
              <span>{L.src}</span>
              <span>{L.now}</span>
            </div>
          </>
        )}
    </div>
  );
}
