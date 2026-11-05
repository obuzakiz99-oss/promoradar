// Unit checks of the site's own maths: transpile the real TS modules and test them with hand-computed answers.
// usage: node scripts/test-math.mjs
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import ts from "typescript";

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "pr-math-"));
const load = async (rel, deps = {}) => {
  let src = fs.readFileSync(rel, "utf8");
  for (const [from, to] of Object.entries(deps)) src = src.replaceAll(from, to);
  const js = ts.transpileModule(src, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText;
  const out = path.join(tmp, path.basename(rel).replace(/\.ts$/, ".mjs"));
  fs.writeFileSync(out, js);
  return import("file://" + out.replace(/\\/g, "/"));
};

let ok = 0, bad = 0;
const eq = (name, got, want, tol = 0.01) => {
  const pass = typeof want === "number" ? Math.abs(got - want) <= Math.max(Math.abs(want) * tol, 1e-6) : got === want;
  pass ? ok++ : bad++;
  console.log(`${pass ? "✓" : "✕"} ${name}: got ${typeof got === "number" ? +got.toFixed(4) : got}, want ${typeof want === "number" ? +want.toFixed(4) : want}`);
};

/* ---- hedge maths (src/lib/proscons.ts) ---- */
const pc = await load("src/lib/proscons.ts");
const now = Date.UTC(2026, 10, 5);
const p = { id: "t", exchange: "gate", token: "KOR", name: "KOR", start: now - 86400e3, end: now + 28 * 86400e3, status: "live", pools: [], url: "" };
const pool = { stake: "KOR", apr: 1000, maxStake: 500000 };
const hedge = { KOR: { perps: [{ ex: "MEXC", fundingApr: -43.8 }, { ex: "Gate", fundingApr: -60 }], spotDepthUsd: 2000 } };
const h = pc.hedgeCalc(pool, p, hedge, 1000, now, 2900);
// cost = 2·(0.3 + 2·1000/2000) + 0.3 = 2.9 %; hedged = 1000 − 43.8 − 2.9·365/28 = 918.395
eq("hedge picks best funding venue", h.venue, "MEXC");
eq("round-trip cost %", h.costPct, 2.9);
eq("hedged APR", h.hedgedApr, 1000 - 43.8 - (2.9 * 365) / 28);
// sensible = (Y/2 − 0.9)·depth/4, Y = (1000 − 43.8)·28/365 = 73.35 → 17 889 → capped at 2 900
eq("sensible size capped by max stake", h.sensibleUsd, 2900);
const h2 = pc.hedgeCalc(pool, p, hedge, 1000, now);
eq("sensible size uncapped", h2.sensibleUsd, (((1000 - 43.8) * 28 / 365) / 2 - 0.9) * 2000 / 4);
eq("stable stake needs no hedge", pc.hedgeCalc({ stake: "USDT", apr: 5 }, p, hedge, 1000, now).needed, false);
eq("no perp → impossible", pc.hedgeCalc({ stake: "ZZZ", apr: 50 }, p, hedge, 1000, now).possible, false);

/* ---- reward parsing (src/lib/parse.ts) ---- */
const parse = await load("src/lib/parse.ts");
const R = (s) => parse.parseReward(s);
eq("parse $10M", R("Compete to Win Up to $10M!").usd, 10e6);
eq("parse 1,670,000 CT", R("Trade to Share 1,670,000 CT").amount, 1670000);
eq("parse prefers USD pool over per-user", R("Share 400,000 USDC, up to 8%").usd, 400000);
eq("parse 2.5 Million USD1", R("Plus Up to 2.5 Million USD1 for New Holdings").usd, 2.5e6);
eq("entry condition is not a prize", R("5% base APR: futures balance of 100+ USDT, no position needed"), undefined);
eq("year is not an amount", R("WSOT 2026 is here"), undefined);
eq("classify competition", parse.classify("KuCoin PROOF Futures Showdown: Win Your Share of 560,000 USDT!"), "competition");
eq("classify withdrawal notice is not promo", parse.isPromo("Resumption of Deposit and Withdrawal Services for the NEAR Network"), false);

/* ---- calculators (formulas mirrored from the components, checked against first principles) ---- */
// Launchpool profit: $1000 in a 1006% pool of a $0.0057 token, max 500k tokens, 28.9 days
{
  const price = 0.0057, apr = 1006.17, days = 28.9, maxStake = 500000;
  let coins = 1000 / price; if (coins > maxStake) coins = maxStake;
  const profit = coins * price * apr / 100 / 365 * days;
  eq("launchpool profit $1000 (uncapped)", profit, 1000 * 10.0617 * 28.9 / 365);
  let c2 = 10000 / price; const capped = c2 > maxStake; if (capped) c2 = maxStake;
  eq("launchpool $10k is capped at max stake", c2 * price, 2850);
}
// short liquidation (isolated): equity = margin − N·u = mmr·N·(1+u) → u = (1/L − mmr)/(1 + mmr)
{
  const L = 3, mmr = 0.005;
  const exact = (1 / L - mmr) / (1 + mmr);
  const src = fs.readFileSync("src/components/HedgeCalculator.tsx", "utf8");
  eq("HedgeCalculator uses exact liquidation formula", src.includes("(1 / v.leverage - v.mmr / 100) / (1 + v.mmr / 100)"), true);
  // check: at the liquidation price equity equals maintenance margin
  const N = 1000, u = exact;
  eq("equity at liq = maintenance margin", N / L - N * u, mmr * N * (1 + u));
}

console.log(`\nRESULT: ${ok} ok, ${bad} failed`);
fs.rmSync(tmp, { recursive: true, force: true });
