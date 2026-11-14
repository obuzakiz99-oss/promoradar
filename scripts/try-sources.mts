// Quick check of individual promo sources: npx tsx scripts/try-sources.mts coinw hotcoin …
import * as cex from "../src/lib/sources/cex";
import { isPromo, cleanTitle } from "../src/lib/parse";

for (const name of process.argv.slice(2)) {
  try {
    const raw = await (cex as any)[name]();
    const fresh = raw.filter((r: any) => Date.now() - r.publishedAt < 30 * 86400_000);
    const kept = fresh.filter((r: any) => r.trusted || isPromo(cleanTitle(r.title)));
    console.log(`${name}: ${raw.length} raw, ${fresh.length} fresh, ${kept.length} promos`);
    for (const r of kept.slice(0, 4)) console.log("   ", new Date(r.publishedAt).toISOString().slice(0, 10), r.title.slice(0, 90), "→", r.url.slice(0, 70));
  } catch (e) { console.log(`${name}: ERROR ${String(e).slice(0, 150)}`); }
}
