import { cached, getText } from "./sources/util";

/**
 * Token unlock calendar from DropsTab's public /vesting page (allowed by its robots.txt; the page embeds the data as
 * React-server-component chunks `self.__next_f.push([1,"…"])`). Only the first page (the ~50 nearest unlocks) —
 * query strings are disallowed by robots, so we never paginate. Attribution + link back on every row.
 */
export interface Unlock {
  sym: string; name: string; slug: string; logo?: string;
  date: number;            // ms
  tokens: number; usd: number;
  pctSupply: number;       // % of total supply
  pctCap: number;          // value as % of market cap (pressure)
  sale: string;            // allocation, e.g. "Investors"
  type: "cliff" | "linear" | "tge";
  price?: number; mcap?: number;
  unlockedPct?: number;    // already unlocked, % of total
}
export interface Unlocks { rows: Unlock[]; fetchedAt: number; ok: boolean }

export const UNLOCK_SRC = "https://dropstab.com/vesting";
export const dropstabCoin = (slug: string) => `https://dropstab.com/coins/${slug}`;

function rscPayload(html: string): string {
  let s = "";
  for (const m of html.matchAll(/self\.__next_f\.push\(\[1,"((?:[^"\\]|\\.)*)"\]\)/g)) {
    try { s += JSON.parse(`"${m[1]}"`); } catch { /* skip broken chunk */ }
  }
  return s;
}

/** Extract one JSON value that starts at `from` (balanced braces, string-aware). */
function jsonAt(s: string, from: number): any {
  const start = s.indexOf("{", from);
  if (start < 0) return undefined;
  let depth = 0, inStr = false, esc = false;
  for (let i = start; i < s.length; i++) {
    const c = s[i];
    if (inStr) { if (esc) esc = false; else if (c === "\\") esc = true; else if (c === '"') inStr = false; continue; }
    if (c === '"') inStr = true;
    else if (c === "{") depth++;
    else if (c === "}" && --depth === 0) { try { return JSON.parse(s.slice(start, i + 1)); } catch { return undefined; } }
  }
  return undefined;
}

export function parseVesting(html: string, now = Date.now()): Unlock[] {
  const s = rscPayload(html);
  const i = s.indexOf('"fallbackBody":');
  const body = i >= 0 ? jsonAt(s, i + 15) : undefined;
  const coins: any[] = Array.isArray(body?.coins) ? body.coins : [];
  const rows: Unlock[] = [];
  for (const c of coins) {
    const v = c?.fundraisingBaseData?.vesting?.totalUnlockProgress;
    const n = v?.nextUnlock;
    const date = Number(n?.date);
    if (!n || !date || date < now - 86400_000) continue;
    const tokens = Number(n.tokens) || 0, usd = Number(n.usdAmount) || 0;
    if (!tokens || !c.symbol) continue;
    rows.push({
      sym: String(c.symbol).toUpperCase(), name: String(c.name ?? c.symbol), slug: String(c.slug ?? ""),
      logo: typeof c.image === "string" && c.image.startsWith("https://") ? c.image : undefined,
      date, tokens, usd,
      pctSupply: Number(n.tokensPercent) || 0,
      pctCap: Number(n.marketCapSharePercent) || 0,
      sale: String(n.sale ?? ""),
      type: n.isTgeUnlock ? "tge" : String(n.unlockType).toUpperCase() === "LINEAR" ? "linear" : "cliff",
      price: Number(c.price?.USD) || undefined, mcap: Number(c.marketCap?.USD) || undefined,
      unlockedPct: Number(v.unlockedPercent) || undefined,
    });
  }
  return rows.sort((a, b) => a.date - b.date);
}

export function getUnlocks(): Promise<Unlocks> {
  return cached("unlocks", 3600_000, async () => {
    try {
      const rows = parseVesting(await getText(UNLOCK_SRC, 25_000));
      return { rows, fetchedAt: Date.now(), ok: rows.length > 0 };
    } catch {
      return { rows: [], fetchedAt: Date.now(), ok: false };
    }
  });
}

/** Big = worth a trader's attention: ≥ 1% of market cap or ≥ $10M. */
export const isBig = (u: Unlock) => u.pctCap >= 1 || u.usd >= 10e6;
