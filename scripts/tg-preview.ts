/** Dev check: which recent Telegram posts the parser would list (run: npx tsx scripts/tg-preview.ts [days]). */
import { TELEGRAM } from "@/config/site";
import { parsePage } from "@/lib/sources/telegram";

const days = Number(process.argv[2] ?? 3);
(async () => {
  for (const { venue, channel } of TELEGRAM) {
    try {
      const html = await (await fetch(`https://t.me/s/${channel}`, { headers: { "User-Agent": "Mozilla/5.0" } })).text();
      const { promos } = parsePage(html, venue, channel);
      for (const p of promos.filter((x) => Date.now() - x.publishedAt < days * 86400_000))
        console.log(`${channel.padEnd(30)} ${new Date(p.publishedAt).toISOString().slice(5, 16)}  ${p.title}`);
    } catch (e) { console.log(channel, "ERR", String(e).slice(0, 80)); }
  }
})();
