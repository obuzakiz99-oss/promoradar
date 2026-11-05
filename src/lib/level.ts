import type { Locale } from "./i18n";
import type { Category } from "./types";

/** How hard / risky something is for a beginner. "hard" items are hidden in novice mode. */
export type Level = "easy" | "medium" | "hard";

const STABLE = /^(USDT|USDC|USD1|USDG|FDUSD|DAI|PYUSD|USDE|U)$/i;
const MAJOR = /^(BTC|ETH|BNB|SOL|XRP|TRX|TON|GT|KCS|BGB|MX|OKB|HTX|WBT|LBK)$/i;
const RISKY_WORDS = /\b(futures|perp(etual)?s?|leverage|margin|copy ?trad|demo|stock futures|cfd|options?|gstocks?)\b/i;

export function promoLevel(p: { category: Category; title: string; evergreen?: boolean; venue?: { kind?: string } }): Level {
  if (p.category === "farming" || p.venue?.kind === "dex" || p.venue?.kind === "defi") return "hard";
  if (RISKY_WORDS.test(p.title)) return "hard";
  if (p.category === "competition") return "medium";
  if (p.category === "earn" || p.category === "bonus" || p.category === "referral") return "easy";
  if (p.category === "airdrop" || p.category === "listing") return "easy";
  return "medium";
}

/** Launchpool pool: stablecoin stake = easy, big coins = medium, staking the new token itself / small caps = hard. */
export function poolLevel(stake: string, token: string): Level {
  if (STABLE.test(stake)) return "easy";
  if (stake === token) return "hard";
  if (MAJOR.test(stake)) return "medium";
  return "hard";
}

export const LEVEL_TXT: Record<Locale, Record<Level, [string, string]>> = {
  uk: {
    easy: ["Просто", "Підходить новачкам: зрозумілі умови, ціна майже не впливає"],
    medium: ["Середньо", "Треба трохи розібратися: умови або ціна монети впливають на результат"],
    hard: ["Для досвідчених", "Ф'ючерси, DeFi або нові токени — можна втратити більше, ніж заробити"],
  },
  en: {
    easy: ["Easy", "Beginner-friendly: simple terms, price barely matters"],
    medium: ["Medium", "Needs some understanding: terms or the coin price affect the result"],
    hard: ["Advanced", "Futures, DeFi or new tokens — you can lose more than you earn"],
  },
  ru: {
    easy: ["Просто", "Подходит новичкам: понятные условия, цена почти не влияет"],
    medium: ["Средне", "Нужно немного разобраться: условия или цена монеты влияют на результат"],
    hard: ["Для опытных", "Фьючерсы, DeFi или новые токены — можно потерять больше, чем заработать"],
  },
};

export const LEVEL_CLS: Record<Level, string> = {
  easy: "bg-lime/10 text-lime",
  medium: "bg-amber/10 text-amber",
  hard: "bg-white/[0.06] text-ink-3",
};

/** "$100 → +$0.83 a month" — profit in plain dollars. */
export function plainProfit(apr: number, lang: Locale, amount = 100): string {
  const m = (amount * apr) / 100 / 12;
  const v = m >= 10 ? m.toFixed(0) : m >= 1 ? m.toFixed(1) : m.toFixed(2);
  return { uk: `$${amount} → ≈ +$${v} за місяць`, en: `$${amount} → ≈ +$${v} a month`, ru: `$${amount} → ≈ +$${v} в месяц` }[lang];
}
