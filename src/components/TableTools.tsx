"use client";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { Select } from "./Select";

export interface SortDef { key: string; label: string; desc?: boolean }
export interface FilterDef { key: string; label: string; all: string; options: string[] }

const T = {
  uk: { search: "Пошук", sort: "Сортування", none: "Нічого не знайдено — змініть фільтр", shown: (a: number, b: number) => `${a} з ${b}` },
  en: { search: "Search", sort: "Sort", none: "Nothing found — change the filter", shown: (a: number, b: number) => `${a} of ${b}` },
  ru: { search: "Поиск", sort: "Сортировка", none: "Ничего не найдено — измените фильтр", shown: (a: number, b: number) => `${a} из ${b}` },
} as const;

/**
 * Sort + filter + search over a server-rendered table (owner 13.11: fixed yield, unlocks). Rows stay server HTML;
 * each <tr data-row> carries data-s-<key> (number to sort by), data-f-<key> (filter value) and data-q (search text).
 * The rows are only re-ordered / hidden in the DOM, so pages stay static and fast.
 */
export function TableTools({ lang, sorts, filters = [], search = true, storeKey, children }: {
  lang: "uk" | "en" | "ru"; sorts: SortDef[]; filters?: FilterDef[]; search?: boolean; storeKey: string; children: ReactNode;
}) {
  const L = T[lang];
  const box = useRef<HTMLDivElement>(null);
  const [sort, setSort] = useState(sorts[0]?.key ?? "");
  const [f, setF] = useState<Record<string, string>>({});
  const [q, setQ] = useState("");
  const [count, setCount] = useState<[number, number] | null>(null);   // null until the rows are counted (no "0 of 0" in the static HTML)
  const key = `pr:table:${storeKey}:${lang}`;

  // audit 23.11: filters lived only in localStorage — they came back silently on reload and could not be shared.
  // Now they are in the URL (?sort=…&f-impact=…&q=…); from an earlier visit only the sort order is remembered.
  const [ready, setReady] = useState(false);
  useEffect(() => {
    try {
      const u = new URLSearchParams(location.search);
      const okF = (k: string, x: string) => filters.some((d) => d.key === k && d.options.includes(x));
      const so = u.get("sort") ?? JSON.parse(localStorage.getItem(key) || "{}").sort;
      if (sorts.some((s) => s.key === so)) setSort(so);
      const ff = Object.fromEntries([...u.entries()].filter(([k]) => k.startsWith("f-")).map(([k, x]) => [k.slice(2), x]).filter(([k, x]) => okF(k, x)));
      if (Object.keys(ff).length) setF(ff);
      const qq = u.get("q"); if (qq) setQ(qq.slice(0, 80));
    } catch { /* blocked */ }
    setReady(true);
  }, [key, sorts, filters]);
  useEffect(() => {
    if (!ready) return;
    try { localStorage.setItem(key, JSON.stringify({ sort })); } catch { /* blocked */ }
    const u = new URLSearchParams(location.search);
    [...u.keys()].filter((k) => k === "sort" || k === "q" || k.startsWith("f-")).forEach((k) => u.delete(k));
    if (sort && sort !== sorts[0]?.key) u.set("sort", sort);
    Object.entries(f).forEach(([k, x]) => { if (x) u.set(`f-${k}`, x); });
    if (q.trim()) u.set("q", q.trim());
    const qs = u.toString();
    history.replaceState(history.state, "", `${location.pathname}${qs ? `?${qs}` : ""}${location.hash}`);
  }, [ready, key, sort, f, q, sorts]);

  useEffect(() => {
    const tbody = box.current?.querySelector("tbody");
    if (!tbody) return;
    const rows = [...tbody.querySelectorAll<HTMLTableRowElement>("tr[data-row]")];
    const s = q.trim().toLowerCase();
    const def = sorts.find((x) => x.key === sort);
    const val = (r: HTMLElement) => { const v = Number(r.dataset[`s${cap(sort)}`]); return Number.isFinite(v) ? v : def?.desc ? -Infinity : Infinity; };
    let shown = 0;
    for (const r of rows) {
      const ok = filters.every((x) => !f[x.key] || f[x.key] === "all" || r.dataset[`f${cap(x.key)}`] === f[x.key]) && (!s || (r.dataset.q ?? r.textContent ?? "").toLowerCase().includes(s));
      r.hidden = !ok;
      if (ok) shown++;
    }
    if (def) rows.sort((a, b) => (def.desc ? val(b) - val(a) : val(a) - val(b))).forEach((r) => tbody.appendChild(r));
    setCount([shown, rows.length]);
  }, [sort, f, q, sorts, filters]);

  const ctl = "h-10 rounded-xl border border-line bg-surface pl-3 pr-2.5 text-sm font-bold text-ink";
  return (
    <div ref={box}>
      <div data-tour="table-tools" className="flex flex-wrap items-center gap-2">
        {search && (
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={L.search} aria-label={L.search}
            className="h-10 w-full rounded-xl border border-line bg-white/[0.03] px-3 text-sm font-medium text-ink placeholder:text-ink-3 focus:border-lime/50 focus:outline-none sm:w-56" />
        )}
        {filters.filter((x) => x.options.length > 1).map((x) => (
          <div key={x.key} className="min-w-40">
            <Select label={x.label} value={f[x.key] ?? "all"} onChange={(v) => setF((o) => ({ ...o, [x.key]: v }))} className={ctl}
              options={[{ value: "all", label: x.all }, ...x.options.map((o) => ({ value: o, label: o }))]} />
          </div>
        ))}
        <span className="text-xs font-semibold text-ink-3 sm:ml-auto">{count ? L.shown(count[0], count[1]) : ""}</span>
        <div className="min-w-52">
          <Select label={L.sort} value={sort} onChange={setSort} align="right" className={ctl} options={sorts.map((s) => ({ value: s.key, label: s.label }))} />
        </div>
      </div>
      <div className="mt-3">{children}</div>
      {count && count[1] > 0 && count[0] === 0 && <p className="mt-3 rounded-2xl border border-dashed border-line-2 px-5 py-8 text-center text-sm text-ink-3">{L.none}</p>}
    </div>
  );
}

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
