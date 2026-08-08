"use client";

import { useState, useEffect } from "react";
import { Warning, Clock, ShieldSlash, XCircle, Spinner } from "@phosphor-icons/react";
import type { DbProvider } from "@/lib/db/types";

interface AdversaryPanelProps {
  providers: DbProvider[];
}

type Mode = "stale" | "mutate" | "censor";

export function AdversaryPanel({ providers }: AdversaryPanelProps) {
  const [targetId, setTargetId] = useState("");
  const [mode, setMode] = useState<Mode>("mutate");
  const [duration, setDuration] = useState(120); // seconds
  const [loading, setLoading] = useState(false);
  const [activeAdversary, setActiveAdversary] = useState<{
    targetId: string | null;
    mode: Mode | null;
    expiresAt: number | null;
  }>({ targetId: null, mode: null, expiresAt: null });

  // ── Fetch active state on load ──────────────────────────
  useEffect(() => {
    async function checkState() {
      try {
        const res = await fetch("/api/adversary");
        if (res.ok) {
          const data = await res.json();
          setActiveAdversary(data);
          if (data.targetId) setTargetId(data.targetId);
          if (data.mode) setMode(data.mode);
        }
      } catch (err) {
        console.warn("Failed to fetch adversary state:", err);
      }
    }
    checkState();
    const interval = setInterval(checkState, 15_000);
    return () => clearInterval(interval);
  }, []);

  const handleToggle = async () => {
    setLoading(true);
    try {
      const isDeactivating = activeAdversary.targetId !== null;
      const res = await fetch("/api/adversary", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          isDeactivating
            ? { targetId: null, mode: null }
            : { targetId, mode, durationSeconds: duration }
        ),
      });

      if (res.ok) {
        const data = await res.json();
        setActiveAdversary(data);
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
    <div className="flex flex-col gap-5 rounded-[16px] border border-white/10 bg-black/40 backdrop-blur-xl p-6 shadow-2xl relative overflow-hidden">
      {/* Synth-board scanline effect */}
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:100%_4px] opacity-20" />

      <div className="relative z-10 flex items-center justify-between">
        <div>
          <p className="eyebrow mb-1 text-[#ff003c]">THREAT INJECTOR</p>
          <h3
            className="text-[18px] font-bold text-white tracking-tight"
            style={{ fontFamily: "var(--font-cinzel)" }}
          >
            Adversary Console
          </h3>
        </div>
        <div className={`h-3 w-3 rounded-full ${isSimulatorActive ? "bg-[#ff003c] animate-pulse shadow-[0_0_10px_#ff003c]" : "bg-[#222222]"}`} />
      </div>

      <div className="relative z-10 border-t border-white/10 pt-5">
        {isSimulatorActive ? (
          // Active simulator mode display (Tactile alert state)
          <div className="rounded-[12px] border border-[#ff003c]/30 bg-[#ff003c]/5 backdrop-blur-md p-5 flex flex-col gap-4 shadow-[0_0_30px_rgba(255,0,60,0.1)]">
            <div className="flex items-center gap-3 border-b border-[#ff003c]/20 pb-3">
              <Warning size={20} color="#ff003c" weight="bold" className="animate-pulse" />
              <p
                className="text-[15px] font-bold text-white flex-1 tracking-tight"
                style={{ fontFamily: "var(--font-outfit)" }}
              >
                ATTACK ACTIVE
              </p>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-[10px] text-[#ff003c] font-bold tracking-widest uppercase mb-1" style={{ fontFamily: "var(--font-jetbrains-mono)" }}>Target</p>
                <p className="text-[13px] font-medium text-white">{activeAdversary.targetId}</p>
              </div>
              <div>
                <p className="text-[10px] text-[#ff003c] font-bold tracking-widest uppercase mb-1" style={{ fontFamily: "var(--font-jetbrains-mono)" }}>Vector</p>
                <p className="text-[13px] font-medium text-white uppercase">{activeAdversary.mode}</p>
              </div>
            </div>

            <div className="flex items-center justify-between mt-2 bg-black/40 p-3 rounded-[6px] border border-[#ff003c]/20">
              <span className="text-[11px] text-[#888888] font-bold tracking-widest" style={{ fontFamily: "var(--font-jetbrains-mono)" }}>T-MINUS</span>
              <span
                className="font-bold text-[#ff003c] tabular-nums text-[16px]"
                style={{ fontFamily: "var(--font-jetbrains-mono)" }}
              >
                {timeRemaining > 0 ? `${Math.floor(timeRemaining / 60)}:${(timeRemaining % 60).toString().padStart(2, '0')}` : "0:00"}
              </span>
            </div>

            <button
              onClick={handleToggle}
              disabled={loading}
              className="mt-2 flex items-center justify-center gap-2 w-full rounded-[6px] bg-[#ff003c] text-black font-bold text-[14px] h-11 hover:bg-white transition-all active:scale-[0.98]"
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
              <label className="text-[10px] font-bold text-[#888888] uppercase tracking-[1px]" style={{ fontFamily: "var(--font-jetbrains-mono)" }}>
                Target Node
              </label>
              <div className="relative">
                <select
                  value={targetId}
                  onChange={(e) => setTargetId(e.target.value)}
                  className="w-full appearance-none rounded-[8px] border border-white/20 bg-black/60 backdrop-blur-md px-4 py-3 text-[14px] font-bold text-white outline-none focus:border-[#00f0ff] transition-all cursor-pointer"
                  style={{ fontFamily: "var(--font-outfit)" }}
                >
                  <option value="" disabled>Select target...</option>
                  {providers.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.label} ({p.id})
                    </option>
                  ))}
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-4 flex items-center">
                  <div className="h-2 w-2 rounded-full bg-[#00f0ff] shadow-[0_0_5px_#00f0ff]" />
                </div>
              </div>
            </div>

            {/* Mode Select Buttons (Radio-like) */}
            <div className="flex flex-col gap-2">
              <span className="text-[10px] font-bold text-[#888888] uppercase tracking-[1px]" style={{ fontFamily: "var(--font-jetbrains-mono)" }}>
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
                          ? "border-[#00f0ff]/50 bg-[#00f0ff]/10 text-[#00f0ff] shadow-[0_0_20px_rgba(0,240,255,0.1)]"
                          : "border-white/10 bg-black/40 text-[#888888] hover:border-white/30 hover:text-white"
                      }`}
                    >
                      <Icon size={20} weight={active ? "bold" : "regular"} />
                      <span className="text-[11px] font-bold uppercase tracking-widest">{opt.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Duration Select */}
            <div className="flex flex-col gap-2">
              <label className="text-[10px] font-bold text-[#888888] uppercase tracking-[1px]" style={{ fontFamily: "var(--font-jetbrains-mono)" }}>
                Duration
              </label>
              <div className="flex gap-2">
                {[30, 120, 300].map((d) => (
                  <button
                    key={d}
                    onClick={() => setDuration(d)}
                    className={`flex-1 rounded-[8px] border py-2 text-[12px] font-bold transition-all active:scale-95 ${
                      duration === d
                        ? "border-white bg-white text-black shadow-[0_0_15px_rgba(255,255,255,0.2)]"
                        : "border-white/10 bg-black/40 text-[#888888] hover:border-white/30 hover:text-white"
                    }`}
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
              className="mt-4 flex items-center justify-center gap-2 w-full rounded-[8px] bg-gradient-to-r from-[#ff003c] to-[#ff3366] text-white font-bold text-[14px] h-12 hover:shadow-[0_0_25px_rgba(255,0,60,0.5)] disabled:opacity-30 disabled:pointer-events-none transition-all active:scale-[0.98]"
              id="activate-adversary-btn"
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
