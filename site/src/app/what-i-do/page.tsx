import type { Metadata } from "next";
import Reveal from "@/components/Reveal";
import AuditCTA from "@/components/AuditCTA";

export const metadata: Metadata = {
  title: "What I do",
  description:
    "Four AI systems for trades businesses: missed-call capture, quote follow-up, review automation, and back-office paperwork — built on Jobber, QuickBooks, and the tools you already use.",
};

const SPECS = [
  {
    n: "01",
    code: "CALL CATCH",
    title: "Never miss another job call",
    price: "Pilot $2,000–$3,500 · from $99/mo",
    firstIf: "Your voicemail has ever been full, or you wince thinking about weekend calls.",
    what: [
      "A missed call gets a text back in seconds — your words, your name, your number.",
      "After hours, an answering system that actually books: it asks the right questions (where, what, when) and puts real appointments on your calendar.",
      "Emergency words — “burst,” “no heat,” “sparking” — skip the line and ring you or your on-call tech immediately.",
      "Every conversation lands in your inbox as a two-line summary, not a chore.",
    ],
    runs: "Your existing phone number · Jobber · Housecall Pro · Google Calendar",
    truth:
      "Most callers won’t leave a voicemail — they just call the next company. Whoever answers first usually wins the job. This makes you first, every time, without hiring anyone.",
  },
  {
    n: "02",
    code: "QUOTE CHASER",
    title: "Quotes that follow up themselves",
    price: "Pilot $2,000–$3,000 · from $99/mo",
    firstIf: "You have quotes from last month sitting in “Sent” that you keep meaning to chase.",
    what: [
      "Every quote gets a follow-up schedule the moment you send it — day 3, day 7, day 14, or whatever rhythm fits your trade.",
      "The nudges read like you wrote them, because you approved every template before launch.",
      "A reply stops the sequence instantly and pings you. A yes books the job.",
      "A simple weekly view: what’s pending, what’s gone quiet, what closed.",
    ],
    runs: "Jobber · QuickBooks · Email + SMS",
    truth:
      "Quotes rarely lose to a competitor. They lose to silence. The polite second touch is where the money you already earned goes to be found.",
  },
  {
    n: "03",
    code: "REVIEW ENGINE",
    title: "Five-star reviews on autopilot",
    price: "Pilot $2,000–$2,500 · from $99/mo",
    firstIf: "Your work is better than your Google rating suggests.",
    what: [
      "When a job closes, the customer gets a short text asking how it went, with your review link.",
      "Happy customers get walked straight to Google. Unhappy ones reach you privately first — you fix it before it’s public.",
      "Fresh reviews keep your Google Business Profile alive, which is where your next customer is already searching.",
    ],
    runs: "Google Business Profile · Jobber · Housecall Pro",
    truth:
      "You’ve done five-star work for years — it’s just never been asked for out loud. This asks, politely, every single time.",
  },
  {
    n: "04",
    code: "PAPER MOVER",
    title: "The office pile, handled",
    price: "Pilot $2,500–$5,000 · $199–$299/mo",
    firstIf: "Invoicing night is a real night at your house.",
    what: [
      "Unpaid invoices get friendly reminders on a schedule, with a pay-by-card link — you stop being the bad guy.",
      "Job notes and photos become clean, filed records instead of a camera roll mystery.",
      "A Friday email tells you what came in, what went out, and what’s stuck — two minutes to read.",
      "This is the widest system, so pilots start focused: we pick the one pile that hurts most.",
    ],
    runs: "QuickBooks · Your inbox · Jobber",
    truth:
      "Nobody started a plumbing company to do data entry at 9pm. The paperwork doesn’t need you — it needs a system that never gets tired of it.",
  },
  {
    n: "05",
    code: "INTEL DESK",
    title: "Know what the big guys know",
    price: "Pilot $2,500–$5,000 · $199–$299/mo",
    firstIf: "You’ve ever learned about a competitor’s price change from a customer, six months late.",
    what: [
      "A live dashboard on your own numbers — calls caught, jobs booked, cash outstanding, review velocity — readable in two minutes with coffee.",
      "Competitor watch: published prices and offers on local competitors’ sites, checked weekly, changes flagged.",
      "Demand signals: when searches for your services spike in your service area, you hear about it that week — in time to staff for it.",
      "Material-cost tracking from supplier lists, so your quotes keep up with copper, not last quarter’s prices.",
      "One plain-English Tuesday digest. No login required to stay informed.",
    ],
    runs: "Public web data · QuickBooks · Jobber",
    truth:
      "Big companies pay an analyst for this view. Yours can come from a patient machine that reads the public internet every week and never bills overtime.",
  },
  {
    n: "06",
    code: "FRONT DESK",
    title: "A website that answers back",
    price: "Pilot $2,000–$4,000 · from $99/mo",
    firstIf: "Your website is a brochure that has never once answered a customer’s question.",
    what: [
      "A trained agent living on your site and your text line — answers questions about your services, pricing, and scheduling, in your words, 24/7.",
      "Books real appointments straight onto your calendar; hands anything sensitive to you fast.",
      "Every conversation is logged and analyzed: you see what customers keep asking, where they hesitate, which questions turn into jobs.",
      "You steer its personality and rules with plain-English controls — no code, no tickets.",
      "Mine is running on this site right now. Go ask it something hard.",
    ],
    runs: "Your site · SMS · your knowledge base",
    truth:
      "The chat bubble on this site isn’t a support widget — it’s the product, demonstrating itself. What it does for me all day, yours does for you.",
  },
] as const;

