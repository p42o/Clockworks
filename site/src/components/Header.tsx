"use client";

import { useEffect, useState } from "react";
import { Link } from "next-view-transitions";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { nav, site } from "@/lib/site";
import PhoneIcon from "@/components/PhoneIcon";
import LogoMark from "@/components/LogoMark";

const easeGate: [number, number, number, number] = [0.2, 0.9, 0.25, 1.05];

export default function Header() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const reduced = useReducedMotion();

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
      className={`fixed inset-x-0 top-0 z-50 transition-[background-color,box-shadow,border-color,backdrop-filter] duration-500 border-b ${
        scrolled && !open
          ? "bg-paper/88 backdrop-blur-lg hairline shadow-[0_8px_28px_-20px_rgba(26,25,22,0.45),0_1px_0_rgba(26,25,22,0.04)]"
          : "border-transparent"
      }`}
    >
      <div className="site-header-row mx-auto flex max-w-6xl xl:max-w-7xl items-center justify-between px-5 py-4 sm:px-8">
        <Link href="/" className="group flex items-center gap-3" aria-label="MN Clockworks home">
          <LogoMark className="h-9 w-9 md:h-11 md:w-11 transition-transform duration-700 group-hover:rotate-[24deg]" />
          <span className="display whitespace-nowrap text-[1.25rem] md:text-[1.7rem] leading-none">
            MN Clockworks<span className="text-copper transition-opacity group-hover:animate-tick">.</span>
          </span>
        </Link>

        <nav className="hidden items-center gap-3 lg:gap-7 md:flex whitespace-nowrap" aria-label="Primary">
          {nav.map((item) => {
            const active = pathname?.startsWith(item.href.replace(/\/$/, ""));
            const isResults = (item.href as string) === "/results/"; // Results is out of nav while /results/ redirects; kept for when it returns
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={`link-draw text-[0.9rem] transition-colors ${
                  active ? "is-active text-copper" : ""
                } ${
                  isResults && !active
                    ? "nav-results font-medium"
                    : active
                      ? ""
                      : "text-ink-soft hover:text-ink"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
          <a href={site.phone.href} aria-label="Call MN Clockworks at (763) 202-7778" className="link-draw flex shrink-0 items-center gap-1.5 font-mono text-[0.7rem] text-ink-soft transition-colors hover:text-copper lg:gap-2 lg:text-xs"><PhoneIcon /><span>{site.phone.display}</span></a>
          <Link
            href="/book/"
            className="btn-press rounded-[3px] bg-ink px-3.5 py-2 text-[0.8rem] font-medium text-paper transition-colors duration-300 hover:bg-copper lg:px-5 lg:py-2.5 lg:text-[0.875rem]"
          >
            Get in touch
          </Link>
        </nav>

        <div className="flex items-center gap-1.5 md:hidden">
          <a href={site.phone.href} aria-label="Call MN Clockworks at (763) 202-7778" tabIndex={open ? -1 : undefined} className={`flex h-10 w-10 items-center justify-center rounded-full border hairline text-ink-soft transition-opacity hover:text-copper ${open ? "pointer-events-none opacity-0" : "opacity-100"}`}><PhoneIcon /></a>
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
            initial={reduced ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={reduced ? undefined : { opacity: 0 }}
            transition={{ duration: 0.28, ease: easeGate }}
            className="fixed inset-0 z-[60] flex flex-col bg-paper md:hidden"
          >
            <div className="grain absolute inset-0" aria-hidden />
            <nav
              className="relative mt-24 flex flex-col gap-2 overflow-y-auto px-7 pb-8"
              aria-label="Mobile"
            >
              {[{ href: "/", label: "Home" }, ...nav].map((item, i) => (
                <motion.div
                  key={item.href}
                  initial={reduced ? false : { opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: reduced ? 0 : 0.05 + i * 0.05, duration: 0.48, ease: easeGate }}
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
                initial={reduced ? false : { opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: reduced ? 0 : 0.38, duration: 0.48, ease: easeGate }}
                className="mt-4"
              >
                <Link
                  href="/book/"
                  className="btn-press block rounded-[3px] bg-copper px-6 py-4 text-center text-lg font-medium text-cream-bright"
                >
                  Get in touch
                </Link>
                <motion.a href={site.phone.href} initial={reduced ? false : { opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: reduced ? 0 : 0.46, duration: 0.48, ease: easeGate }} className="mt-3 flex min-h-[60px] w-full items-center justify-center gap-3 rounded-[3px] border hairline px-3 py-4 text-sm font-medium transition-colors hover:text-copper"><PhoneIcon />{site.phone.display}</motion.a>
                <p className="mt-3 text-center text-sm text-ink-faint">{site.cta.sub}</p>
              </motion.div>
            </nav>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
