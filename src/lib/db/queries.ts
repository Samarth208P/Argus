// ============================================================
// Typed Query Functions for Supabase (with fallback mock data)
// ============================================================

import { supabaseServer } from "./supabase";
import type { DbIncident, DbProvider, DbScore } from "./types";
import { MAINNET_PROVIDERS } from "@/lib/engine/registry";

// ── Built-in Fallbacks for Hackathon Demo ──────────────────
const MOCK_PROVIDERS: DbProvider[] = MAINNET_PROVIDERS.map((p) => ({
  id: p.id,
  url: p.url,
  label: p.label,
  operator: p.operator,
  type: p.type,
  is_sim: false,
  network: p.network,
  created_at: new Date(Date.now() - 3600_000 * 24).toISOString(),
}));

const MOCK_SCORES: DbScore[] = [
  { id: "s1", t: new Date().toISOString(), provider_id: "cloudflare", score: 98, accuracy: 0.99, uptime: 1.0, latency_avg: 45, freshness_score: 0.99, trend: "STABLE" },
  { id: "s2", t: new Date().toISOString(), provider_id: "llama", score: 95, accuracy: 0.97, uptime: 0.99, latency_avg: 120, freshness_score: 0.96, trend: "STABLE" },
  { id: "s3", t: new Date().toISOString(), provider_id: "publicnode", score: 92, accuracy: 0.95, uptime: 0.98, latency_avg: 195, freshness_score: 0.94, trend: "IMPROVING" },
  { id: "s4", t: new Date().toISOString(), provider_id: "drpc", score: 89, accuracy: 0.94, uptime: 0.99, latency_avg: 88, freshness_score: 0.92, trend: "STABLE" },
  { id: "s5", t: new Date().toISOString(), provider_id: "1rpc", score: 86, accuracy: 0.92, uptime: 0.97, latency_avg: 240, freshness_score: 0.91, trend: "DEGRADING" },
  { id: "s6", t: new Date().toISOString(), provider_id: "blast", score: 84, accuracy: 0.90, uptime: 0.96, latency_avg: 155, freshness_score: 0.90, trend: "STABLE" },
  { id: "s7", t: new Date().toISOString(), provider_id: "tenderly", score: 94, accuracy: 0.96, uptime: 0.99, latency_avg: 62, freshness_score: 0.95, trend: "STABLE" },
  { id: "s8", t: new Date().toISOString(), provider_id: "onfinality", score: 81, accuracy: 0.88, uptime: 0.95, latency_avg: 310, freshness_score: 0.88, trend: "STABLE" },
  { id: "s9", t: new Date().toISOString(), provider_id: "flashbots", score: 99, accuracy: 1.0, uptime: 1.0, latency_avg: 55, freshness_score: 1.0, trend: "STABLE" },
  { id: "s10", t: new Date().toISOString(), provider_id: "mevblocker", score: 97, accuracy: 0.98, uptime: 0.99, latency_avg: 70, freshness_score: 0.98, trend: "STABLE" },
];

const MOCK_INCIDENTS: DbIncident[] = [
  {
    id: "a09886b0-7b24-4f51-876a-939e1bf07b22",
    t: new Date(Date.now() - 600_000).toISOString(),
    provider_id: "onfinality",
    kind: "STALE",
    poll_id: "00000000-0000-0000-0000-000000000000",
    request: { method: "eth_getBalance", params: ["0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045", "0x12b519a"] },
    expected: "0x3bc141d668c2d1b",
    got: "0x3bc140a322c342a",
    receipts: { txHash: "0xb12393b5c0e1350524afb49d5a2101ed7b2b9a2031f02216bf69580585d71ba2", network: "sepolia" }
  },
  {
    id: "f833a6b5-0aa9-4c8a-bc3e-bf6e7293a11b",
    t: new Date(Date.now() - 1800_000).toISOString(),
    provider_id: "1rpc",
    kind: "DEVIANT",
    poll_id: "00000000-0000-0000-0000-000000000000",
    request: { method: "eth_getBalance", params: ["0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045", "0x12b519a"] },
    expected: "0x3bc141d668c2d1b",
    got: "0x3bc140a322c342a",
    receipts: null
  },
];

// ── Providers ─────────────────────────────────────────────
export async function getProviders(): Promise<DbProvider[]> {
  try {
    const { data, error } = await supabaseServer
      .from("providers")
      .select("*")
      .order("created_at", { ascending: true });
    if (error || !data || data.length === 0) return MOCK_PROVIDERS;
    return data as DbProvider[];
  } catch {
    return MOCK_PROVIDERS;
  }
}

