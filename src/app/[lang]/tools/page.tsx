import { isLocale } from "@/lib/i18n";
import { withBase } from "@/lib/base";

// audit 08.11: "Інструменти" is gone from the menu — its tools live in the sections now; old links land on the home page.
// A static page (GitHub Pages has no server redirects): meta refresh + script, with a plain link as the fallback.
export const metadata = { robots: { index: false } };

export default async function Tools({ params }: { params: Promise<{ lang: string }> }) {
  const { lang: l } = await params;
  const lang = isLocale(l) ? l : "uk";
  const to = withBase(`/${lang}/`);
  return (
    <main className="mx-auto max-w-7xl px-4 py-20 sm:px-6">
      <meta httpEquiv="refresh" content={`0; url=${to}`} />
      <script dangerouslySetInnerHTML={{ __html: `location.replace(${JSON.stringify(to)})` }} />
      <a href={to} className="text-lime hover:underline">PromoRadar →</a>
    </main>
  );
}
