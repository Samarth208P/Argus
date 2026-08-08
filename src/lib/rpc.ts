// ============================================================
// Shared RPC ranking + metric logic — single source of truth
// for the landing hero and the /rpcs leaderboard.
// Ranking preserves the existing business logic: the integrity
// `score` produced by engine/scorer.ts is the ranking key.
// ============================================================

import type { DbScore, DbProvider } from "@/lib/db/types";

export interface RankedRPC extends DbScore {
  provider?: DbProvider;
  rank: number;
}

/** Metric keys that actually exist in the data model. No throughput/region. */
export type MetricKey = "score" | "latency_avg" | "accuracy" | "uptime" | "freshness_score";

export interface MetricConfig {
  key: MetricKey;
  label: string;
  short: string;
  /** Higher value is better, or lower (latency). */
  better: "high" | "low";
  /** Raw → display string. */
  format: (row: DbScore) => string;
  /** Raw → numeric value used for charts/axes. */
  value: (row: DbScore) => number;
  unit?: string;
}

export const METRICS: Record<MetricKey, MetricConfig> = {
  score: {
    key: "score",
    label: "Integrity score",
    short: "Score",
    better: "high",
    value: (r) => r.score,
    format: (r) => `${r.score}`,
    unit: "/100",
  },
  latency_avg: {
    key: "latency_avg",
    label: "Latency",
    short: "Latency",
    better: "low",
    value: (r) => r.latency_avg,
    format: (r) => `${Math.round(r.latency_avg)}ms`,
  },
  accuracy: {
    key: "accuracy",
    label: "Accuracy",
    short: "Accuracy",
    better: "high",
    value: (r) => r.accuracy * 100,
    format: (r) => `${(r.accuracy * 100).toFixed(2)}%`,
  },
  uptime: {
    key: "uptime",
    label: "Uptime",
    short: "Uptime",
    better: "high",
    value: (r) => r.uptime * 100,
    format: (r) => `${(r.uptime * 100).toFixed(2)}%`,
  },
  freshness_score: {
    key: "freshness_score",
    label: "Freshness",
    short: "Freshness",
    better: "high",
    value: (r) => r.freshness_score * 100,
    format: (r) => `${Math.round(r.freshness_score * 100)}%`,
  },
};

export const METRIC_ORDER: MetricKey[] = ["score", "latency_avg", "accuracy", "uptime"];

/** Canonical ranking: integrity score desc, latency asc as tiebreak. */
export function rankRPCs(scores: DbScore[], providers: DbProvider[]): RankedRPC[] {
  const withProvider = scores.map((s) => ({
    ...s,
    provider: providers.find((p) => p.id === s.provider_id),
  }));
  withProvider.sort((a, b) => b.score - a.score || a.latency_avg - b.latency_avg);
  return withProvider.map((s, i) => ({ ...s, rank: i + 1 }));
}

/** Sort ranked rows by an arbitrary metric while keeping canonical `rank`. */
export function sortByMetric(rows: RankedRPC[], metric: MetricKey, dir: "asc" | "desc"): RankedRPC[] {
  const cfg = METRICS[metric];
  const mult = dir === "asc" ? 1 : -1;
  return [...rows].sort((a, b) => mult * (cfg.value(a) - cfg.value(b)));
}

/** The programmatically-derived best RPC (top of canonical ranking). */
export function bestRPC(ranked: RankedRPC[]): RankedRPC | null {
  return ranked[0] ?? null;
}

/** Real performance advantage of the leader over the runner-up, in %. */
export function leaderAdvantage(ranked: RankedRPC[]): number | null {
  if (ranked.length < 2) return null;
  const [first, second] = ranked;
  if (second.score <= 0) return null;
  return ((first.score - second.score) / second.score) * 100;
}

export function scoreColor(score: number): string {
  if (score >= 80) return "#6798ff";
  if (score >= 50) return "#ffbf59";
  return "#ff6b6b";
}

export function providerLabel(row: RankedRPC): string {
  return row.provider?.label ?? row.provider_id;
}

export function initials(row: RankedRPC): string {
  return providerLabel(row).slice(0, 2).toUpperCase();
}

/** Deterministic accent per provider for chart series (from palette family). */
const SERIES_PALETTE = ["#6798ff", "#57d9a3", "#ffbf59", "#c98cff", "#4fc4ff", "#ff8fab", "#8fe388", "#ff6b6b"];
export function seriesColor(providerId: string, index: number): string {
  return SERIES_PALETTE[index % SERIES_PALETTE.length];
}
