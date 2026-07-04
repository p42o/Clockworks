import type { Metadata } from "next";
import Reveal from "@/components/Reveal";
import AuditCTA from "@/components/AuditCTA";
import SteerDemo from "./SteerDemo";

export const metadata: Metadata = {
  title: "Your own agent",
  description:
    "A trained AI front desk that lives on YOUR site and text line — answers, books, logs every conversation, and learns. You own it: the cost, control, and visibility story explained plainly.",
};

const CHANNELS = ["Your website", "Text messages (SMS)", "Telegram", "Discord", "More as you need them"];

const MODELS = [
  { name: "Claude (Anthropic)", take: "The careful craftsman — great judgment, follows your rules to the letter. Parker's default for customer-facing work.", price: "≈ pennies per conversation" },
  { name: "GPT (OpenAI)", take: "The famous all-rounder — huge ecosystem, solid at everything.", price: "≈ pennies per conversation" },
  { name: "Gemini (Google)", take: "Google's engine — strong value, plays well with Google tools.", price: "≈ a penny or less per conversation" },
] as const;

export default function YourOwnAgent() {
  return (
    <>
      <section className="mx-auto max-w-6xl px-5 pb-14 pt-36 sm:px-8">
        <Reveal>
          <p className="eyebrow">System 06 — Front Desk</p>
          <h1 className="display mt-4 max-w-3xl text-5xl sm:text-7xl">
            The bot you just talked to? <em>You could own one</em>
            <span className="text-copper">.</span>
          </h1>
          <p className="mt-6 max-w-2xl text-[1.1rem] leading-relaxed text-ink-soft">
            The chat bubble on this site isn&rsquo;t a support widget — it&rsquo;s a working
            sample of the product. Yours gets trained on <em>your</em> business: your services,
            your prices, your service area, your way of talking to people. Then it works your
            front desk 24/7 — and unlike the apps you rent, this one belongs to you.
          </p>
        </Reveal>
      </section>

      <section className="border-t hairline">
        <div className="mx-auto grid max-w-6xl gap-10 px-5 py-14 sm:px-8 md:grid-cols-2">
          {[
            {
              t: "One brain, every channel",
              d: `It lives on your website and answers your text line — and the same trained brain can sit in Telegram, Discord, or wherever your customers already are. Someone texts at 9pm about a dead furnace: it answers, asks the right questions, books the visit. Channels: ${CHANNELS.join(" · ")}.`,
            },
            {
              t: "It remembers everything (for you)",
              d: "Every conversation is logged and analyzed. You see what customers keep asking, which questions turn into booked jobs, where people give up, and what's missing from your website. Returning customers get remembered — 'the sump pump from March' means something to it.",
            },
            {
              t: "Wired into your real tools",
              d: "Booking lands on your actual calendar (Jobber, Housecall Pro, Google). Ballpark quotes follow your rules. Leads drop into whatever you already use — no new dashboard to check, no copy-pasting.",
            },
            {
              t: "It can even look at photos",
              d: "A customer snaps a picture of the leak or the breaker panel; the agent takes a first look, forwards it to you with notes, and tells the customer what happens next. Little things like that are why people say 'wait, it can do that?'",
            },
          ].map((x, i) => (
            <Reveal key={x.t} delay={i * 0.05} className="border-t-2 border-copper/60 pt-5">
              <h2 className="display text-2xl">{x.t}</h2>
              <p className="mt-2 leading-relaxed text-ink-soft">{x.d}</p>
            </Reveal>
          ))}
        </div>
      </section>

      {/* steerability */}
      <section className="border-t hairline bg-paper-deep">
        <div className="mx-auto max-w-6xl px-5 py-14 sm:px-8">
          <Reveal>
            <p className="eyebrow">Steering it is this easy</p>
            <h2 className="display mt-3 max-w-2xl text-4xl sm:text-5xl">
              Its personality is a dial, not a code change<span className="text-copper">.</span>
            </h2>
            <p className="mt-4 max-w-xl leading-relaxed text-ink-soft">
              Plain-English controls set how it talks — overall, or differently per audience
              (homeowners get warm, property managers get brisk). Try it:
            </p>
          </Reveal>
          <Reveal delay={0.1} className="mt-8">
            <SteerDemo />
          </Reveal>
          <Reveal delay={0.15}>
            <p className="mt-6 max-w-2xl text-[0.95rem] leading-relaxed text-ink-faint">
              Training scope is just as flexible: services, pricing, troubleshooting scripts,
              scheduling rules, warranty policies, &ldquo;what to say when someone&rsquo;s water
              heater is spraying&rdquo; — whatever you&rsquo;d teach a sharp new office hire, it
              learns. And keeps learning from every conversation.
            </p>
          </Reveal>
        </div>
      </section>

      {/* models */}
      <section className="border-t hairline">
        <div className="mx-auto max-w-6xl px-5 py-14 sm:px-8">
          <Reveal>
            <p className="eyebrow">You pick the engine</p>
            <h2 className="display mt-3 max-w-2xl text-4xl sm:text-5xl">
              Runs on the same AI the big guys use<span className="text-copper">.</span>
            </h2>
          </Reveal>
          <div className="mt-8 grid gap-4 md:grid-cols-3">
            {MODELS.map((m, i) => (
              <Reveal key={m.name} delay={i * 0.05} className="rounded-[4px] border hairline bg-cream-bright/60 p-6">
                <h3 className="display text-xl">{m.name}</h3>
                <p className="mt-2 text-[0.9rem] leading-relaxed text-ink-soft">{m.take}</p>
                <p className="mt-4 border-t hairline-soft pt-3 font-mono text-[0.72rem] text-ink-faint">
                  RUNNING COST — {m.price}*
                </p>
              </Reveal>
            ))}
          </div>
          <Reveal>
            <p className="mt-4 text-[0.78rem] text-ink-faint">
              *Rough mid-2026 figures for a typical short customer conversation; usage-based and
              they keep falling. The point: the engine costs less than the coffee you&rsquo;d buy
              a human receptionist — and you can switch engines anytime, because you own the seat
              it sits in.
            </p>
          </Reveal>
        </div>
      </section>

      {/* ownership */}
      <section className="border-t hairline bg-ground text-paper">
        <div className="mx-auto max-w-6xl px-5 py-16 sm:px-8">
          <Reveal>
            <p className="eyebrow !text-copper">The part that matters</p>
            <h2 className="display mt-3 max-w-2xl text-4xl sm:text-5xl">Own it. Don&rsquo;t rent it.</h2>
            <div className="mt-6 grid max-w-4xl gap-6 sm:grid-cols-3">
              {[
                ["COST", "Rented AI receptionists run $99–$800 every month, forever, with meters on your minutes. Yours runs on a small cloud server you own — typically $10–20/month to keep the lights on, plus pennies of AI usage."],
                ["CONTROL", "Rented tools decide what you can customize. Yours does whatever you want it to — new services, new rules, new channels, no feature-request queue, no 'contact sales.'"],
                ["VISIBILITY", "Rented tools show you their dashboard. Yours logs every word on your own server — your customer conversations are your business asset, not somebody else's training data."],
              ].map(([t, d]) => (
                <div key={t}>
                  <p className="font-mono text-[0.7rem] tracking-[0.2em] text-copper">{t}</p>
                  <p className="mt-2 text-[0.92rem] leading-relaxed text-paper/75">{d}</p>
                </div>
              ))}
            </div>
            <p className="mt-8 max-w-2xl leading-relaxed text-paper/60">
              Parker sets it all up (pilot $2,000–$4,000, live in about two weeks), then either
              hands you the keys or stays on as the mechanic from $99/month — no contract, and
              firing him doesn&rsquo;t turn it off. That&rsquo;s the whole point.
            </p>
          </Reveal>
        </div>
      </section>

      <AuditCTA
        title="Want one with your name on it?"
        context="The free audit figures out whether an agent like this pays for itself in your shop — with the math shown. Or just grill the demo bot some more; it doesn't get tired."
      />
    </>
  );
}
