import React, { useState } from 'react';
import { DashboardHeader } from '../dashboard/DashboardHeader';
import { DashboardControls } from '../dashboard/DashboardControls';
import { DashboardStats } from '../dashboard/DashboardStats';
import { DashboardCharts } from '../dashboard/DashboardCharts';
import { DashboardRankings } from '../dashboard/DashboardRankings';
import type { 
  TimeSeriesPoint, 
  TopItem, 
  WeeklyData, 
  WeeklyCalendarData, 
  MonthlyData, 
  PeriodType 
} from '../../types';

// Re-export types for backward compatibility
export type {
  TimeSeriesPoint,
  TopItem,
  DailyData,
  WeeklyData,
  HourlyData,
  WeeklyCalendarData,
  MonthlyData,
  CalendarDay,
  PeriodType
} from '../../types';

export interface DashboardPageProps {
  // Summary
  todayActiveSeconds: number;
  todayIdleSeconds: number;
  sessionsCount?: number;
  // Charts
  last24hSeries: TimeSeriesPoint[];
  // Rankings
  topIdentifiers: TopItem[];
  // optional split lists
  topWaste?: TopItem[];
  topProductive?: TopItem[];
  // Database status
  databaseConnected?: boolean;
  databaseLoading?: boolean;
  databaseError?: string | null;
  // Query options
  rangeHours?: number;
  binMinutes?: number;
  // New period data
  weeklyData?: WeeklyData;
  weeklyCalendarData?: WeeklyCalendarData;
  monthlyData?: MonthlyData;
  // Controlled period offsets (optional)
  currentWeekOffset?: number;
  onChangeWeekOffset?: (offset: number) => void;
  currentMonthOffset?: number;
  onChangeMonthOffset?: (offset: number) => void;
  // Controlled selected period (optional)
  selectedPeriod?: PeriodType;
  onChangeSelectedPeriod?: (period: PeriodType) => void;
}


export const DashboardPage: React.FC<DashboardPageProps> = ({
  todayActiveSeconds,
  todayIdleSeconds,
  sessionsCount = 0,
  last24hSeries,
  topIdentifiers,
  topWaste,
  topProductive,
  databaseConnected = false,
  databaseLoading = false,
  databaseError = null,
  binMinutes = 20,
  weeklyData,
  weeklyCalendarData,
  monthlyData,
  currentWeekOffset,
  onChangeWeekOffset,
  currentMonthOffset,
  onChangeMonthOffset,
  selectedPeriod: selectedPeriodProp,
  onChangeSelectedPeriod,
}) => {
  const [internalSelectedPeriod, setInternalSelectedPeriod] = useState<PeriodType>('today');
  const selectedPeriod = selectedPeriodProp ?? internalSelectedPeriod;
  const [internalWeekOffset, setInternalWeekOffset] = useState(0);
  const [internalMonthOffset, setInternalMonthOffset] = useState(0);
  const [calendarMetric, setCalendarMetric] = useState<'waste' | 'productive'>('waste');
  const [weekViewMode, setWeekViewMode] = useState<'chart' | 'calendar'>('chart');
  const weekOffset = currentWeekOffset ?? internalWeekOffset; // controlled or uncontrolled
  const monthOffset = currentMonthOffset ?? internalMonthOffset;

  // Debug: 受け取ったデータをコンソールに出力
  React.useEffect(() => {
    // 直近の3本だけプレビュー
    const preview = last24hSeries.slice(-3);
    console.log('[UI][Dashboard] props:', {
      sessionsCount,
      last24hSeriesLength: last24hSeries.length,
      preview,
      databaseConnected,
      databaseLoading,
      databaseError,
    });
  }, [sessionsCount, last24hSeries, databaseConnected, databaseLoading, databaseError]);

  // Event handlers
  const handlePeriodChange = (period: PeriodType) => {
    if (onChangeSelectedPeriod) {
      onChangeSelectedPeriod(period);
    } else {
      setInternalSelectedPeriod(period);
    }
  };

  const handleWeekOffsetChange = (offset: number) => {
    if (onChangeWeekOffset) {
      onChangeWeekOffset(offset);
    } else {
      setInternalWeekOffset(offset);
    }
  };

  const handleMonthOffsetChange = (offset: number) => {
    if (onChangeMonthOffset) {
      onChangeMonthOffset(offset);
    } else {
      setInternalMonthOffset(offset);
    }
  };


  return (
    <div className="space-y-6">
      {/* Header */}
      <DashboardHeader 
        databaseStatus={{
          connected: databaseConnected,
          loading: databaseLoading,
          error: databaseError
        }}
      />

      {/* Controls */}
      <DashboardControls
        selectedPeriod={selectedPeriod}
        onPeriodChange={handlePeriodChange}
        currentWeekOffset={weekOffset}
        onChangeWeekOffset={handleWeekOffsetChange}
        currentMonthOffset={monthOffset}
        onChangeMonthOffset={handleMonthOffsetChange}
        weekViewMode={weekViewMode}
        onWeekViewModeChange={setWeekViewMode}
        calendarMetric={calendarMetric}
        onCalendarMetricChange={setCalendarMetric}
      />

      {/* Database Error */}
      {databaseError && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-red-500 rounded-full"></div>
            <span className="text-sm font-medium text-red-800 dark:text-red-200">Database Error</span>
          </div>
          <p className="text-sm text-red-700 dark:text-red-300 mt-1">{databaseError}</p>
        </div>
      )}

      {/* Stats */}
      <DashboardStats
        selectedPeriod={selectedPeriod}
        todayActiveSeconds={todayActiveSeconds}
        todayIdleSeconds={todayIdleSeconds}
        sessionsCount={sessionsCount}
        weeklyData={weeklyData}
        currentWeekOffset={weekOffset}
        monthlyData={monthlyData}
        currentMonthOffset={monthOffset}
      />

      {/* Charts and Rankings (Today only) */}
      {selectedPeriod === 'today' ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Activity Chart */}
          <div>
            <DashboardCharts
              selectedPeriod={selectedPeriod}
              last24hSeries={last24hSeries}
              binMinutes={binMinutes}
              weeklyData={weeklyData}
              weeklyCalendarData={weeklyCalendarData}
              weekViewMode={weekViewMode}
              weekOffset={weekOffset}
              monthlyData={monthlyData}
              monthOffset={monthOffset}
              calendarMetric={calendarMetric}
            />
          </div>
          
          {/* Top Apps (Today) */}
          <div>
            <DashboardRankings
              selectedPeriod={selectedPeriod}
              topIdentifiers={topIdentifiers}
              topWaste={topWaste}
              topProductive={topProductive}
            />
          </div>
        </div>
      ) : (
        /* Charts for Week/Month */
        <DashboardCharts
          selectedPeriod={selectedPeriod}
          last24hSeries={last24hSeries}
          binMinutes={binMinutes}
          weeklyData={weeklyData}
          weeklyCalendarData={weeklyCalendarData}
          weekViewMode={weekViewMode}
          weekOffset={weekOffset}
          monthlyData={monthlyData}
          monthOffset={monthOffset}
          calendarMetric={calendarMetric}
        />
      )}
    </div>
  );
};


