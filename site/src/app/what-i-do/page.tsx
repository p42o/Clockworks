import type { Metadata } from "next";
import AgentCards from "@/components/v2/AgentCards";
import FinalBand from "@/components/v2/FinalBand";
import { ownershipLine, phone, primaryCta } from "@/lib/copy";
import { pageSocial } from "@/lib/site";

const title = "The agent team";
const description =
  "Six agents, each with one job: missed-call follow-up, quiet quotes, review asks, invoice reminders, public local notes, and customer questions you approve.";

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: "/what-i-do/" },
  ...pageSocial(title, description, "/what-i-do/"),
};

export default function WhatIDo() {
  return (
    <>
      <section className="mx-auto max-w-6xl px-5 pb-8 pt-36 sm:px-8">
        <p className="eyebrow section-rule">What I set up</p>
        <h1 className="display mt-4 max-w-3xl text-5xl sm:text-7xl">Six agents. One job each.</h1>
        <p className="mt-6 max-w-2xl text-lg leading-relaxed text-ink-soft">
          Call Catch, Quote Chaser, Review Engine, Paper Mover, Intel Desk, and Front Desk. They draft. You approve. Nothing goes out until you say so.
        </p>
        <p className="mt-4 max-w-2xl leading-relaxed text-ink-soft">{ownershipLine}</p>
        <a
          href={phone.tel}
          className="btn-press mt-8 inline-flex min-h-11 items-center rounded-[3px] bg-copper-deep px-5 py-3 font-medium text-cream-bright hover:bg-ink"
        >
          {primaryCta}
        </a>
      </section>
      <section className="mx-auto max-w-6xl px-5 py-12 sm:px-8">
        <AgentCards />
      </section>
      <FinalBand />
    </>
  );
}
