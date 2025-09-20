import React from 'react';
import type { DatabaseStatus } from '../../types';

interface DashboardHeaderProps {
  databaseStatus: DatabaseStatus;
}

export const DashboardHeader: React.FC<DashboardHeaderProps> = ({ databaseStatus }) => {
  return (
    <div className="flex items-center justify-between">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Dashboard</h1>
      <div className="flex items-center gap-2">
        {databaseStatus.loading ? (
          <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400">
            <div className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse"></div>
            <span className="text-sm">Checking local DB...</span>
          </div>
        ) : databaseStatus.connected ? (
          <div className="flex items-center gap-2 text-green-600 dark:text-green-400">
            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
            <span className="text-sm">Local DB Ready</span>
          </div>
        ) : (
          <div className="flex items-center gap-2 text-red-600 dark:text-red-400">
            <div className="w-2 h-2 bg-red-500 rounded-full"></div>
            <span className="text-sm">Local DB Unavailable</span>
          </div>
        )}
      </div>
    </div>
  );
};
