"use client";
import { useEffect, useState } from "react";

export function useNovice() {
  const [on, setOn] = useState(false);
  useEffect(() => {
    const read = () => setOn(document.documentElement.dataset.novice === "1");
    read();
    window.addEventListener("pr:novice", read);
    return () => window.removeEventListener("pr:novice", read);
  }, []);
  return on;
}

export function setNovice(on: boolean) {
  if (on) document.documentElement.dataset.novice = "1"; else delete document.documentElement.dataset.novice;
  try { localStorage.setItem("pr:novice", on ? "1" : "0"); } catch { /* private mode */ }
  window.dispatchEvent(new Event("pr:novice"));
}

/** Header switch: "Новачок" mode — hides advanced tools, shows explanations. */
export function NoviceToggle({ label, hint }: { label: string; hint: string }) {
  const on = useNovice();
  return (
    <button type="button" role="switch" aria-checked={on} title={hint} onClick={() => setNovice(!on)}
      className={`flex h-9 items-center gap-2 rounded-xl border px-2.5 text-xs font-bold transition ${on ? "border-lime/50 bg-lime/10 text-lime" : "border-line bg-white/[0.02] text-ink-2 hover:text-ink"}`}>
      <span className={`relative h-4 w-7 rounded-full transition ${on ? "bg-lime" : "bg-white/15"}`}>
        <span className={`absolute top-0.5 size-3 rounded-full bg-bg transition-all ${on ? "left-3.5" : "left-0.5"}`} />
      </span>
      {label}
    </button>
  );
}
