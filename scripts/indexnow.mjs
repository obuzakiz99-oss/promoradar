// IndexNow (25.11): tells Bing, Yandex, Seznam, Naver… about new and changed pages right after a deploy, so nobody has to
// press "request indexing" by hand. Google does not take IndexNow — it reads sitemap.xml.
// The key is public by design (the same value is served at /<key>.txt). New URLs = in the live sitemap but not in the
// list sent last time (.indexnow/sent.json, kept in the Actions cache); every 7 days the whole sitemap is re-sent.
// usage: node scripts/indexnow.mjs
import fs from "node:fs";
import path from "node:path";

const KEY = "5886ace27c6cc0ecd7c2afa96bbfdbda";
const HOST = process.env.SITE_HOST || "promoradar.xyz";
const BASE = `https://${HOST}`;
const DIR = ".indexnow", FILE = path.join(DIR, "sent.json");
const sm = await (await fetch(`${BASE}/sitemap.xml?x=${Date.now()}`, { signal: AbortSignal.timeout(30_000) })).text();
const urls = [...sm.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]).filter((u) => u.startsWith(BASE));
const key = (await (await fetch(`${BASE}/${KEY}.txt`)).text()).trim();
if (key !== KEY) { console.log(`indexnow: key file not live yet (${BASE}/${KEY}.txt) — skipped`); process.exit(0); }
let prev = { at: 0, urls: [] };
try { prev = JSON.parse(fs.readFileSync(FILE, "utf8")); } catch { /* first run */ }
const full = Date.now() - prev.at > 7 * 86400_000;
const seen = new Set(prev.urls);
const todo = full ? urls : urls.filter((u) => !seen.has(u));
if (!todo.length) { console.log(`indexnow: nothing new (${urls.length} URLs in the sitemap)`); process.exit(0); }
const r = await fetch("https://api.indexnow.org/indexnow", {
  method: "POST", headers: { "Content-Type": "application/json; charset=utf-8" }, signal: AbortSignal.timeout(30_000),
  body: JSON.stringify({ host: HOST, key: KEY, keyLocation: `${BASE}/${KEY}.txt`, urlList: todo.slice(0, 10_000) }),
});
console.log(`indexnow: sent ${todo.length} URL(s)${full ? " (weekly full resend)" : ""} → HTTP ${r.status}`);
if (r.ok || r.status === 202) {
  fs.mkdirSync(DIR, { recursive: true });
  fs.writeFileSync(FILE, JSON.stringify({ at: full ? Date.now() : prev.at || Date.now(), urls }));
}
