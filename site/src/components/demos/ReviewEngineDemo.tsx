"use client";

import { useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { CHART } from "./DemoShell";

/** Job closes → same review ask with both options → customer chooses. Sample data throughout. */

export default function ReviewEngineDemo() {
  const reduced = useReducedMotion();
  const [mood, setMood] = useState<"happy" | "unhappy" | null>(null);
  const [stage, setStage] = useState(0);
  const [rating, setRating] = useState(4.3);
  const [count, setCount] = useState(87);

  const play = (m: "happy" | "unhappy") => {
    setMood(m);
    setStage(0);
    const delays = reduced ? [0, 0, 0] : [600, 1600, 2800];
    delays.forEach((d, i) => setTimeout(() => setStage(i + 1), d));
    if (m === "happy") {
      setTimeout(() => {
        setRating(4.4);
        setCount(88);
      }, reduced ? 0 : 3200);
    }
  };

  return (
    <div>
      <div className="mb-5 rounded-[3px] border hairline bg-cream-bright/70 px-4 py-3">
        <div className="flex items-center justify-between">
          <div>
            <p className="font-mono text-[0.62rem] tracking-[0.16em] text-ink-faint">SAMPLE JOB #1147: CLOSED 3:20 PM</p>
            <p className="text-[0.9rem]">Sump pump replacement, Fridley</p>
          </div>
          <div className="text-right">
            <p className="font-mono text-[0.62rem] tracking-[0.16em] text-ink-faint">SAMPLE GOOGLE RATING</p>
            <p className="font-mono text-xl tabular-nums">
              <motion.span
                key={rating}
                initial={reduced ? false : { scale: 1.3, color: CHART.pine }}
                animate={{ scale: 1, color: "#1A1916" }}
                className="inline-block"
              >
                ★ {rating.toFixed(1)}
              </motion.span>
              <span className="ml-1 text-[0.72rem] text-ink-faint">({count})</span>
            </p>
          </div>
        </div>
      </div>

      <p className="mb-3 text-center text-sm text-ink-soft">Every customer gets both options. Choose a sample response.</p>
      <div className="mb-6 flex justify-center gap-3">
        <button
          type="button"
          onClick={() => play("happy")}
          className={`rounded-[3px] border px-4 py-2.5 text-[0.9rem] transition-colors ${
            mood === "happy" ? "border-transparent text-cream-bright" : "hairline bg-cream-bright/70 hover:border-copper/60"
          }`}
          style={mood === "happy" ? { background: CHART.pine } : undefined}
        >
          Google review example
        </button>
        <button
          type="button"
          onClick={() => play("unhappy")}
          className={`rounded-[3px] border px-4 py-2.5 text-[0.9rem] transition-colors ${
            mood === "unhappy" ? "border-copper bg-copper text-cream-bright" : "hairline bg-cream-bright/70 hover:border-copper/60"
          }`}
        >
          Private note example
        </button>
      </div>

      <div className="min-h-[240px] space-y-3">
        <AnimatePresence mode="wait">
          {mood && (
            <motion.div
              key={mood}
              initial={reduced ? false : { opacity: 0 }}
              animate={{ opacity: 1 }}
              className="space-y-3"
            >
              {stage >= 1 && (
                <motion.div initial={reduced ? false : { opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mx-auto max-w-md rounded-[12px] bg-paper-deep px-4 py-3">
                  <p className="font-mono text-[0.6rem] tracking-wider text-ink-faint">TEXT → CUSTOMER, 6 MIN AFTER CLOSE</p>
                  <p className="mt-1 text-[0.85rem] leading-snug">
                    Thanks for having me out today. Leave a Google review: g.page/r/sample-business. Or reply here with a private note. Both options are open to everyone.
                  </p>
                </motion.div>
              )}
              {stage >= 2 && (
                <motion.div initial={reduced ? false : { opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mx-auto max-w-md rounded-[12px] bg-copper px-4 py-3 text-cream-bright">
                  <p className="text-[0.85rem]">{mood === "happy" ? "I chose the Google link. Both options were in my message." : "I chose a private note. The Google link is in my message too."}</p>
                </motion.div>
              )}
              {stage >= 3 && mood === "happy" && (
                <motion.div initial={reduced ? false : { opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mx-auto max-w-md space-y-3">
                  <div className="rounded-[12px] bg-paper-deep px-4 py-3">
                    <p className="text-[0.85rem] leading-snug">
                      The same Google review link and private reply option go to every customer: <span className="underline decoration-copper/60">g.page/r/sample-business</span>
                    </p>
                  </div>
                  <div className="rounded-[3px] border-2 p-4" style={{ borderColor: CHART.pine, background: "rgba(213,219,213,0.4)" }}>
                    <p className="font-mono text-[0.6rem] tracking-wider" style={{ color: CHART.pine }}>SAMPLE: CUSTOMER CHOOSES GOOGLE</p>
                    <p className="mt-1 text-[0.9rem]">The customer can share any rating or experience on Google.</p>
                  </div>
                </motion.div>
              )}
              {stage >= 3 && mood === "unhappy" && (
                <motion.div initial={reduced ? false : { opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mx-auto max-w-md space-y-3">
                  <div className="rounded-[12px] bg-paper-deep px-4 py-3">
                    <p className="text-[0.85rem] leading-snug">
                      Thanks for the note. I&rsquo;ll follow up personally. Your Google review link is still available: g.page/r/sample-business.
                    </p>
                  </div>
                  <div className="rounded-[3px] border-2 border-copper bg-ember/40 p-4">
                    <p className="font-mono text-[0.6rem] tracking-wider text-copper">SAMPLE: CUSTOMER CHOOSES A PRIVATE NOTE</p>
                    <p className="mt-1 text-[0.9rem] leading-snug">
                      The customer replies privately by choice. The same message already offered a Google review link alongside this option.
                    </p>
                  </div>
                  <p className="text-center text-[0.8rem] text-ink-faint">
                    Both options stay available, regardless of sentiment or star rating.
                  </p>
                </motion.div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
        {!mood && (
          <p className="pt-10 text-center text-sm text-ink-faint">
            I send the same ask to every customer. Google review or private note: the customer chooses.
          </p>
        )}
      </div>
    </div>
  );
}
