import React, { useState } from 'react';

export interface SettingsPageProps {
  onSaveSettings?: (settings: { gapThreshold: number }) => void;
  // Database status props
  databaseConnected?: boolean;
  databaseLoading?: boolean;
  databaseError?: string | null;
  databaseUrl?: string | null;
  className?: string;
  // Toggle visibility of Database Status section (desktop uses local DB)
  showDatabaseStatus?: boolean;
  // App version display (optional)
  appVersion?: string;
}

export const SettingsPage: React.FC<SettingsPageProps> = ({
  onSaveSettings,
  databaseConnected = false,
  databaseLoading = false,
  databaseError = null,
  databaseUrl = null,
  className = "",
  showDatabaseStatus = false,
  appVersion,
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
      <div className="bg-white/70 dark:bg-neutral-900/50 backdrop-blur-md rounded-lg shadow-sm border border-gray-200/50 dark:border-white/10 p-6">
        <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-6">Settings</h2>
        
        <div className="space-y-6">
          {/* App Version */}
          {appVersion && (
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">App Version</span>
              <span className="text-sm font-mono text-gray-600 dark:text-gray-300">{appVersion}</span>
            </div>
          )}

          {/* Theme Setting removed for dark-only UI */}

          {/* Autostart Setting removed: always-on managed by app */}

          {/* Gap Threshold */}
          <div>
            <label htmlFor="gap-threshold" className="block text-sm font-medium text-gray-700 dark:text-neutral-300 mb-2">
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
              className="w-full px-3 py-2 border border-gray-300/50 dark:border-white/10 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-white/20 bg-white/70 dark:bg-neutral-800/60 text-gray-900 dark:text-neutral-100 backdrop-blur-sm"
            />
            <p className="mt-1 text-xs text-gray-500 dark:text-neutral-400">
              Minimum gap between sessions before inserting a new session
            </p>
          </div>

          

          {/* Save Button */}
          <div className="pt-4">
            <button
              onClick={handleSave}
              className="bg-neutral-200 hover:bg-neutral-300 text-neutral-900 dark:bg-white/10 dark:hover:bg-white/20 dark:text-neutral-100 font-medium py-2 px-4 rounded-md transition-colors"
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
