import { useState, useEffect, useMemo, useCallback } from 'react';
import { invoke } from '@tauri-apps/api/core';
import type { BaseDashboardData, QueryOptions, LocalSession, ExtensionSession, Category } from '../../types/dashboard';
import { DataProcessor } from '../../utils/dataProcessing';

interface UseBaseDashboardDataOptions extends QueryOptions {
  dataType: 'local' | 'extension';
  cacheKey: string;
}

export const useBaseDashboardData = (options: UseBaseDashboardDataOptions): BaseDashboardData => {
  const [data, setData] = useState<BaseDashboardData>({
    todayActiveSeconds: 0,
    todayIdleSeconds: 0,
    sessionsCount: 0,
    last24hSeries: [],
    topIdentifiers: [],
    topWaste: [],
    topProductive: [],
    loading: true,
    error: null,
  });

  const memoizedOptions = useMemo(() => ({
    rangeHours: Math.min(24, Math.max(1, Math.floor(options.rangeHours ?? 24))),
    binMinutes: Math.min(120, Math.max(10, Math.floor(options.binMinutes ?? 60))),
  }), [options.rangeHours, options.binMinutes]);

  const fetchData = useCallback(async () => {
    try {
      setData(prev => ({ ...prev, loading: true, error: null }));

      // キャッシュチェック
      const cacheKey = DataProcessor.generateCacheKey(memoizedOptions, options.cacheKey);
      const cached = DataProcessor.getCachedData<BaseDashboardData>(cacheKey);
      if (cached) {
        setData({ ...cached, loading: false });
        return;
      }

      // データ取得
      const [sessions, categories] = await Promise.all([
        options.dataType === 'local' 
          ? invoke<LocalSession[]>('db_get_sessions', {
              query: {
                since: new Date(Date.now() - memoizedOptions.rangeHours * 60 * 60 * 1000).toISOString(),
                until: new Date().toISOString(),
              }
            })
          : invoke<ExtensionSession[]>('db_get_browsing_sessions', {
              query: {
                since: new Date(Date.now() - memoizedOptions.rangeHours * 60 * 60 * 1000).toISOString(),
                until: new Date().toISOString(),
              }
            }),
        invoke<Category[]>('db_list_waste_categories'),
      ]);

      // データ処理
      DataProcessor.processDataOptimized(
        sessions,
        categories,
        memoizedOptions.rangeHours,
        memoizedOptions.binMinutes
      );

      // 時系列データ生成
      const last24hSeries = DataProcessor.generateTimeSeries(
        sessions,
        categories,
        memoizedOptions.rangeHours,
        memoizedOptions.binMinutes
      );

      // トップアイテム生成
      const topIdentifiers = DataProcessor.generateTopItems(sessions, categories, 'identifiers');
      const topWaste = DataProcessor.generateTopItems(sessions, categories, 'waste');
      const topProductive = DataProcessor.generateTopItems(sessions, categories, 'productive');

      // 今日の統計（waste/それ以外で分離）
      const todayStats = DataProcessor.calculateTodayStats(sessions, categories);

      const result: BaseDashboardData = {
        ...todayStats,
        last24hSeries,
        topIdentifiers,
        topWaste,
        topProductive,
        loading: false,
        error: null,
      };

      // キャッシュに保存
      DataProcessor.setCachedData(cacheKey, result);
      setData(result);

    } catch (error) {
      console.error(`Error fetching ${options.dataType} data:`, error);
      setData(prev => ({
        ...prev,
        loading: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }));
    }
  }, [memoizedOptions, options.dataType, options.cacheKey]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return data;
};
