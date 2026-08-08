"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import {
  List,
  X,
  CaretDown,
  Gauge,
  Trophy,
  Broadcast,
  ShieldCheck,
  FileCode,
  ArrowUpRight,
  GitBranch,
} from "@phosphor-icons/react";
import Link from "next/link";
import { CommandTrigger } from "@/components/command/CommandPalette";

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

type NavItem = {
  label: string;
  desc: string;
  href: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  external?: boolean;
};

const PLATFORM_ITEMS: NavItem[] = [
  { label: "Overview", desc: "Best RPC & live comparison", href: "/", icon: Gauge },
  { label: "RPC Leaderboard", desc: "Rank every RPC by integrity", href: "/rpcs", icon: Trophy },
  { label: "Incident Feed", desc: "Detections as they happen", href: "/rpcs", icon: Broadcast },
  { label: "Verify Evidence", desc: "Recompute any claim in your browser", href: "/verify", icon: ShieldCheck },
];

const RESOURCE_ITEMS: NavItem[] = [
  { label: "Evidence API", desc: "Raw signed bundles", href: "/api/evidence", icon: FileCode, external: true },
  { label: "How it works", desc: "The detection pipeline", href: "/#how", icon: GitBranch },
  { label: "Sepolia Attestations", desc: "On-chain Merkle roots", href: "https://sepolia.etherscan.io", icon: ArrowUpRight, external: true },
];

export function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [menu, setMenu] = useState<null | "platform" | "resources">(null);

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
          ? "border-b border-white/8 bg-[#0a0a0b]/72 backdrop-blur-xl"
          : "border-b border-transparent bg-transparent"
      }`}
      onMouseLeave={() => setMenu(null)}
    >
      <div className="container-page flex h-[68px] items-center justify-between">
        {/* Brand */}
        <Link
          href="/"
          className="flex items-center gap-2.5 transition-opacity hover:opacity-80 focus-ring"
          aria-label="Argus home"
        >
          <ArgusLogo />
          <span className="text-[16px] font-semibold tracking-[0.5px] text-white" style={{ fontFamily: "var(--font-inter)" }}>
            Argus
          </span>
        </Link>

        {/* Center nav */}
        <nav role="navigation" className="hidden md:flex items-center gap-0.5">
          <MenuButton label="Platform" open={menu === "platform"} onOpen={() => setMenu("platform")} />
          <Link href="/#how" className="nav-link" onMouseEnter={() => setMenu(null)}>
            How it works
          </Link>
          <Link href="/verify" className="nav-link" onMouseEnter={() => setMenu(null)}>
            Verify
          </Link>
          <MenuButton label="Resources" open={menu === "resources"} onOpen={() => setMenu("resources")} />
        </nav>

        {/* Right actions */}
        <div className="hidden md:flex items-center gap-2">
          <CommandTrigger className="flex h-9 items-center gap-2 rounded-[9px] border border-white/10 bg-white/[0.03] px-3 text-[13px] text-[#a5a5ac] transition-colors hover:border-white/18 hover:text-white focus-ring" />
          <Link
            href="/verify"
            className="flex h-9 items-center rounded-[9px] px-3 text-[14px] font-medium text-[#a5a5ac] transition-colors hover:text-white focus-ring"
          >
            Verify
          </Link>
          <Link href="/rpcs" className="btn-primary btn-sm">
            Explore RPCs
          </Link>
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

      {/* Mega-menu panel */}
      <AnimatePresence>
        {menu && (
          <motion.div
            key={menu}
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.18, ease: [0.23, 1, 0.32, 1] }}
            className="absolute inset-x-0 top-[68px] hidden md:block"
            onMouseEnter={() => setMenu(menu)}
          >
            <div className="container-page">
              <div className="ml-auto w-full max-w-[520px] overflow-hidden rounded-[16px] border border-white/10 bg-[#111114]/95 p-2 shadow-[0_30px_70px_-24px_rgba(0,0,0,0.8)] backdrop-blur-xl">
                {(menu === "platform" ? PLATFORM_ITEMS : RESOURCE_ITEMS).map((item) => {
                  const Icon = item.icon;
                  const external = "external" in item && item.external;
                  const inner = (
                    <>
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[8px] border border-white/8 bg-white/[0.03] text-[#6798ff] transition-colors group-hover:border-[#6798ff]/30 group-hover:bg-[#6798ff]/10">
                        <Icon size={17} />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="flex items-center gap-1 text-[14px] font-medium text-white" style={{ fontFamily: "var(--font-inter)" }}>
                          {item.label}
                          {external && <ArrowUpRight size={12} className="text-[#54545a]" />}
                        </span>
                        <span className="block truncate text-[12.5px] text-[#7c7c82]" style={{ fontFamily: "var(--font-inter)" }}>
                          {item.desc}
                        </span>
                      </span>
                    </>
                  );
                  const cls = "group flex items-center gap-3 rounded-[11px] p-2.5 transition-colors hover:bg-white/[0.04]";
                  return external ? (
                    <a key={item.label} href={item.href} target="_blank" rel="noopener noreferrer" className={cls} onClick={() => setMenu(null)}>
                      {inner}
                    </a>
                  ) : (
                    <Link key={item.label} href={item.href} className={cls} onClick={() => setMenu(null)}>
                      {inner}
                    </Link>
                  );
                })}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

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
              {[...PLATFORM_ITEMS, ...RESOURCE_ITEMS].map((item, i) => {
                const Icon = item.icon;
                const external = "external" in item && item.external;
                return (
                  <motion.div
                    key={item.label}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.03, duration: 0.2 }}
                  >
                    <Link
                      href={item.href}
                      target={external ? "_blank" : undefined}
                      className="flex items-center gap-3 rounded-[12px] px-3 py-3 hover:bg-white/[0.04]"
                      onClick={() => setMobileOpen(false)}
                    >
                      <span className="flex h-9 w-9 items-center justify-center rounded-[8px] border border-white/8 bg-white/[0.03] text-[#6798ff]">
                        <Icon size={17} />
                      </span>
                      <span>
                        <span className="block text-[15px] font-medium text-white" style={{ fontFamily: "var(--font-inter)" }}>
                          {item.label}
                        </span>
                        <span className="block text-[12.5px] text-[#7c7c82]" style={{ fontFamily: "var(--font-inter)" }}>
                          {item.desc}
                        </span>
                      </span>
                    </Link>
                  </motion.div>
                );
              })}
            </nav>
            <div className="border-t border-white/8 p-5">
              <Link
                href="/rpcs"
                className="btn-primary w-full"
                onClick={() => setMobileOpen(false)}
              >
                Explore RPCs
              </Link>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}

function MenuButton({ label, open, onOpen }: { label: string; open: boolean; onOpen: () => void }) {
  return (
    <button
      className={`nav-link ${open ? "text-white" : ""}`}
      onMouseEnter={onOpen}
      onFocus={onOpen}
      aria-expanded={open}
    >
      {label}
      <CaretDown size={12} className={`ml-1 transition-transform duration-200 ${open ? "rotate-180" : ""}`} />
    </button>
  );
}
