import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import type { PromoDetails } from "./details";
import type { Promo } from "./types";

/**
 * Plain-language explainer ("Як це працює" + "Часті питання") for every promo page, written by Claude from the promo's OFFICIAL rules text at build time.
 * No server: answers are generated once per promo (and again only if its rules change), stored in data/faq.json
 * (the `data` branch) and rendered as static HTML. Without ANTHROPIC_API_KEY nothing is generated and pages show no FAQ.
 * Env: ANTHROPIC_API_KEY (repo secret), FAQ_MODEL (default claude-opus-5-5), FAQ_PER_BUILD (default 30 new promos).
 */
export type FaqLang = "uk" | "en" | "ru";
export interface QA { q: string; a: string }
/** One language's explainer: plain step-by-step, payout (when / in what form / how to get it), watch-outs, Q&A. */
export interface Explainer {
  summary: string;                                    // 1–2 sentences: what this promo is and who it is for
  steps: string[];                                    // what to do, in order, with amounts and deadlines
  payout: { when: string; form: string; how: string };   // when it arrives / cash, voucher, token… / where & how to claim
  watch: string[];                                    // what does not count, disqualifies, expires, costs money
  faq: QA[];
}
export type Faq = Record<FaqLang, Explainer>;

const FILE = () => path.join(process.cwd(), "data", "faq.json");
const VER = 2;                         // bump when the prompt changes → answers are regenerated (FAQ_PER_BUILD at a time)
const KEEP_MS = 45 * 86400_000;
const MODEL = process.env.FAQ_MODEL || "claude-opus-5-5";
const PER_BUILD = Number(process.env.FAQ_PER_BUILD) || 30;

const One = z.object({
  summary: z.string(),
  steps: z.array(z.string()),
  payout: z.object({ when: z.string(), form: z.string(), how: z.string() }),
  watch: z.array(z.string()),
  faq: z.array(z.object({ q: z.string(), a: z.string() })),
});
const Schema = z.object({ uk: One, en: One, ru: One });

type Store = Record<string, { h: string; v: number; at: number; faq: Faq }>;
let MEM: Store | null = null;
function load(): Store {
  if (MEM) return MEM;
  try { MEM = JSON.parse(fs.readFileSync(FILE(), "utf8")); } catch { MEM = {}; }
  return MEM!;
}

const SYSTEM = `You write the explainer for one crypto promotion page on PromoRadar, a site that explains exchange and DeFi promos and airdrops to ordinary people (many are beginners from Ukraine). The goal: after reading it, a visitor knows exactly what to do, when and how they get paid, in what form, and what can go wrong — without reading the long rules.

You get the promo's headline, a few facts and the OFFICIAL rules text published by the exchange. Fill these fields:
- summary: 1–2 sentences — what the promo is, who can join, the most one person can get.
- steps: what the visitor must do, in order, each step with its exact amount, product and deadline ("Register with … before …", "Trade at least $50 on spot within 14 days of registering", "Click Join / Register on the event page" when the rules require it).
- payout.when: when the reward arrives (e.g. "within 14 days after the event ends", "after a 3-day review"), and any claim deadline after which it expires.
- payout.form: what exactly you receive — withdrawable token/USDT, bonus, voucher/coupon (and whether it can be withdrawn), locked/staked tokens, airdrop to the wallet; amounts per tier if the rules have a table.
- payout.how: where it appears and whether it must be claimed manually (Rewards Hub, Rewards Center, Funding account, spot wallet, on-chain wallet…).
- watch: the conditions people miss — what does NOT count (zero-fee pairs, internal transfers, sub-accounts…), disqualifications, region/KYC limits, pool or first-come limits, lock-ups, costs (trading fees, price risk of the reward token, gas).
- faq: 4–8 more questions a real visitor would ask that the fields above do not already answer, each with a short concrete answer (1–4 sentences).

Strict rules:
- Use ONLY information from the provided text. Never invent numbers, dates, countries, reward forms or conditions. When the rules do not say something important (very often: the exact payout date or whether the reward is withdrawable), say so plainly in that field — e.g. "The rules do not say whether this is withdrawable USDT or a voucher; check the reward details on the exchange before counting on cash." Never leave a field empty.
- Keep amounts, tickers and dates exactly as in the rules; write times with their timezone.
- No promises of profit, no investment advice. Never suggest multiple accounts, VPNs, fake KYC or any way around the rules.
- Plain, friendly language, short sentences; explain jargon in a few words when used.
- Write three versions with the same content: "uk" in natural Ukrainian, "en" in English, "ru" in natural Russian. Each must read as written by a native speaker, not as a literal translation.`;

