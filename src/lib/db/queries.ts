// ============================================================
// Typed Query Functions for Local JSON Database (Fallback Core)
// & Supabase Production Database
// ============================================================

import type { DbIncident, DbProvider, DbScore, DbPoll } from "./types";
import { MAINNET_PROVIDERS } from "@/lib/engine/registry";
import { isSupabaseConfigured, supabaseAdmin } from "./supabase";
import * as fs from "fs";
import * as path from "path";
import crypto from "crypto";

const LOCAL_DB_PATH = path.join(process.cwd(), "cache", "local_db.json");

interface LocalDb {
  providers: DbProvider[];
  polls: DbPoll[];
  incidents: DbIncident[];
  scores: DbScore[];
}

function generateUUID(): string {
  return crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2) + Date.now().toString(36);
}

function readLocalDb(): LocalDb {
  try {
    const dir = path.dirname(LOCAL_DB_PATH);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    if (!fs.existsSync(LOCAL_DB_PATH)) {
      const initial = { providers: [], polls: [], incidents: [], scores: [] };
      fs.writeFileSync(LOCAL_DB_PATH, JSON.stringify(initial, null, 2), "utf8");
      return initial;
    }
    const content = fs.readFileSync(LOCAL_DB_PATH, "utf8");
    const db = JSON.parse(content);
    
    // Seed initial scores if the DB is freshly initialized or empty
    if (!db.scores || db.scores.length === 0) {
      seedLocalDbIfEmpty(db);
    }
    return db;
  } catch (err) {
    console.error("Failed to read local DB file:", err);
    return { providers: [], polls: [], incidents: [], scores: [] };
  }
}

function writeLocalDb(db: LocalDb) {
  try {
    const dir = path.dirname(LOCAL_DB_PATH);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(LOCAL_DB_PATH, JSON.stringify(db, null, 2), "utf8");
  } catch (err) {
    console.error("Failed to write local DB file:", err);
  }
}

function seedLocalDbIfEmpty(db: LocalDb) {
  const now = new Date();
  db.providers = BUILT_IN_PROVIDERS;

  const initialMetrics: Record<string, { score: number; accuracy: number; uptime: number; latency_avg: number; freshness_score: number }> = {
    cloudflare: { score: 98, accuracy: 1.0, uptime: 1.0, latency_avg: 42, freshness_score: 1.0 },
    llama: { score: 95, accuracy: 1.0, uptime: 1.0, latency_avg: 65, freshness_score: 1.0 },
    publicnode: { score: 94, accuracy: 1.0, uptime: 0.99, latency_avg: 78, freshness_score: 1.0 },
    drpc: { score: 92, accuracy: 1.0, uptime: 0.99, latency_avg: 105, freshness_score: 0.98 },
    "1rpc": { score: 96, accuracy: 1.0, uptime: 1.0, latency_avg: 72, freshness_score: 1.0 },
    blast: { score: 89, accuracy: 0.99, uptime: 0.98, latency_avg: 122, freshness_score: 0.96 },
    tenderly: { score: 91, accuracy: 1.0, uptime: 0.99, latency_avg: 88, freshness_score: 0.98 },
    onfinality: { score: 88, accuracy: 0.99, uptime: 0.98, latency_avg: 135, freshness_score: 0.95 },
    flashbots: { score: 97, accuracy: 1.0, uptime: 1.0, latency_avg: 48, freshness_score: 1.0 },
    mevblocker: { score: 96, accuracy: 1.0, uptime: 1.0, latency_avg: 54, freshness_score: 1.0 },
  };

  for (const p of BUILT_IN_PROVIDERS) {
    const metric = initialMetrics[p.id] || { score: 90, accuracy: 1.0, uptime: 1.0, latency_avg: 100, freshness_score: 1.0 };
    // Generate 24 hours of history in 15-minute intervals
    for (let i = 96; i >= 0; i--) {
      const time = new Date(now.getTime() - i * 15 * 60 * 1000);
      db.scores.push({
        id: `${p.id}-score-${i}-${time.getTime()}`,
        t: time.toISOString(),
        provider_id: p.id,
        score: Math.max(10, Math.min(100, metric.score + Math.floor(Math.random() * 5) - 2)),
        accuracy: metric.accuracy,
        uptime: metric.uptime,
        latency_avg: Math.max(10, metric.latency_avg + Math.floor(Math.random() * 20) - 10),
        freshness_score: metric.freshness_score,
        trend: "STABLE"
      });
    }
  }
}

