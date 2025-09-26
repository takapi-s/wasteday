import { useState, useMemo, useCallback } from 'react';
import { useLocalDbData, useExtensionData } from './index';
import { useDatabaseStatus } from '../utils';
import { useLocalWeeklyData, useLocalMonthlyData, useExtensionWeeklyData, useExtensionMonthlyData } from './index';
import { useWeeklyCalendarData } from './useWeeklyCalendarData';
import { useExtensionWeeklyCalendarData } from './useWeeklyCalendarData';
import type { WeeklyCalendarData } from '@wasteday/ui';

export type DataSource = 'desktop' | 'extension';

export interface QueryOptions {
  rangeHours: number;
  binMinutes: number;
}

export interface UnifiedDashboardData {
  // Basic data
  todayActiveSeconds: number;
  todayIdleSeconds: number;
  sessionsCount: number;
  last24hSeries: Array<{ timestamp: string; activeSeconds: number; idleSeconds: number }>;
  topIdentifiers: Array<{ label: string; seconds: number }>;
  topWaste: Array<{ label: string; seconds: number }>;
  topProductive: Array<{ label: string; seconds: number }>;
  
  // Database status
  databaseConnected: boolean;
  databaseLoading: boolean;
  databaseError: string | null;
  
  // Query options
  rangeHours: number;
  binMinutes: number;
  
  // Period data
  weeklyData?: any;
  weeklyCalendarData?: WeeklyCalendarData;
  monthlyData?: any;
  
  // Controlled period offsets
  currentWeekOffset: number;
  onChangeWeekOffset: (offset: number) => void;
  currentMonthOffset: number;
  onChangeMonthOffset: (offset: number) => void;
  
  // Controlled selected period
  selectedPeriod: 'today' | 'week' | 'month';
  onChangeSelectedPeriod: (period: 'today' | 'week' | 'month') => void;
  
  // Loading and error states
  loading: boolean;
  error: string | null;
}

export const useUnifiedDashboardData = (
  initialDataSource: DataSource = 'desktop',
  queryOptions: QueryOptions = { rangeHours: 24, binMinutes: 10 }
): {
  data: UnifiedDashboardData;
  dataSource: DataSource;
  setDataSource: (source: DataSource) => void;
  desktopData: ReturnType<typeof useLocalDbData>;
  extensionData: ReturnType<typeof useExtensionData>;
} => {
  const [dataSource, setDataSource] = useState<DataSource>(initialDataSource);
  const [weekOffset, setWeekOffset] = useState(0);
  const [monthOffset, setMonthOffset] = useState(0);
  const [selectedPeriod, setSelectedPeriod] = useState<'today' | 'week' | 'month'>('today');
  
  // Memoized options
  const memoizedOptions = useMemo(() => queryOptions, [queryOptions.rangeHours, queryOptions.binMinutes]);
  
  // Desktop app data
  const desktopData = useLocalDbData(memoizedOptions);
  
  // Chrome extension data
  const extensionData = useExtensionData(memoizedOptions);
  
  // Database status
  const { connected, loading: dbLoading, error: dbError } = useDatabaseStatus();
  
  // Fetch data based on selected period
  const shouldFetchWeekly = selectedPeriod === 'week';
  const shouldFetchMonthly = selectedPeriod === 'month';
  
  // Desktop week/month data
  const { data: desktopWeeklyData } = useLocalWeeklyData(
    shouldFetchWeekly && dataSource === 'desktop' ? weekOffset : undefined
  );
  const { data: desktopMonthlyData } = useLocalMonthlyData(
    shouldFetchMonthly && dataSource === 'desktop' ? monthOffset : undefined
  );
  const { weeklyData: desktopWeeklyCalendarData } = useWeeklyCalendarData(
    shouldFetchWeekly && dataSource === 'desktop' ? weekOffset : undefined
  );
  

  // Extension week/month data
  const { data: extensionWeeklyData } = useExtensionWeeklyData(
    shouldFetchWeekly && dataSource === 'extension' ? weekOffset : undefined
  );
  const { data: extensionMonthlyData } = useExtensionMonthlyData(
    shouldFetchMonthly && dataSource === 'extension' ? monthOffset : undefined
  );
  const { weeklyData: extensionWeeklyCalendarData } = useExtensionWeeklyCalendarData(
    shouldFetchWeekly && dataSource === 'extension' ? weekOffset : undefined
  );

  // Select current data source
  const currentData = useMemo(() => 
    dataSource === 'desktop' ? desktopData : extensionData,
    [dataSource, desktopData, extensionData]
  );

  // Select current data source week/month data
  const weeklyData = dataSource === 'desktop' ? desktopWeeklyData : extensionWeeklyData;
  const monthlyData = dataSource === 'desktop' ? desktopMonthlyData : extensionMonthlyData;
  const weeklyCalendarData = dataSource === 'desktop' ? desktopWeeklyCalendarData : extensionWeeklyCalendarData;

  // Data source switching handler
  const handleDataSourceChange = useCallback((source: DataSource) => {
    setDataSource(source);
  }, []);

  // Unified dashboard data
  const data: UnifiedDashboardData = useMemo(() => ({
    // Basic data
    todayActiveSeconds: currentData.todayActiveSeconds,
    todayIdleSeconds: currentData.todayIdleSeconds,
    sessionsCount: currentData.sessionsCount,
    last24hSeries: (currentData.last24hSeries && currentData.last24hSeries.length > 0)
      ? currentData.last24hSeries
      : [{ timestamp: new Date().toISOString(), activeSeconds: 0, idleSeconds: 0 }],
    topIdentifiers: currentData.topIdentifiers || [],
    topWaste: currentData.topWaste || [],
    topProductive: currentData.topProductive || [],
    
    // Database status
    databaseConnected: connected,
    databaseLoading: dbLoading,
    databaseError: dbError,
    
    // Query options
    rangeHours: memoizedOptions.rangeHours,
    binMinutes: memoizedOptions.binMinutes,
    
    // Period data
    weeklyData: weeklyData || undefined,
    weeklyCalendarData: weeklyCalendarData as WeeklyCalendarData | undefined,
    monthlyData: monthlyData || undefined,
    
    // Controlled period offsets
    currentWeekOffset: weekOffset,
    onChangeWeekOffset: setWeekOffset,
    currentMonthOffset: monthOffset,
    onChangeMonthOffset: setMonthOffset,
    
    // Controlled selected period
    selectedPeriod,
    onChangeSelectedPeriod: setSelectedPeriod,
    
    // Loading and error states
    loading: currentData.loading,
    error: currentData.error,
  }), [
    currentData,
    connected,
    dbLoading,
    dbError,
    memoizedOptions,
    weeklyData,
    weeklyCalendarData,
    monthlyData,
    weekOffset,
    monthOffset,
    selectedPeriod
  ]);

  return {
    data,
    dataSource,
    setDataSource: handleDataSourceChange,
    desktopData,
    extensionData,
  };
};
