"use client";

import { useState } from "react";
import Reveal from "@/components/Reveal";
import DemoShell from "./DemoShell";
import CallCatchDemo from "./CallCatchDemo";
import QuoteChaserDemo from "./QuoteChaserDemo";
import ReviewEngineDemo from "./ReviewEngineDemo";
import CommandDashboardDemo from "./CommandDashboardDemo";
import IntelDeskDemo from "./IntelDeskDemo";
import InboxAutopilotDemo from "./InboxAutopilotDemo";

const DEMOS = [
  {
    key: "callcatch",
    code: "DEMO 01 · CALL CATCH",
    title: "Miss a call, keep the job",
    blurb: "Play the customer whose water heater just burst. Watch the text-back land in nine seconds — then book yourself.",
    verbs: "You type · it answers · it books",
    component: CallCatchDemo,
    assumptions: "Scripted conversation; response times and booking rules are configurable per business.",
  },
  {
    key: "quotechaser",
    code: "DEMO 02 · QUOTE CHASER",
    title: "Run a week of follow-ups",
    blurb: "Five real-shaped quotes, one play button. See which ones come back to life when somebody finally nudges.",
    verbs: "Press play · watch $ revive",
    component: QuoteChaserDemo,
    assumptions: "Sample pipeline; nudge cadence (day 3/7/14) is a setting, not a rule.",
  },
  {
    key: "reviews",
    code: "DEMO 03 · REVIEW ENGINE",
    title: "Two customers, two paths",
    blurb: "You decide how the job went. Happy walks to Google; unhappy walks straight to your phone — privately.",
    verbs: "Pick a mood · watch the fork",
    component: ReviewEngineDemo,
    assumptions: "Sample texts; the ask timing and wording are set by the owner.",
  },
  {
    key: "dashboard",
    code: "DEMO 04 · COMMAND DASHBOARD",
    title: "Your week on one sheet",
    blurb: "Calls caught, cash outstanding, review velocity — the two-minute morning read, with live charts to poke.",
    verbs: "Hover the charts · flip the range",
    component: CommandDashboardDemo,
    assumptions: "All figures are fabricated sample data for a fictional plumbing shop.",
  },
  {
    key: "intel",
    code: "DEMO 05 · INTEL DESK",
    title: "Know what the big guys know",
    blurb: "Competitor price moves, local demand spikes, material costs — the analyst desk, scaled to one truck.",
    verbs: "Three tabs of intel",
    component: IntelDeskDemo,
    assumptions: "Competitors, prices, and trends are invented for the demo; a real desk reads public pages + your suppliers.",
  },
  {
    key: "inbox",
    code: "DEMO 06 · INBOX AUTOPILOT",
    title: "Monday's mail, handled",
    blurb: "Five messages land: leads get drafted, bills get filed, junk vanishes. You approve one reply with a tap.",
    verbs: "Open the inbox · approve a draft",
    component: InboxAutopilotDemo,
    assumptions: "Sample messages; drafts always wait for a human unless you say otherwise.",
  },
] as const;

export default function DemoGallery() {
  const [open, setOpen] = useState<string | null>(null);
  const active = DEMOS.find((d) => d.key === open);

  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {DEMOS.map((d, i) => (
          <Reveal key={d.key} delay={Math.min(i * 0.05, 0.2)}>
            <button
              type="button"
              onClick={() => setOpen(d.key)}
              onPointerMove={(e) => {
                const r = e.currentTarget.getBoundingClientRect();
                e.currentTarget.style.setProperty("--mx", `${e.clientX - r.left}px`);
                e.currentTarget.style.setProperty("--my", `${e.clientY - r.top}px`);
              }}
              className="card-sheen group flex h-full w-full flex-col rounded-[4px] border hairline bg-cream-bright/60 p-6 text-left transition-all duration-300 hover:-translate-y-0.5 hover:border-copper/50 hover:shadow-[0_16px_40px_-24px_rgba(26,25,22,0.4)]"
            >
              <p className="font-mono text-[0.65rem] tracking-[0.2em] text-copper">{d.code}</p>
              <h3 className="display mt-2.5 text-2xl leading-tight">{d.title}</h3>
              <p className="mt-2 flex-1 text-[0.9rem] leading-relaxed text-ink-soft">{d.blurb}</p>
              <p className="mt-5 flex items-center justify-between border-t hairline-soft pt-3 font-mono text-[0.68rem] tracking-wide text-ink-faint">
                {d.verbs}
                <span className="rounded-[2px] bg-ink px-2 py-1 text-paper transition-colors group-hover:bg-copper">
                  TRY IT ▸
                </span>
              </p>
            </button>
          </Reveal>
        ))}
      </div>

      {active && (
        <DemoShell
          open={!!open}
          onClose={() => setOpen(null)}
          title={active.title}
          code={active.code}
          assumptions={active.assumptions}
        >
          <active.component />
        </DemoShell>
      )}
    </>
  );
}
