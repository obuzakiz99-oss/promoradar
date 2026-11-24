// Hourly health check of the live site (24.11, owner: "автоматична перевірка щогодини, щоб нічого не впало").
// Read-only: requests the public site, its JSON API, the relay branch and GitHub's deploy runs. Nothing is changed.
// Writes <stateDir>/last.json + log.txt; on a NEW problem (or recovery) shows a Windows notification.
// usage: node scripts/health.mjs [stateDir] [--quiet]   (exit code 1 when something is down)
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const BASE = "https://obuzakiz99-oss.github.io/promoradar";
const RAW = "https://raw.githubusercontent.com/obuzakiz99-oss/promoradar";
const DIR = process.argv[2] && !process.argv[2].startsWith("--") ? process.argv[2] : path.join(process.cwd(), "..", "promoradar-health");
const QUIET = process.argv.includes("--quiet");
const GH = process.env.GH || (process.platform === "win32" ? "C:/Program Files/GitHub CLI/gh.exe" : "gh");
const UA = { "User-Agent": "PromoRadar-health/1.0" };
const H = 3600_000;

// sources that normally always have promos — 0 for them means a parser or an endpoint broke
const CORE = ["binance", "bybit", "gate", "kucoin", "biconomy", "defillama", "tg:kucoin_news", "tg:bitget_announcements", "tg:bitrue_official", "tg:LBankNews", "tg:HTXGlobalAnnouncementChannel"];
// known and explained (see memory 24.11): blocked to GitHub's servers / bot protection
const KNOWN_DOWN = new Set(["airdrops"]);

const problems = [], notes = [];
const bad = (s) => problems.push(s);
const t0 = Date.now();

async function get(url, ms = 30_000) {
  const r = await fetch(`${url}${url.includes("?") ? "&" : "?"}hc=${t0}`, { headers: UA, signal: AbortSignal.timeout(ms) });
  return { status: r.status, text: await r.text() };
}
const age = (ms) => (Date.now() - ms) / H;

// 1) pages open and are not empty
const PAGES = ["/uk/", "/en/", "/ru/", "/uk/earn/", "/uk/dex/", "/uk/launchpools/", "/uk/unlocks/", "/uk/calendar/", "/uk/zero-fees/", "/uk/bonuses/", "/uk/drops/", "/uk/learn/", "/sitemap.xml"];
await Promise.all(PAGES.map(async (p) => {
  try { const r = await get(BASE + p); if (r.status !== 200 || r.text.length < 5000) bad(`сторінка ${p}: ${r.status}, ${r.text.length} байт`); }
  catch (e) { bad(`сторінка ${p}: ${String(e.message ?? e).slice(0, 80)}`); }
}));

// 2) data files are fresh (the site rebuilds every ~30 min) and their sources answer
const API = { promos: 3, pools: 3, earn: 3, dex: 6, funding: 3, fixed: 6 };   // max age, hours
let promos = null;
await Promise.all(Object.entries(API).map(async ([f, maxH]) => {
  try {
    const r = await get(`${BASE}/api/${f}.json`);
    const j = JSON.parse(r.text);
    if (f === "promos") promos = j;
    if (!j.fetchedAt || age(j.fetchedAt) > maxH) bad(`дані ${f}.json не оновлювались ${age(j.fetchedAt ?? 0).toFixed(1)} год`);
    const st = j.status && typeof j.status === "object" ? j.status : {};
    for (const [k, s] of Object.entries(st)) if (s && s.ok === false && !KNOWN_DOWN.has(k)) bad(`${f}: джерело ${s.name ?? k} падає — ${String(s.error ?? "").slice(0, 90)}`);
  } catch (e) { bad(`дані ${f}.json: ${String(e.message ?? e).slice(0, 80)}`); }
}));
if (promos) {
  const n = promos.promos?.length ?? 0;
  if (n < 60) bad(`акцій на сайті лише ${n} (зазвичай 120–150)`);
  for (const k of CORE) if (promos.status?.[k] && promos.status[k].count === 0) bad(`джерело ${promos.status[k].name} (${k}) дало 0 акцій`);
  notes.push(`акцій ${n}`);
}
// 3) a few random promo pages (from the sitemap) open
try {
  const sm = await get(`${BASE}/sitemap.xml`);
  const urls = [...sm.text.matchAll(/<loc>([^<]+\/p\/[^<]+)<\/loc>/g)].map((m) => m[1]);
  const pick = urls.sort(() => Math.random() - 0.5).slice(0, 4);
  await Promise.all(pick.map(async (u) => { const r = await get(u).catch(() => ({ status: 0 })); if (r.status !== 200) bad(`сторінка акції не відкривається (${r.status}): ${u.replace(BASE, "")}`); }));
} catch { /* sitemap problem is reported above */ }

