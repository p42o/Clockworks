import { Link } from "next-view-transitions";
import Escapement from "@/components/Escapement";
import WeekFlow from "@/components/WeekFlow";
import MagneticButton from "@/components/MagneticButton";
import Reveal from "@/components/Reveal";
import StatCount from "@/components/StatCount";
import AuditCTA from "@/components/AuditCTA";
import { asset, site } from "@/lib/site";

/*
 * H1 candidates considered:
 *   "Get your evenings back."            ← chosen: the outcome, four words, zero jargon
 *   "Win more jobs without more admin."  (kept as section copy below)
 *   "The office work runs itself now."
 *   "Built for the trades. Runs like clockwork."
 */

const SYSTEMS = [
  {
    n: "01",
    code: "CALL CATCH",
    title: "Never miss another job call",
    body: "You're under a sink; the phone rings twice and quits. Call Catch texts the caller back in seconds — in your words, from your number — and books them before they dial the next guy.",
    runs: "Your existing number · Jobber · Housecall Pro",
  },
  {
    n: "02",
    code: "QUOTE CHASER",
    title: "Quotes that follow up themselves",
    body: "Most quotes don't lose — they just go quiet. Quote Chaser sends the friendly nudge you never have time to write, on a schedule you set, until you get a yes or a no.",
    runs: "Jobber · QuickBooks · Email + SMS",
  },
  {
    n: "03",
    code: "REVIEW ENGINE",
    title: "Five-star reviews on autopilot",
    body: "Job closes, customer gets a short text with your review link. Happy customers talk you up in public. Unhappy ones reach you privately first — before they reach Google.",
    runs: "Google Business Profile · Jobber",
  },
  {
    n: "04",
    code: "PAPER MOVER",
    title: "The office pile, handled",
    body: "Invoices chased politely until they're paid. Job notes turned into clean records. A Friday summary of what moved and what's stuck — read it in two minutes, done.",
    runs: "QuickBooks · Your inbox",
  },
] as const;

const FAQS = [
  {
    q: "Do I need to buy new software?",
    a: "No. I build on what you already run — Jobber, Housecall Pro, QuickBooks, your Google profile, your existing phone number. If you run your business from a notebook and a cell phone, that works too; we start simpler.",
  },
  {
    q: "I'm not technical. How much do I have to learn?",
    a: "Nothing, if you don't want to. No new dashboards, no logins to remember. The systems work inside the tools and the phone you already use, and I set every word they say before anything goes live.",
  },
  {
    q: "What does it actually cost?",
    a: "The audit is free. A pilot — one working system, built and live — is a fixed quote between $2,000 and $5,000 depending on scope. After that, I keep it running, tuned, and improving from $99 to $299 a month. No contracts. One saved job typically covers months of it.",
  },
  {
    q: "Am I locked in?",
    a: "No. You own everything I build — the accounts, the numbers, the logic. Cancel the monthly service anytime and the system keeps working; you'd just be maintaining it yourself.",
  },
  {
    q: "Will customers know it's AI?",
    a: "The texts sound like you because you approve the wording. When a conversation needs a human, it hands off to you fast — the goal is never to fool anyone, it's to answer in seconds instead of never.",
  },
] as const;

