"use client";

import { useRef, useState } from "react";
import { useReducedMotion } from "motion/react";
import { CHART } from "./DemoShell";

/** A week of quote follow-up, time-lapsed. Deterministic sample pipeline. */

type Quote = {
  id: string;
  who: string;
  amount: number;
  ageStart: number; // days since sent at day 0
  events: Record<number, { note: string; status?: Quote["status"] }>;
  status: "waiting" | "nudged" | "replied" | "won" | "declined";
};

const START: Quote[] = [
  { id: "Q-241", who: "Deck rebuild — Hoffman", amount: 8400, ageStart: 6, status: "waiting", events: { 1: { note: "Nudge #2 sent", status: "nudged" }, 3: { note: "“Let's do it.” → WON", status: "won" } } },
  { id: "Q-244", who: "Furnace replace — Ostrander", amount: 6200, ageStart: 3, status: "waiting", events: { 1: { note: "Nudge #1 sent", status: "nudged" }, 5: { note: "Reply: “going another way” → closed", status: "declined" } } },
  { id: "Q-246", who: "Panel upgrade — Vang", amount: 3100, ageStart: 2, status: "waiting", events: { 2: { note: "Nudge #1 sent", status: "nudged" }, 4: { note: "Reply: “call me Monday”", status: "replied" } } },
  { id: "Q-249", who: "Irrigation startup — Berg", amount: 640, ageStart: 1, status: "waiting", events: { 4: { note: "Nudge #1 sent", status: "nudged" }, 6: { note: "“Yes — book it.” → WON", status: "won" } } },
  { id: "Q-250", who: "Water softener — Lindqvist", amount: 1850, ageStart: 0, status: "waiting", events: { 3: { note: "Nudge #1 sent", status: "nudged" } } },
];

const STATUS_STYLE: Record<Quote["status"], { label: string; color: string }> = {
  waiting: { label: "WAITING", color: CHART.axis },
  nudged: { label: "NUDGED", color: CHART.ochre },
  replied: { label: "REPLIED", color: CHART.blue },
  won: { label: "WON", color: CHART.pine },
  declined: { label: "CLOSED", color: CHART.axis },
};

export default function QuoteChaserDemo() {
  const reduced = useReducedMotion();
  const [day, setDay] = useState(0);
  const [quotes, setQuotes] = useState(START);
  const [log, setLog] = useState<string[]>([]);
  const [running, setRunning] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout>>(null);

  const applyDay = (d: number, qs: Quote[]): [Quote[], string[]] => {
    const notes: string[] = [];
    const next = qs.map((q) => {
      const ev = q.events[d];
      if (!ev) return q;
      notes.push(`Day ${d} · ${q.id} — ${ev.note}`);
      return { ...q, status: ev.status ?? q.status };
    });
    return [next, notes];
  };

  const run = () => {
    if (running) return;
    setRunning(true);
    setDay(0);
    setQuotes(START);
    setLog([]);
    let d = 0;
    let qs = START;
    const tick = () => {
      d += 1;
      const [next, notes] = applyDay(d, qs);
      qs = next;
      setDay(d);
      setQuotes(next);
      setLog((l) => [...notes.reverse(), ...l]);
      if (d < 7) {
        timer.current = setTimeout(tick, reduced ? 0 : 900);
      } else {
        setRunning(false);
      }
    };
    timer.current = setTimeout(tick, reduced ? 0 : 500);
  };

  const won = quotes.filter((q) => q.status === "won").reduce((s, q) => s + q.amount, 0);

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-4">
        <button
          type="button"
          onClick={run}
          disabled={running}
          className="rounded-[3px] bg-copper px-5 py-2.5 font-medium text-cream-bright transition-colors hover:bg-copper-deep disabled:opacity-50"
        >
          {running ? `Day ${day} of 7…` : day === 7 ? "↻ Run the week again" : "▶ Run one week"}
        </button>
        <div className="text-right">
          <p className="font-mono text-[0.62rem] tracking-[0.16em] text-ink-faint">REVIVED THIS WEEK</p>
          <p className="font-mono text-2xl tabular-nums" style={{ color: CHART.pine }}>
            ${won.toLocaleString()}
          </p>
        </div>
      </div>

      <div className="space-y-2">
        {quotes.map((q) => {
          const s = STATUS_STYLE[q.status];
          return (
            <div
              key={q.id}
              className={`flex items-center gap-3 rounded-[3px] border hairline px-3.5 py-2.5 transition-all duration-500 ${
                q.status === "won" ? "bg-patina-soft/50" : q.status === "declined" ? "opacity-50" : "bg-cream-bright/70"
              }`}
            >
              <span className="font-mono text-[0.68rem] text-ink-faint">{q.id}</span>
              <span className="flex-1 truncate text-[0.85rem] text-ink-soft">{q.who}</span>
              <span className="hidden font-mono text-[0.68rem] text-ink-faint sm:inline">
                {q.ageStart + day}d old
              </span>
              <span className="font-mono text-[0.8rem] tabular-nums">${q.amount.toLocaleString()}</span>
              <span
                className="w-[74px] rounded-[2px] px-1.5 py-0.5 text-center font-mono text-[0.6rem] tracking-wider text-cream-bright"
                style={{ background: s.color }}
              >
                {s.label}
              </span>
            </div>
          );
        })}
      </div>

      <div className="mt-4 min-h-[72px] rounded-[3px] border hairline bg-paper-deep/50 p-3">
        <p className="font-mono text-[0.62rem] tracking-[0.16em] text-ink-faint">WHAT FIRED (NEWEST FIRST)</p>
        <ul className="mt-1.5 space-y-1">
          {log.length === 0 && <li className="text-[0.78rem] text-ink-faint">Press play — the nudges do the rest.</li>}
          {log.slice(0, 5).map((l) => (
            <li key={l} className="text-[0.78rem] text-ink-soft">{l}</li>
          ))}
        </ul>
      </div>

      <p className="mt-4 text-center text-[0.8rem] text-ink-faint">
        Nobody wrote a follow-up. A reply always stops the sequence — no customer ever gets nagged mid-conversation.
      </p>
    </div>
  );
}
