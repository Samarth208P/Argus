"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { List, X } from "@phosphor-icons/react";
import Link from "next/link";
import { LaunchAppButton } from "@/components/ui/LaunchAppButton";

function ArgusLogo() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      className="h-[22px] w-[22px] shrink-0 text-[#6798ff]"
      fill="currentColor"
      aria-hidden="true"
    >
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M7.675.281A.609.609 0 018.32.014l10.047 2.222 2.511.555.628.139.157.034.04.01.01.001a.04.04 0 01.002.001l.06.016a.609.609 0 01.408.688l-3.63 19.82a.609.609 0 01-.989.358L1.718 10.605a.609.609 0 01-.123-.794l6.08-9.53zM3.34 10.374l13.118 10.971-5.76-13.394-7.358 2.423zm8.519-2.805l5.874 13.659L20.77 4.635l-8.912 2.934zM3.539 9.026l6.675-2.197-2.123-4.937L3.54 9.026zm7.836-2.58l8.195-2.698-1.466-.324-8.872-1.962 2.143 4.984z"
      />
    </svg>
  );
}

const NAV_LINKS = [
  { label: "Leaderboard", href: "/rpcs" },
  { label: "How it works", href: "/#how" },
  { label: "Verify", href: "/verify" },
];

export function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    document.body.style.overflow = mobileOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileOpen]);

  return (
    <header
      role="banner"
      className={`fixed inset-x-0 top-0 z-50 transition-all duration-300 ${
        scrolled
          ? "border-b border-white/8 bg-[#0a0a0b]/92 backdrop-blur-xl"
          : "border-b border-transparent bg-transparent"
      }`}
    >
      <div className="container-page flex h-[68px] items-center justify-between gap-6">
        {/* Brand */}
        <Link
          href="/"
          className="flex shrink-0 items-center gap-2.5 transition-opacity hover:opacity-80 focus-ring"
          aria-label="Argus home"
        >
          <ArgusLogo />
          <span className="text-[16px] font-semibold tracking-[0.5px] text-white" style={{ fontFamily: "var(--font-inter)" }}>
            Argus
          </span>
        </Link>

        {/* Center nav — direct links, no dropdowns */}
        <nav role="navigation" className="hidden flex-1 items-center justify-center gap-1 md:flex">
          {NAV_LINKS.map((link) => (
            <Link key={link.href} href={link.href} className="nav-link">
              {link.label}
            </Link>
          ))}
        </nav>

        {/* Right actions */}
        <div className="hidden shrink-0 items-center gap-2 md:flex">
          <LaunchAppButton href="/rpcs" />
        </div>

        {/* Mobile toggle */}
        <button
          className="flex h-9 w-9 items-center justify-center rounded-[9px] text-[#a5a5ac] transition-colors hover:text-white md:hidden focus-ring"
          onClick={() => setMobileOpen((o) => !o)}
          aria-label="Toggle menu"
          aria-expanded={mobileOpen}
        >
          {mobileOpen ? <X size={20} /> : <List size={20} />}
        </button>
      </div>

      {/* Mobile drawer */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 top-[68px] z-40 flex flex-col border-t border-white/8 bg-[#0a0a0b]/98 backdrop-blur-xl md:hidden"
          >
            <nav className="flex flex-1 flex-col gap-1 overflow-y-auto p-5">
              {NAV_LINKS.map((link, i) => (
                <motion.div
                  key={link.href}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.04, duration: 0.2 }}
                >
                  <Link
                    href={link.href}
                    className="block rounded-[12px] px-3 py-3.5 text-[16px] font-medium text-white hover:bg-white/[0.04]"
                    style={{ fontFamily: "var(--font-inter)" }}
                    onClick={() => setMobileOpen(false)}
                  >
                    {link.label}
                  </Link>
                </motion.div>
              ))}
            </nav>
            <div className="border-t border-white/8 p-5">
              <LaunchAppButton href="/rpcs" className="h-11 w-full" onClick={() => setMobileOpen(false)} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
