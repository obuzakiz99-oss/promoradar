// Share cards (1200×630 PNG) for every promo → out/og/<slug>.png, used as og:image on the promo pages,
// so a link shared in Telegram / X / Facebook shows the amount, the deadline and the exchange.
// Run after `GITHUB_PAGES=1 npm run build` (reads out/api/promos.json). Text is Ukrainian (main audience).
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
const require = createRequire(path.resolve("package.json"));
const sharp = require("sharp");

const OUT = process.env.OUT_DIR || "out";
const feed = JSON.parse(fs.readFileSync(path.join(OUT, "api", "promos"), "utf8"));
const titlesUk = feed.titles?.uk ?? {};
fs.mkdirSync(path.join(OUT, "og"), { recursive: true });

// same slug logic as src/lib/slug.ts (the feed carries the original titles)
const hash = (s) => { let h = 0x811c9dc5; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193); } return (h >>> 0).toString(36); };
const kebab = (s) => s.normalize("NFKD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 64).replace(/-+$/, "");
const slugOf = (p) => { const text = p.title.toLowerCase().startsWith(p.venue.name.toLowerCase()) ? p.title : `${p.venue.name} ${p.title}`; return `${hash(p.id)}-${kebab(p.venue.kind === "airdrop" ? `${text} airdrop` : text) || "promo"}`; };

const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const strip = (s) => String(s).replace(/[\u{1F000}-\u{1FFFF}\u{2600}-\u{27BF}\u{FE0F}\u{200D}]/gu, "").replace(/\s+/g, " ").trim();
function wrap(s, max, lines) {
  const words = strip(s).split(" "), out = [];
  let cur = "";
  for (const w of words) {
    if ((cur + " " + w).trim().length > max) { out.push(cur.trim()); cur = w; if (out.length === lines) break; }
    else cur = `${cur} ${w}`;
  }
  if (out.length < lines && cur.trim()) out.push(cur.trim());
  if (out.length === lines && words.join(" ").length > out.join(" ").length + 1) out[lines - 1] = out[lines - 1].replace(/\s*\S*$/, "") + "…";
  return out.slice(0, lines);
}
const usd = (x) => (x >= 1e6 ? `$${(x / 1e6).toFixed(1).replace(/\.0$/, "")}M` : x >= 1e3 ? `$${Math.round(x / 1e3)}K` : `$${Math.round(x)}`);
const ddmm = (ms) => new Date(ms).toISOString().slice(5, 10).split("-").reverse().join(".");

let n = 0;
const now = Date.now();
for (const p of feed.promos) {
  const m = p.meta ?? {};
  const pu = m.perUser;
  const big = pu ? `до ${pu.usd !== undefined && !/^USD/.test(pu.unit) ? usd(pu.usd) : pu.unit === "USD" ? usd(pu.amount) : `${pu.amount.toLocaleString("en-US")} ${pu.unit}`}` : p.reward?.label ? p.reward.label : m.apr !== undefined ? `+${m.apr}% APR` : "Деталі акції";
  const sub = pu ? "на одну людину" : p.reward ? "призовий фонд" : m.apr !== undefined ? "річних" : "";
  const top = p.endsAt && p.endsAt > now ? (p.endsAt - now < 3 * 86400_000 ? `ЗАКІНЧУЄТЬСЯ ${ddmm(p.endsAt)}` : `ДО ${ddmm(p.endsAt)}`) : p.startsAt && p.startsAt > now ? `СТАРТ ${ddmm(p.startsAt)}` : "АКТИВНА";
  const chips = [m.noDeposit ? "Без вкладень" : "", m.minEntry ? `Поріг від $${m.minEntry.amount.toLocaleString("en-US")}` : "", m.forNew ? "Для нових" : "", m.geo?.only ? `Лише ${m.geo.only === "region" ? "окремі регіони" : m.geo.only}` : ""].filter(Boolean).slice(0, 3);
  const title = wrap(titlesUk[p.id] ?? p.title, 46, 2);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#0d1512"/><stop offset="1" stop-color="#06080b"/></linearGradient>
    <linearGradient id="t" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#c8ff3d"/><stop offset=".6" stop-color="#3de0c8"/><stop offset="1" stop-color="#5ab8ff"/></linearGradient>
  </defs>
  <rect width="1200" height="630" fill="url(#g)"/>
  <circle cx="1080" cy="80" r="260" fill="${esc(p.venue.color || "#c8ff3d")}" opacity=".10"/>
  <g transform="translate(64,56)">
    <rect width="48" height="48" rx="12" fill="#06080b" stroke="#c8ff3d" stroke-width="3"/>
    <circle cx="24" cy="24" r="14" stroke="#c8ff3d" stroke-width="3" fill="none"/><circle cx="24" cy="24" r="5" fill="#c8ff3d"/>
    <text x="64" y="35" font-family="DejaVu Sans, Segoe UI, Arial" font-size="30" font-weight="700" fill="#e8ecf1">Promo<tspan fill="#c8ff3d">Radar</tspan></text>
  </g>
  <text x="1136" y="92" text-anchor="end" font-family="DejaVu Sans, Segoe UI, Arial" font-size="28" font-weight="700" fill="${p.endsAt && p.endsAt - now < 3 * 86400_000 ? "#ff6b8b" : "#ffb547"}">${esc(top)}</text>
  <text x="64" y="182" font-family="DejaVu Sans, Segoe UI, Arial" font-size="34" font-weight="700" fill="#9aa3ad">${esc(p.venue.name)}</text>
  ${title.map((l, i) => `<text x="64" y="${236 + i * 46}" font-family="DejaVu Sans, Segoe UI, Arial" font-size="36" font-weight="600" fill="#e8ecf1">${esc(l)}</text>`).join("\n  ")}
  <text x="64" y="${title.length > 1 ? 410 : 370}" font-family="DejaVu Sans, Segoe UI, Arial" font-size="${big.length > 14 ? 76 : 96}" font-weight="800" fill="url(#t)">${esc(big)}</text>
  ${sub ? `<text x="64" y="${title.length > 1 ? 462 : 422}" font-family="DejaVu Sans, Segoe UI, Arial" font-size="32" fill="#9aa3ad">${esc(sub)}</text>` : ""}
  ${chips.map((c, i) => { const x = 64 + chips.slice(0, i).reduce((s, cc) => s + cc.length * 17 + 56, 0); return `<rect x="${x}" y="510" width="${c.length * 17 + 40}" height="52" rx="14" fill="#ffffff" fill-opacity=".06" stroke="#ffffff" stroke-opacity=".1"/><text x="${x + 20}" y="545" font-family="DejaVu Sans, Segoe UI, Arial" font-size="26" fill="#e8ecf1">${esc(c)}</text>`; }).join("\n  ")}
  <text x="1136" y="590" text-anchor="end" font-family="DejaVu Sans, Segoe UI, Arial" font-size="26" font-weight="700" fill="#c8ff3d">Умови й калькулятор →</text>
</svg>`;
  await sharp(Buffer.from(svg)).png({ compressionLevel: 9, palette: true }).toFile(path.join(OUT, "og", `${slugOf(p)}.png`));
  n++;
}
console.log(`og cards: ${n}`);
