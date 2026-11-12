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
};
export type IconName =
  | "alert" | "check" | "checkCircle" | "help" | "shield" | "shieldAlert" | "gift" | "clock" | "hourglass" | "globe" | "calendar"
  | "user" | "cash" | "id" | "flame" | "coins" | "bulb" | "inbox" | "pin" | "scroll" | "flag";

export function Icon({ name, className = "size-[1.1em]", label }: { name: IconName; className?: string; label?: string }) {
  return (
    <svg className={`inline-block shrink-0 align-[-0.15em] ${className}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75"
      strokeLinecap="round" strokeLinejoin="round" role={label ? "img" : undefined} aria-label={label} aria-hidden={label ? undefined : true}>
      <path d={P[name]} />
    </svg>
  );
}
