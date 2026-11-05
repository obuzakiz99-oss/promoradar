import { ImageResponse } from "next/og";
import { SITE } from "@/config/site";
import { LOCALES } from "@/lib/i18n";

export const dynamic = "force-static";
export function generateStaticParams() { return LOCALES.map((lang) => ({ lang })); }
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = `${SITE.name} — every exchange & DeFi promo in one place`;

/** Social preview card (Telegram, X, Facebook). Latin-only text: the default OG font has no Cyrillic. */
export default function OG() {
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between", padding: 72, background: "#06080b", color: "#eef2f6", fontFamily: "sans-serif", position: "relative" }}>
        <div style={{ position: "absolute", right: -120, top: -120, width: 620, height: 620, borderRadius: 620, background: "radial-gradient(circle, rgba(200,255,61,0.28), rgba(200,255,61,0) 65%)", display: "flex" }} />
        <div style={{ position: "absolute", right: 90, top: 150, width: 330, height: 330, borderRadius: 330, border: "2px solid rgba(200,255,61,0.55)", display: "flex" }} />
        <div style={{ position: "absolute", right: 165, top: 225, width: 180, height: 180, borderRadius: 180, border: "2px solid rgba(200,255,61,0.3)", display: "flex" }} />
        <div style={{ position: "absolute", right: 246, top: 306, width: 18, height: 18, borderRadius: 18, background: "#c8ff3d", display: "flex" }} />
        <div style={{ display: "flex", alignItems: "center", gap: 16, fontSize: 40, fontWeight: 700 }}>
          <div style={{ width: 22, height: 22, borderRadius: 22, background: "#c8ff3d", display: "flex" }} />
          Promo<span style={{ color: "#c8ff3d" }}>Radar</span>
        </div>
        <div style={{ display: "flex", flexDirection: "column", maxWidth: 760 }}>
          <div style={{ fontSize: 76, fontWeight: 800, lineHeight: 1.05, letterSpacing: -2 }}>Every exchange & DeFi promo</div>
          <div style={{ fontSize: 76, fontWeight: 800, lineHeight: 1.05, letterSpacing: -2, color: "#c8ff3d" }}>in one place</div>
          <div style={{ marginTop: 28, fontSize: 30, color: "#a6b0bd" }}>Airdrops · Launchpools · Competitions · Bonuses · Farming</div>
        </div>
      </div>
    ),
    size,
  );
}
