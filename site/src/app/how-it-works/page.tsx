import type { Metadata } from "next";
import HowTimeline from "@/components/v2/HowTimeline";
import PricingBlock from "@/components/v2/PricingBlock";
import FaqList from "@/components/v2/FaqList";
import FinalBand from "@/components/v2/FinalBand";
import { faqJsonLd, phone, primaryCta } from "@/lib/copy";
import { pageSocial } from "@/lib/site";

const title = "How it works";
const description =
  "A free 30-minute phone audit, a $499 package (scan, intake, deploy, 30 days of support), and a $99/mo Shop Pass after your first 30 days, which starts only after you accept its own written terms.";

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: "/how-it-works/" },
  ...pageSocial(title, description, "/how-it-works/"),
};

export default function HowItWorks() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd()) }} />
      <section className="mx-auto max-w-6xl px-5 pb-8 pt-36 sm:px-8">
        <p className="eyebrow section-rule">The steps</p>
        <h1 className="display mt-4 max-w-3xl text-5xl sm:text-7xl">Here is exactly how it goes.</h1>
        <p className="mt-6 max-w-2xl text-lg leading-relaxed text-ink-soft">
          A free call, the $499 package, then Shop Pass at $99/mo if you want ongoing help, which starts only after you accept its own written terms.
        </p>
        <a
          href={phone.tel}
          className="btn-press mt-8 inline-flex min-h-11 items-center rounded-[3px] bg-copper-deep px-5 py-3 font-medium text-cream-bright hover:bg-ink"
        >
          {primaryCta}
        </a>
      </section>
      <section className="mx-auto max-w-6xl px-5 py-12 sm:px-8" id="how">
        <h2 className="display mb-8 max-w-3xl text-4xl sm:text-5xl">The steps, in order.</h2>
        <HowTimeline />
      </section>
      <section className="border-t hairline bg-paper-deep" id="pricing">
        <div className="mx-auto max-w-6xl px-5 py-16 sm:px-8">
          <h2 className="display text-4xl sm:text-6xl">Plain prices. Three of them.</h2>
          <div className="mt-10">
            <PricingBlock />
          </div>
        </div>
      </section>
      <section className="mx-auto max-w-6xl px-5 py-16 sm:px-8" id="faq">
        <h2 className="display text-4xl sm:text-6xl">Straight answers.</h2>
        <div className="mt-10">
          <FaqList />
        </div>
      </section>
      <FinalBand />
    </>
  );
}