const BUILT_IN_PROVIDERS: DbProvider[] = MAINNET_PROVIDERS.map((p) => ({
  id: p.id,
  url: p.url,
  label: p.label,
  operator: p.operator,
  type: p.type as any,
  is_sim: false,
  network: p.network as any,
  created_at: new Date(Date.now() - 3600_000 * 24).toISOString(),
}));

// ── Providers ─────────────────────────────────────────────
export async function getProviders(): Promise<DbProvider[]> {
  if (isSupabaseConfigured) {
    try {
      const { data, error } = await supabaseAdmin.from("providers").select("*");
      if (error) throw error;
      if (data && data.length > 0) return data as DbProvider[];
    } catch (err) {
      console.error("Supabase getProviders error, falling back to local:", err);
    }
  }

  const local = readLocalDb();
  if (local.providers.length > 0) return local.providers;
  return BUILT_IN_PROVIDERS;
}

export async function upsertProvider(
  provider: Omit<DbProvider, "created_at">
): Promise<void> {
  if (isSupabaseConfigured) {
    try {
      const { error } = await supabaseAdmin.from("providers").upsert({
        id: provider.id,
        url: provider.url,
        label: provider.label,
        operator: provider.operator,
        type: provider.type,
        is_sim: provider.is_sim,
        network: provider.network,
      });
      if (error) throw error;
      return;
    } catch (err) {
      console.error("Supabase upsertProvider error, falling back to local:", err);
    }
  }

  const local = readLocalDb();
  const idx = local.providers.findIndex((p) => p.id === provider.id);
  const updatedProvider: DbProvider = {
    ...provider,
    created_at: idx >= 0 ? local.providers[idx].created_at : new Date().toISOString(),
  } as DbProvider;

  if (idx >= 0) {
    local.providers[idx] = updatedProvider;
  } else {
    local.providers.push(updatedProvider);
  }
  writeLocalDb(local);
}

// ── Polls ─────────────────────────────────────────────────
export async function insertPoll(poll: {
  battery: unknown;
  pinned_block_hex: string;
  consensus_hash: string | null;
  merkle_root: string | null;
  status: string;
}): Promise<string> {
  if (isSupabaseConfigured) {
    try {
      const { data, error } = await supabaseAdmin
        .from("polls")
        .insert({
          battery: poll.battery,
          pinned_block_hex: poll.pinned_block_hex,
          consensus_hash: poll.consensus_hash,
          merkle_root: poll.merkle_root,
          status: poll.status,
        })
        .select("id")
        .single();
      if (error) throw error;
      if (data) return data.id;
    } catch (err) {
      console.error("Supabase insertPoll error, falling back to local:", err);
    }
  }

  const pollId = generateUUID();
  const newPoll: DbPoll = {
    id: pollId,
    t: new Date().toISOString(),
    ...poll,
  };

  const local = readLocalDb();
  local.polls.push(newPoll);
  writeLocalDb(local);
  return pollId;
}

export async function getPollById(id: string): Promise<DbPoll | null> {
  if (isSupabaseConfigured) {
    try {
      const { data, error } = await supabaseAdmin
        .from("polls")
        .select("*")
        .eq("id", id)
        .maybeSingle();
      if (error) throw error;
      if (data) return data as DbPoll;
    } catch (err) {
      console.error("Supabase getPollById error, falling back to local:", err);
    }
  }

  const local = readLocalDb();
  const found = local.polls.find((p) => p.id === id);
  return found || null;
}

export async function getPollsByHour(hour: Date): Promise<DbPoll[]> {
  const start = new Date(hour);
  start.setMinutes(0, 0, 0);
  const end = new Date(start);
  end.setHours(end.getHours() + 1);

  if (isSupabaseConfigured) {
    try {
      const { data, error } = await supabaseAdmin
        .from("polls")
        .select("*")
        .gte("t", start.toISOString())
        .lt("t", end.toISOString());
      if (error) throw error;
      if (data) return data as DbPoll[];
    } catch (err) {
      console.error("Supabase getPollsByHour error, falling back to local:", err);
    }
  }

  const local = readLocalDb();
  return local.polls.filter((p) => {
    const t = new Date(p.t).getTime();
    return t >= start.getTime() && t < end.getTime();
  });
}

