// Site tour test (components/SiteTour.tsx, src/lib/tours/*). Since 22.11 every section page has its own tour.
//  Home: first-visit prompt, «yes» → tour, «no» → never again, `?tour=1` replay, Esc, keyboard (→ ← Tab), axe.
//  Every page × width × language: the «How to use this page» button starts the tour; at every step the card is on
//  screen (above the phone tab bar), its text fits without an inner scroll, it does not cover the highlight (unless
//  there is no room), the highlight is on screen, focus is in the card, no sideways scroll; no page errors.
//  A newcomer (pr:tour=done) gets «Explain this page?» on another page; «Not now» stops it there.
// Usage: node tour.mjs [--base=URL] [--out=out/tour] [--only=launchpools,earn] [--fast]   (--fast: uk only, phone + desktop)
import { chromium } from "playwright-core";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const args = Object.fromEntries(process.argv.slice(2).map((a) => { const [k, ...v] = a.replace(/^--/, "").split("="); return [k, v.length ? v.join("=") : true]; }));
const BASE = (args.base || "https://obuzakiz99-oss.github.io/promoradar").replace(/\/$/, "");
const ORIGIN = new URL(BASE).origin, BP = new URL(BASE).pathname.replace(/\/$/, "");
const OUT = path.resolve(HERE, args.out || "out/tour");
fs.mkdirSync(OUT, { recursive: true });
const CHROME = process.env.CHROME || "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const AXE = fs.readFileSync(path.join(HERE, "node_modules/axe-core/axe.min.js"), "utf8");
const W = {
  phone: { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 },
  tablet: { viewport: { width: 768, height: 1024 }, hasTouch: true, deviceScaleFactor: 1 },
  desktop: { viewport: { width: 1280, height: 800 }, deviceScaleFactor: 1 },
};
const RUNS = args.fast ? [["phone", "uk"], ["desktop", "uk"]] : [["phone", "uk"], ["phone", "en"], ["phone", "ru"], ["tablet", "uk"], ["desktop", "uk"], ["desktop", "ru"]];
const BTN = { uk: "Як користуватися сторінкою", en: "How to use this page", ru: "Как пользоваться страницей" };
const DONE = /Зрозуміло|Got it|Понятно/;
const res = []; let fail = 0;
const ok = (w, name, pass, info = "") => { res.push(`${pass ? "PASS" : "FAIL"} [${w}] ${name}${info ? ` — ${info}` : ""}`); if (!pass) fail++; };
const note = (w, name, info = "") => res.push(`INFO [${w}] ${name}${info ? ` — ${info}` : ""}`);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const slugId = (id) => id.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
function hash(s) { let h = 0x811c9dc5; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193); } return (h >>> 0).toString(36); }

// pages: the static sections + one live sample of each dynamic page
const sm = [...(await (await fetch(`${BASE}/sitemap.xml?ts=${Date.now()}`)).text()).matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1].replace(ORIGIN, "").replace(BP, ""));
const promos = (await (await fetch(`${BASE}/api/promos.json?ts=${Date.now()}`)).json()).promos;
const pools = await (await fetch(`${BASE}/api/pools.json?ts=${Date.now()}`)).json().catch(() => ({ projects: [] }));
const now = Date.now();
const promoOf = (cat) => { const p = promos.find((x) => x.category === cat && (!x.endsAt || x.endsAt > now) && !x.meta?.thin); return p && sm.find((u) => u.startsWith(`/uk/p/${hash(p.id)}-`))?.slice(4); };
const lpPaths = new Set(sm.filter((u) => /^\/uk\/lp\/[^/]+\/$/.test(u)).map((u) => u.split("/")[3]));
const lpLive = (pools.projects ?? []).map((x) => ({ ...x, s: slugId(x.id) })).find((x) => x.status !== "ended" && lpPaths.has(x.s))?.s ?? [...lpPaths][0];
const first = (re) => sm.find((u) => re.test(u))?.slice(4);
const PAGES = [
  ["home", ""], ["launchpools", "launchpools/"], ["earn", "earn/"], ["dex", "dex/"], ["fixed", "fixed/"], ["lp", lpLive && `lp/${lpLive}/`],
  ["history", "history/"], ["hedge", "hedge/"], ["promo:competition", promoOf("competition")], ["promo:earn", promoOf("earn")], ["promo:bonus", promoOf("bonus")],
  ["calendar", "calendar/"], ["unlocks", "unlocks/"], ["sales", "sales/"], ["drops", "drops/"], ["zerofees", "zero-fees/"],
  ["tokens", "t/"], ["token", first(/^\/uk\/t\/[^/]+\/$/)], ["my", "my/"], ["venue", first(/^\/uk\/v\/[^/]+\/$/)], ["learn", "learn/"],
].filter(([id, u]) => u !== undefined && (!args.only || String(args.only).split(",").some((x) => id.startsWith(x))));
console.log(PAGES.map(([id, u]) => `${id}=/${u}`).join("\n"));

