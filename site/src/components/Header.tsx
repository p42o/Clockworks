"use client";

import { useEffect, useState } from "react";
import { Link } from "next-view-transitions";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import { nav, site } from "@/lib/site";
import LogoMark from "@/components/LogoMark";

export default function Header() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => setOpen(false), [pathname]);

  useEffect(() => {
    document.documentElement.style.overflow = open ? "hidden" : "";
    return () => {
      document.documentElement.style.overflow = "";
    };
  }, [open]);

  return (
    <header
      className={`fixed inset-x-0 top-0 z-50 transition-[background-color,box-shadow,border-color] duration-500 border-b ${
        scrolled && !open
          ? "bg-paper/85 backdrop-blur-md hairline shadow-[0_1px_0_rgba(26,25,22,0.02)]"
          : "border-transparent"
      }`}
    >
      <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4 sm:px-8">
        <Link href="/" className="group flex items-center gap-3" aria-label="MN Clockworks home">
          <LogoMark className="h-11 w-11 transition-transform duration-700 group-hover:rotate-[24deg]" />
          <span className="display text-[1.7rem] leading-none">
            Clockworks<span className="text-copper transition-opacity group-hover:animate-tick">.</span>
          </span>
        </Link>

        <nav className="hidden items-center gap-5 lg:gap-7 md:flex" aria-label="Primary">
          {nav.map((item) => {
            const active = pathname?.startsWith(item.href.replace(/\/$/, ""));
            const isResults = item.href === "/results/";
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`link-draw text-[0.9rem] transition-colors ${
                  isResults && !active
                    ? "nav-results font-medium"
                    : active
                      ? "text-copper"
                      : "text-ink-soft hover:text-ink"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
          <Link
            href="/book/"
            className="rounded-[3px] bg-ink px-5 py-2.5 text-[0.875rem] font-medium text-paper transition-colors duration-300 hover:bg-copper"
          >
            {site.cta.label}
          </Link>
        </nav>

        <div className="flex items-center gap-1.5 md:hidden">
          <Link
            href="/book/"
            className={`rounded-[3px] bg-ink px-3.5 py-2 text-[0.8rem] font-medium text-paper transition-opacity duration-200 ${
              open ? "pointer-events-none opacity-0" : "opacity-100"
            }`}
          >
            Free audit
          </Link>
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
            aria-label={open ? "Close menu" : "Open menu"}
            className="relative z-[70] flex h-10 w-10 items-center justify-center"
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

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="fixed inset-0 z-[60] flex flex-col bg-paper md:hidden"
          >
            <div className="grain absolute inset-0" aria-hidden />
            <nav
              className="relative mt-24 flex flex-col gap-2 px-7"
              aria-label="Mobile"
            >
              {[{ href: "/", label: "Home" }, ...nav].map((item, i) => (
                <motion.div
                  key={item.href}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.06 + i * 0.055, duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
                >
                  <Link
                    href={item.href}
                    className="display block border-b hairline-soft py-4 text-4xl text-ink"
                  >
                    {item.label}
                  </Link>
                </motion.div>
              ))}
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4, duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
                className="mt-8"
              >
                <Link
                  href="/book/"
                  className="block rounded-[3px] bg-copper px-6 py-4 text-center text-lg font-medium text-cream-bright"
                >
                  {site.cta.label}
                </Link>
                <p className="mt-3 text-center text-sm text-ink-faint">{site.cta.sub}</p>
              </motion.div>
            </nav>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
