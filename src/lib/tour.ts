/** Label of the links that (re)start the site tour (components/SiteTour.tsx) — a plain module so server components can use it. */
export const TOUR_LABEL = { uk: "Як користуватися сайтом", en: "How to use the site", ru: "Как пользоваться сайтом" } as const;
/** The tour lives on the home page; `?tour=1` starts it. */
export const tourHref = (base: string, lang: string) => `${base}/${lang}/?tour=1`;
