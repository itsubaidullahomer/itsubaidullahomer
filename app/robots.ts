import type { MetadataRoute } from "next";
import { studio } from "@/content/studio";

export default function robots(): MetadataRoute.Robots {
  return {
    // Pages made for one business (/for/…) are private links, not search results.
    rules: { userAgent: "*", allow: "/", disallow: "/for/" },
    sitemap: `${studio.url}/sitemap.xml`,
  };
}
