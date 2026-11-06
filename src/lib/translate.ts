import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";

/**
 * Machine translation of promo texts (titles, key rules, full rules) into Ukrainian and Russian via DeepL API Free.
 * - Key: env DEEPL_API_KEY (GitHub secret). Without it nothing is translated and the original text is shown.
 * - Every translation is stored in data/translations.json (the `data` branch), so each text is paid for once.
 * - The monthly free quota (500k chars) is respected via DeepL's own /v2/usage counter; important texts go first.
 */
export type TLang = "uk" | "ru";
const LANGS: TLang[] = ["uk", "ru"];
const TARGET: Record<TLang, string> = { uk: "UK", ru: "RU" };
const FILE = () => path.join(process.cwd(), "data", "translations.json");
const PER_BUILD = 60_000;      // chars per language per build — keeps one build from eating the month
const RESERVE = 15_000;        // leave a little of the monthly quota unused
const KEEP_MS = 60 * 86400_000;

type Store = Record<TLang, Record<string, { t: string; at: number }>>;
let MEM: Store | null = null;
const key = (s: string) => createHash("sha1").update(s).digest("base64url").slice(0, 16);

function load(): Store {
  if (MEM) return MEM;
  try { MEM = JSON.parse(fs.readFileSync(FILE(), "utf8")); } catch { MEM = { uk: {}, ru: {} }; }
  for (const l of LANGS) MEM![l] ??= {};
  return MEM!;
}

/** Texts that don't need translating: numbers, tickers, links, one-word lines. */
const skip = (s: string) => s.length < 3 || !/[a-z]{3}/i.test(s) || /^https?:\/\/\S+$/.test(s) || /^[A-Z0-9$#@.,:%/+\- ]+$/.test(s);
/** Text that is already in the target language (Cyrillic) needs no translation. */
const isCyr = (s: string) => (s.match(/[Ѐ-ӿ]/g)?.length ?? 0) > s.length * 0.3;

async function deepl(texts: string[], lang: TLang, apiKey: string): Promise<string[]> {
  const host = apiKey.endsWith(":fx") ? "api-free.deepl.com" : "api.deepl.com";
  const r = await fetch(`https://${host}/v2/translate`, {
    method: "POST", signal: AbortSignal.timeout(30_000),
    headers: { Authorization: `DeepL-Auth-Key ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({ text: texts, target_lang: TARGET[lang], preserve_formatting: true }),
  });
  if (!r.ok) throw new Error(`deepl ${r.status}`);
  const j = (await r.json()) as { translations: Array<{ text: string }> };
  return j.translations.map((x) => x.text);
}

async function quotaLeft(apiKey: string): Promise<number> {
  const host = apiKey.endsWith(":fx") ? "api-free.deepl.com" : "api.deepl.com";
  const r = await fetch(`https://${host}/v2/usage`, { headers: { Authorization: `DeepL-Auth-Key ${apiKey}` }, signal: AbortSignal.timeout(15_000) });
  if (!r.ok) throw new Error(`deepl usage ${r.status}`);
  const j = (await r.json()) as { character_count: number; character_limit: number };
  return j.character_limit - j.character_count - RESERVE;
}

/**
 * Make sure `texts` (in priority order) are translated as far as the quota allows; returns a lookup original → translated
 * for every text that has a translation (old or new). Never throws.
 */
export async function translateAll(texts: string[]): Promise<Record<TLang, Record<string, string>>> {
  const store = load();
  const now = Date.now();
  const uniq = [...new Set(texts.map((s) => s.trim()).filter((s) => s && !skip(s)))];
  const apiKey = process.env.DEEPL_API_KEY;
  if (apiKey) {
    let left = await quotaLeft(apiKey).catch(() => 0);
    for (const lang of LANGS) {
      const todo = uniq.filter((s) => !store[lang][key(s)] && !isCyr(s));
      let budget = Math.min(PER_BUILD, left);
      // batches of up to 40 texts / ~20k chars, highest priority first
      for (let i = 0; i < todo.length && budget > 0;) {
        const batch: string[] = [];
        let size = 0;
        while (i < todo.length && batch.length < 40 && size + todo[i].length < 20_000 && size + todo[i].length <= budget) { batch.push(todo[i]); size += todo[i].length; i++; }
        if (!batch.length) break;
        try {
          const out = await deepl(batch, lang, apiKey);
          batch.forEach((s, k) => { if (out[k]) store[lang][key(s)] = { t: out[k], at: now }; });
          budget -= size; left -= size;
        } catch { break; }      // quota exceeded / network: keep what we have, try next build
      }
    }
    // forget translations nobody used for two months, then save for the next build (the workflow commits data/)
    const live = new Set(uniq.map(key));
    for (const lang of LANGS) for (const [k, v] of Object.entries(store[lang])) {
      if (live.has(k)) v.at = now;
      else if (now - v.at > KEEP_MS) delete store[lang][k];
    }
    try { if (fs.existsSync(path.dirname(FILE()))) fs.writeFileSync(FILE(), JSON.stringify(store)); } catch { /* read-only */ }
  }
  const out = { uk: {}, ru: {} } as Record<TLang, Record<string, string>>;
  for (const lang of LANGS) for (const s of uniq) { const hit = store[lang][key(s)]; if (hit) out[lang][s] = hit.t; }
  return out;
}
