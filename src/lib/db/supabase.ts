// ============================================================
// Supabase Client — Server + Browser variants
// Server: uses service role key (in API routes / RSC)
// Browser: uses anon key (in client components for Realtime)
// ============================================================

import { createClient } from "@supabase/supabase-js";
import type { Database } from "./types";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "https://placeholder.supabase.co";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "placeholder";
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

// ── Browser client (anon key, safe to expose) ─────────────
// Used in Client Components for Supabase Realtime subscriptions
export const supabaseBrowser = createClient<Database>(
  supabaseUrl,
  supabaseAnonKey
);

// ── Server client (service key if available, anon fallback) ─
// Used in API routes and Server Components for writes
export const supabaseServer = createClient<Database>(
  supabaseUrl,
  supabaseServiceKey ?? supabaseAnonKey,
  {
    auth: { persistSession: false },
  }
);
