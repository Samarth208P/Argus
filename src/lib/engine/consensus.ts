// ============================================================
// Isomorphic Consensus Engine
// Works in: Node 18+ (API routes) AND browser (/verify page)
//
// CRITICAL: All hashing uses Web Crypto (async). This means
// canonicalize() and determineConsensus() are async.
// Never import node:crypto here.
// ============================================================

import { sha256 } from "./hash";

export interface ProviderResponse {
  providerId: string;
  result: unknown;
  error?: string;
  latencyMs: number;
  status: "ok" | "timeout" | "error";
}

export interface ConsensusResult {
  truthHash: string | null;
  truthGroup: string[]; // provider IDs agreeing with truth
  outliers: string[];   // provider IDs diverging from truth
  status: "CONSENSUS" | "INCONCLUSIVE";
  groupTally: Array<{ hash: string; providers: string[]; weight: number }>;
}

// ── Canonicalize: sorted-key JSON → sha256 ────────────────
// Sorting keys ensures {a:1,b:2} and {b:2,a:1} produce same hash.
export async function canonicalize(value: unknown): Promise<string> {
  const sorted = deepSortKeys(value);
  const json = JSON.stringify(sorted);
  return sha256(json);
}

function deepSortKeys(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(deepSortKeys);
  if (value !== null && typeof value === "object") {
    const sorted: Record<string, unknown> = {};
    for (const key of Object.keys(value as object).sort()) {
      sorted[key] = deepSortKeys((value as Record<string, unknown>)[key]);
    }
    return sorted;
  }
  return value;
}

// ── Extract consensus-critical fields from a block response ─
// Geth/Erigon/Reth return different extra fields.
// Compare ONLY the 4 consensus-critical fields per PRD F-03.
export function extractBlockTuple(block: Record<string, string>): {
  hash: string;
  parentHash: string;
  stateRoot: string;
  transactionsRoot: string;
} {
  return {
    hash: block.hash ?? "",
    parentHash: block.parentHash ?? "",
    stateRoot: block.stateRoot ?? "",
    transactionsRoot: block.transactionsRoot ?? "",
  };
}

// ── Vote: weighted majority consensus ─────────────────────
// Returns INCONCLUSIVE if no group exceeds 50% of total weight.
export async function determineConsensus(
  responses: ProviderResponse[],
  weights: Record<string, number> // providerId → weight
): Promise<ConsensusResult> {
  const okResponses = responses.filter((r) => r.status === "ok");
  if (okResponses.length < 2) {
    return {
      truthHash: null,
      truthGroup: [],
      outliers: responses.map((r) => r.providerId),
      status: "INCONCLUSIVE",
      groupTally: [],
    };
  }

  // Group responses by canonical hash
  const groups = new Map<string, string[]>(); // hash → [providerIds]
  for (const r of okResponses) {
    const hash = await canonicalize(r.result);
    const existing = groups.get(hash) ?? [];
    existing.push(r.providerId);
    groups.set(hash, existing);
  }

  // Calculate total weight
  const totalWeight = okResponses.reduce(
    (sum, r) => sum + (weights[r.providerId] ?? 1),
    0
  );

  // Build tally
  const groupTally = Array.from(groups.entries()).map(([hash, providers]) => ({
    hash,
    providers,
    weight: providers.reduce((sum, id) => sum + (weights[id] ?? 1), 0),
  }));

  // Find winning group (>50% weight)
  const winner = groupTally.find((g) => g.weight / totalWeight > 0.5);

  if (!winner) {
    return {
      truthHash: null,
      truthGroup: [],
      outliers: okResponses.map((r) => r.providerId),
      status: "INCONCLUSIVE",
      groupTally,
    };
  }

  const outliers = okResponses
    .map((r) => r.providerId)
    .filter((id) => !winner.providers.includes(id));

  return {
    truthHash: winner.hash,
    truthGroup: winner.providers,
    outliers,
    status: "CONSENSUS",
    groupTally,
  };
}
