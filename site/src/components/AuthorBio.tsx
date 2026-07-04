import { Link } from "next-view-transitions";
import { asset, site } from "@/lib/site";

/** Newspaper-style author bio — circular headshot, byline, short bio, links. */
export default function AuthorBio() {
  return (
    <aside className="mx-auto mt-16 max-w-2xl rounded-[6px] border hairline bg-paper-deep/60 p-6 sm:p-8">
      <div className="flex flex-col items-center gap-5 text-center sm:flex-row sm:items-start sm:text-left">
        <span className="relative shrink-0">
          <span className="absolute -inset-1 rounded-full border border-copper/30" aria-hidden />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={asset("/media/parker.jpg")}
            alt="Parker Swanson"
            width={96}
            height={96}
            className="h-24 w-24 rounded-full object-cover object-[50%_18%] shadow-[0_10px_24px_-12px_rgba(26,25,22,0.5)]"
            loading="lazy"
          />
        </span>
        <div>
          <p className="eyebrow">Written by</p>
          <p className="display mt-1 text-2xl leading-none">Parker Swanson</p>
          <p className="mt-2 max-w-md text-[0.95rem] leading-relaxed text-ink-soft">
            I build practical AI systems for Twin Cities trades businesses from my home in
            {" "}{site.city}, MN. The quiet kind that catch missed calls, chase quotes, and hand
            owners their evenings back. One guy, local, reachable.
          </p>
          <div className="mt-4 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 sm:justify-start">
            <Link
              href="/book/"
              className="inline-flex items-center gap-2 rounded-[3px] bg-ink px-4 py-2 text-[0.85rem] font-medium text-paper transition-colors hover:bg-copper"
            >
              Book a free audit →
            </Link>
            <Link href="/about/" className="link-draw text-[0.85rem] text-ink-soft hover:text-ink">
              More about Parker
            </Link>
          </div>
        </div>
      </div>
    </aside>
  );
}
