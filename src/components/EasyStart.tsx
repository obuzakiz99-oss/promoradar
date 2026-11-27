import Link from "next/link";
import type { Promo } from "@/lib/types";
import type { Locale } from "@/lib/i18n";
import { promoLevel } from "@/lib/level";
import { geoAllowed } from "@/lib/geo";
import { slugOf } from "@/lib/slug";
import { compactUsd, noEmoji } from "@/lib/format";
import { VenueLogo } from "./VenueLogo";

/**
 * "Найпростіше для новачка" (owner 27.11: "сайт для не розуміючих людей зрозумілий?") — up to 4 easy exchange offers right
 * under the hero, each in one plain line: what you get and that the page explains the steps. Easy = bonus / Earn / referral /
 * exchange airdrop on a centralised exchange, already running, open to Ukraine on the uk page, with a real estimate.
 */
const TX: Record<Locale, { h: string; sub: string; get: (x: string) => string; how: string; all: string }> = {
  uk: { h: "Найпростіше для новачка", sub: "Без ф'ючерсів і складних схем: зареєструватися, пройти перевірку особи, покласти або купити — і отримати бонус.", get: (x) => `реально ≈ ${x}`, how: "Як отримати →", all: "Усі прості акції" },
  en: { h: "Easiest for beginners", sub: "No futures, no complicated setups: sign up, verify your identity, deposit or buy — and get the bonus.", get: (x) => `realistic ≈ ${x}`, how: "How to get it →", all: "All easy promos" },
  ru: { h: "Проще всего для новичка", sub: "Без фьючерсов и сложных схем: зарегистрироваться, пройти проверку личности, внести или купить — и получить бонус.", get: (x) => `реально ≈ ${x}`, how: "Как получить →", all: "Все простые акции" },
};

export function EasyStart({ promos, lang, now }: { promos: Promo[]; lang: Locale; now: number }) {
  const net = (p: Promo) => p.meta?.value?.net ?? 0;
  const list = promos
    .filter((p) => p.venue.kind === "cex" && promoLevel(p) === "easy" && !p.sponsored
      && !(p.startsAt && p.startsAt > now) && !(p.endsAt && p.endsAt < now)
      && (lang !== "uk" || geoAllowed(p, "ua")) && !p.meta?.audience && net(p) >= 3)
    .sort((a, b) => Number(!!b.meta?.forNew) - Number(!!a.meta?.forNew) || net(b) - net(a))
    .slice(0, 4);
  if (list.length < 2) return null;
  const T = TX[lang];
  return (
    <section className="mx-auto max-w-7xl px-4 pt-8 sm:px-6">
      <div className="rounded-2xl border border-lime/25 bg-lime/[0.04] p-5 sm:p-6">
        <h2 className="font-display text-xl font-semibold tracking-tight sm:text-2xl">🌱 {T.h}</h2>
        <p className="mt-1 max-w-2xl text-sm text-ink-2">{T.sub}</p>
        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {list.map((p) => (
            <Link key={p.id} href={`/${lang}/p/${slugOf(p)}`} className="card flex flex-col gap-2 p-4">
              <div className="flex items-center gap-2 text-sm font-bold text-ink"><VenueLogo v={p.venue} size={24} rounded="rounded-md" />{p.venue.name}</div>
              <div className="line-clamp-3 text-sm leading-snug text-ink-2">{noEmoji(p.title)}</div>
              <div className="mt-auto flex items-end justify-between gap-2 pt-1">
                <span className="font-mono text-sm font-bold text-lime">{T.get(compactUsd(net(p), lang))}</span>
                <span className="text-xs font-bold text-ink-3">{T.how}</span>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
