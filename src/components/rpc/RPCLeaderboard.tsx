"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "motion/react";
import { MagnifyingGlass, ArrowUp, ArrowDown, ArrowRight } from "@phosphor-icons/react";
import type { DbScore, DbProvider } from "@/lib/db/types";
import {
  METRICS,
  METRIC_ORDER,
  sortByMetric,
  providerLabel,
  initials,
  scoreColor,
  type MetricKey,
  type RankedRPC,
} from "@/lib/rpc";
import { useLiveScores } from "./useLiveScores";
import { RankChange, type RankDelta } from "./RankChange";
import { RPCStatus } from "./RPCStatus";

type SortKey = "rank" | MetricKey;
const NETWORKS = ["all", "mainnet", "sepolia"] as const;
const TYPES = ["all", "node", "aggregator", "relay", "send"] as const;

const SPRING = { type: "spring" as const, stiffness: 420, damping: 34, mass: 0.9 };

export function RPCLeaderboard({
  initialScores,
  providers,
  initialRows,
}: {
  initialScores: DbScore[];
  providers: DbProvider[];
  initialRows?: DbScore[];
}) {
  const { ranked, lastUpdated, isRefreshing } = useLiveScores({ initialScores, providers, initialRows });

  const [sortKey, setSortKey] = useState<SortKey>("rank");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [network, setNetwork] = useState<(typeof NETWORKS)[number]>("all");
  const [type, setType] = useState<(typeof TYPES)[number]>("all");
  const [query, setQuery] = useState("");

  // ── Rank-delta tracking (only changes when ranking actually changes) ──
  const prevRanks = useRef<Map<string, number>>(new Map(ranked.map((r) => [r.provider_id, r.rank])));
  const [deltas, setDeltas] = useState<Map<string, RankDelta>>(new Map());
  const [highlightedIds, setHighlightedIds] = useState<Set<string>>(new Set());
  const [upIds, setUpIds] = useState<Set<string>>(new Set());
  const [downIds, setDownIds] = useState<Set<string>>(new Set());
  useEffect(() => {
    const next = new Map<string, RankDelta>();
    const nextRanks = new Map<string, number>();
    const changedIds = new Set<string>();
    const rising = new Set<string>();
    const falling = new Set<string>();

    for (const r of ranked) {
      const prev = prevRanks.current.get(r.provider_id);
      const delta = prev == null ? "new" : prev - r.rank;
      const numericDelta = typeof delta === "number" ? delta : 0;
      next.set(r.provider_id, delta);
      nextRanks.set(r.provider_id, r.rank);
      if (prev != null && prev !== r.rank) {
        changedIds.add(r.provider_id);
        if (numericDelta > 0) {
          rising.add(r.provider_id);
        } else if (numericDelta < 0) {
          falling.add(r.provider_id);
        }
      }
    }

    setDeltas(next);
    prevRanks.current = nextRanks;

    if (changedIds.size > 0) {
      setHighlightedIds(changedIds);
      setUpIds(rising);
      setDownIds(falling);
      const timer = window.setTimeout(() => {
        setHighlightedIds(new Set());
        setUpIds(new Set());
        setDownIds(new Set());
      }, 800);
      return () => window.clearTimeout(timer);
    }

    setHighlightedIds(new Set());
    setUpIds(new Set());
    setDownIds(new Set());
  }, [ranked]);

  // ── Filter + sort ──
  const rows = useMemo(() => {
    let list = ranked.filter((r) => {
      if (network !== "all" && (r.provider?.network ?? "mainnet") !== network) return false;
      if (type !== "all" && (r.provider?.type ?? "node") !== type) return false;
      if (query && !providerLabel(r).toLowerCase().includes(query.toLowerCase())) return false;
      return true;
    });
    if (sortKey === "rank") {
      list = [...list].sort((a, b) => a.rank - b.rank);
    } else {
      list = sortByMetric(list, sortKey, sortDir);
    }
    return list;
  }, [ranked, network, type, query, sortKey, sortDir]);

  const setSort = (key: SortKey) => {
    if (key === sortKey) {
      setSortDir((d) => (d === "desc" ? "asc" : "desc"));
    } else {
      setSortKey(key);
      setSortDir(key === "latency_avg" ? "asc" : "desc");
    }
  };

  return (
    <div className="flex flex-col gap-5">
      {/* Toolbar */}
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex h-9 items-center gap-2 rounded-[9px] border border-white/8 bg-white/[0.02] px-3">
            <MagnifyingGlass size={15} className="text-[#7c7c82]" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search providers"
              className="w-[150px] bg-transparent text-[13px] text-white placeholder-[#54545a] outline-none"
              style={{ fontFamily: "var(--font-inter)" }}
              aria-label="Search providers"
            />
          </div>
          <FilterSelect label="Network" value={network} onChange={(v) => setNetwork(v as never)} options={NETWORKS} />
          <FilterSelect label="Type" value={type} onChange={(v) => setType(v as never)} options={TYPES} />
        </div>
        <div className="flex items-center gap-3">
          <RPCStatus lastUpdated={lastUpdated} refreshing={isRefreshing} />
          <span className="text-[12px] text-[#54545a]" style={{ fontFamily: "var(--font-jetbrains-mono)" }}>{rows.length} shown</span>
        </div>
      </div>

      {/* Mobile sort */}
      <div className="flex items-center gap-2 md:hidden">
        <span className="text-[11px] uppercase tracking-[1px] text-[#7c7c82]" style={{ fontFamily: "var(--font-jetbrains-mono)" }}>Sort</span>
        <select
          value={sortKey}
          onChange={(e) => setSort(e.target.value as SortKey)}
          className="h-9 rounded-[9px] border border-white/8 bg-[#0f0f12] px-3 text-[13px] text-white"
          style={{ fontFamily: "var(--font-inter)" }}
        >
          <option value="rank">Rank</option>
          {METRIC_ORDER.map((m) => (
            <option key={m} value={m}>{METRICS[m].label}</option>
          ))}
        </select>
      </div>

      {/* Header (desktop) */}
      <div className="hidden grid-cols-[44px_minmax(0,1fr)_repeat(4,84px)_72px] items-center gap-3 border-b border-white/8 px-4 pb-2.5 md:grid">
        <HeaderCell label="#" active={sortKey === "rank"} dir={sortDir} onClick={() => setSort("rank")} />
        <span className="text-[11px] uppercase tracking-[1px] text-[#7c7c82]" style={{ fontFamily: "var(--font-jetbrains-mono)" }}>Provider</span>
        {METRIC_ORDER.map((m) => (
          <HeaderCell key={m} label={METRICS[m].short} active={sortKey === m} dir={sortDir} onClick={() => setSort(m)} align="right" />
        ))}
        <span className="text-right text-[11px] uppercase tracking-[1px] text-[#7c7c82]" style={{ fontFamily: "var(--font-jetbrains-mono)" }}>Δ Rank</span>
      </div>

      {/* Rows */}
      <div className="flex flex-col gap-2 md:gap-1">
        <AnimatePresence initial={false}>
          {rows.map((r) => (
            <motion.div
              key={r.provider_id}
              layout
              layoutId={r.provider_id}
              transition={SPRING}
              exit={{ opacity: 0, scale: 0.98 }}
              className="rounded-[12px]"
            >
              <RankingRow
                row={r}
                delta={deltas.get(r.provider_id) ?? 0}
                isHighlighted={highlightedIds.has(r.provider_id)}
                isMovingUp={upIds.has(r.provider_id)}
                isMovingDown={downIds.has(r.provider_id)}
              />
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {rows.length === 0 && (
        <div className="rounded-[12px] border border-white/8 bg-[#0f0f12] py-12 text-center text-[14px] text-[#54545a]" style={{ fontFamily: "var(--font-inter)" }}>
          No providers match these filters.
        </div>
      )}
    </div>
  );
}

/* ── Row (responsive: table on md+, card on mobile) ───────── */
function RankingRow({ row, delta, isHighlighted, isMovingUp, isMovingDown }: { row: RankedRPC; delta: RankDelta; isHighlighted: boolean; isMovingUp: boolean; isMovingDown: boolean }) {
  const sc = scoreColor(row.score);
  const label = providerLabel(row);

  return (
    <motion.div
      layout
      transition={{
        layout: { type: "spring", stiffness: 380, damping: 32, mass: 0.85 },
        duration: 0.6,
        ease: [0.22, 1, 0.36, 1],
        times: [0, 0.5, 1],
      }}
      animate={
        isHighlighted
          ? isMovingUp
            ? { scale: [1, 1.02, 1], y: [0, -5, 0], boxShadow: ["0 0 0 rgba(103,152,255,0)", "0 8px 24px rgba(103,152,255,0.18)", "0 0 0 rgba(103,152,255,0)"] }
            : isMovingDown
              ? { scale: [1, 1.02, 1], y: [0, 5, 0], boxShadow: ["0 0 0 rgba(255,107,107,0)", "0 8px 24px rgba(255,107,107,0.16)", "0 0 0 rgba(255,107,107,0)"] }
              : { scale: [1, 1.012, 1], y: [0, -2, 0] }
          : { scale: 1, y: 0, boxShadow: "0 0 0 rgba(0,0,0,0)" }
      }
      className="rounded-[12px]"
    >
      <Link
        href={`/rpcs/${row.provider_id}`}
        className={`group block rounded-[12px] border transition-all duration-300 hover:border-white/16 hover:bg-[#131316] ${
          isHighlighted
            ? isMovingUp
              ? "border-[#6798ff]/45 bg-[#14161d] shadow-[0_0_0_1px_rgba(103,152,255,0.2)]"
              : isMovingDown
                ? "border-[#ff6b6b]/40 bg-[#181214] shadow-[0_0_0_1px_rgba(255,107,107,0.18)]"
                : "border-[#6798ff]/45 bg-[#14161d] shadow-[0_0_0_1px_rgba(103,152,255,0.2)]"
            : "border-white/8 bg-[#0f0f12]"
        }`}
      >
      {/* Desktop */}
      <div className="hidden grid-cols-[44px_minmax(0,1fr)_repeat(4,84px)_72px] items-center gap-3 px-4 py-3.5 md:grid">
        <span className="text-[15px] font-semibold text-[#7c7c82] tnum" style={{ fontFamily: "var(--font-jetbrains-mono)" }}>{row.rank}</span>
        <div className="flex min-w-0 items-center gap-3">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[7px] border border-white/8 bg-white/[0.03] text-[10px] font-medium text-[#6798ff]" style={{ fontFamily: "var(--font-jetbrains-mono)" }}>{initials(row)}</span>
          <span className="min-w-0">
            <span className="block truncate text-[14px] font-medium text-white" style={{ fontFamily: "var(--font-inter)" }}>{label}</span>
            <span className="block text-[11px] text-[#54545a]" style={{ fontFamily: "var(--font-jetbrains-mono)" }}>{row.provider?.type ?? "node"} · {row.provider?.network ?? "mainnet"}</span>
          </span>
        </div>
        <MetricCell k="score" row={row} color={sc} />
        <MetricCell k="latency_avg" row={row} />
        <MetricCell k="accuracy" row={row} />
        <MetricCell k="uptime" row={row} />
        <div className="flex items-center justify-end"><RankChange delta={delta} /></div>
      </div>

      {/* Mobile card */}
      <div className="flex flex-col gap-3 p-4 md:hidden">
        <div className="flex items-center gap-3">
          <span className="text-[14px] font-semibold text-[#7c7c82] tnum" style={{ fontFamily: "var(--font-jetbrains-mono)" }}>#{row.rank}</span>
          <span className="flex h-8 w-8 items-center justify-center rounded-[7px] border border-white/8 bg-white/[0.03] text-[10px] font-medium text-[#6798ff]" style={{ fontFamily: "var(--font-jetbrains-mono)" }}>{initials(row)}</span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-[14px] font-medium text-white" style={{ fontFamily: "var(--font-inter)" }}>{label}</span>
            <span className="block text-[11px] text-[#54545a]" style={{ fontFamily: "var(--font-jetbrains-mono)" }}>{row.provider?.type ?? "node"} · {row.provider?.network ?? "mainnet"}</span>
          </span>
          <span className="text-[20px] font-semibold tnum" style={{ color: sc, fontFamily: "var(--font-inter)", letterSpacing: "-0.5px" }}>{row.score}</span>
          <RankChange delta={delta} />
        </div>
        <div className="grid grid-cols-3 gap-2 border-t border-white/6 pt-3">
          {(["latency_avg", "accuracy", "uptime"] as const).map((k) => (
            <div key={k}>
              <p className="text-[10px] uppercase tracking-[0.6px] text-[#54545a]" style={{ fontFamily: "var(--font-jetbrains-mono)" }}>{METRICS[k].short}</p>
              <p className="text-[14px] font-medium text-white tnum" style={{ fontFamily: "var(--font-inter)" }}>{METRICS[k].format(row)}</p>
            </div>
          ))}
        </div>
      </div>
    </Link>
    </motion.div>
  );
}

function MetricCell({ k, row, color }: { k: MetricKey; row: RankedRPC; color?: string }) {
  return (
    <span className="text-right text-[14px] font-medium tnum" style={{ color: color ?? "#a5a5ac", fontFamily: k === "latency_avg" ? "var(--font-jetbrains-mono)" : "var(--font-inter)" }}>
      {METRICS[k].format(row)}
    </span>
  );
}

function HeaderCell({ label, active, dir, onClick, align = "left" }: { label: string; active: boolean; dir: "asc" | "desc"; onClick: () => void; align?: "left" | "right" }) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-1 text-[11px] uppercase tracking-[1px] transition-colors ${align === "right" ? "justify-end" : ""} ${active ? "text-white" : "text-[#7c7c82] hover:text-[#a5a5ac]"}`}
      style={{ fontFamily: "var(--font-jetbrains-mono)" }}
    >
      {label}
      {active && (dir === "desc" ? <ArrowDown size={10} /> : <ArrowUp size={10} />)}
    </button>
  );
}

function FilterSelect({ label, value, onChange, options }: { label: string; value: string; onChange: (v: string) => void; options: readonly string[] }) {
  return (
    <label className="flex h-9 items-center gap-2 rounded-[9px] border border-white/8 bg-white/[0.02] pl-3 pr-1">
      <span className="text-[11px] uppercase tracking-[0.8px] text-[#7c7c82]" style={{ fontFamily: "var(--font-jetbrains-mono)" }}>{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-full bg-transparent pr-6 text-[13px] font-medium capitalize text-white outline-none"
        style={{ fontFamily: "var(--font-inter)" }}
      >
        {options.map((o) => (
          <option key={o} value={o} className="bg-[#111114] capitalize">{o}</option>
        ))}
      </select>
    </label>
  );
}
