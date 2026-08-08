"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "motion/react";
import type { SeriesPoint } from "./useLiveScores";
import { METRICS, seriesColor, type MetricKey } from "@/lib/rpc";

interface SeriesInput {
  providerId: string;
  rank: number;
  points: SeriesPoint[];
}

const CHART_METRICS: MetricKey[] = ["score", "latency_avg", "accuracy"];
const RANGES: { key: string; label: string; ms: number }[] = [
  { key: "live", label: "Live", ms: Infinity },
  { key: "1h", label: "1h", ms: 3_600_000 },
  { key: "24h", label: "24h", ms: 86_400_000 },
  { key: "7d", label: "7d", ms: 604_800_000 },
];
const POINT_FIELD: Record<MetricKey, keyof SeriesPoint> = {
  score: "score",
  latency_avg: "latency",
  accuracy: "accuracy",
  uptime: "uptime",
  freshness_score: "score",
};

const MAX_SAMPLES = 60; // last N aligned poll samples, spaced evenly by index

export function RPCComparisonChart({
  series,
  labelFor,
}: {
  series: SeriesInput[];
  labelFor: (id: string) => string;
}) {
  const [metric, setMetric] = useState<MetricKey>("score");
  const [range, setRange] = useState("live");
  const [hidden, setHidden] = useState<Set<string>>(new Set());
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);
  const [width, setWidth] = useState(760);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setWidth(e.contentRect.width));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const field = POINT_FIELD[metric];
  const rangeMs = RANGES.find((r) => r.key === range)?.ms ?? Infinity;

  // Layout
  const height = 300;
  const padL = 44, padR = 16, padT = 16, padB = 26;
  const plotW = Math.max(80, width - padL - padR);
  const plotH = height - padT - padB;

  // ── Align every series onto a shared grid of the last N sample times ──
  // Index-based x (not absolute time) so bursty/gappy polling data still
  // fills the width cleanly. Values carry forward to the shared timestamps.
  const model = useMemo(() => {
    const now = Date.now();
    const vis = series
      .filter((s) => !hidden.has(s.providerId))
      .map((s) => ({
        id: s.providerId,
        rank: s.rank,
        color: seriesColor(s.providerId, series.indexOf(s)),
        pts: s.points
          .filter((p) => now - p.t <= rangeMs)
          .map((p) => ({ t: p.t, v: p[field] as number }))
          .sort((a, b) => a.t - b.t),
      }));

    // Shared, evenly-spaced timeline = last N distinct sample timestamps.
    let times = Array.from(new Set(vis.flatMap((s) => s.pts.map((p) => p.t)))).sort((a, b) => a - b);
    if (times.length > MAX_SAMPLES) times = times.slice(-MAX_SAMPLES);
    const N = times.length;

    const withSamples = vis.map((s) => {
      let ptr = 0;
      let last: number | null = null;
      const samples = times.map((t) => {
        while (ptr < s.pts.length && s.pts[ptr].t <= t) { last = s.pts[ptr].v; ptr++; }
        return last;
      });
      let lastVal: number | null = null;
      for (let i = N - 1; i >= 0; i--) if (samples[i] != null) { lastVal = samples[i]; break; }
      return { ...s, samples, lastVal };
    });

    const vals = withSamples.flatMap((s) => s.samples.filter((b): b is number => b != null));
    let yMin: number, yMax: number;
    if (metric === "score") { yMin = 0; yMax = 100; }
    else if (metric === "latency_avg") { yMin = 0; yMax = vals.length ? Math.max(...vals) * 1.15 : 500; }
    else { const lo = vals.length ? Math.min(...vals) : 90; yMin = Math.max(0, Math.floor(lo) - 2); yMax = 100; }

    return { withSamples, times, N, yMin, yMax, hasSeries: N >= 4 };
  }, [series, hidden, rangeMs, field, metric]);

  const { withSamples, times, N, yMin, yMax, hasSeries } = model;
  const ySpan = yMax - yMin || 1;
  const xForIndex = (i: number) => (N <= 1 ? padL + plotW / 2 : padL + (i / (N - 1)) * plotW);
  const yOf = (v: number) => padT + (1 - (v - yMin) / ySpan) * plotH;
  const tickVals = Array.from({ length: 5 }, (_, i) => yMin + (ySpan * i) / 4);

  const snappedIdx = hoverIdx != null && N > 0 ? Math.min(N - 1, Math.max(0, hoverIdx)) : null;

  const toggle = (id: string) =>
    setHidden((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  const fmt = (v: number) =>
    metric === "latency_avg" ? `${Math.round(v)}ms` : metric === "score" ? `${Math.round(v)}` : `${v.toFixed(2)}%`;

  return (
    <div className="flex flex-col gap-4">
      {/* Controls */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="inline-flex rounded-[9px] border border-white/8 bg-white/[0.02] p-0.5">
          {CHART_METRICS.map((m) => (
            <button
              key={m}
              onClick={() => setMetric(m)}
              className={`rounded-[7px] px-3 py-1.5 text-[12.5px] font-medium transition-colors ${metric === m ? "bg-white/[0.07] text-white" : "text-[#7c7c82] hover:text-white"}`}
              style={{ fontFamily: "var(--font-inter)" }}
            >
              {METRICS[m].short}
            </button>
          ))}
        </div>
        <div className="inline-flex rounded-[9px] border border-white/8 bg-white/[0.02] p-0.5">
          {RANGES.map((r) => (
            <button
              key={r.key}
              onClick={() => setRange(r.key)}
              className={`rounded-[7px] px-2.5 py-1.5 text-[12px] font-medium transition-colors tnum ${range === r.key ? "bg-white/[0.07] text-white" : "text-[#7c7c82] hover:text-white"}`}
              style={{ fontFamily: "var(--font-jetbrains-mono)" }}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>

      {/* Chart */}
      <div ref={wrapRef} className="relative w-full">
        {hasSeries ? (
          <svg
            width={width}
            height={height}
            className="block w-full select-none"
            onMouseMove={(e) => {
              const rect = e.currentTarget.getBoundingClientRect();
              const x = ((e.clientX - rect.left) / rect.width) * width;
              setHoverIdx(Math.round(((x - padL) / plotW) * (N - 1)));
            }}
            onMouseLeave={() => setHoverIdx(null)}
          >
            {/* Grid + y labels */}
            {tickVals.map((v, i) => (
              <g key={i}>
                <line x1={padL} y1={yOf(v)} x2={width - padR} y2={yOf(v)} stroke="rgba(255,255,255,0.05)" strokeWidth={1} />
                <text x={padL - 8} y={yOf(v) + 3} textAnchor="end" fontSize={10} fill="#54545a" fontFamily="var(--font-jetbrains-mono)">
                  {Math.round(v)}
                </text>
              </g>
            ))}

            {/* Series — segmented so leading gaps break the line */}
            {withSamples.map((s) => {
              const isLeader = s.rank === 1;
              const segments: [number, number][][] = [];
              let cur: [number, number][] = [];
              for (let i = 0; i < N; i++) {
                const v = s.samples[i];
                if (v == null) { if (cur.length) { segments.push(cur); cur = []; } }
                else cur.push([xForIndex(i), yOf(v)]);
              }
              if (cur.length) segments.push(cur);

              return (
                <g key={s.id} opacity={snappedIdx != null && !isLeader ? 0.85 : 1}>
                  {segments.map((seg, si) =>
                    seg.length === 1 ? (
                      <circle key={si} cx={seg[0][0]} cy={seg[0][1]} r={isLeader ? 2.6 : 2} fill={s.color} />
                    ) : (
                      <motion.path
                        key={si}
                        d={seg.map(([x, y], k) => `${k === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`).join(" ")}
                        fill="none"
                        stroke={s.color}
                        strokeWidth={isLeader ? 2.2 : 1.4}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        opacity={isLeader ? 1 : 0.72}
                        initial={{ pathLength: 0, opacity: 0 }}
                        animate={{ pathLength: 1, opacity: isLeader ? 1 : 0.72 }}
                        transition={{ duration: 0.8, ease: "easeOut" }}
                      />
                    )
                  )}
                  {/* latest marker */}
                  {s.lastVal != null && (
                    <circle cx={xForIndex(N - 1)} cy={yOf(s.lastVal)} r={isLeader ? 3.4 : 2.5} fill={s.color} />
                  )}
                </g>
              );
            })}

            {/* Hover crosshair + dots */}
            {snappedIdx != null && (
              <>
                <line x1={xForIndex(snappedIdx)} y1={padT} x2={xForIndex(snappedIdx)} y2={height - padB} stroke="rgba(255,255,255,0.16)" strokeWidth={1} strokeDasharray="3 3" />
                {withSamples.map((s) =>
                  s.samples[snappedIdx] != null ? (
                    <circle key={s.id} cx={xForIndex(snappedIdx)} cy={yOf(s.samples[snappedIdx] as number)} r={3.4} fill={s.color} stroke="#0a0a0b" strokeWidth={1.5} />
                  ) : null
                )}
              </>
            )}
          </svg>
        ) : (
          <SnapshotBars rows={withSamples} metric={metric} labelFor={labelFor} />
        )}

        {/* Tooltip */}
        {hasSeries && snappedIdx != null && (
          <ChartTooltip
            x={xForIndex(snappedIdx)}
            width={width}
            t={times[snappedIdx]}
            rows={withSamples
              .map((s) => (s.samples[snappedIdx] != null ? { id: s.id, color: s.color, value: s.samples[snappedIdx] as number } : null))
              .filter(Boolean) as { id: string; color: string; value: number }[]}
            fmt={fmt}
            metric={metric}
            labelFor={labelFor}
          />
        )}
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-x-4 gap-y-2 pt-1">
        {series.map((s, i) => {
          const off = hidden.has(s.providerId);
          return (
            <button
              key={s.providerId}
              onClick={() => toggle(s.providerId)}
              className={`inline-flex items-center gap-2 text-[12.5px] transition-opacity ${off ? "opacity-35" : "opacity-100"}`}
              style={{ fontFamily: "var(--font-inter)" }}
              aria-pressed={!off}
            >
              <span className="h-2 w-2 rounded-full" style={{ background: seriesColor(s.providerId, i) }} />
              <span className={off ? "text-[#7c7c82] line-through" : "text-[#a5a5ac]"}>{labelFor(s.providerId)}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* ── Snapshot (ranked bars) fallback for sparse history ───── */
function SnapshotBars({
  rows,
  metric,
  labelFor,
}: {
  rows: { id: string; color: string; rank: number; lastVal: number | null }[];
  metric: MetricKey;
  labelFor: (id: string) => string;
}) {
  const cfg = METRICS[metric];
  const data = rows
    .filter((r) => r.lastVal != null)
    .map((r) => ({ id: r.id, color: r.color, value: r.lastVal as number }));

  if (!data.length) {
    return (
      <div className="flex h-[240px] items-center justify-center text-[14px] text-[#54545a]" style={{ fontFamily: "var(--font-inter)" }}>
        Collecting live data…
      </div>
    );
  }

  const max = Math.max(...data.map((r) => r.value));
  const min = Math.min(...data.map((r) => r.value));
  data.sort((a, b) => (cfg.better === "high" ? b.value - a.value : a.value - b.value));

  return (
    <div className="flex flex-col gap-2.5 py-1">
      {data.map((r, i) => {
        const norm = cfg.better === "high" ? r.value / (max || 1) : min / (r.value || 1);
        const pct = Math.max(8, Math.min(100, norm * 100));
        const label =
          metric === "latency_avg" ? `${Math.round(r.value)}ms` : metric === "score" ? `${Math.round(r.value)}` : `${r.value.toFixed(2)}%`;
        return (
          <motion.div
            key={r.id}
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.05, duration: 0.4 }}
            className="grid grid-cols-[130px_1fr_auto] items-center gap-3"
          >
            <span className="truncate text-[13px] font-medium text-white" style={{ fontFamily: "var(--font-inter)" }}>{labelFor(r.id)}</span>
            <span className="h-2.5 w-full overflow-hidden rounded-full bg-white/6">
              <motion.span className="block h-full rounded-full" style={{ background: r.color }} initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ delay: i * 0.05 + 0.1, duration: 0.7, ease: [0.23, 1, 0.32, 1] }} />
            </span>
            <span className="w-16 text-right text-[13px] font-semibold text-white tnum" style={{ fontFamily: "var(--font-inter)" }}>{label}</span>
          </motion.div>
        );
      })}
      <p className="mt-2 text-[11px] text-[#54545a]" style={{ fontFamily: "var(--font-jetbrains-mono)" }}>
        Current standings · time-series builds as Argus polls
      </p>
    </div>
  );
}

/* ── Tooltip ──────────────────────────────────────────────── */
function ChartTooltip({
  x, width, t, rows, fmt, metric, labelFor,
}: {
  x: number; width: number; t: number;
  rows: { id: string; color: string; value: number }[];
  fmt: (v: number) => string; metric: MetricKey; labelFor: (id: string) => string;
}) {
  const sorted = [...rows].sort((a, b) => (metric === "latency_avg" ? a.value - b.value : b.value - a.value));
  const left = Math.min(Math.max(x, 90), width - 90);
  return (
    <div className="pointer-events-none absolute top-2 z-10 -translate-x-1/2 rounded-[10px] border border-white/10 bg-[#141416]/95 px-3 py-2 shadow-[0_16px_40px_-16px_rgba(0,0,0,0.8)] backdrop-blur-md" style={{ left }}>
      <p className="mb-1.5 text-[10px] text-[#7c7c82]" style={{ fontFamily: "var(--font-jetbrains-mono)" }}>
        {new Date(t).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
      </p>
      <div className="flex flex-col gap-1">
        {sorted.slice(0, 6).map((r) => (
          <div key={r.id} className="flex items-center gap-2 text-[12px]">
            <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: r.color }} />
            <span className="mr-3 text-[#a5a5ac]" style={{ fontFamily: "var(--font-inter)" }}>{labelFor(r.id)}</span>
            <span className="ml-auto font-semibold text-white tnum" style={{ fontFamily: "var(--font-inter)" }}>{fmt(r.value)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
