import { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';

export interface UpdateInfo {
  available: boolean;
  version?: string;
  error?: string;
}

export function useUpdater() {
  const [updateInfo, setUpdateInfo] = useState<UpdateInfo>({ available: false });
  const [isChecking, setIsChecking] = useState(false);
  const [isInstalling, setIsInstalling] = useState(false);

  const checkForUpdates = async () => {
    setIsChecking(true);
    try {
      const version = await invoke<string | null>('check_for_updates');
      setUpdateInfo({
        available: version !== null,
        version: version || undefined,
      });
    } catch (error) {
      setUpdateInfo({
        available: false,
        error: error as string,
      });
    } finally {
      setIsChecking(false);
    }
  };

  const installUpdate = async () => {
    setIsInstalling(true);
    try {
      await invoke('install_update');
    } catch (error) {
      setUpdateInfo(prev => ({
        ...prev,
        error: error as string,
      }));
    } finally {
      setIsInstalling(false);
    }
  };

  // アプリ起動時に自動でアップデートをチェック
  useEffect(() => {
    checkForUpdates();
  }, []);

  return {
    updateInfo,
    isChecking,
    isInstalling,
    checkForUpdates,
    installUpdate,
  };
}
