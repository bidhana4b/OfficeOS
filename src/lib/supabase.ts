import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  // In Tempo canvases/storyboards this can be surfaced as a generic "Script error".
  // Keep the app running so non-Supabase screens can render.
  // Supabase-dependent features should handle a null client.
  // eslint-disable-next-line no-console
  console.warn('Missing Supabase environment variables');
}

export const supabase = supabaseUrl && supabaseAnonKey ? createClient(supabaseUrl, supabaseAnonKey) : null;

export const DEMO_TENANT_ID = '00000000-0000-0000-0000-000000000001';
