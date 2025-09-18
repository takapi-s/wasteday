import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

export type DatabaseStatus = {
  connected: boolean;
  loading: boolean;
  error: string | null;
  lastChecked: Date | null;
  url: string | null;
};

export const useDatabaseStatus = (): DatabaseStatus => {
  const [status, setStatus] = useState<DatabaseStatus>({
    connected: false,
    loading: true,
    error: null,
    lastChecked: null,
    url: null,
  });

  useEffect(() => {
    const checkConnection = async () => {
      if (!supabase) {
        setStatus({
          connected: false,
          loading: false,
          error: 'Supabase credentials not configured',
          lastChecked: new Date(),
          url: null,
        });
        return;
      }

      try {
        setStatus(prev => ({ ...prev, loading: true, error: null }));

        // 簡単なクエリで接続をテスト
        const { error } = await supabase
          .from('sessions')
          .select('id')
          .limit(1);

        if (error) {
          throw error;
        }

        setStatus({
          connected: true,
          loading: false,
          error: null,
          lastChecked: new Date(),
          url: (import.meta as any).env?.VITE_SUPABASE_URL || 'Unknown',
        });

      } catch (err) {
        console.error('Database connection test failed:', err);
        setStatus({
          connected: false,
          loading: false,
          error: err instanceof Error ? err.message : 'Connection failed',
          lastChecked: new Date(),
          url: (import.meta as any).env?.VITE_SUPABASE_URL || 'Unknown',
        });
      }
    };

    checkConnection();

    // 30秒ごとに接続状態をチェック
    const interval = setInterval(checkConnection, 30 * 1000);

    return () => clearInterval(interval);
  }, []);

  return status;
};
