import type { Metadata } from "next";
import { Link } from "next-view-transitions";
import Reveal from "@/components/Reveal";
import AuditCTA from "@/components/AuditCTA";
import { getPublishedPosts } from "@/lib/blog";

export const metadata: Metadata = {
  title: "Field notes",
  description:
    "Plain-English notes on AI for small business and the trades — missed calls, follow-up, paperwork, and what's actually worth automating. From Maple Grove, MN.",
};

const fmt = (d: string) =>
  new Date(d + "T12:00:00").toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });

export default function BlogIndex() {
  const posts = getPublishedPosts();
  const [latest, ...rest] = posts;

  return (
    <>
      <section className="mx-auto max-w-6xl px-5 pb-12 pt-36 sm:px-8">
        <Reveal>
          <p className="eyebrow">Field notes · one a month, no fluff</p>
          <h1 className="display mt-4 max-w-3xl text-5xl sm:text-7xl">
            Notes from the bench<span className="text-copper">.</span>
          </h1>
          <p className="mt-6 max-w-xl text-[1.05rem] leading-relaxed text-ink-soft">
            Plain-English writing about AI for real businesses — what works, what&rsquo;s hype,
            and what it costs. No jargon, no doom, no &ldquo;in today&rsquo;s fast-paced
            world.&rdquo;
          </p>
        </Reveal>
      </section>

      <section className="mx-auto max-w-6xl px-5 pb-20 sm:px-8">
        {latest && (
          <Reveal>
            <Link
              href={`/blog/${latest.slug}/`}
              className="group block rounded-[4px] border-2 border-copper/50 bg-cream-bright/70 p-7 transition-all hover:border-copper sm:p-10"
            >
              <p className="font-mono text-[0.68rem] tracking-[0.18em] text-copper">
                LATEST — {fmt(latest.date).toUpperCase()}
              </p>
              <h2 className="display mt-3 max-w-2xl text-3xl leading-tight group-hover:text-copper sm:text-5xl">
                {latest.title}
              </h2>
              <p className="mt-4 max-w-2xl leading-relaxed text-ink-soft">{latest.description}</p>
              <p className="mt-5 font-mono text-[0.72rem] text-ink-faint">
                ~{Math.max(1, Math.round(latest.words / 220))} min read →
              </p>
            </Link>
          </Reveal>
        )}

        <div className="mt-8 grid gap-px overflow-hidden rounded-[4px] border hairline bg-line sm:grid-cols-2 lg:grid-cols-3">
          {rest.map((p, i) => (
            <Reveal key={p.slug} delay={Math.min(i * 0.03, 0.15)} className="h-full">
              <Link
                href={`/blog/${p.slug}/`}
                className="flex h-full flex-col bg-paper p-6 transition-colors duration-300 hover:bg-cream-bright"
              >
                <p className="font-mono text-[0.65rem] tracking-wider text-ink-faint">{fmt(p.date)}</p>
                <h3 className="display mt-2 text-xl leading-snug">{p.title}</h3>
                <p className="mt-2 line-clamp-3 flex-1 text-[0.85rem] leading-relaxed text-ink-soft">
                  {p.description}
                </p>
                <p className="mt-4 font-mono text-[0.68rem] text-copper">Read →</p>
              </Link>
            </Reveal>
          ))}
        </div>
      </section>

      <AuditCTA
        title="Reading is free. So is the audit."
        context="If a post made you wonder whether this stuff would work in your shop, that's exactly what the 30-minute audit answers — with your numbers."
      />
    </>
  );
}
