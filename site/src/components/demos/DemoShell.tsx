"use client";

import { useEffect, useRef } from "react";
import { AnimatePresence, motion } from "motion/react";

/** Chart palette — validated (dataviz six-checks) against paper #F5F1E8. Fixed order. */
export const CHART = {
  copper: "#D4582A",
  pine: "#1F7A50",
  ochre: "#946A00",
  blue: "#3D6BA8",
  grid: "#E4DEC9",
  axis: "#6E6A5F",
} as const;

export function SampleTag({ note }: { note?: string }) {
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-[2px] border border-ochre/40 bg-ember/40 px-2 py-1 font-mono text-[0.62rem] tracking-[0.14em] text-ink-soft"
      style={{ borderColor: "rgba(148,106,0,0.35)" }}
      title={note ?? "Every number in this demo is made-up sample data."}
    >
      <span aria-hidden>⚠</span> SAMPLE DATA — ILLUSTRATIVE
    </span>
  );
}

export default function DemoShell({
  open,
  onClose,
  title,
  code,
  assumptions,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  code: string;
  assumptions: string;
  children: React.ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    document.documentElement.style.overflow = "hidden";
    ref.current?.focus();
    return () => {
      document.removeEventListener("keydown", onKey);
      document.documentElement.style.overflow = "";
    };
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.22 }}
          className="fixed inset-0 z-[80] flex items-end justify-center bg-ink/40 backdrop-blur-[3px] sm:items-center sm:p-6"
          onClick={onClose}
        >
          <motion.div
            ref={ref}
            role="dialog"
            aria-modal="true"
            aria-label={title}
            tabIndex={-1}
            initial={{ y: 40, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 30, opacity: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            onClick={(e) => e.stopPropagation()}
            className="grain relative max-h-[92dvh] w-full max-w-3xl overflow-y-auto rounded-t-[8px] bg-paper shadow-[0_30px_80px_-20px_rgba(14,14,12,0.5)] outline-none sm:rounded-[8px]"
          >
            <div className="sticky top-0 z-10 flex items-center justify-between gap-4 border-b hairline bg-paper/95 px-5 py-4 backdrop-blur-sm sm:px-7">
              <div>
                <p className="font-mono text-[0.65rem] tracking-[0.2em] text-copper">{code}</p>
                <h2 className="display text-2xl leading-tight">{title}</h2>
              </div>
              <button
                type="button"
                onClick={onClose}
                aria-label="Close demo"
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[3px] border hairline text-ink-soft transition-colors hover:border-copper hover:text-copper"
              >
                ✕
              </button>
            </div>
            <div className="px-5 py-6 sm:px-7">
              <div className="mb-5 flex flex-wrap items-center gap-3">
                <SampleTag />
                <p className="text-[0.75rem] text-ink-faint">{assumptions}</p>
              </div>
              {children}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
