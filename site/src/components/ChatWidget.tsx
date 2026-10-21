"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { peekQueuedChat } from "@/lib/chat-bridge";

const API = "https://clockworks-bot.vercel.app/api/chat";
type Msg = { role: "user" | "assistant"; content: string };

const STARTERS = [
  "What do you actually do?",
  "I miss calls while I'm on a job",
  "How does setup work?",
  "Prove you're not a dumb chatbot",
];

const HINTS = [
  "Ask a question",
  "Try: what does the team do?",
  "Try: I miss calls while I'm on a job",
  "Try: would this fit a small shop?",
];

const NUDGES = [
  {
    lead: "Hey, I'm the Front Desk.",
    body: "Ask me what the team does. The chat on this page is the product.",
  },
  {
    lead: "Still looking?",
    body: "Ask what the team does, or whether it fits your shop.",
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

export default function ChatWidget() {
  const reduced = useReducedMotion();
  const [open, setOpen] = useState(() => peekQueuedChat().queued);
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [nudge, setNudge] = useState<0 | 1 | 2>(0);
  const [hint, setHint] = useState(0);
  const scroller = useRef<HTMLDivElement>(null);
  const session = useRef<string>("");
  const openedRef = useRef(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const launcherRef = useRef<HTMLButtonElement>(null);
  const openerRef = useRef<HTMLElement | null>(peekQueuedChat().opener);

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
      if (el instanceof HTMLElement) {
        e.preventDefault();
        openerRef.current = el;
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

  useEffect(() => {
    if (!open) return;
    const id = window.requestAnimationFrame(() => inputRef.current?.focus());
    return () => cancelAnimationFrame(id);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      event.preventDefault();
      setOpen(false);
      const opener = openerRef.current;
      const back = opener && opener.isConnected ? opener : launcherRef.current;
      window.requestAnimationFrame(() => back?.focus());
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const latestAssistant = msgs.reduce<string>((found, message) => (message.role === "assistant" ? message.content : found), "");

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
      setMsgs([...next, { role: "assistant", content: "Connection hiccup. Try that again." }]);
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
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
                onClick={(event) => {
                  track("chat_nudge_click");
                  openerRef.current = event.currentTarget;
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
                className="absolute -right-2 -top-2 flex h-8 w-8 items-center justify-center rounded-full border hairline bg-paper text-[0.75rem] text-ink-faint transition-colors hover:text-copper-deep"
              >
                ✕
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* the button */}
        <button
          ref={launcherRef}
          type="button"
          onClick={() =>
            setOpen((value) => {
              const next = !value;
              if (next) openerRef.current = launcherRef.current;
              return next;
            })
          }
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
              style={{ background: "#3c5a4a" }}
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
              <p className="mt-1 text-[0.75rem] text-paper/75">
                The chat on this page is the product.{" "}
                <a href="/your-own-agent/" className="text-cream-bright underline underline-offset-2">
                  About the Front Desk
                </a>
              </p>
            </div>

            <p className="sr-only" aria-live="polite" aria-atomic="true">
              {latestAssistant}
            </p>
            <div ref={scroller} className="flex flex-1 flex-col gap-2.5 overflow-y-auto px-3.5 py-4">
              {msgs.length === 0 && (
                <div className="m-auto text-center">
                  <p className="font-mono text-[0.68rem] tracking-[0.16em] text-ink-faint">
                    FRONT DESK · EXAMPLE ON THIS SITE
                  </p>
                  <p className="mt-3 text-sm leading-relaxed text-ink-soft">
                    I&rsquo;m the Front Desk, trained on this business the way yours would be
                    trained on yours. Ask what the team does. You approve what goes out on your own.
                  </p>
                  <div className="mt-4 flex flex-wrap justify-center gap-2">
                    {STARTERS.map((s) => (
                      <button key={s} type="button" onClick={() => send(s)} className="min-h-8 rounded-full border border-copper-deep/50 px-3 py-1.5 text-[0.78rem] text-copper-deep transition-colors hover:bg-copper-deep hover:text-cream-bright">
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              {msgs.map((m, i) => (
                <div key={i} className={`max-w-[86%] whitespace-pre-wrap rounded-[12px] px-3.5 py-2.5 text-[0.86rem] leading-snug ${m.role === "assistant" ? "self-start bg-paper-deep text-ink" : "self-end bg-copper-deep text-cream-bright"}`}>
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
                  ref={inputRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && send(input)}
                  placeholder={msgs.length === 0 ? HINTS[hint] : "Ask a question"}
                  className="flex-1 rounded-[3px] border hairline bg-cream-bright px-3 py-2 text-[0.88rem] focus:border-copper focus:outline-none"
                  aria-label="Message the Front Desk"
                />
                <button type="button" onClick={() => send(input)} disabled={busy || !input.trim()} className="min-h-11 min-w-11 rounded-[3px] bg-ink px-4 text-paper transition-colors hover:bg-copper-deep disabled:opacity-40">
                  Send
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
