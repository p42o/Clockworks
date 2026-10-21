"use client";

import { useEffect, useState } from "react";
import { agents } from "@/lib/copy";
import { motionPaused } from "@/lib/motion-pause";
import LogoMark from "@/components/LogoMark";

/**
 * Six agent cards and a hand-off rail. The header owns pause.
 * Looping motion stays off until after first paint, and again when
 * html.motion-paused is set. Visible text does not read reduced-motion
 * during render, so the first client paint matches the server.
 */
export default function AgentOrbit() {
  const [active, setActive] = useState(0);
  const [painted, setPainted] = useState(false);
  const [locked, setLocked] = useState(false);
  const count = agents.length;
  const next = (active + 1) % count;
  const unit = 100 / (count - 1);
  const returning = next === 0;
  const linkStyle = returning
    ? { top: "0%", height: "0%" }
    : { top: `${active * unit}%`, height: `${unit}%` };
  const beadTop = returning ? "0%" : `${next * unit}%`;

  useEffect(() => {
    let second = 0;
    const first = requestAnimationFrame(() => {
      second = requestAnimationFrame(() => setPainted(true));
    });
    return () => {
      cancelAnimationFrame(first);
      cancelAnimationFrame(second);
    };
  }, []);

  useEffect(() => {
    if (!painted || locked) return;
    const id = window.setInterval(() => {
      if (motionPaused()) return;
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
      setActive((current) => (current + 1) % count);
    }, 3200);
    return () => window.clearInterval(id);
  }, [painted, locked, count]);

  const hold = (index: number) => {
    setLocked(true);
    setActive(index);
  };

  return (
    <div className={`handoff-board bg-paper-deep ${painted ? "" : "is-paused"}`}>
      <div className="flex items-center gap-3">
        <span className="handoff-hub" aria-hidden>
          <LogoMark className="h-8 w-8" />
        </span>
        <div>
          <p className="eyebrow">Six jobs, one team</p>
          <p className="mt-1 text-[0.92rem] leading-snug text-ink-soft">
            Work passes from one agent to the next. You still approve what goes out.
          </p>
        </div>
      </div>

      <div className="handoff-list" role="group" aria-label="The six agents">
        <div className="handoff-rail" aria-hidden>
          <span className={`handoff-link ${returning ? "is-return" : ""}`} style={linkStyle} />
          <span className="handoff-bead" style={{ top: beadTop }} />
        </div>
        {agents.map((item, index) => {
          const on = index === active;
          return (
            <button
              key={item.id}
              type="button"
              aria-pressed={on}
              onClick={() => hold(index)}
              onFocus={() => hold(index)}
              className={`handoff-card ${on ? "is-on" : ""}`}
            >
              <span className="handoff-icon" aria-hidden>
                <AgentIcon id={item.id} />
              </span>
              <span className="min-w-0 text-left">
                <span className="flex items-baseline justify-between gap-3">
                  <span className="font-medium text-ink">{item.name}</span>
                  <span className="font-mono text-[0.65rem] tracking-[0.14em] text-ink-soft">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                </span>
                <span className="mt-1 block font-mono text-[0.65rem] tracking-[0.14em] text-ink-soft">
                  Example
                </span>
                <span className="mt-0.5 block text-[0.86rem] leading-snug text-ink-soft">{item.task}</span>
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function AgentIcon({ id }: { id: string }) {
  const props = {
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.6,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true,
  };
  if (id === "call-catch") {
    return (
      <svg {...props}>
        <path d="M7 4.5h3.1l1.1 2.8-1.9 1a11 11 0 0 0 5.3 5.3l1-1.9 2.8 1.1V16a1.7 1.7 0 0 1-1.9 1.7A14.2 14.2 0 0 1 5.3 6.4 1.7 1.7 0 0 1 7 4.5Z" />
      </svg>
    );
  }
  if (id === "quote-chaser") {
    return (
      <svg {...props}>
        <path d="M7 3.5h7l4 4V20.5H7Z" />
        <path d="M14 3.5v4h4M9.5 12h5M9.5 15.5h5" />
      </svg>
    );
  }
  if (id === "review-engine") {
    return (
      <svg {...props}>
        <path d="M5 6.5h14v8.5H9.2L5 18.2Z" />
      </svg>
    );
  }
  if (id === "paper-mover") {
    return (
      <svg {...props}>
        <path d="M7 3.5h10v17H7Z" />
        <path d="M9.5 8h5M9.5 11.5h5M9.5 15h3" />
      </svg>
    );
  }
  if (id === "intel-desk") {
    return (
      <svg {...props}>
        <circle cx="11" cy="11" r="4.5" />
        <path d="M14.5 14.5 19 19" />
      </svg>
    );
  }
  return (
    <svg {...props}>
      <path d="M4 14.5h16M6.5 14.5V8.5h11v6M9 18.5v-4M15 18.5v-4" />
    </svg>
  );
}
