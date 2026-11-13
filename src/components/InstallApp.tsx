"use client";
import { useEffect, useState } from "react";
import type { Locale } from "@/lib/i18n";

type BIP = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> };

const TX: Record<Locale, { install: string; text: string; ios: string; later: string }> = {
  uk: { install: "Встановити", text: "PromoRadar як додаток — іконка на екрані, відкривається миттєво.", ios: "У Safari натисніть «Поділитися» → «На екран «Додому»».", later: "Не зараз" },
  en: { install: "Install", text: "PromoRadar as an app — an icon on your home screen, opens instantly.", ios: "In Safari tap Share → “Add to Home Screen”.", later: "Not now" },
  ru: { install: "Установить", text: "PromoRadar как приложение — иконка на экране, открывается мгновенно.", ios: "В Safari нажмите «Поделиться» → «На экран «Домой»».", later: "Не сейчас" },
};

/**
 * Registers the service worker and, on a second visit, offers to install the site as an app
 * (Android Chrome: the browser's own install dialog; iPhone: a one-line hint). Not on desktop. Never shown again after "Not now".
 */
export function InstallApp({ lang, base }: { lang: Locale; base: string }) {
  const [evt, setEvt] = useState<BIP | null>(null);
  const [ios, setIos] = useState(false);
  const [show, setShow] = useState(false);

  useEffect(() => {
    if ("serviceWorker" in navigator) navigator.serviceWorker.register(`${base}/sw.js`, { scope: `${base}/` }).catch(() => { /* not critical */ });
    let ok = false;
    try {
      // count browsing sessions, not page loads (every page of the static site is a load): offer from the 3rd session
      let visits = Number(localStorage.getItem("pr:visits") || "0");
      if (!sessionStorage.getItem("pr:session")) { sessionStorage.setItem("pr:session", "1"); visits += 1; localStorage.setItem("pr:visits", String(visits)); }
      ok = visits >= 3 && !localStorage.getItem("pr:installNo");
    } catch { /* storage blocked */ }
    const standalone = window.matchMedia("(display-mode: standalone)").matches || (navigator as unknown as { standalone?: boolean }).standalone;
    // phones / tablets only (owner 13.11: no install banner on desktop)
    const mobile = window.matchMedia("(pointer: coarse) and (max-width: 1024px)").matches;
    if (!ok || standalone || !mobile) return;
    const onPrompt = (e: Event) => { e.preventDefault(); setEvt(e as BIP); setShow(true); };
    window.addEventListener("beforeinstallprompt", onPrompt);
    if (/iphone|ipad|ipod/i.test(navigator.userAgent) && /safari/i.test(navigator.userAgent) && !/crios|fxios/i.test(navigator.userAgent)) { setIos(true); setShow(true); }
    return () => window.removeEventListener("beforeinstallprompt", onPrompt);
  }, [base]);

  const no = () => { try { localStorage.setItem("pr:installNo", "1"); } catch { /* ignore */ } setShow(false); };
  if (!show) return null;
  const T = TX[lang];
  return (
    <div role="dialog" className="fixed inset-x-3 bottom-20 z-50 mx-auto max-w-sm sm:inset-x-auto sm:right-4 md:bottom-4 lg:hidden animate-fade-up rounded-2xl border border-lime/30 bg-surface/95 p-4 shadow-2xl backdrop-blur-xl">
      <p className="text-sm font-semibold text-ink">{T.text}</p>
      {ios && <p className="mt-1 text-xs text-ink-2">{T.ios}</p>}
      <div className="mt-3 flex gap-2">
        {evt && <button type="button" className="btn btn-primary h-10 px-5 text-sm" onClick={async () => { await evt.prompt(); await evt.userChoice.catch(() => null); setShow(false); }}>{T.install}</button>}
        <button type="button" className="btn btn-ghost h-10 px-4 text-sm" onClick={no}>{T.later}</button>
      </div>
    </div>
  );
}
