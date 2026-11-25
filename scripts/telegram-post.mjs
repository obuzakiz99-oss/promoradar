// Post NEW promos / Launchpools / high APRs to a Telegram channel after each build.
// Env: TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID (e.g. @mychannel or -100…), SITE_URL, POST_LANG (uk|en|ru), APR_ALERT (default 20)
// State: data/posted.json (on the `data` branch). The FIRST run only records what exists (no flood).
import fs from "node:fs";
import path from "node:path";

const { TELEGRAM_BOT_TOKEN: TOKEN, TELEGRAM_CHAT_ID: CHAT } = process.env;
if (!TOKEN || !CHAT) { console.log("telegram: no TELEGRAM_BOT_TOKEN / TELEGRAM_CHAT_ID — skipped"); process.exit(0); }
// 24.11: say plainly whether the token works (the owner revoked one) — the token itself is never printed
{
  const me = await fetch(`https://api.telegram.org/bot${TOKEN}/getMe`).then((r) => r.json()).catch((e) => ({ ok: false, description: String(e) }));
  console.log(me.ok ? `telegram: token OK — bot @${me.result.username}` : `telegram: TOKEN INVALID (${me.description ?? me.error_code}) — update the TELEGRAM_BOT_TOKEN secret`);
  if (!me.ok) process.exit(0);
}
const SITE = (process.env.SITE_URL || "").replace(/\/$/, "");
const LANG = process.env.POST_LANG || "uk";
const APR_ALERT = Number(process.env.APR_ALERT || 20);
const MAX_PER_RUN = 6;
const OUT = process.env.OUT_DIR || "out";
const STATE = path.join("data", "posted.json");

const L = {
  uk: { promo: "🆕 Нова акція", lp: "🚀 Новий Launchpool", earn: "🏦 Висока ставка Earn", pool: "Фонд", stake: "Стейк", apr: "APR", ends: "До", more: "Деталі", est: "У середньому на людину", onK: "Дохід на $1 000" },
  en: { promo: "🆕 New promo", lp: "🚀 New Launchpool", earn: "🏦 High Earn rate", pool: "Pool", stake: "Stake", apr: "APR", ends: "Until", more: "Details", est: "Typical per person", onK: "Extra on $1,000" },
  ru: { promo: "🆕 Новая акция", lp: "🚀 Новый Launchpool", earn: "🏦 Высокая ставка Earn", pool: "Фонд", stake: "Стейк", apr: "APR", ends: "До", more: "Подробнее", est: "В среднем на человека", onK: "Доход на $1 000" },
}[LANG];

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
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
state.camps ??= {};
const campOf = new Map();   // post key → campaign keys (recorded in state.camps once sent)
const seen = new Set(state.ids);

