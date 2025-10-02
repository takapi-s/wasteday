import { formatCompactNumber } from '../utils/numberFormat';
import { useEffect } from 'react';
import { useBrowsingData, useBrowsingStats } from '../hooks/data';
import { formatDuration } from '../utils/time';

interface BrowsingStatsProps {
  className?: string;
}

export function BrowsingStats({ className = '' }: BrowsingStatsProps) {
  const { sessions, domains, loading: dataLoading, error: dataError } = useBrowsingData();
  const { stats, loading: statsLoading, error: statsError, calculateStats } = useBrowsingStats();

  useEffect(() => {
    if (sessions.length > 0) {
      calculateStats(sessions, domains);
    }
  }, [sessions, domains, calculateStats]);

  if (dataLoading || statsLoading) {
    return (
      <div className={`p-4 ${className}`}>
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/4 mb-4"></div>
          <div className="space-y-2">
            <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded"></div>
            <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
            <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
          </div>
        </div>
      </div>
    );
  }

  if (dataError || statsError) {
    return (
      <div className={`p-4 ${className}`}>
        <div className="text-red-600 dark:text-red-400">
          <p>Error: {dataError || statsError}</p>
        </div>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className={`p-4 ${className}`}>
        <p className="text-gray-500 dark:text-gray-400">No browsing data</p>
      </div>
    );
  }

  return (
    <div className={`p-4 ${className}`}>
      <h3 className="text-lg font-semibold mb-4 dark:text-neutral-100">Browsing Stats</h3>
      
      {/* Totals */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="p-4 rounded-lg bg-white/70 dark:bg-neutral-900/50 backdrop-blur-md border border-gray-200/50 dark:border-white/10">
          <div className="text-sm text-neutral-600 dark:text-neutral-300 font-medium">Total browsing time</div>
          <div className="text-2xl font-bold text-blue-900 dark:text-blue-100">
            {formatDuration(stats.total_time)}
          </div>
        </div>
        <div className="p-4 rounded-lg bg-white/70 dark:bg-neutral-900/50 backdrop-blur-md border border-gray-200/50 dark:border-white/10">
          <div className="text-sm text-neutral-600 dark:text-neutral-300 font-medium">Visited domains</div>
          <div className="text-2xl font-bold text-green-900 dark:text-green-100">
            {formatCompactNumber(stats.domain_count)}
          </div>
        </div>
      </div>

      {/* Top domains */}
      <div className="mb-6">
        <h4 className="text-md font-semibold mb-3 dark:text-neutral-100">Top domains</h4>
        <div className="space-y-2">
          {stats.top_domains.slice(0, 5).map((domain: { domain: string; total_time: number; visit_count: number; category_id?: number }, index: number) => (
            <div key={domain.domain} className="flex items-center justify-between p-3 bg-white/60 dark:bg-neutral-900/40 backdrop-blur-sm rounded-lg border border-gray-200/50 dark:border-white/10">
              <div className="flex items-center space-x-3">
                <span className="text-sm font-medium text-gray-500 dark:text-gray-400">#{index + 1}</span>
                <div>
                  <div className="font-medium dark:text-neutral-100">{domain.domain}</div>
                  <div className="text-sm text-gray-500 dark:text-gray-400">
                    {domain.visit_count} visits
                  </div>
                </div>
              </div>
              <div className="text-right">
                <div className="font-semibold dark:text-neutral-100">{formatDuration(domain.total_time)}</div>
                <div className="text-sm text-gray-500 dark:text-gray-400">
                  {((domain.total_time / stats.total_time) * 100).toFixed(1)}%
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Category breakdown */}
      <div>
        <h4 className="text-md font-semibold mb-3 dark:text-neutral-100">By category</h4>
        <div className="space-y-2">
          {stats.category_breakdown.map((category: { category_id?: number; category_name?: string; total_time: number; domain_count: number }, index: number) => (
            <div key={index} className="flex items-center justify-between p-3 bg-white/60 dark:bg-neutral-900/40 backdrop-blur-sm rounded-lg border border-gray-200/50 dark:border-white/10">
              <div className="flex items-center space-x-3">
                <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                <div>
                  <div className="font-medium dark:text-neutral-100">
                    {category.category_name || `Category ${category.category_id || 'Uncategorized'}`}
                  </div>
                  <div className="text-sm text-gray-500 dark:text-gray-400">
                    {category.domain_count} domains
                  </div>
                </div>
              </div>
              <div className="text-right">
                <div className="font-semibold dark:text-neutral-100">{formatDuration(category.total_time)}</div>
                <div className="text-sm text-gray-500 dark:text-gray-400">
                  {((category.total_time / stats.total_time) * 100).toFixed(1)}%
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
