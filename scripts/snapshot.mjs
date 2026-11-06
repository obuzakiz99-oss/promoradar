// Append one APR snapshot to data/history.json from the freshly built site (out/api/*).
// Run by the GitHub workflow after `npm run build`. Keeps ~120 days (the history page shows 3 months).
import fs from "node:fs";
import path from "node:path";

const OUT = process.env.OUT_DIR || "out";
const FILE = path.join("data", "history.json");
const COINS = ["USDT", "USDC", "BTC", "ETH", "SOL", "BNB"];
const KEEP_MS = 120 * 86400_000;

const read = (f) => JSON.parse(fs.readFileSync(path.join(OUT, "api", f), "utf8"));
const earn = read("earn");
const pools = read("pools");

const snap = { t: Date.now(), earn: {}, pools: {} };
for (const o of earn.offers) {
  if (!COINS.includes(o.coin) || o.newUsers || o.type === "fixed") continue;
  const c = (snap.earn[o.coin] ??= {});
  if (o.apr > (c[o.exchange] ?? -1)) c[o.exchange] = +o.apr.toFixed(2);
}
for (const p of pools.projects) {
  if (p.status !== "live") continue;
  for (const x of p.pools) if (x.apr !== undefined && x.apr !== null) {
    snap.pools[`${p.exchange}:${p.id}:${x.stake}`] = { name: `${p.name} ${x.stake}→${p.token}`, apr: +Number(x.apr).toFixed(2) };
  }
}

fs.mkdirSync("data", { recursive: true });
let hist = { snaps: [] };
try { hist = JSON.parse(fs.readFileSync(FILE, "utf8")); } catch {}
hist.snaps = [...(hist.snaps ?? []).filter((s) => snap.t - s.t < KEEP_MS), snap];
fs.writeFileSync(FILE, JSON.stringify(hist));
console.log(`history: ${hist.snaps.length} snapshots, earn coins ${Object.keys(snap.earn).length}, live pools ${Object.keys(snap.pools).length}`);
