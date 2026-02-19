import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Missing Supabase environment variables — VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY');
}

// Always create the client. If env vars are missing, calls will fail gracefully at runtime
// but TypeScript won't block compilation with null-check errors.
export const supabase: SupabaseClient = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseAnonKey || 'placeholder-key'
);

export const supabaseReady = !!(supabaseUrl && supabaseAnonKey);

/**
 * Safe accessor — use in hooks/components that need supabase.
 * Returns null if not initialized (lets caller handle gracefully).
 */
export function getSupabase(): SupabaseClient | null {
  return supabaseReady ? supabase : null;
}

export const DEMO_TENANT_ID = '00000000-0000-0000-0000-000000000001';
