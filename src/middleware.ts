import { NextResponse, type NextRequest } from "next/server";
import { LOCALES, DEFAULT_LOCALE } from "@/lib/i18n";

/** Redirect "/" (and any path without a locale) to the visitor's language: uk / ru / en. */
export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  if (LOCALES.some((l) => pathname === `/${l}` || pathname.startsWith(`/${l}/`))) return;

  const saved = req.cookies.get("lang")?.value;
  let lang = saved && (LOCALES as readonly string[]).includes(saved) ? saved : undefined;
  if (!lang) {
    const al = (req.headers.get("accept-language") || "").toLowerCase();
    lang = /\buk\b|uk-/.test(al) ? "uk" : /\bru\b|ru-|\bbe\b|\bkk\b/.test(al) ? "ru" : al.startsWith("en") ? "en" : DEFAULT_LOCALE;
  }
  const url = req.nextUrl.clone();
  url.pathname = `/${lang}${pathname === "/" ? "" : pathname}`;
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ["/((?!api|logo|rss.xml|_next|favicon.ico|icon.svg|robots.txt|sitemap.xml|.*\\..*).*)"],
};