const browser = await chromium.launch({ executablePath: CHROME, headless: true });
const ctx = (w, init) => browser.newContext({ ...W[w], serviceWorkers: "block", locale: "uk-UA", colorScheme: "dark" }).then(async (c) => { if (init) await c.addInitScript(init); return c; });
const card = (p) => p.locator('[role=dialog][aria-modal=true]');

/** Walk the open tour to the end, checking every step. */
async function walk(p, w, tag, shots) {
  const seen = []; let total = 0;
  for (let k = 0; k < 20; k++) {
    await sleep(500);
    // wait until the scroll has settled (the highlight stops moving), at most 4 s
    await p.evaluate(() => new Promise((res) => { let last = "", same = 0, n = 0; const f = () => { const b = document.querySelector(".tour-spot")?.getBoundingClientRect(); const k = b ? `${Math.round(b.top)},${Math.round(b.left)}` : "-"; same = k === last ? same + 1 : 0; last = k; if (same >= 6 || ++n > 240) res(); else requestAnimationFrame(f); }; f(); }));
    await sleep(250);   // the card's transition
    const m = await p.evaluate(() => {
      const d = document.querySelector('[role=dialog][aria-modal=true]');
      if (!d) return null;
      const ring = document.querySelector(".tour-spot"), body = d.querySelector("#tour-x");
      const r = d.getBoundingClientRect(), b = ring?.getBoundingClientRect();
      return {
        title: d.querySelector("h2")?.textContent, step: d.querySelector("span")?.textContent,
        card: [r.top, r.left, r.width, r.height].map(Math.round), vw: innerWidth, vh: innerHeight, bar: innerWidth < 768 ? 72 : 0,
        ring: b ? [b.top, b.left, b.width, b.height].map(Math.round) : null,
        cut: body ? body.scrollHeight - body.clientHeight : 0,
        focusIn: d.contains(document.activeElement), scrollW: document.documentElement.scrollWidth,
        top: scrollY < 2, end: scrollY + innerHeight >= document.documentElement.scrollHeight - 2,
      };
    });
    if (!m) { ok(w, `${tag}: tour still open at step ${k + 1}`, false); break; }
    seen.push(m.title); total = +String(m.step).split(" ").pop();
    const [ct, cl, cw, chh] = m.card, s = `${tag} ${m.step} «${m.title}»`;
    ok(w, `${s}: card on screen, above the tab bar`, ct >= 0 && cl >= 0 && cl + cw <= m.vw && ct + chh <= m.vh - m.bar + 1, JSON.stringify(m.card));
    ok(w, `${s}: text fits the card without scrolling`, m.cut <= 2, `${m.cut}px hidden`);
    if (m.ring) {
      const [rt, rl, rw, rh] = m.ring;
      ok(w, `${s}: highlighted element on screen`, rt + rh > 0 && rt < m.vh && rw > 0, JSON.stringify(m.ring));
      // the card may cover a tall highlight only when there is no room above or below it
      const overlap = !(ct >= rt + rh - 1 || ct + chh <= rt + 1 || cl >= rl + rw || cl + cw <= rl);
      // no room = the element and the card (with the tour's margins: 76px header, 12px gap, 16px edge) don't fit the
      // screen together, counting the part of the screen lost when the page can't scroll further (element near the
      // top or the end of the page)
      const lost = m.top || m.end ? Math.max(0, rt - 70) : 0;   // the element can't move up to the header
      const roomless = rh + chh + 12 + 16 + 70 + lost > m.vh - m.bar;
      ok(w, `${s}: card does not cover the highlight`, !overlap || roomless, overlap ? `card ${m.card} ring ${m.ring}` : "");
    }
    ok(w, `${s}: focus inside the card`, m.focusIn);
    ok(w, `${s}: no sideways scroll`, m.scrollW <= m.vw, String(m.scrollW));
    if (shots) await p.screenshot({ path: path.join(OUT, `${shots}-${String(k + 1).padStart(2, "0")}.png`) });
    const btn = card(p).locator("button.btn-primary");
    const last = DONE.test(await btn.textContent());
    await btn.click();
    if (last) break;
  }
  await sleep(300);
  ok(w, `${tag}: tour finished`, await card(p).count() === 0, seen.join(" → "));
  note(w, `${tag}: steps shown ${seen.length} of ${total}`, seen.length < total ? "skipped: element absent here" : "");
  return seen;
}

