import React from 'react';
import type { DataSource } from '../hooks/data';

interface DataSourceToggleProps {
  dataSource: DataSource;
  onDataSourceChange: (source: DataSource) => void;
  desktopData: {
    loading: boolean;
    error: string | null;
  };
  extensionData: {
    loading: boolean;
    error: string | null;
  };
}

export const DataSourceToggle: React.FC<DataSourceToggleProps> = ({
  dataSource,
  onDataSourceChange,
  desktopData,
  extensionData,
}) => {
  return (
    <div className="bg-white/70 dark:bg-neutral-900/50 backdrop-blur-md rounded-lg border border-gray-200/50 dark:border-white/10">
      <div className="border-b border-gray-200/60 dark:border-white/10">
        <nav className="-mb-px flex space-x-8 px-6" aria-label="Tabs">
          <button
            onClick={() => onDataSourceChange('desktop')}
            disabled={desktopData.loading}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              dataSource === 'desktop'
                ? 'border-white/40 text-gray-900 dark:text-neutral-100'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-neutral-300 dark:hover:text-neutral-100'
            } ${desktopData.loading ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            <div className="flex items-center space-x-2">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
              <span>Desktop App</span>
              {desktopData.loading && (
                <div className="w-4 h-4 border-2 border-white/50 border-t-transparent rounded-full animate-spin"></div>
              )}
            </div>
          </button>
          <button
            onClick={() => onDataSourceChange('extension')}
            disabled={extensionData.loading}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              dataSource === 'extension'
                ? 'border-white/40 text-gray-900 dark:text-neutral-100'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-neutral-300 dark:hover:text-neutral-100'
            } ${extensionData.loading ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            <div className="flex items-center space-x-2">
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M20.5 11H19V7c0-1.1-.9-2-2-2h-4V3.5C13 2.12 11.88 1 10.5 1S8 2.12 8 3.5V5H4c-1.1 0-1.99.9-1.99 2v3.8H3.5c1.49 0 2.7 1.21 2.7 2.7s-1.21 2.7-2.7 2.7H2V20c0 1.1.9 2 2 2h3.8v-1.5c0-1.49 1.21-2.7 2.7-2.7 1.49 0 2.7 1.21 2.7 2.7V22H17c1.1 0 2-.9 2-2v-4h1.5c1.38 0 2.5-1.12 2.5-2.5S21.88 11 20.5 11z"/>
              </svg>
              <span>Chrome Extension</span>
              {extensionData.loading && (
                <div className="w-4 h-4 border-2 border-white/50 border-t-transparent rounded-full animate-spin"></div>
              )}
            </div>
          </button>
        </nav>
      </div>
      
      {/* Data Source Information */}
      <div className="px-6 py-4 bg-white/50 dark:bg-neutral-900/30 backdrop-blur-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <div className={`w-2 h-2 rounded-full ${
                dataSource === 'desktop' 
                  ? (desktopData.error ? 'bg-red-500' : desktopData.loading ? 'bg-yellow-500' : 'bg-green-500')
                  : (extensionData.error ? 'bg-red-500' : extensionData.loading ? 'bg-yellow-500' : 'bg-green-500')
              }`}></div>
              <span className="text-sm text-gray-600 dark:text-gray-300">
                {dataSource === 'desktop' ? 'Desktop App' : 'Chrome Extension'} Data
              </span>
              {(dataSource === 'desktop' ? desktopData.loading : extensionData.loading) && (
                <span className="text-sm text-gray-600 dark:text-neutral-300">
                  Loading...
                </span>
              )}
            </div>
            {(dataSource === 'desktop' ? desktopData.error : extensionData.error) && (
              <span className="text-sm text-red-600 dark:text-red-400">
                Error: {dataSource === 'desktop' ? desktopData.error : extensionData.error}
              </span>
            )}
          </div>
          <div className="text-sm text-gray-500 dark:text-gray-400">
            {dataSource === 'desktop' 
              ? 'Track application usage'
              : 'Track browsing activity'
            }
          </div>
        </div>
      </div>
    </div>
  );
};
