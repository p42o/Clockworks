"use client";

import { useEffect, useRef, useState } from "react";
import { motion, useInView, useReducedMotion } from "motion/react";
import type { ReactNode } from "react";

/**
 * Scroll-into-view reveal, built to fail visible:
 * - Server HTML has no hidden styles (crawlers & no-JS see everything).
 * - After hydration, below-fold items animate in when scrolled to.
 * - If IntersectionObserver never fires (odd embedders, bots), a 3s
 *   fallback forces everything visible anyway.
 *
 * variant "rise" adds a quiet scale 0.98→1 (portal gate kinship).
 * immediate: above-the-fold hero — restage entrance after hydration
 * without a blank first paint (initial=false until client is ready).
 */
export default function Reveal({
  children,
  delay = 0,
  className = "",
  as = "div",
  variant = "fade",
  immediate = false,
}: {
  children: ReactNode;
  delay?: number;
  className?: string;
  as?: "div" | "section" | "li" | "span";
  variant?: "fade" | "rise";
  immediate?: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();
  const inView = useInView(ref, { once: true, margin: "-60px", amount: 0.15 });
  const [forced, setForced] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setForced(true), 3000);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    if (!immediate || reduced) return;
    let id2 = 0;
    const id1 = requestAnimationFrame(() => {
      id2 = requestAnimationFrame(() => setReady(true));
    });
    return () => {
      cancelAnimationFrame(id1);
      cancelAnimationFrame(id2);
    };
  }, [immediate, reduced]);

  const Tag = motion[as];
  const hidden =
    variant === "rise"
      ? { opacity: 0, y: 16, scale: 0.98 }
      : { opacity: 0, y: 18 };
  const visible =
    variant === "rise"
      ? { opacity: 1, y: 0, scale: 1 }
      : { opacity: 1, y: 0 };

  const scrollShow = reduced || inView || forced;
  const animateTarget = immediate ? visible : scrollShow ? visible : hidden;
  // Before ready: initial=false keeps SSR/first paint visible.
  // After ready: initial=hidden triggers the entrance once.
  const initialProp = immediate && ready && !reduced ? hidden : false;

  return (
    <Tag
      ref={ref as React.Ref<never>}
      initial={initialProp}
      animate={animateTarget}
      transition={{
        duration: immediate ? 0.7 : 0.6,
        delay: immediate ? (ready ? delay : 0) : scrollShow ? delay : 0,
        ease: [0.2, 0.9, 0.25, 1.05],
      }}
      className={className}
    >
      {children}
    </Tag>
  );
}
