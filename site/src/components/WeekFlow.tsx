"use client";

import { useEffect, useRef, useState } from "react";
import {
  motion,
  useReducedMotion,
  useScroll,
  useTransform,
  type MotionValue,
} from "motion/react";

/**
 * Signature interactive #2 — "Your Tuesday, before and after."
 * A scatter of the real messes of an owner's day flies, chip by chip, into a
 * calm vertical timeline as you scroll. Scroll back and the chaos returns.
 * Reduced-motion users get an instant Before/After toggle instead.
 */

type Moment = {
  time: string;
  before: string;
  after: string;
  scatter: { x: number; y: number; r: number }; // % offsets in the stage
};

const MOMENTS: Moment[] = [
  { time: "7:58a", before: "Missed a call — you were under a sink", after: "Answered by text in 9 seconds. Booked for Thursday 9am", scatter: { x: -38, y: -32, r: -9 } },
  { time: "9:15a", before: "Quote #241 has sat in “Sent” for 6 days", after: "Follow-up #2 went out. Customer replied: “let’s do it”", scatter: { x: 30, y: -38, r: 7 } },
  { time: "11:30a", before: "“Are you still coming today?” — unanswered", after: "On-my-way text sent itself when you left the shop", scatter: { x: -27, y: -6, r: -5 } },
  { time: "1:45p", before: "Invoice #1108 — 31 days unpaid", after: "Friendly nudge sent. Paid by card at 2:12p", scatter: { x: 36, y: -4, r: 10 } },
  { time: "3:20p", before: "Forgot to ask for the review. Again", after: "Review request texted when the job closed — ★★★★★", scatter: { x: -34, y: 24, r: 8 } },
  { time: "4:40p", before: "Voicemail full. Two leads gone for good", after: "Every call caught, transcribed, and in your inbox", scatter: { x: 28, y: 28, r: -7 } },
  { time: "6:30p", before: "Quoting at the kitchen table. Again", after: "Home. Phone quiet. It’s all handled", scatter: { x: 2, y: 44, r: -4 } },
];

function Chip({
  m,
  i,
  progress,
}: {
  m: Moment;
  i: number;
  progress: MotionValue<number>;
}) {
  // Each chip settles during its own slice of the scroll, oldest first.
  const start = 0.04 + i * 0.09;
  const end = start + 0.34;
  const t = useTransform(progress, [start, end], [0, 1], { clamp: true });

  const x = useTransform(t, (v) => `${m.scatter.x * (1 - ease(v))}%`);
  const y = useTransform(t, (v) => `${m.scatter.y * (1 - ease(v))}%`);
  const rotate = useTransform(t, (v) => m.scatter.r * (1 - ease(v)));
  const beforeOpacity = useTransform(t, [0.45, 0.62], [1, 0]);
  const afterOpacity = useTransform(t, [0.55, 0.75], [0, 1]);
  const borderColor = useTransform(t, [0.5, 0.8], ["rgba(212,88,42,0.5)", "rgba(60,90,74,0.55)"]);
  const bg = useTransform(t, [0.5, 0.8], ["rgba(245,241,232,0.94)", "rgba(213,219,213,0.5)"]);

  return (
    <div className="relative" style={{ zIndex: 20 - i }}>
      <motion.div
        style={{ x, y, rotate, borderColor, backgroundColor: bg }}
        className="relative rounded-[3px] border px-3.5 py-2.5 shadow-[0_10px_24px_-16px_rgba(26,25,22,0.45)] backdrop-blur-[2px] will-change-transform"
      >
        <div className="flex items-baseline gap-3">
          <span className="font-mono text-[0.7rem] tracking-wider text-ink-faint">{m.time}</span>
          <div className="relative min-h-[1.2em] flex-1 text-[0.86rem] leading-snug">
            <motion.span style={{ opacity: beforeOpacity }} className="absolute inset-0 text-ink-soft">
              {m.before}
            </motion.span>
            <motion.span style={{ opacity: afterOpacity }} className="text-patina block font-medium">
              {m.after}
            </motion.span>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

function ease(v: number) {
  return 1 - Math.pow(1 - v, 3);
}

function StaticVariant() {
  const [after, setAfter] = useState(true);
  return (
    <div>
      <div className="mb-6 inline-flex rounded-[3px] border hairline p-1" role="tablist" aria-label="Before or after">
        {(["Before", "After"] as const).map((label) => {
          const active = (label === "After") === after;
          return (
            <button
              key={label}
              role="tab"
              aria-selected={active}
              onClick={() => setAfter(label === "After")}
              className={`rounded-[2px] px-4 py-1.5 text-sm transition-colors ${
                active ? "bg-ink text-paper" : "text-ink-soft"
              }`}
            >
              {label}
            </button>
          );
        })}
      </div>
      <ul className="space-y-3">
        {MOMENTS.map((m) => (
          <li key={m.time} className="flex items-baseline gap-3 rounded-[3px] border hairline bg-cream-bright/70 px-4 py-3">
            <span className="font-mono text-[0.7rem] tracking-wider text-ink-faint">{m.time}</span>
            <span className={after ? "text-patina font-medium" : "text-ink-soft"}>
              {after ? m.after : m.before}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function WeekFlow() {
  const sectionRef = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();
  // SSR always renders the animated variant; swap to the static toggle only
  // after mount so hydration matches and useScroll's target ref always exists.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const showStatic = mounted && reduced;

  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start start", "end end"],
  });
  const label = useTransform(scrollYProgress, (v): string => (v < 0.45 ? "BEFORE" : "AFTER"));
  const labelColor = useTransform(scrollYProgress, [0.4, 0.6], ["#d4582a", "#3c5a4a"]);
  const hoursFound = useTransform(scrollYProgress, (v) =>
    Math.round(Math.min(Math.max((v - 0.08) / 0.72, 0), 1) * 9),
  );
  // must live above the showStatic early return — hooks can't sit in the JSX branch
  const hintOpacity = useTransform(scrollYProgress, [0.7, 0.85], [1, 0]);

  if (showStatic) {
    return (
      <div ref={sectionRef} className="mx-auto max-w-2xl px-5 py-16">
        <StaticVariant />
      </div>
    );
  }

  return (
    <div ref={sectionRef} className="relative h-[280vh]">
      <div className="sticky top-0 flex min-h-dvh flex-col justify-center overflow-clip py-24">
        <div className="mx-auto w-full max-w-2xl px-5">
          <div className="mb-8 flex items-center justify-between">
            <motion.span
              style={{ color: labelColor }}
              className="font-mono text-[0.75rem] font-medium tracking-[0.2em]"
            >
              <motion.span>{label}</motion.span>
            </motion.span>
            <span className="font-mono text-[0.75rem] tracking-wider text-ink-faint">
              <motion.span className="text-patina font-medium">{hoursFound}</motion.span> HRS FOUND
            </span>
          </div>

          {/* the timeline rail */}
          <div className="relative">
            <div className="absolute -left-4 top-0 h-full w-px bg-line sm:-left-8" aria-hidden />
            <div className="space-y-3">
              {MOMENTS.map((m, i) => (
                <Chip key={m.time} m={m} i={i} progress={scrollYProgress} />
              ))}
            </div>
          </div>

          <motion.p
            style={{ opacity: hintOpacity }}
            className="mt-10 text-center text-sm text-ink-faint"
          >
            Keep scrolling — watch the day sort itself out.
          </motion.p>
        </div>
      </div>
    </div>
  );
}
