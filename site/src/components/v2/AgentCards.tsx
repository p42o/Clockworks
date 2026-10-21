"use client";

import { useState } from "react";
import { agents } from "@/lib/copy";

export default function AgentCards() {
  const [open, setOpen] = useState<string | null>(agents[0].id);

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {agents.map((agent) => {
        const expanded = open === agent.id;
        const panelId = `${agent.id}-example`;
        return (
          <article key={agent.id} className="card-lift rounded-[4px] border hairline bg-cream-bright">
            <button
              type="button"
              className="flex min-h-11 w-full items-start justify-between gap-3 px-5 py-5 text-left"
              aria-expanded={expanded}
              aria-controls={panelId}
              onClick={() => setOpen(expanded ? null : agent.id)}
            >
              <span>
                <span className="display block text-3xl">{agent.name}</span>
                <span className="mt-2 block text-[0.98rem] leading-relaxed text-ink-soft">{agent.line}</span>
              </span>
              <span className="mt-1 font-mono text-[0.7rem] text-copper-deep" aria-hidden>
                {expanded ? "Hide" : "Example"}
              </span>
            </button>
            <div id={panelId} hidden={!expanded} className="border-t hairline-soft px-5 py-4">
              <p className="eyebrow">Example task</p>
              <p className="mt-2 text-ink">{agent.task}</p>
              <p className="eyebrow mt-4">Example draft</p>
              <p className="mt-2 leading-relaxed text-ink-soft">&ldquo;{agent.draft}&rdquo;</p>
              <p className="mt-3 text-sm text-ink-faint">The owner approves what goes out.</p>
            </div>
          </article>
        );
      })}
    </div>
  );
}