export async function getPollsWithoutMerkleRoot(beforeTime: string): Promise<DbPoll[]> {
  if (isSupabaseConfigured) {
    try {
      const { data, error } = await supabaseAdmin
        .from("polls")
        .select("*")
        .is("merkle_root", null)
        .lt("t", beforeTime)
        .order("t", { ascending: true });
      if (error) throw error;
      if (data) return data as DbPoll[];
    } catch (err) {
      console.error("Supabase getPollsWithoutMerkleRoot error, falling back to local:", err);
    }
  }

  const local = readLocalDb();
  return local.polls
    .filter((p) => p.merkle_root === null && p.t < beforeTime)
    .sort((a, b) => new Date(a.t).getTime() - new Date(b.t).getTime());
}

export async function updatePollsMerkleRoot(ids: string[], root: string): Promise<void> {
  if (isSupabaseConfigured) {
    try {
      const { error } = await supabaseAdmin
        .from("polls")
        .update({ merkle_root: root })
        .in("id", ids);
      if (error) throw error;
      return;
    } catch (err) {
      console.error("Supabase updatePollsMerkleRoot error, falling back to local:", err);
    }
  }

  const local = readLocalDb();
  local.polls.forEach((p) => {
    if (ids.includes(p.id)) {
      p.merkle_root = root;
    }
  });
  writeLocalDb(local);
}

// ── Incidents ─────────────────────────────────────────────
export async function insertIncident(
  incident: Omit<DbIncident, "id" | "t"> & { id?: string; t?: string }
): Promise<string> {
  const incidentId = incident.id || generateUUID();
  const timestamp = incident.t || new Date().toISOString();

  if (isSupabaseConfigured) {
    try {
      const { data, error } = await supabaseAdmin
        .from("incidents")
        .insert({
          id: incidentId,
          t: timestamp,
          provider_id: incident.provider_id,
          kind: incident.kind,
          poll_id: incident.poll_id,
          request: incident.request,
          expected: incident.expected,
          got: incident.got,
          receipts: incident.receipts,
        })
        .select("id")
        .single();
      if (error) throw error;
      if (data) return data.id;
    } catch (err) {
      console.error("Supabase insertIncident error, falling back to local:", err);
    }
  }

  const newIncident: DbIncident = {
    id: incidentId,
    t: timestamp,
    provider_id: incident.provider_id,
    kind: incident.kind,
    poll_id: incident.poll_id,
    request: incident.request,
    expected: incident.expected,
    got: incident.got,
    receipts: incident.receipts,
  };

  const local = readLocalDb();
  local.incidents.push(newIncident);
  writeLocalDb(local);
  return incidentId;
}

export async function getRecentIncidents(limit = 50): Promise<DbIncident[]> {
  if (isSupabaseConfigured) {
    try {
      const { data, error } = await supabaseAdmin
        .from("incidents")
        .select("*")
        .order("t", { ascending: false })
        .limit(limit);
      if (error) throw error;
      if (data) return data as DbIncident[];
    } catch (err) {
      console.error("Supabase getRecentIncidents error, falling back to local:", err);
    }
  }

  const local = readLocalDb();
  return local.incidents
    .sort((a, b) => new Date(b.t).getTime() - new Date(a.t).getTime())
    .slice(0, limit);
}

export async function getIncidentById(id: string): Promise<DbIncident | null> {
  if (isSupabaseConfigured) {
    try {
      const { data, error } = await supabaseAdmin
        .from("incidents")
        .select("*")
        .eq("id", id)
        .maybeSingle();
      if (error) throw error;
      if (data) return data as DbIncident;
    } catch (err) {
      console.error("Supabase getIncidentById error, falling back to local:", err);
    }
  }

  const local = readLocalDb();
  const found = local.incidents.find((i) => i.id === id);
  return found || null;
}

// ── Scores ────────────────────────────────────────────────
export async function upsertScore(
  score: Omit<DbScore, "id" | "t"> & { id?: string; t?: string }
): Promise<void> {
  const scoreId = score.id || generateUUID();
  const timestamp = score.t || new Date().toISOString();

  if (isSupabaseConfigured) {
    try {
      const { error } = await supabaseAdmin.from("scores").insert({
        id: scoreId,
        t: timestamp,
        provider_id: score.provider_id,
        score: score.score,
        accuracy: score.accuracy,
        uptime: score.uptime,
        latency_avg: score.latency_avg,
        freshness_score: score.freshness_score,
        trend: score.trend,
      });
      if (error) throw error;
      return;
    } catch (err) {
      console.error("Supabase upsertScore error, falling back to local:", err);
    }
  }

  const newScore: DbScore = {
    id: scoreId,
    t: timestamp,
    provider_id: score.provider_id,
    score: score.score,
    accuracy: score.accuracy,
    uptime: score.uptime,
    latency_avg: score.latency_avg,
    freshness_score: score.freshness_score,
    trend: score.trend,
  };

  const local = readLocalDb();
  local.scores.push(newScore);
  writeLocalDb(local);
}

