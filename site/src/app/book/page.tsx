import type { Metadata } from "next";
import Reveal from "@/components/Reveal";
import AuditFlow from "@/components/AuditFlow";
import { formHonestLine, phone } from "@/lib/copy";
import { pageSocial } from "@/lib/site";

const title = "Free 15-minute phone audit";
const description =
  `Ask for a free 15-minute phone audit. This form does not book a time. Parker will reach out. Or call ${phone.display}.`;

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: "/book/" },
  ...pageSocial(title, description, "/book/"),
};

export default function Book() {
  return (
    <section className="mx-auto max-w-6xl px-5 pb-24 pt-36 sm:px-8">
      <div className="grid gap-14 lg:grid-cols-[1fr_1.5fr]">
        <div>
          <Reveal>
            <p className="eyebrow section-rule">A note, not a calendar</p>
            <h1 className="display mt-4 text-5xl sm:text-6xl">Free 15-minute phone audit.</h1>
          </Reveal>
          <Reveal delay={0.08}>
            <div className="mt-6 max-w-md space-y-4 text-[1.05rem] leading-relaxed text-ink-soft">
              <p>
                Call{" "}
                <a href={phone.tel} className="font-medium text-ink underline decoration-copper underline-offset-4">
                  {phone.display}
                </a>
                . Iris, our AI phone assistant, answers and takes a message for Parker.
              </p>
              <p>{formHonestLine}</p>
              <p>Tell me the trade, what is piling up, and how to reach you. I read it myself.</p>
            </div>
          </Reveal>
        </div>
        <Reveal delay={0.12} className="rounded-[4px] border hairline bg-paper-deep/60 p-6 sm:p-10">
          <AuditFlow />
        </Reveal>
      </div>
    </section>
  );
}
