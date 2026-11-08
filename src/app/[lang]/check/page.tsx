import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getDict, isLocale } from "@/lib/i18n";
import { TOOLS } from "@/lib/i18n-tools";
import { TELEGRAM, VENUES } from "@/config/site";
import { registrable, type Official } from "@/lib/linkcheck";
import { ToolHeader } from "@/components/ToolsNav";
import { LinkCheck } from "@/components/LinkCheck";
import { Footer } from "@/components/Sections";

type Params = Promise<{ lang: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { lang } = await params;
  if (!isLocale(lang)) return {};
  return { title: TOOLS[lang].tools.check[0], description: TOOLS[lang].tools.check[1] };
}

// older official domains of the same companies (rebrands) — only ones the exchanges themselves still use
const ALIASES: Array<{ domain: string; venue: string }> = [
  { domain: "gate.io", venue: "gate" },
  { domain: "huobi.com", venue: "htx" },
];

/** The official list = every venue site we link to + their official Telegram channels (config/site.ts). */
function officialList(): Official {
  const domains = Object.values(VENUES).map((v) => ({ domain: registrable(new URL(v.site).hostname), venue: v.name }));
  for (const a of ALIASES) if (VENUES[a.venue]) domains.push({ domain: a.domain, venue: VENUES[a.venue].name });
  const telegram = TELEGRAM.filter((t) => VENUES[t.venue]).map((t) => ({ channel: t.channel, venue: VENUES[t.venue].name }));
  const seen = new Set<string>();
  return { domains: domains.filter((d) => !seen.has(d.domain) && seen.add(d.domain)), telegram };
}

export default async function CheckPage({ params }: { params: Params }) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  const t = getDict(lang), T = TOOLS[lang];
  return (
    <>
      <main className="mx-auto max-w-7xl px-4 pb-20 pt-10 sm:px-6">
        <ToolHeader lang={lang} active="check" title={T.tools.check[0]} sub={T.tools.check[1]} />
        <LinkCheck lang={lang} official={officialList()} />
      </main>
      <Footer t={t} fetchedAt={Date.now()} lang={lang} />
    </>
  );
}
