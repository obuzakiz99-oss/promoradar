// Site tour test (components/SiteTour.tsx): first-visit prompt, every step highlighted on screen, card visible and not
// covering the highlight or sitting under the phone tab bar, keyboard (→ ← Esc, focus kept in the card), "?tour=1" replay,
// no prompt after an answer, axe on the open tour. Usage: node tour.mjs [--base=URL] [--out=out/tour]
import { chromium } from "playwright-core";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const args = Object.fromEntries(process.argv.slice(2).map((a) => { const [k, ...v] = a.replace(/^--/, "").split("="); return [k, v.length ? v.join("=") : true]; }));
const BASE = (args.base || "https://obuzakiz99-oss.github.io/promoradar").replace(/\/$/, "");
const OUT = path.resolve(HERE, args.out || "out/tour");
fs.mkdirSync(OUT, { recursive: true });
const CHROME = process.env.CHROME || "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const AXE = fs.readFileSync(path.join(HERE, "node_modules/axe-core/axe.min.js"), "utf8");
const W = {
  phone: { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 },
  tablet: { viewport: { width: 768, height: 1024 }, hasTouch: true, deviceScaleFactor: 1 },
  desktop: { viewport: { width: 1280, height: 800 }, deviceScaleFactor: 1 },
};
const res = []; let fail = 0;
const ok = (w, name, pass, info = "") => { res.push(`${pass ? "PASS" : "FAIL"} [${w}] ${name}${info ? ` — ${info}` : ""}`); if (!pass) fail++; };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const browser = await chromium.launch({ executablePath: CHROME, headless: true });
for (const [w, opt] of Object.entries(W)) {
  for (const lang of w === "desktop" ? ["uk", "en", "ru"] : ["uk"]) {
    const c = await browser.newContext({ ...opt, serviceWorkers: "block", locale: "uk-UA", colorScheme: "dark" });
    const p = await c.newPage();
    const errs = []; p.on("pageerror", (e) => errs.push(String(e).slice(0, 200)));
    await p.goto(`${BASE}/${lang}/`, { waitUntil: "load", timeout: 60_000 });
    const ask = p.getByRole("dialog").filter({ hasText: /PromoRadar\?/ });
    const shown = await ask.waitFor({ timeout: 6000 }).then(() => true, () => false);
    ok(w, `${lang}: first-visit prompt appears`, shown);
    if (!shown) { await c.close(); continue; }
    await ask.locator("button").first().click();
    const card = p.locator('[role=dialog][aria-modal=true]');
    await card.waitFor({ timeout: 4000 });
    const seen = [];
    for (let k = 0; k < 15; k++) {
      await sleep(900);   // smooth scroll + placement
      const m = await p.evaluate(() => {
        const d = document.querySelector('[role=dialog][aria-modal=true]');
        const ring = document.querySelector(".tour-spot");
        const r = d.getBoundingClientRect(), b = ring?.getBoundingClientRect();
        const bar = innerWidth < 768 ? 72 : 0;
        return {
          title: d.querySelector("h2")?.textContent, step: d.querySelector("span")?.textContent,
          card: [r.top, r.left, r.width, r.height].map(Math.round), vw: innerWidth, vh: innerHeight, bar,
          ring: b ? [b.top, b.left, b.width, b.height].map(Math.round) : null,
          focusIn: d.contains(document.activeElement),
          scrollW: document.documentElement.scrollWidth,
        };
      });
      seen.push(m.title);
      const [ct, cl, cw, chh] = m.card;
      const inView = ct >= 0 && cl >= 0 && cl + cw <= m.vw && ct + chh <= m.vh - m.bar + 1;
      ok(w, `${lang} step ${m.step} «${m.title}»: card on screen, above the tab bar`, inView, JSON.stringify(m.card));
      if (m.ring) {
        const [rt, rl, rw, rh] = m.ring;
        const ringVisible = rt + rh > 0 && rt < m.vh && rw > 0;
        ok(w, `${lang} step ${m.step}: highlighted element on screen`, ringVisible, JSON.stringify(m.ring));
        // the card may cover a tall highlight only when there is no room above or below it
        const overlap = !(ct >= rt + rh - 1 || ct + chh <= rt + 1 || cl >= rl + rw || cl + cw <= rl);
        const roomless = rh + chh + 24 > m.vh - m.bar;
        ok(w, `${lang} step ${m.step}: card does not cover the highlight`, !overlap || roomless, overlap ? `card ${m.card} ring ${m.ring}` : "");
      }
      ok(w, `${lang} step ${m.step}: focus inside the card`, m.focusIn);
      ok(w, `${lang} step ${m.step}: no sideways scroll`, m.scrollW <= m.vw, String(m.scrollW));
      if (lang === "uk" && k < 12) await p.screenshot({ path: path.join(OUT, `${w}-${String(k + 1).padStart(2, "0")}.png`) });
      if (k === 0 && lang === "uk") {
        await p.addScriptTag({ content: AXE });
        const ax = await p.evaluate(async () => (await window.axe.run(document, { runOnly: ["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"] })).violations.map((v) => `${v.id}:${v.nodes.length}`));
        ok(w, "axe on the open tour", ax.length === 0, ax.join(" "));
        // Tab stays inside the card
        for (let t = 0; t < 4; t++) await p.keyboard.press("Tab");
        ok(w, "Tab keeps focus in the card", await p.evaluate(() => document.querySelector('[role=dialog][aria-modal=true]').contains(document.activeElement)));
        await p.keyboard.press("ArrowRight"); await sleep(700);
        const t2 = await card.locator("h2").textContent();
        await p.keyboard.press("ArrowLeft"); await sleep(700);
        const t1 = await card.locator("h2").textContent();
        ok(w, "→ / ← move between steps", t2 !== m.title && t1 === m.title, `${m.title} → ${t2} → ${t1}`);
      }
      const last = await card.locator("button.btn-primary").textContent();
      if (/Зрозуміло|Got it|Понятно/.test(last)) { await card.locator("button.btn-primary").click(); break; }
      await card.locator("button.btn-primary").click();
    }
    ok(w, `${lang}: tour finished`, await card.count() === 0, seen.join(" → "));
    ok(w, `${lang}: remembered as done`, (await p.evaluate(() => localStorage.getItem("pr:tour"))) === "done");
    await p.reload({ waitUntil: "load" }); await sleep(2500);
    ok(w, `${lang}: no prompt on the next visit`, await ask.count() === 0);
    // replay from the link, Esc closes
    await p.goto(`${BASE}/${lang}/?tour=1`, { waitUntil: "load" });
    const again = await card.waitFor({ timeout: 5000 }).then(() => true, () => false);
    ok(w, `${lang}: ?tour=1 starts the tour`, again);
    ok(w, `${lang}: ?tour=1 removed from the address`, !p.url().includes("tour=1"), p.url());
    if (again) { await p.keyboard.press("Escape"); await sleep(300); ok(w, `${lang}: Esc closes`, await card.count() === 0); }
    ok(w, `${lang}: no page errors`, errs.length === 0, errs.join(" | "));
    await c.close();
  }
}
// "No thanks" also stops the prompt
{
  const c = await browser.newContext({ ...W.phone, serviceWorkers: "block" });
  const p = await c.newPage();
  await p.goto(`${BASE}/uk/`, { waitUntil: "load" });
  const ask = p.getByRole("dialog").filter({ hasText: /PromoRadar\?/ });
  await ask.waitFor({ timeout: 6000 });
  await ask.locator("button").nth(1).click();
  await p.reload({ waitUntil: "load" }); await sleep(2500);
  ok("phone", "«Ні» — prompt not shown again", await ask.count() === 0);
  await c.close();
}
await browser.close();
fs.writeFileSync(path.join(OUT, "result.txt"), res.join("\n"));
console.log(res.filter((r) => r.startsWith("FAIL")).join("\n") || "all pass");
console.log(`${res.length - fail} PASS, ${fail} FAIL → ${OUT}`);
process.exit(fail ? 1 : 0);
