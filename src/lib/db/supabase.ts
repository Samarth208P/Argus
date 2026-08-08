import { createClient } from "@supabase/supabase-js";
import { Database } from "./types";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

export const isSupabaseConfigured = !!(supabaseUrl && (supabaseAnonKey || supabaseServiceKey));

// Public client
export const supabase = createClient<Database>(
  supabaseUrl,
  supabaseAnonKey || supabaseServiceKey
);

// Admin client for server-side writes that bypass RLS
export const supabaseAdmin = createClient<Database>(
  supabaseUrl,
  supabaseServiceKey || supabaseAnonKey
);
