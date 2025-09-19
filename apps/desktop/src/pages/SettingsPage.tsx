import React from 'react';
import { useIngest } from '../context/IngestContext';
import { useDarkMode } from '../hooks/useDarkMode';
import { SettingsPage as SharedSettingsPage } from '@wasteday/ui';

export const SettingsPage: React.FC = () => {
  const { autostartEnabled, toggleAutostart } = useIngest();
  const { theme, setLightMode, setDarkMode, setSystemMode } = useDarkMode();

  const handleSaveSettings = (settings: { idleThreshold: number; gapThreshold: number }) => {
    // Persist to localStorage for now; can be moved to Supabase user settings later
    try {
      // goalDailyWasteMinutes は廃止
    } catch {}
    console.log('Settings saved:', settings);
  };

  const handleThemeChange = (newTheme: 'light' | 'dark' | 'system') => {
    switch (newTheme) {
      case 'light':
        setLightMode();
        break;
      case 'dark':
        setDarkMode();
        break;
      case 'system':
        setSystemMode();
        break;
    }
  };

  return (
    <SharedSettingsPage
      autostartEnabled={autostartEnabled}
      onToggleAutostart={toggleAutostart}
      onSaveSettings={handleSaveSettings}
      theme={theme}
      onThemeChange={handleThemeChange}
      showDatabaseStatus={false}
    />
  );
};
