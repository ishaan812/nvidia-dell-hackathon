import { ImageResponse } from "next/og";
import { BRAND, LAMP } from "@/lib/brand";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: BRAND.desk,
        }}
      >
        <svg width="118" height="118" viewBox="0 0 24 24" fill="none">
          <path d={LAMP.shade} fill={BRAND.copper} />
          <rect x="11.2" y="10.8" width="1.6" height="6.85" rx="0.8" fill={BRAND.copper} />
          <path d={LAMP.base} fill={BRAND.copper} />
          <rect x="4.6" y="21.45" width="14.8" height="1.15" rx="0.58" fill={BRAND.paper} opacity="0.55" />
        </svg>
      </div>
    ),
    size,
  );
}
