// PromoRadar functional audit — scripted browser checks of every interactive feature.
// Usage:  node func.mjs [section ...]      (no args = all sections; ROUND=r2 node func.mjs  writes rounds/r2/)
//         NOWAIT=1 skips the deploy poll.   Sections: header home homephone select popovers promo my tables yield lists check learn misc sweep
//         round 2 added: i18n tablet edge keyboard promo10 check2 counters content   (SEED=… picks other random promo pages for promo10; default = ROUND)
// Prints one PASS/FAIL/INFO line per check and writes rounds/<ROUND>/func.json (+ downloads/).
import { chromium } from "playwright-core";
import fs from "node:fs";
import pth from "node:path";
import { fileURLToPath } from "node:url";

const BASE = "https://promoradar.xyz";
const ORIGIN = new URL(BASE).origin;
const BP = new URL(BASE).pathname.replace(/\/$/, ""); // "" on promoradar.xyz ("/promoradar" on github.io)
const ROUNDS = pth.resolve(pth.dirname(fileURLToPath(import.meta.url)), "out");
const ROUND = process.env.ROUND || "r1";
const OUT = pth.join(ROUNDS, ROUND);
const DL = pth.join(OUT, "downloads");
fs.mkdirSync(DL, { recursive: true });
const CHROME = (process.env.CHROME || "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome");
const ANDROID_UA = "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Mobile Safari/537.36";
const IOS_UA = "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1";
const PHONE = { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2, userAgent: ANDROID_UA, locale: "uk-UA" };
const DESK = { viewport: { width: 1280, height: 800 }, locale: "uk-UA" };
// r2: tablet portrait (md breakpoint edge: header nav on, phone tab bar off)
const TABLET = { viewport: { width: 768, height: 1024 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2, userAgent: "Mozilla/5.0 (Linux; Android 14; SM-X710) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36", locale: "uk-UA" };

// ---------------------------------------------------------------- results
const R = [];
const PAGES = {}; // "vp path" -> issues
let SEC = "";
function rec(status, name, detail = "", where = {}) {
  const r = { sec: SEC, name, status, detail: String(detail).slice(0, 900), url: where.url ?? "", vp: where.vp ?? "" };
  R.push(r);
  console.log(`${status.padEnd(4)} [${SEC}] ${name}${r.vp ? ` (${r.vp})` : ""}${r.url ? ` ${r.url}` : ""}${r.detail ? ` — ${r.detail}` : ""}`);
  return status === "PASS";
}
const W = (p) => ({ url: p ? rel(p.url()) : "", vp: p?._vp ?? "" });
const check = (p, name, ok, detail = "") => rec(ok ? "PASS" : "FAIL", name, detail, W(p));
const info = (p, name, detail = "") => rec("INFO", name, detail, W(p));
const rel = (u) => { try { const x = new URL(u); return x.origin === ORIGIN ? x.pathname.replace(BP, "") + x.search + x.hash : u; } catch { return u; } };
const pathOnly = (u) => { try { return new URL(u).pathname.replace(BP, ""); } catch { return u; } };

// ---------------------------------------------------------------- data (ground truth from the public feed)
function hash(s) { let h = 0x811c9dc5; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193); } return (h >>> 0).toString(36); }
let FEED, HMAP, NOW = Date.now();
async function loadFeed() {
  if (FEED) return;
  FEED = await (await fetch(`${BASE}/api/promos.json?ts=${Date.now()}`)).json();
  HMAP = new Map(FEED.promos.map((p) => [hash(p.id), p]));
  NOW = Date.now();
}
const promoOf = (href) => { const m = /\/p\/([^/]+)/.exec(href || ""); return m ? HMAP.get(m[1].split("-")[0]) : undefined; };
const OK_FOR = { ua: /^(CEE|CIS.*|Europe|Ukraine|region)$/i, eu: /^(CEE|CIS & CEE|Europe|EEA|region)$/i };
const geoAllowed = (p, c) => { const g = p.meta?.geo; if (!g || c === "any") return true; if (c === "ua" && g.noUA) return false; if (c === "eu" && g.noEU) return false; return !g.only || OK_FOR[c].test(g.only); };
const statusOf = (p, now) => (p.startsAt && p.startsAt > now ? "upcoming" : p.endsAt && p.endsAt - now < 3 * 86400_000 ? "ending" : p.evergreen ? "ongoing" : "live");
const rankOf = (v) => (!v || v.net === undefined ? 5 : v.net * (v.conf === "high" ? 1 : v.conf === "mid" ? 0.6 : 0.3));
const valueOf = (p) => p.reward?.usd ?? (p.meta?.apr !== undefined ? p.meta.apr * 100 : -1);
const entryOf = (p) => (p.meta?.noDeposit ? 0 : p.meta?.minEntry?.amount ?? Infinity);
function todayPins(promos, now) {
  const ok = promos.filter((p) => p.category !== "farming" && !p.meta?.thin && !p.meta?.geo?.only && !p.meta?.geo?.noUA && !(p.startsAt && p.startsAt > now) && !(p.endsAt && p.endsAt < now));
  const val = (p) => p.meta?.perUser?.usd ?? 0; const used = new Set();
  const pick = (xs) => { const p = xs.find((x) => !used.has(x.id)); if (p) used.add(p.id); return p; };
  // r2: since dec2d6b a per-person figure counts only when it is not a ranking prize and is below the pool (TodayTop.tsx)
  // r3: since 7a97a90 a "win $X" figure is a prize, not a per-person amount (any language), and the no-deposit pin skips
  // headlines that ask to trade / deposit / stake / buy / swap (TodayTop.tsx)
  const WIN = /(?<![\p{L}\p{N}_])(win|won|вигра|выигра)/iu;
  const real = (p) => p.category !== "competition" && !WIN.test(p.meta?.perUser?.text ?? "") && (p.reward?.usd === undefined || val(p) < p.reward.usd);
  const best = pick([...ok].filter((p) => val(p) >= 10 && real(p)).sort((a, b) => val(b) - val(a)));
  const free = pick([...ok].filter((p) => p.meta?.noDeposit && !/\b(trade|trading|deposit|stake|buy|swap)\b/i.test(p.titleOrig ?? p.title)).sort((a, b) => val(b) - val(a) || (b.reward?.usd ?? 0) - (a.reward?.usd ?? 0) || b.publishedAt - a.publishedAt));
  const ending = pick([...ok].filter((p) => p.endsAt && p.endsAt - now < 72 * 3600_000).sort((a, b) => (val(b) || (b.reward?.usd ?? 0) / 1000) - (val(a) || (a.reward?.usd ?? 0) / 1000)));
  return [best, free, ending].filter(Boolean).map((p) => p.id);
}
/** index of the first pair that breaks the order (cmp(a,b) > 0 means a must not come before b), or -1 */
const firstBreak = (xs, cmp) => { for (let i = 1; i < xs.length; i++) if (cmp(xs[i - 1], xs[i]) > 0) return i; return -1; };

// ---------------------------------------------------------------- browser helpers
let browser;
async function ctxOf(kind, extra = {}) {
  const c = await browser.newContext({ ...(kind === "phone" ? PHONE : kind === "tablet" ? TABLET : DESK), acceptDownloads: true, ...extra });
  c._vp = kind === "phone" ? "390" : kind === "tablet" ? "768" : "1280";
  return c;
}
function log(p, kind, msg) {
  const key = `${p._vp} ${pathOnly(p.url())}`;
  const e = (PAGES[key] ??= { vp: p._vp, path: pathOnly(p.url()), console: [], pageerror: [], http: [], http3p: [], overflow: null });
  if (!e[kind].includes(msg) && e[kind].length < 15) e[kind].push(msg);
}
async function newPage(c) {
  const p = await c.newPage();
  p._vp = c._vp;
  p.on("console", (m) => { if (m.type() === "error") log(p, "console", `${m.text().slice(0, 200)}${m.location()?.url ? ` @${rel(m.location().url)}` : ""}`); });
  p.on("pageerror", (e) => log(p, "pageerror", e.message.slice(0, 300)));
  p.on("response", (r) => { if (r.status() >= 400) log(p, r.url().startsWith(ORIGIN) ? "http" : "http3p", `${r.status()} ${rel(r.url())}`); });
  p.on("requestfailed", (r) => { const f = r.failure()?.errorText ?? ""; if (r.url().startsWith(ORIGIN) && !/ERR_ABORTED/.test(f)) log(p, "http", `FAILED ${f} ${rel(r.url())}`); });
  return p;
}
async function settle(p, ms = 12000) { try { await p.waitForLoadState("networkidle", { timeout: ms }); } catch { /* long polls */ } }
async function go(p, path, { wait = 250 } = {}) {
  const resp = await p.goto(BASE + path, { waitUntil: "domcontentloaded", timeout: 45000 });
  await settle(p);
  await p.waitForTimeout(wait);
  const key = `${p._vp} ${pathOnly(p.url())}`;
  PAGES[key] ??= { vp: p._vp, path: pathOnly(p.url()), console: [], pageerror: [], http: [], http3p: [], overflow: null };
  if (resp && resp.status() >= 400) log(p, "http", `${resp.status()} ${path} (document)`);
  if (p._vp === "390" || p._vp === "768") { const o = await overflow(p); if (o.sw > Number(p._vp)) PAGES[key].overflow = o; else PAGES[key].overflow ??= { sw: o.sw }; }
  return resp;
}
async function overflow(p) {
  return p.evaluate(() => {
    // on an emulated phone, content wider than the screen widens the *layout* viewport (innerWidth) — compare with the
    // visual viewport (the real 390 px screen) instead
    const Wd = Math.round(window.visualViewport?.width ?? window.innerWidth);
    const sw = Math.max(document.scrollingElement.scrollWidth, window.innerWidth);
    if (sw <= Wd) return { sw };
    const d = (el) => `${el.tagName.toLowerCase()}${el.id ? "#" + el.id : ""}${typeof el.className === "string" && el.className ? "." + el.className.trim().split(/\s+/).slice(0, 4).join(".") : ""}`;
    const bad = [];
    for (const el of document.querySelectorAll("body *")) {
      const r = el.getBoundingClientRect(); if (r.width === 0 || r.right <= Wd + 1) continue;
      const pos = getComputedStyle(el).position;
      if (pos === "fixed" && r.left <= 0 && Math.round(r.right) === window.innerWidth) continue; // full-width fixed bars only follow the layout viewport
      let a = el.parentElement, clipped = false;
      if (pos !== "absolute") { while (a && a !== document.body) { const o = getComputedStyle(a).overflowX; if (o !== "visible") { clipped = true; break; } a = a.parentElement; } }
      else { // an absolute box escapes a scroll container when no positioned ancestor sits inside it
        let cb = el.parentElement; while (cb && cb !== document.body && getComputedStyle(cb).position === "static") { if (getComputedStyle(cb).overflowX !== "visible") break; cb = cb.parentElement; }
        clipped = !!cb && cb !== document.body && getComputedStyle(cb).position !== "static";
      }
      if (!clipped) bad.push(`${d(el)}${pos !== "static" ? `[${pos}]` : ""} right=${Math.round(r.right)} "${(el.textContent || "").slice(0, 30).replace(/\s+/g, " ")}"`);
      if (bad.length > 6) break;
    }
    return { sw, layoutViewport: window.innerWidth, screen: Wd, bad };
  });
}
async function withCtx(kind, fn, extra) { const c = await ctxOf(kind, extra); try { return await fn(c); } finally { await c.close(); } }
async function section(name, fn) {
  SEC = name;
  console.log(`\n=== ${name} ===`);
  try { await fn(); } catch (e) { rec("FAIL", "section crashed", e.stack?.split("\n").slice(0, 3).join(" | ") ?? e); }
}
const txt = (s) => (s ?? "").replace(/\s+/g, " ").trim();
const num = (s) => { const m = /(\d[\d\s ]*)/.exec(s ?? ""); return m ? Number(m[1].replace(/[\s ]/g, "")) : NaN; };

// custom Select (src/components/Select.tsx)
const LB = "[role=listbox]";
async function selOpen(p, trigger) {
  // phones with a widened layout viewport (see /uk/unlocks/) defeat Playwright's hit-test → fall back to a synthetic click
  await trigger.click({ timeout: 6000 }).catch(async () => { p._synthetic = (p._synthetic ?? 0) + 1; await trigger.dispatchEvent("click"); });
  await p.waitForSelector(LB, { timeout: 4000 });
}
const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
async function selOptions(p, trigger) { await selOpen(p, trigger); const o = await p.$$eval(`${LB} [role=option]`, (els) => els.map((e) => e.innerText.trim())); await p.keyboard.press("Escape"); await p.waitForTimeout(80); return o; }
async function selPick(p, trigger, text) {
  await selOpen(p, trigger);
  const opt = p.locator(`${LB} [role=option]`).filter({ hasText: new RegExp(`^\\s*${esc(text)}\\s*$`) }).first();
  if (!(await opt.count())) { await p.keyboard.press("Escape"); throw new Error(`option "${text}" not found`); }
  await opt.click({ timeout: 6000 }).catch(() => opt.dispatchEvent("click")); await p.waitForTimeout(250);
}
/** every option of the open listbox: is the item itself the element at its centre (not covered), and inside the viewport */
async function menuCoverage(p) {
  return p.evaluate(() => {
    const lb = document.querySelector("[role=listbox]"); if (!lb) return { err: "no listbox" };
    const d = (el) => `${el.tagName.toLowerCase()}${typeof el.className === "string" && el.className ? "." + el.className.trim().split(/\s+/).slice(0, 3).join(".") : ""}`;
    const out = [];
    for (const li of lb.querySelectorAll("[role=option]")) {
      li.scrollIntoView({ block: "nearest", behavior: "instant" });
      const r = li.getBoundingClientRect(); const x = r.left + r.width / 2, y = r.top + r.height / 2;
      const inView = r.left >= -1 && r.right <= window.innerWidth + 1 && r.top >= 0 && r.bottom <= window.innerHeight;
      const e = document.elementFromPoint(Math.min(Math.max(x, 1), window.innerWidth - 1), Math.min(Math.max(y, 1), window.innerHeight - 1));
      const ok = !!e && (e === li || li.contains(e));
      if (!ok || !inView) out.push({ t: li.innerText.trim().slice(0, 30), covered: !ok, by: e ? d(e) : null, inView, rect: [Math.round(r.left), Math.round(r.top), Math.round(r.right), Math.round(r.bottom)] });
    }
    return { n: lb.querySelectorAll("[role=option]").length, bad: out };
  });
}
async function checkMenuCoverage(p, trigger, name) {
  await trigger.scrollIntoViewIfNeeded();
  await selOpen(p, trigger);
  const c = await menuCoverage(p);
  check(p, `${name}: open menu items visible & not covered`, !c.err && c.bad.length === 0, c.err ?? (c.bad.length ? JSON.stringify(c.bad.slice(0, 4)) : `${c.n} items ok`));
  await p.keyboard.press("Escape"); await p.waitForTimeout(100);
}

// home feed helpers
const SEARCH = 'input[placeholder^="Пошук: токен"]';
const SORT = 'button[aria-haspopup="listbox"][aria-label="Сортувати"]';
async function feedReady(p) {
  // the full list arrives from /api/promos.json after the first paint
  await p.waitForFunction(() => { const b = [...document.querySelectorAll("button.chip")].find((x) => /^Усі\s/.test(x.innerText.trim())); return b && Number(b.innerText.replace(/\D+/g, "")) > 27; }, null, { timeout: 20000 }).catch(() => {}); // r2: the static HTML already has 27 (3 pins + 24)
  await p.waitForTimeout(300);
}
async function cards(p) {
  return p.$$eval("article.card", (els) => els.map((a) => {
    const h = a.querySelector("h3 a");
    return {
      href: h?.getAttribute("href") ?? "", title: h?.textContent.trim() ?? "",
      venue: a.querySelector(".text-sm.font-bold")?.textContent.trim() ?? "",
      cat: a.querySelector("span.whitespace-nowrap")?.textContent.trim() ?? "",
      pin: a.querySelector(":scope > span.absolute")?.textContent.trim() ?? null,
      val: a.querySelector("div.mb-2")?.textContent.trim() ?? null,
      save: a.querySelector('button[aria-label="Зберегти"], button[aria-label="Прибрати зі збережених"]')?.getAttribute("aria-pressed") ?? null,
      text: a.innerText,
    };
  }));
}
const moreBtn = (p) => p.locator("main button").filter({ hasText: /^(Ще · \d+|Показати ще \d+)/ });
/** remaining cards announced by the "show more" button: "Ще · 254" (old) or "Показати ще 24 з 254" / "Показати ще 7" (new) */
const moreLeft = (t) => { const n = (t.match(/\d+/g) ?? []).map(Number); return n.length ? n[n.length - 1] : NaN; };
async function expandAll(p) {
  for (let i = 0, stuck = 0; i < 40 && stuck < 4; i++) {
    const b = moreBtn(p); if (!(await b.count())) return;
    const n = await p.locator("article.card").count();
    await b.first().click(); await p.waitForTimeout(150);
    if ((await p.locator("article.card").count()) === n) { stuck++; await p.waitForTimeout(500); } // not hydrated yet
  }
}
const chips = (p) => p.locator('[role=group][aria-label="Категорія"] button.chip');
async function chipInfo(p) { return p.$$eval('[role=group][aria-label="Категорія"] button.chip', (els) => els.map((e) => ({ t: e.innerText.replace(/\s+/g, " ").trim(), on: e.getAttribute("aria-pressed") }))); }
const filtersBtn = (p) => p.locator("main button[aria-expanded]").filter({ hasText: /^Фільтри/ }).first();
async function openFilters(p) { const b = filtersBtn(p); if ((await b.getAttribute("aria-expanded")) !== "true") await b.click(); await p.waitForTimeout(150); }
async function closeFilters(p) { const b = filtersBtn(p); if ((await b.getAttribute("aria-expanded")) === "true") await b.click(); await p.waitForTimeout(100); }
const quickBtn = (p, t) => p.locator("main button[aria-pressed]").filter({ hasText: new RegExp(`^${t}$`) }).first();
async function resetFeed(p) { const r = p.locator("main button.chip").filter({ hasText: "Скинути" }); if (await r.count()) { await r.first().click(); await p.waitForTimeout(200); } }
async function allCardsMapped(p) { await expandAll(p); const cs = await cards(p); return cs.map((c) => ({ ...c, p: promoOf(c.href) })); }

// ================================================================ sections
const S = {};

S.header = async () => {
  await withCtx("desk", async (c) => {
    const p = await newPage(c);
    await go(p, "/uk/unlocks/");
    const nav = await p.$$eval("header a", (els) => els.filter((e) => e.getBoundingClientRect().width > 0).map((e) => [e.innerText.trim(), e.getAttribute("href")]));
    const want = [["Акції", `${BP}/uk/#promos`], ["Дохідність", `${BP}/uk/launchpools/`], ["Календар", `${BP}/uk/calendar/`], ["Новачкам", `${BP}/uk/learn/`]];
    for (const [t, h] of want) check(p, `desktop nav "${t}" → ${h.replace(BP, "")}`, nav.some(([a, b]) => a === t && b === h), JSON.stringify(nav.filter(([a]) => a === t)));
    check(p, "desktop nav ★ → /uk/my/", nav.some(([, b]) => b === `${BP}/uk/my/`));
    for (const [t, h] of want) {
      await go(p, "/uk/unlocks/");
      await p.locator("header a", { hasText: new RegExp(`^${t}$`) }).first().click();
      await p.waitForLoadState("domcontentloaded"); await p.waitForTimeout(400);
      check(p, `click nav "${t}" lands on ${h.replace(BP, "")}`, rel(p.url()).startsWith(h.replace(BP, "").replace("#promos", "")), rel(p.url()));
    }
    // language switch keeps the path (deep pages + query)
    for (const [from, l, to] of [["/uk/unlocks/", "EN", "/en/unlocks/"], ["/uk/learn/quiz/", "RU", "/ru/learn/quiz/"], ["/uk/t/USDT/", "EN", "/en/t/USDT/"], ["/en/fixed/", "UA", "/uk/fixed/"]]) {
      await go(p, from);
      await p.locator("header [role=group] a", { hasText: l }).first().click();
      await p.waitForURL((u) => u.pathname.includes(to.split("/")[1] === "uk" ? "/uk/" : `/${to.split("/")[1]}/`), { timeout: 8000 }).catch(() => {});
      await p.waitForTimeout(500);
      check(p, `lang ${l} from ${from} keeps path`, rel(p.url()).startsWith(to), `got ${rel(p.url())}`);
    }
    const promo = FEED.promos.find((x) => x.category === "bonus");
    await go(p, "/uk/");
    const firstHref = await p.locator("article.card h3 a").first().getAttribute("href");
    await go(p, firstHref.replace(BP, ""));
    await p.locator("header [role=group] a", { hasText: "EN" }).first().click();
    await p.waitForTimeout(1200);
    check(p, "lang EN on a promo page keeps the promo", rel(p.url()) === firstHref.replace(BP, "").replace("/uk/", "/en/"), `got ${rel(p.url())}`);
    await go(p, "/uk/?cat=bonus&sort=ending");
    await p.locator("header [role=group] a", { hasText: "EN" }).first().click();
    await p.waitForTimeout(1500);
    const q = new URL(p.url()).search;
    if (q.includes("cat=bonus")) check(p, "lang switch keeps the filter query", true, rel(p.url()));
    else rec("FAIL", "lang switch keeps the filter query (?cat=bonus&sort=ending)", `got ${rel(p.url())} — filters dropped`, W(p));
    void promo;
    await p.close();
  });

  await withCtx("phone", async (c) => {
    const p = await newPage(c);
    await go(p, "/uk/fixed/");
    const deskNav = await p.$$eval("header a", (els) => els.filter((e) => e.getBoundingClientRect().width > 0 && /^(Акції|Дохідність|Календар|Новачкам)$/.test(e.innerText.trim())).length);
    check(p, "phone: desktop nav links hidden in header", deskNav === 0, `${deskNav} visible`);
    const tabs = await p.$$eval('nav.fixed[aria-label="Розділи"] a', (els) => els.map((e) => ({ t: e.innerText.trim().replace(/\s+/g, " "), h: e.getAttribute("href"), cur: e.getAttribute("aria-current"), vis: e.getBoundingClientRect().height > 0 })));
    check(p, "phone: bottom tab bar has 5 visible tabs", tabs.length === 5 && tabs.every((x) => x.vis), JSON.stringify(tabs.map((x) => x.t)));
    check(p, "phone: tab 'Дохідність' is current on /uk/fixed/", tabs.find((x) => x.cur === "page")?.t?.startsWith("Дохідність"), JSON.stringify(tabs.find((x) => x.cur)));
    const wantTabs = { "Акції": "/uk/", "Дохідність": "/uk/launchpools/", "Розлоки": "/uk/unlocks/", "Новачкам": "/uk/learn/", "Мої": "/uk/my/" };   // owner 17.11: unlocks replaced the calendar tab
    for (const [t, h] of Object.entries(wantTabs)) {
      await go(p, "/uk/fixed/");
      await p.locator('nav.fixed[aria-label="Розділи"] a', { hasText: t }).first().tap();
      // wait for the new page itself (reading right after the tap raced the navigation — 22.11)
      await p.waitForURL((u) => !rel(u.toString()).startsWith("/uk/fixed/"), { timeout: 15000 }).catch(() => {});
      await p.waitForLoadState("load").catch(() => {}); await p.waitForTimeout(500);
      const cur = await p.$$eval('nav.fixed[aria-label="Розділи"] a[aria-current="page"]', (els) => els.map((e) => e.innerText.trim()));
      check(p, `phone tab "${t}" → ${h} and becomes current`, rel(p.url()).startsWith(h) && cur.some((x) => x.startsWith(t)), `url ${rel(p.url())} current ${JSON.stringify(cur)}`);
    }
    // bottom bar must not hide the last content: page bottom padding ≥ bar height
    await go(p, "/uk/about/");
    await p.evaluate(() => window.scrollTo({ top: 1e7, behavior: "instant" })); await p.waitForTimeout(300);
    const pad = await p.evaluate(() => { const bar = document.querySelector('nav.fixed[aria-label="Розділи"]').getBoundingClientRect(); const els = [...document.querySelectorAll("footer *")].filter((e) => e.children.length === 0 && e.textContent.trim() && e.getBoundingClientRect().height > 0); const bottom = Math.max(...els.map((e) => e.getBoundingClientRect().bottom)); return { barTop: Math.round(bar.top), lastBottom: els.length ? Math.round(bottom) : null, scrollY: Math.round(scrollY) }; });
    check(p, "phone: last footer line not hidden behind the tab bar", pad.lastBottom !== null && pad.lastBottom <= pad.barTop + 1, JSON.stringify(pad));
    await p.close();
  });

  // install banner: only on touch phones, from the 3rd browsing session, dismissable for good
  const seed = () => { try { if (!localStorage.getItem("pr:visits")) localStorage.setItem("pr:visits", "2"); } catch {} };
  await withCtx("phone", async (c) => {
    await c.addInitScript(seed);
    const p = await newPage(c);
    await go(p, "/uk/", { wait: 1200 });
    const dlg = p.locator('div[role="dialog"]').filter({ hasText: "PromoRadar як додаток" });
    const shown = await dlg.isVisible().catch(() => false);
    check(p, "install banner shown on an iPhone (3rd session)", shown);
    if (shown) {
      const tb = await p.evaluate(() => { const d = [...document.querySelectorAll('div[role="dialog"]')].find((x) => x.innerText.includes("як додаток")).getBoundingClientRect(); const bar = document.querySelector('nav.fixed[aria-label="Розділи"]').getBoundingClientRect(); return { dlgBottom: Math.round(d.bottom), barTop: Math.round(bar.top), left: Math.round(d.left), right: Math.round(d.right) }; });
      check(p, "install banner sits above the tab bar and inside the screen", tb.dlgBottom <= tb.barTop && tb.left >= 0 && tb.right <= 390, JSON.stringify(tb));
      await dlg.getByRole("button", { name: "Не зараз" }).tap();
      await p.waitForTimeout(300);
      check(p, "install banner: «Не зараз» closes it", !(await dlg.isVisible().catch(() => false)));
      const p2 = await newPage(c); // new tab = new session
      await go(p2, "/uk/", { wait: 1200 });
      check(p2, "install banner stays dismissed in a new session", !(await p2.locator('div[role="dialog"]').filter({ hasText: "як додаток" }).isVisible().catch(() => false)));
      await p2.close();
    }
    await p.close();
  }, { userAgent: IOS_UA });
  await withCtx("desk", async (c) => {
    await c.addInitScript(seed);
    const p = await newPage(c);
    await go(p, "/uk/", { wait: 1200 });
    check(p, "install banner NOT shown on desktop", !(await p.locator('div[role="dialog"]').filter({ hasText: "як додаток" }).isVisible().catch(() => false)));
    await p.close();
  }, { userAgent: IOS_UA.replace("iPhone; CPU iPhone OS 17_5 like Mac OS X", "Macintosh; Intel Mac OS X 10_15_7") });
  await withCtx("phone", async (c) => {
    const p = await newPage(c);
    await go(p, "/uk/", { wait: 1200 });
    check(p, "install banner NOT shown on a first visit", !(await p.locator('div[role="dialog"]').filter({ hasText: "як додаток" }).isVisible().catch(() => false)));
    await p.close();
  }, { userAgent: IOS_UA });
};

