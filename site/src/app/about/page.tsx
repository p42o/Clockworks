import type { Metadata } from "next";
import Reveal from "@/components/Reveal";
import AuditCTA from "@/components/AuditCTA";
import { asset, site } from "@/lib/site";

export const metadata: Metadata = {
  title: "About",
  description:
    "Parker Swanson — Maple Grove, MN. A decade-plus of technical operations, now building practical AI systems so Twin Cities trades owners can be home for dinner.",
};

const VALUES = [
  {
    t: "Prices in print",
    d: "Every number I charge is on this website. If a price ever feels mysterious, ask me to explain it until it doesn't.",
  },
  {
    t: "You own everything",
    d: "Accounts, numbers, logic, documentation — in your name from day one. My favorite kind of client relationship is one you could leave but don't.",
  },
  {
    t: "Small on purpose",
    d: "I take a few clients at a time and do the work myself. You will never be handed to an account manager, because there isn't one.",
  },
  {
    t: "No robots pretending",
    d: "The systems answer fast and sound human because you approved the words — but the moment a conversation needs a person, it hands off to one. That's a feature, not an apology.",
  },
] as const;

export default function About() {
  return (
    <>
      <section className="mx-auto max-w-6xl px-5 pb-16 pt-36 sm:px-8">
        <div className="grid items-start gap-12 md:grid-cols-[1.4fr_1fr]">
          <div>
            <Reveal>
              <p className="eyebrow">The person behind the machine</p>
              <h1 className="display mt-4 text-5xl sm:text-7xl">
                Hi, I&rsquo;m Parker<span className="text-copper">.</span>
              </h1>
            </Reveal>
            <Reveal delay={0.08}>
              <div className="mt-7 max-w-xl space-y-5 text-[1.08rem] leading-relaxed text-ink-soft">
                <p>
                  I live in Maple Grove with my wife Melissa and our two kids. By day I&rsquo;ve
                  spent over a decade running technical operations and account teams for a
                  national smart-home security company — the kind of job where things have to
                  work at 2am, for real customers, or somebody&rsquo;s phone rings.
                </p>
                <p>
                  A few years ago I started building AI systems for my own life — assistants
                  that answer, schedulers that schedule, paperwork that files itself. It got a
                  little out of hand, in the best way. More than thirty of them run my
                  household and side projects today.
                </p>
                <p>
                  Then I watched the owners around me — the people who fix our sinks and
                  furnaces and yards — quoting jobs at their kitchen tables at 9pm, losing
                  weekend calls to a full voicemail box. The gap was obvious: this technology
                  is ready for the trades, but the people selling it are agencies with sales
                  scripts, or faceless apps from three time zones away.
                </p>
                <p>
                  MN Clockworks is my answer: one local person who builds the machine, shows
                  you the price, and answers his own phone. The name is the promise — a good
                  system should be like a good clock. You don&rsquo;t think about it.
                  It just keeps your time.
                </p>
                <p className="italic text-ink-faint">
                  Faith and family first here — which is exactly why I build things that give
                  evenings back. I want your Tuesday dinner table to get you back, too.
                </p>
              </div>
            </Reveal>
          </div>
          <Reveal delay={0.15} className="md:sticky md:top-28">
            <div className="mx-auto w-full max-w-sm rounded-[4px] border hairline bg-cream-bright p-2 shadow-[0_20px_50px_-30px_rgba(26,25,22,0.4)]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={asset("/media/parker.jpg")}
                alt="Parker Swanson"
                className="aspect-[4/5] w-full rounded-[2px] object-cover"
              />
              <div className="flex items-baseline justify-between px-2 py-3">
                <p className="font-mono text-[0.7rem] tracking-wider text-ink-faint">
                  PARKER SWANSON
                </p>
                <a
                  href={`mailto:${site.email}`}
                  className="font-mono text-[0.7rem] tracking-wider text-copper hover:underline"
                >
                  {site.email}
                </a>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      <section className="border-t hairline bg-paper-deep">
        <div className="mx-auto max-w-6xl px-5 py-16 sm:px-8 sm:py-20">
          <Reveal>
            <p className="eyebrow">How I do business</p>
            <h2 className="display mt-4 text-4xl sm:text-5xl">
              Four things I won&rsquo;t bend on<span className="text-copper">.</span>
            </h2>
          </Reveal>
          <div className="mt-10 grid gap-8 sm:grid-cols-2">
            {VALUES.map((v, i) => (
              <Reveal key={v.t} delay={i * 0.05} className="border-t-2 border-copper/60 pt-5">
                <h3 className="display text-2xl">{v.t}</h3>
                <p className="mt-2 leading-relaxed text-ink-soft">{v.d}</p>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <AuditCTA
        title="Let's talk about your week."
        context="Coffee in Maple Grove, a visit to your shop, or a 30-minute call — whatever's easiest. Worst case, you leave with a free plan and a strong opinion about me."
      />
    </>
  );
}
