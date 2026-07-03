import type { Metadata } from "next";
import Reveal from "@/components/Reveal";
import AuditCTA from "@/components/AuditCTA";
import StatCount from "@/components/StatCount";

export const metadata: Metadata = {
  title: "Results",
  description:
    "Receipts, not promises: the AI systems Parker Swanson runs in production every day, and how the first named Twin Cities case studies will be earned.",
};

const RECEIPTS = [
  {
    code: "ANSWERING & INTAKE",
    title: "Assistants that answer for real communities",
    body: "I run AI assistants that field questions, take requests, and post updates for live communities — day and night, hundreds of interactions, without me touching them. The same machinery that answers a poker league at midnight can answer a no-heat call.",
  },
  {
    code: "SCHEDULING & OPS",
    title: "A household that runs on rails",
    body: "My family's calendar, chores, meal plans, and weather alerts run through systems I built — including a wall dashboard that reshapes itself by time of day. If it can survive a 7-year-old and a 5-year-old, it can survive a dispatch board.",
  },
  {
    code: "LOGGING & FOLLOW-UP",
    title: "Journals that write themselves",
    body: "Trip logs, maintenance records, spend trackers, water chemistry — I've automated the boring documentation of half my life. That's exactly the muscle invoicing and job records need.",
  },
  {
    code: "MONITORING & ALERTS",
    title: "Systems that watch systems",
    body: "Uptime monitors, price watchers, storm alerts to my phone before the sirens. When I say “I'll watch your system so you don't have to,” this is what watching looks like at my house.",
  },
] as const;

export default function Results() {
  return (
    <>
      <section className="mx-auto max-w-6xl px-5 pb-16 pt-36 sm:px-8">
        <Reveal>
          <p className="eyebrow">Receipts, not promises</p>
          <h1 className="display mt-4 max-w-3xl text-5xl sm:text-7xl">
            Early days, said out loud<span className="text-copper">.</span>
          </h1>
          <p className="mt-6 max-w-2xl text-[1.1rem] leading-relaxed text-ink-soft">
            Here&rsquo;s the honest version most agencies won&rsquo;t print: MN Clockworks is
            new, and I don&rsquo;t have a wall of client logos yet. What I have is years of
            these exact systems running in production — built by me, maintained by me, used
            every single day. Judge the work, then let&rsquo;s earn the logos together.
          </p>
        </Reveal>
      </section>

      <section className="mx-auto max-w-6xl px-5 pb-8 sm:px-8">
        <div className="grid gap-px overflow-hidden rounded-[4px] border hairline bg-line sm:grid-cols-2">
          {RECEIPTS.map((r, i) => (
            <Reveal key={r.code} delay={i * 0.05} className="bg-paper p-7 sm:p-9">
              <p className="font-mono text-[0.7rem] tracking-[0.2em] text-copper">{r.code}</p>
              <h2 className="display mt-3 text-[1.6rem] leading-tight">{r.title}</h2>
              <p className="mt-3 leading-relaxed text-ink-soft">{r.body}</p>
            </Reveal>
          ))}
        </div>
        <Reveal className="mt-10">
          <div className="flex flex-wrap items-baseline gap-x-12 gap-y-6 rounded-[4px] border hairline bg-cream-bright/60 p-7 sm:p-9">
            {[
              { v: 30, suffix: "+", label: "systems in production right now" },
              { v: 2, suffix: " yrs", label: "running them daily, unattended" },
              { v: 24, suffix: "/7", label: "the hours they keep without complaint" },
            ].map((s) => (
              <div key={s.label}>
                <p className="display text-5xl">
                  <StatCount value={s.v} suffix={s.suffix} />
                </p>
                <p className="mt-2 max-w-[22ch] text-sm text-ink-faint">{s.label}</p>
              </div>
            ))}
          </div>
        </Reveal>
      </section>

      <section className="mx-auto max-w-6xl px-5 py-16 sm:px-8">
        <Reveal>
          <article className="rounded-[4px] border-2 border-copper/60 bg-ember/30 p-8 sm:p-12">
            <p className="eyebrow !text-copper">The open slot</p>
            <h2 className="display mt-3 max-w-2xl text-4xl sm:text-5xl">
              The first named case study could be <em>your</em> shop
              <span className="text-copper">.</span>
            </h2>
            <p className="mt-5 max-w-2xl text-[1.05rem] leading-relaxed text-ink-soft">
              Early clients get launch pricing and first-in-line service. In exchange, when the
              system delivers, I ask to tell the story right here — your company&rsquo;s name,
              the problem, the numbers, the result. Real proof for me, a permanent spotlight for
              you, and the next owner who lands on this page gets to see exactly what a Twin
              Cities trades business got for its money.
            </p>
            <p className="mt-6 font-mono text-[0.8rem] tracking-wide text-ink-faint">
              PROBLEM → SYSTEM → NUMBERS → OWNER&rsquo;S OWN WORDS. THAT&rsquo;S THE FORMAT.
            </p>
          </article>
        </Reveal>
      </section>

      <AuditCTA
        title="Want to see something running?"
        context="Book the audit and I'll bring a live demo you can call, text, and try to stump — not a slide deck."
      />
    </>
  );
}
