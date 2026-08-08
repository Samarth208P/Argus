"use client";

import Link from "next/link";
import { motion } from "motion/react";
import { ArrowRight, TrendUp, Trophy } from "@phosphor-icons/react";
import type { RankedRPC } from "@/lib/rpc";
import { METRICS, providerLabel, initials, scoreColor } from "@/lib/rpc";
import { RPCStatus } from "./RPCStatus";

export function CurrentBestRPC({
  best,
  advantage,
  lastUpdated,
  refreshing,
}: {
  best: RankedRPC | null;
  advantage: number | null;
  lastUpdated: number;
  refreshing?: boolean;
}) {
  if (!best) {
    return (
      <div className="flex h-full min-h-[220px] items-center justify-center rounded-[16px] border border-white/8 bg-[#0f0f12] p-8">
        <p className="text-[14px] text-[#54545a]" style={{ fontFamily: "var(--font-inter)" }}>Collecting live data…</p>
      </div>
    );
  }

  const sc = scoreColor(best.score);
  const label = providerLabel(best);

  return (
    <div className="relative flex h-full flex-col justify-between overflow-hidden rounded-[16px] border border-white/10 bg-gradient-to-b from-[#121215] to-[#0e0e11] p-6">
      <div aria-hidden className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full" style={{ background: `radial-gradient(circle, ${sc}22, transparent 70%)` }} />

      <div className="relative">
        <div className="mb-5 flex items-center justify-between">
          <span className="inline-flex items-center gap-1.5 text-[11px] uppercase tracking-[1.4px] text-[#9db8ff]" style={{ fontFamily: "var(--font-jetbrains-mono)" }}>
            <Trophy size={13} weight="fill" color="#6798ff" /> Best performing
          </span>
          <RPCStatus lastUpdated={lastUpdated} refreshing={refreshing} />
        </div>

        <div className="flex items-center gap-3.5">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[12px] border border-white/10 bg-white/[0.03] text-[14px] font-semibold text-[#6798ff]" style={{ fontFamily: "var(--font-jetbrains-mono)" }}>
            {initials(best)}
          </div>
          <div className="min-w-0">
            <p className="truncate text-[22px] font-semibold text-white" style={{ fontFamily: "var(--font-inter)", letterSpacing: "-0.5px" }}>{label}</p>
            <p className="text-[12px] text-[#7c7c82]" style={{ fontFamily: "var(--font-jetbrains-mono)" }}>
              {best.provider?.type ?? "node"} · {best.provider?.network ?? "mainnet"}
            </p>
          </div>
          <div className="ml-auto text-right">
            <motion.p
              key={best.score}
              initial={{ opacity: 0.4, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
              className="text-[40px] font-semibold leading-none tnum"
              style={{ color: sc, fontFamily: "var(--font-inter)", letterSpacing: "-1.5px" }}
            >
              {best.score}
            </motion.p>
            <p className="mt-1 text-[11px] text-[#54545a]" style={{ fontFamily: "var(--font-jetbrains-mono)" }}>integrity /100</p>
          </div>
        </div>

        {/* Score bar */}
        <div className="mt-5 h-1.5 w-full overflow-hidden rounded-full bg-white/8">
          <motion.div
            className="h-full rounded-full"
            style={{ background: sc }}
            initial={{ width: 0 }}
            animate={{ width: `${best.score}%` }}
            transition={{ duration: 0.8, ease: [0.23, 1, 0.32, 1] }}
          />
        </div>

        {/* Metrics */}
        <div className="mt-6 grid grid-cols-3 gap-3">
          {(["latency_avg", "accuracy", "uptime"] as const).map((k) => (
            <div key={k}>
              <p className="mb-1 text-[10px] uppercase tracking-[0.8px] text-[#7c7c82]" style={{ fontFamily: "var(--font-jetbrains-mono)" }}>{METRICS[k].short}</p>
              <p className="text-[17px] font-semibold text-white tnum" style={{ fontFamily: "var(--font-inter)", letterSpacing: "-0.4px" }}>{METRICS[k].format(best)}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="relative mt-6 flex items-center justify-between border-t border-white/8 pt-4">
        {advantage != null && advantage > 0 ? (
          <span className="inline-flex items-center gap-1.5 text-[13px] font-medium text-[#57d9a3]" style={{ fontFamily: "var(--font-inter)" }}>
            <TrendUp size={14} weight="bold" /> +{advantage.toFixed(1)}% ahead of runner-up
          </span>
        ) : (
          <span className="text-[13px] text-[#7c7c82]" style={{ fontFamily: "var(--font-inter)" }}>Leading the field</span>
        )}
        <Link
          href={`/rpcs/${best.provider_id}`}
          className="group inline-flex items-center gap-1.5 text-[13px] font-medium text-white transition-colors hover:text-[#6798ff]"
        >
          View details
          <ArrowRight size={13} weight="bold" className="transition-transform group-hover:translate-x-1" />
        </Link>
      </div>
    </div>
  );
}