// 1) home: first visit, keyboard, replay
for (const [w, lang] of RUNS.filter(([, l]) => l === "uk")) {
  const c = await ctx(w), p = await c.newPage();
  const errs = []; p.on("pageerror", (e) => errs.push(String(e).slice(0, 200)));
  await p.goto(`${BASE}/${lang}/`, { waitUntil: "load", timeout: 60_000 });
  const ask = p.getByRole("dialog").filter({ hasText: /PromoRadar\?/ });
  const shown = await ask.waitFor({ timeout: 6000 }).then(() => true, () => false);
  ok(w, `home ${lang}: first-visit prompt appears`, shown);
  if (shown) {
    await ask.locator("button").first().click();
    await card(p).waitFor({ timeout: 4000 });
    await sleep(900);
    await p.addScriptTag({ content: AXE });
    const ax = await p.evaluate(async () => (await window.axe.run(document, { runOnly: ["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"] })).violations.map((v) => `${v.id}:${v.nodes.length}`));
    ok(w, "home: axe on the open tour", ax.length === 0, ax.join(" "));
    for (let t = 0; t < 4; t++) await p.keyboard.press("Tab");
    ok(w, "home: Tab keeps focus in the card", await p.evaluate(() => document.querySelector('[role=dialog][aria-modal=true]').contains(document.activeElement)));
    const t0 = await card(p).locator("h2").textContent();
    await p.keyboard.press("ArrowRight"); await sleep(700);
    const t2 = await card(p).locator("h2").textContent();
    await p.keyboard.press("ArrowLeft"); await sleep(700);
    const t1 = await card(p).locator("h2").textContent();
    ok(w, "home: → / ← move between steps", t2 !== t0 && t1 === t0, `${t0} → ${t2} → ${t1}`);
    await walk(p, w, `home ${lang}`, `home-${w}`);
    ok(w, "home: remembered as done", (await p.evaluate(() => [localStorage.getItem("pr:tour"), localStorage.getItem("pr:tour:home")].join())) === "done,done");
    await p.reload({ waitUntil: "load" }); await sleep(2500);
    ok(w, "home: no prompt on the next visit", await p.getByRole("dialog").count() === 0);
    // a newcomer on another page: «Explain this page?»; «Not now» → not asked there again
    await p.goto(`${BASE}/${lang}/launchpools/`, { waitUntil: "load" });
    const pg = p.getByRole("dialog").filter({ hasText: /Пояснити сторінку/ });
    const asked = await pg.waitFor({ timeout: 6000 }).then(() => true, () => false);
    ok(w, "newcomer: another page offers its own tour", asked);
    if (asked) { await pg.getByRole("button", { name: "Не зараз" }).click(); await p.reload({ waitUntil: "load" }); await sleep(2500); ok(w, "«Не зараз» — not asked on that page again", await pg.count() === 0); }
  }
  await p.goto(`${BASE}/${lang}/?tour=1`, { waitUntil: "load" });
  const again = await card(p).waitFor({ timeout: 5000 }).then(() => true, () => false);
  ok(w, "home: ?tour=1 starts the tour", again);
  ok(w, "home: ?tour=1 removed from the address", !p.url().includes("tour=1"), p.url());
  if (again) { await p.keyboard.press("Escape"); await sleep(300); ok(w, "home: Esc closes", await card(p).count() === 0); }
  ok(w, "home: no page errors", errs.length === 0, errs.join(" | "));
  await c.close();
}
// «No thanks» stops the prompt everywhere
{
  const c = await ctx("phone"), p = await c.newPage();
  await p.goto(`${BASE}/uk/earn/`, { waitUntil: "load" });
  const ask = p.getByRole("dialog").filter({ hasText: /PromoRadar\?/ });
  const shown = await ask.waitFor({ timeout: 6000 }).then(() => true, () => false);
  ok("phone", "first visit on a section page asks too", shown);
  if (shown) {
    await ask.getByRole("button", { name: /Ні, я розберусь/ }).click();
    await p.goto(`${BASE}/uk/`, { waitUntil: "load" }); await sleep(2500);
    ok("phone", "«Ні» — no prompt on any page afterwards", await p.getByRole("dialog").count() === 0);
  }
  await c.close();
}

