/**
 * Session writers for persisting session data
 */

import { getSupabaseClient } from './db.js';
import type { SessionizedEvent, SessionWriter } from './types.js';
import { WriterError } from './errors.js';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

/**
 * Convert sessionized event to database payload
 */
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

/**
 * Supabase session writer implementation
 */
export class SupabaseSessionWriter implements SessionWriter {
  constructor(private supabase: SupabaseClient) {}

  async write(event: SessionizedEvent): Promise<void> {
    if (event.type !== 'session_ended') return; // Only persist finalized sessions
    if (!event.duration_seconds || event.duration_seconds <= 0) return; // Skip zero duration sessions

    try {
      const payload = toCreatePayload(event);
      const { data, error } = await this.supabase
        .from('sessions')
        .insert(payload)
        .select('id')
        .single();

      if (error) {
        console.error('[SupabaseSessionWriter] Insert error:', {
          message: error.message,
          details: (error as any).details,
          code: (error as any).code,
          hint: (error as any).hint,
        });
        throw new WriterError(`Failed to insert session: ${error.message}`, error);
      }

      if (data?.id) {
        console.log('[SupabaseSessionWriter] Session inserted:', data.id);
      }
    } catch (error) {
      if (error instanceof WriterError) {
        throw error;
      }
      throw new WriterError('Unexpected error during session write', error as Error);
    }
  }
}

/**
 * Create session writer with default Supabase client
 */
export async function createSupabaseWriter(): Promise<SessionWriter> {
  const supabase = getSupabaseClient();
  return new SupabaseSessionWriter(supabase);
}

/**
 * Create session writer with custom Supabase configuration
 */
export function createSupabaseWriterWithConfig(config: { url: string; key: string }): SessionWriter {
  const supabase = createClient(config.url, config.key, { auth: { persistSession: false } });
  return new SupabaseSessionWriter(supabase);
}

/**
 * Console-only session writer for debugging
 */
export class ConsoleSessionWriter implements SessionWriter {
  async write(event: SessionizedEvent): Promise<void> {
    console.log('[ConsoleSessionWriter]', {
      type: event.type,
      session_key: event.session_key,
      duration: `${event.duration_seconds}s`,
      is_idle: event.is_idle,
      timestamp: new Date().toISOString()
    });
  }
}

/**
 * No-op session writer for testing
 */
export class NoOpSessionWriter implements SessionWriter {
  async write(_event: SessionizedEvent): Promise<void> {
    // Do nothing
  }
}

/**
 * Multi-writer that writes to multiple writers
 */
export class MultiSessionWriter implements SessionWriter {
  constructor(private writers: SessionWriter[]) {}

  async write(event: SessionizedEvent): Promise<void> {
    const promises = this.writers.map(async (writer) => {
      try {
        await writer.write(event);
      } catch (error) {
        console.error('[MultiSessionWriter] Writer error:', error);
        // Continue with other writers even if one fails
      }
    });

    await Promise.allSettled(promises);
  }

  addWriter(writer: SessionWriter): void {
    this.writers.push(writer);
  }

  removeWriter(writer: SessionWriter): void {
    this.writers = this.writers.filter(w => w !== writer);
  }
}

// Legacy exports for backward compatibility
export async function insertSession(e: SessionizedEvent) {
  const writer = await createSupabaseWriter();
  await writer.write(e);
}

export function createInsertSessionWithConfig(config: { url: string; key: string }) {
  const writer = createSupabaseWriterWithConfig(config);
  return async function insert(e: SessionizedEvent) {
    await writer.write(e);
  };
}


