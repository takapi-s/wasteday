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
  sessionSwitchGracePeriodSeconds?: number; // default 10 - アプリ切り替え時の猶予期間
}

const DEFAULT_SAMPLING_MS = 5000;
const DEFAULT_GAP_SECONDS = 20;
const DEFAULT_SWITCH_GRACE_SECONDS = 10;

interface OpenSession {
  session_key: string;
  start_time: string;
  last_time: string;
  is_idle: boolean;
  is_media_playing: boolean;
  window_title?: string;
  url?: string;
  last_sample?: SampleEvent;
}

export class IngestService {
  private options: Required<IngestOptions>;
  private openSessions: Map<string, OpenSession> = new Map();
  private listeners: Array<(e: SessionizedEvent) => void> = [];

  constructor(options?: IngestOptions) {
    this.options = {
      samplingIntervalMs: options?.samplingIntervalMs ?? DEFAULT_SAMPLING_MS,
      idleGapThresholdSeconds: options?.idleGapThresholdSeconds ?? DEFAULT_GAP_SECONDS,
      sessionSwitchGracePeriodSeconds: options?.sessionSwitchGracePeriodSeconds ?? DEFAULT_SWITCH_GRACE_SECONDS,
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
    // ただし、猶予期間を考慮して短時間のセッションは統合する
    for (const [k, s] of Array.from(this.openSessions.entries())) {
      if (k === key) continue;
      
      const lastSampleTime = new Date(s.last_time).getTime();
      const currentTime = new Date(nowIso).getTime();
      const gapSinceLastSample = Math.floor((currentTime - lastSampleTime) / 1000);
      
      // セッション終了時刻を現在時刻に更新（より正確な計測のため）
      const endTime = nowIso;
      const totalDurationSeconds = Math.max(0, Math.floor((new Date(endTime).getTime() - new Date(s.start_time).getTime()) / 1000));
      
      // 猶予期間内で非常に短時間のセッション（サンプリング間隔未満）の場合のみ統合
      const shouldMerge = gapSinceLastSample <= this.options.sessionSwitchGracePeriodSeconds && 
                         totalDurationSeconds < (this.options.samplingIntervalMs / 1000);
      
      if (!shouldMerge) {
        this.emit({
          type: 'session_ended',
          session_key: s.session_key,
          start_time: s.start_time,
          end_time: endTime,
          duration_seconds: totalDurationSeconds,
          is_idle: s.is_idle,
          is_media_playing: s.is_media_playing,
          window_title: s.window_title,
          url: s.url,
        });
      }
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
        last_sample: sample,
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
      existing.last_sample = sample;
      
      // より正確な時間計算：開始時刻から現在時刻までの経過時間
      const startTime = new Date(existing.start_time).getTime();
      const durationSeconds = Math.max(0, Math.floor((now - startTime) / 1000));
      
      this.emit({
        type: 'session_updated',
        session_key: existing.session_key,
        start_time: existing.start_time,
        end_time: existing.last_time,
        duration_seconds: durationSeconds,
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
        last_sample: sample,
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

  getPendingInserts(): Map<string, SampleEvent> {
    const pending = new Map<string, SampleEvent>();
    for (const [key, session] of this.openSessions.entries()) {
      // 最新のサンプルを取得
      if (session.last_sample) {
        pending.set(key, session.last_sample);
      }
    }
    return pending;
  }
}


export { insertSession, createInsertSessionWithConfig } from './writer.js';


