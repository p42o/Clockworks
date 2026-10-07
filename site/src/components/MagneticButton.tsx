"use client";

import { useRef, type ReactNode, type ComponentPropsWithoutRef } from "react";
import { motion, useMotionValue, useReducedMotion, useSpring } from "motion/react";
import { Link } from "next-view-transitions";

const spring = { stiffness: 340, damping: 24, mass: 0.65 };

/**
 * Magnetic CTA: the button leans toward the pointer inside a proximity field,
 * snaps home on leave. Inert on touch devices and when reduced-motion is on.
 */
export default function MagneticButton({
  href,
  children,
  variant = "primary",
  className = "",
  ...rest
}: {
  href: string;
  children: ReactNode;
  variant?: "primary" | "ghost";
  className?: string;
} & Omit<ComponentPropsWithoutRef<"a">, "href" | "className" | "children">) {
  const ref = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();
  const mx = useMotionValue(0);
  const my = useMotionValue(0);
  const sx = useSpring(mx, spring);
  const sy = useSpring(my, spring);

  const onMove = (e: React.PointerEvent) => {
    if (reduced || e.pointerType !== "mouse") return;
    const r = ref.current?.getBoundingClientRect();
    if (!r) return;
    mx.set((e.clientX - (r.left + r.width / 2)) * 0.28);
    my.set((e.clientY - (r.top + r.height / 2)) * 0.34);
  };
  const reset = () => {
    mx.set(0);
    my.set(0);
  };

  const base =
    "btn-press inline-flex items-center gap-3 rounded-[3px] px-7 py-3.5 text-[0.95rem] font-medium select-none";
  const look =
    variant === "primary"
      ? "bg-copper text-cream-bright hover:bg-copper-deep shadow-[0_1px_0_rgba(14,14,12,0.25),0_12px_32px_-14px_rgba(212,88,42,0.6)] hover:shadow-[0_1px_0_rgba(14,14,12,0.2),0_16px_36px_-12px_rgba(212,88,42,0.7)]"
      : "border hairline text-ink hover:border-copper hover:text-copper";

  return (
    <motion.div
      ref={ref}
      onPointerMove={onMove}
      onPointerLeave={reset}
      style={{ x: sx, y: sy }}
      whileTap={reduced ? undefined : { scale: 0.97 }}
      transition={{ type: "spring", stiffness: 400, damping: 28 }}
      className="inline-block"
    >
      <Link href={href} className={`${base} ${look} ${className}`} {...rest}>
        {children}
      </Link>
    </motion.div>
  );
}
