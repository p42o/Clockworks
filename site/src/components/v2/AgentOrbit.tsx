"use client";

import { useState } from "react";
import { useReducedMotion } from "motion/react";
import { agents } from "@/lib/copy";

/**
 * Clock of the six agents. Names stay upright. A hand sweeps until paused.
 * The buttons are the keyboard control. The ring is decorative.
 */
export default function AgentOrbit() {
  const reduced = useReducedMotion();
  const [paused, setPaused] = useState(false);
  const [active, setActive] = useState(0);
  const agent = agents[active];
  const hold = paused || Boolean(reduced);

  return (
    <div className="mx-auto w-full max-w-[440px]">
      <div className={`orbit-stage ${hold ? "is-paused" : ""}`}>
        <div className="orbit-rotor" aria-hidden>
          <span className="orbit-hand" />
          <span className="orbit-gear orbit-gear-a" />
          <span className="orbit-gear orbit-gear-b" />
        </div>
        <div className="orbit-hub" aria-hidden>
          <span className="display">6</span>
        </div>
        {agents.map((item, index) => {
          const angle = (index / agents.length) * Math.PI * 2 - Math.PI / 2;
          const x = 50 + Math.cos(angle) * 40;
          const y = 50 + Math.sin(angle) * 40;
          return (
            <span
              key={item.id}
              aria-hidden
              className={`orbit-name ${index === active ? "is-on" : ""}`}
              style={{ left: `${x}%`, top: `${y}%` }}
            >
              {item.name}
            </span>
          );
        })}
      </div>

      <div className="mt-2 flex items-center justify-between gap-3">
        <p className="eyebrow">Six jobs, one team</p>
        <button
          type="button"
          className="min-h-8 rounded-[3px] border hairline bg-cream-bright px-3 text-[0.8rem] text-ink"
          aria-pressed={hold}
          onClick={() => setPaused((value) => !value)}
        >
          {hold ? "Play motion" : "Pause motion"}
        </button>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        {agents.map((item, index) => (
          <button
            key={item.id}
            type="button"
            aria-pressed={index === active}
            onClick={() => setActive(index)}
            className={`min-h-11 rounded-[3px] border px-3 py-2 text-[0.85rem] ${
              index === active
                ? "border-copper-deep bg-copper-deep text-cream-bright"
                : "hairline bg-cream-bright text-ink hover:border-copper-deep"
            }`}
          >
            {item.name}
          </button>
        ))}
      </div>

      <p className="mt-4 text-[0.98rem] leading-relaxed text-ink-soft">
        <span className="font-medium text-ink">{agent.name}.</span> {agent.line}
      </p>
    </div>
  );
}
