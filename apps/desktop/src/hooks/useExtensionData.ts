import { useState, useEffect, useMemo, useCallback } from 'react';
import { invoke } from '@tauri-apps/api/core';
import type { TimeSeriesPoint, TopItem } from '@wasteday/ui';
// カテゴリエミッターは無限ループの原因になるため、このフックでは購読しない

type ExtensionData = {
  todayActiveSeconds: number;
  todayIdleSeconds: number;
  sessionsCount: number;
  last24hSeries: TimeSeriesPoint[];
  topIdentifiers: TopItem[];
  topWaste?: TopItem[];
  topProductive?: TopItem[];
  loading: boolean;
  error: string | null;
  fingerprint?: string;
};

export type ExtensionQueryOptions = {
  rangeHours?: number;     // 1-24
  binMinutes?: number;     // 10-120
};

type ExtensionSession = {
  id: string;
  start_time: string;
  duration_seconds: number;
  domain: string;
  url: string;
  title: string;
  category_id?: number;
};

type ExtensionCategory = {
  id?: number;
  type: string;
  identifier: string;
  label: 'waste' | 'productive' | string;
  is_active: boolean;
};

// キャッシュ用のグローバル変数
const dataCache = new Map<string, { data: ExtensionData; timestamp: number }>();
const CACHE_DURATION = 30000; // 30秒

// データ処理の最適化された関数
const processExtensionData = (
  sessions: ExtensionSession[],
  categories: ExtensionCategory[],
  rangeHours: number,
  binMinutes: number
): Omit<ExtensionData, 'loading' | 'error' | 'fingerprint'> => {
  const binSeconds = binMinutes * 60;
  const now = Date.now();
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  // デスクトップアプリと同じ分類ロジック: waste 以外は productive
  const isWaste = (domain: string): boolean => {
    const d = (domain || '').toLowerCase();
    for (const c of categories) {
      if (!c.is_active) continue;
      if ((c.type || '').toLowerCase() !== 'domain') continue;
      if ((c.identifier || '').toLowerCase() !== d) continue;
      return c.label === 'waste';
    }
    return false;
  };

  // 今日のセッションを効率的にフィルタリング
  const todaySessions = sessions.filter(s => {
    const sessionDate = new Date(s.start_time);
    return sessionDate >= today && sessionDate < tomorrow;
  });

  // 今日の集計（waste/non-waste に分離）
  let todayWasteSeconds = 0;
  let todayProductiveSeconds = 0;
  for (const s of todaySessions) {
    if (!s.duration_seconds || s.duration_seconds <= 0) continue;
    if (isWaste(s.domain)) todayWasteSeconds += s.duration_seconds; else todayProductiveSeconds += s.duration_seconds;
  }
  const todayActiveSeconds = todayWasteSeconds;
  const sessionsCount = todaySessions.length;

  // 時系列データの生成（最適化）
  const binsWaste = new Map<number, number>();
  const binsProductive = new Map<number, number>();
  const startTime = now - (rangeHours * 60 * 60 * 1000);
  
  for (const session of sessions) {
    const sessionTime = new Date(session.start_time).getTime();
    const binIndex = Math.floor(sessionTime / (binSeconds * 1000));
    if (isWaste(session.domain)) {
      binsWaste.set(binIndex, (binsWaste.get(binIndex) || 0) + session.duration_seconds);
    } else {
      binsProductive.set(binIndex, (binsProductive.get(binIndex) || 0) + session.duration_seconds);
    }
  }

  const last24hSeries: TimeSeriesPoint[] = [];
  const totalBins = Math.floor(rangeHours * 60 / binMinutes);
  
  for (let i = 0; i < totalBins; i++) {
    const binStart = startTime + (i * binSeconds * 1000);
    const binIndex = Math.floor(binStart / (binSeconds * 1000));
    
    last24hSeries.push({
      timestamp: new Date(binStart).toISOString(),
      // activeSeconds を waste、idleSeconds を non-waste として使用（UIの期待に合わせる）
      activeSeconds: binsWaste.get(binIndex) || 0,
      idleSeconds: binsProductive.get(binIndex) || 0,
    });
  }

  // ドメイン統計の計算（デスクトップアプリと同じ方式）
  const domainStats = new Map<string, { totalTime: number; count: number }>();
  
  for (const session of sessions) {
    const domain = session.domain;
    const existing = domainStats.get(domain);
    if (existing) {
      existing.totalTime += session.duration_seconds;
      existing.count += 1;
    } else {
      domainStats.set(domain, {
        totalTime: session.duration_seconds,
        count: 1,
      });
    }
  }

  // 既に上で定義済みの isWaste を使用

  // トップアイテムの生成
  const topIdentifiers: TopItem[] = Array.from(domainStats.entries())
    .map(([domain, stats]) => ({
      identifier: domain,
      label: domain,
      seconds: stats.totalTime,
      count: stats.count,
    }))
    .sort((a, b) => b.seconds - a.seconds)
    .slice(0, 10);

  // デバッグログ: 分類状況を確認
  console.log('[useExtensionData] Categories:', categories);
  console.log('[useExtensionData] Domain classification:', topIdentifiers.map(item => ({
    domain: item.label,
    isWaste: isWaste(item.label)
  })));

  const topWaste = topIdentifiers.filter(item => isWaste(item.label));
  const topProductive = topIdentifiers.filter(item => !isWaste(item.label));

  return {
    todayActiveSeconds,
    todayIdleSeconds: todayProductiveSeconds,
    sessionsCount,
    last24hSeries,
    topIdentifiers,
    topWaste,
    topProductive,
  };
};

