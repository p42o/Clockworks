"use client";

import { useState } from "react";

const PRESETS = {
  "Warm & neighborly": "Hi there! You've reached Nelson Plumbing — I'm the office assistant. Sorry about the water heater, that's no fun at all. Let's get someone out to you: is tomorrow morning too late, or is this a tonight situation?",
  "Brisk & professional": "Nelson Plumbing. I can schedule that water heater repair — first opening is tomorrow 8:30 AM. Shall I book it, and is the unit gas or electric?",
  "Bilingual (ES)": "¡Hola! Gracias por contactar a Nelson Plumbing. Lamento lo del calentador de agua — ¿es una emergencia ahora mismo, o le sirve una cita mañana por la mañana?",
} as const;

export default function SteerDemo() {
  const [tone, setTone] = useState<keyof typeof PRESETS>("Warm & neighborly");
  return (
    <div className="max-w-2xl rounded-[4px] border hairline bg-cream-bright/70 p-5">
      <p className="font-mono text-[0.62rem] tracking-[0.16em] text-ink-faint">
        PERSONALITY DIAL — SAME QUESTION: &ldquo;my water heater died, can someone come?&rdquo;
      </p>
      <div className="mt-3 flex flex-wrap gap-2" role="tablist" aria-label="Agent tone">
        {(Object.keys(PRESETS) as (keyof typeof PRESETS)[]).map((k) => (
          <button
            key={k}
            role="tab"
            aria-selected={tone === k}
            onClick={() => setTone(k)}
            className={`rounded-[3px] border px-3 py-1.5 text-[0.8rem] transition-colors ${
              tone === k ? "border-copper bg-copper text-cream-bright" : "hairline text-ink-soft hover:border-copper/60"
            }`}
          >
            {k}
          </button>
        ))}
      </div>
      <div className="mt-4 rounded-[12px] bg-paper-deep px-4 py-3 text-[0.9rem] leading-relaxed">
        {PRESETS[tone]}
      </div>
      <p className="mt-3 text-[0.75rem] text-ink-faint">
        Sample replies for a fictional shop. One plain-English setting changed — nothing rebuilt.
      </p>
    </div>
  );
}
