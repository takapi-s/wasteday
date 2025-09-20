import { createClient, SupabaseClient } from '@supabase/supabase-js';

let client: SupabaseClient | null = null;

export function getSupabaseClient(): SupabaseClient {
  if (client) return client;
  
  // Check if we're in a Node.js environment
  if (typeof process === 'undefined' || !process.env) {
    throw new Error('Supabase configuration requires Node.js environment with process.env');
  }
  
  const url = process.env.SUPABASE_URL;
  const anon = process.env.SUPABASE_ANON_KEY;
  const service = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const key = service || anon;
  
  if (!url || !key) {
    throw new Error('Missing SUPABASE_URL and SUPABASE_ANON_KEY/SUPABASE_SERVICE_ROLE_KEY');
  }
  
  client = createClient(url, key, { auth: { persistSession: false } });
  return client;
}


