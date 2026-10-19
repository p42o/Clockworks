import type { Metadata } from "next";
import Reveal from "@/components/Reveal";
import AuditCTA from "@/components/AuditCTA";

export const metadata: Metadata = {
  title: "How it works",
  description:
    "A conversation, a working system, and ongoing care. You own everything.",
};

const AUDIT_AGENDA = [
  { t: "Your week", d: "You talk, I listen. What a normal week looks like, where the evenings go." },
  { t: "Your leads", d: "We follow the leads: where calls come in, what happens when you can’t answer, where quotes and invoices sit." },
  { t: "Your systems", d: "I sketch the two or three places a system would pay for itself fastest — with the math, out loud." },
  { t: "Next steps", d: "We talk about what to build." },
] as const;

const PILOT_TIMELINE = [
  { t: "Day 0", d: "We pick the one system from your plan with the fastest payback. Fixed quote, in writing, before anything starts." },
  { t: "Hour 48", d: "Working demo. You call the number, you see the text arrive, you poke at it with real scenarios. We adjust the words until it sounds like you." },
  { t: "Week 1", d: "It runs quietly alongside your normal week — catching, chasing, logging — while we watch it together." },
  { t: "Week 2", d: "Live and handed over. Your accounts, your logins, your system. I document everything in plain English." },
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
            <h2 className="display mt-3 text-4xl sm:text-5xl">A conversation</h2>
            <p className="mt-4 max-w-md leading-relaxed text-ink-soft">
              Tell me about your week and where the hours and leads get stuck.
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
            <h2 className="display mt-3 text-4xl sm:text-5xl">The pilot</h2>
            <p className="mt-4 max-w-md leading-relaxed text-ink-soft">
              One system, built end to end on the tools you already use. Fixed quote before we
              start. Working demo in 48 hours, because you shouldn&rsquo;t pay for promises you
              can&rsquo;t poke at.
            </p>
          </Reveal>
          <Reveal delay={0.1}>
            <ol className="relative space-y-0 border-l-2 border-copper/50 pl-8">
              {PILOT_TIMELINE.map((a) => (
                <li key={a.t} className="relative pb-8 last:pb-0">
                  <span className="absolute -left-[41px] top-1 h-4 w-4 rounded-full border-2 border-copper bg-paper" aria-hidden />
                  <p className="font-mono text-[0.72rem] tracking-wider text-copper">{a.t}</p>
                  <p className="mt-1 leading-relaxed text-ink-soft">{a.d}</p>
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
            <h2 className="display mt-3 text-4xl sm:text-5xl">It runs</h2>
            <p className="mt-4 max-w-md leading-relaxed text-ink-soft">
              Machines need a mechanic. I watch yours, tune it, and make it better every month —
              and you can see exactly what it&rsquo;s doing for you.
            </p>
          </Reveal>
          <Reveal delay={0.1}>
            <ul className="space-y-4">
              {[
                "A monthly plain-English report: calls caught, quotes chased, reviews earned, hours returned.",
                "Tweaks included — new hours, new techs, new service area, changed wording. Text me; it's handled.",
                "Improvements as the tools get better. Your system in December is smarter than it was in June.",
                "No contract. Cancel with an email. Everything keeps working because you own everything.",
              ].map((x) => (
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
