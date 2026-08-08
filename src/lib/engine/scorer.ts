// ============================================================
// Integrity Scorer — PRD F-06
// Rolling window W=50 polls per provider.
// score = round(100 × (0.5·accuracy + 0.2·uptime + 0.15·latencyScore + 0.15·freshnessScore))
// Trend = IMPROVING / DEGRADING / STABLE (±5 threshold)
// ============================================================

export interface PollRecord {
  providerId: string;
  wasInConsensus: boolean;
  wasOnline: boolean;
  latencyMs: number;
  lagBlocks: number;
}

export interface ProviderScore {
  providerId: string;
  score: number;
  accuracy: number;     // 0-1
  uptime: number;       // 0-1
  latencyAvg: number;   // ms
  freshnessScore: number; // 0-1
  trend: "IMPROVING" | "DEGRADING" | "STABLE";
}

const WINDOW = 50;
const LATENCY_SPAN_MS = 1500; // real-world spread of public RPCs
const TREND_THRESHOLD = 5;    // score delta to count as trend

// ── Compute score from last W=50 polls ───────────────────
export function computeScore(polls: PollRecord[]): ProviderScore {
  const window = polls.slice(-WINDOW);
  if (window.length === 0) {
    return {
      providerId: polls[0]?.providerId ?? "unknown",
      score: 0,
      accuracy: 0,
      uptime: 0,
      latencyAvg: 0,
      freshnessScore: 0,
      trend: "STABLE",
    };
  }

  const accuracy =
    window.filter((p) => p.wasInConsensus).length / window.length;
  const uptime =
    window.filter((p) => p.wasOnline).length / window.length;
  const latencyAvg =
    window.reduce((sum, p) => sum + p.latencyMs, 0) / window.length;
  const latencyScore = Math.max(
    0,
    1 - latencyAvg / LATENCY_SPAN_MS
  );
  const freshnessScore =
    window.filter((p) => p.lagBlocks < 2).length / window.length;

  const rawScore =
    0.5 * accuracy +
    0.2 * uptime +
    0.15 * latencyScore +
    0.15 * freshnessScore;

  const score = Math.round(100 * rawScore);

  // Trend: compare first half vs second half of the window
  const trend = computeTrend(window);

  return {
    providerId: window[0].providerId,
    score,
    accuracy,
    uptime,
    latencyAvg,
    freshnessScore,
    trend,
  };
}

function computeTrend(
  window: PollRecord[]
): "IMPROVING" | "DEGRADING" | "STABLE" {
  if (window.length < 10) return "STABLE";

  const half = Math.floor(window.length / 2);
  const firstHalf = window.slice(0, half);
  const secondHalf = window.slice(half);

  const scoreOf = (polls: PollRecord[]) => {
    const acc = polls.filter((p) => p.wasInConsensus).length / polls.length;
    const up = polls.filter((p) => p.wasOnline).length / polls.length;
    return Math.round(100 * (0.5 * acc + 0.2 * up));
  };

  const delta = scoreOf(secondHalf) - scoreOf(firstHalf);
  if (delta >= TREND_THRESHOLD) return "IMPROVING";
  if (delta <= -TREND_THRESHOLD) return "DEGRADING";
  return "STABLE";
}
