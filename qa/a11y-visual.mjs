// PromoRadar accessibility + visual audit (re-runnable).
// Usage: node a11y-visual.mjs [--out=../r1] [--only=home,calendar] [--wait-deploy] [--widths=phone,desktop,tablet,wide,zoom200] [--no-shots]
//        [--states-only] [--states=dex,launchpool,quiz,…] [--no-states] [--menus-only]
// Output (under --out): axe.json, measure.json, keyboard.json, menus.json, states.json, media.json, summary.txt,
//        shots/<page>-<w>.png (+ -fold.png), shots/st-*.png (open states), shots/media-*.png
// Widths: phone 390 and desktop 1280 run every page; tablet 768 and wide 1440 run MAIN pages; zoom200 (640x400 CSS at DPR 2
// = a 1280x800 screen at 200 % zoom) runs home + the first promo page. Round 2 added tablet/wide/zoom200, en/ru pages,
// open states (states()) and prefers-reduced-motion / forced-colors (media()).
import { chromium } from "playwright-core";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const args = Object.fromEntries(process.argv.slice(2).map((a) => { const [k, ...v] = a.replace(/^--/, "").split("="); return [k, v.length ? v.join("=") : true]; }));
const BASE = (args.base || "https://obuzakiz99-oss.github.io/promoradar").replace(/\/$/, "");
const OUT = path.resolve(HERE, args.out || "out/r1");
const SHOTS = path.join(OUT, "shots");
const AXE = path.join(HERE, "node_modules/axe-core/axe.min.js");
const CHROME = (process.env.CHROME || "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome");
const CONC = 4;
const TAGS = ["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa", "best-practice"];
const WIDTHS = {
  phone: { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 },
  desktop: { viewport: { width: 1280, height: 800 }, deviceScaleFactor: 1 },
  tablet: { viewport: { width: 768, height: 1024 }, hasTouch: true, deviceScaleFactor: 2 },
  wide: { viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 },
  zoom200: { viewport: { width: 640, height: 400 }, deviceScaleFactor: 2 },
};
const MAIN = ["home", "p1", "my", "unlocks", "fixed", "dex", "hedge", "earn", "launchpools", "lp1", "calendar", "sales", "drops", "t", "v-binance", "history", "insights", "best", "bonuses", "check", "learn", "learn-start", "learn-quiz", "en-home", "ru-home"];
const WIDTH_PAGES = { tablet: MAIN, wide: MAIN, zoom200: ["home", "p1"] };
const pageAt = (n, w) => !WIDTH_PAGES[w] || WIDTH_PAGES[w].some((m) => n === m || n.startsWith(m + "-") && /^p\d/.test(m));
const useWidths = (args.widths ? String(args.widths).split(",") : Object.keys(WIDTHS));
fs.mkdirSync(SHOTS, { recursive: true });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const log = (...a) => console.log(new Date().toISOString().slice(11, 19), ...a);

// ---------- wait for the deploy ----------
if (args["wait-deploy"]) {
  const until = Date.now() + 15 * 60_000;
  for (;;) {
    const r = await fetch(`${BASE}/og-home.png`, { method: "HEAD", cache: "no-store" }).catch(() => null);
    log("og-home.png", r?.status);
    if (r?.status === 200) break;
    if (Date.now() > until) { log("deploy wait timed out; continuing"); break; }
    await sleep(60_000);
  }
}

const browser = await chromium.launch({ executablePath: CHROME, headless: true });
const ctx = {};
for (const w of useWidths) {
  ctx[w] = await browser.newContext({ ...WIDTHS[w], serviceWorkers: "block", locale: "uk-UA", colorScheme: "dark" });
  // layout-shift recorder (layout jumps)
  await ctx[w].addInitScript(() => {
    window.__cls = 0; window.__shifts = [];
    try {
      new PerformanceObserver((l) => {
        for (const e of l.getEntries()) {
          if (e.hadRecentInput) continue;
          window.__cls += e.value;
          window.__shifts.push({ v: +e.value.toFixed(4), t: Math.round(e.startTime), src: (e.sources || []).map((s) => s.node ? `${s.node.nodeName.toLowerCase()}${s.node.id ? "#" + s.node.id : ""}.${String(s.node.className?.baseVal ?? s.node.className ?? "").trim().split(/\s+/).slice(0, 4).join(".")}` : "?").slice(0, 3) });
        }
      }).observe({ type: "layout-shift", buffered: true });
    } catch { /* unsupported */ }
  });
}

async function open(w, url, context) {
  const p = await (context || ctx[w]).newPage();
  const errors = [];
  p.on("pageerror", (e) => errors.push(String(e).slice(0, 200)));
  p.on("console", (m) => { if (m.type() === "error") errors.push(m.text().slice(0, 200)); });
  const resp = await p.goto(url, { waitUntil: "load", timeout: 60_000 });
  await p.waitForLoadState("networkidle", { timeout: 10_000 }).catch(() => {});
  await p.evaluate(() => document.fonts?.ready).catch(() => {});
  await sleep(1200); // fade-up animations (0.6s) + hydration
  await p.evaluate(() => { document.documentElement.style.scrollBehavior = "auto"; }).catch(() => {}); // html{scroll-behavior:smooth} would make measurements race
  return { p, status: resp?.status(), errors };
}

// ---------- discover dynamic slugs ----------
async function discover() {
  const w = useWidths.includes("desktop") ? "desktop" : useWidths[0];
  const dctx = await browser.newContext({ ...WIDTHS[w], serviceWorkers: "block" }); // throwaway: chip clicks persist filters
  const found = { promos: [], lps: [], tokens: [], guides: [] };
  {
    const { p } = await open(w, `${BASE}/uk/`, dctx);
    const chips = p.locator('[role="group"] button.chip');
    const n = await chips.count();
    const seen = new Set();
    for (let i = 1; i < n && found.promos.length < 3; i++) {
      const c = chips.nth(i);
      const label = ((await c.textContent()) || "").replace(/\d+/g, "").trim();
      if (/скинути|reset|✕/i.test(label)) continue;
      await c.click().catch(() => {});
      await sleep(400);
      const href = await p.locator('article a[href*="/uk/p/"]').first().getAttribute("href").catch(() => null);
      if (href && !seen.has(href)) { seen.add(href); found.promos.push({ href, cat: label }); }
    }
    await p.close();
  }
  for (const [src, re, key, k] of [["/uk/launchpools/", /\/uk\/lp\/[^/]+\/?$/, "lps", 2], ["/uk/t/", /\/uk\/t\/[^/]+\/?$/, "tokens", 2], ["/uk/learn/how/", /\/uk\/learn\/guide\/[^/]+\/?$/, "guides", 2]]) {
    const { p } = await open(w, BASE + src, dctx);
    const hrefs = [...new Set(await p.$$eval("a[href]", (as) => as.map((a) => a.getAttribute("href"))))].filter((h) => re.test(h));
    // tokens: skip the first (USDT) to get one big and one small token page
    found[key] = key === "tokens" ? [hrefs[1], hrefs[Math.min(hrefs.length - 1, 25)]].filter(Boolean) : hrefs.slice(0, k);
    await p.close();
  }
  await dctx.close();
  return found;
}
const CAT_SLUG = [["Аірдроп", "airdrop"], ["Змаган", "competition"], ["Бонус", "bonus"], ["Earn", "earn"], ["Фарм", "farming"], ["Лістинг", "listing"], ["Реферал", "referral"], ["Розіграш", "other"]];
const catSlug = (label) => (CAT_SLUG.find(([k]) => label.startsWith(k)) || [, "cat"])[1];

