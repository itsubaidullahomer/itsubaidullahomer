import { ImageResponse } from "next/og";
export const runtime = "nodejs";
export async function GET(request: Request) {
  const title = (
    new URL(request.url).searchParams.get("title") ||
    "I build AI products people actually use."
  ).slice(0, 100);
  return new ImageResponse(
    <div
      style={{
        background: "#fff",
        width: "100%",
        height: "100%",
        display: "flex",
        padding: "65px 80px",
        fontFamily: "sans-serif",
        color: "#171717",
      }}
    >
      <div
        style={{
          borderLeft: "1px solid #dedede",
          borderRight: "1px solid #dedede",
          padding: "20px 45px",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          width: "100%",
        }}
      >
        <div style={{ fontSize: 32, fontWeight: 600, display: "flex" }}>
          ubaid ✳
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 25 }}>
          <div style={{ fontSize: 16, letterSpacing: 3, color: "#666" }}>
            AI PRODUCT ENGINEER
          </div>
          <div
            style={{
              fontSize: 64,
              lineHeight: 1.08,
              letterSpacing: -3,
              maxWidth: 850,
            }}
          >
            {title}
          </div>
        </div>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            fontSize: 17,
            color: "#737373",
            borderTop: "1px solid #ddd",
            paddingTop: 25,
          }}
        >
          <span>Ubaidullah Omer</span>
          <span>itsubaidullahomer.com</span>
        </div>
      </div>
    </div>,
    {
      width: 1200,
      height: 630,
      headers: { "Cache-Control": "public, max-age=86400" },
    },
  );
}
