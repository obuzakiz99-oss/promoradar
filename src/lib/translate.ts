import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";

/**
 * Machine translation of promo texts (titles, key rules, full rules) into Ukrainian and Russian.
 * Two free providers, used in order:
 *  1. DeepL API Free (env DEEPL_API_KEY) — best quality, 500k chars/month, quota read from DeepL's /v2/usage.
 *  2. Microsoft Azure Translator F0 (env AZURE_TRANSLATOR_KEY + AZURE_TRANSLATOR_REGION) — 2M chars/month; takes
 *     whatever DeepL's quota can't cover. Its usage is counted here per calendar month (data/translations.json).
 * Every translation is stored in data/translations.json (the `data` branch), so each text is translated once.
 * Without any key nothing is translated and the original text is shown.
 */
export type TLang = "uk" | "ru";
const LANGS: TLang[] = ["uk", "ru"];
const DEEPL_TARGET: Record<TLang, string> = { uk: "UK", ru: "RU" };
const FILE = () => path.join(process.cwd(), "data", "translations.json");
const DEEPL_PER_BUILD = 100_000;   // chars per build (all languages) — keeps one build from eating the month
const DEEPL_RESERVE = 15_000;      // leave a little of DeepL's monthly quota unused
const AZURE_MONTH = 1_900_000;     // Azure F0 gives 2M/month; stop a bit before
const AZURE_PER_BUILD = 200_000;
const KEEP_MS = 60 * 86400_000;

type Store = Record<TLang, Record<string, { t: string; at: number }>> & { usage?: { month: string; azure: number } };
let MEM: Store | null = null;
const key = (s: string) => createHash("sha1").update(s).digest("base64url").slice(0, 16);
const month = () => new Date().toISOString().slice(0, 7);

function load(): Store {
  if (MEM) return MEM;
  try { MEM = JSON.parse(fs.readFileSync(FILE(), "utf8")); } catch { MEM = { uk: {}, ru: {} } as Store; }
  for (const l of LANGS) MEM![l] ??= {};
  return MEM!;
}

