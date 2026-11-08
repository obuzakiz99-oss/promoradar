import type { Promo } from "./types";

/**
 * Our own short card title, built from the parsed facts instead of a machine-translated headline (audit 08.11):
 *   "<what to do> → <how much>"   e.g. "Торгуйте від $500 → до 100 USDT на 1 людину"
 * The exchange name and the promo type are already in the card header, so they are not repeated here.
 * Returns undefined when we know too little — then the card keeps the exchange's own headline.
 */
type L = "uk" | "en" | "ru";
const usd = (n: number) => `$${n >= 1000 ? Math.round(n).toLocaleString("en-US") : n}`;
const amt = (n: number, unit: string) => (/^(USD|USDT|USDC)$/.test(unit) && unit === "USD" ? usd(n) : `${n.toLocaleString("en-US")} ${unit}`);

const DO: Record<L, Record<"trade" | "deposit" | "stake" | "hold" | "buy", (x: string) => string>> = {
  uk: { trade: (x) => `Торгуйте від ${x}`, deposit: (x) => `Внесіть від ${x}`, stake: (x) => `Застейкайте від ${x}`, hold: (x) => `Тримайте від ${x}`, buy: (x) => `Купіть від ${x}` },
  en: { trade: (x) => `Trade from ${x}`, deposit: (x) => `Deposit from ${x}`, stake: (x) => `Stake from ${x}`, hold: (x) => `Hold from ${x}`, buy: (x) => `Buy from ${x}` },
  ru: { trade: (x) => `Торгуйте от ${x}`, deposit: (x) => `Внесите от ${x}`, stake: (x) => `Застейкайте от ${x}`, hold: (x) => `Держите от ${x}`, buy: (x) => `Купите от ${x}` },
};
const DEF: Record<L, Partial<Record<Promo["category"], string>> & { free: string }> = {
  uk: { free: "Без вкладень", referral: "Запросіть друзів", competition: "Змагайтеся за обсягом", earn: "Вкладіть під відсоток", airdrop: "Виконайте завдання", listing: "Торгуйте новим токеном", bonus: "Виконайте умови бонусу" },
  en: { free: "No deposit", referral: "Invite friends", competition: "Compete on volume", earn: "Deposit for interest", airdrop: "Complete the tasks", listing: "Trade the new token", bonus: "Meet the bonus terms" },
  ru: { free: "Без вложений", referral: "Пригласите друзей", competition: "Соревнуйтесь по объёму", earn: "Вложите под процент", airdrop: "Выполните задания", listing: "Торгуйте новым токеном", bonus: "Выполните условия бонуса" },
};
const PER: Record<L, (x: string) => string> = { uk: (x) => `до ${x} на 1 людину`, en: (x) => `up to ${x} per person`, ru: (x) => `до ${x} на 1 человека` };
const POOL: Record<L, (x: string) => string> = { uk: (x) => `фонд ${x}`, en: (x) => `pool ${x}`, ru: (x) => `фонд ${x}` };

export function titleOf(p: Promo, lang: L): string | undefined {
  const m = p.meta ?? {};
  if (p.category === "farming" || p.venue.kind === "airdrop") return undefined;
  const what = m.minEntry ? DO[lang][m.minEntry.kind](m.minEntry.unit === "USD" ? usd(m.minEntry.amount) : amt(m.minEntry.amount, m.minEntry.unit))
    : m.noDeposit ? DEF[lang].free : DEF[lang][p.category];
  const much = m.perUser ? PER[lang](m.perUser.unit === "USD" ? usd(m.perUser.amount) : amt(m.perUser.amount, m.perUser.unit))
    : m.aprPct !== undefined ? `+${m.aprPct}% APR` : p.reward ? POOL[lang](p.reward.label) : undefined;
  // only when it says more than a generic phrase: a threshold, a per-person amount, an APR or a pool
  if (!much && !m.minEntry) return undefined;
  return much ? `${what ?? ""}${what ? " → " : ""}${much}` : what;
}
