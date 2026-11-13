import { withBase } from "./base";

/**
 * Self-hosted variable fonts (owner 13.11: text "jumped" while pages opened). Before: fontsource CSS with
 * font-display: swap, so the page painted in a system font and re-flowed when Unbounded / Manrope arrived.
 * Now the Latin + Cyrillic files are preloaded from the page head and use font-display: optional — the browser
 * either has the font for the first paint or keeps the fallback for that page view; it never swaps mid-read.
 */
const CYR = "U+0301,U+0400-045F,U+0490-0491,U+04B0-04B1,U+2116";
const LAT = "U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+0304,U+0308,U+0329,U+2000-206F,U+20AC,U+2122,U+2191,U+2193,U+2212,U+2215,U+FEFF,U+FFFD";
const FAMILIES: Array<[string, string, string]> = [
  ["Unbounded Variable", "unbounded", "200 900"],
  ["Manrope Variable", "manrope", "200 800"],
  ["JetBrains Mono Variable", "jetbrains-mono", "100 800"],
];
export const fontFile = (file: string, subset: "latin" | "cyrillic") => withBase(`/fonts/${file}-${subset}-wght-normal.woff2`);

export const FONT_CSS = FAMILIES.flatMap(([family, file, weight]) => (["cyrillic", "latin"] as const).map((sub) =>
  `@font-face{font-family:'${family}';font-style:normal;font-display:optional;font-weight:${weight};src:url(${fontFile(file, sub)}) format('woff2-variations'),url(${fontFile(file, sub)}) format('woff2');unicode-range:${sub === "cyrillic" ? CYR : LAT}}`,
)).join("");

/** The text and headings everyone sees first; the mono face is small and loads on demand. */
export const fontPreloads = (lang: string) => {
  const subs: Array<"latin" | "cyrillic"> = lang === "en" ? ["latin"] : ["cyrillic", "latin"];
  return ["manrope", "unbounded"].flatMap((f) => subs.map((s) => fontFile(f, s)));
};
