import React from 'react';
import { DashboardPage as SharedDashboard } from '@wasteday/ui';
import { useUnifiedDashboardData } from '../hooks/data';
import { DataSourceToggle } from '../components/DataSourceToggle';

export const UnifiedDashboardPage: React.FC = () => {
  const { data, dataSource, setDataSource, desktopData, extensionData } = useUnifiedDashboardData();

  // デバッグ: データの内容を確認
  React.useEffect(() => {
    console.log('[UnifiedDashboardPage] data:', {
      todayActiveSeconds: data.todayActiveSeconds,
      todayIdleSeconds: data.todayIdleSeconds,
      sessionsCount: data.sessionsCount,
      last24hSeriesLength: data.last24hSeries.length,
      topIdentifiersLength: data.topIdentifiers.length,
      loading: data.loading,
      error: data.error,
      databaseConnected: data.databaseConnected,
      weeklyCalendarData: data.weeklyCalendarData,
      monthlyData: data.monthlyData,
      selectedPeriod: data.selectedPeriod,
    });
  }, [data]);

  return (
    <div className="space-y-6">
      {/* Data Source Toggle */}
      <DataSourceToggle
        dataSource={dataSource}
        onDataSourceChange={setDataSource}
        desktopData={desktopData}
        extensionData={extensionData}
      />

      {/* Unified Dashboard */}
      <SharedDashboard {...data as any} />
    </div>
  );
};
