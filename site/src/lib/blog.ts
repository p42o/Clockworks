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
  description: string;
  tags: string[];
  legacyPath?: string;
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
        description: String(data.description ?? ""),
        tags: Array.isArray(data.tags) ? data.tags.map(String) : [],
        legacyPath: data.legacyPath ? String(data.legacyPath) : undefined,
        html: marked.parse(content, { async: false }) as string,
        words: content.split(/\s+/).length,
      };
    })
    .sort((a, b) => (a.date < b.date ? 1 : -1));
  cache = posts;
  return posts;
}

const today = () => new Date().toISOString().slice(0, 10);

/** Published = dated today or earlier at build time. */
export function getPublishedPosts(): Post[] {
  const t = today();
  return loadAll().filter((p) => p.date <= t);
}

export function getPost(slug: string): Post | undefined {
  return getPublishedPosts().find((p) => p.slug === slug);
}

/** For the admin manifest: what's queued, without leaking full content. */
export function getScheduleSummary() {
  const t = today();
  const future = loadAll()
    .filter((p) => p.date > t)
    .sort((a, b) => (a.date > b.date ? 1 : -1));
  return {
    publishedCount: getPublishedPosts().length,
    scheduled: future.map((p) => ({ date: p.date, title: p.title })),
  };
}
