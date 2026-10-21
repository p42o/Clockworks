import type { Metadata } from "next";
import { Link } from "next-view-transitions";

export const metadata: Metadata = {
  title: "Terms",
  description: "Terms for MN Clockworks, a business of PGS Ventures LLC.",
};

export default function Terms() {
  return (
    <section className="mx-auto max-w-6xl px-5 pb-24 pt-36 sm:px-8">
      <h1 className="display text-5xl sm:text-7xl">Terms</h1>
      <div className="mt-8 max-w-xl space-y-5 text-[1.05rem] leading-relaxed text-ink-soft">
        <p>
          Nothing on this site is a quote or a contract. All work is confirmed in writing before anything starts.
        </p>
        <p>
          Current offers: a free 15-minute phone audit, an online presence assessment for $50, and a one-time deployment for $500. Optional ongoing maintenance is available, and Parker will walk you through the options and pricing.
        </p>
        <p>After setup, your AI team runs on your own platform accounts.</p>
        <p>
          Questions: email <a href="mailto:pgsventuresllc@gmail.com" className="text-copper underline underline-offset-2">pgsventuresllc@gmail.com</a> or use the <Link href="/book/" className="text-copper underline underline-offset-2">book form</Link>. Maple Grove, MN. PGS Ventures LLC.
        </p>
      </div>
    </section>
  );
}
