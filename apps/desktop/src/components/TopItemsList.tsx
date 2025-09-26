import React from 'react';
import type { TopItem } from '@wasteday/ui';

interface TopItemsListProps {
  title: string;
  items: TopItem[];
  type: 'waste' | 'productive' | 'identifiers';
  className?: string;
}

export const TopItemsList: React.FC<TopItemsListProps> = ({
  title,
  items,
  type,
  className = '',
}) => {
  const formatTime = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'waste':
        return 'text-red-600 dark:text-red-400';
      case 'productive':
        return 'text-green-600 dark:text-green-400';
      default:
        return 'text-gray-600 dark:text-gray-400';
    }
  };

  const getTypeBgColor = (type: string) => {
    switch (type) {
      case 'waste':
        return 'bg-red-50 dark:bg-red-900/20';
      case 'productive':
        return 'bg-green-50 dark:bg-green-900/20';
      default:
        return 'bg-gray-50 dark:bg-gray-900/20';
    }
  };

  if (items.length === 0) {
    return (
      <div className={`${className}`}>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          {title}
        </h3>
        <div className="text-sm text-gray-500 dark:text-gray-400">
          No data available
        </div>
      </div>
    );
  }

  return (
    <div className={`${className}`}>
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
        {title}
      </h3>
      <div className="space-y-2">
        {items.slice(0, 10).map((item, index) => (
          <div
            key={index}
            className={`${getTypeBgColor(type)} rounded-lg p-3 border border-gray-200 dark:border-gray-700`}
          >
            <div className="flex items-center justify-between">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                  {item.label}
                </p>
              </div>
              <div className="ml-4">
                <p className={`text-sm font-semibold ${getTypeColor(type)}`}>
                  {formatTime(item.seconds ?? item.totalTime ?? 0)}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
