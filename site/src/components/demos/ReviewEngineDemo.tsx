"use client";

import { useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { CHART } from "./DemoShell";

/** Job closes → review ask → two very different paths. Sample data throughout. */

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
            <p className="font-mono text-[0.62rem] tracking-[0.16em] text-ink-faint">JOB #1147 — CLOSED 3:20 PM</p>
            <p className="text-[0.9rem]">Sump pump replacement — Fridley</p>
          </div>
          <div className="text-right">
            <p className="font-mono text-[0.62rem] tracking-[0.16em] text-ink-faint">YOUR GOOGLE RATING</p>
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

      <p className="mb-3 text-center text-sm text-ink-soft">How did the job actually go? (You decide — the system handles both.)</p>
      <div className="mb-6 flex justify-center gap-3">
        <button
          type="button"
          onClick={() => play("happy")}
          className={`rounded-[3px] border px-4 py-2.5 text-[0.9rem] transition-colors ${
            mood === "happy" ? "border-transparent text-cream-bright" : "hairline bg-cream-bright/70 hover:border-copper/60"
          }`}
          style={mood === "happy" ? { background: CHART.pine } : undefined}
        >
          😊 Customer&rsquo;s thrilled
        </button>
        <button
          type="button"
          onClick={() => play("unhappy")}
          className={`rounded-[3px] border px-4 py-2.5 text-[0.9rem] transition-colors ${
            mood === "unhappy" ? "border-copper bg-copper text-cream-bright" : "hairline bg-cream-bright/70 hover:border-copper/60"
          }`}
        >
          😾 Something went sideways
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
                    Hi Dana — thanks for having us out today. Quick favor: how&rsquo;d we do, 1–5?
                  </p>
                </motion.div>
              )}
              {stage >= 2 && (
                <motion.div initial={reduced ? false : { opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mx-auto max-w-md rounded-[12px] bg-copper px-4 py-3 text-cream-bright">
                  <p className="text-[0.85rem]">{mood === "happy" ? "5! Tech was great, basement's dry." : "2 — the crew left mud on the carpet and I'm pretty frustrated."}</p>
                </motion.div>
              )}
              {stage >= 3 && mood === "happy" && (
                <motion.div initial={reduced ? false : { opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mx-auto max-w-md space-y-3">
                  <div className="rounded-[12px] bg-paper-deep px-4 py-3">
                    <p className="text-[0.85rem] leading-snug">
                      That&rsquo;s great to hear. If you have 60 seconds, a Google review helps our little crew more than you&rsquo;d guess: <span className="underline decoration-copper/60">g.page/r/nelson-plumbing</span>
                    </p>
                  </div>
                  <div className="rounded-[3px] border-2 p-4" style={{ borderColor: CHART.pine, background: "rgba(213,219,213,0.4)" }}>
                    <p className="font-mono text-[0.6rem] tracking-wider" style={{ color: CHART.pine }}>NEW PUBLIC REVIEW — 22 MIN LATER</p>
                    <p className="mt-1 text-[0.9rem]">★★★★★ &ldquo;Fast, tidy, explained everything. Basement is bone dry.&rdquo; — Dana R.</p>
                  </div>
                </motion.div>
              )}
              {stage >= 3 && mood === "unhappy" && (
                <motion.div initial={reduced ? false : { opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mx-auto max-w-md space-y-3">
                  <div className="rounded-[12px] bg-paper-deep px-4 py-3">
                    <p className="text-[0.85rem] leading-snug">
                      I&rsquo;m really sorry about that — that&rsquo;s not how we like to leave a home. I&rsquo;m flagging this straight to the owner right now; expect a personal call today.
                    </p>
                  </div>
                  <div className="rounded-[3px] border-2 border-copper bg-ember/40 p-4">
                    <p className="font-mono text-[0.6rem] tracking-wider text-copper">→ YOUR PHONE, PRIVATELY — NOT GOOGLE</p>
                    <p className="mt-1 text-[0.9rem] leading-snug">
                      ⚠ Dana R. rated job #1147 a 2/5 — &ldquo;mud on the carpet.&rdquo; Full transcript attached. No public review was requested.
                    </p>
                  </div>
                  <p className="text-center text-[0.8rem] text-ink-faint">
                    Public rating: untouched. You get the chance to fix it while it&rsquo;s still a conversation.
                  </p>
                </motion.div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
        {!mood && (
          <p className="pt-10 text-center text-sm text-ink-faint">
            Great companies sit at 4.1 because happy customers are quiet. Asking every time is the whole trick.
          </p>
        )}
      </div>
    </div>
  );
}