export async function upsertProvider(
  provider: Omit<DbProvider, "created_at">
): Promise<void> {
  const { error } = await supabaseServer
    .from("providers")
    .upsert(provider as any, { onConflict: "id" });
  if (error) throw error;
}

// ── Polls ─────────────────────────────────────────────────
export async function insertPoll(poll: {
  battery: unknown;
  pinned_block_hex: string;
  consensus_hash: string | null;
  merkle_root: string | null;
  status: string;
}): Promise<string> {
  const { data, error } = await supabaseServer
    .from("polls")
    .insert(poll as any)
    .select("id")
    .single();
  if (error) throw error;
  return (data as any).id as string;
}

export async function getPollById(id: string) {
  try {
    const { data, error } = await supabaseServer
      .from("polls")
      .select("*")
      .eq("id", id)
      .single();
    if (error) return { id, battery: [], pinned_block_hex: "0x0", consensus_hash: null, merkle_root: null, status: "ok" };
    return data as any;
  } catch {
    return { id, battery: [], pinned_block_hex: "0x0", consensus_hash: null, merkle_root: null, status: "ok" };
  }
}

export async function getPollsByHour(hour: Date) {
  const start = new Date(hour);
  start.setMinutes(0, 0, 0);
  const end = new Date(start);
  end.setHours(end.getHours() + 1);

  try {
    const { data, error } = await supabaseServer
      .from("polls")
      .select("id, consensus_hash")
      .gte("t", start.toISOString())
      .lt("t", end.toISOString());
    if (error) return [];
    return (data ?? []) as Array<{ id: string; consensus_hash: string | null }>;
  } catch {
    return [];
  }
}

// ── Incidents ─────────────────────────────────────────────
export async function insertIncident(
  incident: Omit<DbIncident, "id" | "t">
): Promise<string> {
  const { data, error } = await supabaseServer
    .from("incidents")
    .insert(incident as any)
    .select("id")
    .single();
  if (error) throw error;
  return (data as any).id as string;
}

export async function getRecentIncidents(limit = 50): Promise<DbIncident[]> {
  try {
    const { data, error } = await supabaseServer
      .from("incidents")
      .select("*")
      .order("t", { ascending: false })
      .limit(limit);
    if (error || !data || data.length === 0) return MOCK_INCIDENTS;
    return data as DbIncident[];
  } catch {
    return MOCK_INCIDENTS;
  }
}

export async function getIncidentById(id: string): Promise<DbIncident | null> {
  try {
    const { data, error } = await supabaseServer
      .from("incidents")
      .select("*")
      .eq("id", id)
      .single();
    if (error || !data) {
      return MOCK_INCIDENTS.find((i) => i.id === id) ?? null;
    }
    return data as DbIncident;
  } catch {
    return MOCK_INCIDENTS.find((i) => i.id === id) ?? null;
  }
}

// ── Scores ────────────────────────────────────────────────
export async function upsertScore(
  score: Omit<DbScore, "id" | "t">
): Promise<void> {
  const { error } = await supabaseServer
    .from("scores")
    .insert(score as any);
  if (error) throw error;
}

export async function getLatestScores(): Promise<DbScore[]> {
  try {
    const { data, error } = await supabaseServer
      .from("scores")
      .select("*")
      .order("t", { ascending: false })
      .limit(200);
    if (error || !data || data.length === 0) return MOCK_SCORES;

    const seen = new Set<string>();
    const latest: DbScore[] = [];
    for (const row of (data ?? []) as DbScore[]) {
      if (!seen.has(row.provider_id)) {
        seen.add(row.provider_id);
        latest.push(row);
      }
    }
    return latest;
  } catch {
    return MOCK_SCORES;
  }
}

export async function getScoreHistory(
  providerId: string,
  limit = 50
): Promise<DbScore[]> {
  try {
    const { data, error } = await supabaseServer
      .from("scores")
      .select("*")
      .eq("provider_id", providerId)
      .order("t", { ascending: false })
      .limit(limit);
    if (error || !data || data.length === 0) {
      return MOCK_SCORES.filter((s) => s.provider_id === providerId);
    }
    return ((data ?? []) as DbScore[]).reverse();
  } catch {
    return MOCK_SCORES.filter((s) => s.provider_id === providerId);
  }
}
