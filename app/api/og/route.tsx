import { ImageResponse } from "next/og";
import { studio } from "@/content/studio";

export const runtime = "nodejs";

/** The share image: the headline on white, with the gold dot. */
export async function GET() {
  return new ImageResponse(
    (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          width: "100%",
          height: "100%",
          padding: "70px 80px",
          background: "#ffffff",
          color: "#121110",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 14, fontSize: 26, color: "#6d685f" }}>
          <div style={{ width: 14, height: 14, borderRadius: 14, background: "#c8922a" }} />
          Web design · SEO · Social media · Ads
        </div>
        <div style={{ display: "flex", flexDirection: "column", fontSize: 92, fontWeight: 700, lineHeight: 1.05, letterSpacing: -4 }}>
          <span>Your next customer</span>
          <span>
            is <span style={{ color: "#94640f", marginLeft: 22, marginRight: 22 }}>searching</span> right now.
          </span>
        </div>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            paddingTop: 28,
            borderTop: "2px solid #e8e5df",
            fontSize: 28,
            color: "#6d685f",
          }}
        >
          <span style={{ color: "#121110", fontWeight: 600 }}>{studio.name}</span>
          <span>{new URL(studio.url).host}</span>
        </div>
      </div>
    ),
    { width: 1200, height: 630 },
  );
}
