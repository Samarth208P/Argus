// ============================================================
// Shared Adversary Simulator State
// ============================================================

export type AdversaryMode = "stale" | "mutate" | "censor";

export interface AdversaryState {
  targetId: string | null;
  mode: AdversaryMode | null;
  expiresAt: number | null;
}

// In-memory global state
const state: AdversaryState = {
  targetId: process.env.ADVERSARY_TARGET_ID || null,
  mode: (process.env.ADVERSARY_MODE as AdversaryMode) || null,
  expiresAt: null,
};

export function getAdversaryState(): AdversaryState {
  if (state.expiresAt && Date.now() > state.expiresAt) {
    state.targetId = null;
    state.mode = null;
    state.expiresAt = null;
  }
  return state;
}

export function setAdversaryState(
  targetId: string | null,
  mode: AdversaryMode | null,
  durationSeconds = 120
) {
  state.targetId = targetId;
  state.mode = mode;
  state.expiresAt = targetId && mode ? Date.now() + durationSeconds * 1000 : null;
  return state;
}
