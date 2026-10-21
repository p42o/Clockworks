"use client";

import { useEffect, useRef, useState } from "react";
import { Link } from "next-view-transitions";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { nav } from "@/lib/site";
import { phone, primaryCta } from "@/lib/copy";
import LogoMark from "@/components/LogoMark";
import MotionControl from "@/components/MotionControl";

const easeGate: [number, number, number, number] = [0.2, 0.9, 0.25, 1.05];

export default function Header() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const reduced = useReducedMotion();
  const menuButton = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => setOpen(false), [pathname]);

  useEffect(() => {
    const close = () => setOpen(false);
    window.addEventListener("hashchange", close);
    return () => window.removeEventListener("hashchange", close);
  }, []);

  useEffect(() => {
    document.documentElement.style.overflow = open ? "hidden" : "";
    const main = document.getElementById("content");
    const footer = document.querySelector("footer");
    if (open) {
      main?.setAttribute("inert", "");
      footer?.setAttribute("inert", "");
    } else {
      main?.removeAttribute("inert");
      footer?.removeAttribute("inert");
    }
    return () => {
      document.documentElement.style.overflow = "";
      main?.removeAttribute("inert");
      footer?.removeAttribute("inert");
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      event.preventDefault();
      setOpen(false);
      menuButton.current?.focus();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <header
      className={`fixed inset-x-0 top-0 z-50 border-b transition-[background-color,box-shadow,border-color,backdrop-filter] duration-500 ${
        scrolled && !open
          ? "bg-paper/88 shadow-[0_8px_28px_-20px_rgba(26,25,22,0.45),0_1px_0_rgba(26,25,22,0.04)] backdrop-blur-lg hairline"
          : "border-transparent"
      }`}
    >
      <div className="mx-auto max-w-6xl px-5 py-3 sm:px-8">
        <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
          <Link
            href="/"
            inert={open ? true : undefined}
            className="group flex shrink-0 items-center gap-3"
            aria-label="MN Clockworks home"
          >
            <LogoMark className="h-11 w-11 transition-transform duration-700 group-hover:rotate-[24deg]" />
            <span className="display text-[1.55rem] leading-none sm:text-[1.7rem]">
              Clockworks<span className="text-copper">.</span>
            </span>
          </Link>

          <div className="flex w-full flex-wrap items-center justify-end gap-2 sm:w-auto">
          <div className="flex items-center gap-2" inert={open ? true : undefined}>
          <div className="hidden items-center gap-4 md:flex">
            <a href="/portal/client/" className="link-draw text-[0.88rem] text-ink-soft hover:text-ink">
              Client login
            </a>
            <a href={phone.tel} className="text-[0.95rem] font-medium text-ink">
              {phone.display}
            </a>
            <a
              href={phone.tel}
              className="btn-press inline-flex min-h-11 items-center rounded-[3px] bg-ink px-4 py-2 text-[0.85rem] font-medium text-paper hover:bg-copper-deep"
            >
              {primaryCta}
            </a>
          </div>

          {!open && (
            <a
              href={phone.tel}
              className="btn-press inline-flex min-h-11 items-center whitespace-nowrap rounded-[3px] bg-ink px-2.5 py-2 text-[0.75rem] font-medium text-paper md:hidden"
            >
              {phone.display}
            </a>
          )}
          </div>
          <div inert={open ? true : undefined}>
            <MotionControl />
          </div>
          <div className="md:hidden">
            <button
              ref={menuButton}
              type="button"
              onClick={() => setOpen((value) => !value)}
              aria-expanded={open}
              aria-label={open ? "Close menu" : "Open menu"}
              className="relative z-[70] flex h-11 w-11 items-center justify-center"
            >
              <span className="relative block h-[14px] w-6">
                <span
                  className={`absolute left-0 top-0 h-[1.5px] w-full bg-ink transition-transform duration-300 ${
                    open ? "translate-y-[6.5px] rotate-45" : ""
                  }`}
                />
                <span
                  className={`absolute left-0 top-1/2 h-[1.5px] w-full -translate-y-1/2 bg-ink transition-opacity duration-200 ${
                    open ? "opacity-0" : ""
                  }`}
                />
                <span
                  className={`absolute bottom-0 left-0 h-[1.5px] w-full bg-ink transition-transform duration-300 ${
                    open ? "-translate-y-[6px] -rotate-45" : ""
                  }`}
                />
              </span>
            </button>
          </div>
          </div>
        </div>

        <nav className="mt-2 hidden flex-wrap gap-x-5 gap-y-1 md:flex" aria-label="Primary">
          {nav.map((item) => (
            <a key={item.href} href={item.href} className="link-draw min-h-8 text-[0.9rem] text-ink-soft hover:text-ink">
              {item.label}
            </a>
          ))}
        </nav>
      </div>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={reduced ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={reduced ? undefined : { opacity: 0 }}
            transition={{ duration: 0.28, ease: easeGate }}
            className="fixed inset-0 z-[60] flex flex-col overflow-y-auto bg-paper md:hidden"
          >
            <div className="grain absolute inset-0" aria-hidden />
            <nav className="relative mt-24 flex flex-col gap-1 px-7 pb-16" aria-label="Mobile">
              {nav.map((item, index) => (
                <motion.a
                  key={item.href}
                  href={item.href}
                  onClick={() => setOpen(false)}
                  initial={reduced ? false : { opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: reduced ? 0 : 0.04 + index * 0.04, duration: 0.4, ease: easeGate }}
                  className="display border-b hairline-soft py-4 text-4xl text-ink"
                >
                  {item.label}
                </motion.a>
              ))}
              <a
                href="/portal/client/"
                onClick={() => setOpen(false)}
                className="display border-b hairline-soft py-4 text-4xl text-ink"
              >
                Client login
              </a>
              <a href={phone.tel} className="mt-6 text-lg font-medium text-ink">
                {phone.display}
              </a>
              <a
                href={phone.tel}
                className="btn-press mt-4 inline-flex min-h-11 items-center justify-center rounded-[3px] bg-copper-deep px-5 py-4 text-center font-medium text-cream-bright"
              >
                {primaryCta}
              </a>
            </nav>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
