/**
 * Page tours (components/SiteTour.tsx). One file per page in this folder, a plain module so server pages can pass the
 * steps of their own language to the client tour (the other pages' texts never reach the browser).
 *
 *  sel     — the `data-tour="…"` value of the element to highlight; no sel = a centred card (intro / outro).
 *            A step whose element is missing or invisible (empty table, phone-only/desktop-only block) is skipped.
 *  title   — 2–5 words.
 *  text    — 1–3 short sentences: what this thing is and what the user does with it.
 *  points  — optional list, «Term — what it means» (bold before the dash); for table columns, chips, buttons.
 *            Keep a step to ≈ 6 points and ≈ 450 characters in total: the card must fit a phone screen.
 */
export type TL = "uk" | "en" | "ru";
export type TourStep = { sel?: string; title: string; text: string; points?: string[] };
export type Tour = { id: string; name: Record<TL, string>; steps: Record<TL, TourStep[]> };

/** What a server page passes to <SiteTour>. */
export const tourOf = (t: Tour, lang: TL) => ({ id: t.id, name: t.name[lang], steps: t.steps[lang] });
