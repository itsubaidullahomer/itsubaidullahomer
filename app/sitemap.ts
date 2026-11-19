import type { MetadataRoute } from "next";
import { studio } from "@/content/studio";

export default function sitemap(): MetadataRoute.Sitemap {
  return [{ url: studio.url, changeFrequency: "monthly", priority: 1 }];
}
