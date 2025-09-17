import { getSupabaseClient } from './db.js';
import type { SessionizedEvent } from './index.js';

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
  const supabase = getSupabaseClient();
  const payload = toCreatePayload(e);
  const { data, error } = await supabase
    .from('sessions')
    .insert(payload)
    .select('id')
    .single();
  if (error) throw error;
  if (data?.id) {
    // 明示ログ
    // eslint-disable-next-line no-console
    console.log('[ingest][inserted]', data.id);
  }
}


