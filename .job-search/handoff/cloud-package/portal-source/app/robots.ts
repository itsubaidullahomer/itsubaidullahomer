import type { MetadataRoute } from "next";
import { site } from "@/content/site";
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/api/avatar/", "/admin", "/api/jobs/"],
    },
    sitemap: `${site.url}/sitemap.xml`,
  };
}
