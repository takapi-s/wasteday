// データベース型定義
// 要件定義に基づくエンティティの型定義

export type WasteCategoryType = 'app' | 'domain';
export type WasteLabel = 'waste' | 'neutral' | 'study';
export type ExclusionRuleType = 'path' | 'query' | 'channel_id' | 'regex';

// 浪費カテゴリ
export interface WasteCategory {
  id: string;
  name: string;
  type: WasteCategoryType;
  identifier: string; // exe名またはドメイン
  label: WasteLabel;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// 除外ルール
export interface ExclusionRule {
  id: string;
  category_id: string;
  rule_type: ExclusionRuleType;
  pattern: string;
  description?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// セッション（アプリ/ドメインの使用記録）
export interface Session {
  id: string;
  category_id?: string;
  session_key: string; // {category, identifier, user_state}
  start_time: string;
  end_time: string;
  duration_seconds: number;
  is_idle: boolean;
  is_media_playing: boolean; // 動画・音声再生中
  window_title?: string;
  url?: string; // ブラウザの場合
  created_at: string;
}

// ユーザー設定
export interface UserSetting {
  id: string;
  key: string;
  value: any; // JSONB
  description?: string;
  created_at: string;
  updated_at: string;
}

// 日次集計
export interface DailySummary {
  id: string;
  date: string; // YYYY-MM-DD
  total_waste_seconds: number;
  total_active_seconds: number;
  waste_ratio_active: number; // 浪費時間/PCアクティブ時間
  waste_ratio_24h: number; // 浪費時間/24時間
  goal_seconds: number; // 目標時間（秒）
  goal_achieved: boolean;
  top_categories?: TopCategory[]; // 上位カテゴリのJSON配列
  hourly_breakdown?: HourlyBreakdown; // 時間別内訳（24時間分）
  created_at: string;
  updated_at: string;
}

// 週次集計
export interface WeeklySummary {
  id: string;
  week_start_date: string; // 週の開始日（月曜日）
  total_waste_seconds: number;
  total_active_seconds: number;
  average_daily_waste_seconds: number;
  waste_ratio_active: number;
  waste_ratio_24h: number;
  goal_achieved_days: number;
  top_categories?: TopCategory[];
  daily_breakdown?: DailyBreakdown; // 日別内訳（7日分）
  created_at: string;
  updated_at: string;
}

// 通知ログ
export interface NotificationLog {
  id: string;
  notification_type: string;
  title: string;
  message: string;
  is_read: boolean;
  metadata?: any; // JSONB
  created_at: string;
}

// 補助型定義
export interface TopCategory {
  category_id: string;
  category_name: string;
  total_seconds: number;
  percentage: number;
}

export interface HourlyBreakdown {
  [hour: string]: { // "00" to "23"
    waste_seconds: number;
    active_seconds: number;
    categories: TopCategory[];
  };
}

export interface DailyBreakdown {
  [date: string]: { // "YYYY-MM-DD"
    waste_seconds: number;
    active_seconds: number;
    goal_achieved: boolean;
  };
}

// セッション作成用の型
export interface CreateSessionData {
  category_id?: string;
  session_key: string;
  start_time: string;
  end_time: string;
  duration_seconds: number;
  is_idle?: boolean;
  is_media_playing?: boolean;
  window_title?: string;
  url?: string;
}

// カテゴリ作成用の型
export interface CreateWasteCategoryData {
  name: string;
  type: WasteCategoryType;
  identifier: string;
  label?: WasteLabel;
  is_active?: boolean;
}

// 除外ルール作成用の型
export interface CreateExclusionRuleData {
  category_id: string;
  rule_type: ExclusionRuleType;
  pattern: string;
  description?: string;
  is_active?: boolean;
}

// 設定値の型定義
export interface UserSettings {
  sampling_interval: number; // サンプリング間隔（秒）
  idle_threshold: number; // アイドル閾値（秒）
  goal_weekday: number; // 平日の目標時間（秒）
  goal_weekend: number; // 休日の目標時間（秒）
  notifications_enabled: boolean; // 通知の有効/無効
  goal_exceeded_notification: boolean; // 目標超過時の通知
  continuous_viewing_notification: boolean; // 連続視聴30分時の通知
  continuous_viewing_threshold: number; // 連続視聴通知の閾値（秒）
}

// 統計データの型
export interface WasteStatistics {
  total_waste_seconds: number;
  total_active_seconds: number;
  waste_ratio_active: number;
  waste_ratio_24h: number;
  goal_seconds: number;
  goal_achieved: boolean;
  top_categories: TopCategory[];
  hourly_breakdown: HourlyBreakdown;
}

// 週次統計データの型
export interface WeeklyStatistics {
  week_start_date: string;
  total_waste_seconds: number;
  total_active_seconds: number;
  average_daily_waste_seconds: number;
  waste_ratio_active: number;
  waste_ratio_24h: number;
  goal_achieved_days: number;
  top_categories: TopCategory[];
  daily_breakdown: DailyBreakdown;
}

// フィルター条件の型
export interface SessionFilter {
  start_date?: string;
  end_date?: string;
  category_ids?: string[];
  is_idle?: boolean;
  is_media_playing?: boolean;
  limit?: number;
  offset?: number;
}

// 集計クエリの結果型
export interface CategoryUsageStats {
  category_id: string;
  category_name: string;
  total_seconds: number;
  session_count: number;
  average_session_duration: number;
  percentage_of_total: number;
}
