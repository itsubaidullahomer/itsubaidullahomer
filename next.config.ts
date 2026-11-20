import type { NextConfig } from "next";

/** The hiring portfolio that used to live on this domain. Its old addresses still work. */
const ENGINEER = "https://cv.itsubaidullahomer.com";

const config: NextConfig = {
  devIndicators: false,
  experimental: {
    // The stylesheet goes into the page itself, so the first paint does not wait for a second request.
    inlineCss: true,
  },
  images: {
    formats: ["image/avif", "image/webp"],
    qualities: [75, 90],
    // Screenshots are imported, so their addresses change when they do: they can be cached for a long time.
    minimumCacheTTL: 2678400,
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=()" },
        ],
      },
    ];
  },
  async redirects() {
    const moved = ["/work", "/work/:slug*", "/about", "/writing", "/writing/:slug*", "/now", "/playground"];
    return [
      ...moved.map((source) => ({
        source,
        destination: `${ENGINEER}${source}`,
        permanent: false,
      })),
      { source: "/contact", destination: "/#contact", permanent: false },
      { source: "/freelance", destination: "/", permanent: false },
    ];
  },
};
export default config;
