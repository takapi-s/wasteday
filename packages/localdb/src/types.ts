/**
 * Type definitions for LocalDB package
 */

export type IsoTimestamp = string; // ISO8601 string

/**
 * Session entity representing a user activity session
 */
export interface Session {
  id: string;
  start_time: IsoTimestamp;
  duration_seconds: number;
  session_key: string;
  created_at?: IsoTimestamp;
  updated_at?: IsoTimestamp;
}

/**
 * Waste category for classifying applications and websites
 */
export interface WasteCategory {
  id?: number;
  type: 'app' | 'url' | 'system';
  identifier: string;
  label: 'waste' | 'productive';
  is_active: boolean;
  created_at?: IsoTimestamp;
  updated_at?: IsoTimestamp;
}

/**
 * User settings key-value pair stored in database
 */
export interface UserSettingsKV {
  key: string;
  value: string;
  updated_at?: IsoTimestamp;
}

/**
 * User settings interface
 */
export interface UserSettings {
  goalDailyWasteSeconds?: number;
}

/**
 * Query parameters for session retrieval
 */
export interface SessionQueryParams {
  since?: IsoTimestamp;
  until?: IsoTimestamp;
  limit?: number;
  offset?: number;
}

/**
 * Session key components parsed from session_key string
 */
export interface SessionKeyComponents {
  category: 'app' | 'browser' | 'system';
  identifier: string;
  user_state: 'active' | 'idle';
  window_title?: string;
  url?: string;
}

/**
 * Repository operation result
 */
export interface RepositoryResult<T> {
  data?: T;
  error?: string;
  success: boolean;
}

