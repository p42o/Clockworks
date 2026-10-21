"use client";

import { useState } from "react";
import { industries } from "@/lib/copy";

export default function IndustryTabs() {
  const [active, setActive] = useState(0);

  const onKey = (event: React.KeyboardEvent<HTMLButtonElement>, index: number) => {
    const last = industries.length - 1;
    let next = index;
    if (event.key === "ArrowRight") next = index === last ? 0 : index + 1;
    else if (event.key === "ArrowLeft") next = index === 0 ? last : index - 1;
    else if (event.key === "Home") next = 0;
    else if (event.key === "End") next = last;
    else return;
    event.preventDefault();
    setActive(next);
    document.getElementById(`industry-tab-${next}`)?.focus();
  };

  return (
    <div>
      <div className="flex flex-wrap gap-2" role="tablist" aria-label="Industries">
        {industries.map((item, index) => (
          <button
            key={item.id}
            type="button"
            role="tab"
            id={`industry-tab-${index}`}
            aria-selected={index === active}
            aria-controls={`industry-panel-${index}`}
            tabIndex={index === active ? 0 : -1}
            onClick={() => setActive(index)}
            onKeyDown={(event) => onKey(event, index)}
            className={`min-h-11 rounded-[3px] border px-3 py-2 text-[0.92rem] ${
              index === active
                ? "border-copper-deep bg-copper-deep text-cream-bright"
                : "hairline bg-cream-bright text-ink hover:border-copper-deep"
            }`}
          >
            {item.name}
          </button>
        ))}
      </div>
      {industries.map((item, index) => (
        <div
          key={item.id}
          id={`industry-panel-${index}`}
          role="tabpanel"
          aria-labelledby={`industry-tab-${index}`}
          hidden={index !== active}
          className="mt-6 rounded-[4px] border hairline bg-paper-deep p-6 sm:p-8"
        >
          <p className="eyebrow">{item.group === "primary" ? "Primary fit" : "Also a fit"}</p>
          <h3 className="display mt-3 text-4xl">{item.name}</h3>
          <p className="mt-4 text-[0.8rem] font-medium uppercase tracking-[0.14em] text-ink-soft">Agents that fit</p>
          <ul className="mt-3 flex flex-wrap gap-2">
            {item.fit.map((name) => (
              <li key={name} className="rounded-[3px] border hairline bg-cream-bright px-3 py-2 text-[0.9rem]">
                {name}
              </li>
            ))}
          </ul>
          <p className="mt-6 max-w-2xl text-[1.05rem] leading-relaxed text-ink-soft">{item.example}</p>
        </div>
      ))}
    </div>
  );
}
