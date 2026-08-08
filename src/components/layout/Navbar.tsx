"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { List, X, ArrowUpRight } from "@phosphor-icons/react";
import Link from "next/link";

function ArgusLogo() {
  return (
    <div className="relative flex items-center justify-center">
      {/* Glow behind the logo */}
      <div className="absolute inset-0 bg-[#4f46e5] opacity-20 blur-md rounded-full animate-pulse" />
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        className="h-6 w-6 shrink-0 relative z-10"
        aria-hidden="true"
      >
        <defs>
          <linearGradient id="metallic-indigo" x1="0%" y1="0%" x2="200%" y2="200%">
            <stop offset="0%" stopColor="#818cf8" />
            <stop offset="25%" stopColor="#c7d2fe" />
            <stop offset="50%" stopColor="#3730a3" />
            <stop offset="75%" stopColor="#4f46e5" />
            <stop offset="100%" stopColor="#818cf8" />
            <animate
              attributeName="x1"
              values="0%;-100%;0%"
              dur="6s"
              repeatCount="indefinite"
            />
            <animate
              attributeName="y1"
              values="0%;-100%;0%"
              dur="6s"
              repeatCount="indefinite"
            />
          </linearGradient>
        </defs>
        <path
          fill="url(#metallic-indigo)"
          fillRule="evenodd"
          clipRule="evenodd"
          d="M7.675.281A.609.609 0 018.32.014l10.047 2.222 2.511.555.628.139.157.034.04.01.01.001a.04.04 0 01.002.001l.06.016a.609.609 0 01.408.688l-3.63 19.82a.609.609 0 01-.989.358L1.718 10.605a.609.609 0 01-.123-.794l6.08-9.53zM3.34 10.374l13.118 10.971-5.76-13.394-7.358 2.423zm8.519-2.805l5.874 13.659L20.77 4.635l-8.912 2.934zM3.539 9.026l6.675-2.197-2.123-4.937L3.54 9.026zm7.836-2.58l8.195-2.698-1.466-.324-8.872-1.962 2.143 4.984z"
        />
      </svg>
    </div>
  );
}

const NAV_LINKS = [
  { href: "/", label: "Monitor" },
  { href: "/#leaderboard", label: "Leaderboard" },
  { href: "/verify", label: "Verify Claims" },
];

export function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <header role="banner" className="fixed top-6 left-0 right-0 z-50 px-6 pointer-events-none">
      <div className="mx-auto max-w-[1200px] flex justify-center pointer-events-auto">
        {/* Floating Island */}
        <div className="flex h-14 w-full md:w-auto items-center justify-between gap-8 rounded-full border border-[#222222] bg-[#000000]/60 px-6 backdrop-blur-xl shadow-[0_4px_30px_rgba(0,0,0,0.5)]">
          {/* Brand */}
          <Link
            href="/"
            className="flex items-center gap-2.5 transition-opacity hover:opacity-80"
            aria-label="Argus home"
          >
            <ArgusLogo />
            <span className="text-[16px] font-bold tracking-[2px] text-white" style={{ fontFamily: "var(--font-cinzel)" }}>
              ARGUS
            </span>
          </Link>

          {/* Desktop Links */}
          <nav role="navigation" className="hidden md:flex items-center gap-1">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="rounded-full px-5 py-2 text-[13px] font-semibold text-[#888888] transition-all duration-200 hover:bg-[#111111] hover:text-white active:scale-95"
                style={{ fontFamily: "var(--font-outfit)", letterSpacing: "0.5px" }}
              >
                {link.label}
              </Link>
            ))}
          </nav>

          {/* Desktop Actions */}
          <div className="hidden md:flex items-center gap-3">
            <Link
              href="/verify"
              className="group relative inline-flex h-9 items-center justify-center gap-2 rounded-full bg-white px-5 text-[13px] font-bold text-black transition-all duration-300 hover:scale-[0.97] active:scale-95 overflow-hidden"
              style={{ fontFamily: "var(--font-outfit)" }}
            >
              <span className="relative z-10">Terminal Access</span>
              <div className="absolute inset-0 bg-[#00f0ff] opacity-0 transition-opacity duration-300 group-hover:opacity-10" />
            </Link>
          </div>

          {/* Mobile Toggle */}
          <button
            className="md:hidden text-[#a7a7a7] hover:text-white transition-colors"
            onClick={() => setMobileOpen((o) => !o)}
            aria-label="Toggle mobile menu"
          >
            {mobileOpen ? <X size={20} /> : <List size={20} />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10, filter: "blur(4px)" }}
            animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
            exit={{ opacity: 0, y: -10, filter: "blur(4px)" }}
            transition={{ duration: 0.25, ease: "easeOut" }}
            className="pointer-events-auto absolute left-6 right-6 top-[72px] mt-2 rounded-[16px] border border-[#222222] bg-[#000000]/80 p-4 backdrop-blur-xl md:hidden shadow-2xl"
          >
            <nav className="flex flex-col gap-1">
              {NAV_LINKS.map((link, i) => (
                <motion.div
                  key={link.href}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.04, duration: 0.2, ease: "easeOut" }}
                >
                  <Link
                    href={link.href}
                    className="block rounded-lg px-4 py-3 text-[14px] font-semibold text-[#888888] hover:bg-[#111111] hover:text-white transition-colors"
                    onClick={() => setMobileOpen(false)}
                  >
                    {link.label}
                  </Link>
                </motion.div>
              ))}
              <div className="mt-2 border-t border-[#222222] pt-3">
                <Link
                  href="/verify"
                  className="flex h-11 w-full items-center justify-center rounded-lg bg-white text-[14px] font-bold text-black transition-transform active:scale-95"
                  onClick={() => setMobileOpen(false)}
                >
                  Terminal Access
                </Link>
              </div>
            </nav>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
