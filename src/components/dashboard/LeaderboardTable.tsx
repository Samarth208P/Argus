"use client";

import { useState, useEffect, useCallback } from "react";
import { motion } from "motion/react";
import {
  ArrowUp,
  ArrowDown,
  Minus,
  ArrowRight,
  Plus,
} from "@phosphor-icons/react";
import type { DbScore, DbProvider } from "@/lib/db/types";
import { scoreColor } from "@/lib/design-tokens";
import { ProviderDrawer } from "./ProviderDrawer";

interface LeaderboardRow extends DbScore {
  provider?: DbProvider;
}

interface LeaderboardTableProps {
  initialScores: LeaderboardRow[];
  providers: DbProvider[];
}

type SortKey = "score" | "accuracy" | "latency_avg" | "uptime";
type SortDir = "asc" | "desc";

const TREND_ICON = {
  IMPROVING: ArrowUp,
  DEGRADING: ArrowDown,
  STABLE: Minus,
};

const TREND_CLASS = {
  IMPROVING: "trend-improving",
  DEGRADING: "trend-degrading",
  STABLE: "trend-stable",
};

export function LeaderboardTable({ initialScores, providers }: LeaderboardTableProps) {
  const [scores, setScores] = useState<LeaderboardRow[]>(
    initialScores.map((s) => ({
      ...s,
      provider: providers.find((p) => p.id === s.provider_id),
    }))
  );
  const [sortKey, setSortKey] = useState<SortKey>("score");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [selectedProvider, setSelectedProvider] = useState<LeaderboardRow | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Re-fetch scores every 30s
  useEffect(() => {
    const interval = setInterval(async () => {
      setIsRefreshing(true);
      try {
        const res = await fetch("/api/scores");
        if (res.ok) {
          const data = await res.json() as LeaderboardRow[];
          setScores(
            data.map((s) => ({
              ...s,
              provider: providers.find((p) => p.id === s.provider_id),
            }))
          );
        }
      } catch {
        // Silent failure, data stays stale
      } finally {
        setIsRefreshing(false);
      }
    }, 30_000);
    return () => clearInterval(interval);
  }, [providers]);

  const handleSort = useCallback((key: SortKey) => {
    setSortDir((prev) => (sortKey === key ? (prev === "desc" ? "asc" : "desc") : "desc"));
    setSortKey(key);
  }, [sortKey]);

  const sorted = [...scores].sort((a, b) => {
    const mult = sortDir === "desc" ? -1 : 1;
    return mult * (Number(a[sortKey]) - Number(b[sortKey]));
  });

  const SortButton = ({ k, children }: { k: SortKey; children: React.ReactNode }) => (
    <button
      onClick={() => handleSort(k)}
      className={`flex items-center gap-1 text-[12px] uppercase tracking-[0.5px] transition-colors ${
        sortKey === k ? "text-white" : "text-[#454545] hover:text-[#7c7c7c]"
      }`}
      style={{ fontFamily: "var(--font-jetbrains-mono)" }}
      aria-sort={sortKey === k ? (sortDir === "desc" ? "descending" : "ascending") : "none"}
    >
      {children}
      {sortKey === k && (sortDir === "desc" ? <ArrowDown size={10} /> : <ArrowUp size={10} />)}
    </button>
  );

  return (
    <>
      {/* Table container */}
      <div className="flex flex-col gap-2">
        {/* Header */}
        <div className="grid grid-cols-[1fr_80px_80px_100px_60px_90px_80px] gap-4 border-b border-[#1e1e1e] px-5 py-3 items-center">
          <span className="eyebrow text-[#a7a7a7]">Provider</span>
          <SortButton k="score">Score</SortButton>
          <SortButton k="accuracy">Acc %</SortButton>
          <SortButton k="latency_avg">Latency</SortButton>
          <SortButton k="uptime">Up %</SortButton>
          <span className="eyebrow text-[#a7a7a7]">Trend</span>
          <div className="flex items-center justify-between">
            <span className="eyebrow text-[#a7a7a7]">Evidence</span>
            {isRefreshing && (
              <span className="h-1.5 w-1.5 rounded-full bg-[#6798ff] animate-pulse" aria-label="Refreshing" />
            )}
          </div>
        </div>

        {/* Rows — loading skeleton */}
        {sorted.length === 0 && (
          <div className="flex flex-col gap-0 bg-[#141414] border border-[#1e1e1e] rounded-[8px]">
            {Array.from({ length: 5 }).map((_, i) => (
              <div
                key={i}
                className="grid grid-cols-[1fr_80px_80px_100px_60px_90px_80px] gap-4 border-b border-[#1e1e1e] last:border-b-0 px-5 py-4 items-center"
              >
                <div className="flex items-center gap-3">
                  <div className="h-7 w-7 rounded-[4px] bg-[#1e1e1e] animate-pulse" />
                  <div className="h-3 w-24 rounded bg-[#1e1e1e] animate-pulse" />
                </div>
                {[1,2,3,4,5,6].map((j) => (
                  <div key={j} className="h-3 w-12 rounded bg-[#1e1e1e] animate-pulse" />
                ))}
              </div>
            ))}
          </div>
        )}

        {/* Data rows */}
        <div className="flex flex-col gap-1">
          {sorted.map((row, i) => {
            const TrendIcon = TREND_ICON[row.trend] ?? Minus;
            const trendClass = TREND_CLASS[row.trend] ?? "trend-stable";
            const sc = scoreColor(row.score);

            return (
              <motion.div
                key={row.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04, duration: 0.4, ease: "easeOut" }}
                className="grid grid-cols-[1fr_80px_80px_100px_60px_90px_80px] gap-4 rounded-[8px] bg-[#141414] border border-[#1e1e1e] px-5 py-4 items-center transition-all duration-200 ease-out cursor-pointer hover:border-[#313131] hover:bg-[#1e1e1e]/50"
                onClick={() => setSelectedProvider(row)}
                role="row"
                aria-label={`${row.provider_id} score ${row.score}`}
              >
                {/* Provider name */}
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className="h-7 w-7 shrink-0 rounded-[4px] border border-[#313131] bg-[#1e1e1e] flex items-center justify-center"
                    aria-hidden="true"
                  >
                    <span
                      className="text-[10px] font-medium text-[#6798ff]"
                      style={{ fontFamily: "var(--font-jetbrains-mono)" }}
                    >
                      {(row.provider?.label ?? row.provider_id).slice(0, 2).toUpperCase()}
                    </span>
                  </div>
                  <div className="min-w-0">
                    <p
                      className="text-[14px] font-medium text-white truncate"
                      style={{ fontFamily: "var(--font-inter)", letterSpacing: "-0.25px" }}
                    >
                      {row.provider?.label ?? row.provider_id}
                    </p>
                    <p
                      className="text-[11px] text-[#454545] truncate"
                      style={{ fontFamily: "var(--font-jetbrains-mono)" }}
                    >
                      {row.provider?.type ?? "node"}
                    </p>
                  </div>
                </div>

                {/* Score */}
                <span
                  className="text-[15px] font-medium tabular-nums"
                  style={{ color: sc, fontFamily: "var(--font-inter)", letterSpacing: "-0.25px" }}
                >
                  {row.score}
                </span>

                {/* Accuracy */}
                <span
                  className="text-[14px] text-[#a7a7a7] tabular-nums"
                  style={{ fontFamily: "var(--font-inter)" }}
                >
                  {Math.round(row.accuracy * 100)}%
                </span>

                {/* Latency */}
                <span
                  className="text-[14px] text-[#a7a7a7] tabular-nums"
                  style={{ fontFamily: "var(--font-jetbrains-mono)", fontSize: "13px" }}
                >
                  {Math.round(row.latency_avg)}ms
                </span>

                {/* Uptime */}
                <span
                  className="text-[14px] text-[#a7a7a7] tabular-nums"
                  style={{ fontFamily: "var(--font-inter)" }}
                >
                  {Math.round(row.uptime * 100)}%
                </span>

                {/* Trend */}
                <div className={`flex items-center gap-1 ${trendClass}`}>
                  <TrendIcon size={13} aria-hidden="true" />
                  <span style={{ fontFamily: "var(--font-jetbrains-mono)", fontSize: "11px" }}>
                    {row.trend}
                  </span>
                </div>

                {/* Evidence */}
                <a
                  href={`/verify?provider=${row.provider_id}`}
                  onClick={(e) => e.stopPropagation()}
                  className="flex items-center gap-1 text-[12px] text-[#6798ff] hover:text-white transition-colors"
                  style={{ fontFamily: "var(--font-jetbrains-mono)" }}
                  title="View evidence for this provider"
                  id={`evidence-link-${row.provider_id}`}
                >
                  VIEW
                  <ArrowRight size={11} weight="bold" />
                </a>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* Provider detail drawer */}
      {selectedProvider && (
        <ProviderDrawer
          row={selectedProvider}
          open={!!selectedProvider}
          onClose={() => setSelectedProvider(null)}
        />
      )}
    </>
  );
}
