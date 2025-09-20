import React from 'react';
import WeeklyCalendarView from '../charts/WeeklyCalendarView';
import { WeeklyDailyChart } from './WeeklyDailyChart';
import type { 
  TimeSeriesPoint, 
  WeeklyData, 
  WeeklyCalendarData, 
  MonthlyData,
  PeriodType 
} from '../../types';
import { formatDuration } from '../../utils';

interface DashboardChartsProps {
  selectedPeriod: PeriodType;
  
  // Today chart data
  last24hSeries: TimeSeriesPoint[];
  binMinutes?: number;
  
  // Week chart data
  weeklyData?: WeeklyData;
  weeklyCalendarData?: WeeklyCalendarData;
  weekViewMode?: 'chart' | 'calendar';
  weekOffset?: number;
  
  // Month chart data
  monthlyData?: MonthlyData;
  monthOffset?: number;
  calendarMetric?: 'waste' | 'productive';
}

export const DashboardCharts: React.FC<DashboardChartsProps> = ({
  selectedPeriod,
  last24hSeries,
  binMinutes = 20,
  weeklyData,
  weeklyCalendarData,
  weekViewMode,
  weekOffset = 0,
  monthlyData,
  monthOffset = 0,
  calendarMetric = 'waste',
}) => {
  // formatDuration is now imported from utils

  const getDayColor = (seconds: number, metric: 'waste' | 'productive') => {
    if (metric === 'productive') {
      if (seconds === 0) return 'bg-gray-100 dark:bg-gray-700 text-gray-400';
      if (seconds < 1800) return 'bg-green-50 dark:bg-green-950 text-green-700 dark:text-green-200';
      if (seconds < 3600) return 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200';
      if (seconds < 7200) return 'bg-green-200 dark:bg-green-800 text-green-900 dark:text-green-100';
      return 'bg-green-300 dark:bg-green-700 text-green-900 dark:text-green-100';
    }
    if (seconds === 0) return 'bg-gray-100 dark:bg-gray-700 text-gray-400';
    if (seconds < 1800) return 'bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200';
    if (seconds < 3600) return 'bg-orange-100 dark:bg-orange-900 text-orange-800 dark:text-orange-200';
    if (seconds < 7200) return 'bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200';
    return 'bg-red-200 dark:bg-red-800 text-red-900 dark:text-red-100';
  };

  return (
    <div className="space-y-6">
      {/* Today Activity Chart */}
      {selectedPeriod === 'today' && (
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 h-96">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200">Activity Chart</h3>
            <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
              <span>Last 24h</span>
              <span>•</span>
              <span>{binMinutes}m intervals</span>
            </div>
          </div>
        
          {/* 固定表示のためコントロールは非表示 */}
          <div className="relative">
            <div className="grid grid-cols-[auto_1fr] gap-2">
              {/* 左: 時刻ラベル */}
              <div className="h-64 grid text-[10px] leading-3 text-gray-500 dark:text-gray-400 select-none bg-white dark:bg-gray-800" 
                   style={{ gridTemplateRows: `repeat(${last24hSeries.length}, 1fr)` }}>
                {last24hSeries.map((p, idx, arr) => {
                  const d = new Date(p.timestamp);
                  const hour = d.getHours().toString().padStart(2, '0');
                  const minute = d.getMinutes().toString().padStart(2, '0');
                  const isLast = idx === arr.length - 1;
                  // 3時間ごとにだけラベルを表示
                  const minutesFromStart = idx * binMinutes;
                  const showLabel = minutesFromStart % 180 === 0 || isLast;
                  const timeLabel = binMinutes < 60 ? `${hour}:${minute}` : hour;
                  return (
                    <div key={`y-${idx}`} className="flex items-center justify-end pr-1">
                      {showLabel ? (isLast ? 'Now' : timeLabel) : ''}
                    </div>
                  );
                })}
              </div>
              {/* 右: SVG波 */}
              <div className="relative h-64 bg-white dark:bg-gray-800">
                {(() => {
                  const visibleCount = last24hSeries.length;
                  const svgHeight = Math.max(256, visibleCount * 20); // 最小20px/点
                  const centerX = 300;
                  const widthHalf = 280;
                  
                  return (
                    <svg viewBox={`0 0 600 ${svgHeight}`} preserveAspectRatio="none" className="w-full h-full bg-white dark:bg-gray-800">
                      {/* 背景ラインと中央軸 */}
                      <line x1="300" y1="0" x2="300" y2={svgHeight} className="stroke-gray-300 dark:stroke-gray-700" strokeWidth="1" />
                      {(() => {
                        if (visibleCount <= 1) return null;
                        const step = svgHeight / (visibleCount - 1);
                        return Array.from({ length: visibleCount }).map((_, i) => (
                          <line key={`row-${i}`} x1="0" x2="600" y1={i * step} y2={i * step} className="stroke-gray-200 dark:stroke-gray-700" strokeWidth="0.5" />
                        ));
                      })()}

                      {(() => {
                        const bins = last24hSeries.slice(-visibleCount);
                        const toY = (idx: number) => idx * (svgHeight / Math.max(1, bins.length - 1));
                        const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v));

                        // 各点の比率（0..1）を左右にマッピング（ビン幅=最大1.0）
                        const binSeconds = Math.max(1, binMinutes * 60);
                        const wasteXs = bins.map(b => centerX + widthHalf * clamp((b.activeSeconds / binSeconds), 0, 1));
                        const prodXs  = bins.map(b => centerX - widthHalf * clamp((b.idleSeconds   / binSeconds), 0, 1));
                        const ys      = bins.map((_, i) => toY(i));

                        // パス生成（滑らかさ簡易: 直線→二次ベジェ）
                        const buildPath = (xs: number[], ys: number[]) => {
                          if (xs.length === 0) return '';
                          let d = `M ${xs[0]} ${ys[0]}`;
                          for (let i = 1; i < xs.length; i++) {
                            const cx = (xs[i-1] + xs[i]) / 2;
                            const cy = (ys[i-1] + ys[i]) / 2;
                            d += ` Q ${xs[i-1]} ${ys[i-1]}, ${cx} ${cy}`;
                            d += ` T ${xs[i]} ${ys[i]}`;
                          }
                          return d;
                        };

                        const pathWaste = buildPath(wasteXs, ys);
                        const pathProd  = buildPath(prodXs, ys);

                        return (
                          <g>
                            {/* 塗りつぶし（中心まで） */}
                            <path d={`${pathProd} L ${centerX} ${ys[ys.length-1]} L ${centerX} ${ys[0]} Z`} fill="url(#prodFill)" opacity="0.25" />
                            <path d={`${pathWaste} L ${centerX} ${ys[ys.length-1]} L ${centerX} ${ys[0]} Z`} fill="url(#wasteFill)" opacity="0.25" />
                            {/* 線 */}
                            <path d={pathProd} stroke="#22c55e" strokeWidth="2" fill="none" />
                            <path d={pathWaste} stroke="#ef4444" strokeWidth="2" fill="none" />
                            {/* グラデ定義 */}
                            <defs>
                              <linearGradient id="prodFill" x1="0" x2="1" y1="0" y2="0">
                                <stop offset="0%" stopColor="#22c55e" />
                                <stop offset="100%" stopColor="#22c55e" stopOpacity="0" />
                              </linearGradient>
                              <linearGradient id="wasteFill" x1="1" x2="0" y1="0" y2="0">
                                <stop offset="0%" stopColor="#ef4444" />
                                <stop offset="100%" stopColor="#ef4444" stopOpacity="0" />
                              </linearGradient>
                            </defs>
                          </g>
                        );
                      })()}
                    </svg>
                  );
                })()}
              </div>
            </div>
          </div>
          <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">
            Left=Productive (green), Right=Waste (red). Smooth curves toward the center.
          </div>
        </div>
      )}

      {/* Weekly Daily Chart */}
      {selectedPeriod === 'week' && weeklyData && weekViewMode === 'chart' && (
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200">
              {weekOffset === 0 ? 'Daily Trend (This Week)' : 
               weekOffset === -1 ? 'Daily Trend (Last Week)' : 
               weekOffset === 1 ? 'Daily Trend (Next Week)' : 'Daily Trend (Weekly)'}
            </h3>
            <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-green-500"></div>
                <span>Productive</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-red-500"></div>
                <span>Waste</span>
              </div>
            </div>
          </div>
          <div className="relative h-56 bg-white dark:bg-gray-800">
            <WeeklyDailyChart weeklyData={weeklyData} />
          </div>
        </div>
      )}

      {/* Weekly Calendar View */}
      {selectedPeriod === 'week' && weeklyCalendarData && weekViewMode === 'calendar' && (
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200">
              {weekOffset === 0 ? 'Weekly Calendar (This Week)' : 
               weekOffset === -1 ? 'Weekly Calendar (Last Week)' : 
               weekOffset === 1 ? 'Weekly Calendar (Next Week)' : 'Weekly Calendar'}
            </h3>
            <div className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              Click on any hour cell to view detailed session information. Colors indicate activity levels.
            </div>
            <WeeklyCalendarView 
              data={weeklyCalendarData} 
              onHourClick={(date, hour, sessions) => {
                console.log('Hour clicked:', { date, hour, sessions });
              }}
            />
          </div>
        </div>
      )}

      {/* Monthly Calendar View */}
      {selectedPeriod === 'month' && monthlyData && (
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
          <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-4">
            {(() => {
              const targetDate = new Date();
              targetDate.setMonth(targetDate.getMonth() + monthOffset);
              return `${targetDate.getFullYear()} / ${targetDate.getMonth() + 1}`;
            })()}
          </h3>
          <div className="grid grid-cols-7 gap-1 bg-white dark:bg-gray-800">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
              <div key={day} className="text-center text-sm font-medium text-gray-500 p-2">
                {day}
              </div>
            ))}
            {monthlyData.calendarDays.map((day, index) => {
              return (
                <div 
                  key={index}
                  className={`p-2 text-center text-sm rounded-lg cursor-pointer min-h-[60px] flex flex-col justify-center ${
                    day.isCurrentMonth 
                      ? getDayColor(calendarMetric === 'waste' ? day.wasteSeconds : day.productiveSeconds, calendarMetric)
                      : 'text-gray-300 dark:text-gray-600'
                  }`}
                  title={`${day.day}: Waste ${formatDuration(day.wasteSeconds)} / Productive ${formatDuration(day.productiveSeconds)}`}
                >
                  <div className="font-medium">{day.day}</div>
                  {day.isCurrentMonth && (
                    <div className="text-xs mt-1">
                      {calendarMetric === 'waste' 
                        ? formatDuration(day.wasteSeconds) 
                        : formatDuration(day.productiveSeconds)}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          <div className="mt-4 flex items-center justify-between text-xs text-gray-500">
            <span>Less</span>
            <div className="flex space-x-1">
              {calendarMetric === 'productive' ? (
                <>
                  <div className="w-3 h-3 rounded bg-green-50 dark:bg-green-950"></div>
                  <div className="w-3 h-3 rounded bg-green-100 dark:bg-green-900"></div>
                  <div className="w-3 h-3 rounded bg-green-200 dark:bg-green-800"></div>
                  <div className="w-3 h-3 rounded bg-green-300 dark:bg-green-700"></div>
                </>
              ) : (
                <>
                  <div className="w-3 h-3 rounded bg-yellow-100 dark:bg-yellow-900"></div>
                  <div className="w-3 h-3 rounded bg-orange-100 dark:bg-orange-900"></div>
                  <div className="w-3 h-3 rounded bg-red-100 dark:bg-red-900"></div>
                  <div className="w-3 h-3 rounded bg-red-200 dark:bg-red-800"></div>
                </>
              )}
            </div>
            <span>More</span>
          </div>
        </div>
      )}
    </div>
  );
};
