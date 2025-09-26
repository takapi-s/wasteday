import React from 'react';
import { DashboardPage as SharedDashboard } from '@wasteday/ui';
import { useUnifiedDashboardData } from '../hooks/data';
import { SimpleDataSourceToggle } from '../components/SimpleDataSourceToggle';

export const DashboardPage: React.FC = () => {
  const { data, dataSource, setDataSource } = useUnifiedDashboardData('desktop', { rangeHours: 24, binMinutes: 60 });

  // Debug: Log dashboard data
  React.useEffect(() => {
    const preview = data.last24hSeries.slice(-3);
    console.log('[Desktop][DashboardPage] props to SharedDashboard:', {
      sessionsCount: data.sessionsCount,
      last24hSeriesLength: data.last24hSeries.length,
      preview,
      topIdentifiersCount: data.topIdentifiers.length,
    });
  }, [data.sessionsCount, data.last24hSeries, data.topIdentifiers]);

  if (data.loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500 dark:text-gray-400">Loading dashboard data...</div>
      </div>
    );
  }

  return (
    <>
      {/* Data Source Toggle */}
      <SimpleDataSourceToggle
        dataSource={dataSource}
        onDataSourceChange={setDataSource}
        selectedPeriod={data.selectedPeriod}
      />

      {data.error && (
        <div className="mb-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3 text-sm text-red-700 dark:text-red-300">
          Error loading data: {data.error}
        </div>
      )}
      
      {/* Main Dashboard */}
      <SharedDashboard {...data as any} />
    </>
  );
};


