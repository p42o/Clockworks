import type { MetadataRoute } from "next";
import { getListedPosts } from "@/lib/blog";
import { site } from "@/lib/site";

export const dynamic = "force-static";

/** /results/ stays out (noindex Moved page, 301 in .htaccess) until Parker taps (Counsel ruling 1).
 * /blog/ is indexable (2026-10-23). Posts join only when listed: dated today or earlier (UTC), not held, not unlisted.
 * The posts pulled 2026-10-21 stay unlisted and noindex until Sprocket relists them. */
const staticDates: Record<string, string> = {
  "": "2026-10-30",
  "what-i-do/": "2026-10-30",
  "your-own-agent/": "2026-10-30",
  "how-it-works/": "2026-10-30",
  "about/": "2026-10-30",
  "contact/": "2026-10-30",
  "book/": "2026-10-30",
  "terms/": "2026-10-30",
  "blog/": "2026-10-30",
  "grok/": "2026-10-30",
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
      lastModified: "2026-10-30",
      priority: 0.6,
    })),
  ];
}
