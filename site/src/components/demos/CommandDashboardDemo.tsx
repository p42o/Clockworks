"use client";

import { useState } from "react";
import { CHART } from "./DemoShell";
import { BarRows, LineChart, StatTile } from "./ChartBits";

/**
 * The owner's morning view — every number is deterministic sample data.
 * Charts follow the dataviz mark specs; range filter re-slices the series.
 */

const DAYS = ["Jun 20", "Jun 21", "Jun 22", "Jun 23", "Jun 24", "Jun 25", "Jun 26", "Jun 27", "Jun 28", "Jun 29", "Jun 30", "Jul 1", "Jul 2", "Jul 3"];
const CAUGHT = [6, 4, 7, 5, 9, 11, 3, 6, 8, 7, 10, 12, 9, 8];
const MISSED_BEFORE = [4, 3, 5, 4, 6, 8, 2, 4, 5, 5, 7, 8, 6, 5];

const FEED = [
  "7:58a — Missed call caught → booked Thu 9:00 (Maple Grove)",
  "9:15a — Quote #241 follow-up #2 sent (day-7 rule)",
  "9:40a — Review posted ★★★★★ — job #1141",
  "11:02a — Invoice #1108 reminder sent · pay link opened",
  "12:15p — After-hours transcript from last night filed",
];

export default function CommandDashboardDemo() {
  const [range, setRange] = useState<7 | 14>(14);
  const days = DAYS.slice(-range);
  const caught = CAUGHT.slice(-range);
  const missed = MISSED_BEFORE.slice(-range);
  const totCaught = caught.reduce((a, b) => a + b, 0);

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <p className="text-[0.85rem] text-ink-soft">Your whole week, at a glance — the two-minute morning read.</p>
        <div className="flex rounded-[3px] border hairline p-0.5" role="tablist" aria-label="Date range">
          {([7, 14] as const).map((r) => (
            <button
              key={r}
              role="tab"
              aria-selected={range === r}
              onClick={() => setRange(r)}
              className={`rounded-[2px] px-3 py-1 font-mono text-[0.7rem] ${range === r ? "bg-ink text-paper" : "text-ink-soft"}`}
            >
              {r}D
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatTile label="Calls caught" value={String(totCaught)} delta={`would've missed ${missed.reduce((a, b) => a + b, 0)}`} good />
        <StatTile label="Jobs booked" value={range === 7 ? "11" : "19"} delta="+4 vs prior period" good />
        <StatTile label="Cash outstanding" value="$7,410" delta="3 invoices > 30 days" />
        <StatTile label="New reviews" value={range === 7 ? "4" : "7"} delta="★ 4.4 average" good />
      </div>

      <div className="mt-6 rounded-[3px] border hairline bg-cream-bright/60 p-4">
        <p className="mb-2 font-mono text-[0.62rem] tracking-[0.16em] text-ink-faint">
          CALLS — CAUGHT BY THE SYSTEM VS. WOULD-HAVE-MISSED
        </p>
        <LineChart
          labels={days}
          series={[
            { name: "Caught & handled", color: CHART.copper, values: caught },
            { name: "Would-have-missed (est.)", color: CHART.blue, values: missed },
          ]}
        />
      </div>

      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <div className="rounded-[3px] border hairline bg-cream-bright/60 p-4">
          <p className="mb-3 font-mono text-[0.62rem] tracking-[0.16em] text-ink-faint">REVENUE BY SERVICE — THIS WEEK</p>
          <BarRows
            rows={[
              { label: "Water heaters", value: 9200 },
              { label: "Drain / sewer", value: 6100 },
              { label: "Repipes", value: 4800 },
              { label: "Fixtures / misc", value: 2350 },
            ]}
          />
        </div>
        <div className="rounded-[3px] border hairline bg-cream-bright/60 p-4">
          <p className="mb-2 font-mono text-[0.62rem] tracking-[0.16em] text-ink-faint">WHAT THE MACHINE DID TODAY</p>
          <ul className="space-y-1.5">
            {FEED.map((f) => (
              <li key={f} className="text-[0.78rem] leading-snug text-ink-soft">{f}</li>
            ))}
          </ul>
        </div>
      </div>

      <p className="mt-4 text-center text-[0.8rem] text-ink-faint">
        Built per-business: your services, your numbers, your questions. This one&rsquo;s a plumber&rsquo;s.
      </p>
    </div>
  );
}
