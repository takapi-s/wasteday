import React from 'react';
import { DashboardPage as SharedDashboard } from '@wasteday/ui';
// import { useSupabaseData } from '../hooks/useSupabaseData';
import { useLocalDbData } from '../hooks/useLocalDbData';
import { useDatabaseStatus } from '../hooks/useDatabaseStatus';
// import { useWeeklyData } from '../hooks/useWeeklyData';
// import { useMonthlyData } from '../hooks/useMonthlyData';
import { useLocalWeeklyData } from '../hooks/useLocalWeeklyData';
import { useLocalMonthlyData } from '../hooks/useLocalMonthlyData';
import { useWeeklyCalendarData } from '../hooks/useWeeklyCalendarData';

export const DashboardPage: React.FC = () => {
  const rangeHours = 24; // 過去24時間に変更
  const binMinutes = 20;

  const { 
    todayActiveSeconds, 
    todayIdleSeconds, 
    sessionsCount, 
    last24hSeries, 
    topIdentifiers,
    topWaste,
    topProductive,
    loading,
    error 
  } = useLocalDbData({ rangeHours, binMinutes });

  const { connected, loading: dbLoading, error: dbError } = useDatabaseStatus();
  const [weekOffset, setWeekOffset] = React.useState(0);
  const [monthOffset, setMonthOffset] = React.useState(0);
  const [selectedPeriod, setSelectedPeriod] = React.useState<'today' | 'week' | 'month'>('today');
  const { weeklyData, loading: weeklyLoading, error: weeklyError } = useLocalWeeklyData(weekOffset);
  const { monthlyData, loading: monthlyLoading, error: monthlyError } = useLocalMonthlyData(monthOffset);
  const { weeklyData: weeklyCalendarData, loading: weeklyCalendarLoading, error: weeklyCalendarError } = useWeeklyCalendarData(weekOffset);

  // デバッグ: 受け取ったダッシュボード用データをログ
  React.useEffect(() => {
    const preview = last24hSeries.slice(-3);
    console.log('[Desktop][DashboardPage] props to SharedDashboard:', {
      sessionsCount,
      last24hSeriesLength: last24hSeries.length,
      preview,
      topIdentifiersCount: topIdentifiers.length,
    });
  }, [sessionsCount, last24hSeries, topIdentifiers]);

  if (loading || weeklyLoading || monthlyLoading || weeklyCalendarLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500 dark:text-gray-400">Loading dashboard data...</div>
      </div>
    );
  }

  return (
    <>
      {(error || weeklyError || monthlyError || weeklyCalendarError) && (
        <div className="mb-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3 text-sm text-red-700 dark:text-red-300">
          Error loading data: {error || weeklyError || monthlyError || weeklyCalendarError}
        </div>
      )}
      
      {/* メインダッシュボード */}
      <SharedDashboard
        todayActiveSeconds={todayActiveSeconds}
        todayIdleSeconds={todayIdleSeconds}
        sessionsCount={sessionsCount}
        last24hSeries={last24hSeries}
        topIdentifiers={topIdentifiers}
        topWaste={topWaste}
        topProductive={topProductive}
        databaseConnected={connected}
        databaseLoading={dbLoading}
        databaseError={dbError}
        rangeHours={rangeHours}
        binMinutes={binMinutes}
        weeklyData={weeklyData || undefined}
        weeklyCalendarData={weeklyCalendarData || undefined}
        monthlyData={monthlyData || undefined}
        currentWeekOffset={weekOffset}
        onChangeWeekOffset={setWeekOffset}
        currentMonthOffset={monthOffset}
        onChangeMonthOffset={setMonthOffset}
        selectedPeriod={selectedPeriod}
        onChangeSelectedPeriod={setSelectedPeriod}
      />
    </>
  );
};


