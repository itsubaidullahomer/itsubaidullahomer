import type { MetadataRoute } from "next";
import { projects } from "@/content/projects";
import { posts } from "@/content/posts";
import { site } from "@/content/site";
export default function sitemap(): MetadataRoute.Sitemap {
  return [
    ...[
      "",
      "/work",
      "/about",
      "/contact",
      "/freelance",
      "/playground",
      "/now",
      "/writing",
    ].map((path) => ({
      url: site.url + path,
      changeFrequency: "monthly" as const,
      priority: path ? 0.7 : 1,
    })),
    ...projects.map((p) => ({
      url: `${site.url}/work/${p.slug}`,
      changeFrequency: "monthly" as const,
      priority: 0.8,
    })),
    ...posts.map((p) => ({
      url: `${site.url}/writing/${p.slug}`,
      lastModified: p.date,
      changeFrequency: "yearly" as const,
      priority: 0.6,
    })),
  ];
}
