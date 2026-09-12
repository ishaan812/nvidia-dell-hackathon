import { ImageResponse } from "next/og";
import { BRAND, LAMP } from "@/lib/brand";

export const alt = BRAND.name;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: BRAND.desk,
          color: BRAND.paper,
          padding: "72px 80px",
        }}
      >
        <svg width="72" height="72" viewBox="0 0 24 24" fill="none">
          <path d={LAMP.shade} fill={BRAND.copper} />
          <rect x="11.2" y="10.8" width="1.6" height="6.85" rx="0.8" fill={BRAND.copper} />
          <path d={LAMP.base} fill={BRAND.copper} />
          <rect x="4.6" y="21.45" width="14.8" height="1.15" rx="0.58" fill={BRAND.paper} opacity="0.55" />
        </svg>
        <div style={{ display: "flex", flexDirection: "column", gap: 20, maxWidth: 820 }}>
          <div
            style={{
              display: "flex",
              fontSize: 84,
              fontFamily: "Georgia, Times New Roman, serif",
              fontWeight: 500,
              letterSpacing: "-0.03em",
              lineHeight: 1,
            }}
          >
            Night Desk
          </div>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              fontSize: 28,
              color: BRAND.mute,
              lineHeight: 1.45,
            }}
          >
            <span>Investment{"\u00A0"}intelligence{"\u00A0"}for{"\u00A0"}a{"\u00A0"}nine-stage{"\u00A0"}deal{"\u00A0"}book,</span>
            <span>on{"\u00A0"}the{"\u00A0"}box.</span>
          </div>
        </div>
      </div>
    ),
    size,
  );
}
