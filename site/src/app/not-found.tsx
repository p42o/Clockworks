import type { Metadata } from "next";
import { Link } from "next-view-transitions";
import { phone } from "@/lib/copy";
import { pageSocial } from "@/lib/site";

const title = "This page is not here";
const description = "The link may be old. You can go home, or call me.";

export const metadata: Metadata = {
  title,
  description,
  robots: { index: false, follow: true },
  ...pageSocial(title, description, "/"),
};

export default function NotFound() {
  return (
    <section className="mx-auto flex min-h-dvh max-w-6xl flex-col items-start justify-center px-5 sm:px-8">
      <p className="eyebrow">404</p>
      <h1 className="display mt-4 max-w-2xl text-5xl sm:text-7xl">This page is not here.</h1>
      <p className="mt-6 max-w-md text-lg leading-relaxed text-ink-soft">
        The link may be old. You can go home, or call me.
      </p>
      <div className="mt-8 flex flex-col items-start gap-3 sm:flex-row sm:items-center">
        <Link
          href="/"
          className="btn-press inline-flex min-h-11 items-center rounded-[3px] bg-ink px-5 py-3 font-medium text-paper hover:bg-copper-deep"
        >
          Back home
        </Link>
        <a href={phone.tel} className="inline-flex min-h-11 items-center font-medium text-ink underline decoration-copper underline-offset-4">
          {phone.display}
        </a>
      </div>
    </section>
  );
}
