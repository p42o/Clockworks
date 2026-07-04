import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Link } from "next-view-transitions";
import AuditCTA from "@/components/AuditCTA";
import AuthorBio from "@/components/AuthorBio";
import { getPost, getPublishedPosts } from "@/lib/blog";
import { asset, site } from "@/lib/site";

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

  const readMin = Math.max(1, Math.round(post.words / 220));
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
      <article className="mx-auto max-w-3xl px-5 pb-4 pt-36 sm:px-8">
        {/* ---- masthead ---- */}
        <header className="mx-auto max-w-2xl text-center">
          <div className="mb-6 flex items-center justify-center gap-3">
            <span className="h-px w-8 bg-line" aria-hidden />
            <Link href="/blog/" className="eyebrow hover:text-copper">
              Field notes
            </Link>
            <span className="h-px w-8 bg-line" aria-hidden />
          </div>
          <h1 className="display text-[2.5rem] leading-[1.04] sm:text-6xl">{post.title}</h1>
          <p className="mx-auto mt-5 max-w-xl font-display text-xl italic leading-snug text-ink-soft sm:text-2xl">
            {post.description}
          </p>
          {/* byline */}
          <div className="mx-auto mt-8 flex w-fit items-center gap-3 border-y hairline-soft py-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={asset("/media/parker.jpg")}
              alt="Parker Swanson"
              width={40}
              height={40}
              className="h-10 w-10 rounded-full object-cover object-[50%_18%]"
            />
            <div className="text-left">
              <p className="text-[0.85rem] font-medium leading-tight">Parker Swanson</p>
              <p className="font-mono text-[0.68rem] tracking-wide text-ink-faint">
                {fmt(post.date)} · {readMin} min read
              </p>
            </div>
          </div>
        </header>

        {/* ---- body ---- */}
        <div
          className="prose-cw prose-article mx-auto mt-12 max-w-[64ch]"
          dangerouslySetInnerHTML={{ __html: post.html }}
        />

        {/* ---- author ---- */}
        <AuthorBio />

        <div className="mx-auto mt-8 max-w-2xl text-center">
          <Link href="/blog/" className="link-draw text-sm text-ink-soft hover:text-ink">
            ← All field notes
          </Link>
        </div>
      </article>
      <AuditCTA />
    </>
  );
}
