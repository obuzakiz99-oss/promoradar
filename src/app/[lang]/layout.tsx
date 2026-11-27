import { alt, OG_LOCALE } from "@/lib/seo";
import type { Metadata, Viewport } from "next";
import { notFound } from "next/navigation";
// self-hosted variable fonts (Latin + Cyrillic), preloaded — see lib/fonts.ts
import { FONT_CSS, fontPreloads } from "@/lib/fonts";
import "../globals.css";
import { LOCALES, getDict, isLocale } from "@/lib/i18n";
import { SITE } from "@/config/site";
import { Header } from "@/components/Header";
import { withBase } from "@/lib/base";
import { NOVICE_BOOT } from "@/lib/novice";
// audit 27.11 (tech): og:locale wants language_TERRITORY ("uk_UA"), not "uk"

import { InstallApp } from "@/components/InstallApp";
import { Track } from "@/components/Track";
import { PopoverClose } from "@/components/PopoverClose";
import { MobileTabBar } from "@/components/MobileTabBar";

export function generateStaticParams() {
  return LOCALES.map((lang) => ({ lang }));
}

export async function generateMetadata({ params }: { params: Promise<{ lang: string }> }): Promise<Metadata> {
  const { lang } = await params;
  if (!isLocale(lang)) return {};
  const t = getDict(lang);
  const title = `${SITE.name} — ${t.hero.title1} ${t.hero.title2}`;
  return {
    metadataBase: new URL(`https://${SITE.domain}`),
    title: { default: title, template: `%s · ${SITE.name}` },
    description: t.hero.sub,
    alternates: alt(lang),
    // audit 27.11 (night): /uk/, /en/, /ru/ had no og:url (inner pages get theirs from withOg; the noindex redirect stubs inherit this)
    openGraph: { url: `/${lang}/`, title, description: t.hero.sub, siteName: SITE.name, locale: OG_LOCALE[lang], alternateLocale: Object.entries(OG_LOCALE).filter(([k]) => k !== lang).map(([, v]) => v), type: "website", images: [{ url: "/og-home.png", width: 1200, height: 630, alt: SITE.name }] },
    twitter: { card: "summary_large_image", title, description: t.hero.sub, images: ["/og-home.png"] },
    // 25.11: + favicon.ico / PNG — Google results, Telegram and Bing don't use the SVG and showed a blank globe
    icons: {
      icon: [{ url: withBase("/favicon.ico"), sizes: "any" }, { url: withBase("/favicon-96.png"), type: "image/png", sizes: "96x96" }, { url: withBase("/favicon-32.png"), type: "image/png", sizes: "32x32" }, { url: withBase("/icon.svg"), type: "image/svg+xml" }],
      apple: withBase("/apple-touch-icon.png"),
    },
    manifest: withBase("/manifest.webmanifest"),
    appleWebApp: { capable: true, title: SITE.name, statusBarStyle: "black-translucent" },
    verification: { google: "2b39PcYtXfivHnfm08m5gU9cjdXysM909StzoP6-XcM" },   // Search Console (24.11)
  };
}

export const viewport: Viewport = { themeColor: "#06080b", colorScheme: "dark" };

export default async function LangLayout({ children, params }: { children: React.ReactNode; params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  const t = getDict(lang);
  return (
    <html lang={lang} suppressHydrationWarning>
      <head>
        {fontPreloads(lang).map((href) => <link key={href} rel="preload" href={href} as="font" type="font/woff2" crossOrigin="anonymous" />)}
        <style dangerouslySetInnerHTML={{ __html: FONT_CSS }} />
        {/* beginner mode was removed 06.11 — this clears it for visitors who had switched it on */}
        <script dangerouslySetInnerHTML={{ __html: NOVICE_BOOT }} />
        {/* visit counter (owner 25.11): GoatCounter — no cookies, no personal data; stats visible only to the owner */}
        {process.env.SITE_HOST ? <script data-goatcounter="https://promoradar.goatcounter.com/count" async src="https://gc.zgo.at/count.js" /> : null}
      </head>
      <body className="min-h-dvh pb-16 md:pb-0">
        {/* owner 27.11: what visitors click / search / calculate — GoatCounter events, no cookies */}
        {process.env.SITE_HOST ? <Track /> : null}
        <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[60] focus:rounded-xl focus:bg-lime focus:px-4 focus:py-2 focus:font-bold focus:text-on-accent">{({ uk: "До вмісту", en: "Skip to content", ru: "К содержимому" } as const)[lang]}</a>
        <div className="page-bg" aria-hidden="true" />
        <Header lang={lang} t={t} />
        <div id="main" tabIndex={-1} className="focus:outline-none">{children}</div>
        {/* outside the header: its backdrop-filter would trap position:fixed */}
        <InstallApp lang={lang} base={withBase("")} />
        <PopoverClose />
        <MobileTabBar lang={lang} base={withBase("")} />
      </body>
    </html>
  );
}
