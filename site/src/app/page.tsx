import type { Metadata } from "next";
import { Link } from "next-view-transitions";
import Reveal from "@/components/Reveal";
import AgentOrbit from "@/components/v2/AgentOrbit";
import AgentCards from "@/components/v2/AgentCards";
import JobWalk from "@/components/v2/JobWalk";
import IndustryTabs from "@/components/v2/IndustryTabs";
import HowTimeline from "@/components/v2/HowTimeline";
import PricingBlock from "@/components/v2/PricingBlock";
import FaqList from "@/components/v2/FaqList";
import FinalBand from "@/components/v2/FinalBand";
import { asset } from "@/lib/site";
import {
  chatCta,
  easyPoints,
  faqJsonLd,
  hero,
  ownershipLine,
  phone,
  primaryCta,
  serviceTowns,
} from "@/lib/copy";

export const metadata: Metadata = {
  title: hero.h1,
  description: hero.sub,
  alternates: { canonical: "/" },
  openGraph: {
    title: hero.h1,
    description: hero.sub,
    url: "/",
    images: [{ url: "/og.png", width: 1200, height: 630 }],
  },
  twitter: {
    card: "summary_large_image",
    title: hero.h1,
    description: hero.sub,
    images: ["/og.png"],
  },
};

export default function HomePage() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd()) }} />

      <section id="top" className="relative overflow-hidden">
        <div className="hero-glow" aria-hidden />
        <div className="hero-glow hero-glow-b" aria-hidden />
        <div className="relative mx-auto grid max-w-6xl items-center gap-12 px-5 pb-16 pt-32 sm:px-8 sm:pb-24 sm:pt-40 lg:grid-cols-[1.15fr_0.85fr]">
          <div>
            <p className="eyebrow section-rule">MN Clockworks · Maple Grove</p>
            <h1 className="display mt-5 max-w-xl text-5xl sm:text-7xl">{hero.h1}</h1>
            <p className="mt-6 max-w-xl text-lg leading-relaxed text-ink-soft">{hero.sub}</p>
            <div className="mt-8 flex flex-col items-start gap-3 sm:flex-row sm:flex-wrap">
              <a
                href={phone.tel}
                className="btn-press inline-flex min-h-11 items-center justify-center rounded-[3px] bg-copper-deep px-5 py-3 font-medium text-cream-bright hover:bg-ink"
              >
                {primaryCta}
              </a>
              <button
                type="button"
                data-open-chat
                className="btn-press inline-flex min-h-11 items-center justify-center rounded-[3px] border hairline bg-cream-bright px-5 py-3 font-medium text-ink hover:border-copper-deep"
              >
                {chatCta}
              </button>
            </div>
            <p className="mt-4 text-ink-soft">
              Call{" "}
              <a href={phone.tel} className="font-medium text-ink underline decoration-copper underline-offset-4">
                {phone.display}
              </a>
            </p>
          </div>
          <AgentOrbit />
        </div>
      </section>

      <section id="why" className="border-t hairline bg-paper-deep">
        <div className="mx-auto max-w-6xl px-5 py-16 sm:px-8 sm:py-24">
          <Reveal>
            <p className="eyebrow section-rule">The work around the real job</p>
            <h2 className="display mt-4 max-w-3xl text-4xl sm:text-6xl">
              What I build handles the part that follows you home.
            </h2>
          </Reveal>
          <div className="mt-10 grid gap-6 md:grid-cols-2">
            <Reveal>
              <div className="max-w-xl space-y-4 text-[1.08rem] leading-relaxed text-ink-soft">
                <p>
                  You are on a job, with a client, or under a house. The phone rings and stops. A quote sits there. An invoice stays open. The review ask slips your mind. Then the same questions come in again.
                </p>
                <p>That pile is not the trade. It is the work around the trade. It still follows you home.</p>
              </div>
            </Reveal>
            <Reveal delay={0.08}>
              <ul className="grid gap-3">
                {[
                  "Callers you missed",
                  "Quotes that went quiet",
                  "Invoices still open",
                  "Review asks you meant to send",
                  "The same questions, again",
                ].map((item) => (
                  <li key={item} className="rounded-[3px] border hairline bg-cream-bright px-4 py-3 text-ink">
                    {item}
                  </li>
                ))}
              </ul>
            </Reveal>
          </div>
          <p className="mt-8 max-w-2xl text-lg text-ink">You talk, I listen.</p>
        </div>
      </section>

      <section id="team" className="border-t hairline">
        <div className="mx-auto max-w-6xl px-5 py-16 sm:px-8 sm:py-24">
          <Reveal>
            <p className="eyebrow section-rule">Meet your AI team</p>
            <h2 className="display mt-4 max-w-3xl text-4xl sm:text-6xl">
              Each agent has one job. You approve what goes out.
            </h2>
            <p className="mt-5 max-w-2xl text-lg leading-relaxed text-ink-soft">
              The team drafts. You approve. Nothing goes out until you say so. Open a card for an example task and an example draft.
            </p>
          </Reveal>
          <div className="mt-10">
            <AgentCards />
          </div>
          <div className="mt-12">
            <JobWalk />
          </div>
        </div>
      </section>

      <section id="industries" className="border-t hairline bg-paper-deep">
        <div className="mx-auto max-w-6xl px-5 py-16 sm:px-8 sm:py-24">
          <Reveal>
            <p className="eyebrow section-rule">Where it fits</p>
            <h2 className="display mt-4 max-w-3xl text-4xl sm:text-6xl">
              Plumbing, HVAC, and electrical first. Real estate sits with them.
            </h2>
            <p className="mt-5 max-w-2xl text-lg leading-relaxed text-ink-soft">
              Landscaping is next. Property management, cleaning, and professional services are a fit too. These are examples of the work, not a client list, and not a market claim.
            </p>
          </Reveal>
          <div className="mt-10">
            <IndustryTabs />
          </div>
        </div>
      </section>

      <section id="area" className="border-t hairline">
        <div className="mx-auto max-w-6xl px-5 py-16 sm:px-8 sm:py-24">
          <p className="eyebrow section-rule">Where I work</p>
          <h2 className="display mt-4 max-w-3xl text-4xl sm:text-6xl">
            Maple Grove and nearby, then the rest of Minnesota by phone.
          </h2>
          <p className="mt-5 max-w-3xl text-lg leading-relaxed text-ink-soft">
            I work with businesses in Maple Grove and nearby: {serviceTowns.join(", ")}, and across Minnesota by phone and screen share.
          </p>
        </div>
      </section>

      <section id="how" className="border-t hairline">
        <div className="mx-auto max-w-6xl px-5 py-16 sm:px-8 sm:py-24">
          <Reveal>
            <p className="eyebrow section-rule">How it works</p>
            <h2 className="display mt-4 max-w-3xl text-4xl sm:text-6xl">
              Visible steps. One screen-share setup.
            </h2>
            <p className="mt-5 max-w-2xl text-lg leading-relaxed text-ink-soft">
              Audit, optional assessment, setup together, test together, then a walkthrough. You watch it get built.
            </p>
          </Reveal>
          <div className="mt-12">
            <HowTimeline />
          </div>
        </div>
      </section>

      <section id="easy" className="border-t hairline bg-ground text-paper">
        <div className="mx-auto max-w-6xl px-5 py-16 sm:px-8 sm:py-24">
          <p className="eyebrow !text-copper section-rule">Why it is easy</p>
          <h2 className="display mt-4 max-w-3xl text-4xl text-paper sm:text-6xl">
            No IT project. No new app to learn.
          </h2>
          <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {easyPoints.map((point) => (
              <article key={point.t} className="rounded-[4px] border border-white/15 bg-ground-soft p-5">
                <h3 className="display text-2xl text-paper">{point.t}</h3>
                <p className="mt-3 leading-relaxed text-paper/80">{point.d}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="demo" className="border-t hairline">
        <div className="mx-auto grid max-w-6xl gap-10 px-5 py-16 sm:px-8 sm:py-24 lg:grid-cols-2">
          <div>
            <p className="eyebrow section-rule">Live demo</p>
            <h2 className="display mt-4 text-4xl sm:text-6xl">The chat on this page is the product.</h2>
            <p className="mt-5 text-lg leading-relaxed text-ink-soft">
              Talk to the Front Desk right here. It is a working sample of the agent I set up with you. Yours answers from information you approve.
            </p>
            <button
              type="button"
              data-open-chat
              className="btn-press mt-8 inline-flex min-h-11 items-center justify-center rounded-[3px] bg-ink px-5 py-3 font-medium text-paper hover:bg-copper-deep"
            >
              {chatCta}
            </button>
          </div>
          <div className="rounded-[4px] border hairline bg-cream-bright p-6">
            <p className="font-mono text-[0.7rem] tracking-[0.16em] text-copper-deep">EXAMPLE</p>
            <p className="mt-3 text-sm text-ink-faint">A sample exchange. Not a customer. Not a result.</p>
            <div className="mt-5 space-y-3">
              <p className="max-w-[90%] rounded-[12px] bg-paper-deep px-4 py-3 text-[0.95rem] leading-relaxed">
                Do you handle water heaters, and can someone call me back?
              </p>
              <p className="ml-auto max-w-[90%] rounded-[12px] bg-copper-deep px-4 py-3 text-[0.95rem] leading-relaxed text-cream-bright">
                We do. I can draft a reply that asks for the address and a good time for a call back. You approve it before it sends.
              </p>
            </div>
            <p className="mt-5 text-sm text-ink-soft">The team drafts. You approve. Nothing goes out until you say so.</p>
          </div>
        </div>
      </section>

      <section id="pricing" className="border-t hairline bg-paper-deep">
        <div className="mx-auto max-w-6xl px-5 py-16 sm:px-8 sm:py-24">
          <Reveal>
            <p className="eyebrow section-rule">Pricing</p>
            <h2 className="display mt-4 max-w-3xl text-4xl sm:text-6xl">Plain prices. Three of them.</h2>
          </Reveal>
          <div className="mt-10">
            <PricingBlock />
          </div>
        </div>
      </section>

      <section id="about" className="border-t hairline">
        <div className="mx-auto grid max-w-6xl items-center gap-10 px-5 py-16 sm:px-8 sm:py-24 md:grid-cols-[0.8fr_1.2fr]">
          <div className="mx-auto w-full max-w-sm rounded-[4px] border hairline bg-cream-bright p-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={asset("/media/parker.jpg")}
              alt="Parker Swanson"
              width={640}
              height={800}
              loading="lazy"
              className="aspect-[4/5] w-full rounded-[2px] object-cover"
            />
            <p className="px-2 py-3 font-mono text-[0.7rem] tracking-wider text-ink-faint">PARKER SWANSON · MAPLE GROVE</p>
          </div>
          <div>
            <p className="eyebrow section-rule">About Parker</p>
            <h2 className="display mt-4 text-4xl sm:text-6xl">I live in Maple Grove. I do this work myself.</h2>
            <div className="mt-6 max-w-xl space-y-4 text-[1.05rem] leading-relaxed text-ink-soft">
              <p>
                I&rsquo;m Parker Swanson. I live in Maple Grove, Minnesota, with my wife Melissa and our two kids. I spent more than a decade running technical operations and account teams for a national smart-home security company.
              </p>
              <p>
                MN Clockworks is me. I set the team up with you on a screen-share call, and I answer my own phone. Faith and family come first, which is why I care about the work that follows you home.
              </p>
              <p>{ownershipLine}</p>
            </div>
            <Link href="/about/" className="link-draw mt-6 inline-block text-ink">
              More about Parker
            </Link>
          </div>
        </div>
      </section>

      <section id="faq" className="border-t hairline bg-paper-deep">
        <div className="mx-auto max-w-6xl px-5 py-16 sm:px-8 sm:py-24">
          <p className="eyebrow section-rule">FAQ</p>
          <h2 className="display mt-4 text-4xl sm:text-6xl">Straight answers.</h2>
          <div className="mt-10">
            <FaqList />
          </div>
        </div>
      </section>

      <FinalBand />
    </>
  );
}
