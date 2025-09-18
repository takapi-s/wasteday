import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import type { WeeklyData, DailyData } from '@wasteday/ui';

export const useWeeklyData = () => {
  const [weeklyData, setWeeklyData] = useState<WeeklyData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!supabase) {
      setLoading(false);
      setError('Supabase not configured');
      return;
    }

    const fetchWeeklyData = async () => {
      try {
        setLoading(true);
        setError(null);

        // 今週の開始日（月曜日）を計算
        const now = new Date();
        const dayOfWeek = now.getDay();
        const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1; // 日曜日は6、月曜日は0
        const weekStart = new Date(now);
        weekStart.setDate(now.getDate() - daysToMonday);
        weekStart.setHours(0, 0, 0, 0);

        // 先週の開始日を計算
        const previousWeekStart = new Date(weekStart);
        previousWeekStart.setDate(weekStart.getDate() - 7);

        // 今週の終了日
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekStart.getDate() + 7);

        // 先週の終了日
        const previousWeekEnd = new Date(previousWeekStart);
        previousWeekEnd.setDate(previousWeekStart.getDate() + 7);

        const client = supabase as NonNullable<typeof supabase>;

        // 今週のセッションデータを取得
        const { data: thisWeekSessions, error: thisWeekError } = await client
          .from('sessions')
          .select('*')
          .gte('start_time', weekStart.toISOString())
          .lt('start_time', weekEnd.toISOString())
          .order('start_time', { ascending: true });

        if (thisWeekError) throw thisWeekError;

        // 先週のセッションデータを取得
        const { data: previousWeekSessions, error: prevWeekError } = await client
          .from('sessions')
          .select('*')
          .gte('start_time', previousWeekStart.toISOString())
          .lt('start_time', previousWeekEnd.toISOString());

        if (prevWeekError) throw prevWeekError;

        // 浪費カテゴリを取得
        const { data: categories, error: catError } = await client
          .from('waste_categories')
          .select('type,identifier,label,is_active');
        if (catError) throw catError;

        const isWaste = (type?: string, identifier?: string): boolean => {
          if (!type || !identifier) return false;
          const found = categories?.find(
            (c: any) => c.is_active && c.type === type && (c.identifier || '').toLowerCase() === (identifier || '').toLowerCase()
          );
          return found?.label === 'waste';
        };

        // セッションキーをパースする関数
        const parseSessionKey = (key: string): { category?: string; identifier?: string; user_state?: string } => {
          const obj: Record<string, string> = {};
          for (const part of key.split(';')) {
            const [k, v] = part.split('=');
            if (k && v) obj[k] = v;
          }
          return { category: obj['category'], identifier: obj['identifier'], user_state: obj['user_state'] };
        };

        // 今週の日別データを計算
        const dailyBreakdown: DailyData[] = [];
        for (let i = 0; i < 7; i++) {
          const dayStart = new Date(weekStart);
          dayStart.setDate(weekStart.getDate() + i);
          const dayEnd = new Date(dayStart);
          dayEnd.setDate(dayStart.getDate() + 1);

          const daySessions = thisWeekSessions?.filter(s => {
            const sessionTime = new Date(s.start_time);
            return sessionTime >= dayStart && sessionTime < dayEnd;
          }) || [];

          let wasteSeconds = 0;
          let productiveSeconds = 0;

          for (const session of daySessions) {
            if (!session.duration_seconds || session.duration_seconds <= 0) continue;
            const meta = parseSessionKey(session.session_key);
            if (isWaste(meta.category, meta.identifier)) {
              wasteSeconds += session.duration_seconds;
            } else {
              productiveSeconds += session.duration_seconds;
            }
          }

          // 目標達成判定（設定値: localStorage 'goalDailyWasteSeconds' を優先、未設定は 3600秒）
          let goalSeconds = 3600;
          try {
            const saved = localStorage.getItem('goalDailyWasteSeconds');
            if (saved) {
              const parsed = parseInt(saved, 10);
              if (!Number.isNaN(parsed) && parsed >= 0) goalSeconds = parsed;
            }
          } catch {}
          const goalAchieved = wasteSeconds <= goalSeconds;

          dailyBreakdown.push({
            date: dayStart.toISOString(),
            wasteSeconds,
            productiveSeconds,
            goalAchieved,
          });
        }

        // 今週の合計を計算
        const totalWasteSeconds = dailyBreakdown.reduce((sum, day) => sum + day.wasteSeconds, 0);
        const totalProductiveSeconds = dailyBreakdown.reduce((sum, day) => sum + day.productiveSeconds, 0);
        const goalAchievedDays = dailyBreakdown.filter(day => day.goalAchieved).length;

        // 先週の合計を計算
        let previousWeekWasteSeconds = 0;
        if (previousWeekSessions) {
          for (const session of previousWeekSessions) {
            if (!session.duration_seconds || session.duration_seconds <= 0) continue;
            const meta = parseSessionKey(session.session_key);
            if (isWaste(meta.category, meta.identifier)) {
              previousWeekWasteSeconds += session.duration_seconds;
            }
          }
        }

        // 先週比を計算
        const previousWeekComparison = previousWeekWasteSeconds > 0 
          ? Math.round(((totalWasteSeconds - previousWeekWasteSeconds) / previousWeekWasteSeconds) * 100)
          : 0;

        const weeklyData: WeeklyData = {
          weekStart: weekStart.toISOString(),
          totalWasteSeconds,
          totalProductiveSeconds,
          dailyBreakdown,
          goalAchievedDays,
          previousWeekComparison,
        };

        setWeeklyData(weeklyData);
        setLoading(false);

      } catch (err) {
        console.error('Failed to fetch weekly data:', err);
        setError(err instanceof Error ? err.message : 'Unknown error');
        setLoading(false);
      }
    };

    fetchWeeklyData();

    // 5分ごとにデータを更新
    const interval = setInterval(fetchWeeklyData, 5 * 60 * 1000);

    return () => clearInterval(interval);
  }, []);

  return { weeklyData, loading, error };
};

