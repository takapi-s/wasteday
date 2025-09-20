import { useEffect, useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import type { MonthlyData, WeeklyData, CalendarDay } from '@wasteday/ui';
import { useCategoryEventEmitter } from './useCategoryEventEmitter';

type LocalSession = { id: string; start_time: string; duration_seconds: number; session_key: string };
type WasteCategory = { id?: number; type: string; identifier: string; label: 'waste' | 'productive' | string; is_active: boolean };

export const useLocalMonthlyData = (offsetMonths: number = 0) => {
  const [monthlyData, setMonthlyData] = useState<MonthlyData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { subscribe } = useCategoryEventEmitter();

  useEffect(() => {
    const fetchMonthlyData = async () => {
      try {
        setLoading(true);
        setError(null);

        const now = new Date();
        const baseMonth = new Date(now.getFullYear(), now.getMonth() + offsetMonths, 1);
        const monthStart = new Date(baseMonth.getFullYear(), baseMonth.getMonth(), 1);
        const monthEnd = new Date(baseMonth.getFullYear(), baseMonth.getMonth() + 1, 1);
        const previousMonthStart = new Date(baseMonth.getFullYear(), baseMonth.getMonth() - 1, 1);
        const previousMonthEnd = new Date(baseMonth.getFullYear(), baseMonth.getMonth(), 1);

        const [thisMonthSessions, previousMonthSessions, categories] = await Promise.all([
          invoke<LocalSession[]>('db_get_sessions', { query: { since: monthStart.toISOString(), until: monthEnd.toISOString() } }),
          invoke<LocalSession[]>('db_get_sessions', { query: { since: previousMonthStart.toISOString(), until: previousMonthEnd.toISOString() } }),
          invoke<WasteCategory[]>('db_list_waste_categories'),
        ]);

        const isWaste = (type?: string, identifier?: string): boolean => {
          if (!type || !identifier) return false;
          const t = (type || '').toLowerCase();
          const id = (identifier || '').toLowerCase();
          return categories.some(c => c.is_active && c.type.toLowerCase() === t && (c.identifier || '').toLowerCase() === id && c.label === 'waste');
        };

        const parseSessionKey = (key: string): { category?: string; identifier?: string; user_state?: string } => {
          const obj: Record<string, string> = {};
          for (const part of key.split(';')) {
            const [k, v] = part.split('=');
            if (k && v) obj[k] = v;
          }
          return { category: obj['category'], identifier: obj['identifier'], user_state: obj['user_state'] };
        };

        // calendar days (6 weeks grid)
        const calendarDays: CalendarDay[] = [];
        const firstDayOfMonth = new Date(monthStart);
        const lastDayOfMonth = new Date(monthEnd.getTime() - 1);
        const gridStart = new Date(firstDayOfMonth);
        gridStart.setDate(gridStart.getDate() - firstDayOfMonth.getDay());
        for (let i = 0; i < 42; i++) {
          const currentDate = new Date(gridStart);
          currentDate.setDate(gridStart.getDate() + i);
          const isCurrentMonth = currentDate.getMonth() === baseMonth.getMonth();
          const dayStart = new Date(currentDate);
          dayStart.setHours(0, 0, 0, 0);
          const dayEnd = new Date(currentDate);
          dayEnd.setHours(23, 59, 59, 999);
          const daySessions = thisMonthSessions.filter(s => {
            const t = new Date(s.start_time);
            return t >= dayStart && t < dayEnd;
          });
          let wasteSeconds = 0;
          let productiveSeconds = 0;
          for (const session of daySessions) {
            if (!session.duration_seconds || session.duration_seconds <= 0) continue;
            const meta = parseSessionKey(session.session_key);
            if (isWaste(meta.category, meta.identifier)) wasteSeconds += session.duration_seconds; else productiveSeconds += session.duration_seconds;
          }
          calendarDays.push({ day: currentDate.getDate(), isCurrentMonth, wasteSeconds, productiveSeconds });
        }

        // weekly breakdown (month span)
        const weeklyBreakdown: WeeklyData[] = [];
        const weeksInMonth = Math.ceil(lastDayOfMonth.getDate() / 7);
        for (let week = 0; week < weeksInMonth; week++) {
          const weekStart = new Date(monthStart);
          weekStart.setDate(monthStart.getDate() + (week * 7));
          const weekEnd = new Date(weekStart);
          weekEnd.setDate(weekStart.getDate() + 7);
          const weekSessions = thisMonthSessions.filter(s => {
            const t = new Date(s.start_time);
            return t >= weekStart && t < weekEnd;
          });
          let weekWasteSeconds = 0;
          let weekProductiveSeconds = 0;
          for (const session of weekSessions) {
            if (!session.duration_seconds || session.duration_seconds <= 0) continue;
            const meta = parseSessionKey(session.session_key);
            if (isWaste(meta.category, meta.identifier)) weekWasteSeconds += session.duration_seconds; else weekProductiveSeconds += session.duration_seconds;
          }
          // daily within week for current month days
          const dailyBreakdown: any[] = [];
          for (let day = 0; day < 7; day++) {
            const dayDate = new Date(weekStart);
            dayDate.setDate(weekStart.getDate() + day);
            if (dayDate.getMonth() === baseMonth.getMonth()) {
              const dayStart = new Date(dayDate);
              dayStart.setHours(0,0,0,0);
              const dayEnd = new Date(dayDate);
              dayEnd.setHours(23,59,59,999);
              const daySessions = weekSessions.filter(s => {
                const t = new Date(s.start_time);
                return t >= dayStart && t < dayEnd;
              });
              let dayWasteSeconds = 0;
              let dayProductiveSeconds = 0;
              for (const session of daySessions) {
                if (!session.duration_seconds || session.duration_seconds <= 0) continue;
                const meta = parseSessionKey(session.session_key);
                if (isWaste(meta.category, meta.identifier)) dayWasteSeconds += session.duration_seconds; else dayProductiveSeconds += session.duration_seconds;
              }
              dailyBreakdown.push({ date: dayDate.toISOString(), wasteSeconds: dayWasteSeconds, productiveSeconds: dayProductiveSeconds });
            }
          }
          weeklyBreakdown.push({ weekStart: weekStart.toISOString(), totalWasteSeconds: weekWasteSeconds, totalProductiveSeconds: weekProductiveSeconds, dailyBreakdown, previousWeekComparison: 0 });
        }

        const totalWasteSeconds = weeklyBreakdown.reduce((s, w) => s + w.totalWasteSeconds, 0);
        const totalProductiveSeconds = weeklyBreakdown.reduce((s, w) => s + w.totalProductiveSeconds, 0);

        let previousMonthWasteSeconds = 0;
        let previousMonthProductiveSeconds = 0;
        for (const session of previousMonthSessions) {
          if (!session.duration_seconds || session.duration_seconds <= 0) continue;
          const meta = parseSessionKey(session.session_key);
          if (isWaste(meta.category, meta.identifier)) previousMonthWasteSeconds += session.duration_seconds; else previousMonthProductiveSeconds += session.duration_seconds;
        }
        const previousMonthComparison = previousMonthWasteSeconds > 0 ? Math.round(((totalWasteSeconds - previousMonthWasteSeconds) / previousMonthWasteSeconds) * 100) : 0;
        const previousMonthComparisonProductive = previousMonthProductiveSeconds > 0 ? Math.round(((totalProductiveSeconds - previousMonthProductiveSeconds) / previousMonthProductiveSeconds) * 100) : 0;

        setMonthlyData({
          month: `${baseMonth.getFullYear()}-${(baseMonth.getMonth() + 1).toString().padStart(2, '0')}`,
          totalWasteSeconds,
          totalProductiveSeconds,
          weeklyBreakdown,
          previousMonthComparison,
          previousMonthComparisonProductive,
          calendarDays,
        });
        setLoading(false);
      } catch (err) {
        console.error('Failed to fetch local monthly data:', err);
        setError(err instanceof Error ? err.message : 'Unknown error');
        setLoading(false);
      }
    };

    fetchMonthlyData();
    const interval = setInterval(fetchMonthlyData, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [offsetMonths]);

  // カテゴリー変更イベントを監視してデータを再取得
  useEffect(() => {
    const unsubscribe = subscribe((event) => {
      console.log('[useLocalMonthlyData] Category change detected, refreshing data...', event);
      setLoading(true);
    });

    return unsubscribe;
  }, [subscribe]);

  return { monthlyData, loading, error };
};


