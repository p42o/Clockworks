"use client";

import { useEffect, useRef } from "react";

/**
 * Copper cursor dot + trailing ring. Pointer-fine devices only; the ring
 * lerps behind the dot so movement feels physical. Removed entirely for
 * touch devices and reduced-motion users.
 */
export default function Cursor() {
  const dotRef = useRef<HTMLDivElement>(null);
  const ringRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fine = window.matchMedia("(pointer: fine)").matches;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const dot = dotRef.current;
    const ring = ringRef.current;
    if (!fine || reduced || !dot || !ring) return;

    let x = -100, y = -100, rx = -100, ry = -100;
    let raf = 0;
    let scale = 1;

    const onMove = (e: PointerEvent) => {
      x = e.clientX;
      y = e.clientY;
      const t = e.target as HTMLElement | null;
      scale = t?.closest("a,button,[role=button],input,textarea,select,label") ? 2.1 : 1;
    };

    const loop = () => {
      rx += (x - rx) * 0.16;
      ry += (y - ry) * 0.16;
      dot.style.transform = `translate(${x - 4}px, ${y - 4}px)`;
      ring.style.transform = `translate(${rx - 17}px, ${ry - 17}px) scale(${scale})`;
      raf = requestAnimationFrame(loop);
    };

    document.documentElement.style.cursor = "none";
    document.body.style.cursor = "none";
    window.addEventListener("pointermove", onMove, { passive: true });
    raf = requestAnimationFrame(loop);

    return () => {
      document.documentElement.style.cursor = "";
      document.body.style.cursor = "";
      window.removeEventListener("pointermove", onMove);
      cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <>
      <div ref={dotRef} className="cursor-dot hidden [@media(pointer:fine)]:block" aria-hidden />
      <div
        ref={ringRef}
        className="cursor-ring hidden [@media(pointer:fine)]:block transition-transform duration-150"
        aria-hidden
      />
    </>
  );
}
