import type { Metadata, Viewport } from "next";
import { notFound } from "next/navigation";
import { Unbounded, Manrope, JetBrains_Mono } from "next/font/google";
import "../globals.css";
import { LOCALES, getDict, isLocale } from "@/lib/i18n";
import { SITE } from "@/config/site";
import { Header } from "@/components/Header";

const unbounded = Unbounded({ subsets: ["latin", "cyrillic"], weight: ["500", "600", "700"], variable: "--font-unbounded", display: "swap" });
const manrope = Manrope({ subsets: ["latin", "cyrillic"], weight: ["400", "500", "600", "700", "800"], variable: "--font-manrope", display: "swap" });
const jetbrains = JetBrains_Mono({ subsets: ["latin", "cyrillic"], weight: ["500", "700"], variable: "--font-jetbrains", display: "swap" });

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
    icons: { icon: "/icon.svg" },
  };
}

export const viewport: Viewport = { themeColor: "#06080b", colorScheme: "dark" };

export default async function LangLayout({ children, params }: { children: React.ReactNode; params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  const t = getDict(lang);
  return (
    <html lang={lang} className={`${unbounded.variable} ${manrope.variable} ${jetbrains.variable}`}>
      <body className="min-h-dvh">
        <div className="page-bg" aria-hidden="true" />
        <Header lang={lang} t={t} />
        {children}
      </body>
    </html>
  );
}