export const useExtensionData = (options: ExtensionQueryOptions = {}): ExtensionData => {
  const [data, setData] = useState<ExtensionData>({
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

  // カテゴリ変更イベントの購読は重い再計算を誘発するため行わない

  // オプションのメモ化
  const memoizedOptions = useMemo(() => ({
    rangeHours: Math.min(24, Math.max(1, Math.floor(options.rangeHours ?? 24))),
    binMinutes: Math.min(120, Math.max(10, Math.floor(options.binMinutes ?? 60))),
  }), [options.rangeHours, options.binMinutes]);

  // キャッシュキーの生成
  const cacheKey = useMemo(() => 
    `${memoizedOptions.rangeHours}-${memoizedOptions.binMinutes}`,
    [memoizedOptions.rangeHours, memoizedOptions.binMinutes]
  );

  // データ取得の最適化された関数
  const fetchData = useCallback(async () => {
    try {
      setData(prev => ({ ...prev, loading: true, error: null }));

      // キャッシュチェック
      const cached = dataCache.get(cacheKey);
      if (cached && (Date.now() - cached.timestamp) < CACHE_DURATION) {
        setData({ ...cached.data, loading: false });
        return;
      }

      const since = new Date();
      since.setHours(since.getHours() - memoizedOptions.rangeHours);
      const until = new Date();

      const [sessions, categories] = await Promise.all([
        invoke<ExtensionSession[]>('db_get_browsing_sessions', { 
          query: { since: since.toISOString(), until: until.toISOString() } 
        }),
        invoke<ExtensionCategory[]>('db_list_waste_categories'),
      ]);

      // データ処理
      const processedData = processExtensionData(
        sessions,
        categories,
        memoizedOptions.rangeHours,
        memoizedOptions.binMinutes
      );

      const result = {
        ...processedData,
        loading: false,
        error: null,
        fingerprint: `${sessions.length}-${Date.now()}`,
      };

      // キャッシュに保存
      dataCache.set(cacheKey, { data: result, timestamp: Date.now() });

      setData(result);

    } catch (error) {
      console.error('Extension data fetch error:', error);
      setData(prev => ({
        ...prev,
        loading: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }));
    }
  }, [cacheKey, memoizedOptions.rangeHours, memoizedOptions.binMinutes]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return data;
};

