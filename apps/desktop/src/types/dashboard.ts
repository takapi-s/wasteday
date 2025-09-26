import type { TimeSeriesPoint, TopItem } from '@wasteday/ui';
import type React from 'react';

// 基本データ型
export interface BaseDashboardData {
  todayActiveSeconds: number;
  todayIdleSeconds: number;
  sessionsCount: number;
  last24hSeries: TimeSeriesPoint[];
  topIdentifiers: TopItem[];
  topWaste?: TopItem[];
  topProductive?: TopItem[];
  loading: boolean;
  error: string | null;
}

// クエリオプション
export interface QueryOptions {
  rangeHours?: number;     // 1-24
  binMinutes?: number;     // 10-120
}

// セッション型
export interface LocalSession {
  id: string;
  start_time: string; // ISO
  duration_seconds: number;
  session_key: string;
}

export interface ExtensionSession {
  id: string;
  start_time: string;
  duration_seconds: number;
  domain: string;
  url: string;
  title: string;
  category_id?: number;
}

// カテゴリ型
export interface Category {
  id?: number;
  type: string;
  identifier: string;
  label: 'waste' | 'productive' | string;
  is_active: boolean;
}

// データソース型
export interface DataSource {
  type: 'desktop' | 'extension';
  name: string;
  description: string;
  icon: React.ReactNode;
}

// キャッシュ型
export interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

// 処理済みデータ型
export interface ProcessedData {
  bins: Map<number, number>;
  domainStats: Map<string, { totalTime: number; count: number; categoryId?: number }>;
  categoryMap: Map<number, string>;
}

// データソース切り替え型
export type DataSourceType = 'desktop' | 'extension';

// 期間選択型
export type PeriodType = 'today' | 'week' | 'month';

// データベース状態型
export interface DatabaseStatus {
  connected: boolean;
  loading: boolean;
  error: string | null;
}

// 統計データ型
export interface StatsData {
  activeTime: number;
  idleTime: number;
  sessionsCount: number;
  totalTime: number;
}

// 時系列データ型
export interface TimeSeriesData {
  series: TimeSeriesPoint[];
  range: {
    start: Date;
    end: Date;
  };
  binSize: number;
}

// トップアイテム型
export interface TopItemsData {
  identifiers: TopItem[];
  waste: TopItem[];
  productive: TopItem[];
}

// エラー型
export interface AppError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
  timestamp: Date;
}

// ローディング状態型
export interface LoadingState {
  isLoading: boolean;
  progress?: number;
  message?: string;
}

// 設定型
export interface AppSettings {
  theme: 'light' | 'dark' | 'system';
  autoRefresh: boolean;
  refreshInterval: number;
  defaultDataSource: DataSourceType;
  defaultPeriod: PeriodType;
}

// イベント型
export interface DataUpdateEvent {
  type: 'data_updated';
  source: DataSourceType;
  timestamp: Date;
  data: BaseDashboardData;
}

export interface ErrorEvent {
  type: 'error';
  error: AppError;
  timestamp: Date;
}

export type AppEvent = DataUpdateEvent | ErrorEvent;
