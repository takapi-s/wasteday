import { formatCompactNumber } from '../utils/numberFormat';
import React from 'react';
import type { BaseDashboardData } from '../types/dashboard';

interface DashboardStatsProps {
  data: BaseDashboardData;
  className?: string;
}

export const DashboardStats: React.FC<DashboardStatsProps> = ({
  data,
  className = '',
}) => {
  // 1000ごとにK/M/Bの記号を使った簡易表記
  // 時間は既存フォーマッタを使用し、件数などの大きい値に適用
  
  const formatTime = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  };

  const stats = [
    {
      label: 'Active Time',
      value: formatTime(data.todayActiveSeconds),
      color: 'text-blue-600 dark:text-blue-400',
      bgColor: 'bg-blue-50 dark:bg-blue-900/20',
    },
    {
      label: 'Idle Time',
      value: formatTime(data.todayIdleSeconds),
      color: 'text-gray-600 dark:text-gray-400',
      bgColor: 'bg-gray-50 dark:bg-gray-900/20',
    },
    {
      label: 'Sessions',
      value: formatCompactNumber(data.sessionsCount),
      color: 'text-green-600 dark:text-green-400',
      bgColor: 'bg-green-50 dark:bg-green-900/20',
    },
  ];

  return (
    <div className={`grid grid-cols-1 md:grid-cols-3 gap-4 ${className}`}>
      {stats.map((stat, index) => (
        <div
          key={index}
          className={`${stat.bgColor} rounded-lg p-4 border border-gray-200 dark:border-gray-700`}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                {stat.label}
              </p>
              <p className={`text-2xl font-bold ${stat.color}`}>
                {stat.value}
              </p>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};
