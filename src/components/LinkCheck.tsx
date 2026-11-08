"use client";
import { useState } from "react";
import { checkLink, type Official, type Verdict } from "@/lib/linkcheck";

type L = "uk" | "en" | "ru";
const X: Record<L, {
  ph: string; btn: string; invalid: string;
  official: (v: string, d: string) => string; officialTg: (v: string, c: string) => string; http: string;
  look: (v: string, d: string) => string; why: Record<"punycode" | "typo" | "contains" | "tld", string>; lookNote: string;
  unknownTg: (c: string) => string; likeTg: (v: string) => string; unknown: (h: string) => string; unknownNote: string;
  tips: string; tip: string[];
}> = {
  uk: {
    ph: "Вставте посилання або @канал, напр. binance-bonus.com", btn: "Перевірити", invalid: "Це не схоже на посилання. Вставте адресу сайту або Telegram-каналу.",
    official: (v, d) => `✅ Офіційний сайт ${v} (${d})`, officialTg: (v, c) => `✅ Офіційний Telegram-канал ${v} (@${c})`, http: "Але посилання без https — відкривайте лише через https://",
    look: (v, d) => `🚨 Схоже на ${v}, але це НЕ офіційний сайт${d ? ` (справжній — ${d})` : ""}`,
    why: { punycode: "Адреса написана схожими літерами з інших алфавітів — класичний прийом шахраїв.", typo: "Адреса відрізняється від справжньої на одну-дві літери.", contains: "Назва біржі вставлена в чужий домен.", tld: "Та сама назва, але інша доменна зона." },
    lookNote: "Не вводьте тут пароль, коди 2FA чи seed-фразу і не підключайте гаманець.",
    unknownTg: (c) => `❓ Каналу @${c} немає в нашому списку офіційних`, likeTg: (v) => `Назва дуже схожа на офіційний канал ${v} — можливо, підробка.`,
    unknown: (h) => `❓ ${h} немає в нашому списку офіційних сайтів бірж`, unknownNote: "Це не обов'язково шахраї, але перевірте адресу на офіційному сайті біржі, перш ніж щось вводити.",
    tips: "Як не потрапити на фішинг", tip: ["Заходьте на біржу із закладки або через PromoRadar, а не з посилань у чатах.", "Справжня біржа ніколи не просить seed-фразу і не пише першою в особисті.", "«Подвоїмо ваші монети» чи «заберіть аірдроп, підключивши гаманець» — майже завжди шахрайство."],
  },
  en: {
    ph: "Paste a link or @channel, e.g. binance-bonus.com", btn: "Check", invalid: "That doesn't look like a link. Paste a website or Telegram channel address.",
    official: (v, d) => `✅ Official ${v} website (${d})`, officialTg: (v, c) => `✅ Official ${v} Telegram channel (@${c})`, http: "But the link has no https — open it only via https://",
    look: (v, d) => `🚨 Looks like ${v}, but it is NOT the official site${d ? ` (the real one is ${d})` : ""}`,
    why: { punycode: "The address uses look-alike letters from other alphabets — a classic scam trick.", typo: "The address differs from the real one by a letter or two.", contains: "The exchange's name is inserted into someone else's domain.", tld: "Same name, different domain ending." },
    lookNote: "Don't enter your password, 2FA codes or seed phrase here, and don't connect a wallet.",
    unknownTg: (c) => `❓ @${c} is not on our list of official channels`, likeTg: (v) => `The name is very close to ${v}'s official channel — possibly a fake.`,
    unknown: (h) => `❓ ${h} is not on our list of official exchange sites`, unknownNote: "Not necessarily a scam, but check the address on the exchange's official site before entering anything.",
    tips: "How not to get phished", tip: ["Open exchanges from a bookmark or via PromoRadar, not from links in chats.", "A real exchange never asks for your seed phrase and never DMs you first.", "“We'll double your coins” or “claim the airdrop by connecting your wallet” is almost always a scam."],
  },
  ru: {
    ph: "Вставьте ссылку или @канал, напр. binance-bonus.com", btn: "Проверить", invalid: "Это не похоже на ссылку. Вставьте адрес сайта или Telegram-канала.",
    official: (v, d) => `✅ Официальный сайт ${v} (${d})`, officialTg: (v, c) => `✅ Официальный Telegram-канал ${v} (@${c})`, http: "Но ссылка без https — открывайте только через https://",
    look: (v, d) => `🚨 Похоже на ${v}, но это НЕ официальный сайт${d ? ` (настоящий — ${d})` : ""}`,
    why: { punycode: "Адрес написан похожими буквами из других алфавитов — классический приём мошенников.", typo: "Адрес отличается от настоящего на одну-две буквы.", contains: "Название биржи вставлено в чужой домен.", tld: "То же название, но другая доменная зона." },
    lookNote: "Не вводите здесь пароль, коды 2FA или seed-фразу и не подключайте кошелёк.",
    unknownTg: (c) => `❓ Канала @${c} нет в нашем списке официальных`, likeTg: (v) => `Название очень похоже на официальный канал ${v} — возможно, подделка.`,
    unknown: (h) => `❓ ${h} нет в нашем списке официальных сайтов бирж`, unknownNote: "Это не обязательно мошенники, но проверьте адрес на официальном сайте биржи, прежде чем что-то вводить.",
    tips: "Как не попасть на фишинг", tip: ["Заходите на биржу из закладки или через PromoRadar, а не по ссылкам из чатов.", "Настоящая биржа никогда не просит seed-фразу и не пишет первой в личку.", "«Удвоим ваши монеты» или «заберите аирдроп, подключив кошелёк» — почти всегда мошенничество."],
  },
};

