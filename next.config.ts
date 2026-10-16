import type { NextConfig } from "next";
const config: NextConfig = {
  images: { formats: ["image/avif", "image/webp"], qualities: [75, 90] },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(self)" },
        ],
      },
      {
        source: "/admin/:path*",
        headers: [{ key: "Referrer-Policy", value: "no-referrer" }],
      },
    ];
  },
};
export default config;
