import { useState, useEffect, useCallback } from 'react';
import { invoke } from '@tauri-apps/api/core';

export const useBrowsingData = () => {
  const [sessions, setSessions] = useState<any[]>([]);
  const [domains, setDomains] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchBrowsingSessions = useCallback(async (query: any = {}) => {
    try {
      setLoading(true);
      setError(null);
      const result = await invoke<any[]>('db_get_browsing_sessions', { query });
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
      const result = await invoke<any[]>('db_get_domains');
      setDomains(result);
    } catch (err) {
      setError(err as string);
      console.error('Failed to fetch domains:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const upsertBrowsingSession = useCallback(async (session: any) => {
    try {
      await invoke('db_upsert_browsing_session', { session });
      await fetchBrowsingSessions();
    } catch (err) {
      setError(err as string);
      console.error('Failed to upsert browsing session:', err);
      throw err;
    }
  }, [fetchBrowsingSessions]);

  const upsertDomain = useCallback(async (domain: any) => {
    try {
      await invoke('db_upsert_domain', { domain });
      try {
        const affected = await invoke<number>('db_reclassify_browsing_sessions', { since: null, until: null });
        console.log('[useBrowsingData] reclassified browsing_sessions:', affected);
      } catch (reclassErr) {
        console.error('Failed to reclassify browsing sessions:', reclassErr);
      }
      await Promise.all([fetchDomains(), fetchBrowsingSessions()]);
    } catch (err) {
      setError(err as string);
      console.error('Failed to upsert domain:', err);
      throw err;
    }
  }, [fetchDomains, fetchBrowsingSessions]);

  const deleteBrowsingSession = useCallback(async (id: string) => {
    try {
      await invoke('db_delete_browsing_session', { id });
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

  useEffect(() => {
    fetchBrowsingSessions();
    fetchDomains();
    const interval = setInterval(() => {
      fetchBrowsingSessions();
      fetchDomains();
    }, 30000);

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
};

export const useBrowsingStats = (_query: any = {}) => {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const calculateStats = useCallback(async (sessions: any[], domains: any[]) => {
    try {
      setLoading(true);
      setError(null);

      const totalTime = sessions.reduce((sum, session) => sum + session.duration_seconds, 0);

      const domainStats = new Map<string, { totalTime: number; visitCount: number; categoryId?: number }>();
      sessions.forEach(session => {
        const existing = domainStats.get(session.domain) || { totalTime: 0, visitCount: 0, categoryId: session.category_id };
        existing.totalTime += session.duration_seconds;
        existing.visitCount += 1;
        existing.categoryId = session.category_id;
        domainStats.set(session.domain, existing);
      });

      const topDomains = Array.from(domainStats.entries())
        .map(([domain, stats]) => ({
          domain,
          total_time: stats.totalTime,
          visit_count: stats.visitCount,
          category_id: stats.categoryId,
        }))
        .sort((a, b) => b.total_time - a.total_time)
        .slice(0, 10);

      const categoryStats = new Map<number | undefined, { totalTime: number; domainCount: number }>();
      sessions.forEach(session => {
        const categoryId = session.category_id;
        const existing = categoryStats.get(categoryId) || { totalTime: 0, domainCount: 0 };
        existing.totalTime += session.duration_seconds;
        categoryStats.set(categoryId, existing);
      });

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
          category_name: undefined,
          total_time: stats.totalTime,
          domain_count: stats.domainCount,
        }))
        .sort((a, b) => b.total_time - a.total_time);

      const result = {
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
};


