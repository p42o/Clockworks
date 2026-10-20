import type { MetadataRoute } from "next";
import { site } from "@/lib/site";
import { getListedPosts } from "@/lib/blog";

export const dynamic = "force-static";

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  const pages = [
    "",
    "how-it-works/",
    "about/",
    "book/",
    "blog/",
  ].map((p) => ({
    url: `${site.url}/${p}`,
    lastModified: now,
    changeFrequency: "monthly" as const,
    priority: p === "" ? 1 : 0.8,
  }));
  const posts = getListedPosts().map((p) => ({
    url: `${site.url}/blog/${p.slug}/`,
    lastModified: new Date(p.date + "T12:00:00"),
    changeFrequency: "yearly" as const,
    priority: 0.5,
  }));
  return [...pages, ...posts];
}
