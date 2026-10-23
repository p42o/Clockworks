import type { Metadata } from "next";
import { Link } from "next-view-transitions";
import { phone } from "@/lib/copy";
import { pageSocial } from "@/lib/site";

const title = "See how the work gets done";
const description = "This address points at how a Clockworks setup goes. No results, ratings, or client stories are published here.";

export const metadata: Metadata = {
  title,
  description,
  robots: { index: false, follow: true },
  alternates: { canonical: "/how-it-works/" },
  ...pageSocial(title, description, "/how-it-works/"),
};

export default function Results() {
  return (
    <section className="mx-auto max-w-6xl px-5 pb-24 pt-36 sm:px-8">
      <p className="eyebrow">Moved</p>
      <h1 className="display mt-4 max-w-3xl text-5xl sm:text-7xl">See how the work gets done.</h1>
      <p className="mt-6 max-w-xl text-lg leading-relaxed text-ink-soft">
        I don&rsquo;t publish results, ratings, or client stories on this site. The steps are on the how it works page.
      </p>
      <div className="mt-8 flex flex-col items-start gap-3 sm:flex-row">
        <Link
          href="/how-it-works/"
          className="btn-press inline-flex min-h-11 items-center rounded-[3px] bg-ink px-5 py-3 font-medium text-paper hover:bg-copper-deep"
        >
          How it works
        </Link>
        <a href={phone.tel} className="inline-flex min-h-11 items-center font-medium text-ink">
          {phone.display}
        </a>
      </div>
    </section>
  );
}
