// Link checker for the static export (run after `GITHUB_PAGES=1 npm run build`).
//  1) every internal link (/promoradar/...) must exist in ./out
//  2) every external link is requested (honest UA, gentle concurrency); 403/429/503 behind bot protection are
//     reported separately ("blocked") because a browser opens them fine
//  3) every promo must link to its own venue's domain (or its official Telegram / Medium / DefiLlama page)
// usage: node scripts/check-links.mjs [--no-external]
import fs from "node:fs";
import path from "node:path";

const OUT = "out", BASE = "/promoradar";
const UA = { "User-Agent": "Mozilla/5.0 (compatible; PromoRadar/1.0; +https://promoradar.example)", Accept: "text/html,application/json;q=0.9,*/*;q=0.8" };
const noExternal = process.argv.includes("--no-external");

const files = [];
(function walk(d) { for (const f of fs.readdirSync(d, { withFileTypes: true })) { const p = path.join(d, f.name); f.isDirectory() ? walk(p) : p.endsWith(".html") && files.push(p); } })(OUT);

const internal = new Map(), external = new Map();   // href → first page that uses it
const decode = (s) => s.replace(/&amp;/g, "&").replace(/&#x27;/g, "'").replace(/&quot;/g, '"');
for (const f of files) {
  const html = fs.readFileSync(f, "utf8");
  for (const m of html.matchAll(/<a\b[^>]*?\shref="([^"]+)"/g)) {
    const h = decode(m[1]);
    if (h.startsWith("#") || h.startsWith("mailto:") || h.startsWith("javascript:") || h.startsWith("data:") || h.startsWith("./")) continue;   // ./uk/ = language redirect page
    const page = path.relative(OUT, f).replace(/\\/g, "/");
    if (h.startsWith("http")) { if (!external.has(h)) external.set(h, page); }
    else if (!internal.has(h)) internal.set(h, page);
  }
}

/* 1) internal */
const missing = [];
for (const [h, page] of internal) {
  let p = h.split("#")[0].split("?")[0];
  if (!p.startsWith(BASE + "/") && p !== BASE) { missing.push([h, page, "no basePath"]); continue; }
  p = p.slice(BASE.length) || "/";
  const cand = [path.join(OUT, p), path.join(OUT, p, "index.html"), path.join(OUT, p + ".html")];
  if (!cand.some((c) => fs.existsSync(c) && fs.statSync(c).isFile())) missing.push([h, page, "not built"]);
}
console.log(`INTERNAL: ${internal.size} unique links, ${missing.length} broken`);
for (const [h, page, why] of missing.slice(0, 40)) console.log(`  ✕ ${h}  (${why}; on ${page})`);

/* 3) promo → venue domain */
const SITES = { binance: "binance.com", bybit: "bybit.com", okx: "okx.com", bitget: "bitget.com", kucoin: "kucoin.com", gate: "gate.com", mexc: "mexc.com",
  htx: "htx.com", bingx: "bingx.com", xt: "xt.com", bitunix: "bitunix.com", weex: "weex.com", whitebit: "whitebit.com", coinex: "coinex.com", bitrue: "bitrue.com",
  kraken: "kraken.com", lbank: "lbank.com", phemex: "phemex.com", bitmart: "bitmart.com", hyperliquid: "hyperliquid", lighter: "lighter", aster: "aster",
  pancakeswap: "pancakeswap", raydium: "raydium", gmx: "gmx", meteora: "meteora", bluefin: "bluefin", edgex: "edgex", aerodrome: "aerodrome", pendle: "pendle" };
const OK_HOSTS = ["t.me", "medium.com", "defillama.com", "airdrops.io", "x.com", "twitter.com", "zendesk.com"];   // zendesk = exchanges' own help centres
let promos = [];
try { promos = JSON.parse(fs.readFileSync(path.join(OUT, "api", "promos"), "utf8")).promos; } catch { console.log("(no out/api/promos)"); }
const wrong = [];
for (const p of promos) {
  let host = ""; try { host = new URL(p.url).hostname.replace(/^www\./, ""); } catch { wrong.push([p.venue.id, p.title, p.url, "bad URL"]); continue; }
  const want = SITES[p.venue.id];
  if (!want) continue;   // DeFi / airdrop venues: any project domain
  if (host.includes(want) || OK_HOSTS.some((h) => host === h || host.endsWith("." + h))) continue;
  wrong.push([p.venue.id, p.title, p.url, `host ${host}`]);
}
console.log(`\nPROMO → VENUE: ${promos.length} promos, ${wrong.length} point somewhere unexpected`);
for (const [v, t, u, why] of wrong) console.log(`  ? ${v}: ${t.slice(0, 70)} → ${u} (${why})`);

/* 2) external */
if (!noExternal) {
  const PER_HOST = 25;
  const byHost = new Map();
  const todo = [];
  for (const [u, page] of external) {
    let h; try { h = new URL(u).hostname; } catch { continue; }
    const n = byHost.get(h) ?? 0;
    if (n >= PER_HOST) continue;
    byHost.set(h, n + 1); todo.push([u, page]);
  }
  const res = { ok: 0, blocked: [], broken: [] };
  const check = async ([u, page]) => {
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const r = await fetch(u, { headers: UA, redirect: "follow", signal: AbortSignal.timeout(20_000) });
        r.body?.cancel?.();
        if (r.ok) { res.ok++; return; }
        if ([401, 403, 405, 429, 503, 520, 521, 522, 523].includes(r.status)) { res.blocked.push([u, r.status, page]); return; }
        if (attempt === 1) res.broken.push([u, r.status, page]);
      } catch (e) {
        // Bybit drops non-browser clients (reset / timeout) — a browser opens these fine
        if (attempt === 1) (/bybit\.com$/.test(new URL(u).hostname) ? res.blocked : res.broken).push([u, e.cause?.code ?? e.name, page]);
      }
      await new Promise((r) => setTimeout(r, 1500));
    }
  };
  const queue = todo.slice();
  await Promise.all(Array.from({ length: 6 }, async () => { while (queue.length) await check(queue.shift()); }));
  console.log(`\nEXTERNAL: ${external.size} unique (${todo.length} checked, ≤${PER_HOST}/host): ${res.ok} ok, ${res.blocked.length} blocked by bot protection, ${res.broken.length} broken`);
  for (const [u, s, page] of res.broken) console.log(`  ✕ ${s} ${u}  (on ${page})`);
  const bh = {}; for (const [u, s] of res.blocked) { const h = new URL(u).hostname; bh[h] = `${(bh[h] ? bh[h].split(" ")[0] * 1 : 0) + 1} × ${s}`; }
  if (res.blocked.length) console.log("  blocked hosts:", Object.entries(bh).map(([h, n]) => `${h} (${n})`).join(", "));
}
