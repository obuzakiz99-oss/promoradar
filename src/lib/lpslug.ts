/** URL slug of a Launchpool project's own explanation page /[lang]/lp/<slug>/ (stable for the project's lifetime). Client-safe. */
export const lpSlug = (p: { id: string }) => p.id.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
