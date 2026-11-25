// Quality guard (owner 25.11: "зроби так щоб автоматично це перевірялось завжди").
// Runs in every build after `npm run build`. Re-checks every promo for the mistakes the deep audit of 25.11 found, writes
// out/api/quality.json (read hourly by scripts/health.mjs → notification to the owner) and annotates the GitHub run.
// It FAILS the build (so the previous good site stays online) only when the data is clearly broken:
//   - no promos at all, or fewer than half of the last good build (a mass source outage);
//   - a page still says the site uses referral links / shows the ad block while that is switched off.
// usage: node scripts/quality.mjs   (after GITHUB_PAGES=1 npm run build)
import fs from "node:fs";
import path from "node:path";

const OUT = "out";
const c = JSON.parse(fs.readFileSync(process.env.QUALITY_IN || path.join(".next", "cache", "promos-build.json"), "utf8"));
const now = c.fetchedAt ?? Date.now();
const P = c.promos ?? [];
const D = c.details ?? {};
const errors = [], warns = [];
const ttl = (p) => (p.titleOrig ?? p.title ?? "").slice(0, 80);
const E = (p, why) => errors.push({ id: p?.id, title: p ? ttl(p) : "", why });
const W = (p, why) => warns.push({ id: p?.id, title: p ? ttl(p) : "", why });

/* ---------- 1) estimates ("Реально отримаєте ≈ $X") ---------- */
const COUPON = /\b(coupons?|vouchers?|trial funds?|super bonus|futures bonus|bonus funds?|position vouchers?)\b/i;
for (const p of P) {
  const v = p.meta?.value, m = p.meta ?? {};
  const rules = [p.titleOrig ?? p.title, m.perUser?.text, m.minEntry?.text, ...(m.payout?.quotes ?? [])].filter(Boolean).join(" ");
  if (v) {
    if (v.net !== undefined && v.max !== undefined && v.net > v.max * 1.01 && v.mech !== "apr") E(p, `estimate $${v.net} is above the per-person max $${v.max}`);
    if (v.basis === "max" && v.conf !== "low") E(p, `an "up to" figure shown as ${v.conf === "high" ? "sure" : "most likely"} ($${v.net})`);
    const apr = m.aprPct;
    if (v.mech === "apr" && apr !== undefined && apr > 100 && v.net !== undefined) E(p, `estimate from a ${apr}% promo rate`);
    if (v.conf === "high" && COUPON.test(rules)) E(p, `paid in coupons/vouchers but shown as "you will really get" ($${v.net})`);
    if (v.net !== undefined && v.net > 2000 && v.conf !== "low") W(p, `very large confident estimate $${v.net} — check the rules`);
  }
  if (p.reward && m.perUser && p.reward.unit?.toUpperCase() === m.perUser.unit?.toUpperCase() && m.perUser.amount >= p.reward.amount * 0.9 && !p.sponsored)
    E(p, `pool ${p.reward.amount} ≈ per-person ${m.perUser.amount} — a per-person cap printed as the pool`);
}

/* ---------- 2) dates ---------- */
for (const p of P) {
  if (p.endsAt && p.endsAt < now) E(p, "already ended but still shown");
  if (p.startsAt && p.endsAt && p.startsAt >= p.endsAt) E(p, "start is after end");
  if (/\bcoming soon\b/i.test(p.titleOrig ?? p.title) && !p.startsAt) W(p, '"coming soon" without a start date');
}

