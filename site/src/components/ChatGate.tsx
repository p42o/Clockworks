"use client";

import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";
import { queueChatOpen } from "@/lib/chat-bridge";

const ChatWidget = dynamic(() => import("@/components/ChatWidget"), { ssr: false });

/**
 * The chat chunk stays out of the first load. It mounts on idle, or sooner
 * if someone uses a [data-open-chat] control before then.
 */
export default function ChatGate() {
  const [ready, setReady] = useState(false);
  const readyRef = useRef(false);

  useEffect(() => {
    const arm = () => {
      if (readyRef.current) return;
      readyRef.current = true;
      setReady(true);
    };
    const onClick = (event: MouseEvent) => {
      const el = (event.target as HTMLElement | null)?.closest?.("[data-open-chat]");
      if (!(el instanceof HTMLElement) || readyRef.current) return;
      event.preventDefault();
      queueChatOpen(el);
      arm();
    };
    document.addEventListener("click", onClick);
    let idle = 0;
    let timer = 0;
    if (typeof window.requestIdleCallback === "function") {
      idle = window.requestIdleCallback(arm, { timeout: 4000 });
    } else {
      timer = window.setTimeout(arm, 2000);
    }
    return () => {
      document.removeEventListener("click", onClick);
      if (idle) window.cancelIdleCallback(idle);
      if (timer) window.clearTimeout(timer);
    };
  }, []);

  if (!ready) {
    return (
      <button
        type="button"
        aria-label="Chat with the Front Desk"
        className="fixed bottom-5 right-5 z-[70] flex h-[58px] w-[58px] items-center justify-center rounded-full bg-copper-deep text-cream-bright"
        onClick={(event) => {
          queueChatOpen(event.currentTarget);
          readyRef.current = true;
          setReady(true);
        }}
      >
        <svg width="27" height="27" viewBox="0 0 32 32" fill="none" aria-hidden>
          <path
            d="M6 5.5h20A3.5 3.5 0 0 1 29.5 9v9A3.5 3.5 0 0 1 26 21.5H13.9l-4.6 3.9A1 1 0 0 1 7.7 24.6V21.5H6A3.5 3.5 0 0 1 2.5 18V9A3.5 3.5 0 0 1 6 5.5Z"
            fill="#FDFBF5"
          />
        </svg>
      </button>
    );
  }

  return <ChatWidget />;
}
