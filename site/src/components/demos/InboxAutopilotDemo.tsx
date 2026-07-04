"use client";

import { useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { CHART } from "./DemoShell";

/** Messages stream in, get read, tagged, drafted, routed. You approve one. */

type Mail = {
  from: string;
  subject: string;
  tag: "LEAD" | "INVOICE" | "SUPPORT" | "JUNK";
  action: string;
  draft?: string;
};

const MAIL: Mail[] = [
  { from: "k.hendricks@…", subject: "Do you guys do sump pumps?", tag: "LEAD", action: "Drafted reply + added to Jobber as lead", draft: "Hi Kara — we do, all the time. Are you seeing water now, or planning ahead? If you send your address I can get you a time this week." },
  { from: "billing@ferguson…", subject: "Invoice 88213 — due Jul 10", tag: "INVOICE", action: "Filed to QuickBooks · due-date reminder set" },
  { from: "dana.r@…", subject: "Re: water heater — one more question", tag: "SUPPORT", action: "Drafted answer from your past jobs + manuals", draft: "Good question — the pilot light staying blue is exactly what you want. The faint rumble the first week is sediment settling; if it's still there in two weeks, text us and we'll swing by." },
  { from: "winner-alert@prizes…", subject: "🎁 You've been selected!!", tag: "JUNK", action: "Archived. You never saw it. You're welcome" },
  { from: "m.okafor@…", subject: "Quote for panel upgrade?", tag: "LEAD", action: "Drafted reply + flagged: mentions '2 other bids' → priority", draft: "Hi Marcus — happy to quote it. Since you're comparing bids: ours will itemize everything, no surprise line items. Any afternoon this week work for a 20-minute look?" },
];

const TAG_COLOR: Record<Mail["tag"], string> = {
  LEAD: CHART.pine,
  INVOICE: CHART.blue,
  SUPPORT: CHART.ochre,
  JUNK: CHART.axis,
};

export default function InboxAutopilotDemo() {
  const reduced = useReducedMotion();
  const [items, setItems] = useState<Mail[]>([]);
  const [running, setRunning] = useState(false);
  const [approved, setApproved] = useState<Set<string>>(new Set());
  const timer = useRef<ReturnType<typeof setTimeout>>(null);

  const run = () => {
    if (running) return;
    setRunning(true);
    setItems([]);
    setApproved(new Set());
    let i = 0;
    const step = () => {
      setItems((cur) => [...cur, MAIL[i]]);
      i += 1;
      if (i < MAIL.length) {
        timer.current = setTimeout(step, reduced ? 0 : 1100);
      } else {
        setRunning(false);
      }
    };
    timer.current = setTimeout(step, reduced ? 0 : 400);
  };

  const leads = items.filter((m) => m.tag === "LEAD").length;

  return (
    <div>
      <div className="mb-5 flex items-center justify-between gap-4">
        <button
          type="button"
          onClick={run}
          disabled={running}
          className="rounded-[3px] bg-copper px-5 py-2.5 font-medium text-cream-bright transition-colors hover:bg-copper-deep disabled:opacity-50"
        >
          {running ? "Morning mail arriving…" : items.length ? "↻ Replay the morning" : "▶ Open Monday's inbox"}
        </button>
        <p className="font-mono text-[0.72rem] tabular-nums text-ink-soft">
          {items.length}/5 handled · <span style={{ color: CHART.pine }}>{leads} leads surfaced</span>
        </p>
      </div>

      <div className="min-h-[300px] space-y-2.5">
        {items.length === 0 && (
          <p className="pt-12 text-center text-sm text-ink-faint">
            Five messages are about to land. Watch what you don&rsquo;t have to do.
          </p>
        )}
        <AnimatePresence>
          {items.map((m) => (
            <motion.div
              key={m.subject}
              initial={reduced ? false : { opacity: 0, y: -12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ type: "spring", stiffness: 300, damping: 26 }}
              className={`rounded-[3px] border hairline px-4 py-3 ${m.tag === "JUNK" ? "opacity-55" : "bg-cream-bright/70"}`}
            >
              <div className="flex items-baseline gap-3">
                <span
                  className="rounded-[2px] px-1.5 py-0.5 font-mono text-[0.6rem] tracking-wider text-cream-bright"
                  style={{ background: TAG_COLOR[m.tag] }}
                >
                  {m.tag}
                </span>
                <span className="truncate text-[0.85rem] font-medium">{m.subject}</span>
                <span className="ml-auto hidden font-mono text-[0.65rem] text-ink-faint sm:inline">{m.from}</span>
              </div>
              <p className="mt-1.5 text-[0.78rem] text-ink-soft">→ {m.action}</p>
              {m.draft && (
                <div className="mt-2 rounded-[2px] border-l-2 border-line bg-paper-deep/60 px-3 py-2">
                  <p className="font-mono text-[0.6rem] tracking-wider text-ink-faint">DRAFT — WAITING FOR YOUR THUMB</p>
                  <p className="mt-1 text-[0.8rem] italic leading-snug text-ink-soft">&ldquo;{m.draft}&rdquo;</p>
                  <button
                    type="button"
                    disabled={approved.has(m.subject)}
                    onClick={() => setApproved((s) => new Set(s).add(m.subject))}
                    className="mt-2 rounded-[2px] px-2.5 py-1 font-mono text-[0.68rem] text-cream-bright transition-opacity disabled:opacity-70"
                    style={{ background: approved.has(m.subject) ? CHART.pine : "#1A1916" }}
                  >
                    {approved.has(m.subject) ? "✓ SENT" : "APPROVE & SEND"}
                  </button>
                </div>
              )}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {items.length === MAIL.length && !running && (
        <p className="mt-4 text-center text-[0.8rem] text-ink-faint">
          Five messages: two leads surfaced and drafted, one bill filed, one customer answered, one
          scam vaporized. Your total involvement: two taps.
        </p>
      )}
    </div>
  );
}
