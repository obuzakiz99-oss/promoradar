// UI consistency guard (audit 08.11): reports arbitrary values that bypass the design tokens.
// usage: node scripts/audit-ui.mjs        (exit code 1 when a hard rule is broken)
//   hard: text below 12px (text-[9px|10px|11px]), raw hex colours in className
//   soft (counted, to shrink over time): other arbitrary font sizes / radii
import fs from "node:fs";
import path from "node:path";

const files = [];
const walk = (d) => { for (const f of fs.readdirSync(d)) { const p = path.join(d, f); if (fs.statSync(p).isDirectory()) walk(p); else if (p.endsWith(".tsx")) files.push(p); } };
walk("src");

const HARD = [
  [/text-\[(9|10|11|11\.5)px\]/g, "text below 12px — use text-xs (12px)"],
  [/(?:text|bg|border)-\[#[0-9a-fA-F]{3,8}\]/g, "raw hex colour — use a token (on-accent, success, lime, …)"],
];
const SOFT = [[/text-\[[\d.]+(?:px|rem)\]/g, "arbitrary font size"], [/rounded-\[[\d.]+(?:px|rem)\]/g, "arbitrary radius"]];

let hard = 0;
const soft = {};
for (const f of files) {
  const src = fs.readFileSync(f, "utf8");
  for (const [re, msg] of HARD) for (const m of src.matchAll(re)) { hard++; console.log(`✕ ${f}: ${m[0]} — ${msg}`); }
  for (const [re, msg] of SOFT) soft[msg] = (soft[msg] ?? 0) + (src.match(re)?.length ?? 0);
}
console.log(`\n${files.length} files · hard problems: ${hard} · ${Object.entries(soft).map(([k, v]) => `${k}: ${v}`).join(" · ")}`);
process.exit(hard ? 1 : 0);
