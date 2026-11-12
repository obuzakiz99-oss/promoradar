import { useId } from "react";
export function LogoMark({ size = 28 }: { size?: number }) {
  // unique gradient ids: the mark appears 2–3 times per page (header, footer), and duplicate ids are invalid HTML
  const uid = `lg${useId().replace(/[^a-zA-Z0-9_-]/g, "")}`;
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" aria-hidden="true">
      <circle cx="16" cy="16" r="14.5" stroke={`url(#${uid}a)`} strokeWidth="1.5" opacity=".9" />
      <circle cx="16" cy="16" r="9" stroke="#c8ff3d" strokeOpacity=".35" strokeWidth="1.2" />
      <circle cx="16" cy="16" r="3.5" fill="#c8ff3d" stroke="none" />
      <path d="M16 16 L28.5 9.5 A14 14 0 0 1 30 16 Z" fill={`url(#${uid}b)`} />
      <circle cx="23.5" cy="11.2" r="1.7" fill="#3de0c8" />
      <defs>
        <linearGradient id={`${uid}a`} x1="2" y1="2" x2="30" y2="30"><stop stopColor="#c8ff3d" /><stop offset="1" stopColor="#3de0c8" /></linearGradient>
        <linearGradient id={`${uid}b`} x1="16" y1="16" x2="30" y2="10"><stop stopColor="#c8ff3d" stopOpacity="0" /><stop offset="1" stopColor="#c8ff3d" stopOpacity=".55" /></linearGradient>
      </defs>
    </svg>
  );
}

export function Logo({ name }: { name: string }) {
  return (
    <span className="flex items-center gap-2.5">
      <LogoMark />
      <span className="font-display text-[1.05rem] font-semibold tracking-tight">
        {name.replace(/Radar$/, "")}
        <span className="text-lime">Radar</span>
      </span>
    </span>
  );
}