/** Texts that don't need translating: numbers, tickers, links, one-word lines. */
const skip = (s: string) => s.length < 3 || !/[a-z]{3}/i.test(s) || /^https?:\/\/\S+$/.test(s) || /^[A-Z0-9$#@.,:%/+\- ]+$/.test(s);
/** Text that is already in the target language (Cyrillic) needs no translation. */
const isCyr = (s: string) => (s.match(/[Ѐ-ӿ]/g)?.length ?? 0) > s.length * 0.3;

/* ------------------------------------------------------------------ providers */
async function deepl(texts: string[], lang: TLang, apiKey: string): Promise<string[]> {
  const host = apiKey.endsWith(":fx") ? "api-free.deepl.com" : "api.deepl.com";
  const r = await fetch(`https://${host}/v2/translate`, {
    method: "POST", signal: AbortSignal.timeout(30_000),
    headers: { Authorization: `DeepL-Auth-Key ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({ text: texts, target_lang: DEEPL_TARGET[lang], preserve_formatting: true }),
  });
  if (!r.ok) throw new Error(`deepl ${r.status}`);
  const j = (await r.json()) as { translations: Array<{ text: string }> };
  return j.translations.map((x) => x.text);
}

async function deeplLeft(apiKey: string): Promise<number> {
  const host = apiKey.endsWith(":fx") ? "api-free.deepl.com" : "api.deepl.com";
  const r = await fetch(`https://${host}/v2/usage`, { headers: { Authorization: `DeepL-Auth-Key ${apiKey}` }, signal: AbortSignal.timeout(15_000) });
  if (!r.ok) throw new Error(`deepl usage ${r.status}`);
  const j = (await r.json()) as { character_count: number; character_limit: number };
  return j.character_limit - j.character_count - DEEPL_RESERVE;
}

async function azure(texts: string[], lang: TLang, apiKey: string, region?: string): Promise<string[]> {
  const r = await fetch(`https://api.cognitive.microsofttranslator.com/translate?api-version=3.0&to=${lang}`, {
    method: "POST", signal: AbortSignal.timeout(30_000),
    headers: { "Ocp-Apim-Subscription-Key": apiKey, ...(region ? { "Ocp-Apim-Subscription-Region": region } : {}), "Content-Type": "application/json" },
    body: JSON.stringify(texts.map((Text) => ({ Text }))),
  });
  if (!r.ok) throw new Error(`azure ${r.status}`);
  const j = (await r.json()) as Array<{ translations: Array<{ text: string }> }>;
  return j.map((x) => x.translations?.[0]?.text ?? "");
}

type Provider = { name: string; budget: number; run: (texts: string[], lang: TLang) => Promise<string[]>; spent: (n: number) => void };

/* ------------------------------------------------------------------ public */
/**
 * Make sure each language's texts (in priority order) are translated as far as the free quotas allow; returns a lookup
 * original → translated for every text that has a translation (old or new). Never throws.
 */
export async function translateAll(lists: Record<TLang, string[]>): Promise<Record<TLang, Record<string, string>>> {
  const store = load();
  const now = Date.now();
  const clean = (xs: string[]) => [...new Set(xs.map((s) => s.trim()).filter((s) => s && !skip(s)))];
  const want: Record<TLang, string[]> = { uk: clean(lists.uk), ru: clean(lists.ru) };

  const providers: Provider[] = [];
  const dk = process.env.DEEPL_API_KEY;
  if (dk) {
    const left = await deeplLeft(dk).catch(() => 0);
    providers.push({ name: "deepl", budget: Math.min(DEEPL_PER_BUILD, left), run: (t, l) => deepl(t, l, dk), spent: () => {} });
  }
  const ak = process.env.AZURE_TRANSLATOR_KEY;
  if (ak) {
    if (store.usage?.month !== month()) store.usage = { month: month(), azure: 0 };
    const left = AZURE_MONTH - store.usage.azure;
    providers.push({ name: "azure", budget: Math.min(AZURE_PER_BUILD, left), run: (t, l) => azure(t, l, ak, process.env.AZURE_TRANSLATOR_REGION || undefined), spent: (n) => { store.usage!.azure += n; } });
  }

  if (providers.length) {
    // interleave: Ukrainian first (main audience), then Russian; each text goes to the first provider with budget left
    for (const lang of LANGS) {
      let todo = want[lang].filter((s) => !store[lang][key(s)] && !isCyr(s));
      for (const pr of providers) {
        let i = 0;
        const rest: string[] = [];
        while (i < todo.length && pr.budget > 0) {
          const batch: string[] = [];
          let size = 0;
          // batches of up to 40 texts / ~20k chars, highest priority first
          while (i < todo.length && batch.length < 40 && size + todo[i].length < 20_000 && size + todo[i].length <= pr.budget) { batch.push(todo[i]); size += todo[i].length; i++; }
          if (!batch.length) break;
          try {
            const out = await pr.run(batch, lang);
            batch.forEach((s, k) => { if (out[k]) store[lang][key(s)] = { t: out[k], at: now }; else rest.push(s); });
            pr.budget -= size; pr.spent(size);
          } catch { pr.budget = 0; rest.push(...batch); }      // quota exceeded / network: next provider, next build
        }
        todo = [...rest, ...todo.slice(i)];
        if (!todo.length) break;
      }
    }
    // forget translations nobody used for two months, then save for the next build (the workflow commits data/)
    const live = new Set([...want.uk, ...want.ru].map(key));
    for (const lang of LANGS) for (const [k, v] of Object.entries(store[lang])) {
      if (live.has(k)) v.at = now;
      else if (now - v.at > KEEP_MS) delete store[lang][k];
    }
    try { if (fs.existsSync(path.dirname(FILE()))) fs.writeFileSync(FILE(), JSON.stringify(store)); } catch { /* read-only */ }
  }
  const out = { uk: {}, ru: {} } as Record<TLang, Record<string, string>>;
  for (const lang of LANGS) for (const s of want[lang]) { const hit = store[lang][key(s)]; if (hit) out[lang][s] = hit.t; }
  return out;
}
