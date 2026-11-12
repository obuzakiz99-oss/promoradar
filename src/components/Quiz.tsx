"use client";
import { useMemo, useState } from "react";
import type { Locale } from "@/lib/i18n";
import type { Venue } from "@/lib/types";
import { LEARN } from "@/lib/i18n-learn";
import { VenueLogo } from "./VenueLogo";

export type QuizKind = "earn" | "fixed" | "newEarn" | "lp" | "lpMajor" | "bonus";
export interface QuizItem { key: string; kind: QuizKind; venue: Venue; title: string; apr?: number; capUsd?: number; days?: number; url: string; external: boolean }

const PLAN: Record<string, QuizKind[]> = {
  "none:short": ["earn", "lp", "fixed"], "none:month": ["earn", "lp", "fixed"], "none:long": ["fixed", "earn", "lp"],
  "some:short": ["lp", "earn", "lpMajor"], "some:month": ["lp", "lpMajor", "earn"], "some:long": ["lp", "fixed", "lpMajor"],
  "high:short": ["lpMajor", "lp", "earn"], "high:month": ["lpMajor", "lp", "fixed"], "high:long": ["lpMajor", "lp", "fixed"],
};

export function Quiz({ lang, items, startHref }: { lang: Locale; items: QuizItem[]; startHref: string }) {
  const Q = LEARN[lang].quiz;
  const [ans, setAns] = useState<Record<string, string>>({});
  const step = Q.q.findIndex((q) => !ans[q.id]);
  const done = step === -1;

  const picks = useMemo(() => {
    if (!done) return [];
    const order: QuizKind[] = [...(ans.account === "no" ? (["bonus", "newEarn"] as QuizKind[]) : []), ...PLAN[`${ans.risk}:${ans.term}`]];
    const out: QuizItem[] = [], usedVenue = new Set<string>();
    for (const kind of order) {
      const it = items.find((x) => x.kind === kind && !usedVenue.has(x.venue.id) && !out.includes(x)) ?? items.find((x) => x.kind === kind && !out.includes(x));
      if (it) { out.push(it); usedVenue.add(it.venue.id); }
      if (out.length === 3) break;
    }
    return out;
  }, [done, ans, items]);

  const amount = Number(ans.amount ?? 100);
  // income for a month, or for the whole term when the offer is shorter (e.g. a 2-day new-user deposit)
  const income = (it: QuizItem) => (it.apr ? (Math.min(amount, it.capUsd ?? Infinity) * it.apr) / 100 * Math.min(it.days ?? 30, 30) / 365 : undefined);
  const money = (x: number) => `$${x >= 10 ? x.toFixed(0) : x.toFixed(2)}`;

  if (!done) {
    const q = Q.q[step];
    return (
      <div className="card mt-8 p-6 hover:transform-none sm:p-8">
        <div className="flex gap-1.5">{Q.q.map((x, i) => <span key={x.id} className={`h-1.5 flex-1 rounded-full ${i <= step ? "bg-lime" : "bg-white/10"}`} />)}</div>
        <h2 className="mt-6 text-xl font-bold sm:text-2xl">{q.text}</h2>
        <div className="mt-5 grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
          {q.opts.map(([v, label]) => (
            <button key={v} type="button" onClick={() => setAns((s) => ({ ...s, [q.id]: v }))}
              className="flex h-14 items-center rounded-xl border border-line bg-white/[0.02] px-5 text-left font-semibold text-ink-2 transition hover:border-lime/50 hover:bg-lime/[0.06] hover:text-ink">
              {label}
            </button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="mt-8">
      <h2 className="font-display text-2xl font-semibold tracking-tight">{Q.result}</h2>
      {ans.account === "no" && <a href={startHref} className="mt-3 inline-block text-sm font-bold text-lime hover:underline">{Q.noAccount}</a>}
      {picks.length === 0 ? <p className="mt-4 text-ink-3">{Q.empty}</p> : (
        <div className="mt-5 grid gap-3 lg:grid-cols-2">
          {picks.map((it) => {
            const m = income(it);
            return (
              <a key={it.key} href={it.url} {...(it.external ? { target: "_blank", rel: "noopener" } : {})} className="card flex items-center gap-4 p-5">
                <VenueLogo v={it.venue} size={42} />
                <div className="min-w-0 flex-1">
                  <div className="font-bold">{it.title}</div>
                  <div className="mt-0.5 text-sm text-ink-2">{Q.why[it.kind === "newEarn" ? "bonus" : it.kind]}</div>
                </div>
                <div className="shrink-0 text-right">
                  {it.apr !== undefined && <div className="font-mono text-xl font-bold text-lime">{it.apr >= 100 ? Math.round(it.apr) : it.apr.toFixed(1)}%</div>}
                  {m !== undefined && <div className="font-mono text-xs text-ink-2">≈ +{money(m)} {it.days && it.days < 30 ? Q.perDays.replace("{d}", String(it.days)) : Q.perMonth}</div>}
                </div>
              </a>
            );
          })}
        </div>
      )}
      <button type="button" onClick={() => setAns({})} className="btn btn-ghost mt-6 h-11 px-5 text-sm">↺ {Q.again}</button>
    </div>
  );
}
