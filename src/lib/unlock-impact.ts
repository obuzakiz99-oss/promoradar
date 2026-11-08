import type { Unlock } from "./unlocks";

/**
 * Rough, explainable estimate of how much an unlock can weigh on the price — not a forecast.
 * Three inputs: size vs market cap (pctCap), who receives the tokens (sell-prone or not) and the schedule (one-off vs linear).
 */
export type Level = 0 | 1 | 2 | 3;       // low · moderate · noticeable · strong
export type Who = "investors" | "team" | "community" | "treasury" | "sale" | "other";

export function whoOf(sale: string): Who {
  const s = sale.toLowerCase();
  if (/investor|backer|seed|private|strategic sale|venture|vc\b|series|existing investors|early backers/.test(s)) return "investors";
  if (/airdrop|community|kol|creator|incentive|reward|emission|staking|mining|node sale|worker/.test(s)) return "community";
  if (/public|ido|ico|ieo|launch ?pad|sale/.test(s)) return "sale";
  if (/treasury|foundation|reserve|repurchased|dao\b/.test(s)) return "treasury";
  if (/team|founder|contributor|advisor|company|employee|core|labs?\b/.test(s)) return "team";
  if (/ecosystem|development|growth|marketing|partner|fund|r&d/.test(s)) return "treasury";
  return "other";
}

const WHO_W: Record<Who, number> = { investors: 1, sale: 1, community: 1, team: 0, treasury: -1, other: 0 };

export function impactOf(u: Unlock): { level: Level; who: Who } {
  const who = whoOf(u.sale);
  let lv = u.pctCap >= 5 ? 3 : u.pctCap >= 1 ? 2 : u.pctCap >= 0.3 ? 1 : 0;
  lv += WHO_W[who];
  if (u.type === "linear") lv -= 1;          // spread over days / weeks → absorbed gradually
  if (u.pctCap >= 10) lv = Math.max(lv, 2);  // a tenth of the market cap or more is never minor, whoever receives it
  return { level: Math.max(0, Math.min(3, lv)) as Level, who };
}

type L = "uk" | "en" | "ru";
export const LEVEL_TXT: Record<L, [string, string, string, string]> = {
  uk: ["🟢 Слабкий", "🟡 Помірний", "🟠 Помітний", "🔴 Сильний"],
  en: ["🟢 Low", "🟡 Moderate", "🟠 Noticeable", "🔴 Strong"],
  ru: ["🟢 Слабое", "🟡 Умеренное", "🟠 Заметное", "🔴 Сильное"],
};
export const LEVEL_CLS = ["bg-lime/10 text-lime", "bg-white/5 text-ink-2", "bg-amber/15 text-amber", "bg-rose/15 text-rose"];

const WHO_TXT: Record<L, Record<Who, string>> = {
  uk: {
    investors: "інвестори часто фіксують прибуток одразу",
    sale: "ранні покупці можуть продавати",
    community: "отримувачі нагород і аірдропів зазвичай продають швидко",
    team: "команда частіше продає поступово",
    treasury: "казна чи фонд зазвичай не продають одразу",
    other: "невідомо, чи будуть продавати",
  },
  en: {
    investors: "investors often take profit right away",
    sale: "early buyers may sell",
    community: "reward and airdrop recipients usually sell fast",
    team: "the team usually sells gradually",
    treasury: "a treasury or foundation usually doesn't sell at once",
    other: "unclear whether they will sell",
  },
  ru: {
    investors: "инвесторы часто фиксируют прибыль сразу",
    sale: "ранние покупатели могут продавать",
    community: "получатели наград и аирдропов обычно продают быстро",
    team: "команда чаще продаёт постепенно",
    treasury: "казна или фонд обычно не продают сразу",
    other: "неясно, будут ли продавать",
  },
};

/** One short sentence: size → who → schedule. */
export function impactText(u: Unlock, lang: L): string {
  const { who } = impactOf(u);
  const pct = u.pctCap >= 0.1 ? u.pctCap.toFixed(1) : "<0.1";
  const size = {
    uk: u.pctCap >= 5 ? `Дуже великий: ${pct}% капіталізації` : u.pctCap >= 1 ? `Великий: ${pct}% капіталізації` : u.pctCap >= 0.3 ? `Середній: ${pct}% капіталізації` : `Малий: ${pct}% капіталізації`,
    en: u.pctCap >= 5 ? `Very large: ${pct}% of market cap` : u.pctCap >= 1 ? `Large: ${pct}% of market cap` : u.pctCap >= 0.3 ? `Medium: ${pct}% of market cap` : `Small: ${pct}% of market cap`,
    ru: u.pctCap >= 5 ? `Очень большой: ${pct}% капитализации` : u.pctCap >= 1 ? `Большой: ${pct}% капитализации` : u.pctCap >= 0.3 ? `Средний: ${pct}% капитализации` : `Малый: ${pct}% капитализации`,
  }[lang];
  const sched = u.type === "linear"
    ? { uk: "розтягнуто в часі, тисне м'якше", en: "spread over time, so softer", ru: "растянуто во времени, давит мягче" }[lang]
    : { uk: "усе одразу в один день", en: "all at once on one day", ru: "всё сразу в один день" }[lang];
  return `${size}; ${WHO_TXT[lang][who]}; ${sched}.`;
}
