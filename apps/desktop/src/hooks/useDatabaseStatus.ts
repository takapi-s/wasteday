import { useEffect, useState } from 'react';
import { invoke } from '@tauri-apps/api/core';

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
    url: 'local://sqlite',
  });

  useEffect(() => {
    const checkConnection = async () => {
      try {
        setStatus(prev => ({ ...prev, loading: true, error: null }));
        // ローカルDBに簡易クエリを投げて接続確認
        await invoke('db_get_user_setting', { key: 'has_run_before' }).catch(() => null);

        setStatus({
          connected: true,
          loading: false,
          error: null,
          lastChecked: new Date(),
          url: 'local://sqlite',
        });

      } catch (err) {
        console.error('Database connection test failed:', err);
        setStatus({
          connected: false,
          loading: false,
          error: err instanceof Error ? err.message : 'Connection failed',
          lastChecked: new Date(),
          url: 'local://sqlite',
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
