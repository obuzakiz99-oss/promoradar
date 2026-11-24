/**
 * JSON for an inline <script type="application/ld+json">. Promo titles and FAQ texts come from exchanges' posts:
 * a "</script><script>…" inside one would close the tag and run as code (security audit 25.11), so every "<" is escaped.
 */
export const ldJson = (data: unknown): string => JSON.stringify(data).replace(/</g, "\\u003c");
