import React, { useState } from 'react';

export interface SettingsPageProps {
  autostartEnabled?: boolean;
  onToggleAutostart?: () => void;
  onSaveSettings?: (settings: { gapThreshold: number }) => void;
  // Dark mode props
  theme?: 'light' | 'dark' | 'system';
  onThemeChange?: (theme: 'light' | 'dark' | 'system') => void;
  // Database status props
  databaseConnected?: boolean;
  databaseLoading?: boolean;
  databaseError?: string | null;
  databaseUrl?: string | null;
  className?: string;
  // Toggle visibility of Database Status section (desktop uses local DB)
  showDatabaseStatus?: boolean;
}

export const SettingsPage: React.FC<SettingsPageProps> = ({
  autostartEnabled = false,
  onToggleAutostart,
  onSaveSettings,
  theme = 'system',
  onThemeChange,
  databaseConnected = false,
  databaseLoading = false,
  databaseError = null,
  databaseUrl = null,
  className = "",
  showDatabaseStatus = false,
}) => {
  const [gapThreshold, setGapThreshold] = useState(() => {
    // Load saved gap threshold from localStorage if available
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('wasteday-gap-threshold');
      return saved ? parseInt(saved, 10) : 20;
    }
    return 20;
  });
  

  const handleSave = () => {
    if (onSaveSettings) {
      onSaveSettings({ gapThreshold });
    }
  };

  return (
    <div className={`max-w-2xl ${className}`}>
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-6">Settings</h2>
        
        <div className="space-y-6">
          {/* Theme Setting */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
              Theme
            </label>
            <div className="flex gap-2">
              {(['light', 'dark', 'system'] as const).map((themeOption) => (
                <button
                  key={themeOption}
                  onClick={() => onThemeChange?.(themeOption)}
                  className={`px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                    theme === themeOption
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                  }`}
                >
                  {themeOption === 'light' ? 'Light' : themeOption === 'dark' ? 'Dark' : 'System'}
                </button>
              ))}
            </div>
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              Choose your preferred color scheme
            </p>
          </div>

          {/* Autostart Setting */}
          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="autostart-toggle"
              checked={autostartEnabled}
              onChange={onToggleAutostart}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700"
            />
            <label htmlFor="autostart-toggle" className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Autostart on login
            </label>
          </div>

          {/* Gap Threshold */}
          <div>
            <label htmlFor="gap-threshold" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Gap threshold seconds
            </label>
            <input
              type="number"
              id="gap-threshold"
              min="5"
              max="120"
              step="5"
              value={gapThreshold}
              onChange={(e) => setGapThreshold(Number(e.target.value))}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
            />
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              Minimum gap between sessions before inserting a new session
            </p>
          </div>

          

          {/* Save Button */}
          <div className="pt-4">
            <button
              onClick={handleSave}
              className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-md transition-colors"
            >
              Save Settings
            </button>
          </div>
        </div>
      </div>

      {/* Database Status */}
      {showDatabaseStatus && (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-6">Database Status</h2>
        
        <div className="space-y-4">
          {/* Connection Status */}
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Connection Status</span>
            <div className="flex items-center gap-2">
              {databaseLoading ? (
                <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400">
                  <div className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse"></div>
                  <span className="text-sm">Checking...</span>
                </div>
              ) : databaseConnected ? (
                <div className="flex items-center gap-2 text-green-600 dark:text-green-400">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <span className="text-sm">Connected</span>
                </div>
              ) : (
                <div className="flex items-center gap-2 text-red-600 dark:text-red-400">
                  <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                  <span className="text-sm">Disconnected</span>
                </div>
              )}
            </div>
          </div>

          {/* Database URL */}
          {databaseUrl && (
            <div>
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Database URL</span>
              <div className="mt-1 text-xs text-gray-500 dark:text-gray-400 font-mono bg-gray-100 dark:bg-gray-700 p-2 rounded">
                {databaseUrl}
              </div>
            </div>
          )}

          {/* Error Message */}
          {databaseError && (
            <div>
              <span className="text-sm font-medium text-red-700 dark:text-red-300">Error</span>
              <div className="mt-1 text-xs text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 p-2 rounded">
                {databaseError}
              </div>
            </div>
          )}
        </div>
      </div>
      )}
    </div>
  );
};
