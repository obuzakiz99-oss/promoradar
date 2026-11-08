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
    if (ob.length >= 5 && lev(ob, b) <= (ob.length >= 8 ? 2 : 1)) return { kind: "lookalike", venue: d.venue, domain: d.domain, why: "typo", host }; // binanse.com
  }
  // brand name inside another domain: binance-bonus.com, bybit.rewards-claim.net, okx-airdrop.io
  const label = norm(host.replace(/\.[^.]+$/, ""));
  for (const d of off.domains) {
    const ob = norm(base(d.domain));
    const re = ob.length >= 5 ? new RegExp(ob) : new RegExp(`(^|[.-])${ob}([.-]|$)`);
    if (re.test(ob.length >= 5 ? label : host.replace(/\.[^.]+$/, ""))) return { kind: "lookalike", venue: d.venue, domain: d.domain, why: "contains", host };
  }
  return { kind: "unknown", host, http };
}