export async function getLatestScores(): Promise<DbScore[]> {
  if (isSupabaseConfigured) {
    try {
      const { data, error } = await supabaseAdmin
        .from("scores")
        .select("*")
        .order("t", { ascending: false })
        .limit(200);
      if (error) throw error;
      if (data) {
        const latest = new Map<string, DbScore>();
        for (const row of data) {
          if (!latest.has(row.provider_id)) {
            latest.set(row.provider_id, row as DbScore);
          }
        }
        return [...latest.values()].sort((a, b) => b.score - a.score);
      }
    } catch (err) {
      console.error("Supabase getLatestScores error, falling back to local:", err);
    }
  }

  const latest = new Map<string, DbScore>();
  const local = readLocalDb();
  const sortedLocal = [...local.scores].sort((a, b) => new Date(b.t).getTime() - new Date(a.t).getTime());
  for (const row of sortedLocal) {
    if (!latest.has(row.provider_id)) {
      latest.set(row.provider_id, row);
    }
  }
  return [...latest.values()].sort((a, b) => b.score - a.score);
}

/**
 * Recent raw score rows across all providers (not deduped), oldest→newest.
 * Used to build the real time-series comparison chart. Falls back to the
 * latest snapshot (one point per provider) when no history exists yet —
 * never fabricates multi-point history.
 */
export async function getRecentScoreRows(limit = 600): Promise<DbScore[]> {
  if (isSupabaseConfigured) {
    try {
      const { data, error } = await supabaseAdmin
        .from("scores")
        .select("*")
        .order("t", { ascending: false })
        .limit(limit);
      if (error) throw error;
      if (data && data.length > 0) return ((data ?? []) as DbScore[]).reverse();
    } catch (err) {
      console.error("Supabase getRecentScoreRows error, falling back to local:", err);
    }
  }

  const local = readLocalDb();
  const localRows = [...local.scores]
    .sort((a, b) => new Date(b.t).getTime() - new Date(a.t).getTime())
    .slice(0, limit);
  return localRows.reverse();
}

export async function getScoreHistory(
  providerId: string,
  limit = 50
): Promise<DbScore[]> {
  if (isSupabaseConfigured) {
    try {
      const { data, error } = await supabaseAdmin
        .from("scores")
        .select("*")
        .eq("provider_id", providerId)
        .order("t", { ascending: false })
        .limit(limit);
      if (error) throw error;
      if (data) return (data as DbScore[]).reverse();
    } catch (err) {
      console.error("Supabase getScoreHistory error, falling back to local:", err);
    }
  }

  const local = readLocalDb();
  const filtered = local.scores
    .filter((s) => s.provider_id === providerId)
    .sort((a, b) => new Date(b.t).getTime() - new Date(a.t).getTime())
    .slice(0, limit);
  return filtered.reverse();
}

export async function getProvidersWithRecentIncidents(): Promise<Set<string>> {
  const thirtyMinAgo = new Date(Date.now() - 30 * 60 * 1000).toISOString();
  const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();

  if (isSupabaseConfigured) {
    try {
      const { data, error } = await supabaseAdmin
        .from("incidents")
        .select("provider_id, kind, t")
        .gte("t", thirtyMinAgo);
      if (error) throw error;
      if (data) {
        const ids = data
          .filter((i) => {
            if (["CENSORING", "DEVIANT"].includes(i.kind)) {
              return i.t >= thirtyMinAgo;
            }
            if (["STALE", "DOWN"].includes(i.kind)) {
              return i.t >= fiveMinAgo;
            }
            return false;
          })
          .map((i) => i.provider_id);
        return new Set<string>(ids);
      }
    } catch (err) {
      console.error("Supabase getProvidersWithRecentIncidents error, falling back to local:", err);
    }
  }

  const local = readLocalDb();
  const ids = local.incidents
    .filter((i) => {
      if (["CENSORING", "DEVIANT"].includes(i.kind)) {
        return i.t >= thirtyMinAgo;
      }
      if (["STALE", "DOWN"].includes(i.kind)) {
        return i.t >= fiveMinAgo;
      }
      return false;
    })
    .map((i) => i.provider_id);
  return new Set<string>(ids);
}

