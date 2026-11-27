import { alt, withOg } from "@/lib/seo";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getDict, isLocale } from "@/lib/i18n";
import { LEARN } from "@/lib/i18n-learn";
import { ARTICLES, ARTICLE_IDS } from "@/lib/articles";
import { ldJson } from "@/lib/ldjson";
import { SITE } from "@/config/site";
import { Footer } from "@/components/Sections";
import { AutoTerms } from "@/components/AutoTerms";

export const dynamicParams = false;
export function generateStaticParams() { return ARTICLE_IDS.map((id) => ({ id })); }

type Params = Promise<{ lang: string; id: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { lang, id } = await params;
  if (!isLocale(lang)) return {};
  const a = ARTICLES[lang].find((x) => x.id === id);
  return a ? withOg({ alternates: alt(lang, `/learn/a/${id}`), title: a.title, description: a.sub }) : {};
}

const TX = {
  uk: { faq: "Часті питання", more: "Інші статті", note: "Це загальне пояснення, а не фінансова порада. Точні умови кожної акції — у правилах біржі." },
  en: { faq: "FAQ", more: "More articles", note: "This is a general explanation, not financial advice. The exact conditions of each promo are in the exchange's rules." },
  ru: { faq: "Частые вопросы", more: "Другие статьи", note: "Это общее объяснение, а не финансовый совет. Точные условия каждой акции — в правилах биржи." },
} as const;

export default async function ArticlePage({ params }: { params: Params }) {
  const { lang, id } = await params;
  if (!isLocale(lang)) notFound();
  const a = ARTICLES[lang].find((x) => x.id === id);
  if (!a) notFound();
  const t = getDict(lang), L = LEARN[lang], X = TX[lang];
  const url = `https://${SITE.domain}/${lang}/learn/a/${id}/`;
  return (
    <>
      <main className="mx-auto max-w-3xl px-4 pb-20 pt-10 sm:px-6">
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: ldJson([
          { "@context": "https://schema.org", "@type": "Article", headline: a.title, description: a.sub, inLanguage: lang, url, mainEntityOfPage: url,
            publisher: { "@type": "Organization", name: SITE.name, url: `https://${SITE.domain}/` } },
          { "@context": "https://schema.org", "@type": "BreadcrumbList", itemListElement: [
            { "@type": "ListItem", position: 1, name: SITE.name, item: `https://${SITE.domain}/${lang}/` },
            { "@type": "ListItem", position: 2, name: L.hubTitle, item: `https://${SITE.domain}/${lang}/learn/` },
            { "@type": "ListItem", position: 3, name: a.title, item: url },
          ] },
          { "@context": "https://schema.org", "@type": "FAQPage", mainEntity: a.faq.map(([q, ans]) => ({ "@type": "Question", name: q, acceptedAnswer: { "@type": "Answer", text: ans } })) },
        ]) }} />
        <Link href={`/${lang}/learn`} className="text-sm font-bold text-ink-3 hover:text-ink">{L.back}</Link>
        <h1 className="mt-4 font-display text-3xl font-semibold tracking-tight sm:text-4xl">{a.title}</h1>
        <p className="mt-3 text-ink-2 sm:text-lg">{a.sub}</p>

        {a.sections.map((s) => (
          <section key={s.h} className="mt-8">
            <h2 className="font-display text-xl font-semibold tracking-tight sm:text-2xl">{s.h}</h2>
            {s.p.map((p) => <p key={p.slice(0, 40)} className="mt-3 leading-relaxed text-ink-2"><AutoTerms text={p} lang={lang} /></p>)}
          </section>
        ))}

        <Link href={`/${lang}${a.cta[0] === "/" ? "" : a.cta[0]}`} className="btn btn-primary mt-8 h-12 px-6">{a.cta[1]} →</Link>

        <h2 className="mt-12 font-display text-xl font-semibold tracking-tight sm:text-2xl">{X.faq}</h2>
        <div className="mt-4 space-y-2">
          {a.faq.map(([q, ans]) => (
            <details key={q} className="card p-4 hover:transform-none">
              <summary className="cursor-pointer font-semibold text-ink">{q}</summary>
              <p className="mt-2 text-sm leading-relaxed text-ink-2">{ans}</p>
            </details>
          ))}
        </div>

        <p className="mt-8 text-xs text-ink-3">{X.note}</p>

        <h2 className="mt-12 font-display text-xl font-semibold tracking-tight">{X.more}</h2>
        <ul className="mt-3 space-y-2">
          {ARTICLES[lang].filter((x) => x.id !== id).map((x) => (
            <li key={x.id}><Link href={`/${lang}/learn/a/${x.id}`} className="font-semibold text-lime hover:underline">{x.title}</Link></li>
          ))}
        </ul>
      </main>
      <Footer t={t} fetchedAt={Date.now()} lang={lang} />
    </>
  );
}
