import { isLocale } from "@/lib/i18n";
import { withBase } from "@/lib/base";

// 14.11: Launchpool insights now live on /history/ (one page about past pools) — old links land on that section.
// A static page (GitHub Pages has no server redirects): meta refresh + script, with a plain link as the fallback.
export const metadata = { robots: { index: false } };

export default async function Insights({ params }: { params: Promise<{ lang: string }> }) {
  const { lang: l } = await params;
  const lang = isLocale(l) ? l : "uk";
  const to = withBase(`/${lang}/history/#after`);
  return (
    <main className="mx-auto max-w-7xl px-4 py-20 sm:px-6">
      <meta httpEquiv="refresh" content={`0; url=${to}`} />
      <script dangerouslySetInnerHTML={{ __html: `location.replace(${JSON.stringify(to)})` }} />
      <a href={to} className="text-lime hover:underline">PromoRadar →</a>
    </main>
  );
}
