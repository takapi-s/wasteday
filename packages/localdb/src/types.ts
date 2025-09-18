export type IsoTimestamp = string; // ISO8601 string

export interface Session {
  id: string;
  start_time: IsoTimestamp;
  duration_seconds: number;
  session_key: string;
  created_at?: IsoTimestamp;
  updated_at?: IsoTimestamp;
}

export interface WasteCategory {
  id?: number;
  type: string;
  identifier: string;
  label: 'waste' | 'productive';
  is_active: boolean;
  created_at?: IsoTimestamp;
  updated_at?: IsoTimestamp;
}

export interface UserSettingsKV {
  key: string;
  value: string;
  updated_at?: IsoTimestamp;
}

export interface UserSettings {
  goalDailyWasteSeconds?: number;
}

