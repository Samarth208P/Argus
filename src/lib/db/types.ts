// ============================================================
// Supabase Database Types (hand-rolled for now, replace with
// `npx supabase gen types typescript` after DB is set up)
// ============================================================

export type IncidentKind = "DEVIANT" | "STALE" | "CENSORING" | "DOWN";
export type TrendKind = "IMPROVING" | "DEGRADING" | "STABLE";
export type NetworkKind = "mainnet" | "sepolia";
export type ProviderTypeKind = "node" | "aggregator" | "relay" | "send";

export interface DbProvider {
  id: string;
  url: string;
  label: string;
  operator: string;
  type: ProviderTypeKind;
  is_sim: boolean;
  network: NetworkKind;
  created_at: string;
}

export interface DbPoll {
  id: string;
  t: string;
  battery: unknown;
  pinned_block_hex: string;
  consensus_hash: string | null;
  merkle_root: string | null;
  status: string;
}

export interface DbIncident {
  id: string;
  t: string;
  provider_id: string;
  kind: IncidentKind;
  poll_id: string | null;
  request: unknown;
  expected: string | null;
  got: string | null;
  receipts: unknown;
}

export interface DbScore {
  id: string;
  t: string;
  provider_id: string;
  score: number;
  accuracy: number;
  uptime: number;
  latency_avg: number;
  freshness_score: number;
  trend: TrendKind;
}

export interface Database {
  public: {
    Tables: {
      providers: { Row: DbProvider; Insert: Omit<DbProvider, "created_at">; Update: Partial<DbProvider> };
      polls: { Row: DbPoll; Insert: Omit<DbPoll, "id" | "t">; Update: Partial<DbPoll> };
      incidents: { Row: DbIncident; Insert: Omit<DbIncident, "id" | "t"> & { id?: string; t?: string }; Update: Partial<DbIncident> };
      scores: { Row: DbScore; Insert: Omit<DbScore, "id" | "t"> & { id?: string; t?: string }; Update: Partial<DbScore> };
    };
  };
}
