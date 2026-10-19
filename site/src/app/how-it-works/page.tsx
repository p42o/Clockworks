import type { Metadata } from "next";
import Reveal from "@/components/Reveal";
import AuditCTA from "@/components/AuditCTA";

export const metadata: Metadata = {
  title: "How it works",
  description:
    "How a Chief of Staff AI team gets set up. In person in the Twin Cities, remote elsewhere. You approve what goes out.",
};

const AUDIT_AGENDA = [
  { t: "Your week.", d: "You talk, I listen. What a normal week looks like." },
  { t: "Your email.", d: "Where messages sit, and what you want a person to see first." },
  { t: "Your quotes.", d: "What goes out, what goes quiet, and who should nudge." },
  { t: "Next steps.", d: "We decide what the team handles on day one." },
] as const;

const READY_TEAM = [
  { t: "Day one.", d: "The team drafts email, quotes, and marketing. You approve what goes out." },
  { t: "Your tools.", d: "It uses the email, phone, and files you already have." },
  { t: "Your words.", d: "I set the voice with you before anything sends." },
  { t: "Your accounts.", d: "Logins stay in your name." },
] as const;

const YOU_APPROVE = [
  "You approve email, quotes, and marketing before they send.",
  "A plain-English note of what the team drafted and what you sent.",
  "When the week changes, text me and I adjust it.",
  "You own the setup.",
] as const;

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: [
    {
      "@type": "Question",
      name: "Do I keep the system if I cancel?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Yes. You own the accounts, phone numbers, and logic outright. Cancel the monthly service anytime and everything keeps working — you'd just be maintaining it yourself.",
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
            Here is how I work with you.
          </p>
        </Reveal>
      </section>

      {/* Step 1 */}
      <section className="border-t hairline">
        <div className="mx-auto grid max-w-6xl gap-10 px-5 py-16 sm:px-8 md:grid-cols-[1fr_1.3fr]">
          <Reveal>
            <p className="font-mono text-[0.7rem] tracking-[0.18em] text-copper">STEP 1</p>
            <h2 className="display mt-3 text-4xl sm:text-5xl">A conversation.</h2>
            <p className="mt-4 max-w-md leading-relaxed text-ink-soft">
              Tell me about the week. Where email, quotes, and marketing pile up. In person in the Twin Cities, remote elsewhere.
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
            <p className="font-mono text-[0.7rem] tracking-[0.18em] text-copper">STEP 2</p>
            <h2 className="display mt-3 text-4xl sm:text-5xl">A ready team.</h2>
            <p className="mt-4 max-w-md leading-relaxed text-ink-soft">
              I set up a Chief of Staff team that handles email, quotes, and marketing. You can see it working on day one. You own it.
            </p>
          </Reveal>
          <Reveal delay={0.1}>
            <ol className="space-y-4">
              {READY_TEAM.map((a) => (
                <li key={a.t} className="card-lift card-lift-quiet flex gap-5 rounded-[3px] border hairline bg-cream-bright/60 p-5">
                  <span className="font-mono text-[0.72rem] tracking-wider text-copper whitespace-nowrap pt-1">{a.t}</span>
                  <span className="leading-relaxed text-ink-soft">{a.d}</span>
                </li>
              ))}
            </ol>
          </Reveal>
        </div>
      </section>

      {/* Step 3 */}
      <section className="border-t hairline">
        <div className="mx-auto grid max-w-6xl gap-10 px-5 py-16 sm:px-8 md:grid-cols-[1fr_1.3fr]">
          <Reveal>
            <p className="font-mono text-[0.7rem] tracking-[0.18em] text-copper">STEP 3</p>
            <h2 className="display mt-3 text-4xl sm:text-5xl">You approve.</h2>
            <p className="mt-4 max-w-md leading-relaxed text-ink-soft">
              The team drafts. You approve. Nothing goes out until you say so.
            </p>
          </Reveal>
          <Reveal delay={0.1}>
            <ul className="space-y-4">
              {YOU_APPROVE.map((x) => (
                <li key={x} className="flex gap-3 leading-relaxed text-ink-soft">
                  <span className="mt-[0.55em] h-px w-4 shrink-0 bg-copper" aria-hidden />
                  {x}
                </li>
              ))}
            </ul>
          </Reveal>
        </div>
      </section>

      <AuditCTA />
    </>
  );
}
