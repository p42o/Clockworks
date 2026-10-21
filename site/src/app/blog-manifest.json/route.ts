import { getListedPosts, getScheduleSummary } from "@/lib/blog";

export const dynamic = "force-static";

/** Read by admin.html so the portal can show what's live + what's queued. */
export function GET() {
  const { publishedCount, scheduled } = getScheduleSummary();
  return Response.json({
    generatedAt: new Date().toISOString(),
    publishedCount,
    published: getListedPosts().map((p) => ({
      slug: p.slug,
      title: p.title,
      date: p.date,
      url: `/blog/${p.slug}/`,
    })),
    scheduled,
    note: "V2 lists no posts. Unlisted and held files stay out of this manifest, including after their dates.",
  });
}
