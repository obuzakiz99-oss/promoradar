"use client";
import { useEffect, useRef, useState } from "react";
import type { Venue } from "@/lib/types";

/** Logo through our own cached proxy; the brand-coloured monogram shows until the image has actually loaded. */
export function VenueLogo({ v, size = 36, rounded = "rounded-xl" }: { v: Pick<Venue, "name" | "logo" | "color" | "ink" | "monogram">; size?: number; rounded?: string }) {
  const [state, setState] = useState<"loading" | "ok" | "fail">("loading");
  const ref = useRef<HTMLImageElement>(null);
  // the image may finish (or fail) before hydration attaches the handlers
  useEffect(() => {
    const i = ref.current;
    if (i?.complete) setState(i.naturalWidth > 0 ? "ok" : "fail");
  }, []);
  const src = v.logo || undefined; // direct CDN logo (works on static hosting too)
  return (
    <span
      className={`relative grid shrink-0 place-items-center overflow-hidden font-display font-bold ring-1 ring-white/10 ${rounded}`}
      style={{ width: size, height: size, background: v.color, color: v.ink, fontSize: Math.max(12, size * 0.32) }}
      aria-hidden="true"
    >
      {v.monogram}
      {src && state !== "fail" && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          ref={ref}
          src={src}
          alt=""
          width={size}
          height={size}
          decoding="async"
          onLoad={() => setState("ok")}
          onError={() => setState("fail")}
          className={`absolute inset-0 size-full bg-white object-cover transition-opacity duration-300 ${state === "ok" ? "opacity-100" : "opacity-0"}`}
        />
      )}
    </span>
  );
}
