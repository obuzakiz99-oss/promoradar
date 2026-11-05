import fs from "node:fs";
import path from "node:path";

/**
 * APR history written by scripts/snapshot.mjs after every build (kept on the `data` branch,
 * checked out into ./data by the GitHub workflow). Missing file → empty history.
 */
export interface Snapshot {
  t: number;
  earn: Record<string, Record<string, number>>;          // coin → exchange → best base APR %
  pools: Record<string, { name: string; apr: number }>;  // "exchange:project:stake" → APR %
}

export function readHistory(): Snapshot[] {
  try {
    const f = path.join(process.cwd(), "data", "history.json");
    const j = JSON.parse(fs.readFileSync(f, "utf8"));
    return Array.isArray(j?.snaps) ? j.snaps : [];
  } catch {
    return [];
  }
}
