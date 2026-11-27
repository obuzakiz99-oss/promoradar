/**
 * "Is this the real exchange?" — checks a link against the official domains and Telegram channels we already use
 * (config/site.ts). Pure functions, runs in the browser; nothing is sent anywhere.
 */
export interface Official { domains: Array<{ domain: string; venue: string }>; telegram: Array<{ channel: string; venue: string }> }
export type Verdict =
  | { kind: "official"; venue: string; domain: string; http?: boolean }
  | { kind: "officialTg"; venue: string; channel: string }
  | { kind: "lookalike"; venue: string; domain: string; why: "punycode" | "typo" | "contains" | "tld"; host: string }
  | { kind: "unknownTg"; channel: string; like?: string }
  | { kind: "unknown"; host: string; http?: boolean }
  | { kind: "invalid" };

const BIG = new Set(["google.com", "apple.com", "microsoft.com", "youtube.com", "wikipedia.org", "amazon.com", "cloudflare.com", "coingecko.com", "coinmarketcap.com", "medium.com", "reddit.com", "x.com", "twitter.com"]);
const WORDY = new Set(["crypto", "gemini", "kraken", "lighter", "aster", "bluefin", "meteora"]);

/** example.co.uk → example.co.uk, app.uniswap.org → uniswap.org */
export function registrable(host: string): string {
  const p = host.toLowerCase().replace(/\.$/, "").split(".");
  if (p.length <= 2) return p.join(".");
  const sld = p[p.length - 2];
  return (/^(co|com|org|net|gov|ac)$/.test(sld) && p[p.length - 1].length === 2 ? p.slice(-3) : p.slice(-2)).join(".");
}
const base = (reg: string) => reg.split(".")[0];
// common look-alike swaps: 0→o, 1→l, rn→m, vv→w
const norm = (s: string) => s.replace(/0/g, "o").replace(/1/g, "l").replace(/rn/g, "m").replace(/vv/g, "w").replace(/[-_]/g, "");

function lev(a: string, b: string): number {
  const d = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)]);
  for (let j = 1; j <= b.length; j++) d[0][j] = j;
  for (let i = 1; i <= a.length; i++) for (let j = 1; j <= b.length; j++) d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
  return d[a.length][b.length];
}

// audit 27.11 (night): "any one edit" of a 5–7 letter brand flagged real sites as fakes — bank.com (LBank), bingo.com (BingX),
// coin.com (CoinW), bitset.com (Bitget), paradox.com (Paradex), fighter.com (Lighter). Short brands: only the edits phishers
// use — a doubled letter (bybbit) or a look-/sound-alike letter swap (binanse, bltget, kucoim)
const ALIKE = new Set(["il", "ij", "lj", "sz", "cs", "ck", "ks", "uv", "vw", "gq", "mn", "yi", "xk"]);
function shortTypo(ob: string, b: string): boolean {
  if (b.length === ob.length + 1) return [...b].some((c, i) => i > 0 && c === b[i - 1] && b.slice(0, i) + b.slice(i + 1) === ob);
  if (b.length !== ob.length) return false;
  const diff = [...ob].map((c, i) => [c, b[i]]).filter(([x, y]) => x !== y);
  return diff.length === 1 && ALIKE.has([...diff[0]].sort().join(""));
}

export function checkLink(raw: string, off: Official): Verdict {
  let s = raw.trim();
  if (!s) return { kind: "invalid" };
  if (/^@[\w]{4,}$/.test(s)) s = `https://t.me/${s.slice(1)}`;
  if (!/^[a-z]+:\/\//i.test(s)) s = `https://${s}`;
  let u: URL;
  try { u = new URL(s); } catch { return { kind: "invalid" }; }
  if (!/^https?:$/.test(u.protocol) || !u.hostname.includes(".")) return { kind: "invalid" };
  const host = u.hostname.toLowerCase();
  const http = u.protocol === "http:";
  // "https://www.binance.com@evil.com/" opens evil.com — the part before "@" is only a disguise (audit 14.11)
  if (u.username || u.password) {
    const fake = off.domains.find((d) => `${u.username}`.toLowerCase().includes(base(d.domain).toLowerCase()));
    return { kind: "lookalike", venue: fake?.venue ?? "?", domain: fake?.domain ?? "", why: "contains", host };
  }

  // Telegram channel
  if (/^(t\.me|telegram\.me|telegram\.dog)$/.test(host)) {
    const ch = u.pathname.split("/").filter(Boolean)[0]?.replace(/^s$/, u.pathname.split("/").filter(Boolean)[1] ?? "") ?? "";
    const hit = off.telegram.find((t) => t.channel.toLowerCase() === ch.toLowerCase());
    if (hit) return { kind: "officialTg", venue: hit.venue, channel: hit.channel };
    const like = off.telegram.find((t) => lev(norm(t.channel.toLowerCase()), norm(ch.toLowerCase())) <= 2);
    return { kind: "unknownTg", channel: ch, like: like?.venue };
  }

  const reg = registrable(host);
  const exact = off.domains.find((d) => d.domain === reg);
  if (exact && !host.startsWith("xn--") && !host.includes(".xn--")) return { kind: "official", venue: exact.venue, domain: reg, http };

  if (/(^|\.)xn--/.test(host)) {
    const like = off.domains.find((d) => lev(norm(base(d.domain)), norm(base(reg).replace(/^xn--/, ""))) <= 3);
    return { kind: "lookalike", venue: like?.venue ?? "?", domain: like?.domain ?? "", why: "punycode", host };
  }
  const b = norm(base(reg));
  for (const d of off.domains) {
    const ob = norm(base(d.domain));
    if (ob === b) return { kind: "lookalike", venue: d.venue, domain: d.domain, why: "tld", host };                       // binance.cc
    if (ob.length >= 8 ? lev(ob, b) <= 2 : ob.length >= 5 && shortTypo(ob, b)) return { kind: "lookalike", venue: d.venue, domain: d.domain, why: "typo", host }; // binanse.com
  }
  // brand name inside another domain: binance-bonus.com, bybit.rewards-claim.net, okx-airdrop.io
  const label = norm(host.replace(/\.[^.]+$/, ""));
  // audit 27.11 (evening): gemini.google.com was "a fake of gemini.com", cryptopanic.com "a fake of crypto.com" — a subdomain of a
  // big well-known site is not a phishing copy, and brands that are plain words match only as a whole word
  if (BIG.has(reg)) return { kind: "unknown", host, http };
  for (const d of off.domains) {
    const ob = norm(base(d.domain));
    const re = ob.length >= 5 && !WORDY.has(ob) ? new RegExp(ob) : new RegExp(`(^|[.-])${ob}([.-]|$)`);
    if (re.test(ob.length >= 5 && !WORDY.has(ob) ? label : host.replace(/\.[^.]+$/, ""))) return { kind: "lookalike", venue: d.venue, domain: d.domain, why: "contains", host };
  }
  return { kind: "unknown", host, http };
}
