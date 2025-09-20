import React, { useState } from 'react';
import type { WeeklyCalendarData } from '../../types';
import { formatDuration } from '../../utils';

interface WeeklyCalendarViewProps {
  data: WeeklyCalendarData;
  onHourClick?: (date: string, hour: number, sessions: any[]) => void;
}

const WeeklyCalendarView: React.FC<WeeklyCalendarViewProps> = ({ data, onHourClick }) => {
  const [selectedHour, setSelectedHour] = useState<{ date: string; hour: number } | null>(null);
  const [viewMode, setViewMode] = useState<'waste' | 'productive' | 'both'>('both');

  // formatDuration is now imported from utils

  const getHourColor = (wasteSeconds: number, productiveSeconds: number, mode: 'waste' | 'productive' | 'both') => {
    if (mode === 'waste') {
      if (wasteSeconds === 0) return 'bg-gray-50 dark:bg-gray-800';
      if (wasteSeconds < 900) return 'bg-red-100 dark:bg-red-900/30'; // 15分未満
      if (wasteSeconds < 1800) return 'bg-red-200 dark:bg-red-800/50'; // 30分未満
      if (wasteSeconds < 3600) return 'bg-red-300 dark:bg-red-700/70'; // 1時間未満
      return 'bg-red-400 dark:bg-red-600/80'; // 1時間以上
    } else if (mode === 'productive') {
      if (productiveSeconds === 0) return 'bg-gray-50 dark:bg-gray-800';
      if (productiveSeconds < 900) return 'bg-green-100 dark:bg-green-900/30';
      if (productiveSeconds < 1800) return 'bg-green-200 dark:bg-green-800/50';
      if (productiveSeconds < 3600) return 'bg-green-300 dark:bg-green-700/70';
      return 'bg-green-400 dark:bg-green-600/80';
    } else {
      // both mode - 混合色
      const total = wasteSeconds + productiveSeconds;
      if (total === 0) return 'bg-gray-50 dark:bg-gray-800';
      
      const wasteRatio = wasteSeconds / total;
      const productiveRatio = productiveSeconds / total;
      
      if (wasteRatio > 0.7) {
        if (total < 1800) return 'bg-red-100 dark:bg-red-900/30';
        if (total < 3600) return 'bg-red-200 dark:bg-red-800/50';
        return 'bg-red-300 dark:bg-red-700/70';
      } else if (productiveRatio > 0.7) {
        if (total < 1800) return 'bg-green-100 dark:bg-green-900/30';
        if (total < 3600) return 'bg-green-200 dark:bg-green-800/50';
        return 'bg-green-300 dark:bg-green-700/70';
      } else {
        // 混合色
        if (total < 1800) return 'bg-yellow-100 dark:bg-yellow-900/30';
        if (total < 3600) return 'bg-yellow-200 dark:bg-yellow-800/50';
        return 'bg-yellow-300 dark:bg-yellow-700/70';
      }
    }
  };

  const getHourBorderColor = (wasteSeconds: number, productiveSeconds: number) => {
    const total = wasteSeconds + productiveSeconds;
    if (total === 0) return 'border-gray-200 dark:border-gray-700';
    if (wasteSeconds > productiveSeconds) return 'border-red-300 dark:border-red-600';
    if (productiveSeconds > wasteSeconds) return 'border-green-300 dark:border-green-600';
    return 'border-yellow-300 dark:border-yellow-600';
  };

  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const hours = Array.from({ length: 24 }, (_, i) => i);

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200">
            Weekly Calendar View
          </h3>
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-500 dark:text-gray-400">View:</span>
            <div className="flex bg-gray-100 dark:bg-gray-700 rounded p-1 text-xs">
              <button
                onClick={() => setViewMode('waste')}
                className={`px-2 py-1 rounded transition-colors ${
                  viewMode === 'waste' 
                    ? 'bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100' 
                    : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100'
                }`}
              >
                Waste
              </button>
              <button
                onClick={() => setViewMode('productive')}
                className={`px-2 py-1 rounded transition-colors ${
                  viewMode === 'productive' 
                    ? 'bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100' 
                    : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100'
                }`}
              >
                Productive
              </button>
              <button
                onClick={() => setViewMode('both')}
                className={`px-2 py-1 rounded transition-colors ${
                  viewMode === 'both' 
                    ? 'bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100' 
                    : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100'
                }`}
              >
                Both
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="overflow-x-auto bg-white dark:bg-gray-800 rounded-b-lg">
        <div className="min-w-full bg-white dark:bg-gray-800">
          {/* Day Headers */}
          <div className="grid grid-cols-8 border-b border-gray-200 dark:border-gray-700">
            <div className="p-2 text-sm font-medium text-gray-500 dark:text-gray-400 border-r border-gray-200 dark:border-gray-700">
              Time
            </div>
            {data.dailyData.map((day, index) => {
              const date = new Date(day.date);
              const isToday = date.toDateString() === new Date().toDateString();
              return (
                <div 
                  key={index}
                  className={`p-2 text-center text-sm font-medium border-r border-gray-200 dark:border-gray-700 ${
                    isToday 
                      ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300' 
                      : 'text-gray-700 dark:text-gray-300'
                  }`}
                >
                  <div>{dayNames[day.dayOfWeek]}</div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    {date.getMonth() + 1}/{date.getDate()}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Hour Rows */}
          {hours.map(hour => (
            <div key={hour} className="grid grid-cols-8 border-b border-gray-100 dark:border-gray-700">
              {/* Time Label */}
              <div className="p-2 text-xs text-gray-500 dark:text-gray-400 border-r border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
                {hour.toString().padStart(2, '0')}:00
              </div>
              
              {/* Day Cells */}
              {data.dailyData.map((day, dayIndex) => {
                const hourData = day.hourlyData[hour];
                const isSelected = selectedHour?.date === day.date && selectedHour?.hour === hour;
                
                return (
                  <div
                    key={dayIndex}
                    className={`p-1 min-h-[40px] border-r border-gray-200 dark:border-gray-700 cursor-pointer transition-all hover:shadow-sm ${
                      getHourColor(hourData.wasteSeconds, hourData.productiveSeconds, viewMode)
                    } ${getHourBorderColor(hourData.wasteSeconds, hourData.productiveSeconds)} ${
                      isSelected ? 'ring-2 ring-blue-500 dark:ring-blue-400' : ''
                    }`}
                    onClick={() => {
                      setSelectedHour({ date: day.date, hour });
                      onHourClick?.(day.date, hour, hourData.sessions);
                    }}
                    title={`${hour.toString().padStart(2, '0')}:00 - ${(hour + 1).toString().padStart(2, '0')}:00
Waste: ${formatDuration(hourData.wasteSeconds)}
Productive: ${formatDuration(hourData.productiveSeconds)}
Sessions: ${hourData.sessions.length}`}
                  >
                    <div className="text-xs text-gray-600 dark:text-gray-300">
                      {viewMode === 'waste' && formatDuration(hourData.wasteSeconds)}
                      {viewMode === 'productive' && formatDuration(hourData.productiveSeconds)}
                      {viewMode === 'both' && (
                        <div className="space-y-0.5">
                          <div className="text-red-600 dark:text-red-400">
                            {formatDuration(hourData.wasteSeconds)}
                          </div>
                          <div className="text-green-600 dark:text-green-400">
                            {formatDuration(hourData.productiveSeconds)}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      {/* Legend */}
      <div className="p-4 border-t border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
          <span>Less</span>
          <div className="flex space-x-1">
            {viewMode === 'waste' ? (
              <>
                <div className="w-3 h-3 rounded bg-red-100 dark:bg-red-900/30"></div>
                <div className="w-3 h-3 rounded bg-red-200 dark:bg-red-800/50"></div>
                <div className="w-3 h-3 rounded bg-red-300 dark:bg-red-700/70"></div>
                <div className="w-3 h-3 rounded bg-red-400 dark:bg-red-600/80"></div>
              </>
            ) : viewMode === 'productive' ? (
              <>
                <div className="w-3 h-3 rounded bg-green-100 dark:bg-green-900/30"></div>
                <div className="w-3 h-3 rounded bg-green-200 dark:bg-green-800/50"></div>
                <div className="w-3 h-3 rounded bg-green-300 dark:bg-green-700/70"></div>
                <div className="w-3 h-3 rounded bg-green-400 dark:bg-green-600/80"></div>
              </>
            ) : (
              <>
                <div className="w-3 h-3 rounded bg-red-100 dark:bg-red-900/30"></div>
                <div className="w-3 h-3 rounded bg-yellow-100 dark:bg-yellow-900/30"></div>
                <div className="w-3 h-3 rounded bg-green-100 dark:bg-green-900/30"></div>
                <div className="w-3 h-3 rounded bg-blue-100 dark:bg-blue-900/30"></div>
              </>
            )}
          </div>
          <span>More</span>
        </div>
      </div>

      {/* Selected Hour Details */}
      {selectedHour && (
        <div className="p-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
          <h4 className="text-sm font-medium text-gray-800 dark:text-gray-200 mb-2">
            {new Date(selectedHour.date).toLocaleDateString()} at {selectedHour.hour.toString().padStart(2, '0')}:00
          </h4>
          <div className="text-xs text-gray-600 dark:text-gray-400">
            Click on any hour cell to view detailed session information.
          </div>
        </div>
      )}
    </div>
  );
};

export default WeeklyCalendarView;
