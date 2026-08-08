// ============================================================
// Incident Classifier — PRD F-05
// Re-queries an outlier 2x before confirming an incident.
// Transient single-poll mismatches never produce an incident.
// ============================================================

import type { ProviderResponse } from "./consensus";

export type IncidentKind = "DEVIANT" | "STALE" | "CENSORING" | "DOWN";

export interface ClassifiedResult {
  providerId: string;
  kind: IncidentKind;
  confirmed: boolean;
}

// ── Classify a single provider response ──────────────────
export function classifySingleResponse(
  response: ProviderResponse,
  isOutlier: boolean,
  lagBlocks?: number // only for C4 freshness checks
): IncidentKind | null {
  // DOWN: provider timed out or errored entirely
  if (response.status === "timeout" || response.status === "error") {
    return "DOWN";
  }

  // STALE: block number lag >= 2 (C4 freshness check)
  if (lagBlocks !== undefined && lagBlocks >= 2) {
    return "STALE";
  }

  // DEVIANT: provider gave a valid response but diverges from consensus
  if (isOutlier) {
    return "DEVIANT";
  }

  return null;
}

// ── Continuity check — C3 (cryptographic, no voting needed) ─
// A provider's current block's parentHash must equal its
// previous poll's block hash. This is a cryptographic lie —
// no weighting needed.
export function checkContinuity(
  previousHash: string | null,
  currentParentHash: string
): boolean {
  if (!previousHash) return true; // no previous data yet
  return previousHash === currentParentHash;
}

// ── Freshness check — C4 ─────────────────────────────────
export function checkFreshness(
  providerBlockNumber: bigint,
  poolMax: bigint
): number {
  return Number(poolMax - providerBlockNumber);
}

// ── Censorship probe result — C5 ─────────────────────────
export function classifyCensorshipResult(
  providerAccepted: boolean,
  quorumAccepted: boolean
): IncidentKind | null {
  // Provider refuses while quorum accepts = CENSORING
  if (!providerAccepted && quorumAccepted) return "CENSORING";
  return null;
}
