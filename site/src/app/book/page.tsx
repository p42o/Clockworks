import type { Metadata } from "next";
import Reveal from "@/components/Reveal";
import AuditFlow from "@/components/AuditFlow";
import { site } from "@/lib/site";

export const metadata: Metadata = {
  title: "Book your free audit",
  description:
    "Book a free 30-minute AI Time & Lead Audit for your trades business. No pitch — you leave with a written plan either way. Twin Cities, in person or by call.",
};

export default function Book() {
  return (
    <section className="mx-auto max-w-6xl px-5 pb-24 pt-36 sm:px-8">
      <div className="grid gap-14 lg:grid-cols-[1fr_1.5fr]">
        <div>
          <Reveal>
            <p className="eyebrow">The free audit</p>
            <h1 className="display mt-4 text-5xl sm:text-6xl">
              Thirty minutes. A written plan. Zero pitch
              <span className="text-copper">.</span>
            </h1>
          </Reveal>
          <Reveal delay={0.1}>
            <ul className="mt-8 space-y-5 text-[0.98rem] leading-relaxed text-ink-soft">
              {[
                ["What this is", "A working session on your actual week — where calls, quotes, and hours leak — ending in a one-page plan with real numbers."],
                ["What this isn't", "A demo call with a sales deck and a countdown timer. If automation doesn't make sense for you, the plan will say so."],
                ["What happens next", "I reply within one business day, we pick a time around your jobs, and we meet — your shop, a coffee in the northwest metro, or a call."],
              ].map(([t, d]) => (
                <li key={t} className="border-l-2 border-copper/50 pl-4">
                  <p className="font-mono text-[0.7rem] tracking-[0.18em] text-copper">{t.toUpperCase()}</p>
                  <p className="mt-1.5">{d}</p>
                </li>
              ))}
            </ul>
            <p className="mt-8 text-sm text-ink-faint">
              This form is the whole front door — it lands on my phone in seconds, and a
              human answers it.
            </p>
          </Reveal>
        </div>
        <Reveal delay={0.15} className="rounded-[4px] border hairline bg-paper-deep/60 p-6 sm:p-10">
          <AuditFlow />
        </Reveal>
      </div>
    </section>
  );
}
