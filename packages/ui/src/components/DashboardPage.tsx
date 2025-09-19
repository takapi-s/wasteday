import React, { useState } from 'react';

export type TimeSeriesPoint = { timestamp: string; activeSeconds: number; idleSeconds: number };
export type TopItem = { label: string; seconds: number };

export type DailyData = {
  date: string;
  wasteSeconds: number;
  productiveSeconds: number;
  goalAchieved?: boolean;
};

export type WeeklyData = {
  weekStart: string;
  totalWasteSeconds: number;
  totalProductiveSeconds: number;
  dailyBreakdown: DailyData[];
  previousWeekComparison: number;
  previousWeekComparisonProductive?: number;
  goalAchievedDays?: number;
};

export type MonthlyData = {
  month: string;
  totalWasteSeconds: number;
  totalProductiveSeconds: number;
  weeklyBreakdown: WeeklyData[];
  previousMonthComparison: number;
  previousMonthComparisonProductive?: number;
  calendarDays: CalendarDay[];
  goalAchievedDays?: number;
};

export type CalendarDay = {
  day: number;
  isCurrentMonth: boolean;
  wasteSeconds: number;
  productiveSeconds: number;
  goalAchieved?: boolean;
};

export type PeriodType = 'today' | 'week' | 'month';

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

function formatDuration(totalSeconds: number): string {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  return `${h}h ${m}m`;
}

