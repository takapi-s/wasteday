import { useState, useEffect, useMemo, useCallback } from 'react';
import { invoke } from '@tauri-apps/api/core';
import type { TimeSeriesPoint, TopItem } from '@wasteday/ui';
import { DataProcessor } from '../../utils/dataProcessing';
import { Logger } from '../../lib/logger';
import type {
  BaseDataState,
  DataSource,
  BaseDataHookOptions,
  LocalSession,
  ExtensionSession,
  BaseCategory,
} from './types';

export const useBaseDataHook = (options: BaseDataHookOptions): BaseDataState => {
  const [data, setData] = useState<BaseDataState>({
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
    dataSource: options.dataSource,
    cacheKey: options.cacheKey,
    autoRefresh: options.autoRefresh ?? true,
    refreshInterval: options.refreshInterval ?? 300000,
  }), [options.rangeHours, options.binMinutes, options.dataSource, options.cacheKey, options.autoRefresh, options.refreshInterval]);

  const fetchData = useCallback(async () => {
    try {
      setData(prev => ({ ...prev, loading: true, error: null }));

      const cacheKey = DataProcessor.generateCacheKey(memoizedOptions, memoizedOptions.cacheKey);
      const cached = DataProcessor.getCachedData<BaseDataState>(cacheKey);
      if (cached) {
        setData({ ...cached, loading: false });
        return;
      }

      const flow = Logger.create('flow');
      flow.info('fetch:start', {
        source: memoizedOptions.dataSource,
        rangeHours: memoizedOptions.rangeHours,
        binMinutes: memoizedOptions.binMinutes,
      });

      const [sessions, categories] = await Promise.all([
        memoizedOptions.dataSource === 'local' 
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
        invoke<BaseCategory[]>('db_list_waste_categories'),
      ]);

      flow.info('fetch:done', {
        sessionsCount: sessions.length,
        categoriesCount: categories.length,
      });

      flow.info('aggregate:start');

      DataProcessor.processDataOptimized(
        sessions,
        categories,
        memoizedOptions.rangeHours,
        memoizedOptions.binMinutes
      );

      const last24hSeries = DataProcessor.generateTimeSeries(
        sessions,
        categories,
        memoizedOptions.rangeHours,
        memoizedOptions.binMinutes
      );

      const topIdentifiers = DataProcessor.generateTopItems(sessions, categories, 'identifiers');
      const topWaste = DataProcessor.generateTopItems(sessions, categories, 'waste');
      const topProductive = DataProcessor.generateTopItems(sessions, categories, 'productive');

      const todayStats = DataProcessor.calculateTodayStats(sessions, categories);

      const result: BaseDataState = {
        ...todayStats,
        last24hSeries: last24hSeries as TimeSeriesPoint[],
        topIdentifiers: topIdentifiers as TopItem[],
        topWaste: topWaste as TopItem[],
        topProductive: topProductive as TopItem[],
        loading: false,
        error: null,
      };

      flow.info('aggregate:done', {
        last24hBins: last24hSeries.length,
        topIdentifiers: topIdentifiers.length,
        topWaste: topWaste.length,
        topProductive: topProductive.length,
      });

      DataProcessor.setCachedData(cacheKey, result);
      setData(result);

    } catch (error) {
      console.error(`Error fetching ${memoizedOptions.dataSource} data:`, error);
      setData(prev => ({
        ...prev,
        loading: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }));
    }
  }, [memoizedOptions]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    if (!memoizedOptions.autoRefresh) return;

    const interval = setInterval(fetchData, memoizedOptions.refreshInterval);
    return () => clearInterval(interval);
  }, [fetchData, memoizedOptions.autoRefresh, memoizedOptions.refreshInterval]);

  useEffect(() => {
    if (!memoizedOptions.autoRefresh) return;

    const handleFocus = () => fetchData();
    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [fetchData, memoizedOptions.autoRefresh]);

  return data;
};

export const createDataHook = (dataSource: DataSource, defaultCacheKey: string) => {
  return (options: Partial<BaseDataHookOptions> = {}) => {
    return useBaseDataHook({
      dataSource,
      cacheKey: options.cacheKey ?? defaultCacheKey,
      rangeHours: options.rangeHours ?? 24,
      binMinutes: options.binMinutes ?? 60,
      autoRefresh: options.autoRefresh ?? true,
      refreshInterval: options.refreshInterval ?? 300000,
    });
  };
};


