import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import type { TimeSeriesPoint, TopItem } from '@wasteday/ui';

type DashboardData = {
  todayActiveSeconds: number;
  todayIdleSeconds: number;
  sessionsCount: number;
  last24hSeries: TimeSeriesPoint[];
  topIdentifiers: TopItem[];
  topWaste?: TopItem[];
  topProductive?: TopItem[];
  loading: boolean;
  error: string | null;
};

export type DashboardQueryOptions = {
  rangeHours?: number;     // 1-24
  binMinutes?: number;     // 10-120
};

export const useSupabaseData = (options: DashboardQueryOptions = {}): DashboardData => {
  const [data, setData] = useState<DashboardData>({
    todayActiveSeconds: 0,
    todayIdleSeconds: 0,
    sessionsCount: 0,
    last24hSeries: [],
    topIdentifiers: [],
    topWaste: [],
    topProductive: [],
    loading: true,
    error: null,
  });

  useEffect(() => {
    const rangeHours = Math.min(24, Math.max(1, Math.floor(options.rangeHours ?? 24)));
    const binMinutesRaw = Math.floor(options.binMinutes ?? 60);
    const binMinutes = Math.min(120, Math.max(10, binMinutesRaw));

    if (!supabase) {
      // Supabase未設定でも24時間分のプレースホルダーを供給する
      const placeholder: TimeSeriesPoint[] = [];
      const bins = Math.ceil((rangeHours * 60) / binMinutes);
      const now = new Date();
      for (let i = bins - 1; i >= 0; i--) {
        const start = new Date(now);
        start.setMinutes(start.getMinutes() - i * binMinutes, 0, 0);
        placeholder.push({ timestamp: start.toISOString(), activeSeconds: 0, idleSeconds: 0 });
      }
      setData(prev => ({ 
        ...prev, 
        todayActiveSeconds: 0,
        todayIdleSeconds: 0,
        sessionsCount: 0,
        last24hSeries: placeholder,
        topIdentifiers: [],
        topWaste: [],
        topProductive: [],
        loading: false, 
        error: 'Supabase not configured' 
      }));
      return;
    }

    const fetchData = async () => {
      try {
        setData(prev => ({ ...prev, loading: true, error: null }));

        // 今日の開始時刻
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const todayStart = today.toISOString();

        // 範囲の開始時刻
        const since = new Date();
        since.setHours(since.getHours() - rangeHours);
        const rangeStartIso = since.toISOString();

        // 過去指定範囲のセッションデータを取得（start_time基準）
        const client = supabase as NonNullable<typeof supabase>;
        const { data: sessions, error } = await client
          .from('sessions')
          .select('*')
          .gte('start_time', rangeStartIso)
          .order('start_time', { ascending: true });

        if (error) {
          throw error;
        }

        if (!sessions) {
          console.log('No sessions found in database');
          const placeholder: TimeSeriesPoint[] = [];
          const bins = Math.ceil((rangeHours * 60) / binMinutes);
          const now = new Date();
          for (let i = bins - 1; i >= 0; i--) {
            const start = new Date(now);
            start.setMinutes(start.getMinutes() - i * binMinutes, 0, 0);
            placeholder.push({ timestamp: start.toISOString(), activeSeconds: 0, idleSeconds: 0 });
          }
          setData(prev => ({ 
            ...prev, 
            todayActiveSeconds: 0,
            todayIdleSeconds: 0,
            sessionsCount: 0,
            last24hSeries: placeholder,
            topIdentifiers: [],
            topWaste: [],
            topProductive: [],
            loading: false 
          }));
          return;
        }

        console.log(`Found ${sessions.length} sessions in database`);

        // waste_categories を取得してラベル判定用マップを生成
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

        // 今日の集計（start_time基準）
        const todaySessions = sessions.filter(s => s.start_time >= todayStart);
        // 再定義: todayActiveSeconds=waste, todayIdleSeconds=non-waste
        let todayActiveSeconds = 0; // waste
        let todayIdleSeconds = 0;   // non-waste
        const wasteSecondsById = new Map<string, number>();
        const productiveSecondsById = new Map<string, number>();

        for (const session of todaySessions) {
          const duration = session.duration_seconds;
          if (!duration || duration <= 0) continue; // 0秒は集計から除外
          const meta = parseSessionKey(session.session_key);
          if (isWaste(meta.category, meta.identifier)) {
            todayActiveSeconds += duration; // waste
          } else {
            todayIdleSeconds += duration; // non-waste
          }

          // アプリ別集計
          if (meta.identifier) {
            const key = meta.identifier;
            if (isWaste(meta.category, meta.identifier)) {
              wasteSecondsById.set(key, (wasteSecondsById.get(key) || 0) + duration);
            } else {
              productiveSecondsById.set(key, (productiveSecondsById.get(key) || 0) + duration);
            }
          }
        }

        // 時系列データ（可変バケット, start_timeでバケツ分け）
        const last24hSeries: TimeSeriesPoint[] = [];
        const bins = Math.ceil((rangeHours * 60) / binMinutes);
        const now = new Date();
        for (let i = bins - 1; i >= 0; i--) {
          const binStart = new Date(now);
          binStart.setMinutes(binStart.getMinutes() - i * binMinutes, 0, 0);
          const binEnd = new Date(binStart);
          binEnd.setMinutes(binStart.getMinutes() + binMinutes, 0, 0);

          let activeSeconds = 0; // waste
          let idleSeconds = 0;   // non-waste
          for (const session of sessions) {
            const duration = session.duration_seconds as number | undefined;
            if (!duration || duration <= 0) continue;

            // セッションの [start, end) 区間
            const sessionStart = new Date(session.start_time);
            const sessionEnd = new Date(sessionStart);
            sessionEnd.setSeconds(sessionEnd.getSeconds() + duration, 0);

            // ビンとの重なり秒数を計算
            const overlapStart = sessionStart > binStart ? sessionStart : binStart;
            const overlapEnd = sessionEnd < binEnd ? sessionEnd : binEnd;
            const overlapMs = overlapEnd.getTime() - overlapStart.getTime();
            if (overlapMs <= 0) continue;
            const overlapSeconds = Math.floor(overlapMs / 1000);

            const meta = parseSessionKey(session.session_key);
            if (isWaste(meta.category, meta.identifier)) {
              activeSeconds += overlapSeconds;
            } else {
              idleSeconds += overlapSeconds;
            }
          }

          last24hSeries.push({
            timestamp: binStart.toISOString(),
            activeSeconds,
            idleSeconds,
          });
        }

        // 上位アプリ（waste / productive）
        const topWaste: TopItem[] = Array.from(wasteSecondsById.entries())
          .sort((a, b) => b[1] - a[1])
          .slice(0, 5)
          .map(([label, seconds]) => ({ label, seconds }));
        const topProductive: TopItem[] = Array.from(productiveSecondsById.entries())
          .sort((a, b) => b[1] - a[1])
          .slice(0, 5)
          .map(([label, seconds]) => ({ label, seconds }));
        // 後方互換（未使用になれば削除可）
        const topIdentifiers: TopItem[] = topWaste;

        console.log('Dashboard data calculated:', {
          todayActiveSeconds,
          todayIdleSeconds,
          sessionsCount: sessions.length,
          topIdentifiersCount: topWaste.length,
        });

        setData({
          todayActiveSeconds,
          todayIdleSeconds,
          sessionsCount: sessions.length,
          last24hSeries,
          topIdentifiers,
          topWaste,
          topProductive,
          loading: false,
          error: null,
        });

      } catch (err) {
        console.error('Failed to fetch Supabase data:', err);
        const placeholder: TimeSeriesPoint[] = [];
        for (let i = 23; i >= 0; i--) {
          const hourStart = new Date();
          hourStart.setHours(hourStart.getHours() - i, 0, 0, 0);
          placeholder.push({ timestamp: hourStart.toISOString(), activeSeconds: 0, idleSeconds: 0 });
        }
        setData(prev => ({ 
          ...prev,
          todayActiveSeconds: 0,
          todayIdleSeconds: 0,
          sessionsCount: 0,
          last24hSeries: placeholder,
          topIdentifiers: [], 
          loading: false, 
          error: err instanceof Error ? err.message : 'Unknown error' 
        }));
      }
    };

    fetchData();

    // 5分ごとにデータを更新
    const interval = setInterval(fetchData, 5 * 60 * 1000);

    return () => clearInterval(interval);
  }, [options.rangeHours, options.binMinutes]);

  return data;
};

function parseSessionKey(key: string): { category?: string; identifier?: string; user_state?: string } {
  const obj: Record<string, string> = {};
  for (const part of key.split(';')) {
    const [k, v] = part.split('=');
    if (k && v) obj[k] = v;
  }
  return { category: obj['category'], identifier: obj['identifier'], user_state: obj['user_state'] };
}
