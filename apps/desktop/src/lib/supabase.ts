import { createClient } from '@supabase/supabase-js';

const supabaseUrl = (import.meta as any).env?.VITE_SUPABASE_URL as string;
const supabaseKey = (import.meta as any).env?.VITE_SUPABASE_KEY as string;

if (!supabaseUrl || !supabaseKey) {
  console.warn('Supabase credentials not found. Dashboard will show limited data.');
}

export const supabase = supabaseUrl && supabaseKey 
  ? createClient(supabaseUrl, supabaseKey)
  : null;

export type SessionRecord = {
  id: string;
  session_key: string;
  start_time: string;
  end_time: string;
  duration_seconds: number;
  type: 'session_started' | 'session_updated' | 'session_ended';
  url?: string;
  window_title?: string;
  created_at: string;
};
