import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import type { MonthlyData, WeeklyData, CalendarDay } from '@wasteday/ui';

export const useMonthlyData = () => {
  const [monthlyData, setMonthlyData] = useState<MonthlyData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!supabase) {
      setLoading(false);
      setError('Supabase not configured');
      return;
    }

    const fetchMonthlyData = async () => {
      try {
        setLoading(true);
        setError(null);

        const now = new Date();
        
        // 今月の開始日と終了日
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
        const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1);

        // 前月の開始日と終了日
        const previousMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const previousMonthEnd = new Date(now.getFullYear(), now.getMonth(), 1);

        const client = supabase as NonNullable<typeof supabase>;

        // 今月のセッションデータを取得
        const { data: thisMonthSessions, error: thisMonthError } = await client
          .from('sessions')
          .select('*')
          .gte('start_time', monthStart.toISOString())
          .lt('start_time', monthEnd.toISOString())
          .order('start_time', { ascending: true });

        if (thisMonthError) throw thisMonthError;

        // 前月のセッションデータを取得
        const { data: previousMonthSessions, error: prevMonthError } = await client
          .from('sessions')
          .select('*')
          .gte('start_time', previousMonthStart.toISOString())
          .lt('start_time', previousMonthEnd.toISOString());

        if (prevMonthError) throw prevMonthError;

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

        // カレンダー日付を生成
        const calendarDays: CalendarDay[] = [];
        const firstDayOfMonth = new Date(monthStart);
        const lastDayOfMonth = new Date(monthEnd.getTime() - 1);
        
        // 月の最初の日曜日から開始
        const startDate = new Date(firstDayOfMonth);
        startDate.setDate(startDate.getDate() - firstDayOfMonth.getDay());
        
        // 6週間分（42日）のカレンダーを生成
        for (let i = 0; i < 42; i++) {
          const currentDate = new Date(startDate);
          currentDate.setDate(startDate.getDate() + i);
          
          const isCurrentMonth = currentDate.getMonth() === now.getMonth();
          
          // その日のセッションデータを取得
          const dayStart = new Date(currentDate);
          dayStart.setHours(0, 0, 0, 0);
          const dayEnd = new Date(currentDate);
          dayEnd.setHours(23, 59, 59, 999);

          const daySessions = thisMonthSessions?.filter(s => {
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

          calendarDays.push({
            day: currentDate.getDate(),
            isCurrentMonth,
            wasteSeconds,
            productiveSeconds,
            goalAchieved,
          });
        }

        // 週別データを計算
        const weeklyBreakdown: WeeklyData[] = [];
        const weeksInMonth = Math.ceil(lastDayOfMonth.getDate() / 7);
        
        for (let week = 0; week < weeksInMonth; week++) {
          const weekStart = new Date(monthStart);
          weekStart.setDate(monthStart.getDate() + (week * 7));
          const weekEnd = new Date(weekStart);
          weekEnd.setDate(weekStart.getDate() + 7);

          const weekSessions = thisMonthSessions?.filter(s => {
            const sessionTime = new Date(s.start_time);
            return sessionTime >= weekStart && sessionTime < weekEnd;
          }) || [];

          let weekWasteSeconds = 0;
          let weekProductiveSeconds = 0;

          for (const session of weekSessions) {
            if (!session.duration_seconds || session.duration_seconds <= 0) continue;
            const meta = parseSessionKey(session.session_key);
            if (isWaste(meta.category, meta.identifier)) {
              weekWasteSeconds += session.duration_seconds;
            } else {
              weekProductiveSeconds += session.duration_seconds;
            }
          }

          // 週の日別データ
          const dailyBreakdown = [];
          for (let day = 0; day < 7; day++) {
            const dayDate = new Date(weekStart);
            dayDate.setDate(weekStart.getDate() + day);
            
            if (dayDate.getMonth() === now.getMonth()) {
              const dayStart = new Date(dayDate);
              dayStart.setHours(0, 0, 0, 0);
              const dayEnd = new Date(dayDate);
              dayEnd.setHours(23, 59, 59, 999);

              const daySessions = weekSessions.filter(s => {
                const sessionTime = new Date(s.start_time);
                return sessionTime >= dayStart && sessionTime < dayEnd;
              });

              let dayWasteSeconds = 0;
              let dayProductiveSeconds = 0;

              for (const session of daySessions) {
                if (!session.duration_seconds || session.duration_seconds <= 0) continue;
                const meta = parseSessionKey(session.session_key);
                if (isWaste(meta.category, meta.identifier)) {
                  dayWasteSeconds += session.duration_seconds;
                } else {
                  dayProductiveSeconds += session.duration_seconds;
                }
              }

              // 目標達成判定（設定値）
              let goalSeconds = 3600;
              try {
                const saved = localStorage.getItem('goalDailyWasteSeconds');
                if (saved) {
                  const parsed = parseInt(saved, 10);
                  if (!Number.isNaN(parsed) && parsed >= 0) goalSeconds = parsed;
                }
              } catch {}
              const goalAchieved = dayWasteSeconds <= goalSeconds;

              dailyBreakdown.push({
                date: dayDate.toISOString(),
                wasteSeconds: dayWasteSeconds,
                productiveSeconds: dayProductiveSeconds,
                goalAchieved,
              });
            }
          }

          const goalAchievedDays = dailyBreakdown.filter(day => day.goalAchieved).length;

          weeklyBreakdown.push({
            weekStart: weekStart.toISOString(),
            totalWasteSeconds: weekWasteSeconds,
            totalProductiveSeconds: weekProductiveSeconds,
            dailyBreakdown,
            goalAchievedDays,
            previousWeekComparison: 0, // 月次では週間比較は不要
          });
        }

        // 今月の合計を計算
        const totalWasteSeconds = weeklyBreakdown.reduce((sum, week) => sum + week.totalWasteSeconds, 0);
        const totalProductiveSeconds = weeklyBreakdown.reduce((sum, week) => sum + week.totalProductiveSeconds, 0);
        const goalAchievedDays = calendarDays.filter(day => day.isCurrentMonth && day.goalAchieved).length;

        // 前月の合計を計算
        let previousMonthWasteSeconds = 0;
        if (previousMonthSessions) {
          for (const session of previousMonthSessions) {
            if (!session.duration_seconds || session.duration_seconds <= 0) continue;
            const meta = parseSessionKey(session.session_key);
            if (isWaste(meta.category, meta.identifier)) {
              previousMonthWasteSeconds += session.duration_seconds;
            }
          }
        }

        // 前月比を計算
        const previousMonthComparison = previousMonthWasteSeconds > 0 
          ? Math.round(((totalWasteSeconds - previousMonthWasteSeconds) / previousMonthWasteSeconds) * 100)
          : 0;

        const monthlyData: MonthlyData = {
          month: `${now.getFullYear()}-${(now.getMonth() + 1).toString().padStart(2, '0')}`,
          totalWasteSeconds,
          totalProductiveSeconds,
          weeklyBreakdown,
          goalAchievedDays,
          previousMonthComparison,
          calendarDays,
        };

        setMonthlyData(monthlyData);
        setLoading(false);

      } catch (err) {
        console.error('Failed to fetch monthly data:', err);
        setError(err instanceof Error ? err.message : 'Unknown error');
        setLoading(false);
      }
    };

    fetchMonthlyData();

    // 5分ごとにデータを更新
    const interval = setInterval(fetchMonthlyData, 5 * 60 * 1000);

    return () => clearInterval(interval);
  }, []);

  return { monthlyData, loading, error };
};

