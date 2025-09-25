import { useEffect, useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { useCategoryEventEmitter } from './useCategoryEventEmitter';

type LocalSession = { 
  id: string; 
  start_time: string; 
  duration_seconds: number; 
  session_key: string 
};

type WasteCategory = { 
  id?: number; 
  type: string; 
  identifier: string; 
  label: 'waste' | 'productive' | string; 
  is_active: boolean 
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

export const useWeeklyCalendarData = (offsetWeeks: number | undefined = 0) => {
  const [weeklyData, setWeeklyData] = useState<WeeklyCalendarData | null>(null);
  const [loading, setLoading] = useState(offsetWeeks !== undefined);
  const [error, setError] = useState<string | null>(null);
  const { subscribe } = useCategoryEventEmitter();

  useEffect(() => {
    // offsetWeeksがundefinedの場合はデータを取得しない
    if (offsetWeeks === undefined) {
      setLoading(false);
      setError(null);
      return;
    }

    const fetchWeeklyCalendarData = async () => {
      try {
        setLoading(true);
        setError(null);

        // 週の開始日を計算（月曜日開始）
        const now = new Date();
        const dayOfWeek = now.getDay();
        const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
        const weekStart = new Date(now);
        weekStart.setDate(now.getDate() - daysToMonday + (offsetWeeks * 7));
        weekStart.setHours(0, 0, 0, 0);

        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekStart.getDate() + 7);

        // セッションデータとカテゴリデータを取得
        const [sessions, categories] = await Promise.all([
          invoke<LocalSession[]>('db_get_sessions', { 
            query: { 
              since: weekStart.toISOString(), 
              until: weekEnd.toISOString() 
            } 
          }),
          invoke<WasteCategory[]>('db_list_waste_categories'),
        ]);

        // カテゴリ判定関数
        const isWaste = (type?: string, identifier?: string): boolean => {
          if (!type || !identifier) return false;
          const t = (type || '').toLowerCase();
          const id = (identifier || '').toLowerCase();
          return categories.some(c => 
            c.is_active && 
            c.type.toLowerCase() === t && 
            (c.identifier || '').toLowerCase() === id && 
            c.label === 'waste'
          );
        };

        // セッションキーをパース
        const parseSessionKey = (key: string): { category?: string; identifier?: string; user_state?: string } => {
          const obj: Record<string, string> = {};
          for (const part of key.split(';')) {
            const [k, v] = part.split('=');
            if (k && v) obj[k] = v;
          }
          return { 
            category: obj['category'], 
            identifier: obj['identifier'], 
            user_state: obj['user_state'] 
          };
        };

        // 日別・時間別データを構築
        const dailyData = [];
        for (let dayOffset = 0; dayOffset < 7; dayOffset++) {
          const dayStart = new Date(weekStart);
          dayStart.setDate(weekStart.getDate() + dayOffset);
          const dayEnd = new Date(dayStart);
          dayEnd.setDate(dayStart.getDate() + 1);

          // その日のセッションを取得
          const daySessions = sessions.filter(s => {
            const sessionTime = new Date(s.start_time);
            return sessionTime >= dayStart && sessionTime < dayEnd;
          });

          // 時間別データを構築（0時〜23時）
          const hourlyData: HourlyData[] = [];
          for (let hour = 0; hour < 24; hour++) {
            const hourStart = new Date(dayStart);
            hourStart.setHours(hour, 0, 0, 0);
            const hourEnd = new Date(hourStart);
            hourEnd.setHours(hour + 1, 0, 0, 0);

            let wasteSeconds = 0;
            let productiveSeconds = 0;
            const hourSessions: HourlyData['sessions'] = [];

            // その時間帯のセッションを処理
            for (const session of daySessions) {
              const sessionStart = new Date(session.start_time);
              const sessionEnd = new Date(sessionStart);
              sessionEnd.setSeconds(sessionEnd.getSeconds() + session.duration_seconds);

              // 時間帯との重複を計算
              const overlapStart = sessionStart > hourStart ? sessionStart : hourStart;
              const overlapEnd = sessionEnd < hourEnd ? sessionEnd : hourEnd;
              const overlapMs = overlapEnd.getTime() - overlapStart.getTime();
              
              if (overlapMs > 0) {
                const overlapSeconds = Math.floor(overlapMs / 1000);
                const meta = parseSessionKey(session.session_key);
                const isWasteSession = isWaste(meta.category, meta.identifier);

                if (isWasteSession) {
                  wasteSeconds += overlapSeconds;
                } else {
                  productiveSeconds += overlapSeconds;
                }

                hourSessions.push({
                  id: session.id,
                  startTime: session.start_time,
                  durationSeconds: overlapSeconds,
                  category: meta.category || 'unknown',
                  identifier: meta.identifier || 'unknown',
                  isWaste: isWasteSession,
                });
              }
            }

            hourlyData.push({
              hour,
              wasteSeconds,
              productiveSeconds,
              sessions: hourSessions,
            });
          }

          dailyData.push({
            date: dayStart.toISOString(),
            dayOfWeek: dayStart.getDay(),
            hourlyData,
          });
        }

        setWeeklyData({
          weekStart: weekStart.toISOString(),
          dailyData,
        });
        setLoading(false);
      } catch (err) {
        console.error('Failed to fetch weekly calendar data:', err);
        setError(err instanceof Error ? err.message : 'Unknown error');
        setLoading(false);
      }
    };

    fetchWeeklyCalendarData();
    const interval = setInterval(fetchWeeklyCalendarData, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [offsetWeeks]);

  // カテゴリー変更イベントを監視してデータを再取得
  useEffect(() => {
    const unsubscribe = subscribe((event) => {
      console.log('[useWeeklyCalendarData] Category change detected, refreshing data...', event);
      setLoading(true);
    });

    return unsubscribe;
  }, [subscribe]);

  return { weeklyData, loading, error };
};
