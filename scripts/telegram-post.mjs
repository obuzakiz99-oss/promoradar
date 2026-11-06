// Post NEW promos / Launchpools / high APRs to a Telegram channel after each build.
// Env: TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID (e.g. @mychannel or -100…), SITE_URL, POST_LANG (uk|en|ru), APR_ALERT (default 20)
// State: data/posted.json (on the `data` branch). The FIRST run only records what exists (no flood).
import fs from "node:fs";
import path from "node:path";

const { TELEGRAM_BOT_TOKEN: TOKEN, TELEGRAM_CHAT_ID: CHAT } = process.env;
if (!TOKEN || !CHAT) { console.log("telegram: no TELEGRAM_BOT_TOKEN / TELEGRAM_CHAT_ID — skipped"); process.exit(0); }
const SITE = (process.env.SITE_URL || "").replace(/\/$/, "");
const LANG = process.env.POST_LANG || "uk";
const APR_ALERT = Number(process.env.APR_ALERT || 20);
const MAX_PER_RUN = 6;
const OUT = process.env.OUT_DIR || "out";
const STATE = path.join("data", "posted.json");

const L = {
  uk: { promo: "🆕 Нова акція", lp: "🚀 Новий Launchpool", earn: "🏦 Висока ставка Earn", pool: "Фонд", stake: "Стейк", apr: "APR", ends: "До", more: "Деталі" },
  en: { promo: "🆕 New promo", lp: "🚀 New Launchpool", earn: "🏦 High Earn rate", pool: "Pool", stake: "Stake", apr: "APR", ends: "Until", more: "Details" },
  ru: { promo: "🆕 Новая акция", lp: "🚀 Новый Launchpool", earn: "🏦 Высокая ставка Earn", pool: "Фонд", stake: "Стейк", apr: "APR", ends: "До", more: "Подробнее" },
}[LANG];

const esc = (s) => String(s).replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" })[c]);
const read = (f) => JSON.parse(fs.readFileSync(path.join(OUT, "api", f), "utf8"));
// same slug logic as src/lib/slug.ts
const hash = (s) => { let h = 0x811c9dc5; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193); } return (h >>> 0).toString(36); };
const kebab = (s) => s.normalize("NFKD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 64).replace(/-+$/, "");
const slugOf = (p) => { const text = p.title.toLowerCase().startsWith(p.venue.name.toLowerCase()) ? p.title : `${p.venue.name} ${p.title}`; return `${hash(p.id)}-${kebab(p.venue.kind === "airdrop" ? `${text} airdrop` : text) || "promo"}`; };
const date = (ts) => new Date(ts).toISOString().slice(0, 10);

let state = null;
try { state = JSON.parse(fs.readFileSync(STATE, "utf8")); } catch {}
const firstRun = !state;
state ??= { ids: [] };
const seen = new Set(state.ids);

const msgs = [];
const feed = read("promos");
const trTitle = (p) => feed.titles?.[LANG]?.[p.id] ?? p.title;   // translated title for the posting language
const promos = feed.promos.filter((p) => p.venue.kind !== "airdrop" && !p.evergreen);
for (const p of promos) {
  const key = `promo:${p.id}`; if (seen.has(key)) continue;
  if (p.publishedAt && Date.now() - p.publishedAt > 3 * 86400_000) continue; // only genuinely new
  msgs.push([key, [
    `<b>${L.promo} · ${esc(p.venue.name)}</b>`, esc(trTitle(p)),
    p.reward ? `${L.pool}: <b>${esc(p.reward.label)}</b>` : "", p.endsAt ? `${L.ends}: ${date(p.endsAt)}` : "",
    SITE ? `<a href="${SITE}/${LANG}/p/${slugOf(p)}/">${L.more} →</a>` : `<a href="${esc(p.url)}">${L.more} →</a>`,
  ].filter(Boolean).join("\n")]);
}
for (const p of read("pools").projects.filter((x) => x.status !== "ended")) {
  const key = `lp:${p.id}`; if (seen.has(key)) continue;
  const lines = p.pools.map((x) => `• ${L.stake} ${esc(x.stake)} → ${esc(p.token)}${x.apr ? ` · ${L.apr} ${Math.round(x.apr)}%` : ""}`);
  msgs.push([key, [`<b>${L.lp} · ${esc(p.exchange.toUpperCase())}: ${esc(p.name)}</b>`, ...lines, `${L.ends}: ${date(p.end)}`, SITE ? `<a href="${SITE}/${LANG}/launchpools/">Launchpool Radar →</a>` : ""].filter(Boolean).join("\n")]);
}
for (const o of read("earn").offers) {
  if (o.newUsers || o.apr < APR_ALERT || !["USDT", "USDC", "BTC", "ETH"].includes(o.coin)) continue;
  const key = `earn:${o.exchange}:${o.coin}:${o.type}:${Math.round(o.apr)}`; if (seen.has(key)) continue;
  msgs.push([key, `<b>${L.earn} · ${esc(o.exchange)}</b>\n${esc(o.coin)} — <b>${o.apr}%</b>${o.days ? ` (${o.days}d)` : ""}\n${SITE ? `<a href="${SITE}/${LANG}/earn/">APR Radar →</a>` : ""}`]);
}

const saveState = () => { state.ids = [...seen].slice(-5000); fs.mkdirSync("data", { recursive: true }); fs.writeFileSync(STATE, JSON.stringify(state)); };
if (firstRun) { msgs.forEach(([k]) => seen.add(k)); saveState(); console.log(`telegram: first run — recorded ${seen.size} items, nothing posted`); process.exit(0); }

let sent = 0;
for (const [key, text] of msgs.slice(0, MAX_PER_RUN)) {
  const r = await fetch(`https://api.telegram.org/bot${TOKEN}/sendMessage`, {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: CHAT, text, parse_mode: "HTML", disable_web_page_preview: true }),
  });
  if (r.ok) { sent++; seen.add(key); } else console.log("telegram error", r.status, (await r.text()).slice(0, 200));
  await new Promise((res) => setTimeout(res, 1500));
}
saveState(); // unsent items stay unseen and go out on the next run
console.log(`telegram: ${msgs.length} new, ${sent} sent (cap ${MAX_PER_RUN}/run)`);
