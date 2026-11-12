/**
 * One small line-icon set for headings, fact labels and status lines (audit 08.11: SVG instead of emoji on the
 * trust pages — emoji render differently on every OS and read as "not serious"). 24×24 grid, 1.75 stroke, currentColor.
 */
const P: Record<IconName, string> = {
  alert: "M12 3 2.5 20h19L12 3Zm0 6v5m0 3h.01",
  check: "M20 6 9 17l-5-5",
  checkCircle: "M22 11.1V12a10 10 0 1 1-5.9-9.1M22 4 12 14l-3-3",
  help: "M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20Zm-2.9-13a3 3 0 0 1 5.8 1c0 2-3 3-3 3m.1 4h.01",
  shield: "M12 3 4.5 6v5.5c0 4.6 3.2 8.4 7.5 9.5 4.3-1.1 7.5-4.9 7.5-9.5V6L12 3Z",
  shieldAlert: "M12 3 4.5 6v5.5c0 4.6 3.2 8.4 7.5 9.5 4.3-1.1 7.5-4.9 7.5-9.5V6L12 3Zm0 5v5m0 3h.01",
  gift: "M20 12v9H4v-9M2 7h20v5H2zM12 21V7m0 0H7.5a2.5 2.5 0 1 1 0-5C11 2 12 7 12 7Zm0 0h4.5a2.5 2.5 0 1 0 0-5C13 2 12 7 12 7Z",
  clock: "M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20Zm0-14v4l3 2",
  hourglass: "M6 2h12M6 22h12M7 2v4a5 5 0 0 0 10 0V2M7 22v-4a5 5 0 0 1 10 0v4",
  globe: "M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20ZM2 12h20M12 2a15 15 0 0 1 0 20 15 15 0 0 1 0-20Z",
  calendar: "M8 2v4m8-4v4M3 10h18M5 4h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2Z",
  user: "M20 21a8 8 0 0 0-16 0M12 13a5 5 0 1 0 0-10 5 5 0 0 0 0 10Z",
  cash: "M2 6h20v12H2zM12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM6 12h.01M18 12h.01",
  id: "M3 5h18v14H3zM8 13a2 2 0 1 0 0-4 2 2 0 0 0 0 4Zm-3 4a3 3 0 0 1 6 0m3-8h4m-4 4h4",
  flame: "M12 22c4 0 7-2.7 7-7 0-4-3-6.5-4-9-1 2.5-2.5 3.5-4 4 0-2-1-4-3-6-.5 3-4 5.5-4 10 0 4.3 3.5 8 8 8Z",
  coins: "M9 14a6 6 0 1 0 0-12 6 6 0 0 0 0 12Zm9.1-3.6a6 6 0 1 1-7.7 7.7M7 6h2v4",
  bulb: "M9 18h6m-5 4h4M12 2a7 7 0 0 0-4 12.7V17h8v-2.3A7 7 0 0 0 12 2Z",
  inbox: "M22 12h-6l-2 3h-4l-2-3H2M5.5 5h13L22 12v6a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2v-6l3.5-7Z",
  pin: "M12 17v5M9 3h6l-1 6 4 4H6l4-4-1-6Z",
  scroll: "M8 21h11a2 2 0 0 0 2-2v-2H10v2a2 2 0 1 1-4 0V5a2 2 0 0 0-2-2h12a2 2 0 0 1 2 2v12M4 3a2 2 0 0 0-2 2v2h4",
  flag: "M4 22V4m0 0s1-1 4-1 5 2 8 2 4-1 4-1v10s-1 1-4 1-5-2-8-2-4 1-4 1",
  target: "M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20Zm0-4a6 6 0 1 0 0-12 6 6 0 0 0 0 12Zm0-4a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z",
  star: "m12 2.5 2.9 6 6.6.9-4.8 4.6 1.2 6.5L12 17.4l-5.9 3.1 1.2-6.5L2.5 9.4l6.6-.9L12 2.5Z",
  trend: "m22 7-8.5 8.5-5-5L2 17M16 7h6v6",
  chart: "M3 3v18h18M7 16v-4m5 4V8m5 8v-6",
  search: "M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16Zm10 2-4.3-4.3",
  sprout: "M12 22V12m0 0C12 7 8 4 3 4c0 5 4 8 9 8Zm0 0c0-4 3-7 8-7 0 4-3 7-8 7Z",
  compass: "M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20Zm4.2-14.2-2.1 6.3-6.3 2.1 2.1-6.3 6.3-2.1Z",
  book: "M4 19.5A2.5 2.5 0 0 1 6.5 17H20V2H6.5A2.5 2.5 0 0 0 4 4.5v15ZM4 19.5A2.5 2.5 0 0 0 6.5 22H20v-5",
  unlock: "M5 11h14v11H5zM8 11V7a4 4 0 0 1 7.8-1.2",
  rocket: "M4.5 16.5c-1.5 1.3-2 5-2 5s3.7-.5 5-2c.7-.8.7-2.1-.1-2.9a2.2 2.2 0 0 0-2.9-.1ZM12 15l-3-3a22 22 0 0 1 2-4 13 13 0 0 1 11-6c0 2.7-.8 7.5-6 11a22 22 0 0 1-4 2Zm-3-3H4s.6-3 2-4c1.6-1.1 5 0 5 0m1 7v5s3-.6 4-2c1.1-1.6 0-5 0-5",
  bank: "M3 22h18M5 18v-7m4 7v-7m6 7v-7m4 7v-7M12 2 3 7h18l-9-5Z",
  layers: "m12 2 10 5-10 5L2 7l10-5Zm-10 10 10 5 10-5M2 17l10 5 10-5",
  parachute: "M22 12a10 10 0 0 0-20 0Zm-20 0 10 9 10-9m-10 9V12m-5 0c0-4 2.2-8 5-10m5 10c0-4-2.2-8-5-10",
  wallet: "M19 7V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-3m0-8H15a3 3 0 0 0 0 6h6V8Z",
  graduation: "M22 10 12 5 2 10l10 5 10-5Zm-16 2v5c3 2.7 9 2.7 12 0v-5",
  ticket: "M3 7a2 2 0 0 0 2-2h14a2 2 0 0 0 2 2v3a2 2 0 0 0 0 4v3a2 2 0 0 0-2 2H5a2 2 0 0 0-2-2v-3a2 2 0 0 0 0-4V7Zm10-2v2m0 4v2m0 4v2",
  tag: "M12.6 2.6A2 2 0 0 0 11.2 2H4a2 2 0 0 0-2 2v7.2a2 2 0 0 0 .6 1.4l8.7 8.7a2.4 2.4 0 0 0 3.4 0l6.6-6.6a2.4 2.4 0 0 0 0-3.4l-8.7-8.7ZM7.5 8a.5.5 0 1 0 0-1 .5.5 0 0 0 0 1Z",
  box: "M21 8 12 3 3 8v8l9 5 9-5V8Zm-18 0 9 5 9-5m-9 5v8",
  camera: "M14.5 4h-5L7.5 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3.5l-2-3ZM12 17a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z",
};
export type IconName =
  | "alert" | "check" | "checkCircle" | "help" | "shield" | "shieldAlert" | "gift" | "clock" | "hourglass" | "globe" | "calendar"
  | "user" | "cash" | "id" | "flame" | "coins" | "bulb" | "inbox" | "pin" | "scroll" | "flag"
  | "target" | "star" | "trend" | "chart" | "search" | "sprout" | "compass" | "book" | "unlock" | "rocket" | "bank" | "layers"
  | "parachute" | "wallet" | "graduation" | "ticket" | "tag" | "box" | "camera";

export function Icon({ name, className = "size-[1.1em]", label }: { name: IconName; className?: string; label?: string }) {
  return (
    <svg className={`inline-block shrink-0 align-[-0.15em] ${className}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75"
      strokeLinecap="round" strokeLinejoin="round" role={label ? "img" : undefined} aria-label={label} aria-hidden={label ? undefined : true}>
      <path d={P[name]} />
    </svg>
  );
}