export default function WhatIDo() {
  return (
    <>
      <section className="mx-auto max-w-6xl px-5 pb-16 pt-36 sm:px-8">
        <Reveal>
          <p className="eyebrow">The spec sheet</p>
          <h1 className="display mt-4 max-w-3xl text-5xl sm:text-7xl">
            Four systems, priced out loud<span className="text-copper">.</span>
          </h1>
          <p className="mt-6 max-w-xl text-[1.1rem] leading-relaxed text-ink-soft">
            Every system below runs on tools you already own, sounds like you because you approve
            every word, and belongs to you outright when it&rsquo;s done. Prices are printed
            because you shouldn&rsquo;t have to book a call to learn a number.
          </p>
        </Reveal>
      </section>

      <section className="mx-auto max-w-6xl space-y-8 px-5 pb-24 sm:px-8">
        {SPECS.map((s, i) => (
          <Reveal key={s.n} delay={Math.min(i * 0.05, 0.15)}>
            <article className="grid gap-8 rounded-[4px] border hairline bg-cream-bright/60 p-7 sm:p-10 lg:grid-cols-[1.2fr_1fr]">
              <div>
                <div className="flex items-baseline gap-4">
                  <span className="font-mono text-[0.7rem] tracking-[0.2em] text-copper">{s.code}</span>
                  <span className="font-mono text-[0.7rem] text-ink-faint">{s.n} / 06</span>
                </div>
                <h2 className="display mt-4 text-4xl">{s.title}</h2>
                <p className="mt-2 font-mono text-[0.8rem] tracking-wide text-ink-soft">{s.price}</p>
                <ul className="mt-6 space-y-3">
                  {s.what.map((w) => (
                    <li key={w} className="flex gap-3 leading-relaxed text-ink-soft">
                      <span className="mt-[0.55em] h-px w-4 shrink-0 bg-copper" aria-hidden />
                      {w}
                    </li>
                  ))}
                </ul>
                <p className="mt-6 border-t hairline-soft pt-4 font-mono text-[0.72rem] tracking-wide text-ink-faint">
                  RUNS ON — {s.runs}
                </p>
              </div>
              <div className="flex flex-col justify-between gap-6 border-t hairline-soft pt-6 lg:border-l lg:border-t-0 lg:pl-8 lg:pt-0">
                <div>
                  <p className="eyebrow">A good first pilot if…</p>
                  <p className="mt-3 text-lg leading-relaxed">{s.firstIf}</p>
                </div>
                <p className="text-[0.95rem] italic leading-relaxed text-ink-faint">{s.truth}</p>
              </div>
            </article>
          </Reveal>
        ))}

        <Reveal>
          <article className="rounded-[4px] border border-dashed hairline p-7 sm:p-10">
            <p className="eyebrow">Something else eating your week?</p>
            <p className="mt-3 max-w-2xl text-lg leading-relaxed text-ink-soft">
              Scheduling chaos, material reorders, GPS-stamped job photos, safety checklists,
              hiring paperwork — if it happens on a computer or a phone more than once a week,
              it can probably be a system. Bring it to the audit; the plan is free either way.
            </p>
          </article>
        </Reveal>
      </section>

      <AuditCTA
        title="Not sure which one you need?"
        context="That's literally what the audit is for. Thirty minutes, we walk your week, and the plan tells you which system pays back fastest — with the math shown."
      />
    </>
  );
}
