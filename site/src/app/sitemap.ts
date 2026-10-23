import type { MetadataRoute } from "next";
import { getListedPosts } from "@/lib/blog";
import { site } from "@/lib/site";

export const dynamic = "force-static";

/** /results/ stays out (noindex Moved page, 301 in .htaccess) until Parker taps (Counsel ruling 1).
 * /blog/ is indexable (2026-10-23). Posts join only when listed: dated today or earlier (UTC), not held, not unlisted.
 * The posts pulled 2026-10-21 stay unlisted and noindex until Sprocket relists them. */
const staticDates: Record<string, string> = {
  "": "2026-10-23",
  "what-i-do/": "2026-10-23",
  "your-own-agent/": "2026-10-23",
  "how-it-works/": "2026-10-23",
  "about/": "2026-10-23",
  "contact/": "2026-10-23",
  "book/": "2026-10-23",
  "terms/": "2026-10-23",
  "blog/": "2026-10-23",
};
const menuPaths = new Set(["what-i-do/", "your-own-agent/", "contact/"]);

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
