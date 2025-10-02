import React, { useEffect } from 'react';
import { useIngest } from '../context/IngestContext';
// Dark-only: theme hook no longer needed here
import { SettingsPage as SharedSettingsPage } from '@wasteday/ui';

export const SettingsPage: React.FC = () => {
  const { updateGapThreshold } = useIngest();
  // App version display removed from Settings

  useEffect(() => {
    let mounted = true;
    // Dark-only & simplified settings: appVersion not displayed, skip fetching
    return () => { mounted = false; };
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
    />
  );
};