const msgs = [];
const feed = read("promos");
const trTitle = (p) => feed.titles?.[LANG]?.[p.id] ?? p.title;   // translated title for the posting language
// audit 25.11 (deep): a card the quality guard (scripts/quality.mjs) flagged is not posted until it is fixed
let flagged = new Set();
try { flagged = new Set(read("quality.json").errors.map((e) => e.id).filter(Boolean)); } catch { /* no report → post as usual */ }
const promos = feed.promos.filter((p) => p.venue.kind !== "airdrop" && !p.evergreen && !flagged.has(p.id));
// 25.11 (owner: "the channel looks raw"): wait for the translated title (English posts went out before the laptop
// translated them), skip posts with nothing concrete to say, and a clearer card: type, money, deadline, entry, hashtags
const CAT = {
  uk: { bonus: ["🎁", "Бонус"], competition: ["🏆", "Змагання"], airdrop: ["🪂", "Аірдроп"], earn: ["🏦", "Earn"], referral: ["👥", "Реферальна"], listing: ["🆕", "Лістинг"], other: ["🔥", "Акція"], farming: ["🌾", "Фармінг"] },
  en: { bonus: ["🎁", "Bonus"], competition: ["🏆", "Competition"], airdrop: ["🪂", "Airdrop"], earn: ["🏦", "Earn"], referral: ["👥", "Referral"], listing: ["🆕", "Listing"], other: ["🔥", "Promo"], farming: ["🌾", "Farming"] },
  ru: { bonus: ["🎁", "Бонус"], competition: ["🏆", "Соревнование"], airdrop: ["🪂", "Аирдроп"], earn: ["🏦", "Earn"], referral: ["👥", "Реферальная"], listing: ["🆕", "Листинг"], other: ["🔥", "Акция"], farming: ["🌾", "Фарминг"] },
}[LANG];
const T = {
  uk: { real: "Реально на людину", max: "Максимум на людину", entry: "Щоб взяти участь", forNew: "Лише для нових користувачів", left: (n) => `ще ${n} дн.`, cta: "Умови й покроково", months: ["січня", "лютого", "березня", "квітня", "травня", "червня", "липня", "серпня", "вересня", "жовтня", "листопада", "грудня"] },
  en: { real: "Realistically per person", max: "Max per person", entry: "To take part", forNew: "New users only", left: (n) => `${n} days left`, cta: "Rules & steps", months: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"] },
  ru: { real: "Реально на человека", max: "Максимум на человека", entry: "Чтобы участвовать", forNew: "Только для новых пользователей", left: (n) => `ещё ${n} дн.`, cta: "Условия и пошагово", months: ["января", "февраля", "марта", "апреля", "мая", "июня", "июля", "августа", "сентября", "октября", "ноября", "декабря"] },
}[LANG];
const human = (ts) => { const d = new Date(ts); return LANG === "en" ? `${T.months[d.getUTCMonth()]} ${d.getUTCDate()}` : `${d.getUTCDate()} ${T.months[d.getUTCMonth()]}`; };
const tag = (s) => "#" + String(s).replace(/\.com$/i, "").replace(/[^\p{L}\p{N}_]/gu, "");
// 25.11: one campaign often comes as 2–3 exchange posts (LBank $150K went out twice) — never post the same campaign again
const campsOf = (p) => {
  const c = [];
  try { const u = new URL(p.url); if (u.host !== "t.me" && !/^\/[a-z-]+\/?$/i.test(u.pathname)) c.push("url:" + p.venue.id + u.host.replace(/^www\./, "") + u.pathname.replace(/\/$/, "")); } catch { /* */ }
  if (p.reward && p.reward.amount >= 1000) c.push("pool:" + p.venue.id + ":" + Math.round(p.reward.amount) + p.reward.unit);
  return c;
};
// campaigns of promos already posted (also those posted before this rule existed)
for (const p of promos) if (seen.has(`promo:${p.id}`)) for (const c of campsOf(p)) state.camps[c] ??= Date.now();
const queued = new Set();
for (const p of promos) {
  const key = `promo:${p.id}`; if (seen.has(key)) continue;
  if (p.publishedAt && Date.now() - p.publishedAt > 3 * 86400_000) continue; // only genuinely new
  // 24.11: no empty teasers, nothing ending within a day; the realistic per-person estimate is the point of the channel
  if (p.meta?.thin || (p.endsAt && p.endsAt - Date.now() < 86400_000)) continue;
  // not translated yet → wait for a later build (the laptop translates every 30 min); after a day post as is
  const tr = feed.titles?.[LANG]?.[p.id];
  if (LANG !== "en" && !tr && /^[\x00-\x7F -⯿️\u{1F000}-\u{1FAFF}]*$/u.test(p.title) && Date.now() - (p.publishedAt ?? 0) < 86400_000) continue;
  const v = p.meta?.value, net = v?.net, apr = v?.mech === "apr", pu = p.meta?.perUser;
  // one label for the estimate everywhere (site + channel), with how sure it is
  const rough = ({ uk: "грубо", en: "rough", ru: "грубо" })[LANG];
  const est = net !== undefined && Math.round(net) >= 1 ? `💰 ${apr ? L.onK : T.real}: <b>≈ $${Math.round(net)}</b>${v.conf === "low" ? ` (${rough})` : ""}` : "";
  const max = !est && pu?.amount ? `💰 ${T.max}: <b>${pu.amount.toLocaleString("en-US")} ${esc(pu.unit)}</b>` : "";
  const pool = p.reward ? `🎯 ${L.pool}:<b>${esc(p.reward.label)}</b>` : "";
  if (!est && !max && !pool) continue;   // nothing concrete — not worth a post (still on the site)
  const [icon, kind] = CAT[p.category] ?? CAT.other;
  const entry = p.meta?.minEntry?.amount ? `✅ ${T.entry}: ${p.meta.minEntry.amount.toLocaleString("en-US")} ${esc(p.meta.minEntry.unit)}` : "";
  const days = p.endsAt ? Math.max(1, Math.ceil((p.endsAt - Date.now()) / 86400_000)) : 0;
  const head = [`${icon} <b>${esc(p.venue.name)}</b> · ${kind}`, `<b>${esc((tr ?? p.title).replace(/\s+/g, " ").trim())}</b>`];
  const info = [est || max, pool, entry, p.meta?.forNew ? `🆕 ${T.forNew}` : "", p.endsAt ? `⏳ ${L.ends} ${human(p.endsAt)} (${T.left(days)})` : ""].filter(Boolean);
  const foot = [SITE ? `👉 <a href="${SITE}/${LANG}/p/${slugOf(p)}/">${T.cta}</a>` : `👉 <a href="${esc(p.url)}">${T.cta}</a>`, `${tag(p.venue.name)} ${tag(kind.toLowerCase())}`];
  const camps = campsOf(p);
  if (camps.some((c) => (state.camps[c] && Date.now() - state.camps[c] < 30 * 86400_000) || queued.has(c))) { seen.add(key); continue; }
  for (const c of camps) queued.add(c);
  campOf.set(key, camps);
  msgs.push([key, [head, info, foot].map((b) => b.join("\n")).join("\n\n")]);
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

// audit 25.11 (deep): a network error mid-run crashed the script before the state was saved → the same posts went out
// again next run. Now: every send is guarded, the state is saved after each post, 429 waits as Telegram asks, and a
// message Telegram rejects 3 times is dropped instead of blocking the queue forever.
state.fail ??= {};
const send = async (text) => {
  for (let i = 0; i < 2; i++) {
    try {
      const r = await fetch(`https://api.telegram.org/bot${TOKEN}/sendMessage`, {
        method: "POST", headers: { "Content-Type": "application/json" }, signal: AbortSignal.timeout(20_000),
        body: JSON.stringify({ chat_id: CHAT, text, parse_mode: "HTML", disable_web_page_preview: true }),
      });
      if (r.ok) return { ok: true };
      const j = await r.json().catch(() => ({}));
      if (r.status === 429 && i === 0) { await new Promise((res) => setTimeout(res, Math.min(60, j.parameters?.retry_after ?? 5) * 1000)); continue; }
      return { ok: false, status: r.status, why: String(j.description ?? "").slice(0, 200) };
    } catch (e) { return { ok: false, status: 0, why: String(e?.message ?? e).slice(0, 200) }; }
  }
  return { ok: false, status: 429, why: "rate limited" };
};
let sent = 0;
for (const [key, text] of msgs.slice(0, MAX_PER_RUN)) {
  const r = await send(text);
  if (r.ok) { sent++; seen.add(key); for (const c of campOf.get(key) ?? []) state.camps[c] = Date.now(); delete state.fail[key]; saveState(); }
  else {
    console.log("telegram error", r.status, r.why);
    if (r.status === 400 || r.status === 403) { state.fail[key] = (state.fail[key] ?? 0) + 1; if (state.fail[key] >= 3) { seen.add(key); delete state.fail[key]; } }
    if (r.status === 0 || r.status === 429) break;   // network / rate limit: try the rest next run
  }
  await new Promise((res) => setTimeout(res, 1500));
}
// 25.11 (owner: grow the channel): weekly digest — Monday from 07:00 UTC, once per ISO week — the 5 best running promos by
// the realistic per-person estimate (only "likely"/"sure" estimates, ≥ $15, not ending within 2 days)
{
  const W = {
    uk: { head: "🏆 <b>Топ-5 акцій тижня</b>", sub: "За реальною сумою на одну людину, а не за «до 10 000 USDT».", all: "Усі акції" },
    en: { head: "🏆 <b>Top 5 promos of the week</b>", sub: "Ranked by what one person realistically gets, not by \"up to 10,000 USDT\".", all: "All promos" },
    ru: { head: "🏆 <b>Топ-5 акций недели</b>", sub: "По реальной сумме на одного человека, а не по «до 10 000 USDT».", all: "Все акции" },
  }[LANG];
  const now = new Date();
  const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
  const week = `${d.getUTCFullYear()}-W${Math.ceil(((d - Date.UTC(d.getUTCFullYear(), 0, 1)) / 86400_000 + 1) / 7)}`;
  if (now.getUTCDay() === 1 && now.getUTCHours() >= 7 && state.weekly !== week) {
    const top = feed.promos.filter((p) => !flagged.has(p.id)).filter((p) => {
      const v = p.meta?.value;
      return v && v.mech !== "apr" && (v.conf === "high" || v.conf === "mid") && v.net >= 15 && !p.meta?.thin && p.venue.kind !== "airdrop"
        && (!p.endsAt || p.endsAt - Date.now() > 2 * 86400_000);
    }).sort((a, b) => b.meta.value.net - a.meta.value.net).slice(0, 5);
    if (top.length >= 3) {
      const rows = top.map((p, i) => `${i + 1}. <b>${esc(p.venue.name)}</b> — ≈ $${Math.round(p.meta.value.net)}\n${esc(trTitle(p))}${SITE ? `\n<a href="${SITE}/${LANG}/p/${slugOf(p)}/">${L.more} →</a>` : ""}`);
      const text = [W.head, W.sub, "", rows.join("\n\n"), SITE ? `\n<a href="${SITE}/${LANG}/">${W.all} →</a>` : ""].filter((x) => x !== undefined).join("\n");
      const r = await send(text);
      if (r.ok) { state.weekly = week; saveState(); console.log(`telegram: weekly top-${top.length} sent (${week})`); }
      else console.log("telegram weekly error", r.status, r.why);
    }
  }
}

saveState(); // unsent items stay unseen and go out on the next run
console.log(`telegram: ${msgs.length} new, ${sent} sent (cap ${MAX_PER_RUN}/run)`);
