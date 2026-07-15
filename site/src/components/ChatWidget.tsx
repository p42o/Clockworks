"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import DemoShell, { CHART } from "@/components/demos/DemoShell";
import { BarRows, StatTile } from "@/components/demos/ChartBits";

const API = "https://clockworks-bot.vercel.app/api/chat";
type Msg = { role: "user" | "assistant"; content: string };

const STARTERS = [
  "What do you actually do?",
  "I miss calls all the time",
  "What does this cost?",
  "Prove you're not a dumb chatbot",
];

/* Rotating input hints while the chat is empty — lowers the "what do I even ask" barrier. */
const HINTS = [
  "Type like you'd text…",
  "Try: “What does this actually cost?”",
  "Try: “I miss calls all the time”",
  "Try: “Would this work for a two-truck shop?”",
];

/* Two-beat invitation: a friendly hello, then one gentle re-invite if it was ignored. */
const NUDGES = [
  {
    lead: "Hey — I’m the front desk.",
    body: "Not a menu bot; the real thing, live. Ask me anything about getting your evenings back.",
  },
  {
    lead: "Still browsing? I can shortcut it.",
    body: "Pricing, timelines, whether this fits your shop — asking me is faster than scrolling.",
  },
] as const;

const K_NUDGE1 = "cw-nudge-seen";
const K_NUDGE2 = "cw-nudge2-seen";
const K_OPENED = "cw-chat-opened";

/** GA4 breadcrumb — safe no-op when gtag isn't on the page (e.g. /v3 previews). */
function track(name: string) {
  try {
    (window as unknown as { gtag?: (...args: unknown[]) => void }).gtag?.("event", name, {
      event_category: "front_desk",
    });
  } catch {
    /* analytics never breaks the chat */
  }
}

function InsightsSample({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <DemoShell
      open={open}
      onClose={onClose}
      title="What an owner learns from a chat like this"
      code="SAMPLE · HVAC SHOP"
      assumptions="A fictional HVAC company's month of website-agent conversations. Yours would be your real customers."
    >
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatTile label="Conversations" value="214" delta="+38 vs prior month" good />
        <StatTile label="Became leads" value="41" delta="19% of chats" good />
        <StatTile label="Booked jobs" value="17" delta="via calendar link" good />
        <StatTile label="After-hours chats" value="46%" delta="you were asleep" />
      </div>
      <div className="mt-4 rounded-[3px] border hairline bg-cream-bright/60 p-4">
        <p className="mb-3 font-mono text-[0.62rem] tracking-[0.16em] text-ink-faint">WHAT CUSTOMERS KEPT ASKING (TOP 5)</p>
        <BarRows unit="" color={CHART.copper} rows={[
          { label: "“How much is an AC tune-up?”", value: 48 },
          { label: "“Do you service my area?”", value: 39 },
          { label: "“Financing available?”", value: 27 },
          { label: "“How fast can someone come?”", value: 24 },
          { label: "“Furnace making a noise…”", value: 19 },
        ]} />
      </div>
      <div className="mt-3 rounded-[3px] border-l-2 border-copper bg-ember/30 px-4 py-3 text-[0.82rem] leading-relaxed">
        <strong>What the desk would tell this owner:</strong> price questions dominate — publishing
        a tune-up price would convert more chats; 46% of conversations happen after hours, so the
        agent is your night shift; “financing” came up 27 times and isn&rsquo;t on the website.
        Demand signals from real conversations — not guesses.
      </div>
      <p className="mt-4 text-center text-[0.8rem] text-ink-faint">
        The bubble you just used logs and learns exactly like this — for Parker.{" "}
        <a href="/your-own-agent/" className="text-copper underline underline-offset-2">Your own agent →</a>
      </p>
    </DemoShell>
  );
}

