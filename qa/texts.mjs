// Text extractor for copy audits (reusable across rounds so later rounds can diff).
// Usage:  node texts.mjs <round> [pages.json] [--only=name1,name2]
//   <round>      e.g. r1  -> writes ../<round>/texts/<page>.txt
//   pages.json   optional {name: "/uk/path/"} map; default = PAGES below
// Each .txt has: URL, HTTP status, <title>, meta description, og:*, canonical, html lang, h1/h2 list,
// visible body.innerText, then HIDDEN (closed <details> panels, role=tooltip glossary popups) and ATTRS
// (title / placeholder / aria-label / alt values), so untranslated attributes are diffable too.
import { chromium } from "playwright-core";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const BASE = process.env.BASE || "https://obuzakiz99-oss.github.io/promoradar";
const args = process.argv.slice(2);
const round = args.find((a) => !a.startsWith("--") && !a.endsWith(".json")) || "r1";
const pagesFile = args.find((a) => a.endsWith(".json"));
const only = (args.find((a) => a.startsWith("--only=")) || "").slice(7).split(",").filter(Boolean);
const OUT = path.join(HERE, "out", round, "texts");
fs.mkdirSync(OUT, { recursive: true });

const PAGES = {
  // ---- uk: every template ----
  "uk-home": "/uk/",
  "uk-p-bybit-referral": "/uk/p/19pal7s-bybit-referral-up-to-250-usdt-for-you-and-up-to-250-usdt-for-you/",
  "uk-p-kraken-earn": "/uk/p/h3dwmw-kraken-stablecoin-rewards-up-to-4-25-apy-on-usde-2-25-on-usdg-no/",
  "uk-p-binance-alpha-comp": "/uk/p/noetfi-binance-alpha-trading-competition-trade-collect-on-fanable-colle/",
  "uk-p-gate-airdrop": "/uk/p/1kncxlx-gate-futures-points-airdrop-168-claim-0-018-qqqg-100-usdt/",
  "uk-p-kucoin-tg": "/uk/p/ptey5v-kucoin-visors-down-bricks-up-the-build-is-in-full-swing-so-are-y/",
  "uk-p-biconomy-earn": "/uk/p/j09rob-biconomy-com-earn-zbcn-cap-pzm-dash-locked-products-enjoy-up-to/",
  "uk-p-aave-farming": "/uk/p/1m7rxwd-aave-usde-plus/",
  "uk-p-kucoin-listing": "/uk/p/v67shl-kucoin-matrix-mtx-listing-campaign-70-000-mtx-giveaway/",
  "uk-p-mexc-bonus": "/uk/p/g8w4pj-mexc-rewards-hub-10-usdt-futures-voucher-for-signing-up-10-usdt/",
  "uk-p-coinstore-skyfall": "/uk/p/2bo282-coinstore-skyfall-bounty-campaign-kicks-off-now/",
  "uk-p-bitbase-iphone": "/uk/p/1d4rtlc-bitbase-new-earn-products-usdt-and-usdc-360-day-fixed-products-a/",
  "uk-p-kucoin-coupons": "/uk/p/ytm0so-kucoin-subscribe-between-october-28-and-november-27-and-unlock-l/",
  "uk-p-phemex-cpi": "/uk/p/1t0204h-phemex-ai-vs-you-cpi-prediction-challenge/",
  "uk-p-sky-grove": "/uk/p/1nb7lcl-sky-usds-grove-farming-pool/",
  "uk-my": "/uk/my/",
  "uk-unlocks": "/uk/unlocks/",
  "uk-fixed": "/uk/fixed/",
  "uk-dex": "/uk/dex/",
  "uk-hedge": "/uk/hedge/",
  "uk-earn": "/uk/earn/",
  "uk-launchpools": "/uk/launchpools/",
  "uk-lp-gate": "/uk/lp/gate-557/",
  "uk-lp-bitget": "/uk/lp/bitget-1500675644365795328/",
  "uk-calendar": "/uk/calendar/",
  "uk-sales": "/uk/sales/",
  "uk-drops": "/uk/drops/",
  "uk-t": "/uk/t/",
  "uk-t-ETH": "/uk/t/ETH/",
  "uk-t-WLFI": "/uk/t/WLFI/",
  "uk-v-bybit": "/uk/v/bybit/",
  "uk-v-hyperliquid": "/uk/v/hyperliquid/",
  "uk-history": "/uk/history/",
  "uk-insights": "/uk/insights/",
  "uk-best": "/uk/best/",
  "uk-bonuses": "/uk/bonuses/",
  "uk-check": "/uk/check/",
  "uk-learn": "/uk/learn/",
  "uk-learn-start": "/uk/learn/start/",
  "uk-learn-how": "/uk/learn/how/",
  "uk-learn-safety": "/uk/learn/safety/",
  "uk-learn-rewards": "/uk/learn/rewards/",
  "uk-learn-quiz": "/uk/learn/quiz/",
  "uk-learn-glossary": "/uk/learn/glossary/",
  "uk-guide-binance": "/uk/learn/guide/binance/",
  "uk-guide-pendle-pt": "/uk/learn/guide/pendle-pt/",
  "uk-guide-hyperliquid": "/uk/learn/guide/hyperliquid/",
  "uk-about": "/uk/about/",
  "uk-api": "/uk/api/",
  "uk-privacy": "/uk/privacy/",
  "uk-terms": "/uk/terms/",
  "uk-404": "/uk/this-page-does-not-exist-404/",
  // ---- en / ru spot checks ----
  "en-home": "/en/",
  "en-p-bybit-referral": "/en/p/19pal7s-bybit-referral-up-to-250-usdt-for-you-and-up-to-250-usdt-for-you/",
  "en-learn": "/en/learn/",
  "en-sales": "/en/sales/",
  "en-unlocks": "/en/unlocks/",
  "ru-home": "/ru/",
  "ru-p-bybit-referral": "/ru/p/19pal7s-bybit-referral-up-to-250-usdt-for-you-and-up-to-250-usdt-for-you/",
  "ru-learn": "/ru/learn/",
  "ru-sales": "/ru/sales/",
  "ru-unlocks": "/ru/unlocks/",
};

