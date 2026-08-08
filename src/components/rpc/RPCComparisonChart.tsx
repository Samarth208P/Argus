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

/** Catmull-Rom → cubic bezier smoothing. */
function smoothPath(pts: [number, number][]): string {
  if (pts.length === 0) return "";
  if (pts.length === 1) return `M${pts[0][0]},${pts[0][1]}`;
  let d = `M${pts[0][0]},${pts[0][1]}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] ?? pts[i];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[i + 2] ?? p2;
    const c1x = p1[0] + (p2[0] - p0[0]) / 6;
    const c1y = p1[1] + (p2[1] - p0[1]) / 6;
    const c2x = p2[0] - (p3[0] - p1[0]) / 6;
    const c2y = p2[1] - (p3[1] - p1[1]) / 6;
    d += ` C${c1x.toFixed(1)},${c1y.toFixed(1)} ${c2x.toFixed(1)},${c2y.toFixed(1)} ${p2[0].toFixed(1)},${p2[1].toFixed(1)}`;
  }
  return d;
}

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
  const [hoverX, setHoverX] = useState<number | null>(null);
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
  const now = Date.now();
  const rangeMs = RANGES.find((r) => r.key === range)?.ms ?? Infinity;

  // Filtered, visible series.
  const visible = useMemo(
    () =>
      series
        .filter((s) => !hidden.has(s.providerId))
        .map((s) => ({
          ...s,
          color: seriesColor(s.providerId, series.indexOf(s)),
          filtered: s.points.filter((p) => now - p.t <= rangeMs),
        })),
    [series, hidden, rangeMs, now]
  );

  const allPoints = visible.flatMap((s) => s.filtered);
  const hasSeries = visible.some((s) => s.filtered.length >= 3);

  // Layout
  const height = 300;
  const padL = 44;
  const padR = 16;
  const padT = 16;
  const padB = 28;
  const plotW = Math.max(80, width - padL - padR);
  const plotH = height - padT - padB;

  // Domains
  const times = allPoints.map((p) => p.t);
  const minT = times.length ? Math.min(...times) : now - 60_000;
  const maxT = times.length ? Math.max(...times) : now;
  const tSpan = maxT - minT || 1;

  const values = allPoints.map((p) => p[field] as number);
  let yMin: number, yMax: number;
  if (metric === "score") {
    yMin = 0; yMax = 100;
  } else if (metric === "latency_avg") {
    yMin = 0; yMax = values.length ? Math.max(...values) * 1.15 : 500;
  } else {
    // accuracy / uptime: zoom into the high band
    const lo = values.length ? Math.min(...values) : 90;
    yMin = Math.max(0, Math.floor(lo) - 2); yMax = 100;
  }
  const ySpan = yMax - yMin || 1;

  const xOf = (t: number) => padL + ((t - minT) / tSpan) * plotW;
  const yOf = (v: number) => padT + (1 - (v - yMin) / ySpan) * plotH;

  const yTicks = 4;
  const tickVals = Array.from({ length: yTicks + 1 }, (_, i) => yMin + (ySpan * i) / yTicks);

  // Hover → nearest timestamp among the union of sample times
  const sampleTimes = useMemo(() => Array.from(new Set(times)).sort((a, b) => a - b), [times]);
  const hoverT =
    hoverX != null && sampleTimes.length
      ? sampleTimes.reduce((best, t) => (Math.abs(xOf(t) - hoverX) < Math.abs(xOf(best) - hoverX) ? t : best), sampleTimes[0])
      : null;

  const toggle = (id: string) =>
    setHidden((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  return (
    <div className="flex flex-col gap-4">
      {/* Controls */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="inline-flex rounded-[9px] border border-white/8 bg-white/[0.02] p-0.5">
          {CHART_METRICS.map((m) => (
            <button
              key={m}
              onClick={() => setMetric(m)}
              className={`rounded-[7px] px-3 py-1.5 text-[12.5px] font-medium transition-colors ${
                metric === m ? "bg-white/[0.07] text-white" : "text-[#7c7c82] hover:text-white"
              }`}
              style={{ fontFamily: "var(--font-inter)" }}
            >
              {METRICS[m].short}
            </button>
          ))}
        </div>

        {hasSeries && (
          <div className="inline-flex rounded-[9px] border border-white/8 bg-white/[0.02] p-0.5">
            {RANGES.map((r) => (
              <button
                key={r.key}
                onClick={() => setRange(r.key)}
                className={`rounded-[7px] px-2.5 py-1.5 text-[12px] font-medium transition-colors tnum ${
                  range === r.key ? "bg-white/[0.07] text-white" : "text-[#7c7c82] hover:text-white"
                }`}
                style={{ fontFamily: "var(--font-jetbrains-mono)" }}
              >
                {r.label}
              </button>
            ))}
          </div>
        )}
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
              setHoverX(((e.clientX - rect.left) / rect.width) * width);
            }}
            onMouseLeave={() => setHoverX(null)}
          >
            {/* Grid + y labels */}
            {tickVals.map((v, i) => (
              <g key={i}>
                <line x1={padL} y1={yOf(v)} x2={width - padR} y2={yOf(v)} stroke="rgba(255,255,255,0.05)" strokeWidth={1} />
                <text x={padL - 8} y={yOf(v) + 3} textAnchor="end" fontSize={10} fill="#54545a" fontFamily="var(--font-jetbrains-mono)">
                  {metric === "latency_avg" ? Math.round(v) : Math.round(v)}
                </text>
              </g>
            ))}

            {/* Series */}
            {visible.map((s) => {
              const pts: [number, number][] = s.filtered.map((p) => [xOf(p.t), yOf(p[field] as number)]);
              const isLeader = s.rank === 1;
              return (
                <g key={s.providerId} opacity={hoverT && !isLeader ? 0.85 : 1}>
                  <motion.path
                    d={smoothPath(pts)}
                    fill="none"
                    stroke={s.color}
                    strokeWidth={isLeader ? 2.4 : 1.4}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    initial={{ pathLength: 0, opacity: 0 }}
                    animate={{ pathLength: 1, opacity: isLeader ? 1 : 0.75 }}
                    transition={{ duration: 0.9, ease: "easeOut" }}
                  />
                  {/* latest point marker */}
                  {pts.length > 0 && (
                    <circle cx={pts[pts.length - 1][0]} cy={pts[pts.length - 1][1]} r={isLeader ? 3.5 : 2.5} fill={s.color} />
                  )}
                </g>
              );
            })}

            {/* Hover crosshair */}
            {hoverT != null && (
              <line x1={xOf(hoverT)} y1={padT} x2={xOf(hoverT)} y2={height - padB} stroke="rgba(255,255,255,0.16)" strokeWidth={1} strokeDasharray="3 3" />
            )}
            {hoverT != null &&
              visible.map((s) => {
                const p = s.filtered.find((pp) => pp.t === hoverT);
                if (!p) return null;
                return <circle key={s.providerId} cx={xOf(hoverT)} cy={yOf(p[field] as number)} r={3.5} fill={s.color} stroke="#0a0a0b" strokeWidth={1.5} />;
              })}
          </svg>
        ) : (
          <SnapshotBars visible={visible} metric={metric} labelFor={labelFor} />
        )}

        {/* Tooltip */}
        {hasSeries && hoverT != null && (
          <ChartTooltip
            x={xOf(hoverT)}
            width={width}
            t={hoverT}
            rows={visible
              .map((s) => {
                const p = s.filtered.find((pp) => pp.t === hoverT);
                return p ? { id: s.providerId, color: s.color, value: p[field] as number } : null;
              })
              .filter(Boolean) as { id: string; color: string; value: number }[]}
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
  visible,
  metric,
  labelFor,
}: {
  visible: { providerId: string; rank: number; color: string; filtered: SeriesPoint[] }[];
  metric: MetricKey;
  labelFor: (id: string) => string;
}) {
  const field = POINT_FIELD[metric];
  const cfg = METRICS[metric];
  const rows = visible
    .map((s) => {
      const last = s.filtered[s.filtered.length - 1];
      return last ? { id: s.providerId, color: s.color, rank: s.rank, value: last[field] as number } : null;
    })
    .filter(Boolean) as { id: string; color: string; rank: number; value: number }[];

  if (!rows.length) {
    return (
      <div className="flex h-[240px] items-center justify-center text-[14px] text-[#54545a]" style={{ fontFamily: "var(--font-inter)" }}>
        Collecting live data…
      </div>
    );
  }

  const max = Math.max(...rows.map((r) => r.value));
  const min = Math.min(...rows.map((r) => r.value));
  rows.sort((a, b) => (cfg.better === "high" ? b.value - a.value : a.value - b.value));

  return (
    <div className="flex flex-col gap-2.5 py-1">
      {rows.map((r, i) => {
        // normalise bar width so best fills the track
        const norm = cfg.better === "high" ? r.value / (max || 1) : (min / (r.value || 1));
        const pct = Math.max(8, Math.min(100, norm * 100));
        const fmt =
          metric === "latency_avg" ? `${Math.round(r.value)}ms` :
          metric === "score" ? `${Math.round(r.value)}` : `${r.value.toFixed(2)}%`;
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
              <motion.span
                className="block h-full rounded-full"
                style={{ background: r.color }}
                initial={{ width: 0 }}
                animate={{ width: `${pct}%` }}
                transition={{ delay: i * 0.05 + 0.1, duration: 0.7, ease: [0.23, 1, 0.32, 1] }}
              />
            </span>
            <span className="w-16 text-right text-[13px] font-semibold text-white tnum" style={{ fontFamily: "var(--font-inter)" }}>{fmt}</span>
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
  x, width, t, rows, metric, labelFor,
}: {
  x: number; width: number; t: number;
  rows: { id: string; color: string; value: number }[];
  metric: MetricKey; labelFor: (id: string) => string;
}) {
  const sorted = [...rows].sort((a, b) => (metric === "latency_avg" ? a.value - b.value : b.value - a.value));
  const left = Math.min(Math.max(x, 90), width - 90);
  const fmt = (v: number) =>
    metric === "latency_avg" ? `${Math.round(v)}ms` : metric === "score" ? `${Math.round(v)}` : `${v.toFixed(2)}%`;
  return (
    <div
      className="pointer-events-none absolute top-2 z-10 -translate-x-1/2 rounded-[10px] border border-white/10 bg-[#141416]/95 px-3 py-2 shadow-[0_16px_40px_-16px_rgba(0,0,0,0.8)] backdrop-blur-md"
      style={{ left }}
    >
      <p className="mb-1.5 text-[10px] text-[#7c7c82]" style={{ fontFamily: "var(--font-jetbrains-mono)" }}>
        {new Date(t).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
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
