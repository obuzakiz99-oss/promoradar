// Profile header for X / other networks (owner 27.11: "шапка логотип опис"): 1500x500 PNG with the site's look.
// Usage: node scripts/social-banner.mjs [out.png]
import path from "node:path";
import { createRequire } from "node:module";
const require = createRequire(path.resolve("package.json"));
const sharp = require("sharp");
const out = process.argv[2] || "social/banner-x.png";
const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1500" height="500" font-family="Segoe UI, Arial, sans-serif">
  <rect width="1500" height="500" fill="#0b0d10"/>
  <circle cx="1330" cy="250" r="330" fill="none" stroke="#c8ff3d" stroke-opacity="0.10" stroke-width="3"/>
  <circle cx="1330" cy="250" r="220" fill="none" stroke="#c8ff3d" stroke-opacity="0.16" stroke-width="3"/>
  <circle cx="1330" cy="250" r="110" fill="none" stroke="#c8ff3d" stroke-opacity="0.24" stroke-width="3"/>
  <path d="M1330 250 L1480 160" stroke="#c8ff3d" stroke-opacity="0.5" stroke-width="4"/>
  <circle cx="1330" cy="250" r="12" fill="#c8ff3d"/>
  <circle cx="1420" cy="195" r="9" fill="#c8ff3d" fill-opacity="0.8"/><circle cx="1250" cy="330" r="7" fill="#c8ff3d" fill-opacity="0.6"/>
  <text x="360" y="200" font-size="70" font-weight="800" fill="#ffffff">Бонуси криптобірж</text>
  <text x="360" y="280" font-size="70" font-weight="800" fill="#c8ff3d">з реальними цифрами</text>
  <text x="360" y="350" font-size="34" fill="#8b95a5">Bybit · Binance · OKX · Bitget · MEXC і ще 50+ бірж</text>
  <text x="360" y="415" font-size="34" font-weight="700" fill="#e8ecf1">promoradar.xyz</text>
</svg>`;
await sharp(Buffer.from(svg)).png().toFile(out);
console.log(out);
