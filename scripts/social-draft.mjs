// Social post draft for Threads / Instagram (owner 27.11: regular content, later X and others).
// Reads the live site API, picks the easiest real offers and writes a ready text + a 1080x1350 image card.
// Nothing is posted: the owner approves every post in chat, then it is published by hand / through his logged-in browser.
// Usage: node scripts/social-draft.mjs [format] [outDir]   format: weekly | earn | explain (default: by day)
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
const require = createRequire(path.resolve("package.json"));
const sharp = require("sharp");

const SITE = "https://promoradar.xyz";
const fmt = process.argv[2] || ["weekly", "earn", "explain"][Math.floor(Date.now() / 86400_000 / 2) % 3];
const out = process.argv[3] || "social";
fs.mkdirSync(out, { recursive: true });

const j = (u) => fetch(u, { headers: { "user-agent": "PromoRadar-social/1.0" } }).then((r) => r.json());
const usd = (n) => `$${n >= 100 ? Math.round(n) : String(Math.round(n * 10) / 10).replace(".", ",")}`;   // uk decimal comma
const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const now = Date.now();
const date = new Date().toISOString().slice(0, 10);

let text = "", rows = [], title = "", sub = "", ref = `?ref=${"social"}`;

if (fmt === "weekly") {
  const P = (await j(`${SITE}/api/promos.json`)).promos;
  const ok = P.filter((p) => p.venue.kind === "cex" && !(p.startsAt > now) && !(p.endsAt && p.endsAt < now) && !p.sponsored
    && p.meta?.value?.net >= 10 && p.meta.value.conf !== "low" && p.meta.value.basis !== "chance"
    && !/\b(futures?|perps?|margin|leverage|copy ?trad)/i.test(p.titleOrig ?? p.title) && !p.meta?.audience && !p.meta?.geo?.noUA);
  ok.sort((a, b) => Number(!!b.meta.forNew) - Number(!!a.meta.forNew) || b.meta.value.net - a.meta.value.net);
  const top = ok.slice(0, 3);
  title = "Бонуси бірж цього тижня"; sub = "реальні цифри, а не «до 5 000$»";
  rows = top.map((p) => [p.venue.name, `≈ ${usd(p.meta.value.net)}`, p.meta.forNew ? "новачкам" : "усім"]);
  text = `🎁 Бонуси бірж цього тижня — з реальними цифрами, а не «до 5 000$»:\n\n`
    + top.map((p, i) => `${["1️⃣", "2️⃣", "3️⃣"][i]} ${p.venue.name} — ${p.meta.perUser ? `до ${Math.round(p.meta.perUser.amount)} ${p.meta.perUser.unit}` : "бонус"}${p.meta.forNew ? " новачкам" : ""}. Реально ≈ ${usd(p.meta.value.net)}.`).join("\n")
    + `\n\nПотрібна верифікація (KYC). Частина бонусів — ваучери, а не гроші: на сайті пишемо, що саме можна вивести.\n\nУсі акції з умовами простою мовою 👉 promoradar.xyz/uk/`;
} else if (fmt === "earn") {
  const BIG = new Set(["binance", "bybit", "okx", "bitget", "kucoin", "gate", "mexc", "htx", "kraken", "bingx", "whitebit"]);
  const E = (await j(`${SITE}/api/earn.json`)).offers;
  const best = new Map();
  for (const o of E) if (o.coin === "USDT" && o.type === "flexible" && BIG.has(o.exchange) && !o.newUsers && o.apr > 0 && o.apr <= 30 && !(o.minAmount > 1000)) { const b = best.get(o.exchange); if (!b || o.apr > b.apr) best.set(o.exchange, o); }
  const top = [...best.values()].sort((a, b) => b.apr - a.apr).slice(0, 3);
  const name = (id) => ({ binance: "Binance", bybit: "Bybit", okx: "OKX", bitget: "Bitget", kucoin: "KuCoin", gate: "Gate", mexc: "MEXC", htx: "HTX", kraken: "Kraken", bingx: "BingX", whitebit: "WhiteBIT" })[id] ?? id;
  title = "Де USDT приносить найбільше"; sub = "гнучкий Earn: забрати можна будь-коли";
  rows = top.map((o) => [name(o.exchange), `${String(o.apr).replace(".", ",")}%`, `$1 000 → +${usd(1000 * o.apr / 100 / 12)}/міс`]);
  text = `💵 Найпростіший спосіб заробити на біржі — USDT у гнучкий Earn. Як депозит: відсотки щодня, забрати можна будь-коли.\n\nНайкращі ставки зараз:\n`
    + top.map((o, i) => `${["1️⃣", "2️⃣", "3️⃣"][i]} ${name(o.exchange)} — ${String(o.apr).replace(".", ",")}% річних ($1 000 → ≈ +${usd(1000 * o.apr / 100 / 12)} за місяць)`).join("\n")
    + `\n\nСтавки змінюються щодня. Порівняння всіх бірж 👉 promoradar.xyz/uk/earn/`;
} else {
  const T = [
    ["Що таке APR", "Скільки відсотків на рік ви отримаєте. 12% APR ≈ 1% на місяць. «600% APR» зазвичай діє кілька днів і на маленьку суму — рахуйте дохід за реальний строк."],
    ["Бонус чи ваучер?", "«До 5 000 USDT новачкам» — це максимум за всі завдання. Ваучер на ф'ючерси вивести не можна — тільки прибуток з нього. Перед участю дивіться, у якому вигляді приходить нагорода."],
    ["Що таке Launchpool", "Ви «заморожуєте» монету на кілька днів, а біржа щодня дає новий токен. Монети повертаються, але їхня ціна може впасти — найменший ризик у пулах з USDT."],
    ["Як не потрапити на скам", "Справжній аірдроп ніколи не просить seed-фразу чи «плату за отримання». Посилання беріть лише з офіційного сайту біржі."],
  ];
  const [h, b] = T[Math.floor(now / 86400_000 / 6) % T.length];
  title = h; sub = "крипта простими словами";
  rows = [];
  text = `📘 ${h} — простими словами.\n\n${b}\n\nБільше пояснень для новачків 👉 promoradar.xyz/uk/learn/`;
}

