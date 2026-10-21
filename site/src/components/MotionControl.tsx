"use client";

import { useEffect, useState } from "react";
import { motionPaused, setMotionPaused, subscribeMotion } from "@/lib/motion-pause";

/** One control for the hero glow and the chat launcher pulse. */
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
      className="fixed bottom-5 left-5 z-[70] min-h-11 rounded-[3px] border hairline bg-paper/95 px-3 text-[0.8rem] text-ink shadow-[0_8px_24px_-16px_rgba(14,14,12,0.6)]"
      aria-pressed={paused}
      onClick={() => setMotionPaused(!paused)}
    >
      {paused ? "Play motion" : "Pause motion"}
    </button>
  );
}
