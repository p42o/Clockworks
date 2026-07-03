import type { Metadata } from "next";
import Reveal from "@/components/Reveal";
import AuditCTA from "@/components/AuditCTA";

export const metadata: Metadata = {
  title: "How it works",
  description:
    "Free 30-minute AI Time & Lead Audit → fixed-price pilot ($2k–$5k, live in ~2 weeks) → managed systems from $99/mo. No contracts, no lock-in, you own everything.",
};

const AUDIT_AGENDA = [
  { t: "Minute 0–5", d: "You talk, I listen. What a normal week looks like, where the evenings go." },
  { t: "Minute 5–15", d: "We follow the leads: where calls come in, what happens when you can’t answer, where quotes and invoices sit." },
  { t: "Minute 15–25", d: "I sketch the two or three places a system would pay for itself fastest — with the math, out loud." },
  { t: "Minute 25–30", d: "You get the plan in writing within a day: what I’d build, what it costs, what it should return. No follow-up sequence, no pressure. It’s yours." },
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
      name: "What does the free AI audit include?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "A 30-minute conversation about where your week leaks time and leads, followed by a written one-page plan: what to automate first, what it costs, and what it should return. The plan is yours to keep either way.",
      },
    },
    {
      "@type": "Question",
      name: "How much does an AI pilot cost for a trades business?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "A pilot — one working system, built on your existing tools and live in about two weeks — is a fixed quote between $2,000 and $5,000. Ongoing managed service runs $99 to $299 per month with no contract.",
      },
    },
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
            You&rsquo;ve sat through pitches that needed three meetings to say a price. This is
            the opposite: everything below is the whole process, numbers included.
          </p>
        </Reveal>
      </section>

      {/* Step 1 */}
      <section className="border-t hairline">
        <div className="mx-auto grid max-w-6xl gap-10 px-5 py-16 sm:px-8 md:grid-cols-[1fr_1.3fr]">
          <Reveal>
            <p className="font-mono text-[0.7rem] tracking-[0.18em] text-copper">STEP 1 — FREE</p>
            <h2 className="display mt-3 text-4xl sm:text-5xl">The audit</h2>
            <p className="mt-4 max-w-md leading-relaxed text-ink-soft">
              Thirty minutes. Coffee shop, your shop, or a call — your pick. Here&rsquo;s the
              exact agenda, so you know it&rsquo;s not a sales ambush:
            </p>
            <p className="mt-6 text-sm italic text-ink-faint">
              If I can&rsquo;t find anything worth automating, I&rsquo;ll say so — and the
              coffee&rsquo;s on me.
            </p>
          </Reveal>
          <Reveal delay={0.1}>
            <ol className="space-y-4">
              {AUDIT_AGENDA.map((a) => (
                <li key={a.t} className="flex gap-5 rounded-[3px] border hairline bg-cream-bright/60 p-5">
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
            <p className="font-mono text-[0.7rem] tracking-[0.18em] text-copper">STEP 2 — $2,000–$5,000 FIXED</p>
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
            <p className="font-mono text-[0.7rem] tracking-[0.18em] text-copper">STEP 3 — $99–$299/MO</p>
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
                    ["The audit", "Free", "A written plan with the payback math. Yours even if we never talk again."],
                    ["A pilot", "$2,000–$5,000 fixed", "One working system, live in ~2 weeks, that you own outright."],
                    ["Managed service", "$99–$299/mo, no contract", "A mechanic for your machine: monitoring, tuning, monthly report."],
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
              The math I&rsquo;ll show you in the audit: if your average job is worth $400 and a
              system catches one missed job a month, it paid for itself. Everything past that is
              margin. If the math doesn&rsquo;t work for your business, the plan will say so —
              I&rsquo;d rather lose a sale than have you resent a system.
            </p>
          </Reveal>
        </div>
      </section>

      <AuditCTA />
    </>
  );
}