const strip = (h) => h.replace(/^https?:\/\/[^/]+/, "").replace(/^\/promoradar/, "");
function pageList(d) {
  const L = [
    ["home", "/uk/"],
    ...d.promos.map((x, i) => [`p${i + 1}-${catSlug(x.cat)}`, strip(x.href)]),
    ["my", "/uk/my/"], ["unlocks", "/uk/unlocks/"], ["fixed", "/uk/fixed/"], ["dex", "/uk/dex/"], ["hedge", "/uk/hedge/"], ["earn", "/uk/earn/"],
    ["launchpools", "/uk/launchpools/"],
    ...d.lps.map((h, i) => [`lp${i + 1}`, strip(h)]),
    ["calendar", "/uk/calendar/"], ["sales", "/uk/sales/"], ["drops", "/uk/drops/"], ["t", "/uk/t/"],
    ...d.tokens.map((h) => [`t-${strip(h).split("/").filter(Boolean).pop()}`, strip(h)]),
    ["v-binance", "/uk/v/binance/"], ["v-bybit", "/uk/v/bybit/"],
    ["history", "/uk/history/"], ["insights", "/uk/insights/"], ["best", "/uk/best/"], ["bonuses", "/uk/bonuses/"], ["check", "/uk/check/"],
    ["learn", "/uk/learn/"], ["learn-start", "/uk/learn/start/"], ["learn-how", "/uk/learn/how/"], ["learn-safety", "/uk/learn/safety/"],
    ["learn-rewards", "/uk/learn/rewards/"], ["learn-quiz", "/uk/learn/quiz/"], ["learn-glossary", "/uk/learn/glossary/"],
    ...d.guides.map((h) => [`guide-${strip(h).split("/").filter(Boolean).pop()}`, strip(h)]),
    ["about", "/uk/about/"], ["api", "/uk/api/"], ["privacy", "/uk/privacy/"], ["terms", "/uk/terms/"],
    ["en-home", "/en/"], ["ru-home", "/ru/"],
    // round 2: text length differs per language — the same key pages in en / ru
    ...["en", "ru"].flatMap((l) => [
      ...(d.promos[0] ? [[`${l}-p1`, strip(d.promos[0].href).replace(/^\/uk\//, `/${l}/`)]] : []),
      [`${l}-learn`, `/${l}/learn/`], [`${l}-unlocks`, `/${l}/unlocks/`], [`${l}-sales`, `/${l}/sales/`], [`${l}-bonuses`, `/${l}/bonuses/`],
    ]),
  ];
  const only = args.only ? String(args.only).split(",") : null;
  return L.filter(([n]) => !only || only.some((o) => n === o || n.startsWith(o + "-") || (o.endsWith("*") && n.startsWith(o.slice(0, -1)))));
}

// ---------- in-page measurements ----------
function measureInPage(phone) {
  const vw = document.documentElement.clientWidth, vh = innerHeight;
  const sx = scrollX, sy = scrollY;
  const desc = (el) => {
    if (!el) return null;
    const c = typeof el.className === "string" ? el.className : el.className?.baseVal || "";
    const t = (el.getAttribute("aria-label") || el.textContent || "").replace(/\s+/g, " ").trim().slice(0, 50);
    return `${el.tagName.toLowerCase()}${el.id ? "#" + el.id : ""}${c ? "." + c.trim().split(/\s+/).slice(0, 5).join(".") : ""}${t ? ` "${t}"` : ""}`;
  };
  const cs = (el) => getComputedStyle(el);
  const hiddenBySelf = (el) => { const s = cs(el); return s.display === "none" || s.visibility === "hidden" || +s.opacity === 0; };
  const visible = (el) => {
    if (hiddenBySelf(el)) return false;
    const r = el.getBoundingClientRect();
    if (r.width < 2 || r.height < 2) return false;
    for (let a = el.parentElement; a; a = a.parentElement) { const s = cs(a); if (s.display === "none" || s.visibility === "hidden" || +s.opacity === 0) return false; if (a.tagName === "DETAILS" && !a.open && !el.closest("summary")) return false; }
    return true;
  };
  const clipAncestor = (el, axis = "x") => {
    for (let a = el.parentElement; a && a !== document.documentElement; a = a.parentElement) {
      const s = cs(a);
      const o = axis === "x" ? s.overflowX : s.overflowY;
      if (/(auto|scroll|hidden|clip)/.test(o)) return a;
    }
    return null;
  };
  const rel = (r) => ({ x: Math.round(r.left + sx), y: Math.round(r.top + sy), w: Math.round(r.width), h: Math.round(r.height) });
  const out = { vw, vh, docH: document.documentElement.scrollHeight };
  const html = cs(document.documentElement), body = cs(document.body);
  out.scrollWidth = Math.max(document.documentElement.scrollWidth, document.body.scrollWidth);
  out.hOverflow = out.scrollWidth - vw;
  out.rootOverflowX = `${html.overflowX}/${body.overflowX}`;
  out.hasMain = !!document.querySelector("#main, main");
  out.h1 = [...document.querySelectorAll("h1")].map((h) => h.textContent.trim().slice(0, 80));
  out.title = document.title;

  const all = [...document.body.querySelectorAll("*")].filter((el) => !["SCRIPT", "STYLE", "NOSCRIPT", "TEMPLATE", "svg", "path"].includes(el.tagName));
  // 1) elements wider than / sticking out of the viewport (not inside a scroll/clip container)
  // html/body `overflow-x: clip` hides the paint but NOT the layout: mobile browsers still widen the layout viewport
  // (fixed tab bar stretches, page can be panned), so a body/html clip does not count as containment here.
  // containing-block aware: an absolutely positioned box escapes overflow ancestors that sit below its containing block
  const clipCB = (el) => {
    const s0 = cs(el);
    if (s0.position === "fixed") return null;
    let needPos = s0.position === "absolute";
    for (let a = el.parentElement; a && a !== document.documentElement; a = a.parentElement) {
      const s = cs(a);
      const ov = /(auto|scroll|hidden|clip)/.test(s.overflowX);
      const positioned = s.position !== "static" || s.transform !== "none";
      if (needPos) { if (!positioned) continue; if (ov) return a; needPos = s.position === "absolute"; if (s.position === "fixed") return null; continue; }
      if (ov) return a;
      if (s.position === "absolute") needPos = true;
      if (s.position === "fixed") return null;
    }
    return null;
  };
  const realClip = (el) => { const a = clipCB(el); return a && a !== document.body && a !== document.documentElement ? a : null; };
  const wide = [];
  for (const el of all) {
    const r = el.getBoundingClientRect();
    if (r.width === 0 && r.height === 0) continue;
    if (r.right <= vw + 1) continue; // boxes sticking out to the left don't create scrollable overflow (LTR)
    let fixedAnc = false; for (let a = el; a; a = a.parentElement) if (cs(a).position === "fixed") { fixedAnc = true; break; }
    if (fixedAnc) continue; // fixed boxes stretch with the layout viewport: symptom, not cause
    if (realClip(el)) continue;
    wide.push(el);
  }
  out.wide = wide.filter((el) => !wide.some((o) => o !== el && o.contains(el))).slice(0, 15).map((el) => { const r = el.getBoundingClientRect(); return { el: desc(el), pos: cs(el).position, left: Math.round(r.left), right: Math.round(r.right), w: Math.round(r.width), parent: desc(el.parentElement)?.slice(0, 60) }; });

  // 2) interactive targets
  const SEL = 'a[href], button, input:not([type="hidden"]), select, textarea, summary, [role="button"], [role="tab"], [role="link"], [role="checkbox"], [role="switch"], [role="option"], [role="menuitem"], [tabindex]:not([tabindex="-1"])';
  const targets = [...document.querySelectorAll(SEL)].filter((el) => visible(el) && !el.closest('[aria-hidden="true"]'));
  const rects = targets.map((el) => el.getBoundingClientRect());
  const fixedOf = (el) => { for (let a = el; a; a = a.parentElement) if (cs(a).position === "fixed") return true; return false; };
  const fixedFlags = targets.map(fixedOf);
  const isInline = (el) => {
    if (el.tagName !== "A") return false;
    const s = cs(el);
    if (!/^inline$/.test(s.display)) return false;
    const block = el.closest("p, li, td, dd, span, div");
    const txt = (block?.textContent || "").replace(/\s+/g, " ").trim();
    return txt.length > (el.textContent || "").trim().length + 8;
  };
  const isPrimary = (el) => {
    if (isInline(el)) return false;
    const c = (typeof el.className === "string" ? el.className : "");
    if (/\b(btn|chip)\b/.test(c)) return true;
    if (["BUTTON", "SUMMARY", "INPUT", "SELECT", "TEXTAREA"].includes(el.tagName)) return true;
    if (el.closest("nav, header")) return true;
    const s = cs(el);
    return /flex|grid|block/.test(s.display) && (s.borderTopWidth !== "0px" || s.backgroundColor !== "rgba(0, 0, 0, 0)");
  };
  const small = [], phoneSmall = [];
  targets.forEach((el, i) => {
    const r = rects[i];
    const w = r.width, h = r.height;
    if (w < 24 || h < 24) {
      if (isInline(el)) return; // 2.5.8 inline exception
      // spacing exception: 24px circle at centre must not intersect another target
      const cx = r.left + w / 2, cy = r.top + h / 2;
      let conflict = null;
      rects.forEach((o, j) => {
        if (j === i || targets[j].contains(el) || el.contains(targets[j]) || fixedFlags[j] !== fixedFlags[i]) return;
        const dx = Math.max(o.left - cx, 0, cx - o.right), dy = Math.max(o.top - cy, 0, cy - o.bottom);
        if (Math.hypot(dx, dy) < 12) conflict = conflict || desc(targets[j]);
      });
      small.push({ el: desc(el), w: Math.round(w), h: Math.round(h), at: rel(r), spacingFail: !!conflict, near: conflict });
    }
    if (phone && isPrimary(el) && (w < 44 || h < 44)) phoneSmall.push({ el: desc(el), w: Math.round(w), h: Math.round(h) });
  });
  out.targetsTotal = targets.length;
  const offX = targets.filter((el, i) => (rects[i].left >= vw - 4 || rects[i].right <= 4) && !fixedFlags[i]);
  const og = {};
  for (const el of offX) { const sc = clipAncestor(el, "x"); const k = sc ? desc(sc).slice(0, 70) : "none"; (og[k] ||= { n: 0, ex: desc(el) }).n++; }
  out.offscreenX = Object.entries(og).map(([k, v]) => ({ scroller: k, n: v.n, ex: v.ex }));
  out.small24 = small.slice(0, 60);
  out.small24Count = small.length;
  out.small24SpacingFail = small.filter((s) => s.spacingFail).length;
  // group the <44 list by size+tag so it stays readable
  const g = {};
  for (const s of phoneSmall) { const k = `${s.el.split(/[ ."#]/)[0]} ${s.w}x${s.h}`; (g[k] ||= { n: 0, ex: s.el }).n++; }
  out.phoneUnder44 = phone ? Object.entries(g).sort((a, b) => b[1].n - a[1].n).slice(0, 25).map(([k, v]) => ({ k, n: v.n, ex: v.ex })) : undefined;
  out.phoneUnder44Count = phone ? phoneSmall.length : undefined;

  // 3) text clipped without ellipsis (uses the text's own line boxes, not the element box)
  const clipped = [];
  const textNodes = (el) => [...el.childNodes].filter((n) => n.nodeType === 3 && n.textContent.trim().length > 1);
  const ell = (x) => { const s = cs(x); return s.textOverflow === "ellipsis" || (s.webkitLineClamp && s.webkitLineClamp !== "none"); };
  for (const el of all) {
    const tn = textNodes(el);
    if (!tn.length || !visible(el)) continue;
    // monogram under a loaded logo image (VenueLogo): the text is covered, its clipping is invisible
    const img = [...el.children].find((c) => c.tagName === "IMG");
    if (img && img.complete && img.naturalWidth > 0 && +cs(img).opacity > 0.5) continue;
    const s = cs(el);
    if (s.position === "absolute" && (s.clip !== "auto" || s.clipPath !== "none")) continue; // sr-only
    let tb = null;
    for (const n of tn) { const rg = document.createRange(); rg.selectNodeContents(n); for (const q of rg.getClientRects()) { if (q.width < 1) continue; tb = tb ? { l: Math.min(tb.l, q.left), t: Math.min(tb.t, q.top), r: Math.max(tb.r, q.right), b: Math.max(tb.b, q.bottom) } : { l: q.left, t: q.top, r: q.right, b: q.bottom }; } }
    if (!tb) continue;
    for (let a = el; a && a !== document.body; a = a.parentElement) {
      const as = cs(a);
      const hx = /(hidden|clip)/.test(as.overflowX), hy = /(hidden|clip)/.test(as.overflowY);
      if (!hx && !hy) { if (/(auto|scroll)/.test(as.overflowX + as.overflowY)) break; continue; }
      if (as.animationName !== "none" || ell(a)) break;
      if (a.closest('[class*="marquee"]')) break;
      const ar = a.getBoundingClientRect();
      if (ar.width < 2 || ar.height < 2) break;
      const bl = parseFloat(as.borderLeftWidth) || 0, bt = parseFloat(as.borderTopWidth) || 0;
      const box = { l: ar.left + bl, t: ar.top + bt, r: ar.left + bl + a.clientWidth, b: ar.top + bt + a.clientHeight };
      const dx = hx ? Math.max(tb.r - box.r, box.l - tb.l) : 0, dy = hy ? Math.max(tb.b - box.b, box.t - tb.t) : 0;
      // glyph line boxes include leading; require > 4px of overflow vertically, > 2px horizontally
      if (dx > 2 || dy > 4) clipped.push({ el: desc(el), by: a === el ? "self" : desc(a), dx: Math.round(dx), dy: Math.round(dy), at: rel(ar) });
      break;
    }
  }
  out.clipped = clipped.slice(0, 30);
  out.clippedCount = clipped.length;

  // 4) fixed / sticky elements
  out.fixed = all.filter((el) => /fixed|sticky/.test(cs(el).position) && visible(el)).map((el) => { const r = el.getBoundingClientRect(); return { el: desc(el), pos: cs(el).position, z: cs(el).zIndex, top: Math.round(r.top), bottom: Math.round(r.bottom), h: Math.round(r.height) }; }).slice(0, 12);
  return out;
}

// bottom-of-page overlap with the phone tab bar (and any other fixed bottom element)
function bottomOverlapInPage() {
  const vh = innerHeight;
  const fixedBottom = [...document.querySelectorAll("body *")].filter((el) => { const s = getComputedStyle(el); if (s.position !== "fixed" || s.display === "none" || s.visibility === "hidden") return false; const r = el.getBoundingClientRect(); return r.height > 20 && r.width > 100 && r.bottom >= vh - 2 && r.top > vh / 2; });
  if (!fixedBottom.length) return { bar: null };
  const top = Math.min(...fixedBottom.map((e) => e.getBoundingClientRect().top));
  const inFixed = (el) => fixedBottom.some((f) => f.contains(el));
  let maxB = 0, last = null;
  for (const el of document.body.querySelectorAll("*")) {
    if (inFixed(el)) continue;
    let hidden = false; // collapsed <details> content isn't painted (unless it sits in that details' own summary)
    for (let d = el.closest("details:not([open])"); d; d = d.parentElement?.closest("details:not([open])")) { const sm = d.querySelector(":scope > summary"); if (!sm || !sm.contains(el)) { hidden = true; break; } }
    if (hidden) continue;
    const s = getComputedStyle(el);
    if (s.position === "fixed" || s.display === "none" || s.visibility === "hidden" || +s.opacity === 0) continue;
    const hasText = [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim()) || /^(A|BUTTON|IMG|INPUT|SVG)$/i.test(el.tagName);
    if (!hasText) continue;
    const r = el.getBoundingClientRect();
    if (r.width < 2 || r.height < 2) continue;
    // what is actually painted: cut by overflow containers (scroll boxes, collapsed panels)
    let bottom = r.bottom;
    for (let a = el.parentElement; a && a !== document.body; a = a.parentElement) { const as = getComputedStyle(a); if (/(auto|scroll|hidden|clip)/.test(as.overflowY)) bottom = Math.min(bottom, a.getBoundingClientRect().bottom); }
    if (bottom > maxB) { maxB = bottom; last = el; }
  }
  const d = last ? `${last.tagName.toLowerCase()} "${(last.textContent || "").trim().slice(0, 40)}"` : null;
  return { bar: fixedBottom.map((e) => e.tagName.toLowerCase() + "." + String(e.className).split(" ").slice(0, 3).join(".")), barTop: Math.round(top), contentBottom: Math.round(maxB), overlap: Math.round(maxB - top), last: d, bodyPadBottom: getComputedStyle(document.body).paddingBottom };
}

async function scrollThrough(p) {
  await p.evaluate(async () => {
    document.documentElement.style.scrollBehavior = "auto";
    const step = innerHeight * 0.9;
    for (let i = 0; i < 60; i++) {
      const before = scrollY;
      scrollBy({ top: step, behavior: "instant" });
      await new Promise((r) => setTimeout(r, 120));
      if (scrollY === before) break;
    }
    scrollTo({ top: document.documentElement.scrollHeight, behavior: "instant" });
  });
  await sleep(300);
}

async function runAxe(p, context) {
  await p.addScriptTag({ path: AXE }).catch(() => {});
  return p.evaluate(async ({ tags, context }) => {
    const r = await window.axe.run(context || document, { runOnly: { type: "tag", values: tags }, resultTypes: ["violations"] });
    return r.violations.map((v) => ({ id: v.id, impact: v.impact, help: v.help, helpUrl: v.helpUrl, tags: v.tags.filter((t) => /wcag|best/.test(t)), nodes: v.nodes.slice(0, 25).map((n) => ({ target: n.target.join(" "), html: n.html.slice(0, 220), summary: (n.failureSummary || "").replace(/\s+/g, " ").slice(0, 260), data: n.any?.[0]?.data && typeof n.any[0].data === "object" ? Object.fromEntries(Object.entries(n.any[0].data).filter(([k]) => /contrast|fg|bg|fontSize|fontWeight|expected|width|height/i.test(k))) : undefined })), nodeCount: v.nodes.length }));
  }, { tags: TAGS, context });
}

async function shot(p, file, full = true) {
  const f = path.join(SHOTS, file);
  if (args["no-shots"]) return null;
  try {
    const h = await p.evaluate(() => document.documentElement.scrollHeight);
    const dpr = await p.evaluate(() => devicePixelRatio);
    if (full && h * dpr > 32000) {
      const vw = await p.evaluate(() => innerWidth);
      await p.screenshot({ path: f, fullPage: true, timeout: 90_000, clip: { x: 0, y: 0, width: vw, height: Math.floor(32000 / dpr) } });
      return { file: f, truncatedAt: Math.floor(32000 / dpr), docH: h };
    }
    await p.screenshot({ path: f, fullPage: full, timeout: 90_000 }); // round 2: home timed out at 30 s
    return { file: f };
  } catch (e) { return { file: f, error: String(e).slice(0, 160) }; }
}

// ---------- one page × width ----------
async function auditPage(name, url, w) {
  const t0 = Date.now();
  const { p, status, errors } = await open(w, BASE + url);
  const rec = { page: name, path: url, width: w, status };
  try {
    rec.clsLoad = await p.evaluate(() => +(window.__cls || 0).toFixed(4));
    rec.shiftsLoad = await p.evaluate(() => (window.__shifts || []).filter((s) => s.v >= 0.01).slice(0, 6));
    await shot(p, `${name}-${w}-fold.png`, false);
    await scrollThrough(p);
    rec.bottom = await p.evaluate(bottomOverlapInPage);
    await p.evaluate(() => scrollTo({ top: 0, behavior: "instant" }));
    await sleep(500);
    rec.clsAfterScroll = await p.evaluate(() => +(window.__cls || 0).toFixed(4));
    rec.m = await p.evaluate(measureInPage, w === "phone");
    rec.violations = await runAxe(p);
    rec.shot = await shot(p, `${name}-${w}.png`, true);
  } catch (e) { rec.error = String(e).slice(0, 300); }
  rec.errors = errors.slice(0, 8);
  rec.ms = Date.now() - t0;
  await p.close();
  log(`${name} ${w} ${status} axe=${rec.violations?.length ?? "?"} ovf=${rec.m?.hOverflow ?? "?"} small=${rec.m?.small24Count ?? "?"} clip=${rec.m?.clippedCount ?? "?"} ${rec.ms}ms${rec.error ? " ERR " + rec.error : ""}`);
  return rec;
}

// ---------- menus ----------
async function menus(w, pages) {
  const res = [];
  const tt0 = (w) => w === "phone";
  const inView = (r, vw, vh) => r && r.x >= -1 && r.y >= -1 && r.x + r.width <= vw + 1 && r.y + r.height <= vh + 1;
  const vp = WIDTHS[w].viewport;
  const tabTop = async (p) => p.evaluate(() => { const n = document.querySelector('nav.fixed.inset-x-0.bottom-0'); if (!n || getComputedStyle(n).display === "none") return null; return n.getBoundingClientRect().top; });
  const base = async (p) => new Set((await runAxe(p)).flatMap((v) => v.nodes.map((n) => v.id + "|" + n.target)));
  const diffAxe = async (p, before) => (await runAxe(p)).map((v) => ({ ...v, nodes: v.nodes.filter((n) => !before.has(v.id + "|" + n.target)) })).filter((v) => v.nodes.length);

  // home: sort select + filters
  {
    const { p } = await open(w, `${BASE}/uk/`);
    const before = await base(p);
    const sortBtn = p.locator('button[aria-haspopup="listbox"]').first();
    await sortBtn.scrollIntoViewIfNeeded();
    await p.evaluate(() => scrollBy(0, -120));
    await sortBtn.click();
    await sleep(400);
    const lb = p.locator('[role="listbox"]').first();
    const r = await lb.boundingBox().catch(() => null);
    const tt = await tabTop(p);
    const focusOnList = await p.evaluate(() => document.activeElement?.getAttribute("role"));
    // keyboard inside the list
    await p.keyboard.press("ArrowDown"); await sleep(150);
    const activeDesc = await p.evaluate(() => { const l = document.querySelector('[role="listbox"]'); const id = l?.getAttribute("aria-activedescendant"); return id ? document.getElementById(id)?.textContent?.trim() : null; });
    await shot(p, `menu-sort-${w}.png`, false);
    res.push({ menu: "sort Select (home)", w, rect: r, inViewport: inView(r, vp.width, vp.height), underTabBar: tt != null && r ? r.y + r.height > tt : false, focusOnList, activeAfterArrowDown: activeDesc, axeNew: await diffAxe(p, before) });
    await p.keyboard.press("Escape"); await sleep(200);
    res.at(-1).focusReturned = await p.evaluate(() => document.activeElement?.getAttribute("aria-haspopup"));

    // flip logic vs the phone tab bar: put the trigger ~300px above the viewport bottom and open again
    if (tt0(w)) {
      await p.evaluate(() => { const b = document.querySelector('button[aria-haspopup="listbox"]'); const r = b.getBoundingClientRect(); scrollBy({ top: r.bottom - (innerHeight - 300), behavior: "instant" }); });
      await sleep(250);
      await sortBtn.click(); await sleep(400);
      const r2 = await p.locator('[role="listbox"]').first().boundingBox().catch(() => null);
      const tt2 = await tabTop(p);
      await shot(p, `menu-sort-lowpos-${w}.png`, false);
      res.push({ menu: "sort Select opened 300px above viewport bottom (home)", w, rect: r2, inViewport: inView(r2, vp.width, vp.height), underTabBar: tt2 != null && r2 ? r2.y + r2.height > tt2 : false, overlapPx: tt2 != null && r2 ? Math.round(r2.y + r2.height - tt2) : null });
      await p.keyboard.press("Escape"); await sleep(200);
    }

    const fb = p.getByRole("button", { name: /Фільтри/ }).first();
    await fb.scrollIntoViewIfNeeded();
    await fb.click(); await sleep(500);
    await p.evaluate(() => { const b = [...document.querySelectorAll("button[aria-expanded]")].find((x) => /Фільтри/.test(x.textContent)); b?.scrollIntoView({ block: "start" }); scrollBy(0, -80); });
    await sleep(300);
    await shot(p, `menu-filters-${w}.png`, false);
    const panel = await p.evaluate(() => { const b = [...document.querySelectorAll("button[aria-expanded]")].find((x) => /Фільтри/.test(x.textContent)); return { expanded: b?.getAttribute("aria-expanded"), controls: b?.getAttribute("aria-controls") }; });
    res.push({ menu: "Filters panel (home)", w, ...panel, axeNew: await diffAxe(p, before) });
    await p.close();
  }
  // Hint "?"
  for (const u of ["/uk/history/", "/uk/insights/", "/uk/sales/", "/uk/lp/gate-557/"]) { // pages that use <Hint>
    const { p } = await open(w, BASE + u);
    const s = p.locator("details[data-pop] > summary").filter({ hasText: "?" });
    if (!(await s.count())) { await p.close(); continue; }
    const before = await base(p);
    const first = s.first();
    await first.scrollIntoViewIfNeeded();
    await first.click(); await sleep(400);
    const panelR = await p.evaluate(() => { const d = document.querySelector("details[data-pop][open]"); const pnl = d?.querySelector(":scope > div"); if (!pnl) return null; const r = pnl.getBoundingClientRect(); return { x: r.x, y: r.y, width: r.width, height: r.height, text: pnl.textContent.trim().slice(0, 80) }; });
    const tt = await tabTop(p);
    await shot(p, `menu-hint-${w}.png`, false);
    // Esc closes?
    await p.keyboard.press("Escape"); await sleep(200);
    const closedByEsc = await p.evaluate(() => !document.querySelector("details[data-pop][open]"));
    res.push({ menu: `Hint ? (${u})`, w, rect: panelR, inViewport: inView(panelR, vp.width, vp.height), underTabBar: tt != null && panelR ? panelR.y + panelR.height > tt : false, closedByEsc, axeNew: await diffAxe(p, before) });
    await p.close();
    break;
  }
  // calendar menu
  for (const u of ["/uk/unlocks/", "/uk/sales/", "/uk/calendar/"]) {
    const { p } = await open(w, BASE + u);
    const b = p.locator('button[aria-haspopup="menu"], button[aria-expanded][aria-label*="календар"]'); // round 2: CalAdd dropped aria-haspopup
    if (!(await b.count())) { await p.close(); continue; }
    const before = await base(p);
    const vis = p.locator('button[aria-haspopup="menu"]:visible, button[aria-expanded][aria-label*="календар"]:visible').first(); // playwright 1.49 ignores filter({visible})
    const pre = await vis.evaluate((el) => { const r = el.getBoundingClientRect(); return { x: Math.round(r.x + scrollX), vw: innerWidth }; });
    await vis.evaluate((el) => el.scrollIntoView({ block: "center", inline: "center", behavior: "instant" }));
    await sleep(300);
    let clickedHow = "pointer";
    await vis.click({ timeout: 5000 }).catch(async () => { clickedHow = "js (pointer click blocked)"; await vis.evaluate((el) => el.click()); });
    await sleep(400);
    const m = await p.evaluate(() => { const btn = document.querySelector('button[aria-haspopup="menu"][aria-expanded="true"], button[aria-expanded="true"][aria-label*="календар"]'); const menu = btn?.parentElement?.querySelector("div.fixed"); if (!menu) return null; const r = menu.getBoundingClientRect(); return { x: r.x, y: r.y, width: r.width, height: r.height, role: menu.getAttribute("role"), items: [...menu.querySelectorAll("a,button")].map((x) => x.getAttribute("role") || x.tagName.toLowerCase()) }; });
    const tt = await tabTop(p);
    await shot(p, `menu-calendar-${w}.png`, false);
    // keyboard: does focus move into the menu?
    await p.keyboard.press("Tab"); await sleep(100);
    const tabInto = await p.evaluate(() => (document.activeElement?.textContent || "").trim().slice(0, 30));
    res.push({ menu: `Calendar CalAdd (${u})`, w, buttonDocX: pre, clickedHow, rect: m, inViewport: inView(m, vp.width, vp.height), underTabBar: tt != null && m ? m.y + m.height > tt : false, tabInto, axeNew: await diffAxe(p, before) });
    await p.close();
    break;
  }
  return res;
}

// ---------- keyboard ----------
async function keyboard(w) {
  const { p } = await open(w, `${BASE}/uk/`);
  await p.evaluate(() => {
    const SEL = 'a[href], button, input, select, textarea, summary, [tabindex]';
    const keys = ["outlineStyle", "outlineWidth", "outlineColor", "boxShadow", "borderTopColor", "borderBottomColor", "backgroundColor", "color", "textDecorationLine"];
    window.__kbBase = new Map();
    const snap = (el) => { const s = getComputedStyle(el); return Object.fromEntries(keys.map((k) => [k, s[k]])); };
    for (const el of document.querySelectorAll(SEL)) { window.__kbBase.set(el, snap(el)); if (el.parentElement) window.__kbBase.set(el.parentElement, snap(el.parentElement)); }
    window.__kbSnap = snap;
  });
  const stops = [];
  for (let i = 0; i < 40; i++) {
    await p.keyboard.press("Tab");
    await sleep(140);
    const s = await p.evaluate(() => {
      const el = document.activeElement;
      if (!el || el === document.body) return { el: "body" };
      const c = typeof el.className === "string" ? el.className : "";
      const d = `${el.tagName.toLowerCase()}${c ? "." + c.trim().split(/\s+/).slice(0, 3).join(".") : ""} "${(el.getAttribute("aria-label") || el.textContent || "").replace(/\s+/g, " ").trim().slice(0, 40)}"`;
      const now = window.__kbSnap(el), was = window.__kbBase.get(el);
      const diff = [];
      if (now.outlineStyle !== "none" && parseFloat(now.outlineWidth) > 0) diff.push(`outline ${now.outlineWidth} ${now.outlineColor}`);
      if (was) {
        if (now.boxShadow !== was.boxShadow && now.boxShadow !== "none") diff.push("box-shadow");
        if (now.borderTopColor !== was.borderTopColor || now.borderBottomColor !== was.borderBottomColor) diff.push("border-color");
        if (now.backgroundColor !== was.backgroundColor) diff.push("background");
        if (now.textDecorationLine !== was.textDecorationLine) diff.push("underline");
      }
      const par = el.parentElement, pn = par && window.__kbSnap(par), pw = par && window.__kbBase.get(par);
      if (pn && pw && ((pn.outlineStyle !== "none" && parseFloat(pn.outlineWidth) > 0 && pn.outlineStyle !== pw.outlineStyle) || pn.boxShadow !== pw.boxShadow)) diff.push("parent");
      const r = el.getBoundingClientRect();
      const inVp = r.bottom > 0 && r.top < innerHeight && r.right > 0 && r.left < innerWidth;
      // obscured by a fixed/sticky element?
      let obscuredBy = null;
      if (inVp) {
        const pts = [[r.left + r.width / 2, r.top + r.height / 2], [r.left + 3, r.top + 3], [r.right - 3, r.bottom - 3]];
        let covered = 0, by = null;
        for (const [x, y] of pts) {
          if (x < 0 || y < 0 || x > innerWidth || y > innerHeight) continue;
          const h = document.elementFromPoint(x, y);
          if (h && !el.contains(h) && !h.contains(el)) { covered++; by = h; }
        }
        if (covered === pts.length && by) { let f = by; while (f && !/fixed|sticky/.test(getComputedStyle(f).position)) f = f.parentElement; obscuredBy = f ? (f.tagName.toLowerCase() + "." + String(f.className).split(" ").slice(0, 3).join(".")) : by.tagName.toLowerCase(); }
      }
      // focus ring clipped by an overflow container?
      let ringClipped = null;
      const off = parseFloat(now.outlineOffset || getComputedStyle(el).outlineOffset) || 0, ow = parseFloat(now.outlineWidth) || 0;
      if (ow > 0) {
        for (let a = el.parentElement; a && a !== document.body; a = a.parentElement) {
          const s = getComputedStyle(a);
          if (/(hidden|clip|auto|scroll)/.test(s.overflowX + s.overflowY)) {
            const ar = a.getBoundingClientRect(), e = off + ow;
            if (r.left - e < ar.left - 0.5 || r.right + e > ar.right + 0.5 || r.top - e < ar.top - 0.5 || r.bottom + e > ar.bottom + 0.5) ringClipped = a.tagName.toLowerCase() + "." + String(a.className).split(" ").slice(0, 3).join(".");
            break;
          }
        }
      }
      return { el: d, indicator: diff, visibleIndicator: diff.length > 0, inViewport: inVp, obscuredBy, ringClipped, rect: { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) } };
    });
    stops.push({ i: i + 1, ...s });
    if (s.ringClipped && !stops.slice(0, -1).some((x) => x.ringClipped === s.ringClipped) && s.inViewport) {
      const vp = WIDTHS[w].viewport, r = s.rect;
      const clip = { x: Math.max(0, r.x - 24), y: Math.max(0, r.y - 24), width: Math.min(vp.width - Math.max(0, r.x - 24), r.w + 48), height: Math.min(vp.height - Math.max(0, r.y - 24), r.h + 48) };
      if (clip.width > 4 && clip.height > 4) await p.screenshot({ path: path.join(SHOTS, `kb-ringclip-${i + 1}-${w}.png`), clip }).catch(() => {});
    }
    if (i === 0) await shot(p, `kb-skiplink-${w}.png`, false);
    if (s.el !== "body" && !s.visibleIndicator && stops.filter((x) => !x.visibleIndicator).length <= 3) await shot(p, `kb-nofocus-${i + 1}-${w}.png`, false);
  }
  await p.close();
  // skip link function
  const { p: q } = await open(w, `${BASE}/uk/`);
  await q.keyboard.press("Tab"); await sleep(150);
  const skip = await q.evaluate(() => { const el = document.activeElement; const r = el.getBoundingClientRect(); return { text: el.textContent.trim(), href: el.getAttribute("href"), visible: r.width > 20 && r.height > 10 && r.top >= 0, rect: { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) } }; });
  await q.keyboard.press("Enter"); await sleep(400);
  skip.afterEnter = await q.evaluate(() => ({ hash: location.hash, active: document.activeElement?.id || document.activeElement?.tagName, scrollY: Math.round(scrollY) }));
  await q.keyboard.press("Tab"); await sleep(150);
  skip.nextTab = await q.evaluate(() => { const el = document.activeElement; return { el: `${el.tagName.toLowerCase()} "${(el.getAttribute("aria-label") || el.textContent || "").trim().slice(0, 40)}"`, insideMain: !!document.getElementById("main")?.contains(el), inHeader: !!el.closest("header") }; });
  await q.close();
  return { w, skip, stops };
}

// ---------- open states (round 2) ----------
// In-page: where is a popup, is any part of it covered (tab bar, sticky header, neighbours), cut by an overflow box,
// or outside the viewport; where is focus. `sel` = CSS selector of the popup (first visible match) or null for `el`.
function popInPage(sel) {
  const vw = document.documentElement.clientWidth, vh = innerHeight;
  const vis = (e) => { const r = e.getBoundingClientRect(); const s = getComputedStyle(e); if (r.width <= 1 || r.height <= 1 || s.visibility === "hidden" || s.display === "none" || +s.opacity <= 0.05) return false; for (let d = e.closest("details:not([open])"); d; d = d.parentElement?.closest("details:not([open])")) { const sm = d.querySelector(":scope > summary"); if (!sm || !sm.contains(e)) return false; } return true; };
  const el = typeof sel === "string" ? [...document.querySelectorAll(sel)].find(vis) : null;
  const desc = (e) => e ? `${e.tagName.toLowerCase()}${e.id ? "#" + e.id : ""}.${String(e.className?.baseVal ?? e.className ?? "").trim().split(/\s+/).slice(0, 4).join(".")} "${(e.getAttribute?.("aria-label") || e.textContent || "").replace(/\s+/g, " ").trim().slice(0, 40)}"` : null;
  const ae = document.activeElement;
  const focus = { el: desc(ae), insidePopup: !!(el && ae && el.contains(ae)), isBody: ae === document.body };
  if (!el) return { found: false, focus };
  const r = el.getBoundingClientRect();
  const out = { found: true, rect: { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) }, vw, vh, pos: getComputedStyle(el).position };
  out.inViewport = r.left >= -1 && r.top >= -1 && r.right <= vw + 1 && r.bottom <= vh + 1;
  out.offRight = Math.max(0, Math.round(r.right - vw)); out.offLeft = Math.max(0, Math.round(-r.left)); out.offBottom = Math.max(0, Math.round(r.bottom - vh)); out.offTop = Math.max(0, Math.round(-r.top));
  // clipped by an overflow ancestor (absolute popups inside scroll boxes / cards)
  let clipBy = null;
  if (getComputedStyle(el).position !== "fixed") for (let a = el.parentElement; a && a !== document.body && a !== document.documentElement; a = a.parentElement) {
    const s = getComputedStyle(a);
    if (s.position === "fixed") break;
    if (/(hidden|clip|auto|scroll)/.test(s.overflowX + s.overflowY)) { const ar = a.getBoundingClientRect(); if (r.left < ar.left - 1 || r.right > ar.right + 1 || r.top < ar.top - 1 || r.bottom > ar.bottom + 1) { clipBy = { el: desc(a).slice(0, 80), dx: Math.round(Math.max(ar.left - r.left, r.right - ar.right, 0)), dy: Math.round(Math.max(ar.top - r.top, r.bottom - ar.bottom, 0)) }; break; } }
  }
  out.clipBy = clipBy;
  // covered: sample the centre of every row/item (or a 3x3 grid when there are no items)
  const inBox = (i) => { const q = i.getBoundingClientRect(); const cx = q.left + q.width / 2, cy = q.top + q.height / 2; return cx >= r.left && cx <= r.right && cy >= r.top && cy <= r.bottom; };
  const items = [...el.querySelectorAll('[role="option"], a, button, li, p')].filter((i) => vis(i) && inBox(i)).slice(0, 40);
  const pe = el.style.pointerEvents; el.style.pointerEvents = "auto"; // tooltips are pointer-events:none, elementFromPoint would skip them
  const pts = items.length ? items.map((i) => { const q = i.getBoundingClientRect(); return [q.left + q.width / 2, q.top + q.height / 2, i]; })
    : [0.15, 0.5, 0.85].flatMap((fx) => [0.15, 0.5, 0.85].map((fy) => [r.left + r.width * fx, r.top + r.height * fy, el]));
  const cov = [];
  for (const [x, y, i] of pts) {
    if (x < 0 || y < 0 || x > vw || y > vh) { cov.push({ item: desc(i).slice(0, 50), by: "outside viewport" }); continue; }
    const h = document.elementFromPoint(x, y);
    if (h && !el.contains(h)) { let f = h; while (f && f !== document.body && !/fixed|sticky/.test(getComputedStyle(f).position)) f = f.parentElement; cov.push({ item: desc(i).slice(0, 50), by: desc(f && f !== document.body ? f : h).slice(0, 70) }); }
  }
  el.style.pointerEvents = pe;
  out.samples = pts.length; out.covered = cov.slice(0, 12); out.coveredN = cov.length;
  // horizontal clipping inside the popup (nowrap options wider than the list)
  out.innerHClip = [...el.querySelectorAll("*")].filter((c) => c.scrollWidth > c.clientWidth + 2 && /(hidden|clip|auto|scroll)/.test(getComputedStyle(c).overflowX) && c.clientWidth > 0).map((c) => desc(c).slice(0, 60)).slice(0, 4);
  out.textOverflow = [...el.querySelectorAll("*")].filter((c) => { const q = c.getBoundingClientRect(); return [...c.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim()) && (q.right > r.right + 1 || q.left < r.left - 1); }).map((c) => desc(c).slice(0, 60)).slice(0, 4);
  out.role = el.getAttribute("role"); out.ariaLive = el.closest("[aria-live],[role=status],[role=alert]") ? "yes" : "no";
  out.text = (el.textContent || "").replace(/\s+/g, " ").trim().slice(0, 140);
  return out;
}

async function states(w) {
  const res = [];
  const vp = WIDTHS[w].viewport;
  const S = (n) => `st-${n}-${w}.png`;
  const tag = async (p, file) => { await p.screenshot({ path: path.join(SHOTS, file) }).catch(() => {}); return file; };
  const axeIn = async (p, sel) => { const v = await runAxe(p, sel ? { include: [[sel]] } : undefined).catch((e) => [{ id: "axe-error", nodes: [], help: String(e).slice(0, 100) }]); return v.map((x) => ({ id: x.id, n: x.nodes.length, t: x.nodes.map((q) => q.target).slice(0, 3), d: x.nodes[0]?.data })); };
  const rec = (o) => { res.push({ w, ...o }); log(`state ${w} ${o.state}: ${o.error ? "ERR " + o.error : `found=${o.pop?.found} inVp=${o.pop?.inViewport} covered=${o.pop?.coveredN ?? "-"} clip=${o.pop?.clipBy ? "Y" : "-"}`}`); };
  const only = args.states ? String(args.states).split(",") : null; // --states=dex,launchpool runs a subset
  const guard = async (name, fn) => { if (only && !only.some((o) => name.includes(o))) return; try { await fn(); } catch (e) { rec({ state: name, error: String(e).slice(0, 240) }); } };
  const center = (loc) => loc.evaluate((el) => el.scrollIntoView({ block: "center", inline: "nearest", behavior: "instant" }));
  const lowPos = (loc, px) => loc.evaluate((el, px) => { el.scrollIntoView({ block: "center", behavior: "instant" }); const r = el.getBoundingClientRect(); scrollBy({ top: r.bottom - (innerHeight - px), behavior: "instant" }); }, px);

  // Select (listbox): every Select on these pages, opened mid-screen and (phones) 200 px above the bottom
  const selPages = [["/uk/", "home"], ["/uk/dex/", "dex"], ["/uk/unlocks/", "unlocks"], ["/uk/fixed/", "fixed"], ["/uk/hedge/", "hedge"], ["/ru/", "ru-home"], ["/ru/unlocks/", "ru-unlocks"], ["/en/unlocks/", "en-unlocks"]];
  for (const [u, nm] of selPages) await guard(`select ${nm}`, async () => {
    const { p } = await open(w, BASE + u);
    // the home status / country Selects live in the Filters panel
    if (/home/.test(nm)) { await p.locator("button[aria-controls='promo-filters']").first().click(); await sleep(400); }
    const n = await p.locator('button[aria-haspopup="listbox"]').count();
    for (let i = 0; i < n; i++) {
      const b = p.locator('button[aria-haspopup="listbox"]').nth(i);
      if (!(await b.isVisible())) continue;
      const label = await b.getAttribute("aria-label");
      for (const where of w === "phone" || w === "zoom200" ? ["mid", "low"] : ["mid"]) {
        if (where === "mid") await center(b); else await lowPos(b, 200);
        await sleep(250);
        await b.click(); await sleep(350);
        const pop = await p.evaluate(popInPage, '[role="listbox"]');
        const file = await tag(p, S(`select-${nm}-${i}-${where}`));
        const kbd = await p.evaluate(() => document.activeElement?.getAttribute("role"));
        const ax = where === "mid" ? await axeIn(p, '[role="listbox"]') : undefined;
        rec({ state: `Select "${label}" (${u}) ${where}`, pop, focusRole: kbd, axe: ax, shot: file });
        await p.keyboard.press("Escape"); await sleep(150);
        if (await p.locator('[role="listbox"]').count()) { await p.mouse.click(2, vp.height / 2); await sleep(150); }
      }
    }
    await p.close();
  });

  // Filters panel + the venue popover inside it
  for (const l of ["uk", "ru"]) await guard(`filters ${l}`, async () => {
    const { p } = await open(w, `${BASE}/${l}/`);
    const fb = p.locator("button[aria-controls='promo-filters']").first();
    await center(fb); await fb.click(); await sleep(450);
    await p.evaluate(() => { const b = document.querySelector("button[aria-controls='promo-filters']"); b.scrollIntoView({ block: "start", behavior: "instant" }); scrollBy(0, -80); });
    await sleep(250);
    const pop = await p.evaluate(popInPage, "#promo-filters");
    const ax = await axeIn(p, "#promo-filters");
    const geo = await p.evaluate(() => { const pn = document.querySelector("#promo-filters"); if (!pn) return null; const kids = [...pn.querySelectorAll("button, summary")].map((b) => { const r = b.getBoundingClientRect(); return { t: (b.textContent || "").trim().replace(/\s+/g, " ").slice(0, 30), x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) }; }); return { controls: kids.length, rows: new Set(kids.map((k) => k.y)).size, heights: [...new Set(kids.map((k) => k.h))], kids: kids.slice(0, 20) }; });
    rec({ state: `Filters panel (/${l}/)`, pop, geo, axe: ax, shot: await tag(p, S(`filters-${l}`)) });
    const vs = p.locator("#promo-filters details[data-pop] > summary").first();
    if (await vs.count()) {
      await vs.click(); await sleep(350);
      const pop2 = await p.evaluate(popInPage, "#promo-filters details[data-pop][open] > div");
      rec({ state: `Filters › venues popover (/${l}/)`, pop: pop2, axe: await axeIn(p, "#promo-filters details[open] > div"), shot: await tag(p, S(`filters-venues-${l}`)) });
      await p.keyboard.press("Escape"); await sleep(150);
      rec({ state: `Filters › venues popover Esc (/${l}/)`, closedByEsc: await p.evaluate(() => !document.querySelector("#promo-filters details[open]")), focusAfterEsc: await p.evaluate(() => document.activeElement?.tagName + " " + (document.activeElement?.textContent || "").trim().slice(0, 20)) });
    }
    await p.close();
  });

  // calendar menus: CalAdd (unlocks, sales) and the <details> menu on /calendar/
  for (const [u, nm, bsel, psel] of [["/uk/unlocks/", "unlocks", 'button[aria-expanded][aria-label="Додати в календар"]', "div.fixed.w-56"], ["/uk/sales/", "sales", 'button[aria-expanded][aria-label="Додати в календар"]', "div.fixed.w-56"], ["/uk/calendar/", "calendar", "li details[data-pop] > summary", "li details[data-pop][open] > div"], ["/ru/unlocks/", "ru-unlocks", 'button[aria-expanded][aria-label="Добавить в календарь"]', "div.fixed.w-56"]]) await guard(`cal ${nm}`, async () => {
    const { p } = await open(w, BASE + u);
    const all = p.locator(bsel);
    const cnt = await all.count();
    if (!cnt) { rec({ state: `calendar menu ${nm}`, error: "no trigger" }); await p.close(); return; }
    const vis = p.locator(bsel.split(", ").map((x) => x.includes(" > summary") ? x.replace(" > summary", " > summary:visible") : x + ":visible").join(", "));
    for (const [where, idx] of [["mid", 0], ["low", 1]]) {
      const b = vis.nth(Math.min(idx, (await vis.count()) - 1));
      if (where === "mid") await center(b); else await lowPos(b, 120);
      await sleep(300);
      let how = "pointer";
      await b.click({ timeout: 4000 }).catch(async () => { how = "js"; await b.evaluate((el) => el.click()); });
      await sleep(350);
      const pop = await p.evaluate(popInPage, psel);
      const file = await tag(p, S(`cal-${nm}-${where}`));
      await p.keyboard.press("Tab"); await sleep(120);
      const tabInto = await p.evaluate((psel) => { const m = document.querySelector(psel); return { inMenu: !!(m && m.contains(document.activeElement)), el: (document.activeElement?.textContent || "").trim().slice(0, 30) }; }, psel);
      rec({ state: `calendar menu ${nm} ${where}`, clickedHow: how, pop, tabInto, axe: where === "mid" ? await axeIn(p, psel) : undefined, shot: file });
      await p.keyboard.press("Escape"); await sleep(200);
      if (await p.locator(psel).count()) { await p.mouse.click(2, 120); await sleep(200); }
    }
    await p.close();
  });

  // Hint "?" popovers (every page that has them; first + last on the page)
  for (const u of ["/uk/history/", "/uk/insights/", "/uk/sales/", "/uk/lp/gate-557/", "/en/sales/"]) await guard(`hint ${u}`, async () => {
    const { p } = await open(w, BASE + u);
    const hs = p.locator("details[data-pop] > summary").filter({ hasText: "?" });
    const n = await hs.count();
    for (const i of [...new Set([0, n - 1])].filter((x) => x >= 0)) {
      const s = hs.nth(i);
      if (!(await s.isVisible())) continue;
      await center(s); await sleep(200);
      await s.click(); await sleep(350);
      const pop = await p.evaluate(popInPage, "details[data-pop][open] > div");
      const file = await tag(p, S(`hint-${u.replace(/\W+/g, "_")}${i}`));
      const ax = await axeIn(p, "details[data-pop][open] > div");
      await p.keyboard.press("Escape"); await sleep(150);
      const esc = await p.evaluate(() => ({ closed: !document.querySelector("details[data-pop][open]"), focus: document.activeElement?.tagName }));
      rec({ state: `Hint ? #${i} (${u})`, pop, axe: ax, esc, shot: file });
    }
    await p.close();
  });

  // glossary Term tooltips (pure CSS): position + clipping inside tables, Esc-dismissable, hoverable (WCAG 1.4.13)
  for (const u of ["/uk/earn/", "/uk/dex/", "/uk/launchpools/"]) await guard(`term ${u}`, async () => {
    const { p } = await open(w, BASE + u);
    const terms = p.locator(".term:visible");
    const n = await terms.count();
    for (const i of [...new Set([0, Math.max(0, n - 1)])]) {
      if (!n) break;
      const t = terms.nth(i);
      await center(t); await sleep(200);
      await t.focus(); await sleep(300);
      const pop = await p.evaluate(() => { const e = document.activeElement?.querySelector('[role="tooltip"]'); if (!e) return null; e.setAttribute("data-audit-tip", "1"); return true; });
      const info = pop ? await p.evaluate(popInPage, "[data-audit-tip]") : null;
      const file = await tag(p, S(`term-${u.replace(/\W+/g, "_")}${i}`));
      await p.keyboard.press("Escape"); await sleep(250);
      const afterEsc = await p.evaluate(() => { const e = document.querySelector("[data-audit-tip]"); return e ? getComputedStyle(e).visibility : null; });
      let hoverable = null;
      if (!WIDTHS[w].isMobile) {
        await p.evaluate(() => document.activeElement?.blur());
        { const bb = await t.boundingBox(); if (bb) await p.mouse.move(bb.x + bb.width / 2, bb.y + bb.height / 2, { steps: 3 }); } await sleep(300);
        const tr = await p.evaluate(() => { const e = document.querySelector("[data-audit-tip]"); const r = e?.getBoundingClientRect(); return r ? { x: r.x + r.width / 2, y: r.y + r.height / 2 } : null; });
        if (tr) { await p.mouse.move(tr.x, tr.y, { steps: 4 }); await sleep(350); hoverable = await p.evaluate(() => getComputedStyle(document.querySelector("[data-audit-tip]")).visibility === "visible"); }
      }
      await p.evaluate(() => document.querySelector("[data-audit-tip]")?.removeAttribute("data-audit-tip"));
      rec({ state: `Term tooltip #${i} (${u})`, pop: info, visibleAfterEsc: afterEsc === "visible", hoverable, shot: file });
    }
    await p.close();
  });

  // EarnBoard coin search list (needs Pro mode — the search is .adv)
  await guard("earn search", async () => {
    const { p } = await open(w, `${BASE}/uk/earn/`);
    const inp = p.locator('input[placeholder="Інша монета…"]').first();
    const visible = await inp.isVisible();
    if (!visible) { rec({ state: "Earn coin search", note: "search box hidden (beginner mode .adv)" }); await p.close(); return; }
    await center(inp); await inp.click(); await inp.type("SO", { delay: 60 }); await sleep(500);
    const pop = await p.evaluate(popInPage, "div.max-h-64.overflow-auto");
    const file = await tag(p, S("earn-search"));
    // keyboard: can Tab / ArrowDown reach the matches?
    await p.keyboard.press("ArrowDown"); await sleep(120);
    const afterArrow = await p.evaluate(() => ({ el: document.activeElement?.tagName, list: !!document.querySelector("div.max-h-64.overflow-auto") }));
    await p.keyboard.press("Tab"); await sleep(400);
    const afterTab = await p.evaluate(() => ({ el: `${document.activeElement?.tagName} "${(document.activeElement?.textContent || "").trim().slice(0, 30)}"`, listStillOpen: !!document.querySelector("div.max-h-64.overflow-auto"), focusInList: !!document.querySelector("div.max-h-64.overflow-auto")?.contains(document.activeElement) }));
    const attrs = await inp.evaluate((e) => ({ role: e.getAttribute("role"), expanded: e.getAttribute("aria-expanded"), controls: e.getAttribute("aria-controls"), label: e.getAttribute("aria-label"), labelled: !!e.labels?.length }));
    // no-match message
    await inp.fill(""); await inp.click(); await inp.type("ZZQX", { delay: 40 }); await sleep(400);
    const none = await p.evaluate(popInPage, "div.absolute.top-11.p-3");
    rec({ state: "Earn coin search", pop, afterArrow, afterTab, attrs, noMatch: none, shot: file, shotNone: await tag(p, S("earn-search-none")) });
    await p.close();
  });

  // DexBoard pool details with the APY chart
  await guard("dex details", async () => {
    const { p } = await open(w, `${BASE}/uk/dex/`);
    const b = p.locator("button[aria-expanded]:visible").filter({ hasText: "Умови й ризики" }).first();
    await center(b); await b.click();
    await p.waitForSelector('svg[role="img"]', { timeout: 9000 }).catch(() => {});
    await sleep(500);
    await b.evaluate((el) => el.scrollIntoView({ block: "start", behavior: "instant" })); await p.evaluate(() => scrollBy(0, -90)); await sleep(250);
    const info = await p.evaluate(() => {
      const svg = [...document.querySelectorAll('svg[role="img"]')].find((x) => x.getBoundingClientRect().width > 0);
      const box = svg?.closest(".rounded-xl.border");
      const r = svg?.getBoundingClientRect();
      const det = document.querySelector("button[aria-expanded='true']");
      const grp = box?.querySelector('[role="group"]');
      return { chart: !!svg, chartLabel: svg?.getAttribute("aria-label"), chartRect: r ? { w: Math.round(r.width), h: Math.round(r.height) } : null, ranges: grp ? [...grp.querySelectorAll("button")].map((x) => `${x.textContent}:${x.getAttribute("aria-pressed")}:${Math.round(x.getBoundingClientRect().height)}`) : null, text: box?.textContent.replace(/\s+/g, " ").slice(0, 160), focus: document.activeElement?.textContent?.trim().slice(0, 30), expanded: det?.getAttribute("aria-expanded"), controls: det?.getAttribute("aria-controls") };
    });
    const file = await tag(p, S("dex-details"));
    // keyboard: range buttons reachable; chart has no keyboard access to values
    rec({ state: "Dex pool details + APY chart", info, axe: await axeIn(p, null).then((v) => v.filter((x) => !["landmark-unique"].includes(x.id))), shot: file });
    await p.close();
  });

  // Launchpool card: "Детальніше" details + "Ще N" hedge venue chips
  await guard("launchpool details", async () => {
    const { p } = await open(w, `${BASE}/uk/launchpools/`);
    // phones: <details> "Детальніше" on each card; md+: the table row toggle "Плюси й ризики" (round 2)
    const s = p.locator("details:not([data-pop]) > summary:visible").filter({ hasText: "Детальніше" }).first();
    const tb = p.locator("button[aria-expanded]:visible").filter({ hasText: "Плюси й ризики" }).first();
    const useCard = (await s.count()) > 0;
    const t0 = useCard ? s : tb;
    await center(t0); await t0.click(); await sleep(400);
    await t0.evaluate((el) => el.scrollIntoView({ block: "start", behavior: "instant" })); await p.evaluate(() => scrollBy(0, -140)); await sleep(200);
    if (!useCard) await p.evaluate(() => { const tr = document.querySelector("button[aria-expanded='true']")?.closest("tr")?.nextElementSibling; tr?.querySelector("td")?.setAttribute("data-audit-lpdetail", "1"); });
    const pop = await p.evaluate(popInPage, useCard ? "details[open]:not([data-pop]) > div" : "[data-audit-lpdetail]");
    const file = await tag(p, S("lp-details"));
    const more = p.locator("button[aria-expanded]:visible").filter({ hasText: /^Ще \d+/ }).first();
    let moreInfo = null;
    if (await more.count()) {
      await center(more); await more.click(); await sleep(350);
      moreInfo = await p.evaluate(() => { const b = [...document.querySelectorAll("button[aria-expanded='true']")].find((x) => /Ще|Згорнути|less/i.test(x.textContent)); const row = b?.parentElement; const r = row?.getBoundingClientRect(); return { text: b?.textContent.trim(), controls: b?.getAttribute("aria-controls"), row: r ? { w: Math.round(r.width), h: Math.round(r.height), right: Math.round(r.right) } : null, vw: document.documentElement.clientWidth }; });
      await tag(p, S("lp-more"));
    }
    rec({ state: "Launchpool card details + hedge chips", pop, moreInfo, axe: await axeIn(p, useCard ? "details[open]:not([data-pop])" : "[data-audit-lpdetail]"), shot: file });
    await p.close();
  });

  // Quiz: answer every question with the keyboard, then the result
  for (const l of ["uk", "ru"]) await guard(`quiz ${l}`, async () => {
    const { p } = await open(w, `${BASE}/${l}/learn/quiz/`);
    const steps = [];
    for (let k = 0; k < 8; k++) {
      const opts = p.locator("main .card button");
      if (!(await opts.count())) break;
      const q = await p.locator("main .card h2").first().textContent().catch(() => null);
      const prog = await p.evaluate(() => { const c = document.querySelector("main .card"); const bar = c?.querySelector(".flex.gap-1\\.5"); return { label: bar?.getAttribute("aria-label") || bar?.getAttribute("role") || null, liveRegion: !!c?.closest("[aria-live]") || !!c?.querySelector("[aria-live]") }; });
      await opts.first().focus(); await p.keyboard.press("Enter"); await sleep(300);
      const after = await p.evaluate(() => ({ active: document.activeElement === document.body ? "BODY" : `${document.activeElement?.tagName} "${(document.activeElement?.textContent || "").trim().slice(0, 25)}"` }));
      steps.push({ q: q?.slice(0, 60), ...prog, focusAfterAnswer: after.active });
    }
    await sleep(300);
    const result = await p.evaluate(() => { const h = [...document.querySelectorAll("main h2")].map((x) => x.textContent.trim()); const cards = [...document.querySelectorAll("main a.card")].map((a) => { const r = a.getBoundingClientRect(); return { w: Math.round(r.width), h: Math.round(r.height), t: a.textContent.replace(/\s+/g, " ").trim().slice(0, 80) }; }); return { h2: h, cards, focus: document.activeElement === document.body ? "BODY" : document.activeElement?.tagName }; });
    await p.evaluate(() => { const h = [...document.querySelectorAll("main h2")].pop(); h?.scrollIntoView({ block: "start", behavior: "instant" }); scrollBy(0, -90); });
    await sleep(200);
    const m = await p.evaluate(measureInPage, w === "phone");
    rec({ state: `Quiz result (/${l}/)`, steps, result, clipped: m.clipped?.slice(0, 6), hOverflow: m.hOverflow, axe: await axeIn(p, "main"), shot: await tag(p, S(`quiz-result-${l}`)) });
    await p.close();
  });

  // LinkCheck verdicts
  await guard("linkcheck", async () => {
    const { p } = await open(w, `${BASE}/uk/check/`);
    const inp = p.locator("main form input").first();
    const attrs = await inp.evaluate((e) => ({ label: e.getAttribute("aria-label"), labelled: !!e.labels?.length, describedby: e.getAttribute("aria-describedby") }));
    for (const [k, val] of [["official", "binance.com"], ["lookalike", "binance-bonus.com"], ["punycode", "xn--bnance-bva.com"], ["unknown", "example.org"], ["faketg", "@binance_support"], ["longurl", "https://www.very-long-subdomain-name-for-testing.bybit-airdrop-claim-rewards-now.example.com/path?x=1"], ["invalid", "hello world"]]) {
      await inp.fill(val); await inp.press("Enter"); await sleep(350);
      const box = await p.evaluate(() => { const f = document.querySelector("main form"); const r = f?.nextElementSibling; if (!r || r.tagName === "SECTION") return null; r.setAttribute("data-audit-verdict", "1"); return true; });
      const pop = box ? await p.evaluate(popInPage, "[data-audit-verdict]") : null;
      await p.evaluate(() => document.querySelector("[data-audit-verdict]")?.scrollIntoView({ block: "center", behavior: "instant" })); await sleep(150);
      const file = await tag(p, S(`check-${k}`));
      const ax = box ? await axeIn(p, "[data-audit-verdict]") : [];
      const focus = await p.evaluate(() => `${document.activeElement?.tagName}`);
      rec({ state: `LinkCheck ${k} "${val.slice(0, 40)}"`, attrs, pop, focus, axe: ax, shot: file });
      await p.evaluate(() => document.querySelector("[data-audit-verdict]")?.removeAttribute("data-audit-verdict"));
    }
    await p.close();
  });
  return res;
}

