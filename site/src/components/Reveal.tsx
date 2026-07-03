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
 */
export default function Reveal({
  children,
  delay = 0,
  className = "",
  as = "div",
}: {
  children: ReactNode;
  delay?: number;
  className?: string;
  as?: "div" | "section" | "li" | "span";
}) {
  const ref = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();
  const inView = useInView(ref, { once: true, margin: "-60px" });
  const [forced, setForced] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setForced(true), 3000);
    return () => clearTimeout(t);
  }, []);

  const show = reduced || inView || forced;
  const Tag = motion[as];

  return (
    <Tag
      ref={ref as React.Ref<never>}
      initial={false}
      animate={show ? { opacity: 1, y: 0 } : { opacity: 0, y: 18 }}
      transition={{ duration: 0.65, delay: show ? delay : 0, ease: [0.22, 1, 0.36, 1] }}
      className={className}
    >
      {children}
    </Tag>
  );
}
