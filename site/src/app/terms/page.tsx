import type { Metadata } from "next";
import { Link } from "next-view-transitions";
import { pageSocial } from "@/lib/site";
import { starterTerms } from "@/lib/legal";

const title = "Starter Terms";
const description = "Terms for MN Clockworks, a business of PGS Ventures LLC.";

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: "/terms/" },
  ...pageSocial(title, description, "/terms/"),
};

export default function Terms() {
  const terms = starterTerms();
  return (
    <section className="mx-auto max-w-6xl px-5 pb-24 pt-36 sm:px-8">
      <p className="eyebrow">Starter Terms</p>
      <h1 className="display mt-4 text-5xl sm:text-7xl">Terms</h1>
      <div className="mt-8 max-w-xl space-y-5 text-[1.05rem] leading-relaxed text-ink-soft">
        <p>
          These are the Starter Terms of PGS Ventures LLC, doing business as MN Clockworks. Current version: {terms.version}. Last updated: {terms.date}.
        </p>
        <p className="flex flex-col gap-2 sm:flex-row sm:gap-6">
          <a href="/portal/client/#/starter-terms" className="text-copper-deep underline underline-offset-2">
            Read the full Starter Terms
          </a>
          <a href="/portal/client/#/privacy-notice" className="text-copper-deep underline underline-offset-2">
            Read the Privacy Notice
          </a>
        </p>
        <p>You accept the Starter Terms in the client portal before any paid work starts.</p>
        <p>Nothing on this site is a quote or a contract. Parker confirms everything in writing.</p>
        <p>
          Current offers: a free 15-minute phone audit, an online presence assessment for $50, and a one-time deployment for $499, done together over screen share. Any other work is agreed separately in writing before it starts.
        </p>
        <p>After setup, your AI team runs on your own platform accounts.</p>
        <p>
          Questions: email <a href="mailto:pgsventuresllc@gmail.com" className="text-copper-deep underline underline-offset-2">pgsventuresllc@gmail.com</a> or use the <Link href="/book/" className="text-copper-deep underline underline-offset-2">book form</Link>. Maple Grove, MN. PGS Ventures LLC.
        </p>
      </div>
    </section>
  );
}
