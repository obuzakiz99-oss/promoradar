import type { Metadata, Viewport } from "next";
import { notFound } from "next/navigation";
// self-hosted variable fonts (Latin + Cyrillic) — no network calls at build time
import "@fontsource-variable/unbounded";
import "@fontsource-variable/manrope";
import "@fontsource-variable/jetbrains-mono";
import "../globals.css";
import { LOCALES, getDict, isLocale } from "@/lib/i18n";
import { SITE } from "@/config/site";
import { Header } from "@/components/Header";
import { withBase } from "@/lib/base";
import { NOVICE_BOOT } from "@/lib/novice";
import { InstallApp } from "@/components/InstallApp";

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
    alternates: { canonical: `/${lang}`, languages: { uk: "/uk", en: "/en", ru: "/ru", "x-default": "/en" } },
    openGraph: { title, description: t.hero.sub, siteName: SITE.name, locale: lang, type: "website" },
    twitter: { card: "summary_large_image", title, description: t.hero.sub },
    icons: { icon: withBase("/icon.svg"), apple: withBase("/apple-touch-icon.png") },
    manifest: withBase("/manifest.webmanifest"),
    appleWebApp: { capable: true, title: SITE.name, statusBarStyle: "black-translucent" },
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
        {/* beginner mode was removed 06.11 — this clears it for visitors who had switched it on */}
        <script dangerouslySetInnerHTML={{ __html: NOVICE_BOOT }} />
      </head>
      <body className="min-h-dvh">
        <div className="page-bg" aria-hidden="true" />
        <Header lang={lang} t={t} />
        {children}
        {/* outside the header: its backdrop-filter would trap position:fixed */}
        <InstallApp lang={lang} base={withBase("")} />
      </body>
    </html>
  );
}
