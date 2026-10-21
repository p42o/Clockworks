"use client";

import { useState } from "react";
import { faq } from "@/lib/copy";

export default function FaqList() {
  const [open, setOpen] = useState<number | null>(0);

  return (
    <div className="divide-y hairline border-y">
      {faq.map((item, index) => {
        const expanded = open === index;
        const panelId = `faq-panel-${index}`;
        const buttonId = `faq-button-${index}`;
        return (
          <div key={item.q} className="faq-item">
            <h3 className="display text-2xl sm:text-3xl">
              <button
                id={buttonId}
                type="button"
                className="flex min-h-11 w-full items-center justify-between gap-4 py-5 text-left"
                aria-expanded={expanded}
                aria-controls={panelId}
                onClick={() => setOpen(expanded ? null : index)}
              >
                {item.q}
                <span aria-hidden className="font-mono text-base text-copper-deep">
                  {expanded ? "Hide" : "Show"}
                </span>
              </button>
            </h3>
            <div id={panelId} role="region" aria-labelledby={buttonId} hidden={!expanded} className="pb-6">
              <p className="max-w-3xl leading-relaxed text-ink-soft">{item.a}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