function rulesText(p: Promo, d: PromoDetails): string {
  const lines = d.blocks.map((b) => (b.t === "h" ? `## ${b.x}` : b.t === "li" ? `- ${b.x}` : b.t === "tr" ? (b.cells ?? []).join(" | ") : b.x));
  const iso = (ms?: number) => (ms ? new Date(ms).toISOString().replace(".000Z", "Z") : "not stated");
  const m = p.meta ?? {};
  return [
    `Exchange/platform: ${p.venue.name}`,
    `Headline: ${p.title}`,
    p.reward ? `Prize pool: ${p.reward.label}` : "",
    `Start: ${iso(p.startsAt)} · End: ${iso(p.endsAt)}`,
    m.perUser ? `Most one person can get (parsed): ${m.perUser.amount} ${m.perUser.unit}` : "",
    m.minEntry ? `Smallest threshold (parsed): ${m.minEntry.amount} ${m.minEntry.unit} (${m.minEntry.kind})` : "",
    d.partial ? "Note: the rules text below may be incomplete (only the announcement preview was available)." : "",
    "",
    "OFFICIAL RULES TEXT:",
    ...lines,
  ].filter((x) => x !== "").join("\n");
}

async function ask(client: Anthropic, p: Promo, d: PromoDetails): Promise<Faq | null> {
  // server-side fallback on a safety decline (Opus/Sonnet 5.5 only; Haiku has none)
  const fb = /^claude-(opus|sonnet|fable)/.test(MODEL) ? { betas: ["server-side-fallback-2026-07-01"], fallbacks: "default" } : {};
  const r = await client.beta.messages.create({
    model: MODEL,
    max_tokens: 16000,
    system: SYSTEM,
    output_config: { effort: "medium", format: zodOutputFormat(Schema) },
    messages: [{ role: "user", content: rulesText(p, d) }],
    ...fb,
  } as Parameters<typeof client.beta.messages.create>[0], { timeout: 180_000 }) as Anthropic.Beta.BetaMessage;
  if (r.stop_reason !== "end_turn") return null;        // refusal / max_tokens → try again next build
  const text = r.content.flatMap((b) => (b.type === "text" ? [b.text] : [])).join("");
  const parsed = Schema.safeParse(JSON.parse(text));
  if (!parsed.success) return null;
  const t = (x: string) => x.trim();
  const tidy = (e: Explainer): Explainer => ({
    summary: t(e.summary), steps: e.steps.map(t).filter(Boolean), watch: e.watch.map(t).filter(Boolean),
    payout: { when: t(e.payout.when), form: t(e.payout.form), how: t(e.payout.how) },
    faq: e.faq.map((x) => ({ q: t(x.q), a: t(x.a) })).filter((x) => x.q && x.a),
  });
  const faq = { uk: tidy(parsed.data.uk), en: tidy(parsed.data.en), ru: tidy(parsed.data.ru) };
  return (["uk", "en", "ru"] as const).every((l) => faq[l].steps.length && faq[l].summary) ? faq : null;
}

/**
 * FAQ for the given promos (pass them most valuable first): cached answers + up to FAQ_PER_BUILD new ones. Never throws.
 * `details` must be the ORIGINAL (untranslated) rules.
 */
export async function getFaqs(promos: Promo[], details: Record<string, PromoDetails>): Promise<Record<string, Faq>> {
  const store = load();
  const now = Date.now();
  const hashOf = (p: Promo, d: PromoDetails) => createHash("sha1").update(rulesText(p, d)).digest("base64url").slice(0, 16);
  const eligible = promos.filter((p) => details[p.id]?.blocks.length && !p.meta?.thin && p.category !== "farming");
  const key = process.env.ANTHROPIC_API_KEY;
  if (key) {
    const todo = eligible.filter((p) => { const s = store[p.id]; return !s || s.v !== VER || s.h !== hashOf(p, details[p.id]); }).slice(0, PER_BUILD);
    const client = new Anthropic({ apiKey: key, maxRetries: 3 });
    let stop = false;
    const worker = async () => {
      for (let p = todo.shift(); p && !stop; p = todo.shift()) {
        const d = details[p.id];
        try {
          const faq = await ask(client, p, d);
          if (faq) store[p.id] = { h: hashOf(p, d), v: VER, at: now, faq };
        } catch (e) {
          // a bad key or an empty balance won't fix itself during this build
          if (e instanceof Anthropic.AuthenticationError || e instanceof Anthropic.PermissionDeniedError) stop = true;
          else if (e instanceof Anthropic.BadRequestError && /credit|balance|billing/i.test(e.message)) stop = true;
          console.warn(`[faq] ${p.id}: ${e instanceof Error ? e.message : e}`);
        }
      }
    };
    await Promise.all(Array.from({ length: 3 }, worker));
    const live = new Set(promos.map((p) => p.id));
    for (const [id, s] of Object.entries(store)) { if (live.has(id)) s.at = now; else if (now - s.at > KEEP_MS) delete store[id]; }
    try { if (fs.existsSync(path.dirname(FILE()))) fs.writeFileSync(FILE(), JSON.stringify(store)); } catch { /* read-only */ }
  }
  const out: Record<string, Faq> = {};
  for (const p of eligible) if (store[p.id]) out[p.id] = store[p.id].faq;
  return out;
}
