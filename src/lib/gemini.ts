/**
 * Google Gemini (free tier of the Gemini API, key from aistudio.google.com) — owner 25.11: "run it without the laptop,
 * for free". Used when there is no ANTHROPIC_API_KEY: translations (translate.ts) and reading promo rules (value.ts).
 * The free tier allows a few requests per minute, so callers keep their batches small and sequential.
 * The model is picked from the account's model list (the newest "flash" model) unless GEMINI_MODEL is set.
 */
const BASE = "https://generativelanguage.googleapis.com/v1beta";
let MODEL: Promise<string> | undefined;

export const hasGemini = () => !!process.env.GEMINI_API_KEY;

async function pickModel(key: string): Promise<string> {
  if (process.env.GEMINI_MODEL) return process.env.GEMINI_MODEL;
  try {
    const r = await fetch(`${BASE}/models?pageSize=200`, { headers: { "x-goog-api-key": key }, signal: AbortSignal.timeout(20_000) });
    const j = (await r.json()) as { models?: Array<{ name: string; supportedGenerationMethods?: string[] }> };
    const names = (j.models ?? []).filter((m) => m.supportedGenerationMethods?.includes("generateContent")).map((m) => m.name.replace(/^models\//, ""))
      .filter((n) => /^gemini-[\d.]+-flash$/.test(n));   // stable flash models only (no -lite / -preview / -exp)
    const ver = (n: string) => Number(n.match(/^gemini-([\d.]+)/)?.[1] ?? 0);
    names.sort((a, b) => ver(b) - ver(a));
    if (names[0]) return names[0];
  } catch { /* fall through */ }
  return "gemini-2.5-flash";
}

let lastCall = 0;
/** One prompt → text (or JSON text when `json`). Throws on HTTP errors (429 = free quota used up for now). */
export async function gemini(prompt: string, opts: { system?: string; json?: boolean; timeoutMs?: number } = {}): Promise<string> {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error("no GEMINI_API_KEY");
  MODEL ??= pickModel(key);
  const model = await MODEL;
  // free tier: stay under ~10 requests a minute
  const wait = lastCall + 6500 - Date.now();
  if (wait > 0) await new Promise((r) => setTimeout(r, wait));
  lastCall = Date.now();
  const r = await fetch(`${BASE}/models/${model}:generateContent`, {
    method: "POST", signal: AbortSignal.timeout(opts.timeoutMs ?? 90_000),
    headers: { "x-goog-api-key": key, "Content-Type": "application/json" },
    body: JSON.stringify({
      ...(opts.system ? { systemInstruction: { parts: [{ text: opts.system }] } } : {}),
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.2, ...(opts.json ? { responseMimeType: "application/json" } : {}) },
    }),
  });
  if (!r.ok) throw new Error(`gemini ${r.status}: ${(await r.text()).slice(0, 160)}`);
  const j = (await r.json()) as { candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }> };
  return (j.candidates?.[0]?.content?.parts ?? []).map((p) => p.text ?? "").join("");
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
