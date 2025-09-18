export type UserState = 'active' | 'idle';
export type SampleEvent = {
  timestamp: string; // ISO8601
  category: 'app' | 'browser' | 'system';
  identifier: string; // exe名 or domain
  window_title?: string;
  url?: string;
  user_state: UserState;
  is_media_playing?: boolean;
};

export type SessionizedEvent = {
  type: 'session_started' | 'session_updated' | 'session_ended';
  session_key: string; // {category,identifier,user_state}
  start_time: string;
  end_time: string;
  duration_seconds: number;
  is_idle: boolean;
  is_media_playing: boolean;
  window_title?: string;
  url?: string;
};

export interface IngestOptions {
  samplingIntervalMs?: number; // default 5000
  idleGapThresholdSeconds?: number; // default 20
}

const DEFAULT_SAMPLING_MS = 5000;
const DEFAULT_GAP_SECONDS = 20;

interface OpenSession {
  session_key: string;
  start_time: string;
  last_time: string;
  is_idle: boolean;
  is_media_playing: boolean;
  window_title?: string;
  url?: string;
}

export class IngestService {
  private options: Required<IngestOptions>;
  private openSessions: Map<string, OpenSession> = new Map();
  private listeners: Array<(e: SessionizedEvent) => void> = [];

  constructor(options?: IngestOptions) {
    this.options = {
      samplingIntervalMs: options?.samplingIntervalMs ?? DEFAULT_SAMPLING_MS,
      idleGapThresholdSeconds: options?.idleGapThresholdSeconds ?? DEFAULT_GAP_SECONDS,
    };
  }

  onEvent(listener: (e: SessionizedEvent) => void) {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  private emit(evt: SessionizedEvent) {
    for (const l of this.listeners) l(evt);
  }

  private static buildKey(sample: SampleEvent): string {
    const category = sample.category;
    const identifier = sample.identifier.toLowerCase();
    const user_state = sample.user_state; // already normalized
    return `category=${category};identifier=${identifier};user_state=${user_state}`;
  }

  handleSample(sample: SampleEvent) {
    const key = IngestService.buildKey(sample);
    const nowIso = sample.timestamp;
    const is_idle = sample.user_state === 'idle';

    // 新しいサンプルが来た時点で、現在キーと異なるオープンセッションは終了させる
    for (const [k, s] of Array.from(this.openSessions.entries())) {
      if (k === key) continue;
      const durationSeconds = Math.max(0, Math.floor((new Date(s.last_time).getTime() - new Date(s.start_time).getTime()) / 1000));
      this.emit({
        type: 'session_ended',
        session_key: s.session_key,
        start_time: s.start_time,
        end_time: s.last_time,
        duration_seconds: durationSeconds,
        is_idle: s.is_idle,
        is_media_playing: s.is_media_playing,
        window_title: s.window_title,
        url: s.url,
      });
      this.openSessions.delete(k);
    }

    const existing = this.openSessions.get(key);
    if (!existing) {
      const open: OpenSession = {
        session_key: key,
        start_time: nowIso,
        last_time: nowIso,
        is_idle,
        is_media_playing: Boolean(sample.is_media_playing),
        window_title: sample.window_title,
        url: sample.url,
      };
      this.openSessions.set(key, open);
      this.emit({
        type: 'session_started',
        session_key: key,
        start_time: open.start_time,
        end_time: open.last_time,
        duration_seconds: 0,
        is_idle: open.is_idle,
        is_media_playing: open.is_media_playing,
        window_title: open.window_title,
        url: open.url,
      });
      return;
    }

    const last = new Date(existing.last_time).getTime();
    const now = new Date(nowIso).getTime();
    const gapSeconds = Math.floor((now - last) / 1000);

    if (gapSeconds <= this.options.idleGapThresholdSeconds) {
      existing.last_time = nowIso;
      existing.is_media_playing = existing.is_media_playing || Boolean(sample.is_media_playing);
      if (sample.window_title) existing.window_title = sample.window_title;
      if (sample.url) existing.url = sample.url;
      this.emit({
        type: 'session_updated',
        session_key: existing.session_key,
        start_time: existing.start_time,
        end_time: existing.last_time,
        duration_seconds: Math.max(0, Math.floor((now - new Date(existing.start_time).getTime()) / 1000)),
        is_idle: existing.is_idle,
        is_media_playing: existing.is_media_playing,
        window_title: existing.window_title,
        url: existing.url,
      });
    } else {
      // close existing
      const end = existing.last_time;
      const durationSeconds = Math.max(0, Math.floor((new Date(end).getTime() - new Date(existing.start_time).getTime()) / 1000));
      this.emit({
        type: 'session_ended',
        session_key: existing.session_key,
        start_time: existing.start_time,
        end_time: end,
        duration_seconds: durationSeconds,
        is_idle: existing.is_idle,
        is_media_playing: existing.is_media_playing,
        window_title: existing.window_title,
        url: existing.url,
      });
      this.openSessions.delete(key);
      // start new
      const open: OpenSession = {
        session_key: key,
        start_time: nowIso,
        last_time: nowIso,
        is_idle,
        is_media_playing: Boolean(sample.is_media_playing),
        window_title: sample.window_title,
        url: sample.url,
      };
      this.openSessions.set(key, open);
      this.emit({
        type: 'session_started',
        session_key: key,
        start_time: open.start_time,
        end_time: open.last_time,
        duration_seconds: 0,
        is_idle: open.is_idle,
        is_media_playing: open.is_media_playing,
        window_title: open.window_title,
        url: open.url,
      });
    }
  }

  flushAll() {
    const now = new Date();
    for (const [key, s] of Array.from(this.openSessions.entries())) {
      const durationSeconds = Math.max(0, Math.floor((new Date(s.last_time).getTime() - new Date(s.start_time).getTime()) / 1000));
      this.emit({
        type: 'session_ended',
        session_key: key,
        start_time: s.start_time,
        end_time: s.last_time,
        duration_seconds: durationSeconds,
        is_idle: s.is_idle,
        is_media_playing: s.is_media_playing,
        window_title: s.window_title,
        url: s.url,
      });
      this.openSessions.delete(key);
    }
  }
}


export { insertSession, createInsertSessionWithConfig } from './writer.js';