export default function ChatWidget() {
  const reduced = useReducedMotion();
  const [open, setOpen] = useState(false);
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [insights, setInsights] = useState(false);
  const [nudge, setNudge] = useState<0 | 1 | 2>(0);
  const [hint, setHint] = useState(0);
  const scroller = useRef<HTMLDivElement>(null);
  const session = useRef<string>("");
  const openedRef = useRef(false);

  useEffect(() => {
    session.current =
      sessionStorage.getItem("cw-bot-session") ??
      `s${Math.random().toString(36).slice(2, 10)}${Date.now().toString(36)}`;
    sessionStorage.setItem("cw-bot-session", session.current);
    openedRef.current = !!sessionStorage.getItem(K_OPENED);
  }, []);

  // nudge 1 — peeks out once per session shortly after landing, then rests
  useEffect(() => {
    if (sessionStorage.getItem(K_NUDGE1)) return;
    const show = setTimeout(() => setNudge(1), 4500);
    const hide = setTimeout(() => {
      sessionStorage.setItem(K_NUDGE1, "1");
      setNudge((n) => (n === 1 ? 0 : n));
    }, 15000);
    return () => {
      clearTimeout(show);
      clearTimeout(hide);
    };
  }, []);

  // nudge 2 — one gentle re-invite for readers who scrolled deep (or lingered)
  // without ever opening the chat. Once per session, never after an open.
  useEffect(() => {
    if (sessionStorage.getItem(K_NUDGE2)) return;
    let hideTimer: ReturnType<typeof setTimeout> | undefined;
    const cleanup = () => {
      window.removeEventListener("scroll", onScroll);
      clearTimeout(lingerTimer);
    };
    const tryFire = () => {
      if (openedRef.current) return cleanup();
      if (!sessionStorage.getItem(K_NUDGE1)) return; // let the hello finish first
      if (sessionStorage.getItem(K_NUDGE2)) return cleanup();
      cleanup();
      sessionStorage.setItem(K_NUDGE2, "1");
      setNudge(2);
      hideTimer = setTimeout(() => setNudge((n) => (n === 2 ? 0 : n)), 12000);
    };
    const onScroll = () => {
      const max = document.documentElement.scrollHeight - window.innerHeight;
      if (max > 600 && window.scrollY / max > 0.55) tryFire();
    };
    const lingerTimer = setTimeout(tryFire, 50000);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      cleanup();
      clearTimeout(hideTimer);
    };
  }, []);

  useEffect(() => {
    if (open) {
      setNudge(0);
      sessionStorage.setItem(K_NUDGE1, "1");
      sessionStorage.setItem(K_NUDGE2, "1");
      if (!openedRef.current) track("chat_open");
      openedRef.current = true;
      sessionStorage.setItem(K_OPENED, "1");
    }
  }, [open]);

  // any element with [data-open-chat] anywhere on the site opens the widget —
  // lets server-rendered pages ("talk to mine right now") summon the agent.
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      const el = (e.target as HTMLElement | null)?.closest?.("[data-open-chat]");
      if (el) {
        e.preventDefault();
        setOpen(true);
      }
    };
    document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
  }, []);

  // rotate the "try asking…" placeholder while the conversation is empty
  useEffect(() => {
    if (!open || msgs.length > 0 || reduced) return;
    const t = setInterval(() => setHint((h) => (h + 1) % HINTS.length), 3600);
    return () => clearInterval(t);
  }, [open, msgs.length, reduced]);

  useEffect(() => {
    scroller.current?.scrollTo({ top: 99999, behavior: "smooth" });
  }, [msgs, busy, open]);

  const send = async (text: string) => {
    const t = text.trim();
    if (!t || busy) return;
    if (msgs.length === 0) track("chat_first_message");
    const next: Msg[] = [...msgs, { role: "user", content: t }];
    setMsgs(next);
    setInput("");
    setBusy(true);
    try {
      const r = await fetch(API, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId: session.current, messages: next }),
      });
      const j = await r.json();
      setMsgs([...next, { role: "assistant", content: j.reply ?? "…" }]);
    } catch {
      setMsgs([...next, { role: "assistant", content: "Connection hiccup — try that again in a second." }]);
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <InsightsSample open={insights} onClose={() => setInsights(false)} />

      {/* ---- launcher ---- */}
      <div className="fixed bottom-5 right-5 z-[70] flex flex-col items-end gap-3">
        {/* peek nudge — a hello on arrival, one gentle re-invite for deep scrollers */}
        <AnimatePresence>
          {nudge > 0 && !open && (
            <motion.div
              key={nudge}
              initial={{ opacity: 0, y: 10, scale: 0.92 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8, scale: 0.92 }}
              transition={{ type: "spring", stiffness: 300, damping: 24 }}
              className="relative mr-1 max-w-[15.5rem] rounded-[12px] rounded-br-[3px] border hairline bg-cream-bright px-3.5 py-2.5 text-left shadow-[0_18px_44px_-16px_rgba(14,14,12,0.45)]"
            >
              <button
                type="button"
                onClick={() => {
                  track("chat_nudge_click");
                  setOpen(true);
                }}
                className="block text-[0.82rem] leading-snug text-ink"
              >
                <span className="font-medium">{NUDGES[nudge - 1].lead}</span>{" "}
                {NUDGES[nudge - 1].body}
              </button>
              <button
                type="button"
                onClick={() => {
                  sessionStorage.setItem(nudge === 1 ? K_NUDGE1 : K_NUDGE2, "1");
                  setNudge(0);
                }}
                aria-label="Dismiss"
                className="absolute -right-2 -top-2 flex h-5 w-5 items-center justify-center rounded-full border hairline bg-paper text-[0.62rem] text-ink-faint transition-colors hover:text-copper"
              >
                ✕
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* the button */}
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-label={open ? "Close chat" : "Chat with the Front Desk"}
          className="group relative flex h-[58px] w-[58px] items-center justify-center rounded-full bg-gradient-to-br from-copper to-copper-deep text-cream-bright shadow-[0_16px_38px_-10px_rgba(212,88,42,0.7),inset_0_1px_0_rgba(255,255,255,0.25)] transition-transform duration-300 hover:scale-105 active:scale-95"
        >
          {!open && <span className="launcher-pulse absolute inset-0 rounded-full" aria-hidden />}

          <span className="relative">
            {open ? (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
                <path
                  d="M6 9.5l6 6 6-6"
                  stroke="currentColor"
                  strokeWidth="2.3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            ) : (
              <svg width="27" height="27" viewBox="0 0 32 32" fill="none" aria-hidden>
                {/* speech bubble */}
                <path
                  d="M6 5.5h20A3.5 3.5 0 0 1 29.5 9v9A3.5 3.5 0 0 1 26 21.5H13.9l-4.6 3.9A1 1 0 0 1 7.7 24.6V21.5H6A3.5 3.5 0 0 1 2.5 18V9A3.5 3.5 0 0 1 6 5.5Z"
                  fill="#FDFBF5"
                />
                {/* typing dots */}
                <circle className="launcher-dot" cx="10.5" cy="13.4" r="1.75" fill="#D4582A" />
                <circle className="launcher-dot" cx="16" cy="13.4" r="1.75" fill="#D4582A" style={{ animationDelay: "0.16s" }} />
                <circle className="launcher-dot" cx="21.5" cy="13.4" r="1.75" fill="#D4582A" style={{ animationDelay: "0.32s" }} />
              </svg>
            )}
          </span>

          {/* live-status dot */}
          {!open && (
            <span
              className="absolute right-0.5 top-0.5 h-3.5 w-3.5 rounded-full border-[2.5px] border-paper"
              style={{ background: CHART.pine }}
              aria-hidden
            />
          )}
        </button>
      </div>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 24, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.97 }}
            transition={{ type: "spring", stiffness: 320, damping: 28 }}
            className="fixed bottom-[5.5rem] right-4 z-[70] flex h-[min(600px,75dvh)] w-[min(390px,calc(100vw-2rem))] flex-col overflow-hidden rounded-[10px] border hairline bg-paper shadow-[0_30px_70px_-20px_rgba(14,14,12,0.45)]"
            role="dialog"
            aria-label="Front Desk chat"
          >
            <div className="border-b hairline bg-ground px-4 py-3 text-paper">
              <p className="display text-lg leading-none">The Front Desk<span className="text-copper">.</span></p>
              <p className="mt-1 text-[0.7rem] text-paper/60">
                Live demo — this bot IS the product.{" "}
                <a href="/your-own-agent/" className="text-copper underline underline-offset-2" title="Learn more about having your own agent">
                  Get one for your shop →
                </a>
              </p>
            </div>

            <div ref={scroller} aria-live="polite" className="flex flex-1 flex-col gap-2.5 overflow-y-auto px-3.5 py-4">
              {msgs.length === 0 && (
                <div className="m-auto text-center">
                  <p className="font-mono text-[0.6rem] tracking-[0.18em] text-ink-faint">
                    NO SCRIPTS · NO MENUS · REAL AI
                  </p>
                  <p className="mt-3 text-sm leading-relaxed text-ink-soft">
                    I&rsquo;m the front desk — trained on this business the way yours would be
                    trained on yours. Poke at me, interrogate me, try to break me. That&rsquo;s
                    what I&rsquo;m here for.
                  </p>
                  <div className="mt-4 flex flex-wrap justify-center gap-2">
                    {STARTERS.map((s) => (
                      <button key={s} type="button" onClick={() => send(s)} className="rounded-full border border-copper/50 px-3 py-1.5 text-[0.78rem] text-copper transition-colors hover:bg-copper hover:text-cream-bright">
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              {msgs.map((m, i) => (
                <div key={i} className={`max-w-[86%] whitespace-pre-wrap rounded-[12px] px-3.5 py-2.5 text-[0.86rem] leading-snug ${m.role === "assistant" ? "self-start bg-paper-deep text-ink" : "self-end bg-copper text-cream-bright"}`}>
                  {m.content}
                </div>
              ))}
              {busy && (
                <div className="flex items-center gap-[5px] self-start rounded-[12px] bg-paper-deep px-3.5 py-3" aria-label="The Front Desk is typing">
                  <span className="typing-dot" />
                  <span className="typing-dot" />
                  <span className="typing-dot" />
                </div>
              )}
            </div>

            <div className="border-t hairline px-3 py-2.5">
              <div className="flex gap-2">
                <input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && send(input)}
                  placeholder={msgs.length === 0 ? HINTS[hint] : "Type like you'd text…"}
                  className="flex-1 rounded-[3px] border hairline bg-cream-bright px-3 py-2 text-[0.88rem] focus:border-copper focus:outline-none"
                  aria-label="Message the Front Desk"
                />
                <button type="button" onClick={() => send(input)} disabled={busy || !input.trim()} className="rounded-[3px] bg-ink px-4 text-paper transition-colors hover:bg-copper disabled:opacity-40">
                  →
                </button>
              </div>
              <button type="button" onClick={() => setInsights(true)} className="mt-2 w-full text-center font-mono text-[0.65rem] tracking-[0.12em] text-ink-faint underline-offset-2 hover:text-copper hover:underline">
                ⚙ SEE WHAT AN OWNER LEARNS FROM CHATS LIKE THIS
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
