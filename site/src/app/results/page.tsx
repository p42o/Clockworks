import type { Metadata } from "next";
import Reveal from "@/components/Reveal";
import AuditCTA from "@/components/AuditCTA";
import StatCount from "@/components/StatCount";
import DemoGallery from "@/components/demos/DemoGallery";

export const metadata: Metadata = {
  title: "Results — working demos you can poke",
  description:
    "Six working demos with sample data: missed-call capture, quote follow-up, review automation, an owner's dashboard, a market intel desk, and an inbox autopilot. Not screenshots — machines.",
};

export default function Results() {
  return (
    <>
      <section className="mx-auto max-w-6xl px-5 pb-12 pt-36 sm:px-8">
        <Reveal>
          <p className="eyebrow">Not screenshots. Machines.</p>
          <h1 className="display mt-4 max-w-3xl text-5xl sm:text-7xl">
            Don&rsquo;t take my word for it — <em>poke it</em>
            <span className="text-copper">.</span>
          </h1>
          <p className="mt-6 max-w-2xl text-[1.1rem] leading-relaxed text-ink-soft">
            Every card below is a working demo running right here in your browser, loaded with
            clearly-labeled sample data. Play the customer. Run the week. Hover the charts.
            This is the stuff I build — and every piece of it gets rebuilt around <em>your</em>{" "}
            shop, your words, your numbers.
          </p>
        </Reveal>
      </section>

      <section className="mx-auto max-w-6xl px-5 pb-16 sm:px-8">
        <DemoGallery />
      </section>

      <section className="border-t hairline bg-paper-deep">
        <div className="mx-auto max-w-6xl px-5 py-16 sm:px-8">
          <Reveal>
            <p className="eyebrow">The honest part</p>
            <h2 className="display mt-4 max-w-2xl text-4xl sm:text-5xl">
              Early days, said out loud<span className="text-copper">.</span>
            </h2>
            <p className="mt-5 max-w-2xl leading-relaxed text-ink-soft">
              MN Clockworks is new, and I don&rsquo;t have a wall of client logos yet — what I
              have is years of these systems running in production for my own life and work:
              assistants answering real communities at midnight, inbox workflows reading and
              routing hundreds of messages a day for a busy operations team, and live dashboards
              pulling real-time data the way the intel desk above does. Thirty-plus machines,
              running unattended, every day.
            </p>
          </Reveal>
          <Reveal className="mt-8" delay={0.08}>
            <div className="flex flex-wrap items-baseline gap-x-12 gap-y-6">
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
        </div>
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
              you.
            </p>
            <p className="mt-6 font-mono text-[0.8rem] tracking-wide text-ink-faint">
              PROBLEM → SYSTEM → NUMBERS → OWNER&rsquo;S OWN WORDS. THAT&rsquo;S THE FORMAT.
            </p>
          </article>
        </Reveal>
      </section>

      <AuditCTA
        title="Want one of these with your name on it?"
        context="The audit finds which machine pays back fastest for your shop — with the math shown. Thirty minutes, written plan, zero pitch."
      />
    </>
  );
}