S.home = async () => {
  await withCtx("desk", async (c) => {
    const p = await newPage(c);
    await go(p, "/uk/");
    await feedReady(p);
    const geoUa = FEED.promos.filter((x) => geoAllowed(x, "ua"));
    let ci = await chipInfo(p);
    check(p, "chip «Усі» count = promos allowed for Ukraine", num(ci[0].t) === geoUa.length, `${ci[0].t} vs feed ${geoUa.length} of ${FEED.promos.length}`);
    check(p, "default sort label is «Найвигідніші»", txt(await p.locator(SORT).innerText()) === "Найвигідніші", await p.locator(SORT).innerText());
    let cs = await cards(p);
    check(p, "first screen shows 9 cards", cs.length === 9, `${cs.length}`);
    const more = moreBtn(p);
    const mt = txt(await more.first().innerText().catch(() => ""));
    check(p, "«show more» button announces total − 9", moreLeft(mt) === geoUa.length - 9, mt);
    await more.first().click(); await p.waitForTimeout(200);
    cs = await cards(p);
    check(p, "«Ще» adds 24 cards", cs.length === 33, `${cs.length}`);
    // pinned top-3
    const pins = todayPins(FEED.promos, FEED.fetchedAt);
    const firstIds = cs.slice(0, 3).map((x) => promoOf(x.href)?.id);
    check(p, "pinned badges on exactly the first 3 cards", cs.slice(0, 3).every((x) => x.pin) && cs.slice(3).every((x) => !x.pin), JSON.stringify(cs.slice(0, 4).map((x) => x.pin)));
    check(p, "pinned cards = today's picks (best / no-deposit / ending)", JSON.stringify(firstIds) === JSON.stringify(pins), `${JSON.stringify(firstIds)} vs ${JSON.stringify(pins)}`);
    const pin0 = FEED.promos.find((x) => x.id === pins[0]);
    if (pin0) check(p, "pin #1 «Найбільше на 1 людину» is not a ranking prize and its per-person figure is below the pool (r1 F4)", pin0.category !== "competition" && (pin0.reward?.usd === undefined || (pin0.meta?.perUser?.usd ?? 0) < pin0.reward.usd), `${pin0.id} ${pin0.category} perUser ${pin0.meta?.perUser?.usd} pool ${pin0.reward?.usd}`);
    if (pin0) info(p, "top pin «Найвигідніше»", `${pin0.id}: ${pin0.title.slice(0, 70)} | perUser $${pin0.meta?.perUser?.usd} | value net $${pin0.meta?.value?.net} conf ${pin0.meta?.value?.conf} | badge "${cs[0].pin}" | value line "${cs[0].val}"`);
    // all cards, duplicates
    let all = await allCardsMapped(p);
    check(p, "all cards after paging = chip count", all.length === geoUa.length, `${all.length} vs ${geoUa.length}`);
    const hrefs = all.map((x) => x.href);
    const dupH = hrefs.filter((h, i) => hrefs.indexOf(h) !== i);
    check(p, "no duplicate cards (same link)", dupH.length === 0, dupH.slice(0, 5).join(", "));
    const keyOf = (x) => `${x.venue}|${x.title.toLowerCase()}`;
    const keys = all.map(keyOf); const dupT = [...new Set(keys.filter((k, i) => keys.indexOf(k) !== i))];
    check(p, "no duplicate cards (same exchange + same title)", dupT.length === 0, dupT.slice(0, 6).join(" ; "));
    const unmapped = all.filter((x) => !x.p);
    check(p, "every card links to a known promo page", unmapped.length === 0, unmapped.slice(0, 3).map((x) => x.href).join(", "));
    // value line "≈ $X"
    const fmt = (x) => (x >= 1000 ? null : `$${x >= 10 ? Math.round(x) : x.toFixed(x >= 1 ? 1 : 2)}`);
    const badVal = [];
    for (const x of all) {
      const v = x.p?.meta?.value; const farm = x.p?.category === "farming" && x.p?.meta?.apr !== undefined;
      if (!x.p || farm) continue;
      if (!v || v.net === undefined || v.gross === undefined) { if (x.val) badVal.push(`${x.p.id}: unexpected "${x.val}"`); continue; }
      if (v.net <= 0) { if (!x.val || !/(з'їдають|Не вигідніше)/.test(x.val)) badVal.push(`${x.p.id}: net ${v.net} shows "${x.val}"`); continue; }
      const f = fmt(v.net);
      if (!x.val || (f && !x.val.includes(f))) badVal.push(`${x.p.id}: net ${v.net} → "${x.val}"`);
      const pu = x.p.meta?.perUser?.usd; if (pu && v.net > pu * 1.001) badVal.push(`${x.p.id}: ≈$${v.net} > max per person $${pu}`);
    }
    check(p, "card «≈ $X» value line matches the expected value", badVal.length === 0, badVal.slice(0, 5).join(" ; ") || `${all.filter((x) => x.val).length} lines checked`);
    // category chips: count = cards it yields, and every card has that category
    await resetFeed(p);
    ci = await chipInfo(p);
    for (let i = 1; i < ci.length; i++) {
      await chips(p).nth(i).click(); await p.waitForTimeout(150);
      const label = ci[i].t.replace(/\s*\d+$/, "");
      const list = await allCardsMapped(p);
      // the 0% fee tab (owner 16.11) gathers zero-fee offers from every category; such "other" cards are labelled "0% комісії"
      const wrong = list.filter((x) => (label === "0% комісії" ? !x.p?.meta?.zeroFee : x.cat !== label && !(x.cat === "0% комісії" && x.p?.category === "other")));
      check(p, `chip «${label}»: count ${num(ci[i].t.match(/\d+$/)?.[0])} = cards and all of that category`, list.length === Number(ci[i].t.match(/\d+$/)?.[0]) && wrong.length === 0, `${list.length} cards, ${wrong.length} wrong`);
    }
    await chips(p).nth(0).click(); await p.waitForTimeout(150);
    // search incl. Ukrainian synonyms
    const searchSet = async (q) => { await p.fill(SEARCH, q); await p.waitForTimeout(250); const l = await allCardsMapped(p); return l.map((x) => x.href).sort(); };
    const sA = await searchSet("аірдроп"), sB = await searchSet("айрдроп"), sC = await searchSet("airdrop"), sD = await searchSet("Аирдроп");
    check(p, "search «аірдроп» finds airdrops", sA.length > 0, `${sA.length} results`);
    check(p, "search «аірдроп» = «айрдроп» = «airdrop» = «Аирдроп»", JSON.stringify(sA) === JSON.stringify(sB) && JSON.stringify(sB) === JSON.stringify(sC) && JSON.stringify(sC) === JSON.stringify(sD), `${sA.length}/${sB.length}/${sC.length}/${sD.length}`);
    for (const q of ["розіграш", "бонус", "стейкінг", "реферал", "новачків", "змагання", "лістинг"]) {
      const s = await searchSet(q);
      check(p, `search «${q}» returns results`, s.length > 0, `${s.length}`);
    }
    const sBin = await (async () => { await p.fill(SEARCH, "bybit"); await p.waitForTimeout(250); return allCardsMapped(p); })();
    check(p, "search «bybit»: results all mention Bybit", sBin.length > 0 && sBin.every((x) => /bybit/i.test(`${x.venue} ${x.p?.title} ${x.p?.titleOrig ?? ""}`)), `${sBin.length} results, ${sBin.filter((x) => !/bybit/i.test(`${x.venue} ${x.p?.title}`)).length} unrelated`);
    await p.fill(SEARCH, "zzqxjw");
    await p.waitForTimeout(250);
    const empty = await p.locator("main").innerText();
    check(p, "search with no match shows the empty state", (await p.locator("article.card").count()) === 0 && empty.includes("Нічого не знайдено"));
    const clear = p.locator('label button[aria-label="Скинути"]');
    check(p, "search ✕ button shown while there is a query", await clear.isVisible());
    await clear.click(); await p.waitForTimeout(250);
    check(p, "search ✕ clears the query and restores the list", (await p.inputValue(SEARCH)) === "" && (await p.locator("article.card").count()) === 9 && !(await clear.isVisible().catch(() => false)));
    // sort Select
    const opts = await selOptions(p, p.locator(SORT));
    check(p, "sort options", JSON.stringify(opts) === JSON.stringify(["Найвигідніші", "Нові", "Скоро завершуються", "Найбільша винагорода", "Більше на 1 людину", "Найменший поріг"]), JSON.stringify(opts));
    const sortCases = [
      ["Нові", "newest", (a, b) => b.publishedAt - a.publishedAt < 0 ? 0 : (b.publishedAt > a.publishedAt ? 1 : 0)],
      ["Скоро завершуються", "ending", (a, b) => ((a.endsAt ?? Infinity) > (b.endsAt ?? Infinity) ? 1 : 0)],
      ["Найбільша винагорода", "biggest", (a, b) => (valueOf(b) > valueOf(a) ? 1 : 0)],
      ["Більше на 1 людину", "perUser", (a, b) => ((b.meta?.perUser?.usd ?? -1) > (a.meta?.perUser?.usd ?? -1) ? 1 : 0)],
      ["Найменший поріг", "minEntry", (a, b) => (entryOf(a) > entryOf(b) ? 1 : 0)],
      ["Найвигідніші", "best", (a, b) => (rankOf(b.meta?.value) > rankOf(a.meta?.value) + 1e-9 ? 1 : 0)],
    ];
    for (const [label, key, cmp] of sortCases) {
      await selPick(p, p.locator(SORT), label);
      const l = (await allCardsMapped(p)).filter((x) => x.p);
      const ps = l.map((x) => x.p);
      const body = key === "best" ? ps.slice(3) : ps; // default view leads with the 3 pins
      const full = body.filter((x) => !x.meta?.thin), thin = body.filter((x) => x.meta?.thin);
      const thinAfter = body.findIndex((x) => x.meta?.thin) === -1 || body.slice(body.findIndex((x) => x.meta?.thin)).every((x) => x.meta?.thin);
      const br = firstBreak(full, cmp);
      check(p, `sort «${label}» orders the list`, br === -1 && thinAfter, br === -1 ? `${full.length} full + ${thin.length} teaser cards, teasers last: ${thinAfter}` : `break at #${br}: ${full[br - 1].id} then ${full[br].id}`);
      const u = new URL(p.url()).searchParams.get("sort");
      check(p, `sort «${label}» synced to URL`, key === "best" ? u === null : u === key, `sort=${u}`);
      if (key === "ending") { const top = ps.slice(0, 3).map((x) => `${x.id} ${x.endsAt ? Math.round((x.endsAt - Date.now()) / 3600e3) + "h" : "∞"}`); info(p, "«Скоро завершуються» first cards", top.join(" ; ")); const past = ps.filter((x) => x.endsAt && x.endsAt < Date.now()); check(p, "no already-ended promos in the feed", past.length === 0, past.slice(0, 3).map((x) => x.id).join(", ")); }
      if (key === "minEntry") { const first = ps.slice(0, 8).map(entryOf); check(p, "«Найменший поріг» starts with no-deposit promos (entry 0)", first[0] === 0, JSON.stringify(first)); }
      if (key === "biggest") { info(p, "«Найбільша винагорода» first cards", ps.slice(0, 4).map((x) => `${x.reward?.label ?? x.meta?.apr + "% APR"} ${x.category}`).join(" ; ")); }
    }
    // pins only in the untouched list
    await selPick(p, p.locator(SORT), "Нові");
    check(p, "pinned badges hidden when another sort is chosen", (await cards(p)).slice(0, 3).filter((x) => x.pin).length <= 1, JSON.stringify((await cards(p)).slice(0, 3).map((x) => x.pin)));
    await resetFeed(p);
    // Filters popover
    await openFilters(p);
    check(p, "Filters button opens the panel (aria-expanded)", (await filtersBtn(p).getAttribute("aria-expanded")) === "true");
    const kinds = await p.$$eval('[role=group][aria-label="Тип"] button', (els) => els.map((e) => e.innerText.replace(/\s+/g, " ").trim()));
    info(p, "type tabs", JSON.stringify(kinds));
    const kindMap = { "Біржі": "cex", "DEX": "dex", "DeFi": "defi", "Airdrop-и": "airdrop" };
    for (const k of kinds) {
      const label = k.replace(/\s*\d+$/, ""); const n = Number(k.match(/\d+$/)?.[0]);
      if (label === "Усе") { check(p, "type tab «Усе» count = all", n === geoUa.length, k); continue; }
      await p.locator('[role=group][aria-label="Тип"] button').filter({ hasText: label }).first().click(); await p.waitForTimeout(150);
      const l = await allCardsMapped(p);
      const want = kindMap[label];
      check(p, `type tab «${label}»: ${n} = cards, all ${want}`, l.length === n && l.every((x) => x.p?.venue.kind === want), `${l.length} cards, wrong ${l.filter((x) => x.p?.venue.kind !== want).length}`);
    }
    await p.locator('[role=group][aria-label="Тип"] button').first().click(); await p.waitForTimeout(150);
    // status Select
    const stTrig = p.locator('button[aria-haspopup="listbox"][aria-label="Будь-який статус"]');
    const stOpts = await selOptions(p, stTrig);
    info(p, "status options", JSON.stringify(stOpts));
    const stKey = { "Триває": "live", "Скоро старт": "upcoming", "Закінчується": "ending" };
    const now = Date.now();
    for (const o of stOpts.slice(1)) {
      await selPick(p, stTrig, o);
      const l = await allCardsMapped(p);
      // r2: «Триває» = live + ongoing (evergreen) since dec2d6b — the count must equal the feed exactly
      const okSt = (x) => statusOf(x, now) === stKey[o] || (stKey[o] === "live" && statusOf(x, now) === "ongoing");
      const want = geoUa.filter(okSt).length;
      if (want === 0 && l.length === 0) info(p, `status «${o}»: no such promos right now`, "0 in the feed");
      else check(p, `status «${o}»: every card has that status and count = feed`, l.length > 0 && l.length === want && l.every((x) => x.p && okSt(x.p)), `${l.length} cards (feed: ${want})`);
    }
    await selPick(p, stTrig, "Будь-який статус");
    // every promo must be reachable under some status option (r1 F5: 25 evergreen promos vanished)
    const reach = (x, o) => statusOf(x, now) === stKey[o] || (stKey[o] === "live" && statusOf(x, now) === "ongoing");
    const orphans = geoUa.filter((x) => !stOpts.slice(1).some((o) => reach(x, o)));
    check(p, "status options cover every promo (no promo vanishes under all statuses)", orphans.length === 0, `${orphans.length} promos match no status option; e.g. ${orphans.slice(0, 3).map((x) => x.id).join(", ")}`);
    // country Select
    const coTrig = p.locator('button[aria-haspopup="listbox"][aria-label="Країна"]');
    check(p, "country default for /uk/ = «Україна»", txt(await coTrig.innerText()) === "Україна", await coTrig.innerText());
    for (const [o, c2] of [["Будь-яка", "any"], ["ЄС", "eu"], ["Україна", "ua"]]) {
      await selPick(p, coTrig, o);
      ci = await chipInfo(p);
      const want = FEED.promos.filter((x) => geoAllowed(x, c2)).length;
      check(p, `country «${o}»: «Усі» = ${want}`, num(ci[0].t) === want, ci[0].t);
    }
    // quick filters
    const quicks = [
      ["Без вкладень", (x) => !!x.meta?.noDeposit],
      ["Поріг до $100", (x) => !!x.meta?.noDeposit || (x.meta?.minEntry !== undefined && x.meta.minEntry.amount < 100)],
      ["Для нових", (x) => !!x.meta?.forNew],
      ["Тільки живі гроші", (x) => x.meta?.payout?.form === "cash" || x.meta?.payout?.form === "mixed"],
    ];
    for (const [label, pred] of quicks) {
      await quickBtn(p, label.replace("$", "\\$")).click(); await p.waitForTimeout(200);
      const l = await allCardsMapped(p);
      const want = geoUa.filter(pred).length;
      const wrong = l.filter((x) => !x.p || !pred(x.p));
      check(p, `quick «${label}»: ${want} cards, all match`, l.length === want && wrong.length === 0, `${l.length} shown, ${wrong.length} wrong${wrong[0] ? ` e.g. ${wrong[0].p?.id} minEntry=${JSON.stringify(wrong[0].p?.meta?.minEntry)}` : ""}`);
      if (label === "Поріг до $100") { const at100 = l.filter((x) => x.p?.meta?.minEntry?.amount >= 100 && !x.p?.meta?.noDeposit); check(p, "«Поріг до $100» excludes entry = $100 (strictly below)", at100.length === 0, at100.map((x) => x.p.id).join(", ")); }
      const badge = txt(await filtersBtn(p).innerText());
      check(p, `Filters badge counts the quick filter («${label}»)`, /Фільтри\s*1/.test(badge), badge);
      await quickBtn(p, label.replace("$", "\\$")).click(); await p.waitForTimeout(150);
    }
    // venues menu ("Майданчики")
    const vSum = p.locator("details[data-pop] > summary").filter({ hasText: "Майданчики" }).first();
    if (await vSum.count()) {
      await vSum.click(); await p.waitForTimeout(150);
      const vb = p.locator('details[open] [role=group][aria-label="Майданчики"] button');
      const vn = await vb.count();
      check(p, "venues menu opens with venue buttons", vn > 3, `${vn}`);
      const v0 = txt(await vb.nth(0).innerText()), v1 = txt(await vb.nth(1).innerText());
      await vb.nth(0).click(); await p.waitForTimeout(150);
      const n0 = Number(v0.match(/\d+$/)?.[0]); const name0 = v0.replace(/^\S{1,3}\s+/, "").replace(/\s*\d+$/, "");
      let l = await allCardsMapped(p);
      check(p, `venue «${name0}»: ${n0} cards, all from it`, l.length === n0 && l.every((x) => x.venue === name0), `${l.length} cards; venues ${[...new Set(l.map((x) => x.venue))].join(",")}`);
      await vSum.click().catch(() => {}); await p.waitForTimeout(100);
      if (!(await p.locator("details[data-pop][open]").count())) await vSum.click();
      await vb.nth(1).click(); await p.waitForTimeout(150);
      const n1 = Number(v1.match(/\d+$/)?.[0]);
      l = await allCardsMapped(p);
      check(p, "two venues = union of both", l.length === n0 + n1, `${l.length} vs ${n0}+${n1}`);
      check(p, "venue selection synced to URL", (new URL(p.url()).searchParams.get("venue") ?? "").split(",").length === 2, rel(p.url()));
      await p.locator("h1").first().click(); await p.waitForTimeout(150);
      check(p, "venues menu closes on outside click", (await p.locator("details[data-pop][open]").count()) === 0);
    } else info(p, "venues menu", "no «Майданчики» menu in the filters panel");
    // reset
    await p.fill(SEARCH, "usdt"); await chips(p).nth(2).click(); await selPick(p, p.locator(SORT), "Нові");
    const resetChip = p.locator("main button.chip").filter({ hasText: "Скинути" });
    check(p, "reset chip appears when something is filtered", await resetChip.isVisible());
    await resetChip.click(); await p.waitForTimeout(250);
    const after = { q: await p.inputValue(SEARCH), sort: txt(await p.locator(SORT).innerText()), url: new URL(p.url()).search, n: num((await chipInfo(p))[0].t), cards: await p.locator("article.card").count() };
    check(p, "reset clears search, category, venues, sort and URL", after.q === "" && after.sort === "Найвигідніші" && after.url === "" && after.cards === 9, JSON.stringify(after));
    await p.close();
  });

  // URL sync + restore on reload, link with filters, save / hide persistence, Saved / Hidden tabs
  await withCtx("desk", async (c) => {
    const p = await newPage(c);
    await go(p, "/uk/"); await feedReady(p);
    await p.fill(SEARCH, "usdt"); await p.waitForTimeout(150);
    await chips(p).filter({ hasText: "Earn / Стейкінг" }).first().click();
    await selPick(p, p.locator(SORT), "Скоро завершуються");
    await openFilters(p);
    // the active category chip must stay visible even when another filter takes its count to 0
    await quickBtn(p, "Для нових").click(); await p.waitForTimeout(200);
    const ci0 = await chipInfo(p); const n0 = await p.locator("article.card").count();
    check(p, "active category chip stays visible when its count drops to 0", n0 > 0 || ci0.some((x) => x.on === "true"), `${n0} cards; chips ${JSON.stringify(ci0)}`);
    await quickBtn(p, "Для нових").click(); await p.waitForTimeout(150);
    let qk = null;
    for (const [lbl, key] of [["Поріг до \\$100", "low"], ["Тільки живі гроші", "cash"], ["Для нових", "forNew"]]) { await quickBtn(p, lbl).click(); await p.waitForTimeout(150); if ((await p.locator("article.card").count()) > 0) { qk = key; break; } await quickBtn(p, lbl).click(); await p.waitForTimeout(100); }
    const u = new URL(p.url()).searchParams;
    check(p, "filters synced to URL", u.get("cat") === "earn" && u.get("sort") === "ending" && u.get("q") === "usdt" && (qk === null || u.get("quick") === qk), rel(p.url()));
    const before = (await allCardsMapped(p)).map((x) => x.href);
    await p.reload({ waitUntil: "domcontentloaded" }); await settle(p); await feedReady(p);
    const st = { q: await p.inputValue(SEARCH), sort: txt(await p.locator(SORT).innerText()), chip: (await chipInfo(p)).find((x) => x.on === "true")?.t, badge: txt(await filtersBtn(p).innerText()) };
    const afterH = (await allCardsMapped(p)).map((x) => x.href);
    check(p, "filters restored on reload", st.q === "usdt" && st.sort === "Скоро завершуються" && /^Earn/.test(st.chip ?? "") && (qk === null || /1/.test(st.badge)) && before.length > 0 && JSON.stringify(before) === JSON.stringify(afterH), `${JSON.stringify(st)} cards ${before.length}→${afterH.length}`);
    await go(p, "/uk/?cat=bonus&quick=noDeposit"); await feedReady(p);
    const st2 = { chip: (await chipInfo(p)).find((x) => x.on === "true")?.t, q: await p.inputValue(SEARCH), sort: txt(await p.locator(SORT).innerText()) };
    check(p, "a link with filters wins over the remembered ones", /^Бонус/.test(st2.chip ?? "") && st2.q === "" && st2.sort === "Найвигідніші", JSON.stringify(st2));
    await go(p, "/uk/?cat=nonsense&sort=zzz&kind=evil"); await feedReady(p);
    check(p, "invalid URL filter values are ignored", /^Усі/.test((await chipInfo(p)).find((x) => x.on === "true")?.t ?? "") && (await p.locator("article.card").count()) > 0);
    await resetFeed(p);
    // save + hide
    await go(p, "/uk/"); await feedReady(p);
    const c0 = (await cards(p))[3], c1 = (await cards(p))[4];
    await p.locator("article.card").nth(3).locator('button[aria-label="Зберегти"]').click(); await p.waitForTimeout(150);
    check(p, "☆ save toggles aria-pressed on the card", (await p.locator("article.card").nth(3).locator("button[aria-pressed]").last().getAttribute("aria-pressed")) === "true");
    const star = txt(await p.locator(`header a[href="${BP}/uk/my/"]`).innerText());
    check(p, "header ★ shows saved count 1", /1/.test(star), star);
    await p.locator("article.card").nth(4).locator('button[aria-label="Приховати"]').click(); await p.waitForTimeout(250);
    const hrefsNow = (await cards(p)).map((x) => x.href);
    check(p, "hide removes the card from the feed", !hrefsNow.includes(c1.href), c1.href);
    const hidLine = await p.locator("main p").filter({ hasText: "Ви приховали: 1" }).count();
    check(p, "«Ви приховали: 1 · показати · повернути всі» line appears", hidLine === 1);
    await openFilters(p);
    const kt = await p.$$eval('[role=group][aria-label="Тип"] button', (els) => els.map((e) => e.innerText.replace(/\s+/g, " ").trim()));
    check(p, "«★ Вибрані 1» and «Приховані 1» type tabs appear", kt.some((x) => /Вибрані\s*1$/.test(x)) && kt.some((x) => /Приховані\s*1$/.test(x)), JSON.stringify(kt));
    await p.locator('[role=group][aria-label="Тип"] button').filter({ hasText: "Вибрані" }).click(); await p.waitForTimeout(150);
    let l = await cards(p);
    check(p, "«Вибрані» tab lists the saved card", l.length === 1 && l[0].href === c0.href, `${l.length}`);
    await p.locator('[role=group][aria-label="Тип"] button').filter({ hasText: "Приховані" }).click(); await p.waitForTimeout(150);
    l = await cards(p);
    check(p, "«Приховані» tab lists the hidden card", l.length === 1 && l[0].href === c1.href, `${l.length}`);
    await p.locator('[role=group][aria-label="Тип"] button').first().click();
    await resetFeed(p);
    await p.reload({ waitUntil: "domcontentloaded" }); await settle(p); await feedReady(p);
    await expandAll(p);
    l = await cards(p);
    check(p, "saved card still ★ after reload", l.find((x) => x.href === c0.href)?.save === "true");
    check(p, "hidden card still hidden after reload", !l.some((x) => x.href === c1.href));
    await p.locator("main p button").filter({ hasText: /^показати$/ }).click(); await p.waitForTimeout(200);
    await expandAll(p);
    check(p, "«показати» brings hidden cards back", (await cards(p)).some((x) => x.href === c1.href));
    await p.locator("main p button").filter({ hasText: /^повернути всі$/ }).click(); await p.waitForTimeout(200);
    check(p, "«повернути всі» clears the hidden list", (await p.locator("main p").filter({ hasText: "Ви приховали" }).count()) === 0 && (await p.evaluate(() => localStorage.getItem("pr:hidden"))) === null);
    await p.close();
  });
};

S.homephone = async () => {
  await withCtx("phone", async (c) => {
    const p = await newPage(c);
    await go(p, "/uk/"); await feedReady(p);
    await checkMenuCoverage(p, p.locator(SORT), "phone sort Select");
    await openFilters(p);
    await checkMenuCoverage(p, p.locator('button[aria-haspopup="listbox"][aria-label="Будь-який статус"]'), "phone status Select");
    await checkMenuCoverage(p, p.locator('button[aria-haspopup="listbox"][aria-label="Країна"]'), "phone country Select");
    const o = await overflow(p);
    check(p, "phone: no horizontal overflow with the filters panel open", o.sw <= 390, JSON.stringify(o));
    const vSum = p.locator("details[data-pop] > summary").filter({ hasText: "Майданчики" }).first();
    if (await vSum.count()) {
      await vSum.tap(); await p.waitForTimeout(200);
      const r = await p.evaluate(() => { const g = document.querySelector('details[open] [role=group]'); const b = g.getBoundingClientRect(); const bs = [...g.querySelectorAll("button")]; const bad = []; for (const x of bs) { x.scrollIntoView({ block: "center", behavior: "instant" }); const q = x.getBoundingClientRect(); const e = document.elementFromPoint(q.left + q.width / 2, q.top + q.height / 2); if (!(e && x.contains(e))) bad.push(`${x.innerText.trim().slice(0, 20)} by ${e ? e.tagName + "." + String(e.className).slice(0, 50) : null}`); } return { left: Math.round(b.left), right: Math.round(b.right), bad, n: bs.length }; });
      check(p, "phone venues menu inside the screen and not covered", r.left >= 0 && r.right <= 390 && r.bad.length === 0, JSON.stringify(r));
      await p.tap("h1"); await p.waitForTimeout(150);
      check(p, "phone venues menu closes on outside tap", (await p.locator("details[data-pop][open]").count()) === 0);
    }
    // card buttons are tappable (not covered by the card link overlay)
    const hit = await p.evaluate(() => { const a = document.querySelector("article.card"); const out = []; for (const b of a.querySelectorAll("button")) { const r = b.getBoundingClientRect(); if (!r.width) continue; b.scrollIntoView({ block: "center", behavior: "instant" }); const q = b.getBoundingClientRect(); const e = document.elementFromPoint(q.left + q.width / 2, q.top + q.height / 2); out.push({ b: b.getAttribute("aria-label") || b.innerText.trim().slice(0, 20), ok: !!e && b.contains(e), h: Math.round(q.height), by: e ? e.tagName + "." + String(e.className).slice(0, 40) : null }); } return out; });
    check(p, "phone: card buttons (hide/save/combo) are hit-testable", hit.every((x) => x.ok), JSON.stringify(hit));
    await p.close();
  });
};

S.select = async () => {
  await withCtx("desk", async (c) => {
    const p = await newPage(c);
    await go(p, "/uk/"); await feedReady(p);
    const t = p.locator(SORT);
    await t.focus();
    await p.keyboard.press("ArrowDown"); await p.waitForTimeout(120);
    check(p, "keyboard: ArrowDown on the trigger opens the menu", await p.locator(LB).isVisible().catch(() => false));
    const ad0 = await p.locator(LB).getAttribute("aria-activedescendant");
    const focusIn = await p.evaluate(() => document.activeElement?.getAttribute("role"));
    check(p, "keyboard: focus moves into the listbox", focusIn === "listbox", focusIn);
    await p.keyboard.press("ArrowDown"); await p.keyboard.press("ArrowDown"); await p.waitForTimeout(80);
    const ad2 = await p.locator(LB).getAttribute("aria-activedescendant");
    check(p, "keyboard: ArrowDown moves the active option", ad0 !== ad2 && /-2$/.test(ad2 ?? ""), `${ad0} → ${ad2}`);
    await p.keyboard.press("ArrowUp"); await p.waitForTimeout(60);
    check(p, "keyboard: ArrowUp moves back", /-1$/.test((await p.locator(LB).getAttribute("aria-activedescendant")) ?? ""));
    await p.keyboard.press("End"); await p.waitForTimeout(60);
    check(p, "keyboard: End jumps to the last option", /-5$/.test((await p.locator(LB).getAttribute("aria-activedescendant")) ?? ""));
    await p.keyboard.press("Home"); await p.keyboard.press("ArrowDown"); await p.keyboard.press("Enter"); await p.waitForTimeout(200);
    check(p, "keyboard: Enter picks the option and closes", !(await p.locator(LB).isVisible().catch(() => false)) && txt(await t.innerText()) === "Нові", await t.innerText());
    check(p, "keyboard: focus returns to the trigger after Enter", await t.evaluate((e) => e === document.activeElement));
    await p.keyboard.press("ArrowDown"); await p.waitForTimeout(100); await p.keyboard.press("ArrowDown"); await p.keyboard.press("Escape"); await p.waitForTimeout(120);
    check(p, "keyboard: Esc closes without changing the value", !(await p.locator(LB).isVisible().catch(() => false)) && txt(await t.innerText()) === "Нові");
    check(p, "keyboard: focus returns to the trigger after Esc", await t.evaluate((e) => e === document.activeElement));
    await p.keyboard.press("ArrowDown"); await p.waitForTimeout(100); await p.keyboard.press("Tab"); await p.waitForTimeout(120);
    const afterTab = await p.evaluate(() => ({ role: document.activeElement?.getAttribute("role"), tag: document.activeElement?.tagName, txt: document.activeElement?.innerText?.slice(0, 20) }));
    check(p, "keyboard: Tab closes the menu", !(await p.locator(LB).isVisible().catch(() => false)), JSON.stringify(afterTab));
    check(p, "keyboard: Tab from the open menu moves focus forward (not to <body>)", afterTab.tag !== "BODY", JSON.stringify(afterTab));
    await t.focus(); await p.keyboard.press("ArrowDown"); await p.waitForTimeout(80);
    // Playwright types Cyrillic as insertText (no keydown), so send real keydown events like a Ukrainian layout does
    await p.evaluate(() => { const lb = document.querySelector("[role=listbox]"); for (const k of ["н", "а", "й", "м"]) lb.dispatchEvent(new KeyboardEvent("keydown", { key: k, bubbles: true })); }); await p.waitForTimeout(80);
    check(p, "keyboard: type-to-jump «найм» moves to «Найменший поріг»", /-5$/.test((await p.locator(LB).getAttribute("aria-activedescendant")) ?? ""), await p.locator(LB).getAttribute("aria-activedescendant"));
    await p.keyboard.press("Escape");
    await t.click(); await p.waitForTimeout(100);
    check(p, "mouse: click opens the menu", await p.locator(LB).isVisible());
    await p.locator("h1").first().click(); await p.waitForTimeout(150);
    check(p, "mouse: outside click closes the menu", !(await p.locator(LB).isVisible().catch(() => false)));
    await t.click(); await p.waitForTimeout(100); await t.click(); await p.waitForTimeout(100);
    check(p, "mouse: second click on the trigger closes the menu", !(await p.locator(LB).isVisible().catch(() => false)));
    await t.click(); await p.locator(`${LB} [role=option]`).filter({ hasText: "Найменший поріг" }).hover(); await p.waitForTimeout(60);
    check(p, "mouse: hover highlights the option under the pointer", /-5$/.test((await p.locator(LB).getAttribute("aria-activedescendant")) ?? ""));
    await p.locator(`${LB} [role=option]`).filter({ hasText: "Найменший поріг" }).click(); await p.waitForTimeout(150);
    check(p, "mouse: click picks the option", txt(await t.innerText()) === "Найменший поріг");
    const sel = await p.$$eval(`${SORT}`, () => 1);
    void sel;
    await t.click();
    const aria = await p.$$eval(`${LB} [role=option]`, (els) => els.map((e) => e.getAttribute("aria-selected")));
    check(p, "aria-selected marks only the current option", aria.filter((x) => x === "true").length === 1 && aria[5] === "true", JSON.stringify(aria));
    await p.keyboard.press("Escape");
    await p.close();
  });
};

S.popovers = async () => {
  for (const kind of ["desk", "phone"]) {
    await withCtx(kind, async (c) => {
      const p = await newPage(c);
      // a live pool (ended pools have fewer hints; the first sitemap entry can be an ended one — 21.11)
      // the second hint ("real APR") shows only when the exchange gives the data for it (Gate yes, Bitget no — 22.11):
      // take the first live pool page with at least two
      const hs = p.locator("details[data-pop] > summary[aria-label='Пояснення']");
      let n = 0;
      for (const sl of (await livePools()).slice(0, 6)) { await go(p, `/uk/lp/${sl}/`); n = await hs.count(); if (n >= 2) break; }
      check(p, "Hint «?» present", n >= 2, `${n} on ${pathOnly(p.url())}`);
      if (n >= 2) {
        const tapOrClick = (l) => (kind === "phone" ? l.tap() : l.click());
        await hs.nth(0).scrollIntoViewIfNeeded(); await tapOrClick(hs.nth(0)); await p.waitForTimeout(150);
        const r0 = await p.evaluate(() => { const d = document.querySelector("details[data-pop][open]"); if (!d) return null; const b = d.querySelector("div").getBoundingClientRect(); const e = document.elementFromPoint(b.left + b.width / 2, b.top + Math.min(20, b.height / 2)); return { l: Math.round(b.left), r: Math.round(b.right), t: Math.round(b.top), b: Math.round(b.bottom), top: !!e && d.contains(e), vh: innerHeight }; });
        check(p, "Hint opens a panel", !!r0, JSON.stringify(r0));
        if (r0) check(p, "Hint panel inside the viewport and on top", r0.l >= 0 && r0.r <= (kind === "phone" ? 390 : 1280) && r0.b <= r0.vh && r0.t >= 0 && r0.top, JSON.stringify(r0));
        await hs.nth(1).scrollIntoViewIfNeeded(); await tapOrClick(hs.nth(1)); await p.waitForTimeout(150);
        const openN = await p.locator("details[data-pop][open]").count();
        check(p, "Hint: opening another closes the first (one at a time)", openN === 1, `${openN} open`);
        if (kind === "phone") await p.tap("h1"); else await p.mouse.click(5, 300);
        await p.waitForTimeout(150);
        check(p, "Hint closes on outside tap/click", (await p.locator("details[data-pop][open]").count()) === 0);
        await tapOrClick(hs.nth(0)); await p.waitForTimeout(100); await p.keyboard.press("Escape"); await p.waitForTimeout(100);
        check(p, "Hint closes on Esc", (await p.locator("details[data-pop][open]").count()) === 0);
        await tapOrClick(hs.nth(0)); await p.waitForTimeout(100);
        // tapping inside the panel must not close it
        await p.evaluate(() => { const d = document.querySelector("details[data-pop][open] div"); d?.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true })); });
        await p.waitForTimeout(100);
        check(p, "Hint stays open when tapping inside the panel", (await p.locator("details[data-pop][open]").count()) === 1);
        await p.keyboard.press("Escape");
      }
      // CalAdd on /uk/unlocks/ and /uk/sales/
      for (const path of ["/uk/unlocks/", "/uk/sales/"]) {
        await go(p, path);
        const btn = p.locator('button[aria-expanded][aria-label="Додати в календар"]:visible');
        const bn = await btn.count();
        check(p, `CalAdd buttons on ${path}`, bn > 0, `${bn}`);
        if (!bn) continue;
        const row = btn.first();
        // phones: the calendar column is the last one of a sideways-scrolling table — bring it into view like a swipe would
        await row.evaluate((b) => b.scrollIntoView({ block: "center", inline: "center", behavior: "instant" }));
        await p.waitForTimeout(150);
        const rowInfo = await row.evaluate((b) => { const tr = b.closest("tr[data-row]"); const card = b.closest("li, tr, article, div.card"); return { q: tr?.dataset.q ?? card?.innerText.slice(0, 80) ?? "", date: tr ? Number(tr.dataset.sDate) : null }; });
        if (kind === "phone") await row.tap({ timeout: 6000 }).catch(async (e) => { info(p, `CalAdd: Playwright could not tap the calendar button (${path})`, e.message.split("\n")[0]); await row.dispatchEvent("click"); }); else await row.click();
        await p.waitForTimeout(200);
        const menu = await p.evaluate(() => { const b = document.querySelector('button[aria-label="Додати в календар"][aria-expanded="true"]'); const m = b?.parentElement?.querySelector("div.fixed"); if (!m) return null; const r = m.getBoundingClientRect(); const a = m.querySelector("a"); return { href: a?.getAttribute("href"), r: [Math.round(r.left), Math.round(r.top), Math.round(r.right), Math.round(r.bottom)], vw: innerWidth, vh: innerHeight, top: (() => { const e = document.elementFromPoint(r.left + r.width / 2, r.top + 15); return !!e && m.contains(e); })() }; });
        check(p, `CalAdd menu opens on ${path}`, !!menu, JSON.stringify(menu));
        if (!menu) continue;
        check(p, `CalAdd menu inside the viewport & on top (${path})`, menu.r[0] >= 0 && menu.r[2] <= menu.vw && menu.r[1] >= 0 && menu.r[3] <= menu.vh && menu.top, JSON.stringify(menu.r));
        const g = new URL(menu.href);
        const dates = g.searchParams.get("dates") ?? ""; const title = g.searchParams.get("text") ?? "";
        const m = /^(\d{8}T\d{6}Z)\/(\d{8}T\d{6}Z)$/.exec(dates);
        const toMs = (s) => Date.UTC(+s.slice(0, 4), +s.slice(4, 6) - 1, +s.slice(6, 8), +s.slice(9, 11), +s.slice(11, 13), +s.slice(13, 15));
        const okDates = !!m && toMs(m[2]) > toMs(m[1]) && toMs(m[1]) > Date.now() - 86400e3 && toMs(m[1]) < Date.now() + 400 * 86400e3;
        const sym = (rowInfo.q || "").split(/\s+/)[0];
        check(p, `Google Calendar link: action/dates/title sensible (${path})`, g.hostname === "calendar.google.com" && g.searchParams.get("action") === "TEMPLATE" && okDates && title.length > 3 && (path !== "/uk/unlocks/" || title.includes(sym)), `text="${title.slice(0, 80)}" dates=${dates} row="${(rowInfo.q || "").slice(0, 40)}"`);
        if (rowInfo.date && m) { const d = Math.abs(toMs(m[1]) - rowInfo.date); check(p, `Google event start = the row's unlock date (${path})`, d < 36 * 3600e3, `start ${m[1]} vs row ${new Date(rowInfo.date).toISOString()}`); }
        if (kind === "desk") {
          const ics = p.locator('div.fixed button').filter({ hasText: ".ics" }).first();
          const [dl] = await Promise.all([p.waitForEvent("download", { timeout: 8000 }).catch(() => null), ics.click()]);
          if (dl) {
            const f = pth.join(DL, `${path.replace(/\W+/g, "_")}${dl.suggestedFilename()}`);
            await dl.saveAs(f);
            const body = fs.readFileSync(f, "utf8");
            const dt = /DTSTART[^:]*:(\d{8}T?\d{0,6}Z?)/.exec(body)?.[1];
            check(p, `.ics download valid (${path})`, /BEGIN:VCALENDAR/.test(body) && /BEGIN:VEVENT/.test(body) && /SUMMARY:/.test(body) && !!dt, `${dl.suggestedFilename()} ${body.length}B DTSTART=${dt} SUMMARY=${/SUMMARY:(.*)/.exec(body)?.[1]?.slice(0, 60)}`);
          } else check(p, `.ics download starts (${path})`, false, "no download event");
          check(p, `CalAdd menu closes after .ics (${path})`, (await p.locator('button[aria-label="Додати в календар"][aria-expanded="true"]').count()) === 0);
          await row.click(); await p.waitForTimeout(100); await p.keyboard.press("Escape"); await p.waitForTimeout(100);
          check(p, `CalAdd menu closes on Esc (${path})`, (await p.locator('button[aria-label="Додати в календар"][aria-expanded="true"]').count()) === 0);
          await row.click(); await p.waitForTimeout(100); await p.mouse.click(5, 400); await p.waitForTimeout(100);
          check(p, `CalAdd menu closes on outside click (${path})`, (await p.locator('button[aria-label="Додати в календар"][aria-expanded="true"]').count()) === 0);
        } else {
          await p.tap("h1"); await p.waitForTimeout(150);
          check(p, `CalAdd menu closes on outside tap (${path})`, (await p.locator('button[aria-label="Додати в календар"][aria-expanded="true"]').count()) === 0);
        }
      }
      if (kind === "phone") {
        // the action row wraps on narrower phones and puts the calendar button at the left edge
        for (const w of [360, 375]) {
          await p.setViewportSize({ width: w, height: 800 }); await go(p, "/uk/sales/");
          const b2 = p.locator('button[aria-expanded][aria-label="Додати в календар"]:visible').first();
          if (!(await b2.count())) continue;
          await b2.scrollIntoViewIfNeeded(); await b2.tap(); await p.waitForTimeout(200);
          const m2 = await b2.evaluate((b) => { const q = b.getBoundingClientRect(); const m = b.parentElement.querySelector("div.fixed")?.getBoundingClientRect(); return { btn: [Math.round(q.left), Math.round(q.right)], menu: m ? [Math.round(m.left), Math.round(m.right)] : null }; });
          check(p, `CalAdd menu inside the screen at ${w} px (/uk/sales/)`, !!m2.menu && m2.menu[0] >= 0 && m2.menu[1] <= w, JSON.stringify(m2));
          await p.tap("h1").catch(() => {});
        }
        await p.setViewportSize({ width: 390, height: 844 });
      }
      // calendar page menus
      await go(p, "/uk/calendar/");
      const cs = p.locator("details[data-pop] > summary[aria-label='Додати в календар']:visible");
      const cn = await cs.count();
      check(p, "calendar page: add-to-calendar menus present", cn > 5, `${cn}`);
      if (cn) {
        await cs.nth(0).scrollIntoViewIfNeeded();
        if (kind === "phone") await cs.nth(0).tap(); else await cs.nth(0).click();
        await p.waitForTimeout(150);
        const info0 = await p.evaluate(() => { const d = document.querySelector("details[data-pop][open]"); if (!d) return null; const a = d.querySelector("a[href*='calendar.google.com']"); const box = [...d.children].find((x) => x.tagName !== "SUMMARY"); const r = box.getBoundingClientRect(); const e = document.elementFromPoint(r.left + r.width / 2, r.top + 12); return { href: a?.getAttribute("href"), r: [Math.round(r.left), Math.round(r.top), Math.round(r.right), Math.round(r.bottom)], top: !!e && box.contains(e), vw: innerWidth, vh: innerHeight }; });
        check(p, "calendar page menu opens on top & inside the viewport", !!info0 && info0.top && info0.r[0] >= 0 && info0.r[2] <= info0.vw && info0.r[3] <= info0.vh, JSON.stringify(info0 && { r: info0.r, top: info0.top }));
        if (info0?.href) { const g = new URL(info0.href); const t = g.searchParams.get("text"); const d = g.searchParams.get("dates"); const det = g.searchParams.get("details") ?? ""; check(p, "calendar page Google link has title, dates and a working site link", !!t && /^\d{8}T\d{6}Z\/\d{8}T\d{6}Z$/.test(d ?? "") && det.includes(BASE + "/uk/"), `text=${t?.slice(0, 60)} dates=${d} details=${det.slice(0, 120)}`); }
        if (cn > 1) { await cs.nth(1).scrollIntoViewIfNeeded(); /* the open panel sits over the next button (a real tap lands on the panel) — toggle it directly */ await cs.nth(1).dispatchEvent("click"); await p.waitForTimeout(120); check(p, "calendar page: one menu open at a time", (await p.locator("details[data-pop][open]").count()) === 1); }
        if (kind === "desk") {
          const ics = p.locator("details[data-pop][open] button").filter({ hasText: ".ics" }).first();
          const [dl] = await Promise.all([p.waitForEvent("download", { timeout: 8000 }).catch(() => null), ics.click()]);
          if (dl) { const f = pth.join(DL, `calendar_${dl.suggestedFilename()}`); await dl.saveAs(f); const body = fs.readFileSync(f, "utf8"); check(p, "calendar page .ics valid", /BEGIN:VEVENT/.test(body) && /DTSTART/.test(body), `${dl.suggestedFilename()} ${body.length}B`); }
          else check(p, "calendar page .ics download starts", false, "no download");
          check(p, "calendar page menu closes after choosing .ics (like CalAdd does)", (await p.locator("details[data-pop][open]").count()) === 0, `${await p.locator("details[data-pop][open]").count()} menu(s) still open`);
        }
        await p.keyboard.press("Escape"); await p.waitForTimeout(80);
        const days0 = await p.locator("main h2, main h3").count();
        const moreDays = p.locator("main button").filter({ hasText: "Показати ще 7 днів" });
        if (await moreDays.count()) { await moreDays.click(); await p.waitForTimeout(200); check(p, "calendar «Показати ще 7 днів» adds days", (await p.locator("main h2, main h3").count()) > days0, `${days0} → ${await p.locator("main h2, main h3").count()}`); }
      }
      await p.close();
    });
  }
};