function Result({ v, lang }: { v: Verdict; lang: L }) {
  const T = X[lang];
  const box = (cls: string, head: string, ...lines: Array<string | false | undefined>) => (
    <div className={`mt-5 rounded-2xl border p-5 ${cls}`}>
      <div className="text-lg font-bold [overflow-wrap:anywhere]">{head}</div>
      {lines.filter(Boolean).map((l) => <p key={l as string} className="mt-2 text-sm leading-relaxed text-ink-2">{l}</p>)}
    </div>
  );
  switch (v.kind) {
    case "official": return box("border-lime/40 bg-lime/[0.06]", T.official(v.venue, v.domain), v.http && T.http);
    case "officialTg": return box("border-lime/40 bg-lime/[0.06]", T.officialTg(v.venue, v.channel));
    case "lookalike": return box("border-rose/50 bg-rose/[0.08]", (v.venue === "?" ? ({ uk: "🚨 Підозріла адреса — схожа на підробку", en: "🚨 Suspicious address — looks like a fake", ru: "🚨 Подозрительный адрес — похоже на подделку" } as const)[lang] : T.look(v.venue, v.domain)), T.why[v.why], T.lookNote);
    case "unknownTg": return box("border-amber/40 bg-amber/[0.06]", T.unknownTg(v.channel), v.like && T.likeTg(v.like), T.unknownNote);
    case "unknown": return box("border-amber/40 bg-amber/[0.06]", T.unknown(v.host), T.unknownNote, v.http && T.http);
    default: return box("border-line bg-white/[0.02]", T.invalid);
  }
}

export function LinkCheck({ lang, official }: { lang: L; official: Official }) {
  const T = X[lang];
  const [q, setQ] = useState("");
  const [v, setV] = useState<Verdict | null>(null);
  return (
    <div className="mt-8 max-w-2xl">
      <form className="flex flex-col gap-2 sm:flex-row" onSubmit={(e) => { e.preventDefault(); setV(checkLink(q, official)); }}>
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={T.ph} inputMode="url" autoCapitalize="off" autoCorrect="off" spellCheck={false}
          className="h-12 min-w-0 flex-1 rounded-xl border border-line bg-surface px-4 text-sm text-ink placeholder:text-ink-3 focus:border-lime/60 focus:outline-none" />
        <button type="submit" className="btn btn-primary h-12 px-6">{T.btn}</button>
      </form>
      {v && <Result v={v} lang={lang} />}
      <section className="card mt-8 p-6 hover:transform-none">
        <h2 className="font-display text-lg font-semibold tracking-tight">🛡 {T.tips}</h2>
        <ul className="mt-3 space-y-2 text-sm text-ink-2">{T.tip.map((t) => <li key={t} className="flex gap-2"><span className="text-lime">•</span>{t}</li>)}</ul>
      </section>
    </div>
  );
}
