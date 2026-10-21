"use client";

import { useEffect, useState } from "react";
import { useReducedMotion } from "motion/react";
import { jobExample } from "@/lib/copy";

export default function JobWalk() {
  const reduced = useReducedMotion();
  const [step, setStep] = useState(0);
  const [paused, setPaused] = useState(Boolean(reduced));
  const total = jobExample.steps.length;

  useEffect(() => {
    if (paused || reduced) return;
    const id = window.setInterval(() => {
      setStep((s) => (s + 1) % total);
    }, 4200);
    return () => window.clearInterval(id);
  }, [paused, reduced, total]);

  const go = (next: number) => {
    setPaused(true);
    setStep((next + total) % total);
  };

  return (
    <div className="rounded-[4px] border hairline bg-cream-bright p-5 sm:p-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="font-mono text-[0.7rem] tracking-[0.16em] text-copper-deep">
          {jobExample.kicker.toUpperCase()}
        </p>
        <button
          type="button"
          className="min-h-8 rounded-[3px] border hairline px-3 text-[0.8rem]"
          aria-pressed={paused || Boolean(reduced)}
          onClick={() => setPaused((v) => !v)}
        >
          {paused || reduced ? "Play example" : "Pause example"}
        </button>
      </div>
      <h3 className="display mt-3 text-3xl sm:text-4xl">{jobExample.title}</h3>
      <p className="mt-3 max-w-xl text-ink-soft">{jobExample.note}</p>

      <div className="mt-6 flex flex-wrap gap-2" role="tablist" aria-label="Example steps">
        {jobExample.steps.map((s, i) => (
          <button
            key={s.agent}
            type="button"
            role="tab"
            aria-selected={i === step}
            id={`job-tab-${i}`}
            aria-controls={`job-panel-${i}`}
            tabIndex={i === step ? 0 : -1}
            onClick={() => go(i)}
            onKeyDown={(e) => {
              if (e.key === "ArrowRight") {
                e.preventDefault();
                go(step + 1);
                document.getElementById(`job-tab-${(step + 1) % total}`)?.focus();
              }
              if (e.key === "ArrowLeft") {
                e.preventDefault();
                go(step - 1);
                document.getElementById(`job-tab-${(step - 1 + total) % total}`)?.focus();
              }
            }}
            className={`min-h-11 rounded-[3px] border px-3 py-2 text-[0.85rem] ${
              i === step
                ? "border-copper-deep bg-ink text-paper"
                : "hairline bg-paper text-ink-soft hover:border-copper-deep"
            }`}
          >
            {s.agent}
          </button>
        ))}
      </div>

      {jobExample.steps.map((item, index) => (
        <div
          key={item.agent}
          id={`job-panel-${index}`}
          role="tabpanel"
          aria-labelledby={`job-tab-${index}`}
          hidden={index !== step}
          className="mt-6 grid gap-4 border-t hairline-soft pt-6 md:grid-cols-[0.8fr_1.2fr]"
        >
          <div>
            <p className="eyebrow">Step {index + 1} of {total}</p>
            <p className="display mt-2 text-3xl">{item.agent}</p>
            <p className="mt-3 leading-relaxed text-ink-soft">{item.does}</p>
          </div>
          <div className="rounded-[3px] border hairline bg-paper p-5">
            <p className="eyebrow">Example draft</p>
            <p className="mt-3 font-display text-2xl leading-snug text-ink">&ldquo;{item.draft}&rdquo;</p>
            <p className="mt-4 text-sm text-ink-faint">Example only. You approve it before it goes anywhere.</p>
          </div>
        </div>
      ))}
    </div>
  );
}
