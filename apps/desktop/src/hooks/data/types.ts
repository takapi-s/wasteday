import type { QueryOptions, Category } from '../../types/dashboard';

/**
 * データフックの共通型定義
 */
export interface BaseDataState {
  todayActiveSeconds: number;
  todayIdleSeconds: number;
  sessionsCount: number;
  last24hSeries: any[]; // from @wasteday/ui TimeSeriesPoint
  topIdentifiers: any[]; // from @wasteday/ui TopItem
  topWaste: any[]; // from @wasteday/ui TopItem
  topProductive: any[]; // from @wasteday/ui TopItem
  loading: boolean;
  error: string | null;
}

/**
 * 期間別データフックの共通型定義
 */
export interface BasePeriodDataState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
}

/** データソースの種類 */
export type DataSource = 'local' | 'extension';

/** 期間の種類 */
export type PeriodType = 'weekly' | 'monthly';

/** ベースデータフックのオプション */
export interface BaseDataHookOptions extends QueryOptions {
  dataSource: DataSource;
  cacheKey: string;
  autoRefresh?: boolean;
  refreshInterval?: number;
}

/** ベース期間データフックのオプション */
export interface BasePeriodDataHookOptions {
  dataSource: DataSource;
  periodType: PeriodType;
  offset: number | undefined;
  cacheKey: string;
  autoRefresh?: boolean;
  refreshInterval?: number;
}

/** セッションの共通型定義 */
export interface BaseSession {
  id: string;
  start_time: string;
  duration_seconds: number;
}

export interface LocalSession extends BaseSession {
  session_key: string;
}

export interface ExtensionSession extends BaseSession {
  domain: string;
  url: string;
  title: string;
  category_id?: number;
}

/** カテゴリの共通型定義 */
export interface BaseCategory {
  id?: number;
  type: string;
  identifier: string;
  label: 'waste' | 'productive' | string;
  is_active: boolean;
}

// 再エクスポート互換
export type { QueryOptions, Category };


