// Merge full rule pages read in headless Chrome (scratchpad hc-read.mjs) into src/config/browser-rules.json.
// usage: node scripts/rules-merge.mjs <rules-out.json> [minChars=400]
// Keys are origin+path (no query, no trailing slash) — details.ts browserKey(). Entries older than 45 days are dropped.
import fs from "node:fs";
const FILE = "src/config/browser-rules.json";
const inp = JSON.parse(fs.readFileSync(process.argv[2], "utf8"));
const min = Number(process.argv[3] ?? 400);
const db = fs.existsSync(FILE) ? JSON.parse(fs.readFileSync(FILE, "utf8")) : {};
const key = (url) => { const u = new URL(url.replace(/&amp;/g, "&")); return (u.origin + u.pathname).replace(/\/$/, ""); };
const text = (h) => h.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
let ok = 0, skip = 0;
for (const [url, r] of Object.entries(inp)) {
  if (!r.html || text(r.html).length < min) { skip++; continue; }
  db[key(url)] = { at: r.at, html: r.html };
  ok++;
}
const now = Date.now();
for (const [k, r] of Object.entries(db)) if (now - r.at > 45 * 86400_000) delete db[k];
fs.writeFileSync(FILE, JSON.stringify(db) + "\n");
console.log(`merged ${ok}, skipped ${skip} (too short), file has ${Object.keys(db).length} pages, ${(fs.statSync(FILE).size / 1024).toFixed(0)} KB`);
