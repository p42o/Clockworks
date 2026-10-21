import type { Metadata } from "next";
import Reveal from "@/components/Reveal";
import AuditCTA from "@/components/AuditCTA";

export const metadata: Metadata = {
  title: "How it works",
  description:
    "A free 15-minute phone audit, an online presence assessment for $50, and a one-time deployment for $500. Optional ongoing maintenance is available. Parker can walk you through it.",
};

const AUDIT_AGENDA = [
  { t: "Listen", d: "You talk, I listen. What a normal week looks like, where the evenings go." },
  { t: "Follow the leads", d: "We follow the leads: where calls come in, what happens when you can’t answer, where quotes and invoices sit." },
  { t: "The leaks", d: "We name where calls, quotes, and hours go quiet." },
] as const;

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: [
    {
      "@type": "Question",
      name: "What does the free AI audit include?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "A free 15-minute phone audit about where your week leaks time and leads.",
      },
    },
    {
      "@type": "Question",
      name: "What does working together cost?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "A free 15-minute phone audit, an online presence assessment for $50, and a one-time deployment for $500. We set up your AI team with you on a screen-share call, test it together, and walk you through how to use it. Optional ongoing maintenance is available. Parker can walk you through it. Nothing on this site is a quote or a contract. All work is confirmed in writing before anything starts.",
      },
    },
    {
      "@type": "Question",
      name: "Do I own the system?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Your business information, your instructions and the content we write for you are yours, and your AI team runs on your own platform accounts.",
      },
    },
  ],
};

export default function HowItWorks() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <section className="mx-auto max-w-6xl px-5 pb-16 pt-36 sm:px-8">
        <Reveal>
          <p className="eyebrow">The process</p>
          <h1 className="display mt-4 max-w-3xl text-5xl sm:text-7xl">
            No mystery, no maze<span className="text-copper">.</span>
          </h1>
          <p className="mt-6 max-w-xl text-[1.1rem] leading-relaxed text-ink-soft">
            You&rsquo;ve sat through pitches that needed three meetings to say a price. This is
            the opposite: everything below is the whole process, numbers included.
          </p>
        </Reveal>
      </section>

      {/* Step 1 */}
      <section className="border-t hairline">
        <div className="mx-auto grid max-w-6xl gap-10 px-5 py-16 sm:px-8 md:grid-cols-[1fr_1.3fr]">
          <Reveal>
            <p className="font-mono text-[0.7rem] tracking-[0.18em] text-copper">STEP 1 · FREE</p>
            <h2 className="display mt-3 text-4xl sm:text-5xl">The audit</h2>
            <p className="mt-4 max-w-md leading-relaxed text-ink-soft">
              A free 15-minute phone audit. Call (763) 202-7778. Here&rsquo;s the agenda, so you know it&rsquo;s not a
              sales ambush:
            </p>
          </Reveal>
          <Reveal delay={0.1}>
            <ol className="space-y-4">
              {AUDIT_AGENDA.map((a) => (
                <li key={a.t} className="card-lift card-lift-quiet flex gap-5 rounded-[3px] border hairline bg-cream-bright/60 p-5">
                  <span className="font-mono text-[0.72rem] tracking-wider text-copper whitespace-nowrap pt-1">{a.t}</span>
                  <span className="leading-relaxed text-ink-soft">{a.d}</span>
                </li>
              ))}
            </ol>
          </Reveal>
        </div>
      </section>

      {/* Step 2 */}
      <section className="border-t hairline bg-paper-deep">
        <div className="mx-auto grid max-w-6xl gap-10 px-5 py-16 sm:px-8 md:grid-cols-[1fr_1.3fr]">
          <Reveal>
            <p className="font-mono text-[0.7rem] tracking-[0.18em] text-copper">STEP 2 · $50</p>
            <h2 className="display mt-3 text-4xl sm:text-5xl">Online presence assessment</h2>
            <p className="mt-4 max-w-md leading-relaxed text-ink-soft">
              We check how your business shows up across search, AI assistants, and ratings and review sites.
            </p>
          </Reveal>
          <Reveal delay={0.1}>
            <p className="leading-relaxed text-ink-soft">
              An online presence assessment for $50.
            </p>
          </Reveal>
        </div>
      </section>

      {/* Step 3 */}
      <section className="border-t hairline">
        <div className="mx-auto grid max-w-6xl gap-10 px-5 py-16 sm:px-8 md:grid-cols-[1fr_1.3fr]">
          <Reveal>
            <p className="font-mono text-[0.7rem] tracking-[0.18em] text-copper">STEP 3 · $500 ONE TIME</p>
            <h2 className="display mt-3 text-4xl sm:text-5xl">The deployment</h2>
            <p className="mt-4 max-w-md leading-relaxed text-ink-soft">
              We set up your AI team with you on a screen-share call, test it together, and walk you through how to use it.
            </p>
          </Reveal>
          <Reveal delay={0.1}>
            <p className="leading-relaxed text-ink-soft">
              A one-time deployment for $500.
            </p>
          </Reveal>
        </div>
      </section>

      <section className="border-t hairline bg-paper-deep">
        <div className="mx-auto max-w-3xl space-y-4 px-5 py-12 text-[1.05rem] leading-relaxed text-ink-soft sm:px-8">
          <p>Optional ongoing maintenance is available. Parker can walk you through it.</p>
          <p>Nothing on this site is a quote or a contract. All work is confirmed in writing before anything starts.</p>
        </div>
      </section>

      {/* The straight-talk table */}
      <section className="border-t hairline bg-ground text-paper">
        <div className="mx-auto max-w-6xl px-5 py-16 sm:px-8">
          <Reveal>
            <p className="eyebrow !text-copper">Money, plainly</p>
            <h2 className="display mt-3 text-4xl sm:text-5xl">What things cost</h2>
          </Reveal>
          <Reveal delay={0.08}>
            <div className="mt-10 overflow-x-auto">
              <table className="w-full min-w-[560px] border-collapse text-left">
                <thead>
                  <tr className="border-b border-white/15 font-mono text-[0.72rem] tracking-[0.15em] text-paper/50">
                    <th className="py-3 pr-6 font-medium">STAGE</th>
                    <th className="py-3 pr-6 font-medium">PRICE</th>
                    <th className="py-3 font-medium">WHAT YOU WALK AWAY WITH</th>
                  </tr>
                </thead>
                <tbody className="text-[0.95rem]">
                  {[
                    ["The audit", "Free", "A free 15-minute phone audit."],
                    ["Online presence assessment", "$50", "An online presence assessment."],
                    ["One-time deployment", "$500", "We set up your AI team with you on a screen-share call, test it together, and walk you through how to use it."],
                    ["Ongoing maintenance", "Confirmed in writing before work starts", "Optional ongoing maintenance is available. Parker can walk you through it."],
                  ].map((row) => (
                    <tr key={row[0]} className="border-b border-white/10">
                      <td className="py-4 pr-6 font-medium text-cream-bright">{row[0]}</td>
                      <td className="py-4 pr-6 font-mono text-copper">{row[1]}</td>
                      <td className="py-4 leading-relaxed text-paper/70">{row[2]}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="mt-8 max-w-2xl leading-relaxed text-paper/60">
              Nothing on this site is a quote or a contract. All work is confirmed in writing before anything starts.
            </p>
          </Reveal>
        </div>
      </section>

      <AuditCTA />
    </>
  );
}