// 4) the last deploys succeeded
try {
  const out = execFileSync(GH, ["run", "list", "-R", "obuzakiz99-oss/promoradar", "-w", "pages.yml", "-L", "6", "--json", "status,conclusion,createdAt"], { encoding: "utf8", timeout: 60_000, windowsHide: true });
  const runs = JSON.parse(out).filter((r) => r.status === "completed");
  const fails = runs.slice(0, 2).filter((r) => r.conclusion !== "success" && r.conclusion !== "cancelled");
  if (fails.length === 2) bad(`збірка сайту падає (останні ${fails.length} запуски: ${fails.map((r) => r.conclusion).join(", ")})`);
  if (runs[0] && age(Date.parse(runs[0].createdAt)) > 3) bad(`сайт не перезбирався ${age(Date.parse(runs[0].createdAt)).toFixed(1)} год`);
} catch (e) { notes.push(`gh недоступний: ${String(e.message ?? e).slice(0, 60)}`); }

// 5) the laptop relay (OKX / Bybit / Binance data + exchange pages) is alive
try {
  const r = JSON.parse((await get(`${RAW}/relay/relay.json`)).text);
  if (age(r.updatedAt) > 2) bad(`ретранслятор на ноутбуці не оновлювався ${age(r.updatedAt).toFixed(1)} год`);
} catch (e) { bad(`ретранслятор: ${String(e.message ?? e).slice(0, 80)}`); }

// ---- result, log, notification on change
fs.mkdirSync(DIR, { recursive: true });
const LAST = path.join(DIR, "last.json");
const prev = fs.existsSync(LAST) ? JSON.parse(fs.readFileSync(LAST, "utf8")) : { problems: [] };
const ok = problems.length === 0;
const stamp = new Date().toLocaleString("uk-UA");
const key = (a) => a.map((s) => s.replace(/[\d.,]+/g, "#")).sort().join("|");   // ignore changing numbers
const changed = key(problems) !== key(prev.problems ?? []);
const remind = !ok && Date.now() - (prev.notifiedAt ?? 0) > 6 * H;   // still down: remind every 6 h
let notifiedAt = prev.notifiedAt ?? 0;
fs.appendFileSync(path.join(DIR, "log.txt"), `${stamp}  ${ok ? "OK" : "ПРОБЛЕМИ: " + problems.join("; ")}  (${notes.join(", ")}, ${((Date.now() - t0) / 1000).toFixed(0)} с)\n`);
if (!QUIET && (changed || remind) && (problems.length || (prev.problems ?? []).length)) {
  const title = ok ? "PromoRadar: усе знову працює" : `PromoRadar: ${problems.length} проблем(и)`;
  const body = ok ? "Попередні проблеми зникли." : problems.slice(0, 4).join("\n");
  toast(title, body);
  notifiedAt = Date.now();
}
fs.writeFileSync(LAST, JSON.stringify({ at: Date.now(), ok, problems, notes, notifiedAt }, null, 1));
console.log(ok ? `OK (${notes.join(", ")})` : `ПРОБЛЕМИ:\n- ${problems.join("\n- ")}`);
process.exitCode = ok ? 0 : 1;

function toast(title, body) {
  // on a Linux server there is no desktop: run the "alert" workflow, which fails on purpose → GitHub e-mails the owner
  if (process.platform !== "win32") {
    try { execFileSync(GH, ["workflow", "run", "alert.yml", "-R", "obuzakiz99-oss/promoradar", "--ref", "main", "-f", `title=${title}`, "-f", `body=${body.slice(0, 900)}`], { timeout: 60_000 }); }
    catch (e) { fs.appendFileSync(path.join(DIR, "log.txt"), `   (alert not sent: ${String(e.message ?? e).slice(0, 100)})
`); }
    return;
  }
  const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/'/g, "''");
  const ps = `[Windows.UI.Notifications.ToastNotificationManager, Windows.UI.Notifications, ContentType = WindowsRuntime] > $null
[Windows.Data.Xml.Dom.XmlDocument, Windows.Data.Xml.Dom.XmlDocument, ContentType = WindowsRuntime] > $null
$x = New-Object Windows.Data.Xml.Dom.XmlDocument
$x.LoadXml('<toast><visual><binding template="ToastGeneric"><text>${esc(title)}</text><text>${esc(body)}</text></binding></visual></toast>')
$app = '{1AC14E77-02E7-4E5D-B744-2EB1AE5198B7}\\WindowsPowerShell\\v1.0\\powershell.exe'
[Windows.UI.Notifications.ToastNotificationManager]::CreateToastNotifier($app).Show([Windows.UI.Notifications.ToastNotification]::new($x))`;
  try { execFileSync("powershell.exe", ["-NoProfile", "-NonInteractive", "-Command", ps], { windowsHide: true, timeout: 30_000 }); }
  catch (e) { fs.appendFileSync(path.join(DIR, "log.txt"), `   (сповіщення не показалось: ${String(e.message ?? e).slice(0, 100)})\n`); }
}
