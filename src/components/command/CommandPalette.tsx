"use client";

import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import * as Dialog from "@radix-ui/react-dialog";
import { AnimatePresence, motion } from "motion/react";
import {
  MagnifyingGlass,
  Gauge,
  Trophy,
  Broadcast,
  ShieldCheck,
  Plus,
  Skull,
  FileCode,
  ArrowRight,
  CornersOut,
} from "@phosphor-icons/react";

/** Global event other components dispatch to open the palette. */
export const OPEN_COMMAND_EVENT = "argus:command-open";

type Cmd = {
  id: string;
  label: string;
  hint?: string;
  group: "Navigate" | "Actions" | "Verify";
  icon: React.ComponentType<{ size?: number; weight?: "regular" | "bold" | "fill" }>;
  href: string;
  keywords?: string;
};

const COMMANDS: Cmd[] = [
  { id: "monitor", label: "Live Monitor", hint: "Real-time dashboard", group: "Navigate", icon: Gauge, href: "/terminal", keywords: "home dashboard" },
  { id: "leaderboard", label: "Integrity Leaderboard", hint: "Provider scores", group: "Navigate", icon: Trophy, href: "/terminal#leaderboard", keywords: "rank score rpc" },
  { id: "feed", label: "Incident Feed", hint: "Live detections", group: "Navigate", icon: Broadcast, href: "/terminal#live-feed", keywords: "incidents events" },
  { id: "verify", label: "Verify Evidence", hint: "Recompute a claim", group: "Verify", icon: ShieldCheck, href: "/verify", keywords: "proof merkle consensus" },
  { id: "evidence-api", label: "Open Evidence API", hint: "Raw JSON bundle", group: "Verify", icon: FileCode, href: "/api/evidence", keywords: "json api receipts" },
  { id: "add", label: "Add RPC Provider", hint: "Register an endpoint", group: "Actions", icon: Plus, href: "/terminal", keywords: "new node infura alchemy" },
  { id: "adversary", label: "Adversary Console", hint: "Inject a fault", group: "Actions", icon: Skull, href: "/terminal", keywords: "attack simulate censor stale mutate" },
];

const GROUP_ORDER: Cmd["group"][] = ["Navigate", "Actions", "Verify"];

