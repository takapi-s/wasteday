import React from 'react';
import { useIngest } from '../context/IngestContext';
import { useDarkMode } from '../hooks/ui';
import { SettingsPage as SharedSettingsPage } from '@wasteday/ui';

export const SettingsPage: React.FC = () => {
  const { autostartEnabled, toggleAutostart, updateGapThreshold } = useIngest();
  const { theme, setLightMode, setDarkMode, setSystemMode } = useDarkMode();

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
