// Contact sheets of full-page screenshots for human review: node contact.mjs [--dir=../r1] [--only=home,calendar] [--widths=phone,tablet]
// Each sheet = up to COLS columns of a long page side by side, scaled so the text stays legible.
import { chromium } from "playwright-core";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
const HERE = path.dirname(fileURLToPath(import.meta.url));
const args = Object.fromEntries(process.argv.slice(2).map((a) => { const [k, ...v] = a.replace(/^--/, "").split("="); return [k, v.length ? v.join("=") : true]; }));
const DIR = path.resolve(HERE, args.dir || "../r1");
const SHOTS = path.join(DIR, "shots"), OUT = path.join(DIR, "review");
fs.mkdirSync(OUT, { recursive: true });
const only = args.only ? String(args.only).split(",") : null;
const W = args.widths ? String(args.widths).split(",") : ["phone", "desktop"];
const files = fs.readdirSync(SHOTS).filter((f) => new RegExp(`-(${W.join("|")})\\.png$`).test(f) && !/^(menu|kb|st|media|r1s)-/.test(f) && (!only || only.some((o) => f.startsWith(o + "-"))));
const b = await chromium.launch({ executablePath: (process.env.CHROME || "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"), headless: true });
const p = await b.newPage({ viewport: { width: 1600, height: 1600 }, deviceScaleFactor: 1 });
for (const f of files) {
  const phone = /-(phone|tablet|zoom200)\.png$/.test(f); // DPR-2 shots
  const buf = fs.readFileSync(path.join(SHOTS, f));
  const dims = { w: buf.readUInt32BE(16), h: buf.readUInt32BE(20) };
  const scale = phone ? 0.5 : 0.55;          // phone shots are DPR2 → 390 css px columns; desktop → 704 px columns
  const colW = Math.round(dims.w * scale), colH = phone ? 1500 : 1400, gap = 12;
  const cols = /-(phone|zoom200)\.png$/.test(f) ? 4 : 2;
  const totalH = Math.round(dims.h * scale);
  const nCols = Math.max(1, Math.ceil((totalH - 60) / colH)); // drop a sliver of a last column
  const sheets = Math.ceil(nCols / cols);
  const data = `data:image/png;base64,${buf.toString("base64")}`;
  for (let s = 0; s < sheets; s++) {
    const cs = Array.from({ length: Math.min(cols, nCols - s * cols) }, (_, i) => s * cols + i);
    const W = cs.length * colW + (cs.length - 1) * gap, H = Math.min(colH, totalH);
    await p.setViewportSize({ width: W, height: H });
    await p.setContent(`<body style="margin:0;background:#f0f;display:flex;gap:${gap}px">${cs.map((c) => `<div style="width:${colW}px;height:${H}px;background:#222 url(${data}) no-repeat 0 ${-c * colH}px/${colW}px ${totalH}px"></div>`).join("")}</body>`);
    await p.waitForTimeout(150);
    await p.screenshot({ path: path.join(OUT, f.replace(".png", `-s${s + 1}.png`)) });
  }
  console.log(f, `${dims.w}x${dims.h}`, `${sheets} sheet(s)`);
}
await b.close();
