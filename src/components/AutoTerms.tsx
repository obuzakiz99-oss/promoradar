import { Fragment } from "react";
import type { Locale } from "@/lib/i18n";
import { GLOSSARY } from "@/lib/glossary";
import { Term } from "./Term";

/**
 * Plain text with the crypto words explained in place (owner 27.11: "натискаєш на APR чи KYC — і бачиш пояснення"):
 * the first APR / KYC / USDT / Launchpool / ф'ючерси … in a text becomes a <Term> tooltip from the glossary.
 */
const WORDS: Array<[RegExp, string]> = [
  [/\bAPR\b/, "apr"], [/\bAPY\b/, "apy"], [/\bKYC\b/, "kyc"], [/\bUSDT\b/, "usdt"], [/\bLaunchpool\b/i, "launchpool"],
  [/\bEarn\b/, "earn"], [/\b2FA\b/, "twofa"], [/\bDEX\b/, "dex"], [/\bTVL\b/, "tvl"],
  [/ф[''ʼ]?ючерс\p{L}*|фьючерс\p{L}*|\bfutures\b/iu, "futures"],
  [/плеч\p{L}*|\bleverage\b/iu, "leverage"],
  [/стейблко[їи]н\p{L}*|\bstablecoins?\b/iu, "stablecoin"],
  [/стейк\p{L}*|\bstak(?:e|ing)\b/iu, "stake"],
  [/а[іи]рдроп\p{L}*|\bairdrops?\b/iu, "airdrop"],
  [/реферал\p{L}*|\breferral\b/iu, "referral"],
  [/гаман\p{L}*|кошел\p{L}*|\bwallet\b/iu, "wallet"],
];

export function AutoTerms({ text, lang }: { text: string; lang: Locale }) {
  type Hit = { i: number; len: number; k: string };
  const hits: Hit[] = [];
  for (const [re, k] of WORDS) {
    if (!GLOSSARY[lang][k] && !GLOSSARY.en[k]) continue;
    const m = re.exec(text);
    if (m && !hits.some((h) => m.index < h.i + h.len && m.index + m[0].length > h.i)) hits.push({ i: m.index, len: m[0].length, k });
  }
  if (!hits.length) return <>{text}</>;
  hits.sort((a, b) => a.i - b.i);
  const out: React.ReactNode[] = [];
  let pos = 0;
  hits.forEach((h, n) => {
    if (h.i > pos) out.push(<Fragment key={`t${n}`}>{text.slice(pos, h.i)}</Fragment>);
    out.push(<Term key={`k${n}`} k={h.k as never} lang={lang}>{text.slice(h.i, h.i + h.len)}</Term>);
    pos = h.i + h.len;
  });
  if (pos < text.length) out.push(<Fragment key="end">{text.slice(pos)}</Fragment>);
  return <>{out}</>;
}
