import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import matter from "gray-matter";
import { marked } from "marked";

/**
 * File-based blog with build-time publish gating: posts dated in the future
 * exist in the repo but are NOT exported — the monthly-publish GitHub Action
 * rebuilds on the 1st of each month, which is what "auto-publish" means on a
 * static host. No servers, no CMS, no surprises.
 */

export type Post = {
  slug: string;
  title: string;
  date: string; // YYYY-MM-DD
  updated?: string;
  description: string;
  tags: string[];
  legacyPath?: string;
  /** Hidden from the index, sitemap, and manifest. The page can still build. */
  unlisted: boolean;
  /**
   * Never auto-publish. A held post stays out of the build, the index, the
   * sitemap, and the manifest even after its date. The file stays in the repo.
   */
  hold: boolean;
  html: string;
  words: number;
};

const DIR = join(process.cwd(), "content", "blog");

let cache: Post[] | null = null;

function loadAll(): Post[] {
  if (cache) return cache;
  const posts = readdirSync(DIR)
    .filter((f) => f.endsWith(".md"))
    .map((f) => {
      const raw = readFileSync(join(DIR, f), "utf8");
      const { data, content } = matter(raw);
      return {
        slug: f.replace(/\.md$/, ""),
        title: String(data.title ?? f),
        date: String(data.date ?? "1970-01-01"),
        updated: data.updated ? String(data.updated) : undefined,
        description: String(data.description ?? ""),
        tags: Array.isArray(data.tags) ? data.tags.map(String) : [],
        legacyPath: data.legacyPath ? String(data.legacyPath) : undefined,
        hold: data.hold === true,
        unlisted: data.unlisted === true || data.hold === true,
        html: marked.parse(content, { async: false }) as string,
        words: content.split(/\s+/).length,
      };
    })
    .sort((a, b) => (a.date < b.date ? 1 : -1));
  cache = posts;
  return posts;
}

const today = () => new Date().toISOString().slice(0, 10);

/**
 * Dated today or earlier, and not held. Held posts never join this list,
 * so a later monthly rebuild will not start serving them.
 */
export function getPublishedPosts(): Post[] {
  const t = today();
  return loadAll().filter((p) => p.date <= t && !p.hold);
}

/** What the blog index, sitemap, and manifest may show. V2 lists nothing. */
export function getListedPosts(): Post[] {
  return getPublishedPosts().filter((p) => !p.unlisted && !p.hold);
}

export function getPost(slug: string): Post | undefined {
  return getPublishedPosts().find((p) => p.slug === slug);
}

/** For the admin manifest: what's queued, without leaking full content. */
export function getScheduleSummary() {
  const t = today();
  const future = loadAll()
    .filter((p) => p.date > t && !p.hold && !p.unlisted)
    .sort((a, b) => (a.date > b.date ? 1 : -1));
  return {
    publishedCount: getListedPosts().length,
    scheduled: future.map((p) => ({ date: p.date, title: p.title })),
  };
}
