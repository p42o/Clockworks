import type { Metadata } from "next";
import { Link } from "next-view-transitions";
import { getListedPosts } from "@/lib/blog";
import { phone } from "@/lib/copy";
import { pageSocial } from "@/lib/site";

const title = "Blog";
const description =
  "Notes from Parker at MN Clockworks in Maple Grove on putting AI to work in a small business: messages, quotes and paperwork.";

// Indexable since 2026-10-23 (Parker's page rule). Lists only posts that are dated today or
// earlier (UTC), not held and not unlisted, the same set the sitemap uses.
export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: "/blog/" },
  ...pageSocial(title, description, "/blog/"),
};

const fmt = (d: string) =>
  new Date(d + "T12:00:00").toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });

export default function BlogIndex() {
  const posts = getListedPosts();
  return (
    <section className="mx-auto max-w-6xl px-5 pb-24 pt-36 sm:px-8">
      <p className="eyebrow">Blog</p>
      <h1 className="display mt-4 text-5xl sm:text-7xl">Notes from the shop.</h1>
      <p className="mt-6 max-w-xl text-lg leading-relaxed text-ink-soft">
        Notes on putting AI to work in a small business, from Parker in Maple Grove.
      </p>
      {posts.length > 0 ? (
        <ul className="mt-12 max-w-3xl divide-y hairline-soft border-y hairline-soft">
          {posts.map((post) => (
            <li key={post.slug} className="py-6">
              <p className="font-mono text-[0.75rem] tracking-[0.12em] text-ink-faint">{fmt(post.date)}</p>
              <h2 className="mt-2 text-2xl font-medium">
                <Link href={`/blog/${post.slug}/`} className="link-draw">
                  {post.title}
                </Link>
              </h2>
              <p className="mt-2 text-ink-soft">{post.description}</p>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-12 max-w-xl text-ink-soft">The next note is on its way.</p>
      )}
      <p className="mt-10">
        <a href={phone.tel} className="font-medium text-ink underline decoration-copper underline-offset-4">
          Call {phone.display}
        </a>
      </p>
    </section>
  );
}