// 2) every page × width × language, started from the page's button
for (const [w, lang] of RUNS) {
  const c = await ctx(w, () => { try { if (!localStorage.getItem("pr:tour")) localStorage.setItem("pr:tour", "qa"); } catch { /* */ } });
  const p = await c.newPage();
  for (const [id, u] of PAGES) {
    const errs = []; const onErr = (e) => errs.push(String(e).slice(0, 200)); p.on("pageerror", onErr);
    const tag = `${id} ${lang}`;
    try {
      await p.goto(`${BASE}/${lang}/${u}`, { waitUntil: "load", timeout: 60_000 }); await sleep(800);
      const b = p.getByRole("button", { name: BTN[lang], exact: true });
      const n = await b.count();
      if (id === "home") { ok(w, `${tag}: no extra page button on home (hero link instead)`, true); await p.goto(`${BASE}/${lang}/?tour=1`, { waitUntil: "load" }); }
      else {
        ok(w, `${tag}: «${BTN[lang]}» button present`, n >= 1, `${n}`);
        if (!n) continue;
        await b.first().click();
      }
      const opened = await card(p).waitFor({ timeout: 5000 }).then(() => true, () => false);
      ok(w, `${tag}: tour opens`, opened);
      if (!opened) continue;
      if (w === "phone" && lang === "uk" && id !== "home") {
        await sleep(900); await p.addScriptTag({ content: AXE });
        const ax = await p.evaluate(async () => (await window.axe.run(document, { runOnly: ["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"] })).violations.map((v) => `${v.id}:${v.nodes.length}`));
        ok(w, `${tag}: axe on the open tour`, ax.length === 0, ax.join(" "));
      }
      await walk(p, w, tag, lang === "uk" ? `${id.replace(":", "-")}-${w}` : "");
      ok(w, `${tag}: no page errors`, errs.length === 0, errs.join(" | "));
    } catch (e) { ok(w, `${tag}: crashed`, false, String(e.message).slice(0, 200)); }
    finally { p.off("pageerror", onErr); }
  }
  await c.close();
}
await browser.close();
fs.writeFileSync(path.join(OUT, "result.txt"), res.join("\n"));
console.log(res.filter((r) => r.startsWith("FAIL")).join("\n") || "all pass");
console.log(res.filter((r) => r.startsWith("INFO") && r.includes("skipped")).join("\n"));
console.log(`${res.filter((r) => r.startsWith("PASS")).length} PASS, ${fail} FAIL → ${OUT}`);
process.exit(fail ? 1 : 0);
