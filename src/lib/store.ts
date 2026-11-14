import fs from "node:fs";

/**
 * JSON caches on the `data` branch (translations, rules, FAQ, value facts) are read and written by several build
 * worker processes at once. Incident 14.11: one worker read translations.json while another was rewriting it, got a
 * partial file, treated it as "no translations" and saved an empty store over 4,554 entries.
 *  - writes are atomic (temp file + rename), so a reader never sees half a file;
 *  - a store that exists but can't be parsed is never saved over (`ok: false`).
 */
export function readStore<T>(file: string, empty: T): { data: T; ok: boolean } {
  if (!fs.existsSync(file)) return { data: empty, ok: true };
  for (let i = 0; i < 3; i++) {
    try { return { data: JSON.parse(fs.readFileSync(file, "utf8")) as T, ok: true }; } catch { /* a writer may be mid-rename — retry */ }
  }
  console.warn(`[store] ${file} exists but could not be read — it will not be overwritten this build`);
  return { data: empty, ok: false };
}

export function writeStore(file: string, data: unknown, ok: boolean): void {
  if (!ok) return;
  try {
    const dir = file.slice(0, file.lastIndexOf("/"));
    if (!fs.existsSync(dir)) return;
    const tmp = `${file}.${process.pid}.tmp`;
    fs.writeFileSync(tmp, JSON.stringify(data));
    fs.renameSync(tmp, file);
  } catch { /* read-only checkout */ }
}