// 子コンポーネント: Weekly Daily Chart（実測幅対応）
const WeeklyDailyChart: React.FC<{ weeklyData: WeeklyData }> = ({ weeklyData }) => {
  const containerRef = React.useRef<HTMLDivElement | null>(null);
  const [containerWidth, setContainerWidth] = React.useState<number>(600);

  React.useEffect(() => {
    if (!containerRef.current) return;
    const el = containerRef.current;
    const ro = new ResizeObserver(entries => {
      for (const entry of entries) {
        const cr = entry.contentRect;
        setContainerWidth(cr.width);
      }
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const paddingLeft = 30; // y軸ラベル余白
  const paddingRight = 10;
  const paddingTop = 10;
  const paddingBottom = 24; // x軸ラベル余白
  const width = Math.max(320, containerWidth);
  const height = 220;
  const plotWidth = width - paddingLeft - paddingRight;
  const plotHeight = height - paddingTop - paddingBottom;
  const days = weeklyData.dailyBreakdown;
  const maxValue = Math.max(1, ...days.map(d => Math.max(d.wasteSeconds, d.productiveSeconds)));
  const xStep = plotWidth / Math.max(1, days.length - 1);
  const x = (i: number) => paddingLeft + i * xStep;
  const y = (v: number) => paddingTop + (plotHeight - (v / maxValue) * plotHeight);
  const path = (values: number[]) => values.map((v, i) => `${i === 0 ? 'M' : 'L'} ${x(i)} ${y(v)}`).join(' ');
  const daysShort = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];

  const wasteValues = days.map(d => d.wasteSeconds);
  const prodValues  = days.map(d => d.productiveSeconds);

  return (
    <div ref={containerRef} className="absolute inset-0">
      <svg width={width} height={height}>
        {[0,0.25,0.5,0.75,1].map((p, idx) => (
          <line key={idx} x1={paddingLeft} x2={width - paddingRight} y1={paddingTop + plotHeight * p} y2={paddingTop + plotHeight * p} className="stroke-gray-200 dark:stroke-gray-700" strokeWidth="1" />
        ))}
        {[0,0.5,1].map((p, idx) => (
          <text key={idx} x={paddingLeft - 6} y={paddingTop + plotHeight * (1 - p)} textAnchor="end" dominantBaseline="middle" className="fill-gray-400" style={{ fontSize: 10 }}>
            {Math.round(maxValue * p / 3600)}h
          </text>
        ))}
        <path d={path(prodValues)} stroke="#22c55e" strokeWidth="2" fill="none" />
        <path d={path(wasteValues)} stroke="#ef4444" strokeWidth="2" fill="none" />
        {prodValues.map((v, i) => (
          <circle key={`p-${i}`} cx={x(i)} cy={y(v)} r="3" fill="#22c55e" />
        ))}
        {wasteValues.map((v, i) => (
          <circle key={`w-${i}`} cx={x(i)} cy={y(v)} r="3" fill="#ef4444" />
        ))}
        {days.map((d, i) => (
          <text key={`x-${i}`} x={x(i)} y={height - 6} textAnchor="middle" className="fill-gray-500" style={{ fontSize: 10 }}>
            {daysShort[new Date(d.date).getDay()]}
          </text>
        ))}
        <g>
          <circle cx={width - 140} cy={16} r={4} fill="#22c55e" />
          <text x={width - 130} y={18} className="fill-gray-600 dark:fill-gray-300" style={{ fontSize: 10 }}>Productive</text>
          <circle cx={width - 70} cy={16} r={4} fill="#ef4444" />
          <text x={width - 60} y={18} className="fill-gray-600 dark:fill-gray-300" style={{ fontSize: 10 }}>Waste</text>
        </g>
      </svg>
    </div>
  );
};

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
  const weekOffset = currentWeekOffset ?? internalWeekOffset; // controlled or uncontrolled
  const monthOffset = currentMonthOffset ?? internalMonthOffset;
  
  const totalToday = todayActiveSeconds + todayIdleSeconds;
  const activePct = totalToday > 0 ? Math.round((todayActiveSeconds / totalToday) * 100) : 0;
  const idlePct = 100 - activePct;

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


  return (
    <div className="space-y-6">
      {/* Database Status Indicator */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Dashboard</h1>
        <div className="flex items-center gap-2">
          {databaseLoading ? (
            <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400">
              <div className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse"></div>
              <span className="text-sm">Checking local DB...</span>
            </div>
          ) : databaseConnected ? (
            <div className="flex items-center gap-2 text-green-600 dark:text-green-400">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <span className="text-sm">Local DB Ready</span>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-red-600 dark:text-red-400">
              <div className="w-2 h-2 bg-red-500 rounded-full"></div>
              <span className="text-sm">Local DB Unavailable</span>
            </div>
          )}
        </div>
      </div>

      {/* Period Selector */}
      <div className="flex space-x-1 bg-gray-100 dark:bg-gray-700 rounded-lg p-1 w-fit">
        <button 
          onClick={() => (onChangeSelectedPeriod ? onChangeSelectedPeriod('today') : setInternalSelectedPeriod('today'))}
          className={`px-4 py-2 text-sm rounded-md transition-colors ${
            selectedPeriod === 'today' 
              ? 'bg-white dark:bg-gray-800 shadow-sm text-gray-900 dark:text-gray-100' 
              : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100'
          }`}
        >
          Today
        </button>
        <button 
          onClick={() => (onChangeSelectedPeriod ? onChangeSelectedPeriod('week') : setInternalSelectedPeriod('week'))}
          className={`px-4 py-2 text-sm rounded-md transition-colors ${
            selectedPeriod === 'week' 
              ? 'bg-white dark:bg-gray-800 shadow-sm text-gray-900 dark:text-gray-100' 
              : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100'
          }`}
        >
          Week
        </button>
        <button 
          onClick={() => (onChangeSelectedPeriod ? onChangeSelectedPeriod('month') : setInternalSelectedPeriod('month'))}
          className={`px-4 py-2 text-sm rounded-md transition-colors ${
            selectedPeriod === 'month' 
              ? 'bg-white dark:bg-gray-800 shadow-sm text-gray-900 dark:text-gray-100' 
              : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100'
          }`}
        >
          Month
        </button>
      </div>

      {databaseError && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-red-500 rounded-full"></div>
            <span className="text-sm font-medium text-red-800 dark:text-red-200">Database Error</span>
          </div>
          <p className="text-sm text-red-700 dark:text-red-300 mt-1">{databaseError}</p>
        </div>
      )}

      {/* Summary cards */}
      {selectedPeriod === 'today' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
            <div className="text-sm text-gray-600 dark:text-gray-400">Waste Today</div>
            <div className="mt-1 text-2xl font-semibold text-gray-900 dark:text-gray-100">{formatDuration(todayActiveSeconds)}</div>
            <div className="mt-2 h-2 w-full bg-gray-100 dark:bg-gray-700 rounded">
              <div className="h-2 bg-red-500 rounded" style={{ width: `${activePct}%` }} />
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
            <div className="text-sm text-gray-600 dark:text-gray-400">Productive Today</div>
            <div className="mt-1 text-2xl font-semibold text-gray-900 dark:text-gray-100">{formatDuration(todayIdleSeconds)}</div>
            <div className="mt-2 h-2 w-full bg-gray-100 dark:bg-gray-700 rounded">
              <div className="h-2 bg-green-500 rounded" style={{ width: `${idlePct}%` }} />
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
            <div className="text-sm text-gray-600 dark:text-gray-400">Sessions (24h)</div>
            <div className="mt-1 text-2xl font-semibold text-gray-900 dark:text-gray-100">{sessionsCount}</div>
            <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">Based on recorded events</div>
          </div>
        </div>
      )}

      {/* Weekly Summary */}
      {selectedPeriod === 'week' && weeklyData && (
        <div className="space-y-4">
          {/* Week pagination controls */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <button
                onClick={() => (onChangeWeekOffset ? onChangeWeekOffset(weekOffset - 1) : setInternalWeekOffset(prev => prev - 1))}
                className="px-3 py-1 text-sm bg-gray-100 dark:bg-gray-700 rounded-md hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
              >
                ← Previous Week
              </button>
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                {weekOffset === 0 ? 'This Week' : 
                 weekOffset === -1 ? 'Last Week' : 
                 weekOffset === 1 ? 'Next Week' : 
                 `${weekOffset > 0 ? '+' : ''}${weekOffset}w`}
              </span>
              {weekOffset < 0 && (
                <button
                  onClick={() => (onChangeWeekOffset ? onChangeWeekOffset(weekOffset + 1) : setInternalWeekOffset(prev => Math.min(0, prev + 1)))}
                  className="px-3 py-1 text-sm bg-gray-100 dark:bg-gray-700 rounded-md hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                >
                  Next Week →
                </button>
              )}
            </div>
            {weekOffset !== 0 && (
              <button
                onClick={() => (onChangeWeekOffset ? onChangeWeekOffset(0) : setInternalWeekOffset(0))}
                className="px-3 py-1 text-sm bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 rounded-md hover:bg-blue-200 dark:hover:bg-blue-800 transition-colors"
              >
                Back to This Week
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
              <div className="text-sm text-gray-600 dark:text-gray-400">
                {currentWeekOffset === 0 ? 'Waste This Week' : 
                 currentWeekOffset === -1 ? 'Waste Last Week' : 
                 currentWeekOffset === 1 ? 'Waste Next Week' : 'Weekly Waste'}
              </div>
              <div className="mt-1 text-2xl font-semibold text-gray-900 dark:text-gray-100">{formatDuration(weeklyData.totalWasteSeconds)}</div>
              <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">Avg {formatDuration(Math.round(weeklyData.totalWasteSeconds / 7))}/day</div>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
              <div className="text-sm text-gray-600 dark:text-gray-400">WoW Change</div>
              <div className={`mt-1 text-2xl font-semibold ${weeklyData.previousWeekComparison >= 0 ? 'text-red-600' : 'text-green-600'}`}>
                {weeklyData.previousWeekComparison >= 0 ? '+' : ''}{weeklyData.previousWeekComparison}%
              </div>
              <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">{weeklyData.previousWeekComparison >= 0 ? 'Worse' : 'Better'}</div>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
              <div className="text-sm text-gray-600 dark:text-gray-400">WoW Change (Productive)</div>
              <div className={`mt-1 text-2xl font-semibold ${(weeklyData.previousWeekComparisonProductive ?? 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {(weeklyData.previousWeekComparisonProductive ?? 0) >= 0 ? '+' : ''}{weeklyData.previousWeekComparisonProductive ?? 0}%
              </div>
              <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">{(weeklyData.previousWeekComparisonProductive ?? 0) >= 0 ? 'Better' : 'Worse'}</div>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
              <div className="text-sm text-gray-600 dark:text-gray-400">Productive Time</div>
              <div className="mt-1 text-2xl font-semibold text-gray-900 dark:text-gray-100">{formatDuration(weeklyData.totalProductiveSeconds)}</div>
              <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">Avg {formatDuration(Math.round(weeklyData.totalProductiveSeconds / 7))}/day</div>
            </div>
          </div>
        </div>
      )}

      {/* Monthly Summary */}
      {selectedPeriod === 'month' && monthlyData && (
        <div className="space-y-4">
          {/* Month pagination controls */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <button
                onClick={() => (onChangeMonthOffset ? onChangeMonthOffset(monthOffset - 1) : setInternalMonthOffset(prev => prev - 1))}
                className="px-3 py-1 text-sm bg-gray-100 dark:bg-gray-700 rounded-md hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
              >
                ← Previous Month
              </button>
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                {monthOffset === 0 ? 'This Month' : 
                 monthOffset === -1 ? 'Last Month' : 
                 monthOffset === 1 ? 'Next Month' : 
                 `${monthOffset > 0 ? '+' : ''}${monthOffset}mo`}
              </span>
              {monthOffset < 0 && (
                <button
                  onClick={() => (onChangeMonthOffset ? onChangeMonthOffset(monthOffset + 1) : setInternalMonthOffset(prev => Math.min(0, prev + 1)))}
                  className="px-3 py-1 text-sm bg-gray-100 dark:bg-gray-700 rounded-md hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                >
                  Next Month →
                </button>
              )}
            </div>
            {monthOffset !== 0 && (
              <button
                onClick={() => (onChangeMonthOffset ? onChangeMonthOffset(0) : setInternalMonthOffset(0))}
                className="px-3 py-1 text-sm bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 rounded-md hover:bg-blue-200 dark:hover:bg-blue-800 transition-colors"
              >
                Back to This Month
              </button>
            )}
          </div>

          {/* Metric toggle */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500 dark:text-gray-400">Metric:</span>
            <div className="flex bg-gray-100 dark:bg-gray-700 rounded p-1 text-xs">
              <button
                onClick={() => setCalendarMetric('waste')}
                className={`px-2 py-1 rounded ${calendarMetric === 'waste' ? 'bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100' : 'text-gray-600 dark:text-gray-300'}`}
              >Waste</button>
              <button
                onClick={() => setCalendarMetric('productive')}
                className={`px-2 py-1 rounded ${calendarMetric === 'productive' ? 'bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100' : 'text-gray-600 dark:text-gray-300'}`}
              >Productive</button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
              <div className="text-sm text-gray-600 dark:text-gray-400">
                {currentMonthOffset === 0 ? 'Waste This Month' : 
                 currentMonthOffset === -1 ? 'Waste Last Month' : 
                 currentMonthOffset === 1 ? 'Waste Next Month' : 'Monthly Waste'}
              </div>
              <div className="mt-1 text-2xl font-semibold text-gray-900 dark:text-gray-100">{formatDuration(monthlyData.totalWasteSeconds)}</div>
              <div className="mt-2 text-sm text-gray-500 dark:text-gray-400">Avg {formatDuration(Math.round(monthlyData.totalWasteSeconds / 30))}/day</div>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
              <div className="text-sm text-gray-600 dark:text-gray-400">MoM Change</div>
              <div className={`mt-1 text-2xl font-semibold ${monthlyData.previousMonthComparison >= 0 ? 'text-red-600' : 'text-green-600'}`}>
                {monthlyData.previousMonthComparison >= 0 ? '+' : ''}{monthlyData.previousMonthComparison}%
              </div>
              <div className="mt-2 text-sm text-gray-500 dark:text-gray-400">{monthlyData.previousMonthComparison >= 0 ? 'Worse' : 'Better'}</div>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
              <div className="text-sm text-gray-600 dark:text-gray-400">MoM Change (Productive)</div>
              <div className={`mt-1 text-2xl font-semibold ${(monthlyData.previousMonthComparisonProductive ?? 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {(monthlyData.previousMonthComparisonProductive ?? 0) >= 0 ? '+' : ''}{monthlyData.previousMonthComparisonProductive ?? 0}%
              </div>
              <div className="mt-2 text-sm text-gray-500 dark:text-gray-400">{(monthlyData.previousMonthComparisonProductive ?? 0) >= 0 ? 'Better' : 'Worse'}</div>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
              <div className="text-sm text-gray-600 dark:text-gray-400">Productive Time</div>
              <div className="mt-1 text-2xl font-semibold text-gray-900 dark:text-gray-100">{formatDuration(monthlyData.totalProductiveSeconds)}</div>
              <div className="mt-2 text-sm text-gray-500 dark:text-gray-400">Avg {formatDuration(Math.round(monthlyData.totalProductiveSeconds / 30))}/day</div>
            </div>
          </div>
        </div>
      )}

      {/* Weekly Daily Chart */}
      {selectedPeriod === 'week' && weeklyData && (
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
          <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-4">
            {weekOffset === 0 ? 'Daily Trend (This Week)' : 
             weekOffset === -1 ? 'Daily Trend (Last Week)' : 
             weekOffset === 1 ? 'Daily Trend (Next Week)' : 'Daily Trend (Weekly)'}
          </h3>
          <div className="relative h-56">
            <WeeklyDailyChart weeklyData={weeklyData} />
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
          <div className="grid grid-cols-7 gap-1">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
              <div key={day} className="text-center text-sm font-medium text-gray-500 p-2">
                {day}
              </div>
            ))}
            {monthlyData.calendarDays.map((day, index) => {
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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 可変期間のSVG波表示 - 今日のみ表示 */}
        {selectedPeriod === 'today' && (
          <div className="lg:col-span-1 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
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
              <div className="h-64 grid text-[10px] leading-3 text-gray-500 dark:text-gray-400 select-none" 
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
              <div className="relative h-64">
                {(() => {
                  const visibleCount = last24hSeries.length;
                  const svgHeight = Math.max(256, visibleCount * 20); // 最小20px/点
                  const centerX = 300;
                  const widthHalf = 280;
                  
                  return (
                    <svg viewBox={`0 0 600 ${svgHeight}`} preserveAspectRatio="none" className="w-full h-full">
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

        {/* Ranking - 今日のみ表示 */}
        {selectedPeriod === 'today' && (
          <div className="lg:col-span-2 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
            <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-4">Top Apps (Today)</h3>
            {topWaste || topProductive ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div>
                  <h4 className="text-sm font-medium text-green-500 mb-2">Productive</h4>
                  <ul className="space-y-2">
                    {(topProductive || []).length === 0 && (
                      <li className="text-sm text-gray-500 dark:text-gray-400">No data</li>
                    )}
                    {(topProductive || []).slice(0,5).map((it, i) => (
                      <li key={`p-${i}`} className="flex items-center justify-between text-sm">
                        <span className="text-gray-700 dark:text-gray-300">{it.label}</span>
                        <span className="text-gray-900 dark:text-gray-100 font-medium">{formatDuration(it.seconds)}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                <div>
                  <h4 className="text-sm font-medium text-red-500 mb-2">Waste</h4>
                  <ul className="space-y-2">
                    {(topWaste || []).length === 0 && (
                      <li className="text-sm text-gray-500 dark:text-gray-400">No data</li>
                    )}
                    {(topWaste || []).slice(0,5).map((it, i) => (
                      <li key={`w-${i}`} className="flex items-center justify-between text-sm">
                        <span className="text-gray-700 dark:text-gray-300">{it.label}</span>
                        <span className="text-gray-900 dark:text-gray-100 font-medium">{formatDuration(it.seconds)}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            ) : (
              <ul className="space-y-2">
                {topIdentifiers.length === 0 && (
                  <li className="text-sm text-gray-500 dark:text-gray-400">No data</li>
                )}
                {topIdentifiers.map((it, i) => (
                  <li key={i} className="flex items-center justify-between text-sm">
                    <span className="text-gray-700 dark:text-gray-300">{it.label}</span>
                    <span className="text-gray-900 dark:text-gray-100 font-medium">{formatDuration(it.seconds)}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>
    </div>
  );
};


