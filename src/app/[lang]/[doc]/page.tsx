import { alt, withOg } from "@/lib/seo";
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

// audit 26.11: about / privacy / terms had one shared description — Google treats that as duplicate pages
const DOC_DESC: Record<Exclude<DocId, "api">, Record<"uk" | "en" | "ru", string>> = {
  about: { uk: "Хто робить PromoRadar, звідки беремо акції бірж і як перевіряємо умови перед публікацією.", en: "Who runs PromoRadar, where exchange promos come from and how we check the terms before publishing.", ru: "Кто делает PromoRadar, откуда берём акции бирж и как проверяем условия перед публикацией." },
  privacy: { uk: "Політика конфіденційності PromoRadar: без cookie і трекерів — лише загальна статистика відвідувань; що зберігається у вашому браузері і як це видалити.", en: "PromoRadar privacy policy: no cookies or trackers, only total visit counts; what stays in your browser and how to delete it.", ru: "Политика конфиденциальности PromoRadar: без cookie и трекеров — только общая статистика посещений; что хранится в вашем браузере и как это удалить." },
  terms: { uk: "Умови користування PromoRadar: сайт лише збирає акції бірж, не дає фінансових порад і не відповідає за умови бірж.", en: "PromoRadar terms of use: the site only collects exchange promos, gives no financial advice and does not set the exchanges' terms.", ru: "Условия пользования PromoRadar: сайт только собирает акции бирж, не даёт финансовых советов и не отвечает за условия бирж." },
};
export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { lang, doc } = await params;
  if (!isLocale(lang) || !DOCS.includes(doc as DocId)) return {};
  return withOg(doc === "api" ? { alternates: alt(lang, `/${doc}`), title: API_DOC[lang].title, description: API_DOC[lang].sub } : { alternates: alt(lang, `/${doc}`), title: LEGAL[lang][doc as Exclude<DocId, "api">].title, description: DOC_DESC[doc as Exclude<DocId, "api">][lang] });
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
            <div tabIndex={0} role="region" aria-label={({ uk: "Таблиця — гортайте вбік", en: "Table — scroll sideways", ru: "Таблица — листайте вбок" } as const)[lang]} className="mt-8 overflow-x-auto rounded-2xl border border-line">
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
            <pre tabIndex={0} role="region" aria-label={({ uk: "Код — гортайте вбік", en: "Code — scroll sideways", ru: "Код — листайте вбок" } as const)[lang]} className="mt-6 overflow-x-auto rounded-2xl border border-line bg-white/[0.02] p-4 font-mono text-xs text-ink-2">{`curl ${base}/api/funding.json`}</pre>
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
