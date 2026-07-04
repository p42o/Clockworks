import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Link } from "next-view-transitions";
import AuditCTA from "@/components/AuditCTA";
import { getPost, getPublishedPosts } from "@/lib/blog";
import { site } from "@/lib/site";

export const dynamicParams = false;

export function generateStaticParams() {
  return getPublishedPosts().map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const post = getPost(slug);
  if (!post) return {};
  return {
    title: post.title,
    description: post.description,
    openGraph: { title: post.title, description: post.description, type: "article" },
  };
}

const fmt = (d: string) =>
  new Date(d + "T12:00:00").toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });

export default async function BlogPost({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const post = getPost(slug);
  if (!post) notFound();

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: post.title,
    datePublished: post.date,
    author: { "@type": "Person", name: site.owner },
    publisher: { "@type": "Organization", name: site.name },
    description: post.description,
    url: `${site.url}/blog/${post.slug}/`,
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <article className="mx-auto max-w-3xl px-5 pb-20 pt-36 sm:px-8">
        <p className="eyebrow">
          <Link href="/blog/" className="hover:text-copper">Field notes</Link> · {fmt(post.date)} ·{" "}
          ~{Math.max(1, Math.round(post.words / 220))} min
        </p>
        <h1 className="display mt-4 text-4xl leading-[1.05] sm:text-6xl">{post.title}</h1>
        <div className="prose-cw mt-10" dangerouslySetInnerHTML={{ __html: post.html }} />
        <div className="mt-12 flex items-center gap-4 border-t hairline pt-6">
          <p className="text-sm text-ink-faint">
            — Parker · MN Clockworks, {site.city}, MN
          </p>
          <Link href="/blog/" className="link-draw ml-auto text-sm text-ink-soft">
            ← All notes
          </Link>
        </div>
      </article>
      <AuditCTA />
    </>
  );
}
