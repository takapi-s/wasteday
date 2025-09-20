/**
 * Type definitions for @wasteday/ingest package
 */

/**
 * User activity state
 */
export type UserState = 'active' | 'idle';

/**
 * Sample event representing a single data point from system monitoring
 */
export interface SampleEvent {
  timestamp: string; // ISO8601
  category: 'app' | 'browser' | 'system';
  identifier: string; // exe名 or domain
  window_title?: string;
  url?: string;
  user_state: UserState;
  is_media_playing?: boolean;
}

/**
 * Sessionized event representing a processed session
 */
export interface SessionizedEvent {
  type: 'session_started' | 'session_updated' | 'session_ended';
  session_key: string; // {category,identifier,user_state}
  start_time: string;
  end_time: string;
  duration_seconds: number;
  is_idle: boolean;
  is_media_playing: boolean;
  window_title?: string;
  url?: string;
}

/**
 * Configuration options for the ingest service
 */
export interface IngestOptions {
  samplingIntervalMs?: number; // default 5000
  idleGapThresholdSeconds?: number; // default 20
  sessionSwitchGracePeriodSeconds?: number; // default 10 - アプリ切り替え時の猶予期間
}

/**
 * Internal representation of an open session
 */
export interface OpenSession {
  session_key: string;
  start_time: string;
  last_time: string;
  is_idle: boolean;
  is_media_playing: boolean;
  window_title?: string;
  url?: string;
  last_sample?: SampleEvent;
}

/**
 * Session key components parsed from session_key string
 */
export interface SessionKeyComponents {
  category: 'app' | 'browser' | 'system';
  identifier: string;
  user_state: 'active' | 'idle';
}

/**
 * Event listener function type
 */
export type SessionEventListener = (event: SessionizedEvent) => void | Promise<void>;

/**
 * Event listener unsubscribe function
 */
export type UnsubscribeFunction = () => void;

/**
 * Session writer interface for persisting sessions
 */
export interface SessionWriter {
  write(event: SessionizedEvent): Promise<void>;
}

/**
 * Ingest service statistics
 */
export interface IngestStats {
  totalSamplesProcessed: number;
  totalSessionsStarted: number;
  totalSessionsEnded: number;
  openSessionsCount: number;
  lastProcessedSampleTime?: string;
}