export default function Home() {
  return (
    <>
      {/* ---------- HERO ---------- */}
      <section className="relative flex min-h-dvh flex-col justify-center overflow-clip">
        <div className="absolute inset-y-0 right-0 w-full lg:w-[58%]" aria-hidden>
          <Escapement className="h-full w-full opacity-25 lg:opacity-90" />
          <div className="absolute inset-0 bg-gradient-to-r from-paper via-paper/70 to-transparent lg:via-paper/20" />
        </div>

        <div className="relative mx-auto w-full max-w-6xl px-5 pb-20 pt-32 sm:px-8">
          <Reveal>
            <p className="eyebrow">
              AI systems for trades businesses · {site.city}, MN
            </p>
          </Reveal>
          <Reveal delay={0.08}>
            <h1 className="display mt-5 max-w-3xl text-[17vw] leading-[0.95] sm:text-8xl lg:text-[6.5rem]">
              Get your <em className="text-copper">evenings</em> back<span className="text-copper">.</span>
            </h1>
          </Reveal>
          <Reveal delay={0.16}>
            <p className="mt-7 max-w-xl text-[1.1rem] leading-relaxed text-ink-soft">
              I build quiet, reliable systems for Twin Cities plumbing, HVAC, electrical, and
              landscaping companies — they catch the calls you miss, chase the quotes you sent,
              and keep the paperwork moving while you&rsquo;re on the job.
            </p>
          </Reveal>
          <Reveal delay={0.24}>
            <div className="mt-9 flex flex-wrap items-center gap-5">
              <MagneticButton href="/book/">{site.cta.label} →</MagneticButton>
              <Link href="/how-it-works/" className="link-draw text-ink-soft hover:text-ink">
                See how it works
              </Link>
            </div>
            <p className="mt-4 text-sm text-ink-faint">{site.cta.sub}</p>
          </Reveal>
        </div>

        <div className="relative border-t hairline">
          <div className="mx-auto flex max-w-6xl flex-wrap items-baseline gap-x-8 gap-y-2 px-5 py-4 sm:px-8">
            <span className="eyebrow">Built on the tools you already use</span>
            <span className="font-mono text-[0.75rem] tracking-wider text-ink-soft">
              Jobber · QuickBooks · Housecall Pro · Google · your phone number
            </span>
          </div>
        </div>
      </section>

      {/* ---------- THE WEEK, BEFORE & AFTER ---------- */}
      <section id="week" className="border-t hairline bg-cream-bright/40">
        <div className="mx-auto max-w-6xl px-5 pt-20 sm:px-8 sm:pt-28">
          <Reveal>
            <p className="eyebrow">01 — The problem</p>
            <h2 className="display mt-4 max-w-2xl text-4xl sm:text-6xl">
              The work isn&rsquo;t the problem. <em>The pile</em> is.
            </h2>
            <p className="mt-5 max-w-xl text-[1.05rem] leading-relaxed text-ink-soft">
              Missed calls, quiet quotes, unpaid invoices, reviews you meant to ask for. None of
              it is hard — there&rsquo;s just no hour left in the day to do it. Here&rsquo;s what
              one ordinary Tuesday looks like when the machine handles it instead.
            </p>
          </Reveal>
        </div>
        <WeekFlow />
      </section>

      {/* ---------- WHAT I DO ---------- */}
      <section className="border-t hairline">
        <div className="mx-auto max-w-6xl px-5 py-20 sm:px-8 sm:py-28">
          <Reveal>
            <p className="eyebrow">02 — What I do</p>
            <h2 className="display mt-4 max-w-2xl text-4xl sm:text-6xl">
              Four systems. One quiet machine<span className="text-copper">.</span>
            </h2>
          </Reveal>
          <div className="mt-12 grid gap-px overflow-hidden rounded-[4px] border hairline bg-line sm:grid-cols-2">
            {SYSTEMS.map((s, i) => (
              <Reveal key={s.n} delay={i * 0.06} className="group bg-paper p-7 transition-colors duration-500 hover:bg-cream-bright sm:p-9">
                <div className="flex items-baseline justify-between">
                  <span className="font-mono text-[0.7rem] tracking-[0.2em] text-copper">{s.code}</span>
                  <span className="font-mono text-[0.7rem] text-ink-faint">{s.n}</span>
                </div>
                <h3 className="display mt-4 text-[1.7rem] leading-tight">{s.title}</h3>
                <p className="mt-3 leading-relaxed text-ink-soft">{s.body}</p>
                <p className="mt-6 border-t hairline-soft pt-4 font-mono text-[0.72rem] tracking-wide text-ink-faint">
                  RUNS ON — {s.runs}
                </p>
              </Reveal>
            ))}
          </div>
          <Reveal className="mt-8">
            <Link href="/what-i-do/" className="link-draw text-ink-soft hover:text-ink">
              The full spec sheet, including what each one costs →
            </Link>
          </Reveal>
        </div>
      </section>

      {/* ---------- NUMBERS ---------- */}
      <section className="bg-ground text-paper">
        <div className="mx-auto max-w-6xl px-5 py-20 sm:px-8 sm:py-24">
          <Reveal>
            <p className="eyebrow !text-copper">03 — Straight numbers</p>
          </Reveal>
          <div className="mt-10 grid grid-cols-2 gap-10 lg:grid-cols-4">
            {[
              { v: 10, suffix: " hrs", label: "a week of admin a typical owner carries — the hours we go find" },
              { v: 9, suffix: " sec", label: "for a missed call to get a text back with your name on it" },
              { v: 48, suffix: " hrs", label: "from kickoff to a working demo you can poke at" },
              { v: 0, prefix: "$", label: "cost of the audit — a written plan, yours either way" },
            ].map((s, i) => (
              <Reveal key={s.label} delay={i * 0.07}>
                <p className="display text-5xl text-cream-bright sm:text-6xl">
                  <StatCount value={s.v} prefix={s.prefix ?? ""} suffix={s.suffix ?? ""} />
                </p>
                <p className="mt-3 max-w-[26ch] text-sm leading-relaxed text-paper/60">{s.label}</p>
              </Reveal>
            ))}
          </div>
          <Reveal className="mt-14 border-t border-white/10 pt-8">
            <p className="max-w-2xl text-lg leading-relaxed text-paper/80">
              Most callers who hit voicemail don&rsquo;t leave one — they call the next name on
              the list. The first company to answer usually wins the job.{" "}
              <span className="text-paper/50">
                That&rsquo;s the whole pitch. Everything I build exists to make you first.
              </span>
            </p>
          </Reveal>
        </div>
      </section>

      {/* ---------- HOW IT WORKS ---------- */}
      <section className="border-t hairline">
        <div className="mx-auto max-w-6xl px-5 py-20 sm:px-8 sm:py-28">
          <Reveal>
            <p className="eyebrow">04 — How it works</p>
            <h2 className="display mt-4 max-w-2xl text-4xl sm:text-6xl">
              Three steps. No mystery<span className="text-copper">.</span>
            </h2>
          </Reveal>
          <div className="mt-12 grid gap-10 md:grid-cols-3">
            {[
              {
                step: "STEP 1 — FREE",
                title: "The audit",
                body: "Thirty minutes, in person or on a call. We walk your week and find where the hours and leads actually leak. You get a one-page written plan — keep it, shop it around, or hand it to me.",
              },
              {
                step: "STEP 2 — $2,000–$5,000 FIXED",
                title: "The pilot",
                body: "I build the one system from the plan that pays back fastest. Working demo in 48 hours, live in about two weeks. Fixed quote before we start — if it grows, that's a new conversation, not a surprise invoice.",
              },
              {
                step: "STEP 3 — FROM $99/MO",
                title: "It runs",
                body: "I watch it, tune it, and improve it while it works. You get a plain-English report of what it caught. Cancel anytime — you own every piece, and it keeps working without me.",
              },
            ].map((s, i) => (
              <Reveal key={s.title} delay={i * 0.08} className="border-t-2 border-copper/70 pt-6">
                <p className="font-mono text-[0.7rem] tracking-[0.18em] text-copper">{s.step}</p>
                <h3 className="display mt-3 text-3xl">{s.title}</h3>
                <p className="mt-3 leading-relaxed text-ink-soft">{s.body}</p>
              </Reveal>
            ))}
          </div>
          <Reveal className="mt-10">
            <Link href="/how-it-works/" className="link-draw text-ink-soft hover:text-ink">
              Exactly what happens in the audit →
            </Link>
          </Reveal>
        </div>
      </section>

      {/* ---------- PROOF ---------- */}
      <section className="border-t hairline bg-paper-deep">
        <div className="mx-auto max-w-6xl px-5 py-20 sm:px-8 sm:py-28">
          <Reveal>
            <p className="eyebrow">05 — Proof</p>
            <h2 className="display mt-4 max-w-2xl text-4xl sm:text-6xl">
              I run these systems <em>every day</em><span className="text-copper">.</span>
            </h2>
            <p className="mt-5 max-w-xl text-[1.05rem] leading-relaxed text-ink-soft">
              Before I ever sold one, I built them for myself. Thirty-plus automations run my own
              family&rsquo;s life and businesses right now — answering, scheduling, logging,
              chasing. When I say &ldquo;it just runs,&rdquo; I&rsquo;m describing my Tuesday.
            </p>
          </Reveal>
          <Reveal className="mt-8" delay={0.1}>
            <Link href="/results/" className="link-draw text-ink-soft hover:text-ink">
              See the receipts →
            </Link>
          </Reveal>
        </div>
      </section>

      {/* ---------- ABOUT TEASER ---------- */}
      <section className="border-t hairline">
        <div className="mx-auto grid max-w-6xl items-center gap-10 px-5 py-20 sm:px-8 sm:py-28 md:grid-cols-[1fr_1.4fr]">
          <Reveal className="mx-auto w-full max-w-xs">
            <div className="rounded-[4px] border hairline bg-cream-bright p-2 shadow-[0_20px_50px_-30px_rgba(26,25,22,0.4)]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={asset("/media/parker.jpg")}
                alt="Parker Swanson, founder of MN Clockworks"
                className="aspect-[4/5] w-full rounded-[2px] object-cover"
                loading="lazy"
              />
              <p className="px-2 py-3 font-mono text-[0.7rem] tracking-wider text-ink-faint">
                PARKER SWANSON · MAPLE GROVE, MN
              </p>
            </div>
          </Reveal>
          <Reveal delay={0.1}>
            <p className="eyebrow">06 — Who you&rsquo;re dealing with</p>
            <h2 className="display mt-4 text-4xl sm:text-5xl">
              One guy. Local. Reachable<span className="text-copper">.</span>
            </h2>
            <p className="mt-5 max-w-xl text-[1.05rem] leading-relaxed text-ink-soft">
              I&rsquo;m Parker. I&rsquo;ve spent a decade-plus running technical operations for a
              national smart-home company by day, and I live in Maple Grove with my wife and two
              kids. I built this business for one reason: owners around here work too hard to
              lose jobs to a full voicemail box. When you call, you get me — not a sales team.
            </p>
            <div className="mt-8 flex flex-wrap gap-5">
              <Link href="/about/" className="link-draw text-ink-soft hover:text-ink">
                The longer story →
              </Link>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ---------- FAQ ---------- */}
      <section className="border-t hairline">
        <div className="mx-auto max-w-3xl px-5 py-20 sm:px-8 sm:py-28">
          <Reveal>
            <p className="eyebrow">07 — Straight answers</p>
            <h2 className="display mt-4 text-4xl sm:text-5xl">
              The stuff you&rsquo;d actually ask<span className="text-copper">.</span>
            </h2>
          </Reveal>
          <div className="mt-10 divide-y divide-line-soft border-y hairline-soft">
            {FAQS.map((f, i) => (
              <Reveal key={f.q} as="div" delay={i * 0.04}>
                <details className="group py-5 marker:content-none">
                  <summary className="flex cursor-pointer list-none items-baseline justify-between gap-6 text-lg font-medium [&::-webkit-details-marker]:hidden">
                    {f.q}
                    <span
                      aria-hidden
                      className="font-mono text-copper transition-transform duration-300 group-open:rotate-45"
                    >
                      +
                    </span>
                  </summary>
                  <p className="mt-3 max-w-xl leading-relaxed text-ink-soft">{f.a}</p>
                </details>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <AuditCTA />
    </>
  );
}
