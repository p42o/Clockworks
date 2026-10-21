import type { Metadata } from "next";
import { Link } from "next-view-transitions";
import Reveal from "@/components/Reveal";
import FinalBand from "@/components/v2/FinalBand";
import { asset } from "@/lib/site";
import { ownershipLine, phone, quoteLine } from "@/lib/copy";

export const metadata: Metadata = {
  title: "About Parker",
  description:
    "Parker Swanson, Maple Grove, Minnesota. I set up AI teams myself, on a screen-share call, for Minnesota businesses.",
  alternates: { canonical: "/about/" },
  openGraph: {
    title: "About Parker",
    description:
      "Parker Swanson, Maple Grove, Minnesota. I set up AI teams myself, on a screen-share call, for Minnesota businesses.",
    url: "/about/",
    images: [{ url: "/og.png", width: 1200, height: 630 }],
  },
};

const values = [
  { t: "Confirmed in writing", d: quoteLine },
  { t: "Your account", d: ownershipLine },
  {
    t: "Small on purpose",
    d: "I do the work myself. You will not be handed to an account manager, because there isn't one.",
  },
  {
    t: "You approve the words",
    d: "The team drafts. You approve. Nothing goes out until you say so. When a conversation needs a person, it comes to one.",
  },
] as const;

export default function About() {
  return (
    <>
      <section className="mx-auto max-w-6xl px-5 pb-16 pt-36 sm:px-8">
        <div className="grid items-start gap-12 md:grid-cols-[1.4fr_1fr]">
          <div>
            <Reveal>
              <p className="eyebrow section-rule">The person who does the work</p>
              <h1 className="display mt-4 text-5xl sm:text-7xl">Hi, I&rsquo;m Parker.</h1>
            </Reveal>
            <Reveal delay={0.08}>
              <div className="mt-7 max-w-xl space-y-5 text-[1.08rem] leading-relaxed text-ink-soft">
                <p>
                  I live in Maple Grove, Minnesota, with my wife Melissa and our two kids. I spent more than a decade running technical operations and account teams for a national smart-home security company, the kind of job where the system has to work for a real customer.
                </p>
                <p>
                  I started building AI systems for my own life first: assistants that answer, schedulers that schedule, paperwork that moves. Then I watched owners around me quoting jobs at the kitchen table and losing calls to a full voicemail box.
                </p>
                <p>
                  MN Clockworks is my answer. One local person sets up the team with you, shows you the price, and answers his own phone. The name is the idea: a good system should be like a good clock. You don&rsquo;t have to think about it.
                </p>
                <p>
                  Faith and family come first, which is why I build things that take the after-hours pile off the table. Setup is a screen-share call. Call {phone.display}.
                </p>
              </div>
            </Reveal>
          </div>
          <Reveal delay={0.12} className="md:sticky md:top-28">
            <div className="mx-auto w-full max-w-sm rounded-[4px] border hairline bg-cream-bright p-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={asset("/media/parker.jpg")}
                alt="Parker Swanson in Maple Grove, Minnesota"
                className="aspect-[4/5] w-full rounded-[2px] object-cover"
              />
              <div className="flex items-baseline justify-between px-2 py-3">
                <p className="font-mono text-[0.7rem] tracking-wider text-ink-faint">PARKER SWANSON</p>
                <a href={phone.tel} className="font-mono text-[0.7rem] tracking-wider text-copper-deep">
                  {phone.display}
                </a>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      <section className="border-t hairline bg-paper-deep">
        <div className="mx-auto max-w-6xl px-5 py-16 sm:px-8">
          <h2 className="display text-4xl sm:text-5xl">How I do business.</h2>
          <div className="mt-10 grid gap-8 sm:grid-cols-2">
            {values.map((value) => (
              <article key={value.t} className="border-t-2 border-copper/60 pt-5">
                <h3 className="display text-2xl">{value.t}</h3>
                <p className="mt-2 leading-relaxed text-ink-soft">{value.d}</p>
              </article>
            ))}
          </div>
          <p className="mt-10">
            <Link href="/how-it-works/" className="link-draw text-ink">
              See how a setup goes
            </Link>
          </p>
        </div>
      </section>
      <FinalBand />
    </>
  );
}