S.promo = async () => {
  await withCtx("desk", async (c) => {
    const p = await newPage(c);
    await go(p, "/uk/"); await feedReady(p);
    const all = await allCardsMapped(p);
    // three different categories; prefer pages that have a FAQ and an earn calculator so those get exercised too
    const cand = all.filter((y) => y.p && !y.p.meta?.thin).slice(0, 80);
    const feat = [];
    for (const y of cand.slice(0, 45)) { const h = await (await p.request.get(new URL(y.href, p.url()).href)).text(); feat.push({ y, faq: h.includes('id="faq"'), calc: /type="number"/.test(h) }); }
    const picked = []; const seen = new Set();
    const take = (f) => { if (f && !seen.has(f.y.p.category) && picked.length < 3) { picked.push(f.y); seen.add(f.y.p.category); } };
    take(feat.find((f) => f.faq && f.calc)); take(feat.find((f) => f.faq && !seen.has(f.y.p.category))); take(feat.find((f) => f.calc && !seen.has(f.y.p.category)));
    for (const f of feat) take(f);
    info(p, "pages with FAQ / calculator among first 45 cards", `${feat.filter((f) => f.faq).length} FAQ, ${feat.filter((f) => f.calc).length} calculator`);
    // + one with an earn calculator and one with FAQ if possible
    info(p, "promo pages picked", picked.map((x) => `${x.p.category}: ${rel(x.href)}`).join(" | "));
    for (const x of picked) {
      const path = x.href.replace(BP, "");
      await go(p, path);
      const pr = x.p;
      const cta = await p.$$eval("a.btn-primary", (els) => els.map((e) => ({ t: e.innerText.trim(), h: e.getAttribute("href"), tg: e.getAttribute("target"), rel: e.getAttribute("rel") })));
      const c0 = cta[0];
      check(p, `CTA present (${pr.category})`, !!c0 && /^https:\/\//.test(c0.h) && c0.tg === "_blank" && /noopener/.test(c0.rel ?? ""), JSON.stringify(c0));
      if (c0) { let host = ""; try { host = new URL(c0.h).hostname; } catch {} let ph = ""; try { ph = new URL(pr.url).hostname; } catch {} check(p, `CTA goes to the organiser's domain (${pr.category})`, host && ph && host.split(".").slice(-2).join(".") === ph.split(".").slice(-2).join("."), `${host} vs rules ${ph}`); }
      // steps
      const steps = await p.$$eval("main ol li", (els) => els.length);
      check(p, `«Що зробити» steps listed (${pr.category})`, steps > 0, `${steps} li`);
      const marks = await p.locator("main button").filter({ hasText: "Позначити як зроблене" }).count();
      if (marks) {
        await p.locator("main button").filter({ hasText: "Позначити як зроблене" }).first().click(); await p.waitForTimeout(100);
        await p.reload(); await settle(p);
        check(p, "step «Позначити як зроблене» persists", (await p.locator("main button[aria-pressed=true]").filter({ hasText: "Зроблено" }).count()) === 1);
      } else info(p, `no «Позначити як зроблене» toggles on the promo page (${pr.category})`, "steps are a static list here (CheckSteps is only used on /learn/ pages)");
      // summary tiles
      const det = p.locator("main button").filter({ hasText: /^Деталі/ });
      if (await det.count()) { await det.first().click(); await p.waitForTimeout(100); check(p, "«Деталі» opens the tile details", (await p.locator("main button[aria-expanded=true]").count()) >= 2); await det.first().click().catch(() => {}); }
      // full rules details
      const full = p.locator("main details > summary").filter({ hasText: "Показати умови повністю" });
      if (await full.count()) { await full.first().click(); await p.waitForTimeout(100); check(p, "«Показати умови повністю» expands", await full.first().evaluate((s) => s.parentElement.open)); }
      // FAQ
      const faq = p.locator("#faq details");
      const fn = await faq.count();
      if (fn) {
        const firstOpen = await faq.nth(0).evaluate((d) => d.open);
        check(p, `FAQ: first answer open by default (${pr.category})`, firstOpen);
        if (fn > 1) { await faq.nth(1).locator("summary").click(); await p.waitForTimeout(80); check(p, "FAQ: tapping a question opens it", await faq.nth(1).evaluate((d) => d.open)); await faq.nth(1).locator("summary").click(); await p.waitForTimeout(80); check(p, "FAQ: tapping again closes it", !(await faq.nth(1).evaluate((d) => d.open))); }
      } else info(p, `no FAQ section (${pr.category})`);
      // share / copy
      const share = await p.$$eval("main a[href^='https://t.me/share'], main a[href^='https://x.com/intent']", (els) => els.map((e) => e.getAttribute("href")));
      const enc = encodeURIComponent(p.url().split("#")[0]);
      check(p, "share links carry this page's URL", share.length === 2 && share.every((h) => h.includes(enc)), share.map((h) => h.slice(0, 90)).join(" | "));
      await c.grantPermissions(["clipboard-read", "clipboard-write"], { origin: ORIGIN });
      const copy = p.locator("main button").filter({ hasText: "Копіювати посилання" }).first();
      await copy.click(); await p.waitForTimeout(150);
      const clip = await p.evaluate(() => navigator.clipboard.readText().catch((e) => "ERR " + e));
      check(p, "copy link → «✓ Скопійовано» and clipboard = page URL", (await p.locator("main button").filter({ hasText: "Скопійовано" }).count()) === 1 && clip === p.url(), `clip=${rel(clip)}`);
      // save / hide (large buttons)
      const sv = p.locator("main button.size-12[aria-label='Зберегти'], main button[aria-label='Зберегти'].size-12").first();
      if (await sv.count()) {
        await sv.click(); await p.waitForTimeout(100);
        await p.reload(); await settle(p);
        check(p, "promo page ☆ save persists after reload", (await p.locator("main button.size-12[aria-label='Прибрати зі збережених']").count()) === 1);
        await p.locator("main button.size-12[aria-label='Прибрати зі збережених']").click(); await p.waitForTimeout(100);
      } else check(p, "promo page has a large ☆ save button", false);
      const hd = p.locator("main button.size-12[aria-label='Приховати']").first();
      if (await hd.count()) { await hd.click(); await p.waitForTimeout(100); check(p, "promo page hide toggles to «Повернути в стрічку»", (await p.locator("main button.size-12[aria-label='Повернути в стрічку']").count()) === 1); await p.locator("main button.size-12[aria-label='Повернути в стрічку']").click(); }
      // earn calculator
      const calcIn = p.locator("main input[type=number]").first();
      if (await calcIn.count()) {
        const boxText = () => calcIn.evaluate((i) => { let a = i.parentElement; while (a && a.innerText.length < 120) a = a.parentElement; return a ? a.innerText.replace(/\s+/g, " ") : ""; });
        // from $1 (below any entry threshold) to $5,000: a one-threshold promo shows the same text for $1,000 and $5,000
        await calcIn.fill("1"); await p.waitForTimeout(150);
        const t0 = await boxText();
        await calcIn.fill("5000"); await p.waitForTimeout(150);
        const t1 = await boxText();
        check(p, `earn calculator reacts to the amount (${pr.category})`, t0 !== t1, `${t0.slice(0, 120)} → ${t1.slice(0, 120)}`);
        await calcIn.click(); await p.keyboard.press("Meta+A"); await p.keyboard.press("Backspace"); await p.keyboard.type("250"); await p.waitForTimeout(100);
        const v = await calcIn.inputValue();
        check(p, "earn calculator: clearing the field and typing 250 gives 250", v === "250", `field shows "${v}"`);
      } else info(p, `no earn calculator (${pr.category})`);
      // calendar links inside the time tile (data: .ics)
      const icsA = await p.$$eval("main a[download$='.ics']", (els) => els.map((e) => e.getAttribute("href")));
      if (icsA.length) { const body = decodeURIComponent(icsA[0].replace(/^data:[^,]*,/, "")); check(p, "promo page .ics link is a valid calendar", /BEGIN:VEVENT/.test(body) && /DTSTART/.test(body), `${icsA[0].slice(0, 40)}… ${body.length}B`); }
      // breadcrumbs / back
      const crumbs = await p.$$eval("main nav a", (els) => els.slice(0, 3).map((e) => [e.innerText.trim(), e.getAttribute("href")]));
      info(p, "breadcrumbs", JSON.stringify(crumbs));
      for (const [t, h] of crumbs) {
        const r = await p.request.get(new URL(h, p.url()).href, { maxRedirects: 0 }).catch(() => null);
        const st = r?.status();
        check(p, `breadcrumb «${t}» → ${h} responds without redirect`, st === 200, `HTTP ${st}${st >= 300 && st < 400 ? ` → ${r.headers().location}` : ""}`);
      }
      const back = p.locator("main nav a").first();
      await back.click(); await p.waitForLoadState("domcontentloaded"); await p.waitForTimeout(600);
      check(p, "back link lands on the home feed (#promos)", /\/uk\/(#promos)?$/.test(rel(p.url())) || rel(p.url()) === "/uk/#promos", rel(p.url()));
      // related
      await go(p, path);
      const rel2 = await p.$$eval("main a[href*='/p/']", (els) => [...new Set(els.map((e) => e.getAttribute("href")))].filter((h) => !h.includes(location.pathname.split("/p/")[1])));
      const dead = rel2.filter((h) => !promoOf(h));
      check(p, "related promo links point at existing promos", dead.length === 0, `${rel2.length} links, dead: ${dead.slice(0, 3).join(", ")}`);
    }
    await p.close();
  });
  // phone look at one promo page
  await withCtx("phone", async (c) => {
    const p = await newPage(c);
    await go(p, "/uk/"); await feedReady(p);
    const hrefs = (await cards(p)).map((x) => x.href).slice(0, 4);
    for (const h of hrefs) await go(p, h.replace(BP, ""));
    await p.close();
  });
};

S.my = async () => {
  await withCtx("desk", async (c) => {
    const p = await newPage(c);
    await go(p, "/uk/my/");
    check(p, "/my/ empty state without saved promos", (await p.locator("main").innerText()).length > 0 && (await p.locator("main li.card").count()) === 0);
    await go(p, "/uk/"); await feedReady(p);
    // save 7 promos with the ☆ button (different exchanges where possible)
    await expandAll(p);
    const cs = await cards(p);
    const pick = []; const ven = new Set();
    for (let i = 0; i < cs.length && pick.length < 7; i++) { const pr = promoOf(cs[i].href); if (!pr || ven.has(pr.venue.id) && pick.length < 5) continue; ven.add(pr.venue.id); pick.push(i); }
    for (const i of pick) { await p.locator("article.card").nth(i).locator('button[aria-label="Зберегти"]').click(); await p.waitForTimeout(60); }
    const savedIds = await p.evaluate(() => JSON.parse(localStorage.getItem("pr:saved") || "[]"));
    check(p, "7 promos saved from the feed", savedIds.length === 7, `${savedIds.length}`);
    await go(p, "/uk/my/");
    const rows = () => p.locator("main ul > li.card");
    check(p, "/my/ lists every saved promo", (await rows().count()) === 7, `${await rows().count()}`);
    const chipsT = async () => p.$$eval("main [role=tablist] [role=tab]", (els) => els.map((e) => e.innerText.replace(/\s+/g, " ").trim()));
    check(p, "/my/ status chip «Усі 7»", (await chipsT()).some((x) => x === "Усі 7"), JSON.stringify(await chipsT()));
    // the open status menu must not be covered by the next row (desktop: a hovered .card gets a transform → own stacking context)
    for (const i of [0, 1, 2, 3]) await checkMenuCoverage(p, rows().nth(i).locator('button[aria-haspopup="listbox"]').first(), `desktop /my/ row ${i + 1} status Select`);
    // pointer attempt on row 1, then keyboard (works either way) so the rest of the section can run
    {
      const t0 = rows().nth(0).locator('button[aria-haspopup="listbox"]').first();
      await t0.click(); await p.waitForSelector(LB);
      const bb = await p.locator(`${LB} [role=option]`).nth(1).boundingBox();
      await p.mouse.click(bb.x + bb.width / 2, bb.y + bb.height / 2); await p.waitForTimeout(250);
      check(p, "desktop /my/: clicking «Беру участь» in row 1's menu sets the status", txt(await t0.innerText()) === "Беру участь", `row 1 shows «${txt(await t0.innerText())}», open menus ${await p.locator(LB).count()}`);
      await p.keyboard.press("Escape"); await p.locator("h1").click(); await p.waitForTimeout(100);
    }
    for (const i of [0, 1]) {
      const t = rows().nth(i).locator('button[aria-haspopup="listbox"]').first();
      if (txt(await t.innerText()) === "Беру участь") continue;
      await t.focus(); await p.keyboard.press("ArrowDown"); await p.waitForTimeout(80); await p.keyboard.press("Home"); await p.keyboard.press("ArrowDown"); await p.keyboard.press("Enter"); await p.waitForTimeout(200);
    }
    let ct = await chipsT();
    check(p, "/my/ chips «Беру участь 2» and «Збережено 5»", ct.includes("Беру участь 2") && ct.includes("Збережено 5"), JSON.stringify(ct));
    const active = txt(await p.locator("main .card").nth(1).innerText());
    check(p, "/my/ «Беру участь · активні» tile = 2", /^2/.test(active), active);
    await p.locator("main [role=tab]").filter({ hasText: "Беру участь" }).click(); await p.waitForTimeout(120);
    check(p, "/my/ chip filter «Беру участь» shows 2 rows", (await rows().count()) === 2);
    await p.locator("main [role=tab]").filter({ hasText: /^Усі/ }).click(); await p.waitForTimeout(120);
    // exchange Select
    const exT = p.locator('main button[aria-haspopup="listbox"][aria-label="Біржа"]');
    if (await exT.count()) {
      const opts = await selOptions(p, exT);
      const v = opts[1];
      await selPick(p, exT, v);
      const names = await rows().evaluateAll((els) => els.map((e) => e.querySelector(".text-xs.font-semibold")?.textContent ?? ""));
      check(p, `/my/ exchange «${v}» filters rows`, names.length > 0 && names.every((x) => x.startsWith(v)), JSON.stringify(names.map((x) => x.slice(0, 25))));
      await selPick(p, exT, "Усі біржі");
    } else check(p, "/my/ exchange Select present", false);
    // search
    const search = p.locator('main input[aria-label="Пошук у моїх акціях"]');
    check(p, "/my/ search shown when > 5 saved", await search.isVisible());
    const firstTitle = txt(await rows().nth(0).locator("a").first().innerText());
    const word = firstTitle.split(/\s+/).find((w) => w.length > 4) ?? firstTitle.slice(0, 5);
    await search.fill(word.toLowerCase()); await p.waitForTimeout(150);
    const nS = await rows().count();
    check(p, `/my/ search «${word}» narrows the list`, nS >= 1 && nS < 7, `${nS} rows`);
    await search.fill("zzqxj"); await p.waitForTimeout(120);
    check(p, "/my/ search no-match shows the empty note", (await rows().count()) === 0 && (await p.locator("main").innerText()).includes("Нічого"));
    await search.fill("");
    // sort
    const soT = p.locator('main button[aria-haspopup="listbox"][aria-label="Сортування"]');
    const ends = async () => rows().evaluateAll((els) => els.map((e) => e.querySelector("a")?.getAttribute("href")));
    const endOf = (h) => { const pr = promoOf(h); return pr?.endsAt && pr.endsAt > Date.now() ? pr.endsAt : Infinity; };
    let hs = await ends();
    check(p, "/my/ default sort «Скоро дедлайн» orders by deadline", firstBreak(hs.map(endOf), (a, b) => (a > b ? 1 : 0)) === -1, hs.map((h) => { const e = endOf(h); return e === Infinity ? "∞" : Math.round((e - Date.now()) / 3600e3) + "h"; }).join(","));
    await selPick(p, soT, "За біржею");
    const vn = await rows().evaluateAll((els) => els.map((e) => (e.querySelector(".text-xs.font-semibold")?.textContent ?? "").split(" · ")[0]));
    check(p, "/my/ sort «За біржею» alphabetical", firstBreak(vn, (a, b) => a.localeCompare(b)) === -1, vn.join(","));
    // earned + note persistence
    const earnIn = rows().nth(0).locator("input[inputmode=decimal]");
    await earnIn.fill("12,5"); await earnIn.blur(); await p.waitForTimeout(100);
    const noteIn = rows().nth(0).locator("input[placeholder]").last();
    await noteIn.fill("тест нотатка"); await noteIn.blur(); await p.waitForTimeout(100);
    const tot = txt(await p.locator("main .card").first().innerText());
    check(p, "/my/ earned 12,5 → total shows $12.5", /12[.,]5/.test(tot), tot);
    await selPick(p, soT, "Більше заробив");
    const firstHref = (await ends())[0];
    await p.locator("main [role=tab]").filter({ hasText: "Беру участь" }).click(); await p.waitForTimeout(100);
    await p.reload(); await settle(p); await p.waitForTimeout(300);
    const st = { chip: await p.$$eval("main [role=tab][aria-selected=true]", (els) => els.map((e) => e.innerText.replace(/\s+/g, " ").trim())), sort: txt(await soT.innerText()) };
    check(p, "/my/ chip + sort remembered after reload", /Беру участь/.test(st.chip[0] ?? "") && st.sort === "Більше заробив", JSON.stringify(st));
    await p.locator("main [role=tab]").filter({ hasText: /^Усі/ }).click(); await p.waitForTimeout(100);
    const r0 = rows().filter({ has: p.locator(`a[href="${firstHref}"]`) }).first();
    const ev = await r0.locator("input[inputmode=decimal]").inputValue().catch(() => "?");
    const nv = await r0.locator("input[placeholder]").last().inputValue().catch(() => "?");
    check(p, "/my/ earned and note persist after reload", ev === "12.5" && nv === "тест нотатка", `earned="${ev}" note="${nv}"`);
    ct = await chipsT();
    check(p, "/my/ statuses persist after reload", ct.includes("Беру участь 2"), JSON.stringify(ct));
    // ✕ removes
    await rows().nth(6).locator("button").filter({ hasText: "✕" }).click(); await p.waitForTimeout(120);
    check(p, "/my/ ✕ removes the promo", (await rows().count()) === 6 && (await p.evaluate(() => JSON.parse(localStorage.getItem("pr:saved") || "[]").length)) === 6);
    // exports
    const [d1] = await Promise.all([p.waitForEvent("download", { timeout: 6000 }).catch(() => null), p.locator("main button.card").first().click()]);
    if (d1) { const f = pth.join(DL, d1.suggestedFilename()); await d1.saveAs(f); const b = fs.readFileSync(f, "utf8"); check(p, "/my/ CSV export has a header + 6 rows", b.trim().split("\n").length === 7 && b.includes("earned_usd"), `${b.trim().split("\n").length} lines`); } else check(p, "/my/ CSV export downloads", false);
    const icsBtn = p.locator("main button.card").nth(1);
    if (!(await icsBtn.isDisabled())) { const [d2] = await Promise.all([p.waitForEvent("download", { timeout: 6000 }).catch(() => null), icsBtn.click()]); if (d2) { const f = pth.join(DL, `my_${d2.suggestedFilename()}`); await d2.saveAs(f); const b = fs.readFileSync(f, "utf8"); check(p, "/my/ deadlines .ics valid", /BEGIN:VEVENT/.test(b), `${(b.match(/BEGIN:VEVENT/g) ?? []).length} events`); } else check(p, "/my/ deadlines .ics downloads", false); }
    await p.close();
  });
  await withCtx("phone", async (c) => {
    const p = await newPage(c);
    await go(p, "/uk/");
    const ids = FEED.promos.filter((x) => geoAllowed(x, "ua")).slice(0, 7).map((x) => x.id);
    await p.evaluate((ids) => localStorage.setItem("pr:saved", JSON.stringify(ids)), ids);
    await go(p, "/uk/my/");
    const trig = p.locator('main ul > li.card button[aria-haspopup="listbox"]');
    if (await trig.count()) await checkMenuCoverage(p, trig.last(), "phone /my/ row status Select");
    const so = p.locator('main button[aria-haspopup="listbox"][aria-label="Сортування"]');
    if (await so.count()) await checkMenuCoverage(p, so, "phone /my/ sort Select");
    const ex = p.locator('main button[aria-haspopup="listbox"][aria-label="Біржа"]');
    if (await ex.count()) await checkMenuCoverage(p, ex, "phone /my/ exchange Select");
    await p.close();
  });
};

async function tableRows(p) { return p.$$eval("tr[data-row]", (els) => els.map((r) => ({ hidden: r.hidden, ds: { ...r.dataset } }))); }
async function tableCount(p) { return p.evaluate(() => { const s = [...document.querySelectorAll("main span")].find((x) => /^\d+ з \d+$/.test(x.textContent.trim())); return s ? s.textContent.trim() : null; }); }
S.tables = async () => {
  await withCtx("desk", async (c) => {
    const p = await newPage(c);
    for (const [path, sorts, filters] of [
      ["/uk/unlocks/", [["Найближчі", "sDate", 1]], ["impact", "kind", "who"]],
      ["/uk/fixed/", [], ["chain", "term"]],
    ]) {
      await go(p, path);
      let rows = await tableRows(p);
      const cnt = await tableCount(p);
      check(p, `«N з M» count = visible / all rows`, cnt === `${rows.filter((r) => !r.hidden).length} з ${rows.length}`, `${cnt} vs ${rows.filter((r) => !r.hidden).length}/${rows.length}`);
      const triggers = p.locator('main button[aria-haspopup="listbox"]');
      const tn = await triggers.count();
      const sortT = triggers.nth(tn - 1);
      const sopts = await selOptions(p, sortT);
      info(p, "sort options", JSON.stringify(sopts));
      for (const o of sopts) {
        await selPick(p, sortT, o);
        rows = (await tableRows(p)).filter((r) => !r.hidden);
        const key = Object.keys(rows[0]?.ds ?? {}).filter((k) => /^s[A-Z]/.test(k));
        // which key changed order: check the one monotone
        const mono = key.map((k) => { const v = rows.map((r) => Number(r.ds[k])).filter(Number.isFinite); return [k, firstBreak(v, (a, b) => (a > b ? 1 : 0)) === -1 ? "asc" : firstBreak(v, (a, b) => (a < b ? 1 : 0)) === -1 ? "desc" : "none"]; });
        const want = { "Найближчі": ["sDate", "asc"], "Більший розлок": ["sUsd", "desc"], "Найбільший тиск": ["sPress", "desc"], "Більша ліквідність": ["sLiq", "desc"], "Вища ставка": ["sApy", "desc"], "Найближче погашення": ["sExp", "asc"] }[o];
        if (want) check(p, `sort «${o}» orders rows by ${want[0]} ${want[1]}`, mono.some(([k, d]) => k === want[0] && d === want[1]), JSON.stringify(mono));
        else check(p, `sort «${o}» orders rows by some column`, mono.some(([, d]) => d !== "none"), JSON.stringify(mono));
      }
      await selPick(p, sortT, sopts[0]);
      // filters
      for (let i = 0; i < tn - 1; i++) {
        const ft = triggers.nth(i);
        const label = await ft.getAttribute("aria-label");
        const opts = await selOptions(p, ft);
        let okAll = true; const det = [];
        for (const o of opts.slice(1)) {
          await selPick(p, ft, o);
          const rs = await tableRows(p); const vis = rs.filter((r) => !r.hidden);
          const fk = Object.keys(rs[0].ds).filter((k) => /^f[A-Z]/.test(k));
          const matchKey = fk.find((k) => vis.length && vis.every((r) => r.ds[k] === o));
          const expected = rs.filter((r) => fk.some((k) => r.ds[k] === o)).length;
          const cntT = await tableCount(p);
          const empty = await p.locator("main p").filter({ hasText: "Нічого не знайдено — змініть фільтр" }).count();
          if (vis.length === 0) { det.push(`«${o}»: 0 rows${empty ? " (empty note shown)" : " (NO empty note)"}`); if (!empty) okAll = false; continue; }
          if (!matchKey || vis.length !== expected || cntT !== `${vis.length} з ${rs.length}`) { okAll = false; det.push(`«${o}»: ${vis.length} vis, expected ${expected}, count "${cntT}"`); }
        }
        check(p, `filter «${label}»: every option shows only matching rows + count updates`, okAll, det.join(" ; ") || `${opts.length - 1} options`);
        await selPick(p, ft, opts[0]);
      }
      // search
      const search = p.locator('main input[aria-label="Пошук"]');
      rows = await tableRows(p);
      const term = (rows[1]?.ds.q ?? "").split(/\s+/)[0].replace(/^pt-/, "");
      await search.fill(term.toLowerCase()); await p.waitForTimeout(150);
      let vis = (await tableRows(p)).filter((r) => !r.hidden);
      check(p, `search «${term}» shows only matching rows`, vis.length > 0 && vis.every((r) => (r.ds.q ?? "").toLowerCase().includes(term.toLowerCase())), `${vis.length} rows`);
      await search.fill("zzqxj"); await p.waitForTimeout(150);
      vis = (await tableRows(p)).filter((r) => !r.hidden);
      check(p, "search no match → 0 rows + empty note + «0 з M»", vis.length === 0 && (await p.locator("main p").filter({ hasText: "Нічого не знайдено" }).count()) === 1 && /^0 з/.test((await tableCount(p)) ?? ""), await tableCount(p));
      await search.fill("");
      // language switch must not leave a stale filter
      if (tn > 1) {
        const ft = triggers.nth(0);
        const opts = await selOptions(p, ft);
        await selPick(p, ft, opts[opts.length - 1]);
        const ukVis = (await tableRows(p)).filter((r) => !r.hidden).length;
        await p.locator("header [role=group] a", { hasText: "EN" }).first().click();
        await p.waitForURL(/\/en\//, { timeout: 8000 }).catch(() => {}); await settle(p); await p.waitForTimeout(1500);
        const enRows = await tableRows(p);
        const enVis = enRows.filter((r) => !r.hidden).length;
        check(p, `switch UA→EN with a filter set: table not emptied`, enVis > 0, `en ${enVis}/${enRows.length} visible (uk had ${ukVis})`);
        await p.locator("header [role=group] a", { hasText: "UA" }).first().click();
        await p.waitForURL(/\/uk\//, { timeout: 8000 }).catch(() => {}); await settle(p); await p.waitForTimeout(1500);
        const back = (await tableRows(p)).filter((r) => !r.hidden).length;
        check(p, "back to UA: the remembered filter still applies", back === ukVis, `${back} vs ${ukVis}`);
        await p.reload(); await settle(p); await p.waitForTimeout(300);
        check(p, "filter remembered after reload (and count matches)", (await tableRows(p)).filter((r) => !r.hidden).length === ukVis && (await tableCount(p)) === `${ukVis} з ${enRows.length === 0 ? "?" : (await tableRows(p)).length}`, await tableCount(p));
        await selPick(p, ft, opts[0]);
      }
    }
    await p.close();
  });
  await withCtx("phone", async (c) => {
    const p = await newPage(c);
    for (const path of ["/uk/unlocks/", "/uk/fixed/"]) {
      await go(p, path);
      const triggers = p.locator('main button[aria-haspopup="listbox"]');
      const n = await triggers.count();
      for (let i = 0; i < n; i++) await checkMenuCoverage(p, triggers.nth(i), `phone ${path} Select #${i + 1} «${await triggers.nth(i).getAttribute("aria-label")}»`);
    }
    await p.close();
  });
};

S.yield = async () => {
  await withCtx("desk", async (c) => {
    const p = await newPage(c);
    // DEX
    await go(p, "/uk/dex/");
    const chainT = p.locator('main button[aria-haspopup="listbox"][aria-label^="Мережа"]').first();
    const tvlT = p.locator('main button[aria-haspopup="listbox"][aria-label^="Мін"]').first();
    const rowsOf = async () => p.$$eval("main table tbody > tr", (trs) => trs.filter((t) => t.children.length >= 7).map((t) => ({ chain: t.children[1]?.innerText.trim(), tvl: t.children[2]?.innerText.trim() })));
    const usdOf = (s) => { const m = /\$([\d.]+)([KMB]?)/.exec(s ?? ""); return m ? Number(m[1]) * ({ K: 1e3, M: 1e6, B: 1e9 }[m[2]] ?? 1) : NaN; };
    const chOpts = await selOptions(p, chainT);
    const ch = chOpts[2] ?? chOpts[1];
    await selPick(p, chainT, ch);
    let rs = await rowsOf();
    check(p, `DEX chain «${ch}» filters rows`, rs.length > 0 && rs.every((r) => r.chain === ch), `${rs.length} rows; ${[...new Set(rs.map((r) => r.chain))].join(",")}`);
    await selPick(p, chainT, chOpts[0]);
    const tvlOpts = await selOptions(p, tvlT);
    info(p, "DEX min TVL options", JSON.stringify(tvlOpts));
    const big = tvlOpts[tvlOpts.length - 1];
    await selPick(p, tvlT, big);
    rs = await rowsOf();
    const thr = usdOf(big);
    check(p, `DEX min TVL «${big}»: every pool ≥ threshold`, rs.length > 0 && rs.every((r) => usdOf(r.tvl) >= thr * 0.999), `${rs.length} rows, min ${Math.min(...rs.map((r) => usdOf(r.tvl)))}`);
    await selPick(p, tvlT, tvlOpts[1] ?? tvlOpts[0]);
    // open a pool
    const pc = p.locator("main table button[aria-expanded]").first();
    await pc.click(); await p.waitForTimeout(300);
    check(p, "DEX pool details open (aria-expanded)", (await pc.getAttribute("aria-expanded")) === "true");
    const hist = p.locator("main div").filter({ hasText: /^Історія APY/ }).last();
    await p.waitForFunction(() => { const t = [...document.querySelectorAll("main svg[role=img]")].length || document.body.innerText.includes("Історія зараз недоступна"); return t; }, null, { timeout: 15000 }).catch(() => {});
    const svg = p.locator("main svg[role=img][aria-label^='Історія APY']:visible").first();
    const hasChart = await svg.count();
    check(p, "APY history chart renders", hasChart > 0, hasChart ? await svg.getAttribute("aria-label") : (await p.locator("main").innerText()).includes("недоступна") ? "shows «Історія зараз недоступна»" : "nothing");
    if (hasChart) {
      const rd = () => p.evaluate(() => { const s = [...document.querySelectorAll("main svg[role=img][aria-label^='Історія APY']")].find((x) => x.getClientRects().length); return { read: s.previousElementSibling?.textContent.trim(), first: s.nextElementSibling?.firstElementChild?.textContent.trim(), d: s.querySelector("path:nth-of-type(2)")?.getAttribute("d")?.length }; });
      const r90 = await rd();
      for (const [lbl] of [["30дн"], ["рік"], ["90дн"]]) {
        await p.locator("main [role=group][aria-label='Історія APY'] button:visible", { hasText: lbl }).first().click(); await p.waitForTimeout(150);
        const r = await rd();
        check(p, `APY chart range «${lbl}» changes the series`, lbl === "90дн" ? r.first === r90.first : r.first !== r90.first || r.d !== r90.d, `${r90.first}→${r.first}`);
        check(p, `APY chart range «${lbl}» pressed`, (await p.locator("main [role=group][aria-label='Історія APY'] button[aria-pressed=true]:visible").first().innerText()).trim() === lbl);
      }
      const b = await svg.boundingBox();
      await p.mouse.move(b.x + b.width * 0.5, b.y + b.height / 2); await p.waitForTimeout(150);
      const hv = await rd();
      check(p, "APY chart hover shows date · value readout", /·\s*[\d.]+%/.test(hv.read ?? "") && !/мін/.test(hv.read ?? ""), hv.read);
      await p.mouse.move(5, 5); await p.waitForTimeout(100);
      check(p, "APY chart readout returns to min/avg/max after leaving", /мін/.test((await rd()).read ?? ""));
    }
    const detailTxt = txt(await p.locator("main table tbody tr").nth(1).innerText());
    info(p, "DEX pool detail (hedge block)", detailTxt.slice(0, 300));
    void hist;
    // hedge page
    await go(p, "/uk/hedge/");
    const pool = p.locator('main button[aria-haspopup="listbox"]').first();
    const plan = async () => txt(await p.locator("main ol").first().innerText());
    const p0 = await plan();
    const popts = await selOptions(p, pool);
    info(p, "hedge pool options", `${popts.length}: ${popts.slice(0, 4).join(" | ")} … ${popts[popts.length - 1]}`);
    if (popts.length > 2) { await selPick(p, pool, popts[1]); const p1 = await plan(); check(p, "hedge: another pool changes the plan", p1 !== p0, p1.slice(0, 100)); }
    await selPick(p, pool, popts[popts.length - 1]);
    const pc2 = await plan();
    const tickers = [...new Set(popts.slice(0, -1).flatMap((o) => (o.match(/\b[A-Z0-9]{2,10}\b/g) ?? [])).filter((x) => !/^(APR|USD|\d+)$/.test(x)))];
    const venuesRe = /\b(Gate|MEXC|Bitget|Binance|Bybit|OKX|KuCoin|HTX|BingX|LBank)\b/;
    const leaked = tickers.filter((tk) => new RegExp(`\\b${tk}\\b`).test(pc2));
    check(p, "hedge «custom» plan has no pool tickers / exchange names", leaked.length === 0 && !venuesRe.test(pc2), `${leaked.join(",")} ${pc2.match(venuesRe)?.[0] ?? ""} | ${pc2.slice(0, 160)}`);
    await selPick(p, pool, popts[0]);
    const cap = p.locator("main input[type=number]").first();
    await cap.fill("2500"); await p.waitForTimeout(150);
    const pe = await plan();
    const poolSel = txt(await pool.innerText());
    check(p, "hedge: editing a field switches to custom params", /Власні|свої|Свої|власні/i.test(poolSel), `select shows «${poolSel}»`);
    check(p, "hedge: plan after editing has no pool ticker / exchange", !venuesRe.test(pe) && !tickers.some((tk) => new RegExp(`\\b${tk}\\b`).test(pe)), pe.slice(0, 160));
    const lev = p.locator("main input[type=number]").nth(5);
    await lev.fill("0"); await p.waitForTimeout(100);
    const res = txt(await p.locator("main dl").innerText());
    check(p, "hedge: leverage 0 does not produce ∞/NaN", !/∞|NaN|Infinity/.test(res), res.slice(0, 160));
    // earn
    await go(p, "/uk/earn/");
    const head = async () => txt(await p.locator("main h2").first().innerText());
    for (const coin of ["BTC", "ETH"]) {
      await p.locator("main button").filter({ hasText: new RegExp(`^${coin}$`) }).first().click(); await p.waitForTimeout(250);
      const h = await head();
      check(p, `earn: coin «${coin}» updates the heading`, h.startsWith(coin), h);
    }
    const other = p.locator('main input[placeholder="Інша монета…"]');
    const sugg = other.locator("xpath=following-sibling::div[1]//button");
    await other.fill("TON"); await p.waitForTimeout(250);
    const tonN = await sugg.count();
    info(p, "earn: other coin «TON»", `${tonN} suggestions; Enter → heading «${(await (async () => { await other.press("Enter"); await p.waitForTimeout(200); return head(); })()).slice(0, 40)}»`);
    await other.fill("A"); await p.waitForTimeout(250);
    const sn = await sugg.count();
    check(p, "earn: typing in «Інша монета…» shows suggestions", sn > 0, `${sn}`);
    if (sn) {
      await p.keyboard.press("Escape"); await p.waitForTimeout(100);
      const afterEsc = await sugg.count();
      await p.locator("main h1").click(); await p.waitForTimeout(150);
      const afterOut = await sugg.count();
      check(p, "earn: suggestions close on Esc or outside click", afterEsc === 0 || afterOut === 0, `after Esc ${afterEsc}, after outside click ${afterOut}`);
      await other.fill("A"); await p.waitForTimeout(200);
      const pickT = txt(await sugg.first().innerText()).replace(/\s*\d+$/, "");
      await sugg.first().click(); await p.waitForTimeout(250);
      check(p, `earn: picking suggestion «${pickT}» switches the coin`, (await head()).startsWith(pickT), await head());
    }
    await p.locator("main button").filter({ hasText: /^USDT$/ }).first().click(); await p.waitForTimeout(200);
    const hn = num(await head());
    const offers = await p.locator("main button").filter({ hasText: /Умови й ризики/ }).count();
    info(p, "earn USDT heading vs condition buttons", `heading says ${hn}, ${offers} «Умови й ризики» buttons`);
    // launchpools
    await go(p, "/uk/launchpools/");
    const pc3 = p.locator("main button").filter({ hasText: /^Плюси й ризики/ }).first();
    if (await pc3.count()) {
      const ae0 = await pc3.getAttribute("aria-expanded");
      await pc3.click(); await p.waitForTimeout(150);
      const ae1 = await pc3.getAttribute("aria-expanded");
      check(p, "launchpools «Плюси й ризики» toggles", ae0 !== ae1, `${ae0} → ${ae1}`);
    }
    // ProsCons "Ще N" inside the opened row
    const pcMore = p.locator("main button:visible").filter({ hasText: /^Ще \d+$/ }).first();
    if (await pcMore.count()) {
      const ul = pcMore.locator("xpath=ancestor::div[1]");
      const n0 = await ul.evaluate((e) => e.querySelectorAll("li").length);
      const lbl = txt(await pcMore.innerText());
      await pcMore.click(); await p.waitForTimeout(120);
      const n1 = await ul.evaluate((e) => e.querySelectorAll("li").length);
      check(p, `launchpools pros/cons «${lbl}» shows more items`, n1 > n0 || (await p.locator("main button:visible").filter({ hasText: /^Згорнути$/ }).count()) > 0, `${n0} → ${n1}`);
    } else info(p, "launchpools: no «Ще N» pros/cons toggle visible");
    const arch = p.locator("main details > summary").filter({ hasText: /(Глянути більше|Показати ще)/ }).first();
    if (await arch.count()) {
      const label = txt(await arch.innerText());
      const n = num(label.split("·")[1]);
      const d = arch.locator("xpath=..");
      const visN = () => d.evaluate((e) => [...e.querySelectorAll("tbody tr, li")].filter((x) => x.checkVisibility()).length);
      const before = await visN();
      await arch.click(); await p.waitForTimeout(150);
      const after = await visN();
      check(p, `launchpools «${label}» reveals ${n} more`, await d.evaluate((e) => e.open) && after - before === n, `${before} → ${after} visible rows (label says ${n})`);
    }
    const amt = p.locator("main input").first();
    await p.locator("main button").filter({ hasText: /^\$10\s?000$/ }).first().click(); await p.waitForTimeout(150);
    check(p, "launchpools amount preset $10 000 sets the field", /10\s?000/.test(await amt.inputValue()), await amt.inputValue());
    await p.close();
  });
  await withCtx("phone", async (c) => {
    const p = await newPage(c);
    await go(p, "/uk/dex/");
    for (const t of await p.locator('main button[aria-haspopup="listbox"]').all()) await checkMenuCoverage(p, t, `phone /dex/ «${txt(await t.innerText())}»`);
    const pc = p.locator("main button[aria-expanded]").filter({ hasText: /Умови й ризики/ }).first();
    if (await pc.count()) { await pc.tap(); await p.waitForTimeout(1500); const o = await overflow(p); check(p, "phone /dex/ open pool details: no overflow", o.sw <= 390, JSON.stringify(o)); }
    await go(p, "/uk/hedge/");
    await checkMenuCoverage(p, p.locator('main button[aria-haspopup="listbox"]').first(), "phone /hedge/ pool Select");
    await go(p, "/uk/earn/"); await go(p, "/uk/launchpools/");
    const more = p.locator("main details > summary:visible").filter({ hasText: /Детальніше/ }).first();
    if (await more.count()) {
      await more.tap(); await p.waitForTimeout(150);
      check(p, "phone launchpools «Детальніше: плюси, мінуси, хедж» opens", await more.evaluate((s) => s.parentElement.open));
      const o = await overflow(p); check(p, "phone launchpools details open: no overflow", o.sw <= 390, JSON.stringify(o));
    } else info(p, "phone launchpools: no «Детальніше» details");
    await p.close();
  });
};

S.lists = async () => {
  await withCtx("desk", async (c) => {
    const p = await newPage(c);
    // drops: jump-link counts = headings = items; "Показати ще N"
    await go(p, "/uk/drops/");
    const secs = await p.$$eval("main section[id]", (ss) => ss.map((s) => ({ id: s.id, h: s.querySelector("h2")?.innerText.replace(/\s+/g, " ").trim(), items: s.querySelectorAll("ul > li").length, more: s.querySelector("label.btn")?.innerText.trim() ?? null, hiddenN: [...s.querySelectorAll("ul > li")].filter((l) => getComputedStyle(l).display === "none").length })));
    const nav = await p.$$eval("main nav a", (as) => as.map((a) => ({ h: a.getAttribute("href"), t: a.innerText.replace(/\s+/g, " ").trim() })));
    for (const s of secs) {
      const hn = num(s.h.match(/(\d+)$/)?.[1]);
      check(p, `drops «${s.h.replace(/\s*\d+$/, "")}»: heading count = items`, hn === s.items, `${hn} vs ${s.items}`);
      const link = nav.find((a) => a.h?.endsWith(`#${s.id}`));
      if (link) check(p, `drops jump link «${link.t}» count = section items`, num(link.t.match(/(\d+)$/)?.[1]) === s.items, link.t);
      if (s.more) {
        check(p, `drops «${s.more}» = hidden items`, num(s.more) === s.hiddenN, `${s.more} vs ${s.hiddenN}`);
        await p.locator(`section#${s.id} label.btn`).click(); await p.waitForTimeout(100);
        const hid = await p.$$eval(`section#${s.id} ul > li`, (ls) => ls.filter((l) => getComputedStyle(l).display === "none").length);
        check(p, `drops «${s.more}» toggle shows all`, hid === 0);
      }
    }
    info(p, "drops sections", JSON.stringify(secs.map((s) => [s.id, s.items, s.more])));
    const tabs = await p.$$eval("main nav a", (as) => as.map((a) => a.innerText.trim()));
    info(p, "drops tabs", JSON.stringify(tabs));
    // tokens
    await go(p, "/uk/t/");
    const ts = p.locator('main input[placeholder^="Пошук: SOL"]');
    const TOK = "main a[href*='/t/']:not(nav a)";
    const all0 = await p.locator(TOK).count();
    await ts.fill("usd"); await p.waitForTimeout(200);
    const vis = await p.$$eval(TOK, (as) => as.filter((a) => a.checkVisibility()).map((a) => a.innerText.replace(/\s+/g, " ").trim()));
    check(p, "/t/ search «usd» narrows the token list", vis.length > 0 && vis.length < all0 && vis.every((x) => /usd/i.test(x)), `${all0} → ${vis.length}; e.g. ${vis.slice(0, 4).join(" | ")}`);
    await ts.fill("zzqxj"); await p.waitForTimeout(150);
    const vis0 = await p.$$eval(TOK, (as) => as.filter((a) => a.checkVisibility()).length);
    check(p, "/t/ search no-match shows nothing", vis0 === 0, `${vis0} still visible`);
    info(p, "/t/ search no-match message", ((await p.locator("main").innerText()).match(/Нічого[^\n]*/) ?? ["(no «nothing found» note)"])[0]);
    for (const sym of ["USDT", "XAUT"]) {
      await go(p, `/uk/t/${sym}/`);
      const hs = await p.$$eval("main h2", (els) => els.map((h) => { const sec = h.closest("section") ?? h.parentElement?.parentElement; return { h: h.innerText.replace(/\s+/g, " ").trim(), items: sec ? (Math.max(sec.querySelectorAll("li, a.card, article").length, sec.querySelectorAll("tbody tr").length) || (h.nextElementSibling?.children.length ?? 0)) : 0 }; }));
      for (const h of hs.filter((x) => /\d+$/.test(x.h))) check(p, `/t/${sym}/ «${h.h.replace(/\s*\d+$/, "")}»: count = items`, num(h.h.match(/(\d+)$/)?.[1]) === h.items, `${h.h.match(/(\d+)$/)?.[1]} vs ${h.items}`);
    }
    // venues
    for (const v of ["binance", "bybit"]) {
      await go(p, `/uk/v/${v}/`);
      await p.waitForTimeout(500);
      const want = FEED.promos.filter((x) => x.venue.id === v && geoAllowed(x, "ua")).length;
      const ci = await chipInfo(p);
      check(p, `/v/${v}/ «Усі» = this exchange's promos`, num(ci[0]?.t) === want, `${ci[0]?.t} vs feed ${want}`);
      const l = await allCardsMapped(p);
      check(p, `/v/${v}/ every card is from ${v}`, l.length === want && l.every((x) => x.p?.venue.id === v), `${l.length} cards, others: ${l.filter((x) => x.p?.venue.id !== v).length}`);
      await openFilters(p);
      const kt = await p.$$eval('[role=group][aria-label="Тип"] button', (els) => els.map((e) => e.innerText.replace(/\s+/g, " ").trim()));
      info(p, `/v/${v}/ type tabs`, JSON.stringify(kt));
      await p.fill(SEARCH, "usdt"); await p.waitForTimeout(200);
      const sv = await allCardsMapped(p);
      check(p, `/v/${v}/ search works inside the venue page`, sv.every((x) => x.p?.venue.id === v), `${sv.length}`);
      await resetFeed(p);
    }
    // LP pages: "Скільки можна заробити" is a static table ($100 / $1 000 / max per person) — check it is consistent
    for (const sl of await lpSample()) {
      await go(p, `/uk/lp/${sl}/`);
      const inputs = await p.locator("main input").count();
      if (inputs) info(p, `/lp/${sl}/ calculator inputs`, `${inputs}`); else info(p, `/lp/${sl}/ has no calculator inputs`, "earnings are a static table: $100 / $1 000 / max per person");
      const rows = await p.$$eval("main section", (ss) => { const s = ss.find((x) => /Скільки можна заробити/.test(x.querySelector("h2")?.innerText ?? "")); return s ? [...s.querySelectorAll("tbody tr")].map((tr) => [...tr.children].map((td) => td.innerText.replace(/\s+/g, " ").trim())) : null; });
      if (!rows) { info(p, `/lp/${sl}/ no earnings table (pool ended?)`); continue; }
      const usd = (t) => { const m = /≈\s*\$([\d\s ,.]+)/.exec(t ?? ""); return m ? Number(m[1].replace(/[\s ]/g, "").replace(",", ".")) : NaN; };
      const bad = rows.filter((r) => { const x = usd(r[1]), y = usd(r[2]); return Number.isFinite(x) && Number.isFinite(y) && (y < x || y > x * 12.5 + 0.02); }); // amounts are rounded to cents
      check(p, `/lp/${sl}/ earnings table: $1 000 column between 1× and 10× the $100 column`, rows.length > 0 && bad.length === 0, JSON.stringify(bad.length ? bad.slice(0, 2) : rows.slice(0, 2)));
    }
    // history
    await go(p, "/uk/history/");
    const hb = p.locator("main button").filter({ hasText: /→.*·/ });
    const hn = await hb.count();
    if (hn > 1) {
      const chart = () => p.evaluate(() => [...document.querySelectorAll("main svg")].filter((s) => s.getBoundingClientRect().width > 100).map((s) => s.querySelectorAll("path,polyline").length).join(","));
      const c0 = await chart();
      await hb.nth(1).click(); await p.waitForTimeout(250);
      const c1 = await chart();
      check(p, "/history/ picking a pool shows only that line", c1 !== c0 && (await hb.nth(1).getAttribute("aria-pressed")) === "true", `paths per chart ${c0} → ${c1}`);
      await hb.nth(1).click(); await p.waitForTimeout(150);
      check(p, "/history/ picking it again restores all lines", (await chart()) === c0);
      const chipsH = p.locator("main button.chip").filter({ hasText: /^(VLX|KOR|XAUT)$/ });
      if (await chipsH.count()) { const t = txt(await chipsH.first().innerText()); await chipsH.first().click(); await p.waitForTimeout(150); const vis2 = await p.$$eval("main button", (bs) => bs.filter((b) => /→.*·/.test(b.innerText) && b.checkVisibility()).map((b) => b.innerText.trim().split(/\s/)[0])); check(p, `/history/ coin chip «${t}» filters pools`, vis2.length > 0 && vis2.every((x) => x === t), JSON.stringify(vis2)); }
    }
    // insights
    await go(p, "/uk/insights/");
    const cb = p.locator("main input[type=checkbox]").first();
    if (await cb.count()) { const before = txt(await p.locator("main").innerText()).length; await cb.check({ force: true }); await p.waitForTimeout(200); const after = txt(await p.locator("main").innerText()).length; check(p, "/insights/ checkbox changes the view", before !== after || (await cb.isChecked()), `${before} → ${after}`); }
    // best
    await go(p, "/uk/best/");
    const bi = p.locator("main input").first();
    const b0 = txt(await p.locator("main").innerText());
    await p.locator("main button").filter({ hasText: /^\$10\s?000$/ }).first().click(); await p.waitForTimeout(150);
    const b1 = txt(await p.locator("main").innerText());
    check(p, "/best/ amount preset updates the numbers", b0 !== b1 && /10\s?000/.test(await bi.inputValue()), await bi.inputValue());
    // bonuses
    await go(p, "/uk/bonuses/");
    const bl = await p.$$eval("main a[href]", (as) => as.map((a) => a.getAttribute("href")));
    const deadB = bl.filter((h) => h.includes("/p/") && !promoOf(h));
    check(p, "/bonuses/ promo links point at existing promos", deadB.length === 0, `${bl.filter((h) => h.includes("/p/")).length} links; dead ${deadB.slice(0, 3).join(", ")}`);
    await p.close();
  });
};

S.check = async () => {
  for (const kind of ["desk", "phone"]) {
    await withCtx(kind, async (c) => {
      const p = await newPage(c);
      await go(p, "/uk/check/");
      const inp = p.locator("main form input");
      const res = async (q) => { await inp.fill(q); await p.locator("main form button[type=submit]").click(); await p.waitForTimeout(200); return txt(await p.locator("main form + div").innerText().catch(() => "")); };
      const cases = [
        ["https://www.binance.com/uk-UA/activity", /Офіційний сайт Binance/],
        ["bybit.com", /Офіційний сайт Bybit/],
        ["binance-com.top", /НЕ офіційний сайт|Підозріла/],
        ["https://binanse.com/login", /НЕ офіційний сайт|Підозріла/],
        ["http://www.okx.com", /Офіційний сайт OKX.*без https/],
        ["@binance_announcements", /Офіційний Telegram-канал Binance/],
        ["asdf qwer", /не схоже на посилання/],
        ["example.org", /немає в нашому списку/],
        ["xn--bnance-bwa.com", /НЕ офіційний|Підозріла/],
      ];
      for (const [q, re] of cases) { const r = await res(q); check(p, `link checker «${q}» → verdict`, re.test(r), r.slice(0, 140)); }
      await inp.fill(""); await p.waitForTimeout(100);
      check(p, "link checker: clearing the field removes the verdict", (await p.locator("main form + div").count()) === 0 || !(await p.locator("main form + div").innerText()).includes("Офіційн"));
      await p.close();
    });
  }
};

S.learn = async () => {
  await withCtx("desk", async (c) => {
    const p = await newPage(c);
    await go(p, "/uk/learn/");
    const prog = async () => txt(await p.locator("main").innerText()).match(/Пройдено \d+ з \d+/)?.[0];
    const nextCard = async () => p.$$eval("main a.card", (as) => as.map((a) => ({ h: a.getAttribute("href"), next: a.innerText.includes("Наступний крок"), done: a.innerText.includes("✓ Пройдено") })));
    check(p, "learn hub progress «Пройдено 0 з 7»", (await prog()) === "Пройдено 0 з 7", await prog());
    let nc = await nextCard();
    check(p, "learn hub highlights the first card as next step", nc[0]?.next && nc.filter((x) => x.next).length === 1, JSON.stringify(nc.map((x) => x.next)));
    // start: tick all
    await go(p, "/uk/learn/start/");
    const marks = p.locator("main button").filter({ hasText: "Позначити як зроблене" });
    const total = await marks.count();
    for (let i = 0; i < total; i++) { await marks.first().click(); await p.waitForTimeout(60); }
    const doneTxt = txt(await p.locator("main").innerText()).match(/Виконано \d+ з \d+/)?.[0];
    check(p, `learn/start: ticking all ${total} steps → «Виконано ${total} з ${total}»`, doneTxt === `Виконано ${total} з ${total}`, doneTxt);
    await p.reload(); await settle(p);
    // r2: the ticks come from localStorage after hydration (~0.5–1 s after load) — wait for it instead of reading the static HTML
    await p.waitForFunction((n) => document.querySelectorAll("main button[aria-pressed=true]").length === n, total, { timeout: 6000 }).catch(() => {});
    check(p, "learn/start ticks persist after reload", (await p.locator("main button[aria-pressed=true]").count()) === total, `${await p.locator("main button[aria-pressed=true]").count()} of ${total}`);
    await p.locator("main button[aria-pressed=true]").first().click(); await p.waitForTimeout(80);
    check(p, "learn/start: un-ticking a step works", (await p.locator("main button[aria-pressed=true]").count()) === total - 1);
    await p.locator("main button[aria-pressed=false]").first().click(); await p.waitForTimeout(80);
    await go(p, "/uk/learn/");
    nc = await nextCard();
    const startCard = nc.find((x) => /\/learn\/start\/?$/.test(x.h ?? ""));
    check(p, "learn hub: Start marked done after all steps ticked", !!startCard?.done, JSON.stringify(startCard));
    check(p, "learn hub progress «Пройдено 1 з 7» after Start", (await prog()) === "Пройдено 1 з 7", await prog());
    check(p, "learn hub: next-step highlight moved past Start", !startCard?.next && nc.filter((x) => x.next).length === 1, JSON.stringify(nc.map((x) => [x.h?.split("/").slice(-2, -1)[0], x.next, x.done])));
    // quiz
    await go(p, "/uk/learn/quiz/");
    let steps = 0;
    for (; steps < 10; steps++) {
      const opts = p.locator("main .card button");
      if (!(await opts.count())) break;
      await opts.first().click(); await p.waitForTimeout(150);
    }
    const qRes = txt(await p.locator("main").innerText());
    check(p, `learn/quiz: finishing ${steps} questions shows a result`, /Пройти ще раз|Ще раз|↺/.test(qRes) && (await p.evaluate(() => localStorage.getItem("pr:learn:quiz"))) === "1", qRes.slice(0, 200));
    const picks = await p.$$eval("main a.card", (as) => as.map((a) => ({ h: a.getAttribute("href"), t: a.innerText.replace(/\s+/g, " ").slice(0, 60) })));
    check(p, "learn/quiz result recommends something", picks.length > 0, JSON.stringify(picks.slice(0, 3)));
    const badPick = picks.filter((x) => x.h?.startsWith(BP) && x.h.includes("/p/") && !promoOf(x.h));
    check(p, "learn/quiz picks link to existing pages", badPick.length === 0, badPick.map((x) => x.h).join(","));
    const again = p.locator("main button").filter({ hasText: "↺" });
    if (await again.count()) { await again.click(); await p.waitForTimeout(100); check(p, "learn/quiz «↺ again» restarts", (await p.locator("main .card button").count()) > 0); }
    await go(p, "/uk/learn/");
    nc = await nextCard();
    check(p, "learn hub: Quiz marked done", !!nc.find((x) => /quiz/.test(x.h ?? ""))?.done, JSON.stringify(nc.find((x) => /quiz/.test(x.h ?? ""))));
    // other learn pages count as seen
    for (const s of ["how", "rewards", "safety", "glossary"]) await go(p, `/uk/learn/${s}/`);
    await go(p, "/uk/learn/");
    info(p, "learn hub progress after visiting how/rewards/safety/glossary", `${await prog()} ; ${JSON.stringify((await nextCard()).map((x) => [x.h?.split("/").filter(Boolean).pop(), x.done ? "done" : x.next ? "NEXT" : "-"]))}`);
    // guide page steps
    await go(p, "/uk/learn/guide/binance/");
    const gm = p.locator("main button").filter({ hasText: "Позначити як зроблене" });
    const gn = await gm.count();
    if (gn) { await gm.first().click(); await p.waitForTimeout(80); await p.reload(); await settle(p); check(p, "guide page step tick persists", (await p.locator("main button[aria-pressed=true]").count()) === 1); }
    await go(p, "/uk/learn/how/");
    const hm = p.locator("main button").filter({ hasText: "Позначити як зроблене" });
    if (await hm.count()) { await hm.first().click(); await p.waitForTimeout(80); const t = txt(await p.locator("main").innerText()).match(/Виконано 1 з \d+/)?.[0]; check(p, "learn/how step tick updates progress", !!t, t); }
    await p.close();
  });
};

S.misc = async () => {
  await withCtx("desk", async (c) => {
    const p = await newPage(c);
    await go(p, "/uk/tools/", { wait: 1500 });
    check(p, "/uk/tools/ redirects to /uk/", rel(p.url()) === "/uk/", rel(p.url()));
    await go(p, "/en/tools/", { wait: 1500 });
    check(p, "/en/tools/ redirects to /en/", rel(p.url()) === "/en/", rel(p.url()));
    for (const s of ["about", "api", "privacy", "terms"]) {
      await go(p, `/uk/${s}/`);
      const h1 = txt(await p.locator("h1").first().innerText().catch(() => ""));
      check(p, `/uk/${s}/ renders a heading`, h1.length > 2, h1);
    }
    await go(p, "/uk/api/");
    const api = await p.$$eval("main a[href]", (as) => [...new Set(as.map((a) => a.href))].filter((h) => h.includes("/api/")));
    for (const h of api.slice(0, 6)) { const r = await p.request.get(h).catch(() => null); check(p, `/api/ link ${rel(h)} responds`, r?.status() === 200, `HTTP ${r?.status()}`); }
    const r404 = await p.request.get(`${BASE}/uk/p/does-not-exist/`);
    check(p, "unknown promo URL returns 404", r404.status() === 404, `HTTP ${r404.status()}`);
    const q = await c.newPage(); q._vp = p._vp; // not instrumented: this 404 is expected
    await q.goto(`${BASE}/uk/p/does-not-exist/`, { waitUntil: "domcontentloaded" }); await settle(q); await q.waitForTimeout(800);
    const t404 = txt(await q.locator("body").innerText());
    check(q, "404 page leads back to the site", /PromoRadar/.test(t404) && (await q.locator("a[href]").count()) > 1, `${rel(q.url())}: ${t404.slice(0, 100)}`);
    await q.close();
    await p.close();
  });
};

const SWEEP = ["/uk/", "/uk/drops/", "/uk/t/", "/uk/t/USDT/", "/uk/t/XAUT/", "/uk/bonuses/", "/uk/v/binance/", "/uk/v/bybit/", "/uk/launchpools/", "/uk/earn/", "/uk/dex/", "/uk/fixed/", "/uk/history/", "/uk/insights/", "/uk/hedge/",
  "/uk/calendar/", "/uk/unlocks/", "/uk/sales/", "/uk/learn/", "/uk/learn/start/", "/uk/learn/quiz/", "/uk/learn/how/", "/uk/learn/rewards/", "/uk/learn/safety/", "/uk/learn/glossary/",
  "/uk/learn/guide/binance/", "/uk/learn/guide/pendle-pt/", "/uk/best/", "/uk/check/", "/uk/my/", "/uk/about/", "/uk/api/", "/uk/privacy/", "/uk/terms/", "/en/", "/ru/", "/en/unlocks/", "/ru/fixed/"];
S.sweep = async () => {
  for (const kind of ["phone", "desk"]) {
    await withCtx(kind, async (c) => {
      const p = await newPage(c);
      const extra = [];
      await go(p, "/uk/"); await feedReady(p);
      for (const x of (await cards(p)).slice(0, 3)) extra.push(x.href.replace(BP, ""));
      for (const u of [...SWEEP, ...(await lpSample()).map((sl) => `/uk/lp/${sl}/`), ...extra]) { try { await go(p, u); } catch (e) { log(p, "pageerror", `navigation: ${e.message.slice(0, 120)}`); } }
      await p.close();
    });
  }
};

// ================================================================ round 2 sections (i18n tablet edge keyboard promo10 check2 counters)
// Localised UI strings (src/lib/i18n.ts, i18n-tools.ts, PromoExplorer GX/HID, MyBoard F, TableTools, LinkCheck)
const LX = {
  uk: { search: "Пошук: токен", sort: "Сортувати", cat: "Категорія", filt: "Фільтри", all: "Усі", type: "Тип", status: "Будь-який статус", country: "Країна", reset: "Скинути",
    save: "Зберегти", unsave: "Прибрати зі збережених", hide: "Приховати", unhide: "Повернути в стрічку", more: /^Показати ще \d+/, empty: "Нічого не знайдено",
    sorts: ["Найвигідніші", "Нові", "Скоро завершуються", "Найбільша винагорода", "Більше на 1 людину", "Найменший поріг"], statuses: ["Будь-який статус", "Триває", "Скоро старт", "Закінчується"],
    quick: { noDeposit: "Без вкладень" }, copy: "Копіювати посилання", copied: "Скопійовано", hid: "Ви приховали", back: "Усі акції", join: "Взяти участь",
    shown: "з", tSearch: "Пошук", calAdd: "Додати в календар", myEmpty: "Поки нічого не збережено", mySort: "Сортування", myVenue: "Біржа", myAll: "Усі",
    st: { saved: "Збережено", joined: "Беру участь", done: "Завершено", skipped: "Пропустив" }, quizResult: "Вам підходить", quizAgain: "Пройти ще раз", tNone: "Нічого не знайдено" },
  en: { search: "Search: token", sort: "Sort", cat: "Category", filt: "Filters", all: "All", type: "Type", status: "Any status", country: "Country", reset: "Reset",
    save: "Save", unsave: "Remove from saved", hide: "Hide", unhide: "Show in the feed again", more: /^Show \d+/, empty: "Nothing found",
    sorts: ["Best value", "Newest", "Ending soon", "Biggest reward", "Most per person", "Lowest entry"], statuses: ["Any status", "Live", "Starting soon", "Ending soon"],
    quick: { noDeposit: "No deposit" }, copy: "Copy link", copied: "Copied", hid: "You hid", back: "All promos", join: "Join",
    shown: "of", tSearch: "Search", calAdd: "Add to calendar", myEmpty: "Nothing saved yet", mySort: "Sort", myVenue: "Exchange", myAll: "All",
    st: { saved: "Saved", joined: "Joined", done: "Done", skipped: "Skipped" }, quizResult: "Good fit for you", quizAgain: "Retake", tNone: "Nothing found" },
  ru: { search: "Поиск: токен", sort: "Сортировать", cat: "Категория", filt: "Фильтры", all: "Все", type: "Тип", status: "Любой статус", country: "Страна", reset: "Сбросить",
    save: "Сохранить", unsave: "Убрать из сохранённых", hide: "Скрыть", unhide: "Вернуть в ленту", more: /^Показать ещё \d+/, empty: "Ничего не найдено",
    sorts: ["Самые выгодные", "Новые", "Скоро завершатся", "Крупнейшая награда", "Больше на 1 человека", "Наименьший порог"], statuses: ["Любой статус", "Идёт", "Скоро старт", "Заканчивается"],
    quick: { noDeposit: "Без вложений" }, copy: "Копировать ссылку", copied: "Скопировано", hid: "Вы скрыли", back: "Все акции", join: "Участвовать",
    shown: "из", tSearch: "Поиск", calAdd: "Добавить в календарь", myEmpty: "Пока ничего не сохранено", mySort: "Сортировка", myVenue: "Биржа", myAll: "Все",
    st: { saved: "Сохранено", joined: "Участвую", done: "Завершено", skipped: "Пропустил" }, quizResult: "Вам подходит", quizAgain: "Пройти ещё раз", tNone: "Ничего не найдено" },
};
// Ukrainian UI words that must not show on /en/ or /ru/ pages (titles of promos are excluded from the scan)
const UK_UI = ["Взяти участь", "Умови та як взяти участь", "Завершиться через", "Оцінка", "Максимум на 1 людину", "поріг від", "Опубліковано", "Показати ще", "Скинути", "Фільтри",
  "Нічого не знайдено", "Зберегти", "Приховати", "Країна", "Без вкладень", "Для нових", "Реферальна", "Змагання", "Розіграші та інше", "Що зробити", "Ключові факти", "Умови та правила", "Поділитися"];
// whole word: «Реферальна» must not match ru «Реферальная»
const ukWord = (w) => new RegExp(`(^|[^а-яА-ЯіїєґІЇЄҐёЁ'’])${w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(?![а-яА-ЯіїєґІЇЄҐёЁ'’])`);
const sortSelL = (L) => `button[aria-haspopup="listbox"][aria-label="${L.sort}"]`;
const searchSelL = (L) => `input[placeholder^="${L.search}"]`;
const chipsL = (p, L) => p.locator(`[role=group][aria-label="${L.cat}"] button.chip`);
const chipInfoL = (p, L) => p.$$eval(`[role=group][aria-label="${L.cat}"] button.chip`, (els) => els.map((e) => ({ t: e.innerText.replace(/\s+/g, " ").trim(), on: e.getAttribute("aria-pressed") })));
const filtersBtnL = (p, L) => p.locator("main button[aria-expanded]").filter({ hasText: new RegExp(`^${L.filt}`) }).first();
async function openFiltersL(p, L) { const b = filtersBtnL(p, L); if ((await b.getAttribute("aria-expanded")) !== "true") await b.click(); await p.waitForTimeout(150); }
const moreBtnL = (p, L) => p.locator("main button").filter({ hasText: L.more });
async function feedReadyL(p, L) {
  await p.waitForFunction((all) => { const b = [...document.querySelectorAll("button.chip")].find((x) => x.innerText.trim().startsWith(all + " ") || x.innerText.trim().startsWith(all + "\n")); return b && Number(b.innerText.replace(/\D+/g, "")) > 27; }, L.all, { timeout: 20000 }).catch(() => {});
  await p.waitForTimeout(300);
}
async function expandAllL(p, L) {
  for (let i = 0, stuck = 0; i < 40 && stuck < 4; i++) {
    const b = moreBtnL(p, L); if (!(await b.count())) return;
    const n = await p.locator("article.card").count();
    await b.first().click(); await p.waitForTimeout(150);
    if ((await p.locator("article.card").count()) === n) { stuck++; await p.waitForTimeout(500); }
  }
}
async function cardsL(p, L) {
  return p.$$eval("article.card", (els, L) => els.map((a) => {
    const h = a.querySelector("h3 a");
    return { href: h?.getAttribute("href") ?? "", title: h?.textContent.trim() ?? "", venue: a.querySelector(".text-sm.font-bold")?.textContent.trim() ?? "",
      cat: a.querySelector("span.whitespace-nowrap")?.textContent.trim() ?? "", pin: a.querySelector(":scope > span.absolute")?.textContent.trim() ?? null,
      val: a.querySelector("div.mb-2")?.textContent.trim() ?? null, save: a.querySelector(`button[aria-label="${L.save}"], button[aria-label="${L.unsave}"]`)?.getAttribute("aria-pressed") ?? null, text: a.innerText };
  }), L);
}
async function allCardsL(p, L) { await expandAllL(p, L); return (await cardsL(p, L)).map((c) => ({ ...c, p: promoOf(c.href) })); }
/** text of <main> without promo titles / rules (what the site itself writes) */
async function uiText(p) {
  return p.evaluate(() => {
    const m = document.querySelector("main")?.cloneNode(true); if (!m) return "";
    m.querySelectorAll("h1, h3, #rules, [lang], blockquote, .line-clamp-2, .line-clamp-3, article h3, a[href*='/p/'] .font-bold").forEach((x) => x.remove());
    return m.textContent.replace(/\s+/g, " ");
  });
}
/** wait until React has hydrated the element (its props are attached), so a click is handled */
async function hydrated(p, sel, ms = 8000) { await p.waitForFunction((s) => { const e = document.querySelector(s); return !!e && Object.keys(e).some((k) => k.startsWith("__reactProps")); }, sel, { timeout: ms }).catch(() => {}); }
async function active(p) {
  return p.evaluate(() => {
    const e = document.activeElement; if (!e) return null;
    const r = e.getBoundingClientRect(); const cs = getComputedStyle(e);
    return { tag: e.tagName, role: e.getAttribute("role"), label: e.getAttribute("aria-label"), text: (e.innerText || e.value || "").trim().replace(/\s+/g, " ").slice(0, 60),
      pressed: e.getAttribute("aria-pressed"), expanded: e.getAttribute("aria-expanded"), href: e.getAttribute("href"), inCard: !!e.closest("article.card"),
      inQuiz: !!e.closest("main .card") && e.tagName === "BUTTON", visible: r.width > 0 && r.height > 0 && !!e.checkVisibility?.(), ring: cs.outlineStyle !== "none" && parseFloat(cs.outlineWidth) > 0 || /rgb/.test(cs.boxShadow) && cs.boxShadow !== "none" };
  });
}
async function tabUntil(p, pred, max = 120, key = "Tab") { for (let i = 1; i <= max; i++) { await p.keyboard.press(key); await p.waitForTimeout(15); const a = await active(p); if (a && pred(a)) return i; } return -1; }
function rng(seedStr) { let a = Number.parseInt(hash(String(seedStr)), 36) >>> 0; return () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
let SITEMAP = null;
/** Two launchpool pages that exist in this build: a live one and an ended one when there is (ended pools are kept 14 days,
 *  so hard-coded slugs age out — gate-555 / bitget-1500675644365795328 did, 21.11). */
let LPS;
async function lpSample() {
  if (LPS) return LPS;
  const paths = new Set((await sitemapPaths()).filter((u) => /^\/uk\/lp\/[^/]+\/$/.test(u)).map((u) => u.split("/")[3]));
  const d = await (await fetch(`${BASE}/api/pools.json?ts=${Date.now()}`)).json().catch(() => ({ projects: [] }));
  const slug = (id) => id.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  const live = (d.projects ?? []).find((x) => x.status !== "ended" && paths.has(slug(x.id)));
  const ended = (d.projects ?? []).find((x) => x.status === "ended" && paths.has(slug(x.id)));
  LPS = [live, ended].filter(Boolean).map((x) => slug(x.id));
  if (!LPS.length) LPS = [...paths].slice(0, 2);
  return LPS;
}
async function livePools() {
  const paths = new Set((await sitemapPaths()).filter((u) => /^\/uk\/lp\/[^/]+\/$/.test(u)).map((u) => u.split("/")[3]));
  const d = await (await fetch(`${BASE}/api/pools.json?ts=${Date.now()}`)).json().catch(() => ({ projects: [] }));
  const slug = (id) => id.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  return (d.projects ?? []).filter((x) => x.status !== "ended").map((x) => slug(x.id)).filter((x) => paths.has(x));
}
async function sitemapPaths() {
  if (SITEMAP) return SITEMAP;
  const x = await (await fetch(`${BASE}/sitemap.xml?ts=${Date.now()}`)).text();
  SITEMAP = [...x.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1].replace(ORIGIN, "").replace(BP, ""));
  return SITEMAP;
}
const promoPath = async (pr, lang = "uk") => (await sitemapPaths()).find((u) => u.startsWith(`/${lang}/p/${hash(pr.id)}-`));
const usdLike = /^(\$|USD|USDT|USDC|FDUSD|USD1|USDE|DAI|PYUSD|RLUSD)$/i;
/** "до 6 000 USDT", "$100K", "1,000 USDT", "≈ $1.3" → USD or NaN (only dollar-like units) */
function usdOfText(s) {
  if (!s) return NaN;
  const t = s.replace(/ | /g, " ");
  let m = /\$\s?([\d.,\s]+)\s?([KMB])?\b/.exec(t);
  if (m) return Number(m[1].replace(/[\s,]/g, "")) * ({ K: 1e3, M: 1e6, B: 1e9 }[m[2]] ?? 1);
  m = /([\d][\d.,\s]*)\s?([KMB])?\s+(USDT|USDC|USD1?|FDUSD|USDE|DAI)\b/i.exec(t);
  if (m) return Number(m[1].replace(/\s/g, "").replace(/,(?=\d{3}\b)/g, "").replace(",", ".")) * ({ K: 1e3, M: 1e6, B: 1e9 }[m[2]?.toUpperCase()] ?? 1);
  return NaN;
}
const LINKS = new Map(); // same-origin link status cache
async function sameOriginStatus(p, abs) {
  const u = abs.split("#")[0];
  if (LINKS.has(u)) return LINKS.get(u);
  const r = await p.request.get(u, { maxRedirects: 0, timeout: 20000 }).catch((e) => ({ status: () => `ERR ${e.message.slice(0, 40)}`, headers: () => ({}) }));
  const st = r.status(); const v = { st, loc: st >= 300 && st < 400 ? r.headers().location : undefined };
  LINKS.set(u, v); return v;
}

S.i18n = async () => {
  for (const lang of ["en", "ru"]) {
    const L = LX[lang];
    const SRT = sortSelL(L), SRCH = searchSelL(L);
    await withCtx("desk", async (c) => {
      const p = await newPage(c);
      await go(p, `/${lang}/`); await feedReadyL(p, L);
      check(p, `${lang} home: <html lang="${lang}">`, (await p.evaluate(() => document.documentElement.lang)) === lang, await p.evaluate(() => document.documentElement.lang));
      let ci = await chipInfoL(p, L);
      check(p, `${lang} home: chip «${L.all}» = every promo (country «Any» is the default outside /uk/)`, num(ci[0]?.t) === FEED.promos.length, `${ci[0]?.t} vs feed ${FEED.promos.length}`);
      check(p, `${lang} home: default sort «${L.sorts[0]}»`, txt(await p.locator(SRT).innerText().catch(() => "")) === L.sorts[0], await p.locator(SRT).innerText().catch(() => "no sort Select"));
      const so = await selOptions(p, p.locator(SRT));
      check(p, `${lang} home: sort options translated`, JSON.stringify(so) === JSON.stringify(L.sorts), JSON.stringify(so));
      let cs = await cardsL(p, L);
      check(p, `${lang} home: 9 cards on the first screen, «show more» present`, cs.length === 9 && (await moreBtnL(p, L).count()) === 1, `${cs.length} cards`);
      const pins = todayPins(FEED.promos, FEED.fetchedAt);
      check(p, `${lang} home: pinned top-3 = today's picks`, JSON.stringify(cs.slice(0, 3).map((x) => promoOf(x.href)?.id)) === JSON.stringify(pins) && cs.slice(0, 3).every((x) => x.pin), JSON.stringify(cs.slice(0, 3).map((x) => [promoOf(x.href)?.id, x.pin])));
      const ui = await uiText(p);
      const leak = UK_UI.filter((w) => ukWord(w).test(ui));
      check(p, `${lang} home: no Ukrainian UI strings`, leak.length === 0, leak.join(", "));
      if (lang === "ru") { const m = ui.match(/[^\s]*[іїєґІЇЄҐ][^\s]*/g) ?? []; check(p, "ru home: no Ukrainian-only letters (і ї є ґ) in the interface text", m.length === 0, [...new Set(m)].slice(0, 8).join(" ")); }
      if (lang === "en") { const m = ui.match(/[^\s]*[а-яА-ЯіїєґІЇЄҐ]{3,}[^\s]*/g) ?? []; check(p, "en home: no Cyrillic words in the interface text", m.length === 0, [...new Set(m)].slice(0, 8).join(" ")); }
      // search (synonyms work in every language)
      const sset = async (q) => { await p.fill(SRCH, q); await p.waitForTimeout(250); return (await allCardsL(p, L)).map((x) => x.href).sort(); };
      const a1 = await sset("airdrop"), a2 = await sset(lang === "ru" ? "аирдроп" : "Airdrop"), a3 = await sset("айрдроп");
      check(p, `${lang} home: search «airdrop» = «${lang === "ru" ? "аирдроп" : "Airdrop"}» = «айрдроп»`, a1.length > 0 && JSON.stringify(a1) === JSON.stringify(a2) && JSON.stringify(a2) === JSON.stringify(a3), `${a1.length}/${a2.length}/${a3.length}`);
      await p.fill(SRCH, "zzqxjw"); await p.waitForTimeout(250);
      check(p, `${lang} home: search with no match → «${L.empty}…»`, (await p.locator("article.card").count()) === 0 && (await p.locator("main").innerText()).includes(L.empty));
      await p.fill(SRCH, ""); await p.waitForTimeout(250);
      // two category chips
      ci = await chipInfoL(p, L);
      for (const i of [1, 2]) {
        if (!ci[i]) continue;
        await chipsL(p, L).nth(i).click(); await p.waitForTimeout(150);
        const want = Number(ci[i].t.match(/\d+$/)?.[0]); const label = ci[i].t.replace(/\s*\d+$/, "");
        const l = await allCardsL(p, L);
        // the 0% fee chip (owner 16.11) gathers zero-fee offers from every category
        const zf = /^0%/.test(label); const bad = l.filter((x) => (zf ? !x.p?.meta?.zeroFee : x.cat !== label && !(/^0%/.test(x.cat ?? "") && x.p?.category === "other")));
        check(p, `${lang} chip «${label}»: ${want} = cards, all of that category`, l.length === want && bad.length === 0, `${l.length} cards, wrong ${bad.length}`);
      }
      await chipsL(p, L).nth(0).click(); await p.waitForTimeout(150);
      // sort «Newest»
      await selPick(p, p.locator(SRT), L.sorts[1]);
      const nl = (await allCardsL(p, L)).map((x) => x.p).filter(Boolean).filter((x) => !x.meta?.thin);
      const br = firstBreak(nl, (a, b) => (b.publishedAt > a.publishedAt ? 1 : 0));
      check(p, `${lang} sort «${L.sorts[1]}» orders by date and syncs ?sort=newest`, br === -1 && new URL(p.url()).searchParams.get("sort") === "newest", br === -1 ? rel(p.url()) : `break at ${br}`);
      await selPick(p, p.locator(SRT), L.sorts[0]);
      // filters panel: status «Live» (= live + ongoing), quick «No deposit»
      await openFiltersL(p, L);
      const stTrig = p.locator(`button[aria-haspopup="listbox"][aria-label="${L.status}"]`);
      const stO = await selOptions(p, stTrig);
      check(p, `${lang} status options translated`, JSON.stringify(stO) === JSON.stringify(L.statuses), JSON.stringify(stO));
      await selPick(p, stTrig, L.statuses[1]);
      const now = Date.now();
      const live = await allCardsL(p, L);
      const wantLive = FEED.promos.filter((x) => ["live", "ongoing"].includes(statusOf(x, now))).length;
      check(p, `${lang} status «${L.statuses[1]}»: count = live + ongoing promos`, live.length === wantLive && live.every((x) => x.p && ["live", "ongoing"].includes(statusOf(x.p, now))), `${live.length} vs feed ${wantLive}`);
      await selPick(p, stTrig, L.statuses[0]);
      const qb = p.locator("main button[aria-pressed]").filter({ hasText: new RegExp(`^${L.quick.noDeposit}$`) }).first();
      await qb.click(); await p.waitForTimeout(200);
      const nd = await allCardsL(p, L);
      const wantNd = FEED.promos.filter((x) => x.meta?.noDeposit).length;
      check(p, `${lang} quick «${L.quick.noDeposit}»: ${wantNd} cards`, nd.length === wantNd && nd.every((x) => x.p?.meta?.noDeposit), `${nd.length}`);
      await qb.click(); await p.waitForTimeout(150);
      await p.locator("main button.chip").filter({ hasText: L.reset }).first().click().catch(() => {}); await p.waitForTimeout(200);
      // save + hide
      await p.locator("article.card").nth(3).locator(`button[aria-label="${L.save}"]`).click(); await p.waitForTimeout(150);
      const c4 = (await cardsL(p, L))[3]; const c5 = (await cardsL(p, L))[4];
      check(p, `${lang} ☆ save on a card → aria-pressed + header ★ 1`, c4.save === "true" && /1/.test(txt(await p.locator(`header a[href="${BP}/${lang}/my/"]`).innerText().catch(() => ""))), `${c4.save}`);
      await p.locator("article.card").nth(4).locator(`button[aria-label="${L.hide}"]`).click(); await p.waitForTimeout(250);
      check(p, `${lang} hide → card gone + «${L.hid}: 1» line`, !(await cardsL(p, L)).some((x) => x.href === c5.href) && (await p.locator("main p").filter({ hasText: `${L.hid}` }).count()) === 1);
      // promo page (first non-teaser card)
      const target = (await cardsL(p, L)).find((x) => !promoOf(x.href)?.meta?.thin) ?? cs[0];
      const ppath = target.href.replace(BP, "");
      await go(p, ppath);
      check(p, `${lang} promo page: <html lang> and URL stay in ${lang}`, (await p.evaluate(() => document.documentElement.lang)) === lang && rel(p.url()).startsWith(`/${lang}/p/`), rel(p.url()));
      const cta = await p.$$eval("a.btn-primary", (els) => els.map((e) => ({ t: e.innerText.trim(), h: e.getAttribute("href"), tg: e.getAttribute("target"), rel: e.getAttribute("rel") })));
      check(p, `${lang} promo page: CTA «${L.join} ↗» opens the organiser in a new tab`, !!cta[0] && cta[0].t.startsWith(L.join) && /^https:\/\//.test(cta[0].h) && cta[0].tg === "_blank" && /noopener/.test(cta[0].rel ?? ""), JSON.stringify(cta[0]));
      const pui = await uiText(p);
      const pleak = UK_UI.filter((w) => ukWord(w).test(pui));
      check(p, `${lang} promo page: no Ukrainian UI strings`, pleak.length === 0, pleak.join(", "));
      if (lang === "ru") { const m = pui.match(/[^\s]*[іїєґІЇЄҐ][^\s]*/g) ?? []; check(p, "ru promo page: no Ukrainian-only letters in the interface text", m.length === 0, [...new Set(m)].slice(0, 8).join(" ")); }
      const h1 = txt(await p.locator("h1").first().innerText());
      if (lang === "ru") check(p, "ru promo page: title (h1) not in Ukrainian", !/[іїєґ]/i.test(h1), h1.slice(0, 90));
      if (lang === "en") check(p, "en promo page: title (h1) not in Cyrillic", !/[а-яіїєґ]{3,}/i.test(h1), h1.slice(0, 90));
      const share = await p.$$eval("main a[href^='https://t.me/share'], main a[href^='https://x.com/intent']", (els) => els.map((e) => e.getAttribute("href")));
      check(p, `${lang} promo page: share links carry this page's URL`, share.length === 2 && share.every((h) => h.includes(encodeURIComponent(p.url().split("#")[0]))), share.join(" | ").slice(0, 160));
      await c.grantPermissions(["clipboard-read", "clipboard-write"], { origin: ORIGIN });
      await p.locator("main button").filter({ hasText: L.copy }).first().click(); await p.waitForTimeout(150);
      const clip = await p.evaluate(() => navigator.clipboard.readText().catch((e) => "ERR " + e));
      check(p, `${lang} promo page: «${L.copy}» → «✓ ${L.copied}», clipboard = URL`, (await p.locator("main button").filter({ hasText: L.copied }).count()) === 1 && clip === p.url(), rel(clip));
      await hydrated(p, `main button.size-12[aria-label="${L.save}"], main button.size-12[aria-label="${L.unsave}"]`);
      const big = p.locator(`main button.size-12[aria-label="${L.save}"], main button.size-12[aria-label="${L.unsave}"]`).first();
      const before = await big.getAttribute("aria-pressed");
      await big.click(); await p.waitForTimeout(120); await p.reload(); await settle(p);
      // the saved state is read from localStorage after hydration — wait for it (up to 6 s) instead of reading the static HTML
      await p.waitForFunction(([a, b, want]) => document.querySelector(`main button.size-12[aria-label="${a}"], main button.size-12[aria-label="${b}"]`)?.getAttribute("aria-pressed") === want, [L.save, L.unsave, before === "true" ? "false" : "true"], { timeout: 6000 }).catch(() => {});
      const after = await p.locator(`main button.size-12[aria-label="${L.save}"], main button.size-12[aria-label="${L.unsave}"]`).first().getAttribute("aria-pressed");
      check(p, `${lang} promo page: big ☆ toggles and persists`, before !== after, `${before} → ${after}`);
      const hb = p.locator(`main button.size-12[aria-label="${L.hide}"]`).first();
      if (await hb.count()) { await hb.click(); await p.waitForTimeout(120); check(p, `${lang} promo page: hide → «${L.unhide}»`, (await p.locator(`main button.size-12[aria-label="${L.unhide}"]`).count()) === 1); await p.locator(`main button.size-12[aria-label="${L.unhide}"]`).click(); }
      const crumbs = await p.$$eval("main nav a", (els) => els.slice(0, 2).map((e) => [e.innerText.trim(), e.getAttribute("href")]));
      check(p, `${lang} promo page: back link «← ${L.back}» → /${lang}/#promos`, crumbs[0]?.[0] === `← ${L.back}` && crumbs[0]?.[1] === `${BP}/${lang}/#promos`, JSON.stringify(crumbs));
      for (const [t, h] of crumbs) { const r = await sameOriginStatus(p, new URL(h, p.url()).href); check(p, `${lang} breadcrumb «${t}» responds 200`, r.st === 200, `HTTP ${r.st}${r.loc ? ` → ${r.loc}` : ""}`); }
      await p.close();
    });
    // /my/ (fresh browser), /unlocks/, /learn/quiz/
    await withCtx("desk", async (c) => {
      const p = await newPage(c);
      await go(p, `/${lang}/my/`);
      check(p, `${lang} /my/ empty state «${L.myEmpty}…»`, (await p.locator("main").innerText()).includes(L.myEmpty) && (await p.locator("main ul > li.card").count()) === 0);
      await go(p, `/${lang}/`); await feedReadyL(p, L);
      for (const i of [3, 4, 5]) { await p.locator("article.card").nth(i).locator(`button[aria-label="${L.save}"]`).click(); await p.waitForTimeout(80); }
      await go(p, `/${lang}/my/`);
      const rows = p.locator("main ul > li.card");
      check(p, `${lang} /my/ lists the 3 saved promos`, (await rows.count()) === 3, `${await rows.count()}`);
      const tabs = async () => p.$$eval("main [role=tablist] [role=tab]", (els) => els.map((e) => e.innerText.replace(/\s+/g, " ").trim()));
      check(p, `${lang} /my/ chip «${L.myAll} 3»`, (await tabs()).includes(`${L.myAll} 3`), JSON.stringify(await tabs()));
      const t0 = rows.nth(0).locator('button[aria-haspopup="listbox"]').first();
      const sOpts = await selOptions(p, t0);
      check(p, `${lang} /my/ status options translated`, JSON.stringify(sOpts) === JSON.stringify(Object.values(L.st)), JSON.stringify(sOpts));
      await selPick(p, t0, L.st.joined);
      check(p, `${lang} /my/ status → «${L.st.joined}» and chip «${L.st.joined} 1»`, txt(await t0.innerText()) === L.st.joined && (await tabs()).includes(`${L.st.joined} 1`), JSON.stringify(await tabs()));
      const soT = p.locator(`main button[aria-haspopup="listbox"][aria-label="${L.mySort}"]`);
      check(p, `${lang} /my/ sort Select present with 4 options`, (await soT.count()) === 1 && (await selOptions(p, soT)).length === 4);
      const [d1] = await Promise.all([p.waitForEvent("download", { timeout: 6000 }).catch(() => null), p.locator("main button.card").first().click()]);
      if (d1) { const f = pth.join(DL, `${lang}_${d1.suggestedFilename()}`); await d1.saveAs(f); const b = fs.readFileSync(f, "utf8"); check(p, `${lang} /my/ CSV export: header + 3 rows`, b.trim().split("\n").length === 4, `${b.trim().split("\n").length} lines`); } else check(p, `${lang} /my/ CSV export downloads`, false);
      // unlocks
      await go(p, `/${lang}/unlocks/`);
      // the «N of M» line is filled in after hydration
      await p.waitForFunction((sh) => [...document.querySelectorAll("main span")].some((x) => new RegExp(`^\\d+ ${sh} \\d+$`).test(x.textContent.trim())), L.shown, { timeout: 8000 }).catch(() => {});
      const cnt = () => p.evaluate((sh) => { const s = [...document.querySelectorAll("main span")].find((x) => new RegExp(`^\\d+ ${sh} \\d+$`).test(x.textContent.trim())); return s ? s.textContent.trim() : null; }, L.shown);
      let rs = await tableRows(p);
      check(p, `${lang} /unlocks/ «N ${L.shown} M» = visible / all rows`, (await cnt()) === `${rs.filter((r) => !r.hidden).length} ${L.shown} ${rs.length}`, `${await cnt()} vs ${rs.filter((r) => !r.hidden).length}/${rs.length}`);
      const trig = p.locator('main button[aria-haspopup="listbox"]'); const tn = await trig.count();
      if (tn > 1) {
        const fo = await selOptions(p, trig.nth(0));
        await selPick(p, trig.nth(0), fo[1]);
        rs = await tableRows(p); const vis = rs.filter((r) => !r.hidden);
        const fk = Object.keys(rs[0].ds).filter((k) => /^f[A-Z]/.test(k));
        check(p, `${lang} /unlocks/ filter «${fo[1]}»: matching rows only + count`, vis.length > 0 && fk.some((k) => vis.every((r) => r.ds[k] === fo[1])) && (await cnt()) === `${vis.length} ${L.shown} ${rs.length}`, `${vis.length} rows, ${await cnt()}`);
        await selPick(p, trig.nth(0), fo[0]);
        const sorts = await selOptions(p, trig.nth(tn - 1));
        check(p, `${lang} /unlocks/ sort options translated`, sorts.length > 1 && !sorts.some((x) => /[іїєґ]/i.test(x) && lang === "ru") && !sorts.some((x) => /[а-я]/i.test(x) && lang === "en"), JSON.stringify(sorts));
      }
      await p.locator(`main input[aria-label="${L.tSearch}"]`).fill("zzqxj"); await p.waitForTimeout(150);
      check(p, `${lang} /unlocks/ search no match → «0 ${L.shown} M» + note`, /^0 /.test((await cnt()) ?? "") && (await p.locator("main p").filter({ hasText: L.tNone }).count()) >= 1, await cnt());
      await p.locator(`main input[aria-label="${L.tSearch}"]`).fill(""); await p.waitForTimeout(150);
      const cal = p.locator(`button[aria-expanded][aria-label="${L.calAdd}"]:visible`).first();
      if (await cal.count()) {
        await cal.scrollIntoViewIfNeeded(); await cal.click(); await p.waitForTimeout(150);
        const m = await p.evaluate(() => { const b = document.querySelector('button[aria-expanded="true"]'); const mm = b?.parentElement?.querySelector("div.fixed"); if (!mm) return null; const r = mm.getBoundingClientRect(); return { r: [Math.round(r.left), Math.round(r.top), Math.round(r.right), Math.round(r.bottom)], g: !!mm.querySelector("a[href*='calendar.google.com']"), ics: mm.innerText.includes(".ics"), vw: innerWidth, vh: innerHeight }; });
        check(p, `${lang} /unlocks/ calendar menu opens inside the screen with Google + .ics`, !!m && m.g && m.ics && m.r[0] >= 0 && m.r[2] <= m.vw && m.r[3] <= m.vh, JSON.stringify(m));
        await p.keyboard.press("Escape");
      } else check(p, `${lang} /unlocks/ has calendar buttons «${L.calAdd}»`, false);
      // quiz
      await go(p, `/${lang}/learn/quiz/`);
      let n = 0; for (; n < 10; n++) { const o = p.locator("main .card button"); if (!(await o.count())) break; await o.first().click(); await p.waitForTimeout(120); }
      const res = await p.locator("main").innerText();
      check(p, `${lang} quiz: ${n} answers → «${L.quizResult}» + hub mark`, res.includes(L.quizResult) && (await p.evaluate(() => localStorage.getItem("pr:learn:quiz"))) === "1", res.slice(0, 120).replace(/\s+/g, " "));
      const picks = await p.$$eval("main a.card", (as) => as.map((a) => a.href));
      const bad = []; for (const h of picks) if (h.startsWith(ORIGIN)) { const r = await sameOriginStatus(p, h); if (r.st !== 200) bad.push(`${rel(h)} ${r.st}`); } else if (!/^https:\/\//.test(h)) bad.push(h);
      check(p, `${lang} quiz: ${picks.length} picks, every link resolves`, picks.length > 0 && bad.length === 0, bad.join(", "));
      const again = p.locator("main button").filter({ hasText: L.quizAgain });
      if (await again.count()) { await again.click(); await p.waitForTimeout(100); check(p, `${lang} quiz «${L.quizAgain}» restarts`, (await p.locator("main .card button").count()) > 0); } else check(p, `${lang} quiz «↺ ${L.quizAgain}» button`, false);
      await p.close();
    });
    // phone: same pages, layout + menus
    await withCtx("phone", async (c) => {
      const p = await newPage(c);
      await go(p, `/${lang}/`); await feedReadyL(p, L);
      await checkMenuCoverage(p, p.locator(SRT), `${lang} phone sort Select`);
      const first = (await cardsL(p, L))[0];
      if (first) await go(p, first.href.replace(BP, ""));
      for (const u of [`/${lang}/my/`, `/${lang}/unlocks/`, `/${lang}/learn/quiz/`, `/${lang}/drops/`, `/${lang}/check/`]) await go(p, u);
      await p.close();
    });
  }
};

S.tablet = async () => {
  await withCtx("tablet", async (c) => {
    const p = await newPage(c);
    await go(p, "/uk/"); await feedReady(p);
    const hdr = await p.evaluate(() => {
      const nav = [...document.querySelectorAll("header nav")].find((n) => n.getClientRects().length);
      const ctl = [...document.querySelectorAll("header a, header button")].filter((e) => e.getClientRects().length && e.checkVisibility());
      const out = ctl.filter((e) => { const r = e.getBoundingClientRect(); return r.right > innerWidth + 1 || r.left < -1; }).map((e) => (e.innerText.trim() || e.getAttribute("aria-label") || "").slice(0, 20));
      const bar = document.querySelector('nav.fixed[aria-label="Розділи"]');
      return { nav: !!nav, links: nav ? [...nav.querySelectorAll("a")].map((a) => a.innerText.trim()) : [], out, bar: bar ? getComputedStyle(bar).display : "absent", hScroll: document.querySelector("header").scrollWidth > innerWidth };
    });
    check(p, "tablet 768: header nav shown, phone tab bar hidden, no header control off-screen", hdr.nav && hdr.links.length >= 4 && hdr.bar === "none" && hdr.out.length === 0 && !hdr.hScroll, JSON.stringify(hdr));
    await checkMenuCoverage(p, p.locator(SORT), "tablet sort Select");
    await selOpen(p, p.locator(SORT));
    await p.locator(`${LB} [role=option]`).filter({ hasText: /^\s*Нові\s*$/ }).first().tap(); await p.waitForTimeout(250);
    check(p, "tablet: tapping «Нові» sorts and syncs ?sort=newest", new URL(p.url()).searchParams.get("sort") === "newest" && txt(await p.locator(SORT).innerText()) === "Нові", rel(p.url()));
    await resetFeed(p);
    await openFilters(p);
    await checkMenuCoverage(p, p.locator('button[aria-haspopup="listbox"][aria-label="Будь-який статус"]'), "tablet status Select");
    await checkMenuCoverage(p, p.locator('button[aria-haspopup="listbox"][aria-label="Країна"]'), "tablet country Select");
    const vSum = p.locator("details[data-pop] > summary").filter({ hasText: "Майданчики" }).first();
    if (await vSum.count()) {
      await vSum.tap(); await p.waitForTimeout(200);
      const r = await p.evaluate(() => { const g = document.querySelector("details[open] [role=group]"); const b = g.getBoundingClientRect(); const bad = []; for (const x of g.querySelectorAll("button")) { x.scrollIntoView({ block: "center", behavior: "instant" }); const q = x.getBoundingClientRect(); const e = document.elementFromPoint(q.left + q.width / 2, q.top + q.height / 2); if (!(e && x.contains(e))) bad.push(`${x.innerText.trim().slice(0, 20)} by ${e ? e.tagName + "." + String(e.className).slice(0, 40) : null}`); } return { l: Math.round(b.left), r: Math.round(b.right), vw: innerWidth, bad }; });
      check(p, "tablet venues menu inside the screen and not covered", r.l >= 0 && r.r <= r.vw && r.bad.length === 0, JSON.stringify(r));
      await p.locator("details[open] [role=group] button").first().tap(); await p.waitForTimeout(200);
      check(p, "tablet: tapping a venue filters the list (?venue=)", !!new URL(p.url()).searchParams.get("venue"), rel(p.url()));
      await p.tap("h1").catch(() => {}); await p.waitForTimeout(150);
      check(p, "tablet venues menu closes on outside tap", (await p.locator("details[data-pop][open]").count()) === 0);
    }
    await quickBtn(p, "Без вкладень").tap(); await p.waitForTimeout(200);
    check(p, "tablet: quick filter tap → Filters badge", /Фільтри\s*\d/.test(txt(await filtersBtn(p).innerText())), txt(await filtersBtn(p).innerText()));
    const o = await overflow(p);
    check(p, "tablet: no horizontal overflow with the filters panel open", o.sw <= 768, JSON.stringify(o));
    await resetFeed(p);
    const hit = await p.evaluate(() => { const a = document.querySelector("article.card"); const out = []; for (const b of a.querySelectorAll("button")) { if (!b.getClientRects().length) continue; b.scrollIntoView({ block: "center", behavior: "instant" }); const q = b.getBoundingClientRect(); const e = document.elementFromPoint(q.left + q.width / 2, q.top + q.height / 2); out.push({ b: b.getAttribute("aria-label") || b.innerText.trim().slice(0, 20), ok: !!e && b.contains(e) }); } return out; });
    check(p, "tablet: card buttons hit-testable", hit.length > 0 && hit.every((x) => x.ok), JSON.stringify(hit));
    // calendar menus
    for (const path of ["/uk/sales/", "/uk/unlocks/"]) {
      await go(p, path);
      const b = p.locator('button[aria-expanded][aria-label="Додати в календар"]:visible').first();
      if (!(await b.count())) { info(p, `tablet ${path}: no calendar button`); continue; }
      await b.evaluate((x) => x.scrollIntoView({ block: "center", inline: "center", behavior: "instant" })); await p.waitForTimeout(100);
      await b.tap().catch(() => b.dispatchEvent("click")); await p.waitForTimeout(200);
      const m = await p.evaluate(() => { const bt = document.querySelector('button[aria-label="Додати в календар"][aria-expanded="true"]'); const mm = bt?.parentElement?.querySelector("div.fixed"); if (!mm) return null; const r = mm.getBoundingClientRect(); const e = document.elementFromPoint(r.left + r.width / 2, r.top + 15); return { r: [Math.round(r.left), Math.round(r.top), Math.round(r.right), Math.round(r.bottom)], top: !!e && mm.contains(e), vw: innerWidth, vh: innerHeight }; });
      check(p, `tablet CalAdd menu inside the screen & on top (${path})`, !!m && m.top && m.r[0] >= 0 && m.r[2] <= m.vw && m.r[1] >= 0 && m.r[3] <= m.vh, JSON.stringify(m));
      await p.tap("h1").catch(() => {});
    }
    await go(p, "/uk/calendar/");
    const cs = p.locator("details[data-pop] > summary[aria-label='Додати в календар']:visible");
    if (await cs.count()) {
      for (const i of [0, Math.min(3, (await cs.count()) - 1)]) {
        await cs.nth(i).scrollIntoViewIfNeeded(); await cs.nth(i).tap(); await p.waitForTimeout(150);
        const m = await p.evaluate(() => { const d = document.querySelector("details[data-pop][open]"); if (!d) return null; const box = [...d.children].find((x) => x.tagName !== "SUMMARY"); const r = box.getBoundingClientRect(); const e = document.elementFromPoint(r.left + r.width / 2, r.top + 12); return { r: [Math.round(r.left), Math.round(r.top), Math.round(r.right), Math.round(r.bottom)], top: !!e && box.contains(e), vw: innerWidth, vh: innerHeight }; });
        check(p, `tablet /calendar/ menu #${i + 1} inside the screen & on top`, !!m && m.top && m.r[0] >= 0 && m.r[2] <= m.vw && m.r[3] <= m.vh, JSON.stringify(m));
        await p.tap("h1").catch(() => {}); await p.waitForTimeout(100);
      }
    }
    // DEX
    await go(p, "/uk/dex/");
    for (const t of await p.locator('main button[aria-haspopup="listbox"]').all()) await checkMenuCoverage(p, t, `tablet /dex/ «${txt(await t.innerText())}»`);
    const pc = p.locator("main button[aria-expanded]").filter({ hasText: /Умови й ризики/ }).first();
    // a widened layout viewport defeats Playwright's hit test (see the overflow record for this page) → synthetic click
    if (await pc.count()) { await pc.tap({ timeout: 6000 }).catch(async (e) => { info(p, "tablet /dex/: Playwright could not tap «Умови й ризики»", e.message.split("\n")[0]); await pc.dispatchEvent("click"); }); await p.waitForTimeout(1500); const o2 = await overflow(p); check(p, "tablet /dex/ open pool: no overflow", o2.sw <= 768, JSON.stringify(o2)); }
    // /my/
    const ids = FEED.promos.filter((x) => geoAllowed(x, "ua")).slice(0, 7).map((x) => x.id);
    await p.evaluate((ids) => { localStorage.setItem("pr:saved", JSON.stringify(ids)); localStorage.removeItem("pr:track"); }, ids);
    await go(p, "/uk/my/");
    const rows = p.locator("main ul > li.card");
    for (const i of [0, 1, 2, 3]) await checkMenuCoverage(p, rows.nth(i).locator('button[aria-haspopup="listbox"]').first(), `tablet /my/ row ${i + 1} status Select`);
    for (const lab of ["Сортування", "Біржа"]) { const t = p.locator(`main button[aria-haspopup="listbox"][aria-label="${lab}"]`); if (await t.count()) await checkMenuCoverage(p, t, `tablet /my/ «${lab}» Select`); }
    const t0 = rows.nth(0).locator('button[aria-haspopup="listbox"]').first();
    await selOpen(p, t0); await p.locator(`${LB} [role=option]`).nth(1).tap(); await p.waitForTimeout(250);
    check(p, "tablet /my/: tapping «Беру участь» sets the row status", txt(await t0.innerText()) === "Беру участь", txt(await t0.innerText()));
    await p.close();
  });
};

S.edge = async () => {
  const geoUa = FEED.promos.filter((x) => geoAllowed(x, "ua"));
  await withCtx("desk", async (c) => {
    const p = await newPage(c);
    // 1. empty /my/ + no Saved tab on a fresh browser
    await go(p, "/uk/my/");
    const mt = await p.locator("main").innerText();
    check(p, "edge: fresh /my/ shows the empty note, no rows / exports / Selects", mt.includes("Поки нічого не збережено") && (await p.locator("main li.card, main button.card, main [aria-haspopup=listbox]").count()) === 0, mt.slice(0, 160).replace(/\s+/g, " "));
    // 2. many saved (60) + many hidden (100)
    const many = geoUa.slice(0, 60).map((x) => x.id);
    await p.evaluate((ids) => localStorage.setItem("pr:saved", JSON.stringify(ids)), many);
    await go(p, "/uk/my/");
    const rows = p.locator("main ul > li.card");
    check(p, "edge: 60 saved → /my/ lists 60 rows and «Усі 60»", (await rows.count()) === 60 && (await p.locator("main [role=tab]").filter({ hasText: /^Усі\s*60$/ }).count()) === 1, `${await rows.count()} rows`);
    const star = txt(await p.locator('header a[aria-label="Мої акції"]').first().innerText());
    check(p, "edge: header ★ shows 60 saved", /60|99\+/.test(star), star);
    const now = Date.now();
    const withEnd = many.map((id) => FEED.promos.find((x) => x.id === id)).filter((x) => x?.endsAt && x.endsAt > now).length;
    const icsTile = num(await p.locator("main button.card").nth(1).innerText());
    check(p, "edge: /my/ «Дедлайни в календар» tile = saved promos with a future deadline", icsTile === withEnd, `${icsTile} vs ${withEnd}`);
    // earned total vs rows after removing a row that had earnings
    const e0 = rows.nth(0).locator("input[inputmode=decimal]");
    await e0.fill("40"); await e0.blur(); await p.waitForTimeout(100);
    const e1 = rows.nth(1).locator("input[inputmode=decimal]");
    await e1.fill("2"); await e1.blur(); await p.waitForTimeout(100);
    await rows.nth(0).locator("button").filter({ hasText: "✕" }).click(); await p.waitForTimeout(150);
    const totalTxt = txt(await p.locator("main .card").first().innerText());
    const visEarn = (await rows.evaluateAll((els) => els.map((e) => Number((e.querySelector("input[inputmode=decimal]")?.value || "0").replace(",", ".")) || 0))).reduce((a, b) => a + b, 0);
    check(p, "edge: /my/ «Зароблено» total = sum over the rows still listed (after ✕ on a row with $40)", Math.abs(usdOfText(totalTxt) - visEarn) < 0.01, `tile «${totalTxt}», rows sum $${visEarn}`);
    // 3. a saved id that no longer exists + corrupted storage values
    await p.evaluate(() => { const s = JSON.parse(localStorage.getItem("pr:saved")); localStorage.setItem("pr:saved", JSON.stringify(["tg:gone/000", ...s.slice(0, 3)])); });
    await go(p, "/uk/my/");
    const gone = await p.locator("main ul > li.card").filter({ hasText: "Акція вже не активна" }).count();
    check(p, "edge: a saved promo that left the feed shows «Акція вже не активна» and «Завершились 1»", gone === 1 && (await p.locator("main [role=tab]").filter({ hasText: /^Завершились\s*1$/ }).count()) === 1, `${gone}`);
    await p.locator("main ul > li.card").filter({ hasText: "Акція вже не активна" }).locator("button").filter({ hasText: "✕" }).click(); await p.waitForTimeout(120);
    check(p, "edge: ✕ removes the gone promo", (await p.locator("main ul > li.card").count()) === 3);
    await p.evaluate(() => { localStorage.setItem("pr:saved", "{not json"); localStorage.setItem("pr:hidden", "[1,2"); localStorage.setItem("pr:track", "nope"); localStorage.setItem("pr:my:view", "{{"); localStorage.setItem(`pr:filters:${BP}/uk/`, "%%%&cat=&&sort"); });
    for (const u of ["/uk/", "/uk/my/"]) {
      await go(p, u); if (u === "/uk/") await feedReady(p); else await p.waitForTimeout(800);
      const mtx = await p.locator("main").innerText();
      // a broken pr:saved is read as "nothing saved" → /my/ shows its empty note; the feed shows its first 9 cards (page errors are checked per page)
      check(p, `edge: corrupted localStorage values don't break ${u}`, u === "/uk/" ? (await p.locator("article.card").count()) === 9 : /Мої акції/.test(mtx) && mtx.includes("Поки нічого не збережено"), u === "/uk/" ? `${await p.locator("article.card").count()} cards` : mtx.slice(0, 120).replace(/\s+/g, " "));
    }
    await p.evaluate(() => localStorage.clear());
    // 4. many hidden (100), then all hidden
    const hid100 = geoUa.slice(10, 110).map((x) => x.id);
    await p.evaluate((ids) => localStorage.setItem("pr:hidden", JSON.stringify(ids)), hid100);
    await go(p, "/uk/"); await feedReady(p);
    let ci = await chipInfo(p);
    check(p, "edge: 100 hidden → «Усі» = UA promos − 100 and «Ви приховали: 100»", num(ci[0].t) === geoUa.length - 100 && (await p.locator("main p").filter({ hasText: "Ви приховали: 100" }).count()) === 1, `${ci[0].t}`);
    let l = await allCardsMapped(p);
    check(p, "edge: no hidden promo shows in the feed", l.length === geoUa.length - 100 && !l.some((x) => hid100.includes(x.p?.id)), `${l.length}`);
    await p.evaluate((ids) => localStorage.setItem("pr:hidden", JSON.stringify(ids)), FEED.promos.map((x) => x.id));
    await go(p, "/uk/"); await p.waitForTimeout(2500);
    const mainT = await p.locator("main").innerText();
    ci = await chipInfo(p);
    check(p, "edge: every promo hidden → 0 cards, «Ви приховали: N» with «показати», no pins", (await p.locator("article.card").count()) === 0 && /Ви приховали: \d+/.test(mainT) && num(ci[0].t) === 0, `${await p.locator("article.card").count()} cards, chip ${ci[0].t}`);
    const emptyMsg = (await p.locator("main div.border-dashed").first().innerText().catch(() => "")).trim();
    check(p, "edge: all-hidden empty state explains that the promos are hidden (not «try other filters»)", !!emptyMsg && !/Спробуйте інші фільтри/.test(emptyMsg), `«${emptyMsg}»`);
    await p.locator("main p button").filter({ hasText: /^показати$/ }).click(); await p.waitForTimeout(250);
    check(p, "edge: «показати» with everything hidden brings the whole feed back", (await p.locator("article.card").count()) === 9 && num((await chipInfo(p))[0].t) === geoUa.length, `${await p.locator("article.card").count()} cards, chip ${(await chipInfo(p))[0].t}`);
    await p.locator("main p button").filter({ hasText: /^повернути всі$/ }).click(); await p.waitForTimeout(200);
    // 5. filter combo → 0, then reset
    await go(p, "/uk/"); await feedReady(p);
    await p.fill(SEARCH, "usdt"); await chips(p).filter({ hasText: "Earn / Стейкінг" }).first().click(); await openFilters(p);
    await quickBtn(p, "Для нових").click(); await quickBtn(p, "Без вкладень").click(); await p.waitForTimeout(250);
    ci = await chipInfo(p);
    const zero = { cards: await p.locator("article.card").count(), empty: (await p.locator("main").innerText()).includes("Нічого не знайдено"), active: ci.find((x) => x.on === "true")?.t, badge: txt(await filtersBtn(p).innerText()) };
    check(p, "edge: filter combo with 0 results → empty state, active chip still shown, badge counts 2", zero.cards === 0 && zero.empty && /^Earn/.test(zero.active ?? "") && /Фільтри\s*2/.test(zero.badge), JSON.stringify(zero));
    await resetFeed(p);
    const after = { q: await p.inputValue(SEARCH), url: new URL(p.url()).search, cards: await p.locator("article.card").count(), badge: txt(await filtersBtn(p).innerText()), quick: await p.locator("main button[aria-pressed=true]").filter({ hasText: /^(Для нових|Без вкладень)$/ }).count() };
    check(p, "edge: «Скинути» after a 0-result combo restores everything", after.q === "" && after.url === "" && after.cards === 9 && after.badge === "Фільтри" && after.quick === 0, JSON.stringify(after));
    // 6. very long / odd search strings
    // multi-word queries: every word must narrow the result (a synonym in the first word must not swallow the rest)
    for (const [q, wantFn, label] of [["airdrop zzqxjw", () => 0, "0 results"], ["бонус bybit", (l) => l.every((x) => x.p?.venue.id === "bybit"), "only Bybit"], ["стейкінг binance", (l) => l.every((x) => x.p?.venue.id === "binance"), "only Binance"]]) {
      await p.fill(SEARCH, q); await p.waitForTimeout(300);
      const lq = await allCardsMapped(p);
      const ok = q === "airdrop zzqxjw" ? lq.length === 0 : lq.length > 0 && wantFn(lq);
      check(p, `edge: search «${q}» → ${label}`, ok, `${lq.length} cards; venues ${[...new Set(lq.map((x) => x.p?.venue.id))].slice(0, 8).join(",")}`);
    }
    const long = "zq ".repeat(186).trim() + " usdt"; // 562 chars, no synonym prefix
    await p.fill(SEARCH, long); await p.waitForTimeout(300);
    const st6 = { v: (await p.inputValue(SEARCH)).length, cards: await p.locator("article.card").count(), q: (new URL(p.url()).searchParams.get("q") ?? "").length };
    check(p, "edge: a 562-char search is accepted and shows the empty state", st6.v === long.length && (await p.locator("main").innerText()).includes("Нічого не знайдено"), JSON.stringify(st6));
    await p.reload({ waitUntil: "domcontentloaded" }); await settle(p); await feedReady(p);
    const v6 = await p.inputValue(SEARCH);
    check(p, "edge: the long search survives a reload unchanged", v6 === long, `before ${long.length} chars (URL q=${st6.q}), after reload ${v6.length} chars`);
    for (const q of ["<img src=x onerror=alert(1)>", "%", "(", "\\", "🎁", "   usdt   "]) {
      await p.fill(SEARCH, q); await p.waitForTimeout(200);
      const n = await p.locator("article.card").count();
      check(p, `edge: search «${q}» does not break the page`, (await p.locator("main").innerText()).length > 100 && (await p.evaluate(() => !document.querySelector("main img[src='x']"))), `${n} cards`);
    }
    const sp = await p.evaluate(() => [...document.querySelectorAll("article.card")].length);
    await p.fill(SEARCH, "usdt"); await p.waitForTimeout(200);
    check(p, "edge: «   usdt   » (spaces) finds the same as «usdt»", sp === (await p.locator("article.card").count()), `${sp} vs ${await p.locator("article.card").count()}`);
    await resetFeed(p);
    // 7. a deep link with every filter
    // (all 7 URL filters; the combination is picked so the model still leaves a card or two)
    const DLV = ["binance", "bybit", "bitget", "kucoin", "gate"];
    const dl = `/uk/?kind=cex&status=live&cat=competition&sort=ending&venue=${DLV.join(",")}&quick=cash&q=usdt`;
    await go(p, dl); await feedReady(p);
    const u7 = new URL(p.url()).searchParams;
    l = await allCardsMapped(p);
    const tr = FEED.titles?.uk ?? {};
    const okP = (x) => x && x.venue.kind === "cex" && ["live", "ongoing"].includes(statusOf(x, Date.now())) && x.category === "competition" && DLV.includes(x.venue.id) && ["cash", "mixed"].includes(x.meta?.payout?.form) && geoAllowed(x, "ua")
      && `${tr[x.id] ?? ""} ${x.title} ${x.venue.name} змагання competition ${x.reward?.unit ?? ""} ${x.meta?.chain ?? ""} ${x.meta?.actions ?? ""}`.toLowerCase().includes("usdt");
    const want7 = FEED.promos.filter(okP);
    const ui7 = { q: await p.inputValue(SEARCH), sort: txt(await p.locator(SORT).innerText()), chip: (await chipInfo(p)).find((x) => x.on === "true")?.t, badge: txt(await filtersBtn(p).innerText()) };
    check(p, "edge: deep link with 7 filters → UI shows them all (badge 4 = kind+status+venues+quick)", ui7.q === "usdt" && ui7.sort === "Скоро завершуються" && /^Змагання/.test(ui7.chip ?? "") && /Фільтри\s*4/.test(ui7.badge) && u7.get("venue") === DLV.join(","), JSON.stringify(ui7));
    check(p, "edge: deep link with 7 filters → exactly the matching promos", l.length === want7.length && l.every((x) => okP(x.p)), `${l.length} cards vs model ${want7.length}: ${l.map((x) => x.p?.id).join(",").slice(0, 200)}`);
    const before7 = l.map((x) => x.href);
    await p.reload({ waitUntil: "domcontentloaded" }); await settle(p); await feedReady(p);
    const same = (a, b) => JSON.stringify([...new URLSearchParams(a)].sort()) === JSON.stringify([...new URLSearchParams(b)].sort());
    const after7 = (await allCardsMapped(p)).map((x) => x.href);
    check(p, "edge: reload keeps the deep-link filters and the same cards", same(new URL(p.url()).search, new URL(BASE + dl).search) && JSON.stringify(after7) === JSON.stringify(before7), `${rel(p.url())} · ${before7.length} → ${after7.length} cards`);
    // 8. back / forward keep the filters
    await resetFeed(p);
    await go(p, "/uk/?cat=bonus&sort=newest"); await feedReady(p);
    await p.fill(SEARCH, "bitget"); await p.waitForTimeout(300);
    const href0 = await p.locator("article.card h3 a").first().getAttribute("href");
    const before8 = (await cards(p)).map((x) => x.href);
    await p.locator("article.card h3 a").first().click(); await p.waitForLoadState("domcontentloaded"); await p.waitForTimeout(600);
    check(p, "edge: card click opens its promo page", rel(p.url()) === href0.replace(BP, ""), rel(p.url()));
    await p.goBack({ waitUntil: "domcontentloaded" }); await settle(p); await feedReady(p);
    const b8 = { url: rel(p.url()), q: await p.inputValue(SEARCH), sort: txt(await p.locator(SORT).innerText()), chip: (await chipInfo(p)).find((x) => x.on === "true")?.t, cards: (await cards(p)).map((x) => x.href) };
    check(p, "edge: Back from a promo page restores cat + sort + search and the same cards", /cat=bonus/.test(b8.url) && /sort=newest/.test(b8.url) && /q=bitget/.test(b8.url) && b8.q === "bitget" && b8.sort === "Нові" && /^Бонус/.test(b8.chip ?? "") && JSON.stringify(b8.cards) === JSON.stringify(before8), JSON.stringify({ ...b8, cards: b8.cards.length }));
    await p.goForward({ waitUntil: "domcontentloaded" }); await p.waitForTimeout(600);
    check(p, "edge: Forward returns to the promo page", rel(p.url()) === href0.replace(BP, ""), rel(p.url()));
    await p.goBack({ waitUntil: "domcontentloaded" }); await settle(p); await feedReady(p);
    await p.locator("header [role=group] a", { hasText: "EN" }).first().click(); await p.waitForURL(/\/en\//, { timeout: 8000 }).catch(() => {}); await settle(p); await p.waitForTimeout(800);
    check(p, "edge: UA→EN keeps the filters in the address (r1 F9)", /cat=bonus/.test(p.url()) && /q=bitget/.test(p.url()), rel(p.url()));
    const enChip = (await chipInfoL(p, LX.en)).find((x) => x.on === "true")?.t;
    check(p, "edge: …and /en/ applies them (Deposit bonus chip on, search = bitget)", /^Deposit bonus/.test(enChip ?? "") && (await p.inputValue(searchSelL(LX.en)).catch(() => "")) === "bitget", `chip ${enChip}`);
    await p.goBack({ waitUntil: "domcontentloaded" }); await settle(p); await feedReady(p);
    check(p, "edge: Back after the language switch → /uk/ with the same filters", rel(p.url()).startsWith("/uk/") && /cat=bonus/.test(p.url()) && (await p.inputValue(SEARCH)) === "bitget", rel(p.url()));
    await resetFeed(p);
    await p.close();
  });
  // phone: long search + all-hidden layout
  await withCtx("phone", async (c) => {
    const p = await newPage(c);
    await go(p, "/uk/"); await feedReady(p);
    await p.fill(SEARCH, "W".repeat(300)); await p.waitForTimeout(300);
    const o = await overflow(p);
    check(p, "edge phone: a 300-char search does not widen the page", o.sw <= 390, JSON.stringify(o));
    await p.close();
  });
};

S.keyboard = async () => {
  await withCtx("desk", async (c) => {
    const p = await newPage(c);
    await go(p, "/uk/"); await feedReady(p);
    // sort Select from the page top
    let n = await tabUntil(p, (a) => a.label === "Сортувати", 150);
    check(p, "kbd: Tab reaches the sort Select", n > 0, `${n} Tabs`);
    let a = await active(p);
    check(p, "kbd: focused sort trigger shows a focus ring", !!a?.ring, JSON.stringify(a));
    await p.keyboard.press("Enter"); await p.waitForTimeout(120);
    check(p, "kbd: Enter on the sort trigger opens the menu with focus inside", (await p.locator(LB).count()) === 1 && (await active(p))?.role === "listbox");
    await p.keyboard.press("ArrowDown"); await p.keyboard.press("ArrowDown"); await p.keyboard.press("Enter"); await p.waitForTimeout(250);
    check(p, "kbd: ArrowDown ×2 + Enter → «Скоро завершуються», ?sort=ending, focus back on trigger", txt(await p.locator(SORT).innerText()) === "Скоро завершуються" && new URL(p.url()).searchParams.get("sort") === "ending" && (await active(p))?.label === "Сортувати", rel(p.url()));
    await p.keyboard.press(" "); await p.waitForTimeout(120);
    const spaceOpen = (await p.locator(LB).count()) === 1;
    await p.keyboard.press("Home"); await p.keyboard.press(" "); await p.waitForTimeout(200);
    check(p, "kbd: Space opens the menu and Space picks (Home → «Найвигідніші»)", spaceOpen && txt(await p.locator(SORT).innerText()) === "Найвигідніші");
    // Filters panel
    n = await tabUntil(p, (x) => /^Фільтри/.test(x.text) && x.expanded !== null, 10);
    check(p, "kbd: Tab from sort → Filters button", n > 0, `${n}`);
    await p.keyboard.press("Enter"); await p.waitForTimeout(150);
    check(p, "kbd: Enter opens the Filters panel", (await filtersBtn(p).getAttribute("aria-expanded")) === "true");
    n = await tabUntil(p, (x) => x.tag === "BUTTON" && /^Біржі/.test(x.text), 25);
    check(p, "kbd: Tab reaches the «Біржі» type tab inside the panel", n > 0, `${n}`);
    await p.keyboard.press("Enter"); await p.waitForTimeout(150);
    check(p, "kbd: Enter on «Біржі» → pressed", (await p.locator('[role=group][aria-label="Тип"] button[aria-pressed=true]').innerText()).startsWith("Біржі"));
    n = await tabUntil(p, (x) => x.label === "Будь-який статус", 10);
    check(p, "kbd: Tab reaches the status Select", n > 0, `${n}`);
    await p.keyboard.press("ArrowDown"); await p.waitForTimeout(100); await p.keyboard.press("End"); await p.keyboard.press("Enter"); await p.waitForTimeout(200);
    check(p, "kbd: status Select → «Закінчується» by keyboard", new URL(p.url()).searchParams.get("status") === "ending", rel(p.url()));
    // the venues menu exists only with 2+ venues in the filtered list (19.11: «cex + ending» was 2 cards of one venue)
    const hasVenues = (await p.locator("details[data-pop] > summary", { hasText: "Майданчики" }).count()) > 0;
    n = hasVenues ? await tabUntil(p, (x) => x.tag === "SUMMARY" && /Майданчики/.test(x.text), 10) : 0;
    if (!hasVenues) info(p, "kbd: «Майданчики» menu not rendered (fewer than 2 venues for this filter) — skipped");
    else check(p, "kbd: Tab reaches the «Майданчики» menu", n > 0, `${n}`);
    if (hasVenues && n > 0) {
      await p.keyboard.press("Enter"); await p.waitForTimeout(150);
      check(p, "kbd: Enter opens the venues menu", (await p.locator("details[data-pop][open]").count()) === 1);
      await p.keyboard.press("Tab"); await p.waitForTimeout(50);
      a = await active(p);
      await p.keyboard.press(" "); await p.waitForTimeout(200);
      check(p, "kbd: Tab + Space toggles the first venue", !!new URL(p.url()).searchParams.get("venue"), `${a?.text} → ${rel(p.url())}`);
      await p.keyboard.press("Escape"); await p.waitForTimeout(120);
      a = await active(p);
      check(p, "kbd: Esc closes the venues menu", (await p.locator("details[data-pop][open]").count()) === 0);
      check(p, "kbd: after Esc focus returns to the «Майданчики» summary (not lost to <body>)", a?.tag === "SUMMARY" && a.visible, JSON.stringify(a));
    }
    n = await tabUntil(p, (x) => x.text === "Без вкладень", 15);
    if (n > 0) { await p.keyboard.press("Enter"); await p.waitForTimeout(150); check(p, "kbd: Enter on a quick filter toggles it", (await active(p))?.pressed === "true", JSON.stringify(await active(p))); await p.keyboard.press("Enter"); }
    else check(p, "kbd: Tab reaches the quick filters", false);
    await resetFeed(p); await closeFilters(p);
    // save / hide on a card
    await go(p, "/uk/"); await feedReady(p);
    n = await tabUntil(p, (x) => x.inCard && x.label === "Зберегти", 200);
    check(p, "kbd: Tab reaches a card's ☆ button", n > 0, `${n} Tabs`);
    a = await active(p);
    check(p, "kbd: card ☆ button shows a focus ring", !!a?.ring, JSON.stringify(a));
    await p.keyboard.press("Enter"); await p.waitForTimeout(150);
    a = await active(p);
    const saved = await p.evaluate(() => JSON.parse(localStorage.getItem("pr:saved") || "[]").length);
    check(p, "kbd: Enter on ☆ saves (aria-pressed, storage) and keeps focus on it", a?.pressed === "true" && saved === 1 && a.label === "Прибрати зі збережених", JSON.stringify(a));
    await p.keyboard.press(" "); await p.waitForTimeout(150);
    check(p, "kbd: Space on ☆ un-saves", (await p.evaluate(() => JSON.parse(localStorage.getItem("pr:saved") || "[]").length)) === 0);
    n = await tabUntil(p, (x) => x.inCard && x.label === "Приховати", 6, "Shift+Tab");
    if (n < 0) n = await tabUntil(p, (x) => x.inCard && x.label === "Приховати", 6);
    check(p, "kbd: the card's hide button is next to ☆ in Tab order", n > 0, `${n}`);
    const cardsBefore = await p.locator("article.card").count();
    await p.keyboard.press("Enter"); await p.waitForTimeout(250);
    a = await active(p);
    check(p, "kbd: Enter on hide removes the card", (await p.evaluate(() => JSON.parse(localStorage.getItem("pr:hidden") || "[]").length)) === 1, `${cardsBefore} cards`);
    check(p, "kbd: after hiding a card focus lands on something visible (not <body>)", !!a && a.tag !== "BODY" && a.visible, JSON.stringify(a));
    await p.evaluate(() => localStorage.removeItem("pr:hidden"));
    // CalAdd on /unlocks/
    await go(p, "/uk/unlocks/"); await hydrated(p, 'button[aria-label="Додати в календар"]');
    n = await tabUntil(p, (x) => x.label === "Додати в календар", 250);
    check(p, "kbd: Tab reaches a calendar button on /unlocks/", n > 0, `${n} Tabs`);
    if (n > 0) {
      await p.keyboard.press("Enter"); await p.waitForTimeout(150);
      check(p, "kbd: Enter opens the calendar menu", (await p.locator('button[aria-label="Додати в календар"][aria-expanded="true"]').count()) === 1);
      await p.keyboard.press("Tab"); a = await active(p);
      check(p, "kbd: Tab moves into the menu (Google Calendar)", a?.tag === "A" && /Google/.test(a.text) && (await p.locator('button[aria-label="Додати в календар"][aria-expanded="true"]').count()) === 1, JSON.stringify(a));
      await p.keyboard.press("Tab"); a = await active(p);
      check(p, "kbd: Tab → «.ics» item", /\.ics/.test(a?.text ?? ""), JSON.stringify(a));
      const [dl] = await Promise.all([p.waitForEvent("download", { timeout: 6000 }).catch(() => null), p.keyboard.press("Enter")]);
      await p.waitForTimeout(150); a = await active(p);
      check(p, "kbd: Enter on .ics downloads and closes the menu", !!dl && (await p.locator('button[aria-label="Додати в календар"][aria-expanded="true"]').count()) === 0, `${dl?.suggestedFilename()}`);
      check(p, "kbd: after the .ics choice focus returns to the calendar button", a?.label === "Додати в календар", JSON.stringify(a));
      await p.locator('button[aria-label="Додати в календар"]:visible').first().focus();
      await p.keyboard.press("Enter"); await p.waitForTimeout(100); await p.keyboard.press("Escape"); await p.waitForTimeout(100);
      check(p, "kbd: Esc closes the menu and focus stays on the button", (await p.locator('button[aria-label="Додати в календар"][aria-expanded="true"]').count()) === 0 && (await active(p))?.label === "Додати в календар");
      await p.keyboard.press("Enter"); await p.waitForTimeout(100);
      await p.keyboard.press("Tab"); await p.keyboard.press("Tab"); await p.keyboard.press("Tab"); await p.waitForTimeout(150);
      a = await active(p);
      const stillOpen = await p.locator('button[aria-label="Додати в календар"][aria-expanded="true"]').count();
      check(p, "kbd: tabbing out of the calendar menu closes it", stillOpen === 0, `focus on ${JSON.stringify(a)}, menu open: ${stillOpen}`);
      await p.keyboard.press("Escape");
    }
    // /calendar/ details menu
    await go(p, "/uk/calendar/"); await hydrated(p, "main details[data-pop] a[href*='calendar.google.com']");
    n = await tabUntil(p, (x) => x.tag === "SUMMARY" && x.label === "Додати в календар", 200);
    check(p, "kbd: Tab reaches a /calendar/ add-to-calendar menu", n > 0, `${n}`);
    if (n > 0) {
      await p.keyboard.press("Enter"); await p.waitForTimeout(120);
      await p.keyboard.press("Tab"); await p.keyboard.press("Tab"); a = await active(p);
      check(p, "kbd: /calendar/ menu → Tab ×2 reaches «.ics»", /\.ics/.test(a?.text ?? ""), JSON.stringify(a));
      const [dl] = await Promise.all([p.waitForEvent("download", { timeout: 6000 }).catch(() => null), p.keyboard.press("Enter")]);
      await p.waitForTimeout(150); a = await active(p);
      check(p, "kbd: /calendar/ .ics by Enter downloads and closes the menu", !!dl && (await p.locator("details[data-pop][open]").count()) === 0);
      check(p, "kbd: /calendar/ after the .ics choice focus is not lost to <body>", !!a && a.tag !== "BODY" && a.visible, JSON.stringify(a));
    }
    // quiz to the end
    await go(p, "/uk/learn/quiz/"); await hydrated(p, "main .card button");
    const per = []; let lost = 0;
    for (let q = 0; q < 6; q++) {
      const k = await tabUntil(p, (x) => x.inQuiz, 120);
      if (k < 0) break;
      per.push(k);
      await p.keyboard.press("Enter"); await p.waitForTimeout(150);
      const af = await active(p);
      if (!af || af.tag === "BODY" || !af.visible) lost++;
      // the result screen has cards with buttons too (recommendations): stop on its heading
      if ((await p.locator("main .card button").count()) === 0 || (await p.locator("main h2").filter({ hasText: "Вам підходить" }).count())) break;
    }
    const resT = await p.locator("main").innerText();
    check(p, `kbd: quiz completed with the keyboard (${per.length} answers)`, resT.includes("Вам підходить") && per.length === 4, `Tabs per answer ${JSON.stringify(per)}`);
    check(p, "kbd: quiz — the next question's options are 1–3 Tabs away after each answer (no restart from the page top)", per.length > 1 && per.slice(1).every((x) => x <= 3), `Tabs needed to reach the next options: ${JSON.stringify(per)}`);
    check(p, "kbd: quiz — focus stays on an element after each answer (not dropped to <body>, so screen readers hear the next question)", lost === 0, `focus dropped to <body> after ${lost} of ${per.length} answers`);
    const k2 = await tabUntil(p, (x) => /↺/.test(x.text), 60);
    if (k2 > 0) { await p.keyboard.press("Enter"); await p.waitForTimeout(120); check(p, "kbd: quiz «↺ Пройти ще раз» by keyboard restarts", (await p.locator("main .card button").count()) > 0); }
    else check(p, "kbd: quiz «↺» button reachable by Tab", false);
    // earn coin search by keyboard (r1 F11 fix: Esc / blur close the list)
    await go(p, "/uk/earn/"); await hydrated(p, 'main input[placeholder="Інша монета…"]');
    await p.locator('main input[placeholder="Інша монета…"]').focus();
    await p.keyboard.type("SO"); await p.waitForTimeout(250);
    const sug = p.locator('main input[placeholder="Інша монета…"]').locator("xpath=following-sibling::div[1]//button");
    const sn = await sug.count();
    await p.keyboard.press("ArrowDown"); await p.waitForTimeout(80);
    let ae = await active(p);
    // r3: since e29671b the box is an ARIA combobox — focus stays in the input, ArrowDown moves aria-activedescendant
    const combo = ae?.tag === "INPUT" && !!(await p.locator('main input[placeholder="Інша монета…"]').getAttribute("aria-activedescendant"));
    if (ae?.tag !== "BUTTON" && !combo) { await p.keyboard.press("Tab"); await p.waitForTimeout(250); ae = await active(p); }
    const picked = (combo || ae?.tag === "BUTTON") && (await sug.count()) > 0;
    if (picked) { await p.keyboard.press("Enter"); await p.waitForTimeout(250); }
    check(p, "kbd: /earn/ «Інша монета…» suggestion can be picked with the keyboard (Arrow/Tab + Enter)", picked && /^SO/.test(txt(await p.locator("main h2").first().innerText())), `${sn} suggestions; after ArrowDown/Tab focus on ${JSON.stringify(ae)}; list now ${await sug.count()}`);
    await p.close();
  });
};

S.promo10 = async () => {
  const seed = process.env.SEED ?? ROUND;
  const r = rng(`promo10:${seed}`);
  const pool = [...FEED.promos];
  const cats = [...new Set(pool.map((x) => x.category))].sort(() => r() - 0.5);
  const picked = []; const usedV = new Set();
  for (let round = 0; picked.length < 10 && round < 5; round++) for (const cat of cats) {
    if (picked.length >= 10) break;
    const cand = pool.filter((x) => x.category === cat && !usedV.has(x.venue.id) && !picked.includes(x));
    if (!cand.length) continue;
    const x = cand[Math.floor(r() * cand.length)]; picked.push(x); usedV.add(x.venue.id);
  }
  const report = [];
  await withCtx("desk", async (c) => {
    const p = await newPage(c);
    info(p, `promo10: seed «${seed}», ${picked.length} pages`, picked.map((x) => `${x.category}/${x.venue.id}: ${x.id}`).join(" | "));
    for (const pr of picked) {
      const path = await promoPath(pr);
      if (!path) { check(p, `promo10 ${pr.id}: page listed in the sitemap`, false); continue; }
      await go(p, path);
      const tag = `promo10 [${pr.category}/${pr.venue.id}]`;
      const links = await p.$$eval("a[href]", (els) => els.map((e) => ({ h: e.getAttribute("href"), abs: e.href, t: (e.innerText || e.getAttribute("aria-label") || "").trim().replace(/\s+/g, " ").slice(0, 40) })));
      const bad = [], redir = [], ext = [];
      for (const l of links) {
        if (!l.h || l.h === "#") { bad.push(`empty href «${l.t}»`); continue; }
        if (l.h.startsWith("#")) { if (!(await p.evaluate((id) => !!document.getElementById(decodeURIComponent(id)), l.h.slice(1)))) bad.push(`anchor ${l.h} has no target`); continue; }
        if (/^data:/.test(l.h)) continue;
        if (/^(mailto|tel):/.test(l.h)) { ext.push(l.h); continue; }
        if (/^javascript:/i.test(l.h)) { bad.push(`javascript: link «${l.t}»`); continue; }
        if (l.abs.startsWith(ORIGIN)) {
          const s = await sameOriginStatus(p, l.abs);
          if (s.st === 200) continue;
          if (s.st >= 300 && s.st < 400) redir.push(`${rel(l.abs)} → ${s.st} ${s.loc}`); else bad.push(`${rel(l.abs)} → ${s.st} «${l.t}»`);
          continue;
        }
        let u = null; try { u = new URL(l.h); } catch { /* bad */ }
        if (!u || u.protocol !== "https:" || !u.hostname.includes(".") || /\s/.test(l.h)) bad.push(`not a valid https URL: ${l.h.slice(0, 80)} «${l.t}»`);
      }
      check(p, `${tag}: every link resolves (${links.length} links)`, bad.length === 0 && redir.length === 0, [...bad, ...redir.map((x) => `redirect ${x}`)].slice(0, 6).join(" ; ") || `${links.length} ok`);
      // facts + tiles
      const pg = await p.evaluate(() => {
        // textContent: off-screen sections are skipped by innerText (content-visibility)
        const facts = Object.fromEntries([...document.querySelectorAll("main dl > div")].map((d) => [d.querySelector("dt")?.textContent.trim(), d.querySelector("dd")?.textContent.replace(/\s+/g, " ").trim()]));
        const tiles = [...document.querySelectorAll("main button[aria-expanded]")].map((b) => b.innerText.replace(/\s+/g, " ").trim()).filter((x) => /^(Нагорода|Що зробити|Час|Хто може)/.test(x));
        const todo = [...document.querySelectorAll("main section")].find((s) => /Що зробити/.test(s.querySelector("h2")?.innerText ?? ""));
        const steps = todo ? [...todo.querySelectorAll("ol > li")].map((li) => li.innerText.replace(/\s+/g, " ").replace(/^\d+\s*/, "").trim()) : [];
        const status = [...document.querySelectorAll("main header span.rounded-md")].map((s) => s.innerText.trim());
        const rules = document.querySelector("#rules")?.textContent.replace(/\s+/g, " ") ?? "";
        const related = [...document.querySelectorAll("main article.card")].map((a) => ({ h: a.querySelector("h3 a")?.getAttribute("href"), val: a.querySelector("div.mb-2")?.innerText.replace(/\s+/g, " ").trim() ?? null, text: a.innerText.replace(/\s+/g, " ") }));
        return { facts, tiles, steps, status, rules, related, h1: document.querySelector("h1")?.innerText.trim() };
      });
      const v = pr.meta?.value, pu = pr.meta?.perUser?.usd, pool = pr.reward?.usd;
      const vbad = [];
      if (pu !== undefined && pool !== undefined && pu > pool) vbad.push(`per person $${pu} > pool $${pool}`);
      if (v?.net !== undefined && pu !== undefined && v.net > pu * 1.001) vbad.push(`card ≈$${v.net} > per person $${pu}`);
      if (v?.net !== undefined && pool !== undefined && v.net > pool * 1.001) vbad.push(`card ≈$${v.net} > pool $${pool}`);
      const tileR = pg.tiles.find((x) => x.startsWith("Нагорода")) ?? "";
      const tileUsd = usdOfText(tileR.replace(/^Нагорода\s*/, ""));
      const factPool = usdOfText(pg.facts["Винагорода"]); const factPu = usdOfText(pg.facts["Можна заробити (1 людина)"]);
      if (Number.isFinite(factPu) && Number.isFinite(factPool) && factPu > factPool * 1.001) vbad.push(`page: per person ${pg.facts["Можна заробити (1 людина)"].slice(0, 40)} > pool ${pg.facts["Винагорода"]}`);
      if (Number.isFinite(tileUsd) && Number.isFinite(factPool) && tileUsd > factPool * 1.001) vbad.push(`tile «${tileR.slice(0, 50)}» > pool ${pg.facts["Винагорода"]}`);
      for (const rc of pg.related) {
        const est = rc.val && /≈/.test(rc.val) ? usdOfText(rc.val) : NaN;
        const mx = usdOfText(/Максимум на 1 людину\s+([^Ф]+?)(?=\s(Фонд|поріг|Заверш|Опубл|Старт|Умови)|$)/.exec(rc.text)?.[1]);
        const fp = usdOfText(/Фонд\s*:?\s*([^·]+?)(?=\s(поріг|Заверш|Опубл|Старт|Умови|Максимум)|$)/.exec(rc.text)?.[1]);
        if (Number.isFinite(est) && Number.isFinite(mx) && est > mx * 1.001) vbad.push(`related ${rel(rc.h ?? "")}: «${rc.val}» > max per person $${mx}`);
        if (Number.isFinite(est) && Number.isFinite(fp) && est > fp * 1.001) vbad.push(`related ${rel(rc.h ?? "")}: «${rc.val}» > pool $${fp}`);
      }
      check(p, `${tag}: «≈ $X» value consistent with per-person max and pool`, vbad.length === 0, vbad.join(" ; ") || `net ${v?.net} perUser ${pu} pool ${pool} | tile «${tileR.slice(0, 60)}» | facts pool «${pg.facts["Винагорода"]}» pp «${(pg.facts["Можна заробити (1 людина)"] ?? "").slice(0, 50)}»`);
      // steps vs category
      const sbad = [];
      if (pr.category !== "farming") {
        if (pg.steps.length < 2) sbad.push(`${pg.steps.length} steps`);
        const act = pg.tiles.find((x) => x.startsWith("Що зробити")) ?? "";
        if (pr.category === "referral" && !pg.steps.some((x) => /посилання|друг|друз|реферальн/i.test(x))) sbad.push("referral steps never mention the link / friend");
        if (pr.meta?.minEntry && !pg.steps.some((x) => /\d/.test(x))) sbad.push(`minEntry ${pr.meta.minEntry.amount} ${pr.meta.minEntry.unit} not in the steps`);
        if (/Без вкладень/.test(act) && /(обсяг|торгуйте|торгівл|депозит|внесіть|VIP|trading volume|trade\b|deposit)/i.test(`${pg.rules} ${pr.title}`)) sbad.push(`«Без вкладень» but the rules ask to trade / deposit: «${(/(.{0,60}(обсяг|торгуйте|торгівл|депозит|внесіть|VIP|trading volume|trade\b|deposit).{0,40})/i.exec(`${pr.title} ${pg.rules}`)?.[1] ?? "").trim()}»`);
        if (pr.category === "competition" && !pr.meta?.minEntry && !pg.steps.some((x) => /рейтинг|місце|завдан|умов|торгуйте|обсяг|рівн/i.test(x))) sbad.push("competition steps say nothing about ranking / tasks / volume");
        // besides «register» and «how to get the reward» there must be at least one step that says what to actually do
        const core = pg.steps.filter((x) => !/^Зареєструйтесь/.test(x) && !/^Як отримати нагороду|^Заберіть нагороду|^Нагорода|^Бонус (нарахов|отриму)/.test(x));
        if (pg.steps.length && !core.length) sbad.push(`no action step: «${pg.steps.join(" | ")}»`);
      }
      check(p, `${tag}: «Що зробити» steps fit the category`, sbad.length === 0, sbad.join(" ; ") || pg.steps.join(" | ").slice(0, 300));
      // status vs dates written in the rules
      const now = Date.now();
      const ds = [...`${pg.rules}`.matchAll(/\b(20\d\d)[.\-/](\d{1,2})[.\-/](\d{1,2})\b/g)].map((m) => Date.UTC(+m[1], +m[2] - 1, +m[3])).filter((t) => t > Date.UTC(2025, 0, 1));
      const stBadge = pg.status.find((x) => /^(Триває|Закінчується|Скоро старт)$/.test(x));
      const ended = !pr.endsAt && ds.length >= 2 && Math.max(...ds) < now - 86400e3;
      check(p, `${tag}: the page does not call a promo running when its own rules give an end date in the past`, !(ended && stBadge && stBadge !== "Скоро старт"), ended ? `badge «${stBadge}», «Час» tile «${(pg.tiles.find((x) => x.startsWith("Час")) ?? "").slice(0, 40)}», rules dates up to ${new Date(Math.max(...ds)).toISOString().slice(0, 10)}` : `${ds.length} dates in the rules; endsAt ${pr.endsAt ? new Date(pr.endsAt).toISOString().slice(0, 10) : "—"}`);
      report.push({ id: pr.id, category: pr.category, venue: pr.venue.id, path, h1: pg.h1, status: pg.status, tiles: pg.tiles, steps: pg.steps, facts: pg.facts, links: links.length, bad, redir, value: { net: v?.net, perUser: pu, pool }, rules: pg.rules.slice(0, 600) });
    }
    await p.close();
  });
  fs.writeFileSync(pth.join(OUT, "promo10.json"), JSON.stringify(report, null, 1));
};

S.check2 = async () => {
  const CASES = [
    ["https://www.binance.com/uk-UA/activity/referral", "official", /Офіційний сайт Binance \(binance\.com\)/],
    ["https://www.okx.com/ua/join", "official", /Офіційний сайт OKX/],
    ["HTTPS://WWW.BYBIT.COM/en/promo/", "official", /Офіційний сайт Bybit/],
    ["https://t.me/binance_announcements", "official", /Офіційний Telegram-канал Binance/],
    ["binance-com.top", "fake", /Схоже на Binance, але це НЕ офіційний сайт/],
    ["bybit.support-help.io", "fake", /Схоже на Bybit, але це НЕ офіційний сайт/],
    ["t.me/binance_support_ua", "fake", /схоже на підробку/],
    ["https://www.binance.com@evil-login.com/", "fake", /НЕ офіційний сайт|Підозріла/],   // r3: since 7a97a90 the "user@host" disguise is a red verdict (r2 F2-13 asked for it)
    ["bіnance.com", "fake", /НЕ офіційний сайт|Підозріла/],
    ["https://okx.com.claim-airdrop.io/wallet", "fake", /Схоже на OKX, але це НЕ офіційний сайт/],
    ["!!! ??? ###", "invalid", /не схоже на посилання/],
    ["   ", "invalid", /не схоже на посилання/],
  ];
  for (const kind of ["desk", "phone"]) {
    await withCtx(kind, async (c) => {
      const p = await newPage(c);
      await go(p, "/uk/check/");
      const inp = p.locator("main form input");
      const verdict = () => p.locator("main form + div").innerText().then(txt).catch(() => "");
      // empty: the browser's own "required" message, no verdict
      await inp.fill(""); await p.locator("main form button[type=submit]").click(); await p.waitForTimeout(150);
      const emptyState = { missing: await inp.evaluate((i) => i.validity.valueMissing), msg: await inp.evaluate((i) => i.validationMessage), verdict: await verdict() };
      check(p, "check2: empty input → native «fill in this field», no verdict", emptyState.missing && !emptyState.verdict, JSON.stringify(emptyState));
      for (const [q, want, re] of (kind === "desk" ? CASES : CASES.filter((x) => ["binance-com.top", "t.me/binance_support_ua", "   ", "https://www.okx.com/ua/join"].includes(x[0])))) {
        await inp.fill(q); await p.locator("main form button[type=submit]").click(); await p.waitForTimeout(200);
        const v = await verdict();
        const okKind = want === "official" ? /^Офіційн/.test(v) : want === "invalid" ? true : !/^Офіційн/.test(v);
        check(p, `check2 «${q}» → ${want}`, okKind && re.test(v), v.slice(0, 160) || "(no verdict shown)");
      }
      await p.close();
    });
  }
  // en / ru verdict texts
  await withCtx("desk", async (c) => {
    const p = await newPage(c);
    for (const [lang, ok, fake] of [["en", /Official Bybit website/, /NOT the official site/], ["ru", /Официальный сайт Bybit/, /НЕ официальный сайт/]]) {
      await go(p, `/${lang}/check/`);
      const inp = p.locator("main form input");
      for (const [q, re] of [["bybit.com", ok], ["bybit-bonus.com", fake]]) { await inp.fill(q); await p.locator("main form button[type=submit]").click(); await p.waitForTimeout(200); const v = txt(await p.locator("main form + div").innerText().catch(() => "")); check(p, `check2 ${lang} «${q}»`, re.test(v), v.slice(0, 120)); }
    }
    await p.close();
  });
};

S.counters = async () => {
  const geoUa = FEED.promos.filter((x) => geoAllowed(x, "ua"));
  await withCtx("desk", async (c) => {
    const p = await newPage(c);
    // home hero + live line + geo note
    await go(p, "/uk/"); await feedReady(p);
    const hero = await p.$$eval("main dl > div", (ds) => ds.map((d) => [...d.querySelectorAll("dd")].map((x) => x.innerText.trim())));
    const active0 = num(hero[0]?.[0]); const venues0 = num(hero[2]?.[0]);
    check(p, "counters: hero «активних акцій» = promos in the feed", active0 === FEED.promos.length, `${hero[0]?.[0]} vs ${FEED.promos.length}`);
    const vN = new Set(FEED.promos.filter((x) => x.venue.kind !== "airdrop").map((x) => x.venue.id)).size;
    check(p, "counters: hero «майданчиків» = distinct venues in the feed", venues0 === vN, `${hero[2]?.[0]} vs ${vN}`);
    const live = txt(await p.locator("main p").filter({ hasText: /нових за добу/ }).first().innerText().catch(() => ""));
    const day = FEED.promos.filter((x) => x.publishedAt > FEED.fetchedAt - 86400e3).length;
    check(p, "counters: «N нових за добу» = promos published in the 24 h before the update", num(live.match(/(\d+) нових за добу/)?.[1]) === day, `«${live}» vs ${day}`);
    const geoNote = txt(await p.locator("main p").filter({ hasText: /^Сховано/ }).first().innerText().catch(() => ""));
    check(p, "counters: «Сховано N акцій…» = promos not shown for Ukraine", num(geoNote) === FEED.promos.length - geoUa.length, `«${geoNote.slice(0, 60)}» vs ${FEED.promos.length - geoUa.length}`);
    // type tabs with a status filter / search
    await openFilters(p);
    await selPick(p, p.locator('button[aria-haspopup="listbox"][aria-label="Будь-який статус"]'), "Скоро старт");
    const tabsAt = async () => p.$$eval('[role=group][aria-label="Тип"] button', (els) => els.map((e) => ({ t: e.innerText.replace(/\s+/g, " ").trim().replace(/\s*\d+$/, ""), n: Number(e.innerText.match(/(\d+)\s*$/)?.[1]) })));
    const chipAll = async () => num((await chipInfo(p))[0].t);
    let tabs = await tabsAt();
    const allN = await chipAll();
    check(p, "counters: with status «Скоро старт», type tab «Усе» = chip «Усі» = cards", tabs[0].n === allN && allN === (await allCardsMapped(p)).length, `tab «Усе» ${tabs[0].n}, chip «Усі» ${allN}`);
    const mism = [];
    for (const t of tabs.slice(1)) {
      await p.locator('[role=group][aria-label="Тип"] button').filter({ hasText: new RegExp(`^${t.t}`) }).first().click(); await p.waitForTimeout(150);
      const n = (await allCardsMapped(p)).length; if (n !== t.n) mism.push(`«${t.t} ${t.n}» → ${n} cards`);
    }
    check(p, "counters: with a status filter every type tab count = the cards it shows", mism.length === 0, mism.join(" ; "));
    await p.locator('[role=group][aria-label="Тип"] button').first().click(); await p.waitForTimeout(100);
    await selPick(p, p.locator('button[aria-haspopup="listbox"][aria-label="Будь-який статус"]'), "Будь-який статус");
    await p.fill(SEARCH, "usdt"); await p.waitForTimeout(250);
    tabs = await tabsAt();
    check(p, "counters: with a search, type tab «Усе» = chip «Усі»", tabs[0].n === (await chipAll()), `tab ${tabs[0].n} vs chip ${await chipAll()}`);
    // venue menu counts with a search / a category
    const vSum = p.locator("details[data-pop] > summary").filter({ hasText: "Майданчики" }).first();
    const venueCheck = async (label) => {
      await vSum.click(); await p.waitForTimeout(150);
      const vb = p.locator("details[open] [role=group] button");
      const v0 = txt(await vb.nth(0).innerText()); const n0 = Number(v0.match(/(\d+)$/)?.[1]);
      await vb.nth(0).click(); await p.waitForTimeout(200);
      const got = (await allCardsMapped(p)).length;
      check(p, `counters: venue menu count with ${label} = cards after picking it`, got === n0, `«${v0}» → ${got} cards`);
      await vSum.click().catch(() => {}); if (!(await p.locator("details[data-pop][open]").count())) await vSum.click();
      await vb.nth(0).click(); await p.waitForTimeout(150); await p.locator("h1").first().click(); await p.waitForTimeout(100);
    };
    await venueCheck("search «usdt»");
    await p.fill(SEARCH, ""); await chips(p).filter({ hasText: "Earn / Стейкінг" }).first().click(); await p.waitForTimeout(200);
    await venueCheck("category «Earn»");
    await resetFeed(p);
    // /sales/
    await go(p, "/uk/sales/");
    const sales = await p.$$eval("main section", (ss) => ss.map((s) => ({ h: s.querySelector("h2")?.innerText.replace(/\s+/g, " ").trim(), li: s.querySelectorAll(":scope ul > li").length })).filter((x) => x.h));
    const sb = sales.filter((x) => /\d+\s*(бірж[аі]?)?$/.test(x.h) && num(x.h.match(/(\d+)\s*(бірж[аі]?)?$/)?.[1]) !== x.li);
    check(p, "counters: /sales/ section counts = rows (and pre-IPO «· N бірж» = exchange cards)", sales.length > 0 && sb.length === 0, sb.map((x) => `«${x.h}» has ${x.li}`).join(" ; ") || JSON.stringify(sales));
    // /bonuses/: «Пропозицій: N» vs listed links
    await go(p, "/uk/bonuses/");
    const bon = await p.$$eval("main section.card", (ss) => ss.map((s) => ({ v: s.querySelector(".text-lg")?.innerText.trim(), n: Number(s.innerText.match(/Акцій:\s*(\d+)/)?.[1]), links: s.querySelectorAll("ul a").length, more: !!s.querySelector("a[href*='/v/']") })));
    const bonBad = bon.filter((x) => x.n !== x.links && !x.more);
    check(p, "counters: /bonuses/ «Акцій: N» = offers listed (or a link to the rest)", bon.length > 0 && bonBad.length === 0, bonBad.map((x) => `${x.v}: says ${x.n}, lists ${x.links}`).join(" ; ") || `${bon.length} venues`);
    // /v/<venue>/ for every venue page in the sitemap
    const vpaths = (await sitemapPaths()).filter((u) => /^\/uk\/v\/[^/]+\/$/.test(u));
    const vbad = [];
    for (const vp of vpaths) {
      const id = vp.split("/")[3];
      await go(p, vp); await p.waitForTimeout(300);
      const all = FEED.promos.filter((x) => x.venue.id === id), ua = all.filter((x) => geoAllowed(x, "ua"));
      const headN = num(await p.locator("main p.font-mono").first().innerText().catch(() => ""));
      const chipN = num((await chipInfo(p))[0]?.t);
      const cardsN = (await allCardsMapped(p)).length;
      if (!(headN === all.length && chipN === ua.length && cardsN === ua.length)) vbad.push(`${id}: header ${headN} (feed ${all.length}), chip «Усі» ${chipN} (UA ${ua.length}), cards ${cardsN}`);
    }
    check(p, `counters: /v/<venue>/ header count = feed, chip «Усі» = cards (${vpaths.length} venues)`, vbad.length === 0, vbad.slice(0, 6).join(" ; "));
    // /t/ index numbers = the token page sections
    await go(p, "/uk/t/");
    const idx = await p.$$eval("main a.card[href*='/t/']", (as) => as.map((a) => ({ h: a.getAttribute("href"), sym: a.querySelector(".font-bold")?.innerText.trim(), meta: a.querySelector(".text-xs")?.innerText.trim() ?? "" })));
    const sample = idx.filter((x) => /акці|Launchpool/.test(x.meta)).slice(0, 12);
    const tbad = [];
    for (const t of sample) {
      await go(p, t.h.replace(BP, ""));
      const hs = await p.$$eval("main h2", (els) => els.map((h) => h.innerText.replace(/\s+/g, " ").trim()));
      const pn = num(t.meta.match(/(\d+)\s*акці/)?.[1]); const ln = num(t.meta.match(/(\d+)\s*Launchpool/)?.[1]);
      const hp = num(hs.find((h) => /^Акції/.test(h))?.match(/(\d+)$/)?.[1]);
      const hl = hs.filter((h) => /Launchpool/i.test(h)).reduce((s, h) => s + (num(h.match(/(\d+)$/)?.[1]) || 0), 0);
      if ((Number.isFinite(pn) && pn !== hp) || (Number.isFinite(ln) && ln !== hl)) tbad.push(`${t.sym}: index «${t.meta}» vs page ${JSON.stringify(hs.filter((h) => /\d+$/.test(h)))}`);
    }
    check(p, `counters: /t/ index numbers = the token pages' section counts (${sample.length} tokens)`, sample.length > 0 && tbad.length === 0, tbad.slice(0, 4).join(" ; "));
    await p.close();
  });
};

// r2: content checks over every /uk/p/ page (static HTML via HTTP) + the pinned top card — re-tests r1 F3/F4 and r2 F2-1…F2-4 (F2-11 as INFO)
S.content = async () => {
  await withCtx("desk", async (c) => {
    const p = await newPage(c);
    // pin #1 «Найбільше на 1 людину»: the site must have its own estimate for it (a bare headline sum like «win $30000» has none)
    await go(p, "/uk/"); await feedReady(p);
    const c0 = (await cards(p))[0]; const pr0 = promoOf(c0?.href);
    check(p, "content: pin #1 «Найбільше на 1 людину» has the site's own ≈ estimate (not a bare headline figure) (r1 F4 / F2-1)", !!pr0 && pr0.meta?.value?.net !== undefined, `${pr0?.id}: perUser $${pr0?.meta?.perUser?.usd}, pool ${pr0?.reward?.usd ?? "—"}, value.net ${pr0?.meta?.value?.net} («${pr0?.meta?.perUser?.text ?? ""}»)`);
    const heroPu = txt(await p.locator("main dl > div").nth(1).locator("dd").first().innerText().catch(() => ""));
    info(p, "content: hero «максимум на 1 людину»", heroPu);
    const paths = (await sitemapPaths()).filter((u) => /^\/uk\/p\/[^/]+\/$/.test(u));
    const strip = (h) => h.replace(/<script[\s\S]*?<\/script>/g, "").replace(/<[^>]+>/g, " ").replace(/&nbsp;|&#160;/g, " ").replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#x27;|&#39;/g, "'").replace(/\s+/g, " ");
    const pages = [];
    for (let i = 0; i < paths.length; i += 8) {
      const chunk = await Promise.all(paths.slice(i, i + 8).map(async (u) => {
        const r = await p.request.get(BASE + u, { timeout: 30000 }).catch(() => null);
        const h = r ? await r.text() : "";
        const main = /<main[\s\S]*?<\/main>/.exec(h)?.[0] ?? "";
        const head = /<header[\s\S]*?<\/header>/.exec(main)?.[0] ?? "";
        const rules = strip(/id="rules"[\s\S]*?<\/section>/.exec(main)?.[0] ?? "");
        const own = strip(main).split("Схожі акції")[0];
        return { u, pr: HMAP.get(u.split("/")[3].split("-")[0]), status: r?.status(), badge: [...head.matchAll(/rounded-md px-2 py-1[^"]*">([^<]+)</g)].map((m) => m[1]), rules, own };
      }));
      pages.push(...chunk);
    }
    check(p, `content: all ${paths.length} uk promo pages respond 200`, pages.every((x) => x.status === 200), pages.filter((x) => x.status !== 200).map((x) => `${x.u} ${x.status}`).slice(0, 5).join(", "));
    // ads / casino text scraped into the rules (F2-2)
    const ad = pages.filter((x) => /(казино|casino|Vault777)/i.test(x.own));
    check(p, "content: no casino / ad text on promo pages (F2-2)", ad.length === 0, ad.map((x) => `${x.u.slice(6, 40)}: «${(/.{0,40}(казино|casino|Vault777).{0,40}/i.exec(x.own)?.[0] ?? "").trim()}»`).slice(0, 5).join(" ; "));
    // «Без вкладень» promos whose own title / rules ask to trade or deposit (r1 F3)
    const COST = /(торгуйте|торгівл|обсяг торг|депозит від|внесіть|trade (onchain|on-chain)|trade proof|trading volume|\btrade\b|deposit)/i;
    const nd = pages.filter((x) => x.pr?.meta?.noDeposit && COST.test(`${x.pr.title} ${x.rules}`));
    check(p, "content: «Без вкладень» promos don't ask to trade or deposit (r1 F3)", nd.length === 0, nd.map((x) => `${x.pr.id}: «${(COST.exec(`${x.pr.title} ${x.rules}`)?.[0] ?? "")}»`).join(" ; "));
    // rules give only past dates but the page says it is running (F2-3)
    const now = Date.now();
    const exp = pages.filter((x) => { if (!x.pr || x.pr.endsAt) return false; const ds = [...x.rules.matchAll(/\b(20\d\d)[.\-/](\d{1,2})[.\-/](\d{1,2})\b/g)].map((m) => Date.UTC(+m[1], +m[2] - 1, +m[3])).filter((t) => t > Date.UTC(2025, 0, 1)); return ds.length >= 2 && Math.max(...ds) < now - 86400e3 && x.badge.some((b) => /^(Триває|Закінчується)$/.test(b)); });
    check(p, "content: no page shows «Триває» when its rules' dates are all in the past (F2-3)", exp.length === 0, exp.map((x) => `${x.pr.id} «${x.badge.join(",")}»`).join(" ; "));
    // «is live / kicks off» headlines shown as «Скоро старт» (F2-4)
    const LIVE = /\b(is (now )?live|live now|now live|has launched|kicks off now|is here|is open)\b/i;
    const up = FEED.promos.filter((x) => x.startsAt && x.startsAt > now && LIVE.test(x.title));
    check(p, "content: no «… is live / kicks off now» promo is shown as «Скоро старт» (F2-4)", up.length === 0, up.map((x) => `${x.id}: «${x.title.slice(0, 50)}» starts ${new Date(x.startsAt).toISOString().slice(0, 10)}`).join(" ; "));
    // possible duplicates: same venue + same pool + a shared distinctive word in the headline (INFO: confirm by hand)
    const big = FEED.promos.filter((x) => (x.reward?.usd ?? 0) >= 1000);
    const STOP = /^(Trade|Trading|Futures|Earn|Join|Live|Win|Rewards?|Campaign|Competition|Challenge|Event|Share|Prize|Pool|With|Your|From|Main|Battle|New|Launches|Assets)$/i;
    const words = (t) => new Set((t.match(/\b[A-Z][A-Za-z0-9]{3,}\b/g) ?? []).filter((w) => !STOP.test(w)));
    const dup = [];
    for (let i = 0; i < big.length; i++) for (let j = i + 1; j < big.length; j++) {
      const a = big[i], b = big[j];
      if (a.venue.id !== b.venue.id || a.reward.usd !== b.reward.usd) continue;
      const wa = words(a.title);
      if ([...words(b.title)].some((w) => wa.has(w))) dup.push(`${a.id} = ${b.id}`);
    }
    info(p, "content: possible duplicates (same venue + pool + headline word) — confirm by hand", dup.join(" ; ") || "none");
    await p.close();
  });
};

// ---------------------------------------------------------------- main
async function waitDeploy() {
  if (process.env.NOWAIT) return;
  for (let i = 0; i <= 15; i++) {
    const r = await fetch(`${BASE}/og-home.png?ts=${Date.now()}`, { method: "HEAD" }).catch(() => null);
    // a Pages deploy still queued / running means the site is about to change under the test
    const runs = await fetch("https://api.github.com/repos/obuzakiz99-oss/promoradar/actions/runs?per_page=5").then((x) => x.json()).catch(() => null);
    const busy = (runs?.workflow_runs ?? []).filter((w) => w.status !== "completed").map((w) => `${w.head_sha.slice(0, 7)} ${w.status}`);
    if (r?.status === 200 && !busy.length) { console.log(`deploy ready (og-home.png 200, last-modified ${r.headers.get("last-modified")}; latest run ${runs?.workflow_runs?.[0]?.head_sha?.slice(0, 7) ?? "?"})`); return; }
    console.log(`og-home.png → ${r?.status ?? "error"}; deploy runs busy: ${busy.join(", ") || "none"}; waiting 60 s (${i + 1}/15)`);
    await new Promise((res) => setTimeout(res, 60000));
  }
  console.log("deploy not confirmed after 15 min — running anyway");
}

const order = ["header", "home", "homephone", "select", "popovers", "promo", "my", "tables", "yield", "lists", "check", "learn", "misc", "sweep",
  "i18n", "tablet", "edge", "keyboard", "promo10", "check2", "counters", "content"]; // r2 sections after the r1 ones
const want = process.argv.slice(2).length ? process.argv.slice(2) : order;
await waitDeploy();
await loadFeed();
browser = await chromium.launch({ executablePath: CHROME, headless: true });

// the first-visit site tour prompt (components/SiteTour.tsx) would cover the page in every fresh context: mark it seen
// (qa/tour.mjs tests the tour itself)
{ const nc = browser.newContext.bind(browser); browser.newContext = async (o = {}) => { const c = await nc(o); await c.addInitScript(() => { try { if (!localStorage.getItem("pr:tour")) localStorage.setItem("pr:tour", "qa"); } catch { /* blocked */ } }); return c; }; }
const t0 = Date.now();
try {
  for (const s of want) if (S[s]) await section(s, S[s]); else console.log(`unknown section ${s}`);
} finally {
  await browser.close();
}
SEC = "pages";
console.log("\n=== per-page console / errors / requests / overflow ===");
for (const e of Object.values(PAGES).sort((a, b) => a.path.localeCompare(b.path) || a.vp.localeCompare(b.vp))) {
  const w = { url: e.path, vp: e.vp };
  rec(e.console.length ? "FAIL" : "PASS", "no console errors", e.console.join(" | "), w);
  rec(e.pageerror.length ? "FAIL" : "PASS", "no uncaught page errors", e.pageerror.join(" | "), w);
  rec(e.http.length ? "FAIL" : "PASS", "no failed same-origin requests", e.http.join(" | "), w);
  if (e.http3p.length) rec("INFO", "third-party request errors", e.http3p.join(" | "), w);
  if ((e.vp === "390" || e.vp === "768") && e.overflow) rec(e.overflow.sw > Number(e.vp) ? "FAIL" : "PASS", `no horizontal overflow at ${e.vp} px`, e.overflow.sw > Number(e.vp) ? `scrollWidth ${e.overflow.sw}: ${(e.overflow.bad ?? []).join(" ; ")}` : "", w);
}
const sum = R.reduce((s, r) => ((s[r.status] = (s[r.status] ?? 0) + 1), s), {});
console.log(`\nDONE in ${Math.round((Date.now() - t0) / 1000)} s — ${JSON.stringify(sum)}`);
const outFile = pth.join(OUT, "func.json");
let prev = [];
// a partial re-run (sections given) merges into the existing file: other sections and per-page records of pages not
// visited again are kept
let prevPages = {};
if (process.argv.slice(2).length && fs.existsSync(outFile)) {
  try {
    const old = JSON.parse(fs.readFileSync(outFile, "utf8"));
    prevPages = Object.fromEntries(Object.entries(old.pages ?? {}).filter(([k]) => !PAGES[k]));
    const redone = new Set(Object.keys(PAGES).map((k) => k));
    prev = old.results.filter((r) => !want.includes(r.sec) && !(r.sec === "pages" && redone.has(`${r.vp} ${r.url}`)));
  } catch { prev = []; }
}
const all = [...prev, ...R];
const total = all.reduce((s2, r) => ((s2[r.status] = (s2[r.status] ?? 0) + 1), s2), {});
fs.writeFileSync(outFile, JSON.stringify({ site: BASE, at: new Date().toISOString(), sections: want, summary: total, thisRun: sum, feed: { promos: FEED.promos.length, fetchedAt: FEED.fetchedAt }, results: all, pages: { ...prevPages, ...PAGES } }, null, 1));
console.log(`wrote ${outFile}`);