// ---------- prefers-reduced-motion / forced-colors smoke (round 2) ----------
async function media(w) {
  const out = [];
  for (const [nm, em] of [["reduced-motion", { reducedMotion: "reduce" }], ["forced-colors", { forcedColors: "active" }], ["light-scheme", { colorScheme: "light" }]]) {
    try {
      const c = await browser.newContext({ ...WIDTHS[w], serviceWorkers: "block", locale: "uk-UA", reducedMotion: em.reducedMotion, forcedColors: em.forcedColors, colorScheme: em.colorScheme || "dark" });
      const p = await c.newPage();
      await p.goto(`${BASE}/uk/`, { waitUntil: "load", timeout: 60_000 });
      await p.waitForLoadState("networkidle", { timeout: 10_000 }).catch(() => {});
      await sleep(1500);
      const r = await p.evaluate(() => {
        const anims = document.getAnimations().filter((a) => a.playState === "running").map((a) => (a.animationName || a.transitionProperty || a.constructor.name) + "@" + (a.effect?.target?.className?.toString?.().split(" ").slice(0, 3).join(".") || "?")).slice(0, 12);
        const invisible = [...document.querySelectorAll("main *")].filter((e) => { const r = e.getBoundingClientRect(); return r.width > 30 && r.height > 12 && r.top < innerHeight && +getComputedStyle(e).opacity < 0.05; }).length;
        const smooth = getComputedStyle(document.documentElement).scrollBehavior;
        // forced colours: is the selected chip distinguishable from an unselected one, do lime buttons keep a boundary?
        const on = document.querySelector('.chip[data-on="true"]'), off = document.querySelector('.chip[data-on="false"]');
        const sty = (e) => { if (!e) return null; const s = getComputedStyle(e); return { bg: s.backgroundColor, fg: s.color, border: `${s.borderTopWidth} ${s.borderTopStyle} ${s.borderTopColor}`, outline: s.outlineStyle, fca: s.forcedColorAdjust }; };
        const prim = [...document.querySelectorAll("a.btn-primary, button.btn-primary")].filter((e) => e.getBoundingClientRect().width > 0).slice(0, 2);
        const pressed = document.querySelector('[aria-pressed="true"]:not(.chip)');
        return { runningAnims: anims, runningN: anims.length, invisibleInFold: invisible, scrollBehavior: smooth, chipOn: sty(on), chipOff: sty(off), primary: prim.map(sty), pressedNonChip: pressed ? { t: pressed.textContent.trim().slice(0, 20), ...sty(pressed) } : null, metaScheme: document.querySelector('meta[name="color-scheme"]')?.content ?? null, bodyBg: getComputedStyle(document.body).backgroundColor };
      });
      const f = `media-${nm}-${w}.png`;
      await p.screenshot({ path: path.join(SHOTS, f) });
      await p.evaluate(() => document.querySelector('[role="group"] .chip')?.scrollIntoView({ block: "center", behavior: "instant" })); await sleep(200);
      await p.screenshot({ path: path.join(SHOTS, `media-${nm}-chips-${w}.png`) });
      out.push({ w, mode: nm, ...r, shot: f });
      log(`media ${w} ${nm}: anims=${r.runningN} invisible=${r.invisibleInFold}`);
      await c.close();
    } catch (e) { out.push({ w, mode: nm, error: String(e).slice(0, 200) }); }
  }
  return out;
}

