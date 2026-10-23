import type { Metadata } from "next";
import { Link } from "next-view-transitions";
import CopyPending from "@/components/CopyPending";
import FinalBand from "@/components/v2/FinalBand";
import { chatCta, ownershipLine, phone } from "@/lib/copy";
import { pageSocial } from "@/lib/site";

const title = "Front Desk";
const description =
  "The Front Desk helps answer customer questions from information you approve. The chat on this site is a working sample. Your team runs on your own account.";

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: "/your-own-agent/" },
  ...pageSocial(title, description, "/your-own-agent/"),
};

export default function YourOwnAgent() {
  return (
    <>
      <section className="mx-auto max-w-6xl px-5 pb-16 pt-36 sm:px-8">
        <p className="eyebrow section-rule">Front Desk</p>
        <h1 className="display mt-4 max-w-3xl text-5xl sm:text-7xl">
          The chat on this page is the product.
        </h1>
        <div className="mt-6 max-w-2xl space-y-4 text-lg leading-relaxed text-ink-soft">
          <p>
            Front Desk helps answer customer questions from information you approve. The bubble on this site is a working sample, trained on MN Clockworks. Yours is trained on your business, on your own account.
          </p>
          <p>{ownershipLine}</p>
          <p>The team drafts. You approve. Nothing goes out until you say so. I set it up with you on a screen-share call.</p>
        </div>
        <div className="mt-8 flex flex-col items-start gap-3 sm:flex-row">
          <button
            type="button"
            data-open-chat
            className="btn-press inline-flex min-h-11 items-center rounded-[3px] bg-ink px-5 py-3 font-medium text-paper hover:bg-copper-deep"
          >
            {chatCta}
          </button>
          <a
            href={phone.tel}
            className="btn-press inline-flex min-h-11 items-center rounded-[3px] border hairline px-5 py-3 font-medium text-ink"
          >
            Call {phone.display}
          </a>
        </div>
        <p className="mt-8">
          <Link href="/what-i-do/" className="link-draw text-ink">
            See the rest of the team
          </Link>
        </p>
      </section>
      <section className="mx-auto max-w-6xl px-5 py-12 sm:px-8">
        <p className="eyebrow section-rule">01 / What Front Desk answers</p>
        <h2 className="display mb-6 mt-4 text-4xl sm:text-5xl">What Front Desk answers</h2>
        {/* COPY PENDING (Sprocket): your-own-agent/what-it-answers */}
        <CopyPending slot="your-own-agent/what-it-answers" note="Kinds of customer questions it handles from information you approve." />
      </section>
      <section className="mx-auto max-w-6xl px-5 py-12 sm:px-8">
        <p className="eyebrow section-rule">02 / You own it</p>
        <h2 className="display mb-6 mt-4 text-4xl sm:text-5xl">You own it</h2>
        <p className="mb-6 max-w-3xl leading-relaxed text-ink-soft">{ownershipLine}</p>
        {/* COPY PENDING (Sprocket): your-own-agent/ownership-detail */}
        <CopyPending slot="your-own-agent/ownership-detail" note="Optional extra detail on accounts and handoff." />
      </section>
      <section className="mx-auto max-w-6xl px-5 py-12 sm:px-8">
        <p className="eyebrow section-rule">03 / How it gets set up</p>
        <h2 className="display mb-6 mt-4 text-4xl sm:text-5xl">How it gets set up</h2>
        {/* COPY PENDING (Sprocket): your-own-agent/setup */}
        <CopyPending slot="your-own-agent/setup" />
      </section>
      <FinalBand />
    </>
  );
}
