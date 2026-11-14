import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import { writeStore } from "./store";

/**
 * Promo facts and FAQs written by Claude Code on the owner's laptop under the owner's own Claude plan — no API key
 * (owner 14.11: "через план, без API"). Same pattern as the hand translations (scripts/auto-translate.py):
 *  1. every build lists what still needs reading in data/<kind>-todo.json (the `data` branch);
 *  2. scripts/auto-assess.py (laptop, every 30 min) runs `claude -p` on a batch and commits one small JSON file per
 *     promo to src/config/ai/<kind>/ — small files, so git history doesn't grow by a big blob every run;
 *  3. the next build reads those files here.
 * A file is used while its hash matches the current text (rules changed → the promo is listed again).
 */
export type HandKind = "value" | "faq";
export interface HandEntry<T> { id: string; h: string; v: number; at?: number; data: T }

const DIR = (kind: HandKind) => path.join(process.cwd(), "src", "config", "ai", kind);
const TODO = (kind: HandKind) => path.join(process.cwd(), "data", `${kind}-todo.json`);

export const textHash = (t: string) => createHash("sha1").update(t).digest("base64url").slice(0, 16);
/** File name for a promo id ("tg:Kucoin_News/37172" is not a file name). */
export const handFile = (id: string) => `${createHash("sha1").update(id).digest("hex").slice(0, 16)}.json`;

const CACHE = new Map<HandKind, Map<string, HandEntry<unknown>>>();
export function readHand<T>(kind: HandKind): Map<string, HandEntry<T>> {
  const hit = CACHE.get(kind);
  if (hit) return hit as Map<string, HandEntry<T>>;
  const out = new Map<string, HandEntry<T>>();
  try {
    for (const f of fs.readdirSync(DIR(kind))) {
      if (!f.endsWith(".json")) continue;
      try {
        const e = JSON.parse(fs.readFileSync(path.join(DIR(kind), f), "utf8")) as HandEntry<T>;
        if (e?.id && e.data) out.set(e.id, e);
      } catch { /* a broken file is skipped; the promo goes back on the todo list */ }
    }
  } catch { /* no folder yet */ }
  CACHE.set(kind, out as Map<string, HandEntry<unknown>>);
  return out;
}

/** What the laptop should read next, most important first (the caller passes items in that order). */
export function writeTodo(kind: HandKind, items: Array<{ id: string; h: string; text: string }>, max: number): void {
  writeStore(TODO(kind), { at: Date.now(), left: items.length, items: items.slice(0, max) }, true);
}
