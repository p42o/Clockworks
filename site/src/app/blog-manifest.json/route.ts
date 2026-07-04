import { getPublishedPosts, getScheduleSummary } from "@/lib/blog";

export const dynamic = "force-static";

/** Read by admin.html so the portal can show what's live + what's queued. */
export function GET() {
  const { publishedCount, scheduled } = getScheduleSummary();
  return Response.json({
    generatedAt: new Date().toISOString(),
    publishedCount,
    published: getPublishedPosts().map((p) => ({
      slug: p.slug,
      title: p.title,
      date: p.date,
      url: `/blog/${p.slug}/`,
    })),
    scheduled,
    note: "Posts are files in site/content/blog; future-dated posts auto-publish via the monthly-publish GitHub Action.",
  });
}
