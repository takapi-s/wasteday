// データ取得関連のフック
import { createDataHook } from './useBaseData';
import { createWeeklyDataHook, createMonthlyDataHook } from './useBasePeriodData';

export { useBaseDashboardData } from './useBaseDashboardData';
export { useBaseDataHook, createDataHook } from './useBaseData';
export { useBasePeriodDataHook, createWeeklyDataHook, createMonthlyDataHook } from './useBasePeriodData';
export { useBrowsingData, useBrowsingStats } from './useBrowsingData';

// ファクトリー関数を使用して直接エクスポート
export const useExtensionData = createDataHook('extension', 'extension_data');
export const useLocalDbData = createDataHook('local', 'local_db');

// ファクトリー関数を使用して直接エクスポート
export const useExtensionMonthlyData = createMonthlyDataHook('extension', 'extension_monthly');
export const useExtensionWeeklyData = createWeeklyDataHook('extension', 'extension_weekly');
export const useLocalMonthlyData = createMonthlyDataHook('local', 'local_monthly');
export const useLocalWeeklyData = createWeeklyDataHook('local', 'local_weekly');

export { useUnifiedDashboardData } from './useUnifiedDashboardData';
export { 
  useWeeklyCalendarData, 
  useExtensionWeeklyCalendarData,
  type HourlyData
} from './useWeeklyCalendarData';

// 型の再エクスポート
export type { 
  DataSource, 
  QueryOptions, 
  UnifiedDashboardData
} from './useUnifiedDashboardData';
export type { 
  BaseDataState,
  BasePeriodDataState,
  PeriodType,
  BaseDataHookOptions,
  BasePeriodDataHookOptions,
  BaseSession,
  LocalSession,
  ExtensionSession,
  BaseCategory
} from './types';
