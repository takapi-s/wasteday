// Common types for Dashboard components
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

export type HourlyData = {
  hour: number;
  wasteSeconds: number;
  productiveSeconds: number;
  sessions: Array<{
    id: string;
    startTime: string;
    durationSeconds: number;
    category: string;
    identifier: string;
    isWaste: boolean;
  }>;
};

export type WeeklyCalendarData = {
  weekStart: string;
  dailyData: Array<{
    date: string;
    dayOfWeek: number; // 0=Sunday, 1=Monday, etc.
    hourlyData: HourlyData[];
  }>;
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

// Database status types
export interface DatabaseStatus {
  connected?: boolean;
  loading?: boolean;
  error?: string | null;
}

// Utility functions are now in utils/formatters.ts
