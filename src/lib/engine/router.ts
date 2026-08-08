import { getProviders, getLatestScores, getProvidersWithRecentIncidents } from "../db/queries";

export const ROUTER_MIN_SCORE = 50;
export const SCORE_MAX_AGE_MS = 5 * 60 * 1000;

export interface Candidate {
  provider_id: string;
  url: string;
  score: number;
  trend: string;
  healthy: boolean;
}

export interface RouteDecision {
  status: "HEALTHY" | "DEGRADED" | "NO_CANDIDATES";
  best: Candidate | null;
  candidates: Candidate[];      // ordered failover chain
  policy: { min_score: number; max_age_ms: number };
  decided_at: string;
}

let cachedDecision: RouteDecision | null = null;
let lastDecidedAt = 0;
const CACHE_DURATION_MS = 5 * 60 * 1000; // 5 minutes

export async function selectRoute(force = false): Promise<RouteDecision> {
  const now = Date.now();
  const ROTATION_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes
  const currentBucket = Math.floor(now / ROTATION_INTERVAL_MS);
  const lastBucket = Math.floor(lastDecidedAt / ROTATION_INTERVAL_MS);

  if (!force && cachedDecision && currentBucket === lastBucket) {
    return {
      ...cachedDecision,
      decided_at: new Date(lastDecidedAt).toISOString(),
    };
  }

  const [providers, scores, badRecent] = await Promise.all([
    getProviders(),
    getLatestScores(),
    getProvidersWithRecentIncidents(), // CENSORING|DEVIANT|STALE in last 30 min
  ]);
  const byId = new Map(providers.map((p) => [p.id, p]));

  const candidates: Candidate[] = [];
  for (const s of scores) {
    const p = byId.get(s.provider_id);
    if (!p || p.is_sim) continue;                                   // never route via sims
    if (Date.now() - new Date(s.t).getTime() > SCORE_MAX_AGE_MS)
      continue;                                                     // stale monitoring = unknown
    candidates.push({
      provider_id: p.id,
      url: p.url,
      score: s.score,
      trend: s.trend,
      healthy: s.score >= ROUTER_MIN_SCORE && !badRecent.has(p.id),
    });
  }

  // Append fallback candidates for any registered providers that don't have fresh scores in the DB.
  // This guarantees that we always have a complete failover chain of up to 3+ upstreams.
  const candidateIds = new Set(candidates.map((c) => c.provider_id));
  for (const p of providers) {
    if (p.is_sim) continue;
    if (!candidateIds.has(p.id)) {
      candidates.push({
        provider_id: p.id,
        url: p.url,
        score: 50, // default score for unmonitored fallbacks
        trend: "STABLE",
        healthy: !badRecent.has(p.id),
      });
    }
  }

  const healthy = candidates.filter((c) => c.healthy);
  let rotatedChain = [...candidates];
  let best: Candidate | null = null;

  if (healthy.length > 0) {
    const rotateIndex = currentBucket % healthy.length;
    best = healthy[rotateIndex];
    const healthyCopy = [...healthy];
    const rotatedHealthy = [
      best,
      ...healthyCopy.filter((c) => c.provider_id !== best!.provider_id),
    ];
    const unhealthy = candidates.filter((c) => !c.healthy);
    rotatedChain = [...rotatedHealthy, ...unhealthy];
  } else if (candidates.length > 0) {
    const rotateIndex = currentBucket % candidates.length;
    best = candidates[rotateIndex];
    const candidatesCopy = [...candidates];
    rotatedChain = [
      best,
      ...candidatesCopy.filter((c) => c.provider_id !== best!.provider_id),
    ];
  }
  
  const decision: RouteDecision = {
    status: healthy.length ? "HEALTHY" : candidates.length ? "DEGRADED" : "NO_CANDIDATES",
    best,
    candidates: rotatedChain,
    policy: { min_score: ROUTER_MIN_SCORE, max_age_ms: SCORE_MAX_AGE_MS },
    decided_at: new Date(now).toISOString(),
  };

  cachedDecision = decision;
  lastDecidedAt = now;
  return decision;
}
