import { useEffect, useRef, useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import type { TimeSeriesPoint, TopItem } from '@wasteday/ui';
import { useCategoryEventEmitter } from './useCategoryEventEmitter';

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
  const { subscribe } = useCategoryEventEmitter();

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

        // 軽量フィンガープリントで同一データなら再計算をスキップ
        // 特徴量: 件数 / 合計秒数 / 最小・最大start_time（秒） / binMinutes / rangeHours
        const toEpochSec = (iso?: string) => (iso ? Math.floor(new Date(iso).getTime() / 1000) : 0);
        let minStart = Number.POSITIVE_INFINITY;
        let maxStart = 0;
        let sumDur = 0;
        for (const s of sessions) {
          const st = toEpochSec(s.start_time);
          if (st > 0) {
            if (st < minStart) minStart = st;
            if (st > maxStart) maxStart = st;
          }
          sumDur += s.duration_seconds || 0;
        }
        if (!Number.isFinite(minStart)) minStart = 0;
        const fingerprint = `${sessions.length}|${sumDur}|${minStart}|${maxStart}|${binMinutes}|${rangeHours}`;

        // useRef で前回のフィンガープリントを保持
        // eslint-disable-next-line react-hooks/rules-of-hooks
        const fpRef = (useLocalDbData as any)._fpRef as React.MutableRefObject<string | undefined> | undefined;
        if (!fpRef) {
          (useLocalDbData as any)._fpRef = { current: undefined } as React.MutableRefObject<string | undefined>;
        }
        const ref: React.MutableRefObject<string | undefined> = (useLocalDbData as any)._fpRef;
        if (ref.current === fingerprint) {
          // 前回と同一データ → 再集計をスキップ
          setData(prev => ({ ...prev, loading: false }));
          return;
        }
        ref.current = fingerprint;

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

        // 時系列（セッション主導でバケット化）
        const bins = Math.ceil((rangeHours * 60) / binMinutes);
        const now = new Date();
        const windowStart = new Date(now);
        windowStart.setHours(now.getHours() - rangeHours, now.getMinutes(), 0, 0);

        // 各ビンの開始時刻と累積配列を準備
        const binStarts: Date[] = new Array(bins);
        const activePerBin: number[] = new Array(bins).fill(0);
        const idlePerBin: number[] = new Array(bins).fill(0);
        for (let i = 0; i < bins; i++) {
          const d = new Date(windowStart);
          d.setMinutes(d.getMinutes() + i * binMinutes, 0, 0);
          binStarts[i] = d;
        }

        // セッションごとに関与するビン範囲にのみ加算
        const secPerBin = binMinutes * 60;
        for (const session of sessions) {
          const duration = session.duration_seconds;
          if (!duration || duration <= 0) continue;
          const sessionStart = new Date(session.start_time);
          const sessionEnd = new Date(sessionStart);
          sessionEnd.setSeconds(sessionEnd.getSeconds() + duration, 0);

          // 表示窓外はスキップ
          if (sessionEnd <= windowStart || sessionStart >= now) continue;

          // クランプした区間
          const clampedStart = sessionStart < windowStart ? windowStart : sessionStart;
          const clampedEnd = sessionEnd > now ? now : sessionEnd;

          // 範囲に対応するビンindexを計算
          const startIdx = Math.max(0, Math.floor((clampedStart.getTime() - windowStart.getTime()) / 1000 / secPerBin));
          const endIdx = Math.min(bins - 1, Math.floor(((clampedEnd.getTime() - windowStart.getTime()) / 1000 - 1) / secPerBin));

          const meta = parseSessionKey(session.session_key);
          const isWasteSession = isWaste(meta.category, meta.identifier);

          for (let bi = startIdx; bi <= endIdx; bi++) {
            const binStart = binStarts[bi].getTime();
            const binEnd = binStart + secPerBin * 1000;
            const ovStart = Math.max(clampedStart.getTime(), binStart);
            const ovEnd = Math.min(clampedEnd.getTime(), binEnd);
            const ovSec = Math.max(0, Math.floor((ovEnd - ovStart) / 1000));
            if (ovSec <= 0) continue;
            if (isWasteSession) activePerBin[bi] += ovSec; else idlePerBin[bi] += ovSec;
          }
        }

        const last24hSeries: TimeSeriesPoint[] = binStarts.map((bs, i) => ({
          timestamp: bs.toISOString(),
          activeSeconds: activePerBin[i],
          idleSeconds: idlePerBin[i],
        }));

        const topWaste: TopItem[] = Array.from(wasteSecondsById.entries())
          .sort((a, b) => b[1] - a[1])
          .slice(0, 7)
          .map(([label, seconds]) => ({ label, seconds }));
        const topProductive: TopItem[] = Array.from(productiveSecondsById.entries())
          .sort((a, b) => b[1] - a[1])
          .slice(0, 7)
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

  // カテゴリー変更イベントを監視してデータを再取得
  useEffect(() => {
    const unsubscribe = subscribe((event) => {
      console.log('[useLocalDbData] Category change detected, refreshing data...', event);
      // データ再取得のトリガーとして状態をリセット
      setData(prev => ({ ...prev, loading: true }));
    });

    return unsubscribe;
  }, [subscribe]);

  return data;
};


