"use client";

import { useState } from "react";
import { CHART } from "./DemoShell";
import { LineChart } from "./ChartBits";

/**
 * Market & competitor intel desk — the view big companies pay analysts for,
 * scaled to one shop. Everything here is fabricated sample data on purpose.
 */

const COMPETITORS = [
  { name: "Competitor A (Plymouth)", service: "Water heater install", price: "$1,850", change: "+$100 on Jun 18", dir: "up" },
  { name: "Competitor B (Osseo)", service: "Water heater install", price: "$1,690", change: "unchanged 90 days", dir: "flat" },
  { name: "Competitor C (Rogers)", service: "Drain cleaning", price: "$249 → \"from $299\"", change: "+$50 on Jul 1", dir: "up" },
  { name: "Competitor B (Osseo)", service: "AC tune-up promo", price: "$89", change: "new offer this week", dir: "new" },
] as const;

const WEEKS = ["May 24", "May 31", "Jun 7", "Jun 14", "Jun 21", "Jun 28", "Jul 3"];
const DEMAND = [42, 45, 51, 58, 73, 96, 118];

const MATERIALS = [
  { name: "Copper pipe (¾\")", trend: "+8% this quarter", note: "supplier list price index", dir: "up" },
  { name: "PVC schedule 40", trend: "−2% this quarter", note: "stable", dir: "down" },
  { name: "50-gal gas water heater", trend: "+4% since April", note: "two suppliers raised together", dir: "up" },
] as const;

export default function IntelDeskDemo() {
  const [tab, setTab] = useState<"competitors" | "demand" | "materials">("competitors");

  return (
    <div>
      <div className="mb-5 flex gap-1 rounded-[3px] border hairline p-1" role="tablist" aria-label="Intel views">
        {(
          [
            ["competitors", "Competitor watch"],
            ["demand", "Demand signals"],
            ["materials", "Material costs"],
          ] as const
        ).map(([k, label]) => (
          <button
            key={k}
            role="tab"
            aria-selected={tab === k}
            onClick={() => setTab(k)}
            className={`flex-1 rounded-[2px] px-3 py-2 text-[0.8rem] transition-colors ${
              tab === k ? "bg-ink text-paper" : "text-ink-soft hover:text-ink"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === "competitors" && (
        <div>
          <div className="overflow-x-auto rounded-[3px] border hairline">
            <table className="w-full min-w-[520px] text-left text-[0.82rem]">
              <thead>
                <tr className="border-b hairline bg-paper-deep/50 font-mono text-[0.62rem] tracking-[0.14em] text-ink-faint">
                  <th className="px-3 py-2 font-medium">WHO</th>
                  <th className="px-3 py-2 font-medium">SERVICE</th>
                  <th className="px-3 py-2 font-medium">PUBLISHED PRICE</th>
                  <th className="px-3 py-2 font-medium">CHANGE</th>
                </tr>
              </thead>
              <tbody>
                {COMPETITORS.map((c, i) => (
                  <tr key={i} className="border-b hairline-soft last:border-0">
                    <td className="px-3 py-2.5 text-ink-soft">{c.name}</td>
                    <td className="px-3 py-2.5">{c.service}</td>
                    <td className="px-3 py-2.5 font-mono tabular-nums">{c.price}</td>
                    <td className="px-3 py-2.5">
                      <span
                        className="rounded-[2px] px-1.5 py-0.5 font-mono text-[0.65rem]"
                        style={{
                          color: c.dir === "up" ? CHART.copper : c.dir === "new" ? CHART.blue : CHART.axis,
                          background: c.dir === "up" ? "rgba(212,88,42,0.1)" : c.dir === "new" ? "rgba(61,107,168,0.1)" : "rgba(110,106,95,0.1)",
                        }}
                      >
                        {c.dir === "up" ? "▲ " : c.dir === "new" ? "★ " : "— "}
                        {c.change}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-3 text-[0.8rem] leading-relaxed text-ink-soft">
            Checked automatically from public pages, weekly. When the guy across town raises his
            water-heater price $100, you find out that week — not from a customer six months later.
          </p>
        </div>
      )}

      {tab === "demand" && (
        <div>
          <div className="rounded-[3px] border hairline bg-cream-bright/60 p-4">
            <p className="mb-2 font-mono text-[0.62rem] tracking-[0.16em] text-ink-faint">
              LOCAL SEARCH INTEREST — &ldquo;AC REPAIR NEAR ME&rdquo; (NW METRO, INDEXED)
            </p>
            <LineChart labels={WEEKS} series={[{ name: "Search interest", color: CHART.copper, values: DEMAND }]} />
          </div>
          <div className="mt-3 rounded-[3px] border-l-2 border-copper bg-ember/30 px-4 py-3">
            <p className="text-[0.82rem] leading-relaxed">
              <strong>What the desk would tell you:</strong> demand has nearly tripled in six weeks
              with the heat — this is the fortnight to push AC tune-up offers and staff the phones
              (or let Call Catch hold the overflow). Big outfits have an analyst for this. You&rsquo;d have a Tuesday email.
            </p>
          </div>
        </div>
      )}

      {tab === "materials" && (
        <div className="space-y-3">
          {MATERIALS.map((m) => (
            <div key={m.name} className="flex items-center justify-between rounded-[3px] border hairline bg-cream-bright/70 px-4 py-3">
              <div>
                <p className="text-[0.88rem]">{m.name}</p>
                <p className="text-[0.72rem] text-ink-faint">{m.note}</p>
              </div>
              <span
                className="font-mono text-[0.8rem] tabular-nums"
                style={{ color: m.dir === "up" ? CHART.copper : CHART.pine }}
              >
                {m.dir === "up" ? "▲" : "▼"} {m.trend}
              </span>
            </div>
          ))}
          <p className="pt-1 text-[0.8rem] leading-relaxed text-ink-soft">
            Quote with this morning&rsquo;s costs, not last quarter&rsquo;s. When copper jumps 8%,
            your water-heater quote should know before you eat the margin.
          </p>
        </div>
      )}
    </div>
  );
}
