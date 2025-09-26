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
    <div className="mb-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">Data Source</h3>
        <div className="flex rounded-md bg-gray-100 dark:bg-gray-700">
          <button
            onClick={() => onDataSourceChange('desktop')}
            className={`px-3 py-1 text-sm font-medium rounded-l-md transition-colors ${
              dataSource === 'desktop'
                ? 'bg-blue-500 text-white'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100'
            }`}
          >
            Desktop
          </button>
          <button
            onClick={() => onDataSourceChange('extension')}
            className={`px-3 py-1 text-sm font-medium rounded-r-md transition-colors ${
              dataSource === 'extension'
                ? 'bg-blue-500 text-white'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100'
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
