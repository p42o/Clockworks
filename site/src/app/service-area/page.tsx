import type { Metadata } from "next";
import { Link } from "next-view-transitions";
import { site } from "@/lib/site";

/**
 * SLOT for presence checklist #15 (service-area / towns page).
 * Placeholder only: not in nav, footer or sitemap, and noindex until
 * Sprocket's town copy lands. When it does: replace the body below, drop the
 * robots line, add "service-area/" to src/app/sitemap.ts, and decide on a nav
 * or footer link. Town list must match the GBP prep pack.
 */
export const metadata: Metadata = {
  title: "Service area",
  description: `Where ${site.name} works: ${site.areaServed}.`,
  alternates: { canonical: "/service-area/" },
  robots: { index: false, follow: true },
};

export default function ServiceArea() {
  return (
    <section className="mx-auto max-w-6xl px-5 pb-24 pt-36 sm:px-8">
      <p className="eyebrow">Service area</p>
      <h1 className="display mt-4 max-w-3xl text-5xl sm:text-7xl">
        Where I work<span className="text-copper">.</span>
      </h1>
      <p className="mt-6 max-w-xl text-[1.1rem] leading-relaxed text-ink-soft">
        In person in Maple Grove and the northwest Twin Cities metro, remote elsewhere. Call or text{" "}
        <a href={site.phone.href} className="underline decoration-copper/60 underline-offset-4">{site.phone.display}</a>, or{" "}
        <Link href="/book/" className="underline decoration-copper/60 underline-offset-4">send a message</Link>.
      </p>
    </section>
  );
}
