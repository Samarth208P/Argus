// ============================================================
// Chain Continuity Watch — C3 check
// Validates parentHash linkage across sequential block polls
// to ensure RPC providers aren't serving mutated chain histories.
// ============================================================

export interface ContinuityState {
  providerId: string;
  lastBlockHash: string | null;
}

export function verifyBlockContinuity(
  providerId: string,
  currentParentHash: string,
  history: ContinuityState[]
): { valid: boolean; previousHash: string | null } {
  const record = history.find((h) => h.providerId === providerId);
  if (!record || !record.lastBlockHash) {
    return { valid: true, previousHash: null };
  }
  return {
    valid: record.lastBlockHash === currentParentHash,
    previousHash: record.lastBlockHash,
  };
}
