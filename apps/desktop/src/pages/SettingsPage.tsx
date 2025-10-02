import React, { useEffect, useState } from 'react';
import { useIngest } from '../context/IngestContext';
// Dark-only: theme hook no longer needed here
import { SettingsPage as SharedSettingsPage } from '@wasteday/ui';

export const SettingsPage: React.FC = () => {
  const { updateGapThreshold } = useIngest();
  const [appVersion, setAppVersion] = useState<string | undefined>(undefined);

  // アプリバージョンを取得して表示
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { getVersion } = await import('@tauri-apps/api/app');
        const v = await getVersion();
        if (!cancelled) setAppVersion(v);
      } catch (e) {
        console.warn('Failed to load app version:', e);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const handleSaveSettings = (settings: { gapThreshold: number }) => {
    // Persist to localStorage for now; can be moved to Supabase user settings later
    try {
      localStorage.setItem('wasteday-gap-threshold', settings.gapThreshold.toString());
      updateGapThreshold(settings.gapThreshold);
      console.log('Settings saved:', settings);
    } catch (error) {
      console.error('Failed to save settings:', error);
    }
  };

  

  return (
    <SharedSettingsPage
      onSaveSettings={handleSaveSettings}
      showDatabaseStatus={false}
      appVersion={appVersion}
    />
  );
};
