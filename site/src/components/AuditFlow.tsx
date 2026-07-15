"use client";

import { useMemo, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { submitAudit, type AuditRequest } from "@/lib/booking";
import { site } from "@/lib/site";

/**
 * "Book your audit" — a warm, five-beat conversation, not a form.
 * Springy step transitions, chip answers, and a success state that sets
 * expectations plainly. Honeypot field keeps the bots polite.
 */

const TRADES = ["Plumbing", "HVAC", "Electrical", "Landscaping", "Other trade / service"];
const PAINS = [
  "Missed calls",
  "Quotes nobody chased",
  "Late invoices",
  "Getting reviews",
  "Scheduling chaos",
  "All of it, honestly",
];
const TIMES = ["Morning", "Lunch-ish", "Afternoon", "Evening"];

const spring = { type: "spring", stiffness: 260, damping: 26 } as const;

function Chip({
  label,
  selected,
  onClick,
}: {
  label: string;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={`rounded-[3px] border px-4 py-2.5 text-[0.95rem] transition-all duration-200 ${
        selected
          ? "border-copper bg-copper text-cream-bright shadow-[0_8px_20px_-10px_rgba(212,88,42,0.6)]"
          : "hairline bg-cream-bright/70 text-ink-soft hover:border-copper/60 hover:text-ink"
      }`}
    >
      {label}
    </button>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="eyebrow">{label}</span>
      <div className="mt-2">{children}</div>
    </label>
  );
}

const inputCls =
  "w-full rounded-[3px] border hairline bg-cream-bright px-4 py-3 text-[1.02rem] text-ink placeholder:text-ink-faint/70 focus:border-copper focus:outline-none";

export default function AuditFlow() {
  const reduced = useReducedMotion();
  const [step, setStep] = useState(0);
  const [dir, setDir] = useState(1);
  const [state, setState] = useState<"idle" | "sending" | "done" | "failed">("idle");
  const [error, setError] = useState("");
  const honeypot = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState({
    name: "",
    business: "",
    trade: "",
    painPoint: "",
    detail: "",
    email: "",
    phone: "",
    preferred: "",
  });

  const set = (k: keyof typeof form) => (v: string) => setForm((f) => ({ ...f, [k]: v }));

  const steps = useMemo(
    () => [
      {
        key: "you",
        title: "First things first — who am I talking to?",
        valid: form.name.trim().length > 1 && form.business.trim().length > 1,
        hint: "Name and business, that's it.",
      },
      {
        key: "trade",
        title: `Good to meet you, ${form.name.split(" ")[0] || "there"}. What's your trade?`,
        valid: form.trade !== "",
        hint: "Tap one.",
      },
      {
        key: "pain",
        title: "What eats the most time in a normal week?",
        valid: form.painPoint !== "",
        hint: "Your gut answer is the right one.",
      },
      {
        key: "contact",
        title: "Where should the written plan go?",
        valid: /.+@.+\..+/.test(form.email),
        hint: "I reply within one business day.",
      },
      {
        key: "review",
        title: "Here's what I heard — look right?",
        valid: true,
        hint: "",
      },
    ],
    [form],
  );

  const total = steps.length;
  const current = steps[step];

  const go = (delta: number) => {
    setDir(delta);
    setStep((s) => Math.min(Math.max(s + delta, 0), total - 1));
  };

  const onSubmit = async () => {
    if (honeypot.current?.value) {
      setState("done"); // bots get a warm goodbye
      return;
    }
    setState("sending");
    const req: AuditRequest = {
      ...form,
      page: typeof location !== "undefined" ? location.pathname : "/book/",
      submittedAt: new Date().toISOString(),
    };
    try {
      const result = await submitAudit(req);
      if (result.delivered || result.logged) {
        setState("done");
      } else {
        setState("failed");
        setError("Neither delivery route answered.");
      }
    } catch {
      setState("failed");
      setError("Something in the plumbing burst — fitting, I know.");
    }
  };

  const retry = () => {
    setError("");
    setState("idle");
    void onSubmit();
  };

  if (state === "done") {
    return (
      <motion.div
        initial={reduced ? false : { opacity: 0, scale: 0.97 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={spring}
        className="rounded-[4px] border-2 border-patina/50 bg-patina-soft/40 p-8 sm:p-12"
      >
        <p className="font-mono text-[0.7rem] tracking-[0.2em] text-patina">ON THE BOOKS</p>
        <h2 className="display mt-3 text-4xl sm:text-5xl">
          Done. That was the whole form<span className="text-patina">.</span>
        </h2>
        <div className="mt-5 max-w-xl space-y-4 text-[1.05rem] leading-relaxed text-ink-soft">
          <p>
            Your request just landed on my phone. You&rsquo;ll hear from me at{" "}
            <span className="font-medium text-ink">{form.email}</span> within one business day —
            a real reply from a real person, which is a little ironic given what I sell.
          </p>
          <p>
            We&rsquo;ll pick a time that fits around your jobs
            {form.preferred ? ` (you said ${form.preferred.toLowerCase()} works best)` : ""}, and
            thirty minutes later you&rsquo;ll have a written plan. No pitch, no pressure —
            and if there&rsquo;s nothing worth automating, the coffee&rsquo;s on me.
          </p>
        </div>
        <p className="mt-6 font-mono text-[0.75rem] text-ink-faint">
          — Parker · {site.city}, MN
        </p>
      </motion.div>
    );
  }

  return (
    <div>
      {/* progress: five segments, machined */}
      <div className="mb-8 flex items-center gap-4">
        <div className="flex flex-1 gap-1.5" role="progressbar" aria-valuenow={step + 1} aria-valuemin={1} aria-valuemax={total}>
          {steps.map((s, i) => (
            <div key={s.key} className="h-[3px] flex-1 overflow-hidden rounded-full bg-line-soft">
              <motion.div
                className="h-full bg-copper"
                initial={false}
                animate={{ scaleX: i <= step ? 1 : 0 }}
                style={{ originX: 0 }}
                transition={spring}
              />
            </div>
          ))}
        </div>
        <span className="font-mono text-[0.7rem] tracking-widest text-ink-faint">
          {step + 1} / {total}
        </span>
      </div>

      <div className="relative min-h-[380px]">
        <AnimatePresence mode="popLayout" initial={false} custom={dir}>
          <motion.div
            key={current.key}
            initial={reduced ? false : { opacity: 0, x: 36 * dir, filter: "blur(2px)" }}
            animate={{ opacity: 1, x: 0, filter: "blur(0px)" }}
            exit={reduced ? undefined : { opacity: 0, x: -36 * dir, filter: "blur(2px)" }}
            transition={spring}
          >
            <h2 className="display text-3xl sm:text-4xl">{current.title}</h2>
            {current.hint && <p className="mt-2 text-sm text-ink-faint">{current.hint}</p>}

            <div className="mt-8 space-y-6">
              {current.key === "you" && (
                <>
                  <input
                    ref={honeypot}
                    type="text"
                    name="website"
                    tabIndex={-1}
                    autoComplete="off"
                    aria-hidden
                    className="absolute -left-[9999px] h-0 w-0 opacity-0"
                  />
                  <Field label="Your name">
                    <input
                      autoFocus
                      autoComplete="name"
                      className={inputCls}
                      placeholder="Sam Nelson"
                      value={form.name}
                      onChange={(e) => set("name")(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && current.valid && go(1)}
                    />
                  </Field>
                  <Field label="Your business">
                    <input
                      autoComplete="organization"
                      className={inputCls}
                      placeholder="Nelson Plumbing Co."
                      value={form.business}
                      onChange={(e) => set("business")(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && current.valid && go(1)}
                    />
                  </Field>
                </>
              )}

              {current.key === "trade" && (
                <div className="flex flex-wrap gap-3">
                  {TRADES.map((t) => (
                    <Chip
                      key={t}
                      label={t}
                      selected={form.trade === t}
                      onClick={() => {
                        set("trade")(t);
                        setTimeout(() => go(1), 240);
                      }}
                    />
                  ))}
                </div>
              )}

              {current.key === "pain" && (
                <>
                  <div className="flex flex-wrap gap-3">
                    {PAINS.map((p) => (
                      <Chip key={p} label={p} selected={form.painPoint === p} onClick={() => set("painPoint")(p)} />
                    ))}
                  </div>
                  <Field label="Anything you want me to know? (optional)">
                    <textarea
                      className={`${inputCls} min-h-[90px] resize-y`}
                      placeholder="e.g. We miss weekend calls constantly — my voicemail's been full since March."
                      value={form.detail}
                      onChange={(e) => set("detail")(e.target.value)}
                    />
                  </Field>
                </>
              )}

              {current.key === "contact" && (
                <>
                  <Field label="Email — where the plan goes">
                    <input
                      autoFocus
                      type="email"
                      inputMode="email"
                      autoComplete="email"
                      className={inputCls}
                      placeholder="sam@nelsonplumbing.com"
                      value={form.email}
                      onChange={(e) => set("email")(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && current.valid && go(1)}
                    />
                  </Field>
                  <Field label="Phone (optional — some folks would rather talk)">
                    <input
                      type="tel"
                      inputMode="tel"
                      autoComplete="tel"
                      className={inputCls}
                      placeholder="(763) 555-0142"
                      value={form.phone}
                      onChange={(e) => set("phone")(e.target.value)}
                    />
                  </Field>
                  <div>
                    <p className="eyebrow">Best time to catch you</p>
                    <div className="mt-2 flex flex-wrap gap-3">
                      {TIMES.map((t) => (
                        <Chip key={t} label={t} selected={form.preferred === t} onClick={() => set("preferred")(t)} />
                      ))}
                    </div>
                  </div>
                </>
              )}

              {current.key === "review" && (
                <div className="rounded-[3px] border hairline bg-cream-bright/70 p-6">
                  <dl className="grid gap-x-8 gap-y-4 sm:grid-cols-2">
                    {[
                      ["Who", `${form.name} · ${form.business}`],
                      ["Trade", form.trade],
                      ["Biggest time-sink", form.painPoint],
                      ["Reply to", form.email + (form.phone ? ` · ${form.phone}` : "")],
                      ["Best time", form.preferred || "Whenever"],
                      ...(form.detail ? ([["In your words", form.detail]] as const) : []),
                    ].map(([k, v]) => (
                      <div key={k}>
                        <dt className="eyebrow">{k}</dt>
                        <dd className="mt-1 text-[1.02rem]">{v}</dd>
                      </div>
                    ))}
                  </dl>
                  {state === "failed" && (
                    <div className="mt-6 rounded-[3px] border border-copper/50 bg-ember/40 p-4 text-[0.95rem] leading-relaxed">
                      <p className="font-medium">That didn&rsquo;t send — {error}</p>
                      <p className="mt-1 text-ink-soft">
                        Your answers are safe right here.{" "}
                        <button type="button" onClick={retry} className="text-copper underline underline-offset-2">
                          Give it one more try
                        </button>{" "}
                        — flaky Wi-Fi loses to stubbornness most days.
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </motion.div>
        </AnimatePresence>
      </div>

      <div className="mt-8 flex items-center justify-between border-t hairline-soft pt-6">
        <button
          type="button"
          onClick={() => go(-1)}
          disabled={step === 0 || state === "sending"}
          className="text-[0.9rem] text-ink-faint transition-colors hover:text-ink disabled:invisible"
        >
          ← Back
        </button>
        {step < total - 1 ? (
          <button
            type="button"
            onClick={() => go(1)}
            disabled={!current.valid}
            className="rounded-[3px] bg-ink px-6 py-3 font-medium text-paper transition-all duration-300 hover:bg-copper disabled:cursor-not-allowed disabled:opacity-30"
          >
            Next →
          </button>
        ) : (
          <button
            type="button"
            onClick={onSubmit}
            disabled={state === "sending"}
            className="rounded-[3px] bg-copper px-7 py-3 font-medium text-cream-bright shadow-[0_12px_32px_-14px_rgba(212,88,42,0.6)] transition-colors duration-300 hover:bg-copper-deep disabled:opacity-60"
          >
            {state === "sending" ? "Winding it up…" : "Book my free audit"}
          </button>
        )}
      </div>
    </div>
  );
}
