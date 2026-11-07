// Content audit of the static export: broken words/numbers on pages, and logic checks on every promo.
// usage: node scripts/audit-content.mjs   (after GITHUB_PAGES=1 npm run build)
import fs from "node:fs";
import path from "node:path";

const OUT = "out";
const files = [];
(function walk(d) { for (const f of fs.readdirSync(d, { withFileTypes: true })) { const p = path.join(d, f.name); f.isDirectory() ? walk(p) : p.endsWith(".html") && files.push(p); } })(OUT);

/* ---------- 1) visible text problems on every page ---------- */
const BAD = [
  [/\bundefined\b/, "undefined"], [/\bNaN\b/, "NaN"], [/\[object Object\]/, "[object Object]"], [/\bInfinity\b/, "Infinity"],
  [/\bnull\b(?![-_])/, "null"], [/&amp;(amp|lt|gt|quot|#\d+);/, "double-escaped entity"], [/&(nbsp|bull|times|ldquo|rdquo|mdash|rsquo|hellip);/, "raw entity"],
  [/Ð[\u0080-¿]|Ñ[\u0080-¿]|вЂ|Â·/, "mojibake"], [/\$-\d/, "$-number"], [/\b-\$0\b|\$0\.00\b/, "zero amount"], [/\{[a-z_]+\}/, "template {x}"],
];
const textOf = (html) => html.replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/g, " ").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ");
const pageIssues = new Map();
for (const f of files) {
  const t = textOf(fs.readFileSync(f, "utf8"));
  for (const [re, name] of BAD) {
    const m = t.match(re);
    if (m) { const k = name; const arr = pageIssues.get(k) ?? []; arr.push(`${path.relative(OUT, f).replace(/\\/g, "/")} …${t.slice(Math.max(0, m.index - 50), m.index + 60).trim()}…`); pageIssues.set(k, arr); }
  }
}
console.log(`PAGES: ${files.length}`);
for (const [k, arr] of pageIssues) { console.log(`  ✕ ${k}: ${arr.length} pages`); for (const s of arr.slice(0, 4)) console.log(`     - ${s}`); }

/* ---------- 2) English UI words left on Ukrainian / Russian pages (outside promo texts) ---------- */
const UI_EN = /\b(Join|Details|Rules|Share|Copy|Saved|Search|Show more|Ends in|Starts|Published|Back|Loading|Read more|Learn more|Sign up|Log in)\b/;
let enLeft = 0; const enEx = [];
for (const f of files.filter((x) => /[\\/](uk|ru)[\\/]/.test(x))) {
  const html = fs.readFileSync(f, "utf8");
  // only buttons / labels / headings (promo titles and rule texts are allowed to be English)
  for (const m of html.matchAll(/<(button|label|h[1-3]|summary|th)[^>]*>([^<]{2,60})</g)) if (UI_EN.test(m[2]) && !/[а-яіїєґ]/i.test(m[2])) { enLeft++; if (enEx.length < 8) enEx.push(`${path.relative(OUT, f)}: "${m[2].trim()}"`); }
}
console.log(`ENGLISH UI WORDS on uk/ru pages: ${enLeft}`); for (const s of enEx) console.log(`     - ${s}`);

/* ---------- 3) logic checks on every promo ---------- */
const c = JSON.parse(fs.readFileSync(path.join(".next", "cache", "promos-build.json"), "utf8"));
const now = c.fetchedAt, P = c.promos;
const probs = [];
const add = (p, why) => probs.push(`${p.id.slice(0, 40)} | ${why} | ${p.title.slice(0, 70)}`);
const seen = new Map();
for (const p of P) {
  const m = p.meta ?? {};
  if (!p.title || p.title.length < 6) add(p, "title too short");
  if (/&[a-z]+;|&#\d+;/.test(p.title)) add(p, "entity in title");
  if (!/^https?:\/\//.test(p.url)) add(p, "bad url");
  if (p.endsAt && p.endsAt < now) add(p, "already ended");
  if (p.startsAt && p.endsAt && p.startsAt >= p.endsAt) add(p, "start >= end");
  if (p.endsAt && p.endsAt - now > 400 * 86400_000) add(p, "end > 400 days away");
  if (p.reward && !(p.reward.amount > 0)) add(p, "reward amount 0");
  if (p.reward && /^\d/.test(p.reward.label) && /\b(JUST|GLOW|NEW|WIN|THE|AND|FOR|ALL|TOP|BIG|NOW)\b/.test(p.reward.label)) add(p, `reward unit looks like a word: ${p.reward.label}`);
  if (m.perUser && p.reward?.usd && m.perUser.usd && m.perUser.usd > p.reward.usd * 1.01) add(p, `per person ${m.perUser.usd} > pool ${p.reward.usd}`);
  if (m.perUser && !(m.perUser.amount > 0)) add(p, "perUser 0");
  if (m.minEntry && (m.minEntry.amount > 5e6 || !(m.minEntry.amount > 0))) add(p, `minEntry odd ${m.minEntry.amount}`);
  if (m.noDeposit && m.minEntry && m.minEntry.amount > 0) add(p, "no-deposit flag but has entry threshold");
  if (m.apr !== undefined && (m.apr < 0 || m.apr > 10000)) add(p, `apr odd ${m.apr}`);
  const k = `${p.venue.id}|${(p.titleOrig ?? p.title).toLowerCase().replace(/[^a-z0-9]+/g, "").slice(0, 40)}`;
  if (seen.has(k)) add(p, `duplicate of ${seen.get(k)}`); else seen.set(k, p.id);
}
console.log(`PROMOS: ${P.length}, logic issues: ${probs.length}`);
for (const s of probs.slice(0, 60)) console.log(`  ? ${s}`);

/* ---------- 4) promo page essentials ---------- */
let noRules = 0, noJoin = 0;
for (const f of files.filter((x) => /[\\/]uk[\\/]p[\\/]/.test(x))) {
  const h = fs.readFileSync(f, "utf8");
  if (!/btn btn-primary[^"]*"[^>]*>|class="btn btn-primary/.test(h)) noJoin++;
  if (!/id="rules"/.test(h) && !/APR/.test(h)) noRules++;
}
console.log(`UK promo pages without a primary button: ${noJoin}, without rules block (non-farming): ${noRules}`);