export function CommandPalette() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const listRef = useRef<HTMLDivElement>(null);

  // Global open triggers: ⌘K / Ctrl-K and the custom event.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((o) => !o);
      }
    };
    const onOpen = () => setOpen(true);
    window.addEventListener("keydown", onKey);
    window.addEventListener(OPEN_COMMAND_EVENT, onOpen);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener(OPEN_COMMAND_EVENT, onOpen);
    };
  }, []);

  useEffect(() => {
    if (open) {
      setQuery("");
      setActive(0);
    }
  }, [open]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return COMMANDS;
    return COMMANDS.filter((c) =>
      `${c.label} ${c.hint ?? ""} ${c.keywords ?? ""}`.toLowerCase().includes(q)
    );
  }, [query]);

  const grouped = useMemo(() => {
    const map = new Map<Cmd["group"], Cmd[]>();
    for (const g of GROUP_ORDER) {
      const items = filtered.filter((c) => c.group === g);
      if (items.length) map.set(g, items);
    }
    return map;
  }, [filtered]);

  // Flat ordered list mirrors visual order for arrow navigation.
  const flat = useMemo(() => Array.from(grouped.values()).flat(), [grouped]);

  const run = useCallback(
    (cmd?: Cmd) => {
      const target = cmd ?? flat[active];
      if (!target) return;
      setOpen(false);
      if (target.href.startsWith("/api") || target.href.startsWith("http")) {
        window.open(target.href, "_blank", "noopener,noreferrer");
      } else {
        router.push(target.href);
      }
    },
    [active, flat, router]
  );

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((a) => Math.min(flat.length - 1, a + 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((a) => Math.max(0, a - 1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      run();
    }
  };

  useEffect(() => {
    if (active >= flat.length) setActive(Math.max(0, flat.length - 1));
  }, [flat.length, active]);

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <AnimatePresence>
        {open && (
          <Dialog.Portal forceMount>
            <Dialog.Overlay asChild forceMount>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.18 }}
                className="fixed inset-0 z-[100] bg-black/70 backdrop-blur-[3px]"
              />
            </Dialog.Overlay>
            <Dialog.Content asChild forceMount aria-label="Command palette" onKeyDown={onKeyDown}>
              <motion.div
                initial={{ opacity: 0, y: -8, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -8, scale: 0.98 }}
                transition={{ duration: 0.2, ease: [0.23, 1, 0.32, 1] }}
                className="fixed left-1/2 top-[14vh] z-[101] w-[92vw] max-w-[600px] -translate-x-1/2 overflow-hidden rounded-[16px] border border-white/10 bg-[#111114]/95 shadow-[0_30px_80px_-20px_rgba(0,0,0,0.8)] backdrop-blur-xl"
              >
                <Dialog.Title className="sr-only">Command palette</Dialog.Title>
                <Dialog.Description className="sr-only">
                  Search and jump anywhere in Argus.
                </Dialog.Description>

                {/* Search input */}
                <div className="flex items-center gap-3 border-b border-white/8 px-4">
                  <MagnifyingGlass size={18} className="shrink-0 text-[#7c7c82]" />
                  <input
                    autoFocus
                    value={query}
                    onChange={(e) => {
                      setQuery(e.target.value);
                      setActive(0);
                    }}
                    placeholder="Search providers, actions, evidence…"
                    className="h-14 w-full bg-transparent text-[15px] text-white placeholder-[#54545a] outline-none"
                    style={{ fontFamily: "var(--font-inter)" }}
                    aria-label="Search commands"
                  />
                  <span className="kbd shrink-0">ESC</span>
                </div>

                {/* Results */}
                <div ref={listRef} className="max-h-[52vh] overflow-y-auto p-2">
                  {flat.length === 0 && (
                    <div className="px-4 py-10 text-center">
                      <p className="text-[14px] text-[#7c7c82]" style={{ fontFamily: "var(--font-inter)" }}>
                        No matches for <span className="text-white">“{query}”</span>
                      </p>
                    </div>
                  )}

                  {Array.from(grouped.entries()).map(([group, items]) => (
                    <div key={group} className="mb-1">
                      <p className="px-3 pb-1 pt-2 text-[10px] font-medium uppercase tracking-[1.2px] text-[#54545a]" style={{ fontFamily: "var(--font-jetbrains-mono)" }}>
                        {group}
                      </p>
                      {items.map((cmd) => {
                        const idx = flat.indexOf(cmd);
                        const isActive = idx === active;
                        const Icon = cmd.icon;
                        return (
                          <button
                            key={cmd.id}
                            onMouseMove={() => setActive(idx)}
                            onClick={() => run(cmd)}
                            className={`group flex w-full items-center gap-3 rounded-[9px] px-3 py-2.5 text-left transition-colors ${
                              isActive ? "bg-white/6" : "hover:bg-white/4"
                            }`}
                          >
                            <span
                              className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-[7px] border transition-colors ${
                                isActive
                                  ? "border-[#6798ff]/40 bg-[#6798ff]/12 text-[#6798ff]"
                                  : "border-white/8 bg-white/3 text-[#a5a5ac]"
                              }`}
                            >
                              <Icon size={16} weight={isActive ? "bold" : "regular"} />
                            </span>
                            <span className="min-w-0 flex-1">
                              <span className="block truncate text-[14px] font-medium text-white" style={{ fontFamily: "var(--font-inter)" }}>
                                {cmd.label}
                              </span>
                              {cmd.hint && (
                                <span className="block truncate text-[12px] text-[#7c7c82]" style={{ fontFamily: "var(--font-inter)" }}>
                                  {cmd.hint}
                                </span>
                              )}
                            </span>
                            <ArrowRight
                              size={14}
                              className={`shrink-0 transition-all ${
                                isActive ? "translate-x-0 text-[#6798ff] opacity-100" : "-translate-x-1 opacity-0"
                              }`}
                            />
                          </button>
                        );
                      })}
                    </div>
                  ))}
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between border-t border-white/8 px-4 py-2.5">
                  <div className="flex items-center gap-3 text-[11px] text-[#7c7c82]" style={{ fontFamily: "var(--font-inter)" }}>
                    <span className="flex items-center gap-1.5"><span className="kbd">↑</span><span className="kbd">↓</span> navigate</span>
                    <span className="flex items-center gap-1.5"><span className="kbd">↵</span> open</span>
                  </div>
                  <span className="flex items-center gap-1.5 text-[11px] text-[#54545a]" style={{ fontFamily: "var(--font-inter)" }}>
                    <CornersOut size={12} /> Argus Command
                  </span>
                </div>
              </motion.div>
            </Dialog.Content>
          </Dialog.Portal>
        )}
      </AnimatePresence>
    </Dialog.Root>
  );
}

/** Small helper button that opens the palette from anywhere. */
export function CommandTrigger({ className }: { className?: string }) {
  return (
    <button
      onClick={() => window.dispatchEvent(new Event(OPEN_COMMAND_EVENT))}
      className={className}
      aria-label="Open command palette"
    >
      <MagnifyingGlass size={15} />
      <span className="hidden lg:inline">Search</span>
      <span className="hidden lg:flex items-center gap-0.5">
        <span className="kbd">⌘</span>
        <span className="kbd">K</span>
      </span>
    </button>
  );
}
