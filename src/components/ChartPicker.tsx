"use client";
import { useState } from "react";
import { LineChart, type Series } from "./LineChart";

const TX = {
  uk: { all: "Усі", token: "Токен", only: "Показати лише цей пул", reset: "Показати всі" },
  en: { all: "All", token: "Token", only: "Show only this pool", reset: "Show all" },
  ru: { all: "Все", token: "Токен", only: "Показать только этот пул", reset: "Показать все" },
} as const;

/**
 * A line chart you can narrow down (audit 12.11: eight overlapping lines are unreadable): pick a token, or click a
 * pool in the legend to see only it (and click again to go back). The y-axis rescales to what is shown.
 * Series names start with the reward token ("VLX ETH→VLX · Gate").
 */
export function ChartPicker({ series, lang, locale, height, signed }: { series: Series[]; lang: "uk" | "en" | "ru"; locale: string; height?: number; signed?: boolean }) {
  const T = TX[lang];
  const tokens = [...new Set(series.map((s) => s.name.split(" ")[0]))];
  const [token, setToken] = useState<string>("all");
  const [only, setOnly] = useState<string | null>(null);
  const byToken = token === "all" ? series : series.filter((s) => s.name.split(" ")[0] === token);
  const shown = only ? byToken.filter((s) => s.name === only) : byToken;
  const pick = (t: string) => { setToken(t); setOnly(null); };
  return (
    <div>
      {tokens.length > 1 && (
        <div className="mb-4 flex flex-wrap items-center gap-2" role="group" aria-label={T.token}>
          {["all", ...tokens].map((t) => (
            <button key={t} type="button" className="chip" data-on={token === t} aria-pressed={token === t} onClick={() => pick(t)}>{t === "all" ? T.all : t}</button>
          ))}
        </div>
      )}
      <LineChart series={shown.length ? shown : byToken} locale={locale} height={height} signed={signed} legend={false} />
      <div className="mt-3 flex flex-wrap gap-x-1 gap-y-1 text-xs font-semibold text-ink-2">
        {byToken.map((s) => {
          const last = s.points[s.points.length - 1]?.[1];
          const on = !only || only === s.name;
          return (
            <button key={s.name} type="button" onClick={() => setOnly(only === s.name ? null : s.name)} aria-pressed={only === s.name} title={only === s.name ? T.reset : T.only}
              className={`inline-flex min-h-8 items-center gap-1.5 rounded-lg px-2 transition-opacity hover:bg-white/5 ${on ? "" : "opacity-40"}`}>
              <span className="size-2.5 rounded-full" style={{ background: s.color }} />{s.name}
              {last !== undefined && <span className="font-mono text-ink-3">{signed && last > 0 ? "+" : ""}{Math.abs(last) >= 10 ? last.toFixed(1) : last.toFixed(1)}%</span>}
            </button>
          );
        })}
      </div>
    </div>
  );
}
