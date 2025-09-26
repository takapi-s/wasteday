import { useBasePeriodDataHook } from './useBaseDataHook';
import type { WeeklyCalendarData } from '@wasteday/ui';

export type HourlyData = {
  hour: number;
  wasteSeconds: number;
  productiveSeconds: number;
  sessions: Array<{
    id: string;
    startTime: string;
    durationSeconds: number;
    category: string;
    identifier: string;
    isWaste: boolean;
  }>;
};


/**
 * ローカル週次カレンダーデータ用のデータフック
 * ベースフックを使用してリファクタリング済み
 */
export const useWeeklyCalendarData = (offsetWeeks: number | undefined = 0) => {
  const baseData = useBasePeriodDataHook<WeeklyCalendarData>({
    dataSource: 'local',
    periodType: 'weekly',
    offset: offsetWeeks,
    cacheKey: 'local_weekly_calendar',
    autoRefresh: true,
    refreshInterval: 300000, // 5分
  });


  return {
    weeklyData: baseData.data,
    loading: baseData.loading,
    error: baseData.error,
  };
};

/**
 * 拡張機能週次カレンダーデータ用のデータフック
 * ベースフックを使用してリファクタリング済み
 */
export const useExtensionWeeklyCalendarData = (weekOffset?: number) => {
  const baseData = useBasePeriodDataHook<WeeklyCalendarData>({
    dataSource: 'extension',
    periodType: 'weekly',
    offset: weekOffset,
    cacheKey: 'extension_weekly_calendar',
    autoRefresh: true,
    refreshInterval: 300000, // 5分
  });

  return {
    weeklyData: baseData.data,
    loading: baseData.loading,
    error: baseData.error,
  };
};
