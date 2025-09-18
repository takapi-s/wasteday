import { useEffect, useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
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

type LocalSession = {
  id: string;
  start_time: string; // ISO
  duration_seconds: number;
  session_key: string;
};

type WasteCategory = {
  id?: number;
  type: string;
  identifier: string;
  label: 'waste' | 'productive' | string;
  is_active: boolean;
};

export const useLocalDbData = (options: DashboardQueryOptions = {}): DashboardData => {
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

    const fetchData = async () => {
      try {
        setData(prev => ({ ...prev, loading: true, error: null }));

        const since = new Date();
        since.setHours(since.getHours() - rangeHours);
        const until = new Date();

        const [sessions, categories] = await Promise.all([
          invoke<LocalSession[]>('db_get_sessions', { query: { since: since.toISOString(), until: until.toISOString() } }),
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

        // 今日の集計（start_time基準）
        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);
        const todaySessions = sessions.filter(s => s.start_time >= todayStart.toISOString());
        let todayActiveSeconds = 0; // waste
        let todayIdleSeconds = 0;   // non-waste
        const wasteSecondsById = new Map<string, number>();
        const productiveSecondsById = new Map<string, number>();

        for (const session of todaySessions) {
          const duration = session.duration_seconds;
          if (!duration || duration <= 0) continue;
          const meta = parseSessionKey(session.session_key);
          if (isWaste(meta.category, meta.identifier)) {
            todayActiveSeconds += duration;
          } else {
            todayIdleSeconds += duration;
          }
          if (meta.identifier) {
            const key = meta.identifier;
            if (isWaste(meta.category, meta.identifier)) {
              wasteSecondsById.set(key, (wasteSecondsById.get(key) || 0) + duration);
            } else {
              productiveSecondsById.set(key, (productiveSecondsById.get(key) || 0) + duration);
            }
          }
        }

        // 時系列（重なり配分でバケット化）
        const last24hSeries: TimeSeriesPoint[] = [];
        const bins = Math.ceil((rangeHours * 60) / binMinutes);
        const now = new Date();
        for (let i = bins - 1; i >= 0; i--) {
          const binStart = new Date(now);
          binStart.setMinutes(binStart.getMinutes() - i * binMinutes, 0, 0);
          const binEnd = new Date(binStart);
          binEnd.setMinutes(binStart.getMinutes() + binMinutes, 0, 0);

          let activeSeconds = 0;
          let idleSeconds = 0;
          for (const session of sessions) {
            const duration = session.duration_seconds;
            if (!duration || duration <= 0) continue;
            const sessionStart = new Date(session.start_time);
            const sessionEnd = new Date(sessionStart);
            sessionEnd.setSeconds(sessionEnd.getSeconds() + duration, 0);
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

          last24hSeries.push({ timestamp: binStart.toISOString(), activeSeconds, idleSeconds });
        }

        const topWaste: TopItem[] = Array.from(wasteSecondsById.entries())
          .sort((a, b) => b[1] - a[1])
          .slice(0, 5)
          .map(([label, seconds]) => ({ label, seconds }));
        const topProductive: TopItem[] = Array.from(productiveSecondsById.entries())
          .sort((a, b) => b[1] - a[1])
          .slice(0, 5)
          .map(([label, seconds]) => ({ label, seconds }));
        const topIdentifiers: TopItem[] = topWaste;

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
        console.error('Failed to fetch LocalDB data:', err);
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
          error: err instanceof Error ? err.message : 'Unknown error',
        }));
      }
    };

    fetchData();
    const interval = setInterval(fetchData, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [options.rangeHours, options.binMinutes]);

  return data;
};