// ---------- run ----------
log("discovering slugs…");
const disc = await discover();
log("discovered", JSON.stringify(disc));
const pages = pageList(disc);
const tasks = [];
if (!args["menus-only"] && !args["states-only"]) for (const [n, u] of pages) for (const w of useWidths) if (pageAt(n, w)) tasks.push([n, u, w]);
const results = [];
let ti = 0;
await Promise.all(Array.from({ length: CONC }, async () => { while (ti < tasks.length) { const [n, u, w] = tasks[ti++]; results.push(await auditPage(n, u, w).catch((e) => ({ page: n, path: u, width: w, error: String(e).slice(0, 300) }))); } }));
results.sort((a, b) => pages.findIndex((x) => x[0] === a.page) - pages.findIndex((x) => x[0] === b.page) || a.width.localeCompare(b.width));

let menuRes = [], kb = [], stRes = [], mediaRes = [];
const KBW = useWidths.filter((w) => ["phone", "desktop", "zoom200"].includes(w));
if ((!args.only || String(args.only).split(",").includes("home")) && !args["states-only"]) {
  log("menus + keyboard…");
  const jobs = KBW.flatMap((w) => [menus(w, pages).then((r) => menuRes.push(...r)).catch((e) => menuRes.push({ w, error: String(e).slice(0, 300) })), keyboard(w).then((r) => kb.push(r)).catch((e) => kb.push({ w, error: String(e).slice(0, 300) }))]);
  await Promise.all(jobs);
}
if (!args["no-states"] && (!args.only || args["states-only"])) {
  log("open states + media…");
  const SW = useWidths.filter((w) => ["phone", "desktop"].includes(w));
  await Promise.all(SW.map((w) => states(w).then((r) => stRes.push(...r)).catch((e) => stRes.push({ w, error: String(e).slice(0, 300) }))));
  await Promise.all(SW.map((w) => media(w).then((r) => mediaRes.push(...r))));
  fs.writeFileSync(path.join(OUT, "states.json"), JSON.stringify(stRes, null, 1));
  fs.writeFileSync(path.join(OUT, "media.json"), JSON.stringify(mediaRes, null, 1));
}
await browser.close();
if (args["states-only"]) { log("states/media written →", OUT); process.exit(0); }

