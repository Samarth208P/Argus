"use client";

import { useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { X, ArrowUpRight } from "@phosphor-icons/react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { COLORS, CHART_COLORS, scoreColor } from "@/lib/design-tokens";

interface ProviderDrawerProps {
  row: {
    provider_id: string;
    score: number;
    accuracy: number;
    uptime: number;
    latency_avg: number;
    freshness_score: number;
    trend: string;
    provider?: {
      label: string;
      url: string;
      operator: string;
      type: string;
    };
  };
  open: boolean;
  onClose: () => void;
}

// Placeholder history data — replaced by real data once DB is connected
function generatePlaceholderHistory(score: number) {
  return Array.from({ length: 20 }, (_, i) => ({
    i,
    score: Math.max(0, Math.min(100, score + (Math.random() - 0.5) * 12)),
    latency: Math.round(200 + Math.random() * 400),
  }));
}

export function ProviderDrawer({ row, open, onClose }: ProviderDrawerProps) {
  const overlayRef = useRef<HTMLDivElement>(null);
  const history = generatePlaceholderHistory(row.score);
  const sc = scoreColor(row.score);

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            ref={overlayRef}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ ease: "easeOut", duration: 0.2 }}
            className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
            onClick={onClose}
            aria-hidden="true"
          />

          {/* Drawer panel */}
          <motion.aside
            role="dialog"
            aria-modal="true"
            aria-label={`${row.provider?.label ?? row.provider_id} details`}
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ ease: [0.32, 0.72, 0, 1] as any, duration: 0.38 }}
            className="fixed right-0 top-0 bottom-0 z-50 w-full max-w-[420px] border-l border-[#1e1e1e] bg-[#141414] flex flex-col overflow-y-auto"
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-[#1e1e1e] px-6 py-5 shrink-0">
              <div className="flex items-center gap-3">
                <div className="h-8 w-8 rounded-[4px] border border-[#313131] bg-[#1e1e1e] flex items-center justify-center">
                  <span
                    className="text-[11px] font-medium text-[#6798ff]"
                    style={{ fontFamily: "var(--font-jetbrains-mono)" }}
                  >
                    {(row.provider?.label ?? row.provider_id).slice(0, 2).toUpperCase()}
                  </span>
                </div>
                <div>
                  <p
                    className="text-[15px] font-medium text-white"
                    style={{ fontFamily: "var(--font-inter)", letterSpacing: "-0.25px" }}
                  >
                    {row.provider?.label ?? row.provider_id}
                  </p>
                  <p
                    className="text-[12px] text-[#454545]"
                    style={{ fontFamily: "var(--font-jetbrains-mono)" }}
                  >
                    {row.provider?.operator ?? "unknown"} · {row.provider?.type ?? "node"}
                  </p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="text-[#454545] hover:text-white transition-colors p-1"
                aria-label="Close provider details"
                id="provider-drawer-close"
              >
                <X size={18} />
              </button>
            </div>

            {/* Content */}
            <div className="flex flex-col gap-6 p-6">
              {/* Score headline */}
              <div className="flex items-baseline gap-3">
                <span
                  className="text-[48px] font-medium leading-none tabular-nums"
                  style={{ color: sc, fontFamily: "var(--font-inter)", letterSpacing: "-2px" }}
                >
                  {row.score}
                </span>
                <div>
                  <p
                    className="text-[14px] text-[#a7a7a7]"
                    style={{ fontFamily: "var(--font-inter)" }}
                  >
                    Integrity score
                  </p>
                  <p
                    className={`text-[12px] ${
                      row.trend === "IMPROVING"
                        ? "trend-improving"
                        : row.trend === "DEGRADING"
                        ? "trend-degrading"
                        : "trend-stable"
                    }`}
                    style={{ fontFamily: "var(--font-jetbrains-mono)" }}
                  >
                    {row.trend}
                  </p>
                </div>
              </div>

              {/* Score sparkline */}
              <div>
                <p className="eyebrow mb-3">SCORE HISTORY (W=50)</p>
                <div className="h-[100px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={history} margin={{ top: 4, right: 4, bottom: 4, left: 0 }}>
                      <XAxis dataKey="i" hide />
                      <YAxis domain={[0, 100]} hide />
                      <Tooltip
                        contentStyle={{
                          background: COLORS.iron,
                          border: `1px solid ${COLORS.slateEdge}`,
                          borderRadius: 8,
                          fontSize: 12,
                          fontFamily: "var(--font-jetbrains-mono)",
                          color: COLORS.bone,
                        }}
                        formatter={(v: unknown) => [`${Math.round(Number(v ?? 0))}`, "score"]}
                        labelFormatter={() => ""}
                      />
                      <Line
                        type="monotone"
                        dataKey="score"
                        stroke={CHART_COLORS.series1}
                        strokeWidth={1.5}
                        dot={false}
                        activeDot={{ r: 3, fill: CHART_COLORS.series1 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Metrics grid */}
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: "Accuracy", value: `${Math.round(row.accuracy * 100)}%` },
                  { label: "Uptime", value: `${Math.round(row.uptime * 100)}%` },
                  { label: "Avg Latency", value: `${Math.round(row.latency_avg)}ms` },
                  { label: "Freshness", value: `${Math.round(row.freshness_score * 100)}%` },
                ].map((m) => (
                  <div key={m.label} className="rounded-[8px] border border-[#1e1e1e] bg-[#0a0a0a] p-4">
                    <p className="eyebrow text-[10px] mb-2">{m.label}</p>
                    <p
                      className="text-[22px] font-medium text-white tabular-nums"
                      style={{ fontFamily: "var(--font-inter)", letterSpacing: "-0.6px" }}
                    >
                      {m.value}
                    </p>
                  </div>
                ))}
              </div>

              {/* Endpoint URL */}
              {row.provider?.url && (
                <div className="rounded-[8px] border border-[#1e1e1e] bg-[#0a0a0a] p-4">
                  <p className="eyebrow text-[10px] mb-2">ENDPOINT</p>
                  <a
                    href={row.provider.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 text-[13px] text-[#6798ff] hover:text-white transition-colors break-all"
                    style={{ fontFamily: "var(--font-jetbrains-mono)" }}
                  >
                    {row.provider.url}
                    <ArrowUpRight size={13} className="shrink-0" />
                  </a>
                </div>
              )}

              {/* Verify link */}
              <a
                href={`/verify?provider=${row.provider_id}`}
                className="btn-ghost w-full justify-center text-[13px]"
                id={`drawer-verify-${row.provider_id}`}
              >
                View Cryptographic Evidence
              </a>
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}
