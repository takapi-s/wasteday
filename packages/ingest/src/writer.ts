import { getSupabaseClient } from './db.js';
import type { SessionizedEvent } from './index.js';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

function toCreatePayload(e: SessionizedEvent) {
  return {
    session_key: e.session_key,
    start_time: e.start_time,
    end_time: e.end_time,
    duration_seconds: e.duration_seconds,
    is_idle: e.is_idle,
    is_media_playing: e.is_media_playing,
    window_title: e.window_title,
    url: e.url,
  };
}

export async function insertSession(e: SessionizedEvent) {
  if (e.type !== 'session_ended') return; // まずは確定セッションのみ保存
  if (!e.duration_seconds || e.duration_seconds <= 0) return; // 0秒以下は保存しない
  const supabase = getSupabaseClient();
  const payload = toCreatePayload(e);
  const { data, error } = await supabase
    .from('sessions')
    .insert(payload)
    .select('id')
    .single();
  if (error) {
    // 失敗時に詳細を出力（コンソール）
    // eslint-disable-next-line no-console
    console.error('[ingest][insertSession][supabase-error]', {
      message: error.message,
      details: (error as any).details,
      code: (error as any).code,
      hint: (error as any).hint,
    });
    throw error;
  }
  if (data?.id) {
    // 明示ログ
    // eslint-disable-next-line no-console
    console.log('[ingest][inserted]', data.id);
  }
}


export function createInsertSessionWithConfig(config: { url: string; key: string }) {
  let client: SupabaseClient | null = null;
  function getClient() {
    if (client) return client;
    client = createClient(config.url, config.key, { auth: { persistSession: false } });
    return client;
  }
  return async function insert(e: SessionizedEvent) {
    if (e.type !== 'session_ended') return;
    if (!e.duration_seconds || e.duration_seconds <= 0) return; // 0秒以下は保存しない
    const supabase = getClient();
    const payload = toCreatePayload(e);
    const { data, error } = await supabase
      .from('sessions')
      .insert(payload)
      .select('id')
      .single();
    if (error) throw error;
    if (data?.id) console.log('[ingest][inserted]', data.id);
  };
}


