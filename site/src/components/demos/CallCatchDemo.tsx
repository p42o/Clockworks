"use client";

import { useEffect, useRef, useState } from "react";
import { useReducedMotion } from "motion/react";

/**
 * Scripted missed-call → text-back conversation. The visitor plays the
 * customer via quick replies; the "AI" side is a deterministic script —
 * the live chatbot elsewhere on the site is the real brain.
 */

type Msg = { from: "ai" | "you" | "sys"; text: string };

const SCENARIOS = {
  "Water heater leaking — 7:58pm": [
    { from: "sys", text: "☎ Missed call → text-back in 9 seconds" },
    { from: "ai", text: "Hi, this is Nelson Plumbing — sorry we missed you, we're on a job. This is the office assistant. What's going on?" },
  ],
  "No AC — Saturday, 91°": [
    { from: "sys", text: "☎ Missed call → text-back in 9 seconds" },
    { from: "ai", text: "Hi, you've reached Ridgeline Heating & Air — we missed your call but we're still on deck this weekend. What's happening with your system?" },
  ],
  "Sparking outlet — 10:40pm": [
    { from: "sys", text: "☎ Missed call → text-back in 9 seconds" },
    { from: "ai", text: "This is Anchor Electric's after-hours line. We missed your call — is everything safe right now? Tell me what you're seeing." },
  ],
} as const;

type ScenarioKey = keyof typeof SCENARIOS;

const FLOW: Record<string, { reply: Msg[]; options?: string[] }> = {
  "Water heater's leaking all over the basement!": {
    reply: [
      { from: "ai", text: "That's no fun — let's move fast. First: the shutoff valve is usually on top of the heater (cold line). Turning it clockwise stops the feed." },
      { from: "ai", text: "We can get someone there tomorrow at 8:30am, or I can flag this as an emergency and wake the on-call tech now. Which works?" },
    ],
    options: ["Tomorrow 8:30 works", "This is an emergency"],
  },
  "Tomorrow 8:30 works": {
    reply: [
      { from: "ai", text: "Done — you're on the schedule for 8:30am tomorrow. You'll get a confirmation text and an on-my-way text when the tech heads over. Anything else tonight?" },
      { from: "sys", text: "📅 Booked: Water heater repair — tomorrow 8:30 AM · added to Jobber" },
      { from: "sys", text: "👤 Owner sees: transcript + booking in the morning summary. Total owner effort: zero." },
    ],
  },
  "This is an emergency": {
    reply: [
      { from: "ai", text: "On it. I'm paging the on-call tech with your address and this conversation — expect a call inside 10 minutes. Keep that valve closed if you found it." },
      { from: "sys", text: "🔔 On-call tech paged (SMS + call) · transcript attached" },
      { from: "sys", text: "👤 A real human takes over from here — the machine's job was the first 60 seconds." },
    ],
  },
} as const;

const OPENERS: Record<ScenarioKey, string> = {
  "Water heater leaking — 7:58pm": "Water heater's leaking all over the basement!",
  "No AC — Saturday, 91°": "Water heater's leaking all over the basement!",
  "Sparking outlet — 10:40pm": "Water heater's leaking all over the basement!",
};

export default function CallCatchDemo() {
  const reduced = useReducedMotion();
  const [scenario, setScenario] = useState<ScenarioKey | null>(null);
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [options, setOptions] = useState<string[]>([]);
  const [typing, setTyping] = useState(false);
  const scroller = useRef<HTMLDivElement>(null);

  const push = (list: Msg[], after?: string[]) => {
    let i = 0;
    setTyping(true);
    const step = () => {
      const item = list[i];
      i += 1;
      setMsgs((m) => [...m, item]);
      if (i < list.length) {
        setTimeout(step, reduced ? 0 : 850);
      } else {
        setTyping(false);
        if (after) setOptions(after);
      }
    };
    setTimeout(step, reduced ? 0 : 700);
  };

  const start = (key: ScenarioKey) => {
    setScenario(key);
    setMsgs([]);
    setOptions([]);
    push([...SCENARIOS[key]], [OPENERS[key]]);
  };

  const choose = (opt: string) => {
    setMsgs((m) => [...m, { from: "you", text: opt }]);
    setOptions([]);
    const next = FLOW[opt];
    if (next) push([...next.reply], next.options ? [...next.options] : undefined);
  };

  useEffect(() => {
    scroller.current?.scrollTo({ top: 99999, behavior: reduced ? "auto" : "smooth" });
  }, [msgs, typing, reduced]);

  return (
    <div>
      <div className="mb-4 flex flex-wrap gap-2">
        {(Object.keys(SCENARIOS) as ScenarioKey[]).map((k) => (
          <button
            key={k}
            type="button"
            onClick={() => start(k)}
            className={`rounded-[3px] border px-3 py-2 text-[0.8rem] transition-colors ${
              scenario === k ? "border-copper bg-copper text-cream-bright" : "hairline bg-cream-bright/70 text-ink-soft hover:border-copper/60"
            }`}
          >
            {k}
          </button>
        ))}
      </div>

      <div className="mx-auto max-w-sm rounded-[14px] border-2 border-ink/80 bg-ground p-2 shadow-xl">
        <div className="rounded-[10px] bg-cream-bright">
          <div className="border-b hairline px-4 py-2.5 text-center">
            <p className="text-[0.72rem] font-medium text-ink">Your customer&rsquo;s phone</p>
          </div>
          <div ref={scroller} className="flex h-[300px] flex-col gap-2 overflow-y-auto px-3 py-3">
            {!scenario && (
              <p className="m-auto max-w-[22ch] text-center text-sm text-ink-faint">
                Pick a scenario above — you play the customer.
              </p>
            )}
            {msgs.map((m, i) =>
              m.from === "sys" ? (
                <p key={i} className="mx-auto max-w-[90%] text-center font-mono text-[0.62rem] leading-relaxed text-ink-faint">
                  {m.text}
                </p>
              ) : (
                <div
                  key={i}
                  className={`max-w-[85%] rounded-[12px] px-3 py-2 text-[0.82rem] leading-snug ${
                    m.from === "ai" ? "self-start bg-paper-deep text-ink" : "self-end bg-copper text-cream-bright"
                  }`}
                >
                  {m.text}
                </div>
              ),
            )}
            {typing && (
              <div className="self-start rounded-[12px] bg-paper-deep px-3 py-2 font-mono text-[0.7rem] text-ink-faint">
                typing…
              </div>
            )}
          </div>
          <div className="flex min-h-[52px] flex-wrap items-center gap-2 border-t hairline px-3 py-2">
            {options.map((o) => (
              <button
                key={o}
                type="button"
                onClick={() => choose(o)}
                className="rounded-full border border-copper/60 px-3 py-1.5 text-[0.78rem] text-copper transition-colors hover:bg-copper hover:text-cream-bright"
              >
                {o}
              </button>
            ))}
            {!options.length && scenario && !typing && (
              <button type="button" onClick={() => start(scenario)} className="mx-auto text-[0.75rem] text-ink-faint underline underline-offset-2">
                ↻ replay
              </button>
            )}
          </div>
        </div>
      </div>

      <p className="mx-auto mt-4 max-w-md text-center text-[0.8rem] leading-relaxed text-ink-faint">
        The words, the tone, the booking rules, the emergency triggers — all yours to set.
        Runs on your existing number.
      </p>
    </div>
  );
}
