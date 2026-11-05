"use client";
import { useEffect, useMemo, useState } from "react";
import type { Category, Venue } from "@/lib/types";
import { VenueLogo } from "./VenueLogo";

export interface RadarItem { id: string; venue: string; title: string; category: Category; usd?: number; label?: string; href: string }

const CATS: Array<Category | "all"> = ["all", "airdrop", "competition", "bonus", "earn", "listing"];
const MAX = 12, MAX_PHONE = 9;   // fewer, roomier blips on narrow screens (easier to tap)
const usdFmt = (x: number) => (x >= 1e6 ? `$${+(x / 1e6).toFixed(1)}M` : x >= 1e3 ? `$${Math.round(x / 1e3)}K` : `$${Math.round(x)}`);

/** Blip positions: two rings, spread evenly, inner ring first (biggest venues closest to the centre). */
function spots(n: number): Array<[number, number]> {
  const inner = Math.min(n, 5), outer = n - inner;
  const ring = (k: number, r: number, off: number) => Array.from({ length: k }, (_, i) => {
    const a = off + (i / k) * Math.PI * 2;
    return [50 + r * Math.cos(a), 50 + r * Math.sin(a)] as [number, number];
  });
  return [...ring(inner, 22, -Math.PI / 2.4), ...ring(outer, 39, -Math.PI / 3)];
}

export function RadarPicker({ items, venues, labels, catLabels, venueBase }: {
  items: RadarItem[]; venues: Record<string, Venue>;
  labels: { all: string; hint: string; promos: string; open: string; allOf: string; cats: Partial<Record<Category, string>> };
  catLabels: Record<Category, string>; venueBase: string;
}) {
  const [cat, setCat] = useState<Category | "all">("all");
  const [sel, setSel] = useState<string | null>(null);
  const [max, setMax] = useState(MAX);
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 640px)");
    const on = () => setMax(mq.matches ? MAX_PHONE : MAX);
    on(); mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, []);

  const ranked = useMemo(() => {
    const m = new Map<string, RadarItem[]>();
    for (const it of items) if (cat === "all" || it.category === cat) m.set(it.venue, [...(m.get(it.venue) ?? []), it]);
    return [...m.entries()].filter(([v]) => venues[v]).sort((a, b) => b[1].length - a[1].length).slice(0, max);
  }, [items, cat, venues, max]);
  const pos = spots(ranked.length);
  // nothing picked yet (or the pick isn't in this category) → show the busiest venue, so the card is never empty
  const cur = ranked.find(([v]) => v === sel) ?? ranked[0];
  const top = cur ? cur[1].slice().sort((a, b) => (b.usd ?? 0) - (a.usd ?? 0)).slice(0, 4) : [];
  const counts = useMemo(() => Object.fromEntries(CATS.map((c) => [c, c === "all" ? items.length : items.filter((i) => i.category === c).length])), [items]);

  return (
    <div className="w-full">
      <div className="mb-4 flex flex-wrap justify-center gap-1">
        {CATS.filter((c) => counts[c] > 0).map((c) => (
          <button key={c} type="button" onClick={() => { setCat(c); setSel(null); }}
            className={`h-8 rounded-full border px-2.5 text-xs font-bold transition ${cat === c ? "border-lime/50 bg-lime/15 text-lime" : "border-line bg-white/[0.02] text-ink-3 hover:text-ink"}`}>
            {c === "all" ? labels.all : labels.cats[c] ?? catLabels[c].split(" / ")[0]} <span className="font-mono opacity-70">{counts[c]}</span>
          </button>
        ))}
      </div>

      <div className="relative mx-auto aspect-square w-full max-w-[400px]">
        <div className="absolute inset-0 rounded-full border border-line-2 bg-[radial-gradient(circle_at_center,rgb(200_255_61/0.07),transparent_65%)]" />
        {[0.78, 0.44].map((s) => <div key={s} className="absolute rounded-full border border-line" style={{ inset: `${((1 - s) / 2) * 100}%` }} />)}
        <div className="absolute left-1/2 top-0 h-full w-px -translate-x-1/2 bg-line" />
        <div className="absolute left-0 top-1/2 h-px w-full -translate-y-1/2 bg-line" />
        <div className="pointer-events-none absolute inset-0 animate-sweep rounded-full" style={{ background: "conic-gradient(from 0deg, rgb(200 255 61 / 0.32), rgb(200 255 61 / 0.06) 18%, transparent 30%)" }} />
        <div className="absolute left-1/2 top-1/2 size-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-lime shadow-[0_0_24px_6px_rgb(200_255_61/0.5)]" />
        {ranked.map(([id, list], i) => {
          const [x, y] = pos[i];
          const v = venues[id];
          const on = cur?.[0] === id;
          return (
            <button key={id} type="button" onClick={() => setSel(id)} title={`${v.name} · ${list.length}`}
              aria-pressed={on} aria-label={`${v.name}: ${list.length} ${labels.promos}`}
              className="group absolute -translate-x-1/2 -translate-y-1/2 transition-transform hover:scale-110 focus:outline-none" style={{ left: `${x}%`, top: `${y}%` }}>
              <span className="absolute inset-0 animate-ping-slow rounded-full" style={{ background: v.color, animationDelay: `${(i * 0.7) % 6}s`, opacity: 0.3 }} />
              <span className={`relative block rounded-full ring-4 transition ${on ? "ring-lime" : "ring-bg group-hover:ring-line-2"}`}><VenueLogo v={v} size={i < 5 ? 44 : 36} rounded="rounded-full" /></span>
              <span className="absolute -right-1.5 -top-1.5 grid min-w-5 place-items-center rounded-full bg-surface px-1 font-mono text-[10px] font-bold text-ink ring-1 ring-line-2">{list.length}</span>
            </button>
          );
        })}
      </div>

      <div className="mx-auto mt-4 h-[12.5rem] max-w-[400px]">
        {!cur ? (
          <p className="pt-6 text-center text-sm text-ink-3">{labels.hint}</p>
        ) : (
          <div className="card p-4 hover:transform-none">
            <div className="flex items-center gap-2.5">
              <VenueLogo v={venues[cur[0]]} size={28} rounded="rounded-lg" />
              <span className="font-bold">{venues[cur[0]].name}</span>
              <span className="text-xs text-ink-3">{cur[1].length} {labels.promos}</span>
              <a href={`${venueBase}${cur[0]}/`} className="ml-auto text-xs font-bold text-lime hover:underline">{labels.allOf} →</a>
            </div>
            <ul className="mt-3 space-y-1.5">
              {top.map((it) => (
                <li key={it.id}>
                  <a href={it.href} className="flex items-baseline gap-2 rounded-lg px-2 py-1.5 text-sm hover:bg-white/[0.04]">
                    <span className="line-clamp-1 flex-1 text-ink-2">{it.title}</span>
                    {it.usd ? <span className="shrink-0 font-mono text-xs font-bold text-lime">{usdFmt(it.usd)}</span> : it.label ? <span className="shrink-0 font-mono text-xs font-bold text-lime">{it.label}</span> : null}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