// image card 1080x1350 (Instagram portrait); system fonts carry Cyrillic on the owner's Windows PC
const W = 1080, H = 1350;
const rowSvg = rows.map(([a, b, c], i) => `
  <g transform="translate(90, ${560 + i * 190})">
    <rect width="900" height="160" rx="28" fill="#141821" stroke="#2a3140"/>
    <text x="40" y="70" font-size="52" font-weight="700" fill="#e8ecf1">${esc(a)}</text>
    <text x="40" y="122" font-size="32" fill="#8b95a5">${esc(c)}</text>
    <text x="860" y="98" font-size="64" font-weight="800" fill="#c8ff3d" text-anchor="end">${esc(b)}</text>
  </g>`).join("");
const wrap = (s, n) => { const w = s.split(" "), l = [""]; for (const x of w) { if ((l[l.length - 1] + " " + x).trim().length > n) l.push(x); else l[l.length - 1] = (l[l.length - 1] + " " + x).trim(); } return l; };
const body = !rows.length ? wrap(text.split("\n\n")[1] ?? "", 34).map((l, i) => `<text x="90" y="${600 + i * 64}" font-size="44" fill="#e8ecf1">${esc(l)}</text>`).join("") : "";
const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" font-family="Segoe UI, Arial, sans-serif">
  <rect width="${W}" height="${H}" fill="#0b0d10"/>
  <circle cx="900" cy="200" r="260" fill="none" stroke="#c8ff3d" stroke-opacity="0.12" stroke-width="3"/>
  <circle cx="900" cy="200" r="160" fill="none" stroke="#c8ff3d" stroke-opacity="0.18" stroke-width="3"/>
  <circle cx="90" cy="130" r="14" fill="#c8ff3d"/>
  <text x="120" y="145" font-size="44" font-weight="700" fill="#e8ecf1">Promo<tspan fill="#c8ff3d">Radar</tspan></text>
  ${wrap(title, 18).map((l, i) => `<text x="90" y="${330 + i * 96}" font-size="86" font-weight="800" fill="#ffffff">${esc(l)}</text>`).join("")}
  <text x="90" y="${rows.length ? 500 : 480}" font-size="40" fill="#c8ff3d">${esc(sub)}</text>
  ${rowSvg}${body}
  <text x="90" y="${H - 80}" font-size="40" font-weight="700" fill="#e8ecf1">promoradar.xyz</text>
  <text x="${W - 90}" y="${H - 80}" font-size="32" fill="#8b95a5" text-anchor="end">${date.split("-").reverse().join(".")}</text>
</svg>`;
const base = path.join(out, `${date}-${fmt}`);
await sharp(Buffer.from(svg)).png().toFile(`${base}.png`);
// owner 28.11: posts must not be copies across networks — one voice per platform
const lines = text.split("\n");
const link = (r) => lines[lines.length - 1].replace(/promoradar\.xyz(\/\S*)?/, (m) => `${m}${m.includes("?") ? "&" : "?"}ref=${r}`);
const threads = [...lines.slice(0, -1), link("threads")].join("\n");                       // conversational, link works
const HOOK = { weekly: "Зберігай 📌 — бонуси, які реально можна забрати цього тижня:", earn: "Тримаєш USDT на біржі й нічого не отримуєш? Ось де за це платять 👇", explain: "Пояснюю за 20 секунд, без складних слів 👇" };
const insta = [HOOK[fmt], "", ...lines.slice(1, -1).filter((l, i, a) => !(l === "" && a[i - 1] === "")),
  "👆 Посилання на всі акції — у профілі @promoradar.ua", "",
  fmt === "earn" ? "#криптовалюта #пасивнийдохід #USDT #біржа #earn" : fmt === "explain" ? "#криптовалюта #крипта #новачкам #біткоїн #навчання" : "#криптовалюта #бонус #біржа #airdrop #крипта"].join("\n");
const x = (rows.length
  ? `${title}:\n${rows.map(([a, b]) => `• ${a} — ${b}`).join("\n")}\n\nБез «до 5 000$» — реальні цифри 👇`
  : `${title}: ${(text.split("\n\n")[1] ?? "").split(/(?<=\.)\s/)[0]}\n\n👇`) + `\n${link("x").replace(/^.*?(promoradar\.xyz\S*).*$/, "$1")}`;
for (const [k, v] of Object.entries({ threads, instagram: insta, x })) fs.writeFileSync(`${base}.${k}.txt`, v + "\n");
console.log(JSON.stringify({ fmt, png: `${base}.png`, threads: threads.length, instagram: insta.length, x: x.length }));
for (const [k, v] of Object.entries({ threads, instagram: insta, x })) console.log(`---- ${k}\n${v}`);
