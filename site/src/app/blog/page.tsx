import type { Metadata } from "next";
import { phone } from "@/lib/copy";

export const metadata: Metadata = {
  title: "Archive",
  description: "Older notes from MN Clockworks. This archive is not listed.",
  robots: { index: false, follow: true },
  alternates: { canonical: "/blog/" },
};

export default function BlogIndex() {
  return (
    <section className="mx-auto max-w-6xl px-5 pb-24 pt-36 sm:px-8">
      <p className="eyebrow">Archive</p>
      <h1 className="display mt-4 text-5xl sm:text-7xl">Notes, set aside.</h1>
      <p className="mt-6 max-w-xl text-lg leading-relaxed text-ink-soft">
        Older writing stays on its own addresses. It is not part of the current site, and this page does not list it.
      </p>
      <p className="mt-6">
        <a href={phone.tel} className="font-medium text-ink underline decoration-copper underline-offset-4">
          Call {phone.display}
        </a>
      </p>
    </section>
  );
}