let pages = pagesFile ? JSON.parse(fs.readFileSync(pagesFile, "utf8")) : PAGES;
if (only.length) pages = Object.fromEntries(Object.entries(pages).filter(([k]) => only.includes(k)));

const browser = await chromium.launch({
  executablePath: (process.env.CHROME || "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"),
  headless: true,
});
// a fresh context per page: no localStorage carry-over ("since your last visit", learn progress), so rounds diff cleanly
const newCtx = () => browser.newContext({ viewport: { width: 1280, height: 900 }, locale: "uk-UA" });

async function grab(name, rel) {
  const url = BASE + rel;
  const ctx = await newCtx();
  const page = await ctx.newPage();
  let status = 0;
  try {
    const resp = await page.goto(url, { waitUntil: "networkidle", timeout: 60000 });
    status = resp ? resp.status() : 0;
  } catch (e) {
    status = "ERR " + e.message.split("\n")[0];
  }
  await page.waitForTimeout(1200);
  const data = await page.evaluate(() => {
    const q = (s) => document.querySelector(s)?.getAttribute("content") ?? "";
    const heads = [...document.querySelectorAll("h1,h2,h3")].map((h) => h.tagName + ": " + h.innerText.replace(/\s+/g, " ").trim());
    const hidden = new Set();
    document.querySelectorAll("details:not([open])").forEach((d) => {
      const s = d.querySelector("summary");
      const all = d.textContent.replace(/\s+/g, " ").trim();
      const sum = s ? s.textContent.replace(/\s+/g, " ").trim() : "";
      const rest = all.startsWith(sum) ? all.slice(sum.length).trim() : all;
      if (rest) hidden.add((sum ? "[" + sum.slice(0, 60) + "] " : "") + rest);
    });
    document.querySelectorAll('[role="tooltip"]').forEach((t) => {
      const v = t.textContent.replace(/\s+/g, " ").trim();
      if (v) hidden.add("(tooltip) " + v);
    });
    const attrs = new Set();
    document.querySelectorAll("[title],[placeholder],[aria-label],img[alt],[alt]").forEach((el) => {
      for (const a of ["title", "placeholder", "aria-label", "alt"]) {
        const v = el.getAttribute(a);
        if (v !== null && v.trim()) attrs.add(a + "=" + v.replace(/\s+/g, " ").trim());
        if (a === "alt" && el.tagName === "IMG" && v === "") attrs.add('alt=""');
      }
    });
    return {
      title: document.title,
      desc: q('meta[name="description"]'),
      ogTitle: q('meta[property="og:title"]'),
      ogDesc: q('meta[property="og:description"]'),
      canonical: document.querySelector('link[rel="canonical"]')?.href ?? "",
      lang: document.documentElement.lang,
      heads,
      text: document.body.innerText,
      hidden: [...hidden],
      attrs: [...attrs].sort(),
    };
  });
  await ctx.close();
  const out = [
    "URL: " + url,
    "STATUS: " + status,
    "LANG: " + data.lang,
    "TITLE: " + data.title,
    "DESC: " + data.desc,
    "OG:TITLE: " + data.ogTitle,
    "OG:DESC: " + data.ogDesc,
    "CANONICAL: " + data.canonical,
    "",
    "=== HEADINGS ===",
    ...data.heads,
    "",
    "=== TEXT ===",
    data.text.replace(/\n{3,}/g, "\n\n"),
    "",
    "=== HIDDEN (closed details / tooltips) ===",
    ...data.hidden,
    "",
    "=== ATTRS ===",
    ...data.attrs,
    "",
  ].join("\n");
  fs.writeFileSync(path.join(OUT, name + ".txt"), out);
  return [name, status, data.text.length];
}

const entries = Object.entries(pages);
const CONC = 4;
let i = 0;
async function worker() {
  while (i < entries.length) {
    const [n, r] = entries[i++];
    try {
      const res = await grab(n, r);
      console.log(res.join("\t"));
    } catch (e) {
      console.log(n + "\tFAIL\t" + e.message.split("\n")[0]);
    }
  }
}
await Promise.all(Array.from({ length: CONC }, worker));
await browser.close();
