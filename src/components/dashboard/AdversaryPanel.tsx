"use client";

import { useState, useEffect } from "react";
import { Warning, Clock, ShieldSlash, XCircle, Spinner } from "@phosphor-icons/react";
import type { DbProvider } from "@/lib/db/types";

type Mode = "stale" | "mutate" | "censor";

interface AdversaryPanelProps {
  providers: DbProvider[];
  activeAdversary: {
    targetId: string | null;
    mode: Mode | null;
    expiresAt: number | null;
  };
  onToggle: (targetId: string | null, mode: Mode | null, durationSeconds: number) => Promise<void>;
}

export function AdversaryPanel({ providers, activeAdversary, onToggle }: AdversaryPanelProps) {
  const [targetId, setTargetId] = useState("");
  const [mode, setMode] = useState<Mode>("mutate");
  const [duration, setDuration] = useState(120); // seconds
  const [loading, setLoading] = useState(false);

  const handleToggle = async () => {
    setLoading(true);
    try {
      const isDeactivating = activeAdversary.targetId !== null;
      if (isDeactivating) {
        await onToggle(null, null, 0);
      } else {
        await onToggle(targetId, mode, duration);
      }
    } catch (err) {
      console.warn("Failed to update adversary:", err);
    } finally {
      setLoading(false);
    }
  };

  const isSimulatorActive = activeAdversary.targetId !== null;
  const timeRemaining = activeAdversary.expiresAt
    ? Math.max(0, Math.round((activeAdversary.expiresAt - Date.now()) / 1000))
    : 0;

  return (
    <div className="flex flex-col gap-5 rounded-[8px] border border-[#1e1e1e] bg-[#141414] p-6 relative overflow-hidden">
      {/* Blueprint grid effect */}
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(rgba(30,30,30,0.3)_1px,transparent_1px)] bg-[size:100%_8px] opacity-20" />

      <div className="relative z-10 flex items-center justify-between">
        <div>
          <p className="eyebrow mb-1 text-[#ff6b6b]">THREAT INJECTOR</p>
          <h3
            className="text-[18px] font-medium text-white tracking-[-0.42px]"
            style={{ fontFamily: "var(--font-inter)" }}
          >
            Adversary Console
          </h3>
        </div>
        <div className={`h-2.5 w-2.5 rounded-full ${isSimulatorActive ? "bg-[#ff6b6b] animate-pulse" : "bg-[#313131]"}`} />
      </div>

      <div className="relative z-10 border-t border-[#1e1e1e] pt-5">
        {isSimulatorActive ? (
          // Active simulator mode display (Tactile alert state)
          <div className="rounded-[8px] border border-[#ff6b6b]/30 bg-[#ff6b6b]/5 p-5 flex flex-col gap-4">
            <div className="flex items-center gap-3 border-b border-[#ff6b6b]/20 pb-3">
              <Warning size={20} color="#ff6b6b" weight="bold" className="animate-pulse" />
              <p
                className="text-[15px] font-medium text-white flex-1 tracking-tight"
                style={{ fontFamily: "var(--font-inter)" }}
              >
                ATTACK ACTIVE
              </p>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-[10px] text-[#ff6b6b] font-medium tracking-widest uppercase mb-1" style={{ fontFamily: "var(--font-jetbrains-mono)" }}>Target</p>
                <p className="text-[13px] font-medium text-white" style={{ fontFamily: "var(--font-inter)" }}>{activeAdversary.targetId}</p>
              </div>
              <div>
                <p className="text-[10px] text-[#ff6b6b] font-medium tracking-widest uppercase mb-1" style={{ fontFamily: "var(--font-jetbrains-mono)" }}>Vector</p>
                <p className="text-[13px] font-medium text-white uppercase" style={{ fontFamily: "var(--font-inter)" }}>{activeAdversary.mode}</p>
              </div>
            </div>

            <div className="flex items-center justify-between mt-2 bg-[#0a0a0a] p-3 rounded-[6px] border border-[#313131]">
              <span className="text-[11px] text-[#a7a7a7] font-medium tracking-widest" style={{ fontFamily: "var(--font-jetbrains-mono)" }}>T-MINUS</span>
              <span
                className="font-medium text-[#ff6b6b] tabular-nums text-[16px]"
                style={{ fontFamily: "var(--font-jetbrains-mono)" }}
              >
                {timeRemaining}s
              </span>
            </div>

            <button
              onClick={handleToggle}
              disabled={loading}
              className="mt-2 flex items-center justify-center gap-2 w-full rounded-[8px] bg-[#ff6b6b] text-black font-medium text-[14px] h-10 hover:opacity-90 transition-all active:scale-[0.98]"
              id="deactivate-adversary-btn"
            >
              {loading ? <Spinner size={16} className="animate-spin" /> : <XCircle size={16} weight="bold" />}
              ABORT INJECTION
            </button>
          </div>
        ) : (
          // Simulator configuration form (Tactile board)
          <div className="flex flex-col gap-6">
            {/* Target Select */}
            <div className="flex flex-col gap-2">
              <label className="text-[11px] font-medium text-[#a7a7a7] uppercase tracking-[0.5px]" style={{ fontFamily: "var(--font-jetbrains-mono)" }}>
                Target Node
              </label>
              <div className="relative">
                <select
                  value={targetId}
                  onChange={(e) => setTargetId(e.target.value)}
                  className="w-full appearance-none rounded-[8px] border border-[#313131] bg-[#0a0a0a] px-4 py-2.5 text-[14px] font-medium text-white outline-none focus:border-[#6798ff] transition-all cursor-pointer"
                  style={{ fontFamily: "var(--font-inter)" }}
                >
                  <option value="" disabled>Select target...</option>
                  {providers.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.label} ({p.id})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Mode Select Buttons (Radio-like) */}
            <div className="flex flex-col gap-2">
              <span className="text-[11px] font-medium text-[#a7a7a7] uppercase tracking-[0.5px]" style={{ fontFamily: "var(--font-jetbrains-mono)" }}>
                Attack Vector
              </span>
              <div className="grid grid-cols-3 gap-2">
                {(
                  [
                    { id: "mutate", label: "Mutate", icon: Warning },
                    { id: "stale", label: "Stale", icon: Clock },
                    { id: "censor", label: "Censor", icon: ShieldSlash },
                  ] as const
                ).map((opt) => {
                  const Icon = opt.icon;
                  const active = mode === opt.id;
                  return (
                    <button
                      key={opt.id}
                      onClick={() => setMode(opt.id)}
                      className={`flex flex-col items-center gap-2 rounded-[8px] border p-3 transition-all active:scale-95 ${
                        active
                          ? "border-[#6798ff] bg-[#6798ff]/10 text-[#6798ff]"
                          : "border-[#313131] bg-[#0a0a0a] text-[#a7a7a7] hover:border-[#454545] hover:text-white"
                      }`}
                    >
                      <Icon size={20} weight={active ? "bold" : "regular"} />
                      <span className="text-[11px] font-medium uppercase tracking-wider" style={{ fontFamily: "var(--font-jetbrains-mono)" }}>{opt.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Duration Select */}
            <div className="flex flex-col gap-2">
              <label className="text-[11px] font-medium text-[#a7a7a7] uppercase tracking-[0.5px]" style={{ fontFamily: "var(--font-jetbrains-mono)" }}>
                Duration
              </label>
              <div className="flex gap-2">
                {[30, 120, 300].map((d) => (
                  <button
                    key={d}
                    onClick={() => setDuration(d)}
                    className={`flex-1 rounded-[8px] border py-2 text-[12px] font-medium transition-all active:scale-95 ${
                      duration === d
                        ? "border-white bg-white text-[#0a0a0a]"
                        : "border-[#313131] bg-[#0a0a0a] text-[#a7a7a7] hover:border-[#454545] hover:text-white"
                    }`}
                    style={{ fontFamily: "var(--font-inter)" }}
                  >
                    {d < 60 ? `${d}s` : `${d / 60}m`}
                  </button>
                ))}
              </div>
            </div>

            {/* Trigger button */}
            <button
              onClick={handleToggle}
              disabled={loading || !targetId}
              className="mt-2 flex items-center justify-center gap-2 w-full rounded-[8px] bg-[#ff6b6b] text-black font-medium text-[14px] h-11 hover:opacity-90 disabled:opacity-30 disabled:pointer-events-none transition-all active:scale-[0.98]"
              id="activate-adversary-btn"
              style={{ fontFamily: "var(--font-inter)" }}
            >
              {loading ? <Spinner size={18} className="animate-spin" /> : null}
              {loading ? "ARMING..." : "ARM & INJECT"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
