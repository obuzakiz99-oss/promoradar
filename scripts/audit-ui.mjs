// UI consistency guard (audits 08.11): fails the build when components bypass the design tokens.
// usage: node scripts/audit-ui.mjs      (runs in .github/workflows/pages.yml before `next build`)
//   hard (exit 1): text below 12px — Tailwind classes, CSS font-size, SVG fontSize, inline style fontSize;
//                  raw hex colours in className; arbitrary radii rounded-[…]; icon-only <button> without aria-label
//   soft (counted, to shrink over time): other arbitrary font sizes
import fs from "node:fs";
import path from "node:path";

const files = [];
const walk = (d) => { for (const f of fs.readdirSync(d)) { const p = path.join(d, f); if (fs.statSync(p).isDirectory()) walk(p); else if (/\.(tsx|css)$/.test(p)) files.push(p); } };
walk("src");

const px = (v, unit) => (unit === "rem" ? v * 16 : v);
let hard = 0, soft = 0;
const fail = (f, what, why) => { hard++; console.log(`✕ ${f}: ${what} — ${why}`); };

for (const f of files) {
  const src = fs.readFileSync(f, "utf8");
  if (f.endsWith(".css")) {
    for (const m of src.matchAll(/font-size:\s*([\d.]+)(px|rem)/g)) if (px(+m[1], m[2]) < 12) fail(f, m[0], "font-size below 12px");
    continue;
  }
  for (const m of src.matchAll(/text-\[([\d.]+)(px|rem)\]/g)) { if (px(+m[1], m[2]) < 12) fail(f, m[0], "text below 12px — use text-xs"); else soft++; }
  for (const m of src.matchAll(/fontSize[=:]\s*["{]?\s*([\d.]+)\b/g)) if (+m[1] < 12) fail(f, m[0], "SVG / inline font size below 12px");
  for (const m of src.matchAll(/(?:text|bg|border|ring|fill|stroke)-\[#[0-9a-fA-F]{3,8}\]/g)) fail(f, m[0], "raw hex colour — use a token");
  for (const m of src.matchAll(/rounded-\[[^\]]+\]/g)) fail(f, m[0], "arbitrary radius — use rounded-md / -xl / -2xl / -full");
  // <button …> whose content has no letters (icon / symbol only) and no aria-label
  for (const m of src.matchAll(/<button\b([^>]*)>([\s\S]*?)<\/button>/g)) {
    const [, attrs, body] = m;
    const text = body.replace(/<svg[\s\S]*?<\/svg>/g, "").replace(/<[^>]+>/g, "").replace(/\{[^}]*\}/g, (x) => (/[A-Za-zА-Яа-яІіЇїЄє]/.test(x) ? "T" : ""));
    if (!/aria-label/.test(attrs) && !/[A-Za-zА-Яа-яІіЇїЄєҐґ0-9]/.test(text)) fail(f, `<button${attrs.slice(0, 60)}…>`, "icon-only button without aria-label");
  }
}
console.log(`\n${files.length} files · hard problems: ${hard} · other arbitrary font sizes: ${soft}`);
process.exit(hard ? 1 : 0);
