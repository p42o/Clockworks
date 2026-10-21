import type { Metadata } from "next";
import { Link } from "next-view-transitions";
import { pageSocial } from "@/lib/site";

const title = "Starter Terms";
const description = "Terms for MN Clockworks, a business of PGS Ventures LLC.";

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: "/terms/" },
  ...pageSocial(title, description, "/terms/"),
};

export default function Terms() {
  return (
    <section className="mx-auto max-w-6xl px-5 pb-24 pt-36 sm:px-8">
      <p className="eyebrow">Starter Terms</p>
      <h1 className="display mt-4 text-5xl sm:text-7xl">Terms</h1>
      <div className="mt-8 max-w-xl space-y-5 text-[1.05rem] leading-relaxed text-ink-soft">
        <p>
          Nothing on this site is a quote or a contract. All work is confirmed in writing before anything starts.
        </p>
        <p>
          Current offers: a free 15-minute phone audit, an online presence assessment for $50, and a one-time deployment for $500, done together over screen share. Optional ongoing maintenance is available, and Parker will walk you through the options and pricing.
        </p>
        <p>After setup, your AI team runs on your own platform accounts.</p>
        <p>
          Questions: email <a href="mailto:pgsventuresllc@gmail.com" className="text-copper-deep underline underline-offset-2">pgsventuresllc@gmail.com</a> or use the <Link href="/book/" className="text-copper-deep underline underline-offset-2">book form</Link>. Maple Grove, MN. PGS Ventures LLC.
        </p>
      </div>
    </section>
  );
}
