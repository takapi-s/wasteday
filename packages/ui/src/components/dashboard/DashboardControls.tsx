import React from 'react';
import type { PeriodType } from '../../types';

interface DashboardControlsProps {
  selectedPeriod: PeriodType;
  onPeriodChange: (period: PeriodType) => void;
  
  // Week controls
  currentWeekOffset?: number;
  onChangeWeekOffset?: (offset: number) => void;
  
  // Month controls  
  currentMonthOffset?: number;
  onChangeMonthOffset?: (offset: number) => void;
  
  // Week view mode
  weekViewMode?: 'chart' | 'calendar';
  onWeekViewModeChange?: (mode: 'chart' | 'calendar') => void;
  
  // Calendar metric
  calendarMetric?: 'waste' | 'productive';
  onCalendarMetricChange?: (metric: 'waste' | 'productive') => void;
}

export const DashboardControls: React.FC<DashboardControlsProps> = ({
  selectedPeriod,
  onPeriodChange,
  currentWeekOffset,
  onChangeWeekOffset,
  currentMonthOffset,
  onChangeMonthOffset,
  weekViewMode,
  onWeekViewModeChange,
  calendarMetric,
  onCalendarMetricChange,
}) => {
  return (
    <div className="space-y-4">
      {/* Period Selector */}
      <div className="flex space-x-1 bg-gray-100 dark:bg-gray-700 rounded-lg p-1 w-fit">
        <button 
          onClick={() => onPeriodChange('today')}
          className={`px-4 py-2 text-sm rounded-md transition-colors ${
            selectedPeriod === 'today' 
              ? 'bg-white dark:bg-gray-800 shadow-sm text-gray-900 dark:text-gray-100' 
              : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100'
          }`}
        >
          Today
        </button>
        <button 
          onClick={() => onPeriodChange('week')}
          className={`px-4 py-2 text-sm rounded-md transition-colors ${
            selectedPeriod === 'week' 
              ? 'bg-white dark:bg-gray-800 shadow-sm text-gray-900 dark:text-gray-100' 
              : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100'
          }`}
        >
          Week
        </button>
        <button 
          onClick={() => onPeriodChange('month')}
          className={`px-4 py-2 text-sm rounded-md transition-colors ${
            selectedPeriod === 'month' 
              ? 'bg-white dark:bg-gray-800 shadow-sm text-gray-900 dark:text-gray-100' 
              : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100'
          }`}
        >
          Month
        </button>
      </div>

      {/* Week Controls */}
      {selectedPeriod === 'week' && (
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button
              onClick={() => onChangeWeekOffset?.(currentWeekOffset! - 1)}
              className="px-3 py-1 text-sm bg-gray-100 dark:bg-gray-700 rounded-md hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
            >
              ← Previous Week
            </button>
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
              {currentWeekOffset === 0 ? 'This Week' : 
               currentWeekOffset === -1 ? 'Last Week' : 
               currentWeekOffset === 1 ? 'Next Week' : 
               `${currentWeekOffset! > 0 ? '+' : ''}${currentWeekOffset}w`}
            </span>
            {currentWeekOffset! < 0 && (
              <button
                onClick={() => onChangeWeekOffset?.(currentWeekOffset! + 1)}
                className="px-3 py-1 text-sm bg-gray-100 dark:bg-gray-700 rounded-md hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
              >
                Next Week →
              </button>
            )}
          </div>
          <div className="flex items-center gap-2">
            {/* Week View Mode Toggle */}
            {onWeekViewModeChange && (
              <div className="flex bg-gray-100 dark:bg-gray-700 rounded p-1 text-xs">
                <button
                  onClick={() => onWeekViewModeChange('chart')}
                  className={`px-2 py-1 rounded transition-colors ${
                    weekViewMode === 'chart' 
                      ? 'bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100' 
                      : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100'
                  }`}
                >
                  Chart
                </button>
                <button
                  onClick={() => onWeekViewModeChange('calendar')}
                  className={`px-2 py-1 rounded transition-colors ${
                    weekViewMode === 'calendar' 
                      ? 'bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100' 
                      : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100'
                  }`}
                >
                  Calendar
                </button>
              </div>
            )}
            {currentWeekOffset !== 0 && (
              <button
                onClick={() => onChangeWeekOffset?.(0)}
                className="px-3 py-1 text-sm bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 rounded-md hover:bg-blue-200 dark:hover:bg-blue-800 transition-colors"
              >
                Back to This Week
              </button>
            )}
          </div>
        </div>
      )}

      {/* Month Controls */}
      {selectedPeriod === 'month' && (
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button
              onClick={() => onChangeMonthOffset?.(currentMonthOffset! - 1)}
              className="px-3 py-1 text-sm bg-gray-100 dark:bg-gray-700 rounded-md hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
            >
              ← Previous Month
            </button>
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
              {currentMonthOffset === 0 ? 'This Month' : 
               currentMonthOffset === -1 ? 'Last Month' : 
               currentMonthOffset === 1 ? 'Next Month' : 
               `${currentMonthOffset! > 0 ? '+' : ''}${currentMonthOffset}mo`}
            </span>
            {currentMonthOffset! < 0 && (
              <button
                onClick={() => onChangeMonthOffset?.(currentMonthOffset! + 1)}
                className="px-3 py-1 text-sm bg-gray-100 dark:bg-gray-700 rounded-md hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
              >
                Next Month →
              </button>
            )}
          </div>
          <div className="flex items-center gap-2">
            {/* Metric toggle */}
            {onCalendarMetricChange && (
              <>
                <span className="text-xs text-gray-500 dark:text-gray-400">Metric:</span>
                <div className="flex bg-gray-100 dark:bg-gray-700 rounded p-1 text-xs">
                  <button
                    onClick={() => onCalendarMetricChange('waste')}
                    className={`px-2 py-1 rounded ${calendarMetric === 'waste' ? 'bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100' : 'text-gray-600 dark:text-gray-300'}`}
                  >Waste</button>
                  <button
                    onClick={() => onCalendarMetricChange('productive')}
                    className={`px-2 py-1 rounded ${calendarMetric === 'productive' ? 'bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100' : 'text-gray-600 dark:text-gray-300'}`}
                  >Productive</button>
                </div>
              </>
            )}
            {currentMonthOffset !== 0 && (
              <button
                onClick={() => onChangeMonthOffset?.(0)}
                className="px-3 py-1 text-sm bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 rounded-md hover:bg-blue-200 dark:hover:bg-blue-800 transition-colors"
              >
                Back to This Month
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
