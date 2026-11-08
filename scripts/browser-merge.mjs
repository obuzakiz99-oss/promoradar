// Merge one browser check into src/config/browser-promos.json.
// usage: node scripts/browser-merge.mjs <check.json>
//   check.json = { "venue": "blofin", "checkedAt": <ms>, "items": [{ id, title, url, desc?, startsAt?, endsAt? }] }
// Items keep their firstSeen; lastSeen = this check. Items not seen for 3 days are dropped from the file
// (the site itself hides anything not seen for 26 h, or whose end date has passed).
import fs from "node:fs";

const FILE = "src/config/browser-promos.json";
const check = JSON.parse(fs.readFileSync(process.argv[2], "utf8").replace(/^﻿/, ""));
const db = JSON.parse(fs.readFileSync(FILE, "utf8").replace(/^﻿/, ""));
const now = check.checkedAt || Date.now();
const byId = new Map(db.items.map((i) => [`${i.venue}:${i.id}`, i]));
let added = 0;
for (const it of check.items ?? []) {
  if (!it.id || !it.title || !/^https:\/\//.test(it.url ?? "")) continue;
  const key = `${check.venue}:${it.id}`;
  const old = byId.get(key);
  if (!old) added++;
  byId.set(key, { venue: check.venue, id: String(it.id), title: String(it.title).slice(0, 200), url: it.url, desc: it.desc ? String(it.desc).slice(0, 300) : undefined,
    startsAt: it.startsAt || undefined, endsAt: it.endsAt || undefined, firstSeen: old?.firstSeen ?? now, lastSeen: now });
}
db.items = [...byId.values()].filter((i) => now - i.lastSeen < 3 * 86400_000 && (!i.endsAt || i.endsAt > now - 86400_000));
db.checkedAt = now;
fs.writeFileSync(FILE, JSON.stringify(db, null, 1) + "\n");
console.log(`${check.venue}: ${check.items?.length ?? 0} seen, ${added} new, file has ${db.items.length}`);
