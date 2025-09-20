import React from 'react';
import type { TopItem } from '../../types';
import { formatDuration } from '../../utils';

interface DashboardRankingsProps {
  selectedPeriod: 'today' | 'week' | 'month';
  topIdentifiers: TopItem[];
  topWaste?: TopItem[];
  topProductive?: TopItem[];
}

export const DashboardRankings: React.FC<DashboardRankingsProps> = ({
  selectedPeriod,
  topIdentifiers,
  topWaste,
  topProductive,
}) => {
  // formatDuration is now imported from utils

  // Only show rankings for today
  if (selectedPeriod !== 'today') {
    return null;
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 h-96">
      <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-4">Top Apps (Today)</h3>
      <div className="h-72 overflow-y-auto bg-white dark:bg-gray-800">
        {topWaste || topProductive ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <div>
            <h4 className="text-sm font-medium text-green-500 mb-2">Productive</h4>
            <ul className="space-y-2">
              {(topProductive || []).length === 0 && (
                <li className="text-sm text-gray-500 dark:text-gray-400">No data</li>
              )}
              {(topProductive || []).slice(0,7).map((it, i) => {
                const duration = formatDuration(it.seconds);
                return (
                  <li key={`p-${i}`} className="flex items-center justify-between text-sm">
                    <span className="text-gray-700 dark:text-gray-300">{it.label}</span>
                    <span className="text-gray-900 dark:text-gray-100 font-medium">
                      {duration || <span className="text-gray-400">-</span>}
                    </span>
                  </li>
                );
              })}
            </ul>
          </div>
          <div>
            <h4 className="text-sm font-medium text-red-500 mb-2">Waste</h4>
            <ul className="space-y-2">
              {(topWaste || []).length === 0 && (
                <li className="text-sm text-gray-500 dark:text-gray-400">No data</li>
              )}
              {(topWaste || []).slice(0,7).map((it, i) => {
                const duration = formatDuration(it.seconds);
                return (
                  <li key={`w-${i}`} className="flex items-center justify-between text-sm">
                    <span className="text-gray-700 dark:text-gray-300">{it.label}</span>
                    <span className="text-gray-900 dark:text-gray-100 font-medium">
                      {duration || <span className="text-gray-400">-</span>}
                    </span>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>
      ) : (
        <ul className="space-y-2">
          {topIdentifiers.length === 0 && (
            <li className="text-sm text-gray-500 dark:text-gray-400">No data</li>
          )}
          {topIdentifiers.map((it, i) => {
            const duration = formatDuration(it.seconds);
            return (
              <li key={i} className="flex items-center justify-between text-sm">
                <span className="text-gray-700 dark:text-gray-300">{it.label}</span>
                <span className="text-gray-900 dark:text-gray-100 font-medium">
                  {duration || <span className="text-gray-400">-</span>}
                </span>
              </li>
            );
          })}
        </ul>
        )}
      </div>
    </div>
  );
};
