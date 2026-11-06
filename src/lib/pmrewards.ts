import { getJson } from "./sources/util";

/** Polymarket markets that pay daily liquidity rewards (official CLOB "sampling-markets"). Unreachable → empty list. */
export interface PmReward { question: string; slug: string; daily: number; maxSpread?: number; minSize?: number }
export interface PmRewards { rows: PmReward[]; ok: boolean; fetchedAt: number }

export async function getPmRewards(): Promise<PmRewards> {
  const rows: PmReward[] = [];
  let cursor = "", ok = false;
  try {
    for (let page = 0; page < 8; page++) {
      const j = await getJson(`https://clob.polymarket.com/sampling-markets${cursor ? `?next_cursor=${encodeURIComponent(cursor)}` : ""}`, 15_000);
      ok = true;
      for (const m of j?.data ?? []) {
        if (m.closed || m.active === false) continue;
        const daily = (m.rewards?.rates ?? []).reduce((s: number, r: any) => s + (Number(r.rewards_daily_rate) || 0), 0);
        if (daily > 0) rows.push({ question: m.question, slug: m.market_slug, daily, maxSpread: Number(m.rewards?.max_spread) || undefined, minSize: Number(m.rewards?.min_size) || undefined });
      }
      cursor = j?.next_cursor;
      if (!cursor || cursor === "LTE=") break;
    }
  } catch { /* geo-blocked or down: the section hides itself */ }
  rows.sort((a, b) => b.daily - a.daily);
  return { rows: rows.slice(0, 40), ok: ok && rows.length > 0, fetchedAt: Date.now() };
}