// ---------- write ----------
if (args["menus-only"]) {
  fs.writeFileSync(path.join(OUT, "menus.json"), JSON.stringify(menuRes.map(({ axeNew, ...m }) => ({ ...m, axeNew: (axeNew || []).map((v) => ({ id: v.id, n: v.nodes.length, t: v.nodes.map((x) => x.target).slice(0, 4) })) })), null, 1));
  fs.writeFileSync(path.join(OUT, "keyboard.json"), JSON.stringify(kb, null, 1));
  log("menus/keyboard written →", OUT);
  process.exit(0);
}
const byRule = {};
for (const r of results) for (const v of r.violations || []) {
  const b = (byRule[v.id] ||= { id: v.id, impact: v.impact, help: v.help, helpUrl: v.helpUrl, tags: v.tags, nodes: 0, pages: [], samples: [] });
  b.nodes += v.nodeCount; b.pages.push(`${r.page}@${r.width}`);
  for (const n of v.nodes) if (b.samples.length < 12 && !b.samples.some((s) => s.target === n.target)) b.samples.push({ page: `${r.page}@${r.width}`, ...n });
}
const meta = { generated: new Date().toISOString(), base: BASE, tags: TAGS, discovered: disc, pages: pages.map(([n, u]) => ({ name: n, path: u })) };
fs.writeFileSync(path.join(OUT, "axe.json"), JSON.stringify({ ...meta, byRule: Object.values(byRule).sort((a, b) => b.pages.length - a.pages.length), runs: results.map((r) => ({ page: r.page, path: r.path, width: r.width, violations: r.violations })), menus: menuRes.map((m) => ({ menu: m.menu, w: m.w, axeNew: m.axeNew })) }, null, 1));
fs.writeFileSync(path.join(OUT, "measure.json"), JSON.stringify({ ...meta, runs: results.map(({ violations, ...r }) => r) }, null, 1));
fs.writeFileSync(path.join(OUT, "menus.json"), JSON.stringify(menuRes.map(({ axeNew, ...m }) => ({ ...m, axeNew: (axeNew || []).map((v) => ({ id: v.id, n: v.nodes.length, t: v.nodes.map((x) => x.target).slice(0, 4) })) })), null, 1));
fs.writeFileSync(path.join(OUT, "keyboard.json"), JSON.stringify(kb, null, 1));

