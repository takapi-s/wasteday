import { useEffect, useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import type { WeeklyData, DailyData } from '@wasteday/ui';

type LocalSession = { id: string; start_time: string; duration_seconds: number; session_key: string };
type WasteCategory = { id?: number; type: string; identifier: string; label: 'waste' | 'productive' | string; is_active: boolean };

export const useLocalWeeklyData = (offsetWeeks: number = 0) => {
  const [weeklyData, setWeeklyData] = useState<WeeklyData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchWeeklyData = async () => {
      try {
        setLoading(true);
        setError(null);

        const now = new Date();
        const dayOfWeek = now.getDay();
        const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
        const weekStart = new Date(now);
        weekStart.setDate(now.getDate() - daysToMonday + (offsetWeeks * 7));
        weekStart.setHours(0, 0, 0, 0);

        const previousWeekStart = new Date(weekStart);
        previousWeekStart.setDate(weekStart.getDate() - 7);

        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekStart.getDate() + 7);

        const previousWeekEnd = new Date(previousWeekStart);
        previousWeekEnd.setDate(previousWeekStart.getDate() + 7);

        const [thisWeekSessions, previousWeekSessions, categories] = await Promise.all([
          invoke<LocalSession[]>('db_get_sessions', { query: { since: weekStart.toISOString(), until: weekEnd.toISOString() } }),
          invoke<LocalSession[]>('db_get_sessions', { query: { since: previousWeekStart.toISOString(), until: previousWeekEnd.toISOString() } }),
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

        const dailyBreakdown: DailyData[] = [];
        for (let i = 0; i < 7; i++) {
          const dayStart = new Date(weekStart);
          dayStart.setDate(weekStart.getDate() + i);
          const dayEnd = new Date(dayStart);
          dayEnd.setDate(dayStart.getDate() + 1);

          const daySessions = thisWeekSessions.filter(s => {
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

          dailyBreakdown.push({
            date: dayStart.toISOString(),
            wasteSeconds,
            productiveSeconds,
          });
        }

        const totalWasteSeconds = dailyBreakdown.reduce((s, d) => s + d.wasteSeconds, 0);
        const totalProductiveSeconds = dailyBreakdown.reduce((s, d) => s + d.productiveSeconds, 0);
        let previousWeekWasteSeconds = 0;
        let previousWeekProductiveSeconds = 0;
        for (const session of previousWeekSessions) {
          if (!session.duration_seconds || session.duration_seconds <= 0) continue;
          const meta = parseSessionKey(session.session_key);
          if (isWaste(meta.category, meta.identifier)) previousWeekWasteSeconds += session.duration_seconds; else previousWeekProductiveSeconds += session.duration_seconds;
        }
        const previousWeekComparison = previousWeekWasteSeconds > 0
          ? Math.round(((totalWasteSeconds - previousWeekWasteSeconds) / previousWeekWasteSeconds) * 100)
          : 0;
        const previousWeekComparisonProductive = previousWeekProductiveSeconds > 0
          ? Math.round(((totalProductiveSeconds - previousWeekProductiveSeconds) / previousWeekProductiveSeconds) * 100)
          : 0;

        setWeeklyData({
          weekStart: weekStart.toISOString(),
          totalWasteSeconds,
          totalProductiveSeconds,
          dailyBreakdown,
          previousWeekComparison,
          previousWeekComparisonProductive,
        });
        setLoading(false);
      } catch (err) {
        console.error('Failed to fetch local weekly data:', err);
        setError(err instanceof Error ? err.message : 'Unknown error');
        setLoading(false);
      }
    };

    fetchWeeklyData();
    const interval = setInterval(fetchWeeklyData, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [offsetWeeks]);

  return { weeklyData, loading, error };
};


