import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getDict, isLocale } from "@/lib/i18n";
import { API_DOC, API_ENDPOINTS, LEGAL } from "@/lib/i18n-legal";
import { withBase } from "@/lib/base";
import { SITE } from "@/config/site";
import { Footer } from "@/components/Sections";

/** About / Privacy / Terms / API docs. */
const DOCS = ["about", "privacy", "terms", "api"] as const;
type DocId = (typeof DOCS)[number];

export const dynamicParams = false;
export function generateStaticParams() { return DOCS.map((doc) => ({ doc })); }

type Params = Promise<{ lang: string; doc: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { lang, doc } = await params;
  if (!isLocale(lang) || !DOCS.includes(doc as DocId)) return {};
  return doc === "api" ? { title: API_DOC[lang].title, description: API_DOC[lang].sub } : { title: LEGAL[lang][doc as Exclude<DocId, "api">].title };
}

const linkify = (s: string) => s.split(/(https?:\/\/\S+)/).map((x, i) => (x.startsWith("http") ? <a key={i} href={x} target="_blank" rel="noopener" className="font-semibold text-lime hover:underline">{x.replace(/^https:\/\//, "")}</a> : x));

export default async function DocPage({ params }: { params: Params }) {
  const { lang, doc } = await params;
  if (!isLocale(lang) || !DOCS.includes(doc as DocId)) notFound();
  const t = getDict(lang);
  const base = `https://${SITE.domain}`;
  return (
    <>
      {/* same page frame as every other page (owner 12.11); the text itself keeps a reading width */}
      <main className="mx-auto max-w-7xl px-4 pb-20 pt-10 sm:px-6"><div className="max-w-3xl">
        {doc === "api" ? (
          <>
            <h1 className="font-display text-3xl font-semibold tracking-tight sm:text-5xl">{API_DOC[lang].title}</h1>
            <p className="mt-3 text-ink-2 sm:text-lg">{API_DOC[lang].sub}</p>
            <div className="mt-8 overflow-x-auto rounded-2xl border border-line">
              <table className="w-full text-left text-sm">
                <thead className="bg-white/[0.03] text-xs font-bold uppercase tracking-wider text-ink-3"><tr>{API_DOC[lang].cols.map((c) => <th key={c} className="px-4 py-3">{c}</th>)}</tr></thead>
                <tbody className="divide-y divide-line">
                  {API_ENDPOINTS.map((e) => (
                    <tr key={e.path}>
                      <td className="whitespace-nowrap px-4 py-3 font-mono text-xs"><a href={withBase(e.path)} className="text-lime hover:underline">{e.path}</a></td>
                      <td className="px-4 py-3 text-ink-2">{e.desc[lang]}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <pre className="mt-6 overflow-x-auto rounded-2xl border border-line bg-white/[0.02] p-4 font-mono text-xs text-ink-2">{`curl ${base}/api/funding.json`}</pre>
            <p className="mt-4 text-sm text-ink-3">{API_DOC[lang].note}</p>
          </>
        ) : (
          <>
            <h1 className="font-display text-3xl font-semibold tracking-tight sm:text-5xl">{LEGAL[lang][doc as Exclude<DocId, "api">].title}</h1>
            <p className="mt-3 text-ink-2 sm:text-lg">{LEGAL[lang][doc as Exclude<DocId, "api">].sub}</p>
            <div className="mt-10 space-y-8">
              {LEGAL[lang][doc as Exclude<DocId, "api">].blocks.map(([h, b]) => (
                <section key={h}>
                  <h2 className="text-lg font-bold">{h}</h2>
                  <p className="mt-2 leading-relaxed text-ink-2">{linkify(b)}</p>
                </section>
              ))}
            </div>
          </>
        )}
      </div></main>
      <Footer t={t} fetchedAt={Date.now()} lang={lang} />
    </>
  );
}