const L = [];
L.push(`PromoRadar a11y/visual — ${meta.generated} — ${results.length} runs`);
L.push(`\n== axe by rule (rule · impact · nodes · pages) ==`);
for (const b of Object.values(byRule).sort((a, b) => b.pages.length - a.pages.length)) L.push(`${b.id} · ${b.impact} · ${b.nodes} nodes · ${b.pages.length} runs: ${b.pages.slice(0, 8).join(", ")}${b.pages.length > 8 ? " …" : ""}`);
L.push(`\n== per run ==`);
for (const r of results) {
  const m = r.m || {};
  L.push(`${r.page}@${r.width} [${r.status}] axe:${(r.violations || []).map((v) => v.id).join(",") || "-"} | hOvf:${m.hOverflow} wide:${(m.wide || []).length} | <24:${m.small24Count}(spacingFail ${m.small24SpacingFail})${r.width === "phone" ? ` <44:${m.phoneUnder44Count}` : ""} | clipped:${m.clippedCount} | cls:${r.clsLoad}/${r.clsAfterScroll} | bottom:${r.bottom?.bar ? `overlap ${r.bottom.overlap}` : "-"}${r.error ? " | ERR " + r.error : ""}${r.errors?.length ? " | console:" + r.errors.length : ""}`);
}
L.push(`\n== menus ==`);
for (const m of menuRes) L.push(`${m.menu}@${m.w}: inViewport=${m.inViewport} underTabBar=${m.underTabBar} ${m.error || ""} axeNew=${(m.axeNew || []).map((v) => v.id).join(",") || "-"}`);
L.push(`\n== keyboard ==`);
for (const k of kb) {
  if (k.error) { L.push(`${k.w}: ERR ${k.error}`); continue; }
  L.push(`${k.w}: skip=${JSON.stringify(k.skip)}`);
  L.push(`  no visible indicator: ${k.stops.filter((s) => s.el !== "body" && !s.visibleIndicator).map((s) => `#${s.i} ${s.el}`).join(" | ") || "none"}`);
  L.push(`  obscured: ${k.stops.filter((s) => s.obscuredBy).map((s) => `#${s.i} ${s.el} by ${s.obscuredBy}`).join(" | ") || "none"}`);
  L.push(`  ring clipped: ${k.stops.filter((s) => s.ringClipped).map((s) => `#${s.i} ${s.el} by ${s.ringClipped}`).join(" | ") || "none"}`);
}
L.push(`\n== open states ==`);
for (const m of stRes) L.push(`${m.state}@${m.w}: ${m.error ? "ERR " + m.error : `inVp=${m.pop?.inViewport} covered=${m.pop?.coveredN ?? "-"} clip=${m.pop?.clipBy ? JSON.stringify(m.pop.clipBy) : "-"} focus=${m.pop?.focus?.el?.slice(0, 40) ?? "-"} axe=${(m.axe || []).map((v) => v.id).join(",") || "-"}`}`);
L.push(`\n== media ==`);
for (const m of mediaRes) L.push(`${m.mode}@${m.w}: anims=${m.runningN} invisible=${m.invisibleInFold} chipOn=${JSON.stringify(m.chipOn)} chipOff=${JSON.stringify(m.chipOff)}`);
fs.writeFileSync(path.join(OUT, "summary.txt"), L.join("\n"));
log("done →", OUT);
