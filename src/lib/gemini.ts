/**
 * Google Gemini (free tier of the Gemini API, key from aistudio.google.com) — owner 25.11: "run it without the laptop,
 * for free". Used when there is no ANTHROPIC_API_KEY: translations (translate.ts) and reading promo rules (value.ts).
 * The free tier allows a few requests per minute, so callers keep their batches small and sequential.
 * Models: the newest stable "flash" models on the account (GEMINI_MODEL first when set); a busy model (503) is retried
 * after a pause and then replaced by the next one in the list.
 */
const BASE = "https://generativelanguage.googleapis.com/v1beta";
const FALLBACK = ["gemini-flash-latest", "gemini-flash-lite-latest"];   // aliases; 2.5 is closed to new keys (404, 25.11)
let MODELS: Promise<string[]> | undefined;

export const hasGemini = () => !!process.env.GEMINI_API_KEY;

async function pickModels(key: string): Promise<string[]> {
  const pinned = process.env.GEMINI_MODEL ? [process.env.GEMINI_MODEL] : [];
  try {
    const r = await fetch(`${BASE}/models?pageSize=200`, { headers: { "x-goog-api-key": key }, signal: AbortSignal.timeout(20_000) });
    const j = (await r.json()) as { models?: Array<{ name: string; supportedGenerationMethods?: string[] }> };
    const STABLE = /^gemini-[0-9.]+-flash(-lite)?$/;   // no -preview / -exp builds
    const ver = (n: string) => Number(n.match(/^gemini-([0-9.]+)/)?.[1] ?? 0);
    const names = (j.models ?? [])
      .filter((m) => m.supportedGenerationMethods?.includes("generateContent"))
      .map((m) => m.name.replace(/^models\//, ""))
      .filter((n) => STABLE.test(n))
      .sort((a, b) => ver(b) - ver(a) || Number(a.endsWith("-lite")) - Number(b.endsWith("-lite")));
    const full = names.filter((n) => !n.endsWith("-lite")), lite = names.filter((n) => n.endsWith("-lite"));
    // only models THIS key may use: two newest full flash models, then two lite ones — each tried once
    return [...new Set([...pinned, ...full.slice(0, 2), ...lite.slice(0, 2), ...FALLBACK])];
  } catch {
    return [...new Set([...pinned, ...FALLBACK])];
  }
}

let lastCall = 0;
/** One prompt → text (or JSON text when `json`). Throws with the last HTTP error (429 = free quota used up for now). */
export async function gemini(prompt: string, opts: { system?: string; json?: boolean; timeoutMs?: number } = {}): Promise<string> {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error("no GEMINI_API_KEY");
  MODELS ??= pickModels(key);
  const models = await MODELS;
  let last = "gemini: no answer";
  // 25.11: the first live run got "503 overloaded" — retry with a pause, then the next model in the list
  for (let attempt = 0; attempt < Math.min(4, models.length); attempt++) {
    const model = models[attempt];   // a busy model stays busy for minutes — the next one is the better retry
    // free tier: stay under ~10 requests a minute (+ a longer pause before a retry)
    const wait = lastCall + 6500 + attempt * 3000 - Date.now();
    if (wait > 0) await new Promise((r) => setTimeout(r, wait));
    lastCall = Date.now();
    try {
      const r = await fetch(`${BASE}/models/${model}:generateContent`, {
        method: "POST", signal: AbortSignal.timeout(opts.timeoutMs ?? 90_000),
        headers: { "x-goog-api-key": key, "Content-Type": "application/json" },
        body: JSON.stringify({
          ...(opts.system ? { systemInstruction: { parts: [{ text: opts.system }] } } : {}),
          contents: [{ role: "user", parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.2, ...(opts.json ? { responseMimeType: "application/json" } : {}) },
        }),
      });
      if (r.ok) {
        const j = (await r.json()) as { candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }> };
        return (j.candidates?.[0]?.content?.parts ?? []).map((p) => p.text ?? "").join("");
      }
      last = `gemini ${r.status} (${model}): ${(await r.text()).replace(/\s+/g, " ").slice(0, 140)}`;
      if (![404, 500, 503, 504].includes(r.status)) break;   // busy / gone → next model; 429 quota / 400 / 403 → stop for this build
    } catch (e) {
      last = `gemini network (${model}): ${String(e instanceof Error ? e.message : e).slice(0, 100)}`;
    }
  }
  throw new Error(last);
}

/** Translate a batch of promo texts; returns the same number of strings ("" where it failed). */
export async function geminiTranslate(texts: string[], lang: "uk" | "ru"): Promise<string[]> {
  const to = lang === "uk" ? "Ukrainian" : "Russian";
  const out = await gemini(
    `Translate each string of this JSON array into ${to}. They are crypto exchange promotion texts (titles, rules). ` +
    `Keep tickers (USDT, BTC…), numbers, dates, URLs, exchange and product names (Launchpool, Earn, Futures…) as they are. ` +
    `Natural, short, everyday ${to}. Return ONLY a JSON array of strings with exactly ${texts.length} items, in the same order.\n\n${JSON.stringify(texts)}`,
    { json: true },
  );
  const arr = JSON.parse(out) as unknown;
  if (!Array.isArray(arr) || arr.length !== texts.length) throw new Error("gemini: wrong translation count");
  return arr.map((x) => (typeof x === "string" ? x : ""));
}
