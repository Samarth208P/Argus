// ============================================================
// Typed Query Functions for Supabase
// ============================================================

import { supabaseServer } from "./supabase";
import type { DbIncident, DbProvider, DbScore } from "./types";
import { MAINNET_PROVIDERS } from "@/lib/engine/registry";

const BUILT_IN_PROVIDERS: DbProvider[] = MAINNET_PROVIDERS.map((p) => ({
  id: p.id,
  url: p.url,
  label: p.label,
  operator: p.operator,
  type: p.type,
  is_sim: false,
  network: p.network,
  created_at: new Date(Date.now() - 3600_000 * 24).toISOString(),
}));

// ── Providers ─────────────────────────────────────────────
export async function getProviders(): Promise<DbProvider[]> {
  try {
    const { data, error } = await supabaseServer
      .from("providers")
      .select("*")
      .order("created_at", { ascending: true });
    if (error) throw error;
    if (!data || data.length === 0) return BUILT_IN_PROVIDERS;
    return data as DbProvider[];
  } catch (err) {
    throw new Error(`Failed to load providers: ${String(err)}`);
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
    if (error || !data) return null;
    return data as any;
  } catch (err) {
    throw new Error(`Failed to load poll: ${String(err)}`);
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
      .select("*")
      .gte("t", start.toISOString())
      .lt("t", end.toISOString());
    if (error) throw error;
    return (data ?? []) as any[];
  } catch (err) {
    throw new Error(`Failed to load polls by hour: ${String(err)}`);
  }
}

export async function getPollsWithoutMerkleRoot(beforeTime: string): Promise<any[]> {
  try {
    const { data, error } = await supabaseServer
      .from("polls")
      .select("*")
      .is("merkle_root", null)
      .lt("t", beforeTime)
      .order("t", { ascending: true });
    if (error) throw error;
    return data ?? [];
  } catch (err) {
    throw new Error(`Failed to load pending polls: ${String(err)}`);
  }
}

export async function updatePollsMerkleRoot(ids: string[], root: string): Promise<void> {
  const { error } = await (supabaseServer.from("polls") as any)
    .update({ merkle_root: root })
    .in("id", ids);
  if (error) throw error;
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
    if (error) throw error;
    return data as DbIncident[];
  } catch (err) {
    throw new Error(`Failed to load incidents: ${String(err)}`);
  }
}

export async function getIncidentById(id: string): Promise<DbIncident | null> {
  try {
    const { data, error } = await supabaseServer
      .from("incidents")
      .select("*")
      .eq("id", id)
      .single();
    if (error || !data) return null;
    return data as DbIncident;
  } catch (err) {
    throw new Error(`Failed to load incident: ${String(err)}`);
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
      .limit(500);
    if (error) throw error;

    const latest = new Map<string, DbScore>();
    for (const row of (data ?? []) as DbScore[]) {
      if (!latest.has(row.provider_id)) {
        latest.set(row.provider_id, row);
      }
    }
    return [...latest.values()].sort((a, b) => b.score - a.score);
  } catch (err) {
    throw new Error(`Failed to load latest scores: ${String(err)}`);
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
    if (error) throw error;
    return ((data ?? []) as DbScore[]).reverse();
  } catch (err) {
    throw new Error(`Failed to load score history: ${String(err)}`);
  }
}

export async function getProvidersWithRecentIncidents(): Promise<Set<string>> {
  const thirtyMinAgo = new Date(Date.now() - 30 * 60 * 1000).toISOString();
  try {
    const { data, error } = await supabaseServer
      .from("incidents")
      .select("provider_id")
      .gte("t", thirtyMinAgo)
      .in("kind", ["CENSORING", "DEVIANT", "STALE"]);
    if (error) throw error;
    return new Set<string>(data.map((row: any) => row.provider_id));
  } catch (err) {
    throw new Error(`Failed to load recent incidents: ${String(err)}`);
  }
}
