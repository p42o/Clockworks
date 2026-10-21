"use client";

import { useEffect, useState } from "react";
import { motionPaused, setMotionPaused, subscribeMotion } from "@/lib/motion-pause";

/** One control for looping motion. It sits in the header, not over the page. */
export default function MotionControl() {
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    setPaused(motionPaused());
    return subscribeMotion(setPaused);
  }, []);

  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      document.documentElement.classList.add("motion-ready");
    });
    return () => {
      cancelAnimationFrame(frame);
      document.documentElement.classList.remove("motion-ready");
    };
  }, []);

  return (
    <button
      type="button"
      className="inline-flex min-h-11 shrink-0 items-center rounded-[3px] border hairline bg-cream-bright px-2.5 text-[0.75rem] text-ink sm:px-3 sm:text-[0.8rem]"
      aria-pressed={paused}
      aria-label={paused ? "Play motion" : "Pause motion"}
      onClick={() => setMotionPaused(!paused)}
    >
      <span className="sm:hidden">{paused ? "Play" : "Pause"}</span>
      <span className="hidden sm:inline">{paused ? "Play motion" : "Pause motion"}</span>
    </button>
  );
}
