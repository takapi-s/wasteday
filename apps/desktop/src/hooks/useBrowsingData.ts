import { useState, useEffect, useCallback } from 'react';
import { invoke } from '@tauri-apps/api/core';
import type { BrowsingSession, Domain, BrowsingSessionsQuery, BrowsingStats } from '../types/browsing';

export function useBrowsingData() {
  const [sessions, setSessions] = useState<BrowsingSession[]>([]);
  const [domains, setDomains] = useState<Domain[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchBrowsingSessions = useCallback(async (query: BrowsingSessionsQuery = {}) => {
    try {
      setLoading(true);
      setError(null);
      const result = await invoke<BrowsingSession[]>('db_get_browsing_sessions', { query });
      setSessions(result);
    } catch (err) {
      setError(err as string);
      console.error('Failed to fetch browsing sessions:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchDomains = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const result = await invoke<Domain[]>('db_get_domains');
      setDomains(result);
    } catch (err) {
      setError(err as string);
      console.error('Failed to fetch domains:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const upsertBrowsingSession = useCallback(async (session: BrowsingSession) => {
    try {
      await invoke('db_upsert_browsing_session', { session });
      // セッションリストを再取得
      await fetchBrowsingSessions();
    } catch (err) {
      setError(err as string);
      console.error('Failed to upsert browsing session:', err);
      throw err;
    }
  }, [fetchBrowsingSessions]);

  const upsertDomain = useCallback(async (domain: Domain) => {
    try {
      await invoke('db_upsert_domain', { domain });
      // ドメインリストを再取得
      await fetchDomains();
    } catch (err) {
      setError(err as string);
      console.error('Failed to upsert domain:', err);
      throw err;
    }
  }, [fetchDomains]);

  const deleteBrowsingSession = useCallback(async (id: string) => {
    try {
      await invoke('db_delete_browsing_session', { id });
      // セッションリストを再取得
      await fetchBrowsingSessions();
    } catch (err) {
      setError(err as string);
      console.error('Failed to delete browsing session:', err);
      throw err;
    }
  }, [fetchBrowsingSessions]);

  const classifyDomain = useCallback(async (domainName: string) => {
    try {
      const categoryId = await invoke<number | null>('db_classify_domain', { domainName });
      return categoryId;
    } catch (err) {
      setError(err as string);
      console.error('Failed to classify domain:', err);
      throw err;
    }
  }, []);

  // 初期データの読み込み
  useEffect(() => {
    fetchBrowsingSessions();
    fetchDomains();
    // 30秒ごとにポーリング
    const interval = setInterval(() => {
      fetchBrowsingSessions();
      fetchDomains();
    }, 30000);

    // ウィンドウ復帰時にリフレッシュ
    const onFocus = () => {
      fetchBrowsingSessions();
      fetchDomains();
    };
    if (typeof window !== 'undefined') {
      window.addEventListener('focus', onFocus);
    }

    return () => {
      clearInterval(interval);
      if (typeof window !== 'undefined') {
        window.removeEventListener('focus', onFocus);
      }
    };
  }, [fetchBrowsingSessions, fetchDomains]);

  return {
    sessions,
    domains,
    loading,
    error,
    fetchBrowsingSessions,
    fetchDomains,
    upsertBrowsingSession,
    upsertDomain,
    deleteBrowsingSession,
    classifyDomain,
  };
}

export function useBrowsingStats(_query: BrowsingSessionsQuery = {}) {
  const [stats, setStats] = useState<BrowsingStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const calculateStats = useCallback(async (sessions: BrowsingSession[], domains: Domain[]) => {
    try {
      setLoading(true);
      setError(null);

      // 総時間の計算
      const totalTime = sessions.reduce((sum, session) => sum + session.duration_seconds, 0);

      // ドメイン別の統計
      const domainStats = new Map<string, { totalTime: number; visitCount: number; categoryId?: number }>();
      
      sessions.forEach(session => {
        const existing = domainStats.get(session.domain) || { totalTime: 0, visitCount: 0, categoryId: session.category_id };
        existing.totalTime += session.duration_seconds;
        existing.visitCount += 1;
        existing.categoryId = session.category_id;
        domainStats.set(session.domain, existing);
      });

      // トップドメイン（時間順）
      const topDomains = Array.from(domainStats.entries())
        .map(([domain, stats]) => ({
          domain,
          total_time: stats.totalTime,
          visit_count: stats.visitCount,
          category_id: stats.categoryId,
        }))
        .sort((a, b) => b.total_time - a.total_time)
        .slice(0, 10);

      // カテゴリ別の統計
      const categoryStats = new Map<number | undefined, { totalTime: number; domainCount: number }>();
      
      sessions.forEach(session => {
        const categoryId = session.category_id;
        const existing = categoryStats.get(categoryId) || { totalTime: 0, domainCount: 0 };
        existing.totalTime += session.duration_seconds;
        categoryStats.set(categoryId, existing);
      });

      // ドメイン数をカテゴリ別に計算
      domains.forEach(domain => {
        if (domain.category_id !== undefined) {
          const existing = categoryStats.get(domain.category_id);
          if (existing) {
            existing.domainCount += 1;
          }
        }
      });

      const categoryBreakdown = Array.from(categoryStats.entries())
        .map(([categoryId, stats]) => ({
          category_id: categoryId,
          category_name: undefined, // 実際の実装では、waste_categoriesテーブルから取得
          total_time: stats.totalTime,
          domain_count: stats.domainCount,
        }))
        .sort((a, b) => b.total_time - a.total_time);

      const result: BrowsingStats = {
        total_time: totalTime,
        domain_count: domainStats.size,
        top_domains: topDomains,
        category_breakdown: categoryBreakdown,
      };

      setStats(result);
    } catch (err) {
      setError(err as string);
      console.error('Failed to calculate browsing stats:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    stats,
    loading,
    error,
    calculateStats,
  };
}
