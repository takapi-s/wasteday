import React from 'react';
import type { DataSource } from '../hooks/data';

interface SimpleDataSourceToggleProps {
  dataSource: DataSource;
  onDataSourceChange: (source: DataSource) => void;
  selectedPeriod: 'today' | 'week' | 'month';
}

export const SimpleDataSourceToggle: React.FC<SimpleDataSourceToggleProps> = ({
  dataSource,
  onDataSourceChange,
  selectedPeriod,
}) => {
  return (
    <div className="mb-4 bg-white/70 dark:bg-neutral-900/50 backdrop-blur-md rounded-lg border border-gray-200/50 dark:border-white/10 p-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-gray-700 dark:text-neutral-300">Data Source</h3>
        <div className="flex rounded-md bg-gray-100/70 dark:bg-white/10 backdrop-blur-md">
          <button
            onClick={() => onDataSourceChange('desktop')}
            className={`px-3 py-1 text-sm font-medium rounded-l-md transition-colors ${
              dataSource === 'desktop'
                ? 'bg-white/80 text-gray-900 dark:bg-white/10 dark:text-neutral-100'
                : 'text-gray-600 dark:text-neutral-300 hover:text-gray-900 dark:hover:text-neutral-100'
            }`}
          >
            Desktop
          </button>
          <button
            onClick={() => onDataSourceChange('extension')}
            className={`px-3 py-1 text-sm font-medium rounded-r-md transition-colors ${
              dataSource === 'extension'
                ? 'bg-white/80 text-gray-900 dark:bg-white/10 dark:text-neutral-100'
                : 'text-gray-600 dark:text-neutral-300 hover:text-gray-900 dark:hover:text-neutral-100'
            }`}
          >
            Chrome Extension
          </button>
        </div>
      </div>
      {dataSource === 'extension' && (selectedPeriod === 'week' || selectedPeriod === 'month') && (
        <div className="mt-2 text-xs text-green-600 dark:text-green-400">
          Note: Week and Month views are now available with Extension data source
        </div>
      )}
    </div>
  );
};