/* ---------- 3) duplicates ---------- */
const seen = new Map();
const dup = (k, p, why) => { if (!k) return; if (seen.has(k)) E(p, `${why} — duplicate of ${seen.get(k)}`); else seen.set(k, p.id); };
for (const p of [...P].sort((a, b) => b.publishedAt - a.publishedAt)) {
  if (p.sponsored || p.evergreen || p.category === "farming") continue;
  dup(`${p.venue.id}|t|${(p.titleOrig ?? p.title).toLowerCase().replace(/[^a-z0-9]+/g, "").slice(0, 40)}`, p, "same headline");
  // same rule as promos.ts: only campaign-like links, never a footer link most posts carry
  const lk = p.meta?.linkKey;
  if (lk && P.filter((x) => x.venue.id === p.venue.id && x.meta?.linkKey === lk).length <= 4 && (/^(bit\.ly|tinyurl\.com|t\.co|rb\.gy|shorturl\.at|s\.[a-z]+\.com)\//.test(lk) || /\/(land|event|events|campaigns?|activity|activities|promo|competition|rank|topic|launchhub|act)\b/.test(lk))) dup(`${p.venue.id}|l|${lk}`, p, "same campaign link");
  try { const u = new URL(p.url); if (u.host !== "t.me" && u.pathname.length > 1) dup(`${p.venue.id}|u|${u.host.replace(/^www\./, "")}${u.pathname.replace(/\/$/, "")}`, p, "same page"); } catch { /* bad url → below */ }
}

/* ---------- 4) links ---------- */
for (const p of P) {
  let ok = false;
  try { const u = new URL(p.url); ok = u.protocol === "https:"; } catch { /* */ }
  if (!ok) E(p, `link is not https: ${String(p.url).slice(0, 60)}`);
}

/* ---------- 5) categories & 0% fee ---------- */
const PAID = /\b(only|solely) (count )?(trades?|orders?|volume)\b[^.]{0,40}\b(paid|pay|incur\w*|charged)\b[^.]{0,20}\bfees?\b|\bfee-paying (trades|volume|orders)\b/i;
for (const p of P) {
  const blocks = D[p.id]?.blocks ?? [];
  if (p.meta?.zeroFee && blocks.slice(0, 80).some((b) => PAID.test(b.x ?? ""))) E(p, '"0% fee" but the rules count only fee-paying trades');
  if (p.category === "earn" && /\b(new to [a-z]|complete (the |all )?tasks|super bonus|welcome)\b/i.test(p.titleOrig ?? p.title)) W(p, "a task / welcome bonus filed as Earn");
}

/* ---------- 6) headlines that are raw exchange text ---------- */
for (const p of P) {
  const t = p.title ?? "";
  if (p.category !== "farming" && (/\s\|\s|•|^\s*[a-zа-яії]/.test(t) || t.length > 120)) W(p, "headline looks like raw exchange text");
}

/* ---------- 7) site-wide texts that must not come back ---------- */
const pageText = (f) => { try { return fs.readFileSync(path.join(OUT, f), "utf8"); } catch { return ""; } };
const site = fs.readFileSync(path.join("src", "config", "site.ts"), "utf8");
const refs = JSON.parse(fs.readFileSync(path.join("src", "config", "refs.json"), "utf8"));
const hasRefs = Object.entries(refs).some(([k, v]) => !k.startsWith("_") && String(v).trim());
const hasAds = /export const HAS_ADS = true/.test(site);
for (const l of ["uk", "en", "ru"]) {
  const h = pageText(`${l}/index.html`);
  if (!h) { E(null, `${l}/index.html missing`); continue; }
  if (!hasRefs && /Деякі посилання є реферальними|Some links are referral links|Некоторые ссылки реферальные/.test(h)) E(null, `${l}: page says the site uses referral links, but there are none`);
  // when the owner adds referral links (refs.json) the footer / about / terms must say so again
  if (hasRefs && /Ми не використовуємо реферальних|We use no referral links|Мы не используем реферальных/.test(h)) E(null, `${l}: refs.json has referral links, but the page says there are none — update the texts in i18n.ts / i18n-legal.ts`);
  if (!hasAds && /id="advertise"/.test(h)) E(null, `${l}: the ad block is shown while HAS_ADS is off`);
}

/* ---------- 8) mass outage guard ---------- */
const GUARD = path.join("data", "quality-guard.json");
let prev = null;
try { prev = JSON.parse(fs.readFileSync(GUARD, "utf8")); } catch { /* first run */ }
const count = P.filter((p) => p.category !== "farming").length;
const fatal = [];
if (count === 0) fatal.push("no promos at all");
else if (prev?.count >= 40 && count < prev.count * 0.5) fatal.push(`only ${count} promos (last good build had ${prev.count}) — a mass source outage`);
for (const e of errors) if (/referral links|ad block|missing/.test(e.why)) fatal.push(e.why);
// one exchange suddenly losing most of its promos = a parser / filter broke (25.11: an over-eager duplicate rule hid 8 Bitrue promos)
const byVenue = {};
for (const p of P) if (p.category !== "farming") byVenue[p.venue.id] = (byVenue[p.venue.id] ?? 0) + 1;
for (const [v, n] of Object.entries(prev?.byVenue ?? {})) if (n >= 4 && (byVenue[v] ?? 0) < n * 0.5) W(null, `${v}: ${byVenue[v] ?? 0} promos, the last build had ${n} — check sources / filters`);

/* ---------- report ---------- */
const report = { at: now, promos: count, errors, warns, fatal };
try { fs.mkdirSync(path.join(OUT, "api"), { recursive: true }); fs.writeFileSync(path.join(OUT, "api", "quality.json"), JSON.stringify(report)); } catch { /* */ }
console.log(`QUALITY: ${count} promos, ${errors.length} errors, ${warns.length} warnings, ${fatal.length} fatal`);
for (const e of errors.slice(0, 40)) console.log(`  ✕ ${e.id ?? "site"} | ${e.why} | ${e.title}`);
for (const w of warns.slice(0, 25)) console.log(`  ? ${w.id ?? "site"} | ${w.why} | ${w.title}`);
if (process.env.GITHUB_ACTIONS) {
  if (errors.length) console.log(`::warning title=Quality: ${errors.length} promo errors::${errors.slice(0, 6).map((e) => `${e.id ?? "site"}: ${e.why}`).join(" / ")}`);
  for (const f of fatal) console.log(`::error title=Quality guard stopped the deploy::${f}`);
}
if (fatal.length) process.exit(1);
try { if (fs.existsSync("data")) fs.writeFileSync(GUARD, JSON.stringify({ at: now, count, byVenue })); } catch { /* */ }
