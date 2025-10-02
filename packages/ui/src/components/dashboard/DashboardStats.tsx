import React from 'react';
import type { WeeklyData, MonthlyData } from '../../types';
import { formatDuration, formatPercentSignedCompact } from '../../utils';

interface DashboardStatsProps {
  selectedPeriod: 'today' | 'week' | 'month';
  
  // Today data
  todayActiveSeconds?: number;
  todayIdleSeconds?: number;
  sessionsCount?: number;
  
  // Week data
  weeklyData?: WeeklyData;
  currentWeekOffset?: number;
  
  // Month data
  monthlyData?: MonthlyData;
  currentMonthOffset?: number;
}

export const DashboardStats: React.FC<DashboardStatsProps> = ({
  selectedPeriod,
  todayActiveSeconds = 0,
  todayIdleSeconds = 0,
  sessionsCount = 0,
  weeklyData,
  currentWeekOffset,
  monthlyData,
  currentMonthOffset,
}) => {
  // formatDuration is now imported from utils

  // Today stats
  if (selectedPeriod === 'today') {
    const totalToday = todayActiveSeconds + todayIdleSeconds;
    const activePct = totalToday > 0 ? Math.round((todayActiveSeconds / totalToday) * 100) : 0;
    const idlePct = 100 - activePct;

    return (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white/70 dark:bg-neutral-900/50 backdrop-blur-md rounded-lg border border-gray-200/50 dark:border-white/10 p-4">
          <div className="text-sm text-gray-600 dark:text-gray-400">Waste Today</div>
          <div className="mt-1 text-2xl font-semibold text-gray-900 dark:text-gray-100">{formatDuration(todayActiveSeconds)}</div>
          <div className="mt-2 h-2 w-full bg-gray-100 dark:bg-gray-700 rounded">
            <div className="h-2 bg-red-500 rounded" style={{ width: `${activePct}%` }} />
          </div>
        </div>
        <div className="bg-white/70 dark:bg-neutral-900/50 backdrop-blur-md rounded-lg border border-gray-200/50 dark:border-white/10 p-4">
          <div className="text-sm text-gray-600 dark:text-gray-400">Productive Today</div>
          <div className="mt-1 text-2xl font-semibold text-gray-900 dark:text-gray-100">{formatDuration(todayIdleSeconds)}</div>
          <div className="mt-2 h-2 w-full bg-gray-100 dark:bg-gray-700 rounded">
            <div className="h-2 bg-green-500 rounded" style={{ width: `${idlePct}%` }} />
          </div>
        </div>
        <div className="bg-white/70 dark:bg-neutral-900/50 backdrop-blur-md rounded-lg border border-gray-200/50 dark:border-white/10 p-4">
          <div className="text-sm text-gray-600 dark:text-gray-400">Sessions (24h)</div>
          <div className="mt-1 text-2xl font-semibold text-gray-900 dark:text-gray-100">{sessionsCount}</div>
          <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">Based on recorded events</div>
        </div>
      </div>
    );
  }

  // Week stats
  if (selectedPeriod === 'week' && weeklyData) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white/70 dark:bg-neutral-900/50 backdrop-blur-md rounded-lg border border-gray-200/50 dark:border-white/10 p-4">
          <div className="text-sm text-gray-600 dark:text-gray-400">
            {currentWeekOffset === 0 ? 'Waste This Week' : 
             currentWeekOffset === -1 ? 'Waste Last Week' : 
             currentWeekOffset === 1 ? 'Waste Next Week' : 'Weekly Waste'}
          </div>
          <div className="mt-1 text-2xl font-semibold text-gray-900 dark:text-gray-100">{formatDuration(weeklyData.totalWasteSeconds)}</div>
          <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">Avg {formatDuration(Math.round(weeklyData.totalWasteSeconds / 7))}/day</div>
        </div>
        <div className="bg-white/70 dark:bg-neutral-900/50 backdrop-blur-md rounded-lg border border-gray-200/50 dark:border-white/10 p-4">
          <div className="text-sm text-gray-600 dark:text-gray-400">WoW Change</div>
          <div className={`mt-1 text-2xl font-semibold ${weeklyData.previousWeekComparison >= 0 ? 'text-red-600' : 'text-green-600'}`}>
            {formatPercentSignedCompact(weeklyData.previousWeekComparison)}
          </div>
          <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">{weeklyData.previousWeekComparison >= 0 ? 'Worse' : 'Better'}</div>
        </div>
        <div className="bg-white/70 dark:bg-neutral-900/50 backdrop-blur-md rounded-lg border border-gray-200/50 dark:border-white/10 p-4">
          <div className="text-sm text-gray-600 dark:text-gray-400">WoW Change (Productive)</div>
          <div className={`mt-1 text-2xl font-semibold ${(weeklyData.previousWeekComparisonProductive ?? 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            {formatPercentSignedCompact(weeklyData.previousWeekComparisonProductive ?? 0)}
          </div>
          <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">{(weeklyData.previousWeekComparisonProductive ?? 0) >= 0 ? 'Better' : 'Worse'}</div>
        </div>
        <div className="bg-white/70 dark:bg-neutral-900/50 backdrop-blur-md rounded-lg border border-gray-200/50 dark:border-white/10 p-4">
          <div className="text-sm text-gray-600 dark:text-gray-400">Productive Time</div>
          <div className="mt-1 text-2xl font-semibold text-gray-900 dark:text-gray-100">{formatDuration(weeklyData.totalProductiveSeconds)}</div>
          <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">Avg {formatDuration(Math.round(weeklyData.totalProductiveSeconds / 7))}/day</div>
        </div>
      </div>
    );
  }

  // Month stats
  if (selectedPeriod === 'month' && monthlyData) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white/70 dark:bg-neutral-900/50 backdrop-blur-md rounded-lg border border-gray-200/50 dark:border-white/10 p-4">
          <div className="text-sm text-gray-600 dark:text-gray-400">
            {currentMonthOffset === 0 ? 'Waste This Month' : 
             currentMonthOffset === -1 ? 'Waste Last Month' : 
             currentMonthOffset === 1 ? 'Waste Next Month' : 'Monthly Waste'}
          </div>
          <div className="mt-1 text-2xl font-semibold text-gray-900 dark:text-gray-100">{formatDuration(monthlyData.totalWasteSeconds)}</div>
          <div className="mt-2 text-sm text-gray-500 dark:text-gray-400">Avg {formatDuration(Math.round(monthlyData.totalWasteSeconds / 30))}/day</div>
        </div>
        <div className="bg-white/70 dark:bg-neutral-900/50 backdrop-blur-md rounded-lg border border-gray-200/50 dark:border-white/10 p-4">
          <div className="text-sm text-gray-600 dark:text-gray-400">MoM Change</div>
          <div className={`mt-1 text-2xl font-semibold ${monthlyData.previousMonthComparison >= 0 ? 'text-red-600' : 'text-green-600'}`}>
            {formatPercentSignedCompact(monthlyData.previousMonthComparison)}
          </div>
          <div className="mt-2 text-sm text-gray-500 dark:text-gray-400">{monthlyData.previousMonthComparison >= 0 ? 'Worse' : 'Better'}</div>
        </div>
        <div className="bg-white/70 dark:bg-neutral-900/50 backdrop-blur-md rounded-lg border border-gray-200/50 dark:border-white/10 p-4">
          <div className="text-sm text-gray-600 dark:text-gray-400">MoM Change (Productive)</div>
          <div className={`mt-1 text-2xl font-semibold ${(monthlyData.previousMonthComparisonProductive ?? 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            {formatPercentSignedCompact(monthlyData.previousMonthComparisonProductive ?? 0)}
          </div>
          <div className="mt-2 text-sm text-gray-500 dark:text-gray-400">{(monthlyData.previousMonthComparisonProductive ?? 0) >= 0 ? 'Better' : 'Worse'}</div>
        </div>
        <div className="bg-white/70 dark:bg-neutral-900/50 backdrop-blur-md rounded-lg border border-gray-200/50 dark:border-white/10 p-4">
          <div className="text-sm text-gray-600 dark:text-gray-400">Productive Time</div>
          <div className="mt-1 text-2xl font-semibold text-gray-900 dark:text-gray-100">{formatDuration(monthlyData.totalProductiveSeconds)}</div>
          <div className="mt-2 text-sm text-gray-500 dark:text-gray-400">Avg {formatDuration(Math.round(monthlyData.totalProductiveSeconds / 30))}/day</div>
        </div>
      </div>
    );
  }

  return null;
};
