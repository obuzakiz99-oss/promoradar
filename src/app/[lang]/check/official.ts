import { TELEGRAM, VENUES } from "@/config/site";
import { registrable, type Official } from "@/lib/linkcheck";

// older official domains of the same companies (rebrands) — only ones the exchanges themselves still use
const ALIASES: Array<{ domain: string; venue: string }> = [
  { domain: "gate.io", venue: "gate" },
  { domain: "huobi.com", venue: "htx" },
];

/** The official list = every venue site we link to + their official Telegram channels (config/site.ts). */
export function officialList(): Official {
  const domains = Object.values(VENUES).map((v) => ({ domain: registrable(new URL(v.site).hostname), venue: v.name }));
  for (const a of ALIASES) if (VENUES[a.venue]) domains.push({ domain: a.domain, venue: VENUES[a.venue].name });
  const telegram = TELEGRAM.filter((t) => VENUES[t.venue]).map((t) => ({ channel: t.channel, venue: VENUES[t.venue].name }));
  const seen = new Set<string>();
  return { domains: domains.filter((d) => !seen.has(d.domain) && seen.add(d.domain)), telegram };
}

