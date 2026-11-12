// Laptop side of "Telegram promo + exchange page" (12.11, user: "інформація з телеграму має бути доповнена з біржі").
// Finds live Telegram promos whose rules are thin, opens the exchange page the post links to in headless Chrome
// (campaign pages are JavaScript apps — servers get an empty shell) and stores the rendered article HTML in
// <out>/rules.json  ({ "origin+path": { at, url, html } }, 45-day expiry). prrelay pushes that folder to the `relay`
// branch; details.ts appends the page under the post text.
// usage: node scripts/tg-enrich.mjs <outDir> [maxPages=12]
import { spawn } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const [, , outDir, maxArg] = process.argv;
const MAX = Number(maxArg ?? 12);
const CHROME = "C:/Program Files/Google/Chrome/Application/chrome.exe";
const SITE = "https://obuzakiz99-oss.github.io/promoradar/api/promos.json";
const DETAILS = "https://raw.githubusercontent.com/obuzakiz99-oss/promoradar/data/details.json";
const FILE = path.join(outDir, "rules.json");
const DAY = 86400_000;

const key = (url) => { const u = new URL(url.replace(/&amp;/g, "&")); return (u.origin + u.pathname).replace(/\/$/, ""); };
const textLen = (h) => h.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim().length;
// links that are not a campaign page: trading screens, sign-up, downloads, deposit forms
const NOT_CAMPAIGN = /\/(trade|futures|spot|download|register|signup|deposit|assets)\b|\/account\//i;

const db = fs.existsSync(FILE) ? JSON.parse(fs.readFileSync(FILE, "utf8")) : {};
for (const [k, r] of Object.entries(db)) if (Date.now() - r.at > 45 * DAY) delete db[k];

const getJson = async (u) => (await fetch(u, { headers: { "User-Agent": "PromoRadar-relay" } })).json();
const [{ promos }, details] = await Promise.all([getJson(SITE), getJson(DETAILS).catch(() => ({}))]);
const size = (id) => (details[id]?.blocks ?? []).reduce((n, b) => n + b.x.length, 0);

const todo = promos
  .filter((p) => p.id.startsWith("tg:") && !p.url.startsWith("https://t.me/") && !NOT_CAMPAIGN.test(new URL(p.url.replace(/&amp;/g, "&")).pathname))
  .filter((p) => size(p.id) < 1500)
  .filter((p) => { const r = db[key(p.url)]; return !r || (!r.html && Date.now() - r.at > 2 * DAY); })   // retry empty reads every 2 days
  .sort((a, b) => b.publishedAt - a.publishedAt)
  .slice(0, MAX);

const dump = (url, i) => new Promise((res) => {
  const prof = path.join(os.tmpdir(), `prhc-${i % 2}`);
  const p = spawn(CHROME, ["--headless=new", "--disable-gpu", `--user-data-dir=${prof}`, "--lang=en-US", "--virtual-time-budget=20000", "--dump-dom", url], { windowsHide: true });
  let s = ""; p.stdout.on("data", (c) => (s += c)); const t = setTimeout(() => p.kill(), 90_000);
  p.on("close", () => { clearTimeout(t); res(s); });
});
const strip = (h) => h.replace(/<(script|style|noscript|svg|button|nav|header|footer|form|select|input|img|picture)[\s\S]*?<\/\1>/gi, "").replace(/<(img|input)[^>]*>/gi, "").replace(/\s(class|style|data-[\w-]+|id|aria-[\w-]+|src|srcset)="[^"]*"/g, "");
function extract(page) {
  const cands = [];
  for (const m of page.matchAll(/<article[\s>][\s\S]*?<\/article>/gi)) cands.push(m[0]);
  for (const m of page.matchAll(/<main[\s>][\s\S]*?<\/main>/gi)) cands.push(m[0]);
  cands.push(page.replace(/^[\s\S]*?<body[^>]*>/i, ""));
  const scored = cands.map(strip).map((h) => ({ h, n: textLen(h) })).filter((x) => x.n > 300);
  if (!scored.length) return "";
  const max = Math.max(...scored.map((x) => x.n));
  return scored.filter((x) => x.n >= Math.min(max * 0.5, 4000)).sort((a, b) => a.n - b.n)[0].h.slice(0, 400_000);
}

let n = 0;
const queue = [...todo];
await Promise.all([0, 1].map(async (w) => {
  for (let p = queue.shift(); p; p = queue.shift()) {
    const url = p.url.replace(/&amp;/g, "&");
    const html = extract(await dump(url, w));
    db[key(url)] = { at: Date.now(), url, html: textLen(html) >= 400 ? html : "" };
    n++;
    console.log(`${String(textLen(html)).padStart(6)} ${p.id} ${url.slice(0, 80)}`);
  }
}));
fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(FILE, JSON.stringify(db));
console.log(`read ${n} pages; rules.json has ${Object.keys(db).length} (${(fs.statSync(FILE).size / 1024).toFixed(0)} KB)`);
