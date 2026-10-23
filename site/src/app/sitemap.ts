import type { MetadataRoute } from "next";
import { getListedPosts } from "@/lib/blog";
import { site } from "@/lib/site";

export const dynamic = "force-static";

/** /blog/ and its posts are noindex/unlisted (blog pull 2026-10-21), so they stay out until Sprocket relists them. */
const staticDates: Record<string, string> = {
  "": "2026-10-23",
  "what-i-do/": "2026-10-23",
  "results/": "2026-10-23",
  "your-own-agent/": "2026-10-23",
  "how-it-works/": "2026-10-23",
  "about/": "2026-10-23",
  "contact/": "2026-10-23",
  "book/": "2026-10-23",
  "terms/": "2026-10-23",
};
const menuPaths = new Set(["what-i-do/", "results/", "your-own-agent/", "contact/"]);

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    ...Object.entries(staticDates).map(([path, lastModified]) => ({
      url: `${site.url}/${path}`,
      lastModified,
      priority: path === "" ? 1 : menuPaths.has(path) ? 0.8 : 0.6,
    })),
    ...getListedPosts().map((post) => ({
      url: `${site.url}/blog/${post.slug}/`,
      lastModified: post.updated && post.updated > post.date ? post.updated : post.date,
      priority: 0.6,
    })),
  ];
}
