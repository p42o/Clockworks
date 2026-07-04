"use client";

import { useState } from "react";
import { CHART } from "./DemoShell";

/**
 * Hand-built SVG chart primitives per the dataviz mark specs:
 * 2px lines, thin bars with surface gaps and 4px rounded data-ends,
 * recessive grid, text in text tokens, hover layer with generous targets.
 */

export function StatTile({
  label,
  value,
  delta,
  good,
}: {
  label: string;
  value: string;
  delta?: string;
  good?: boolean;
}) {
  return (
    <div className="rounded-[3px] border hairline bg-cream-bright/70 px-4 py-3">
      <p className="font-mono text-[0.62rem] tracking-[0.16em] text-ink-faint uppercase">{label}</p>
      <p className="mt-1 font-mono text-2xl tabular-nums text-ink">{value}</p>
      {delta && (
        <p className="mt-0.5 text-[0.72rem]" style={{ color: good ? CHART.pine : CHART.copper }}>
          {delta}
        </p>
      )}
    </div>
  );
}

type Series = { name: string; color: string; values: number[] };

export function LineChart({
  series,
  labels,
  height = 180,
  unit = "",
}: {
  series: Series[];
  labels: string[];
  height?: number;
  unit?: string;
}) {
  const [hover, setHover] = useState<number | null>(null);
  const w = 560;
  const padL = 34;
  const padB = 22;
  const padT = 12;
  const max = Math.max(...series.flatMap((s) => s.values)) * 1.15;
  const n = labels.length;
  const x = (i: number) => padL + (i * (w - padL - 8)) / (n - 1);
  const y = (v: number) => padT + (height - padT - padB) * (1 - v / max);
  const path = (vals: number[]) => vals.map((v, i) => `${i ? "L" : "M"}${x(i)},${y(v)}`).join(" ");
  const ticks = [0, 0.5, 1].map((f) => Math.round(max * f));

  return (
    <div className="relative">
      <div className="mb-2 flex flex-wrap gap-4">
        {series.map((s) => (
          <span key={s.name} className="flex items-center gap-1.5 text-[0.72rem] text-ink-soft">
            <span className="h-[3px] w-4 rounded-full" style={{ background: s.color }} />
            {s.name}
          </span>
        ))}
      </div>
      <svg
        viewBox={`0 0 ${w} ${height}`}
        className="w-full touch-none select-none"
        onPointerMove={(e) => {
          const r = e.currentTarget.getBoundingClientRect();
          const px = ((e.clientX - r.left) / r.width) * w;
          const i = Math.round(((px - padL) / (w - padL - 8)) * (n - 1));
          setHover(i >= 0 && i < n ? i : null);
        }}
        onPointerLeave={() => setHover(null)}
      >
        {ticks.map((t) => (
          <g key={t}>
            <line x1={padL} x2={w - 8} y1={y(t)} y2={y(t)} stroke={CHART.grid} strokeWidth="1" />
            <text x={padL - 6} y={y(t) + 3} textAnchor="end" fontSize="9" fill={CHART.axis} fontFamily="var(--font-mono)">
              {t}
            </text>
          </g>
        ))}
        {[0, Math.floor(n / 2), n - 1].map((i) => (
          <text key={i} x={x(i)} y={height - 6} textAnchor="middle" fontSize="9" fill={CHART.axis} fontFamily="var(--font-mono)">
            {labels[i]}
          </text>
        ))}
        {hover !== null && (
          <line x1={x(hover)} x2={x(hover)} y1={padT} y2={height - padB} stroke={CHART.axis} strokeWidth="1" strokeDasharray="3 3" />
        )}
        {series.map((s) => (
          <path key={s.name} d={path(s.values)} fill="none" stroke={s.color} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
        ))}
        {hover !== null &&
          series.map((s) => (
            <circle key={s.name} cx={x(hover)} cy={y(s.values[hover])} r="4" fill={s.color} stroke="#F5F1E8" strokeWidth="2" />
          ))}
      </svg>
      {hover !== null && (
        <div className="pointer-events-none absolute rounded-[3px] border hairline bg-cream-bright px-3 py-2 text-[0.72rem] shadow-md"
          style={{ left: `${(x(hover) / w) * 100}%`, top: 18, transform: x(hover) > w * 0.6 ? "translateX(-105%)" : "translateX(8px)" }}
        >
          <p className="font-mono text-ink-faint">{labels[hover]}</p>
          {series.map((s) => (
            <p key={s.name} className="flex items-center gap-1.5 tabular-nums text-ink-soft">
              <span className="h-2 w-2 rounded-full" style={{ background: s.color }} />
              {s.name}: <strong className="text-ink">{s.values[hover]}{unit}</strong>
            </p>
          ))}
        </div>
      )}
    </div>
  );
}

export function BarRows({
  rows,
  unit = "$",
  color = CHART.copper,
}: {
  rows: { label: string; value: number; note?: string }[];
  unit?: string;
  color?: string;
}) {
  const max = Math.max(...rows.map((r) => r.value));
  return (
    <div className="space-y-2.5">
      {rows.map((r) => (
        <div key={r.label} className="group/bar">
          <div className="flex items-baseline justify-between text-[0.75rem]">
            <span className="text-ink-soft">{r.label}</span>
            <span className="font-mono tabular-nums text-ink">
              {unit}
              {r.value.toLocaleString()}
            </span>
          </div>
          <div className="mt-1 h-[10px] w-full rounded-[4px] bg-paper-deep">
            <div
              className="h-full rounded-[4px] transition-all duration-700"
              style={{ width: `${(r.value / max) * 100}%`, background: color }}
              title={r.note}
            />
          </div>
        </div>
      ))}
    </div>
  );
}
