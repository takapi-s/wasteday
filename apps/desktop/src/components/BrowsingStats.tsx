import { useEffect } from 'react';
import { useBrowsingData, useBrowsingStats } from '../hooks/useBrowsingData';
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
          <p>エラーが発生しました: {dataError || statsError}</p>
        </div>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className={`p-4 ${className}`}>
        <p className="text-gray-500 dark:text-gray-400">ブラウジングデータがありません</p>
      </div>
    );
  }

  return (
    <div className={`p-4 ${className}`}>
      <h3 className="text-lg font-semibold mb-4 dark:text-white">ブラウジング統計</h3>
      
      {/* 総計 */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="p-4 rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
          <div className="text-sm text-blue-600 dark:text-blue-400 font-medium">総ブラウジング時間</div>
          <div className="text-2xl font-bold text-blue-900 dark:text-blue-100">
            {formatDuration(stats.total_time)}
          </div>
        </div>
        <div className="p-4 rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
          <div className="text-sm text-green-600 dark:text-green-400 font-medium">訪問ドメイン数</div>
          <div className="text-2xl font-bold text-green-900 dark:text-green-100">
            {stats.domain_count}
          </div>
        </div>
      </div>

      {/* トップドメイン */}
      <div className="mb-6">
        <h4 className="text-md font-semibold mb-3 dark:text-white">よく訪問するドメイン</h4>
        <div className="space-y-2">
          {stats.top_domains.slice(0, 5).map((domain, index) => (
            <div key={domain.domain} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg border border-transparent dark:border-gray-700">
              <div className="flex items-center space-x-3">
                <span className="text-sm font-medium text-gray-500 dark:text-gray-400">#{index + 1}</span>
                <div>
                  <div className="font-medium dark:text-gray-100">{domain.domain}</div>
                  <div className="text-sm text-gray-500 dark:text-gray-400">
                    {domain.visit_count}回訪問
                  </div>
                </div>
              </div>
              <div className="text-right">
                <div className="font-semibold dark:text-gray-100">{formatDuration(domain.total_time)}</div>
                <div className="text-sm text-gray-500 dark:text-gray-400">
                  {((domain.total_time / stats.total_time) * 100).toFixed(1)}%
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* カテゴリ別統計 */}
      <div>
        <h4 className="text-md font-semibold mb-3 dark:text-white">カテゴリ別統計</h4>
        <div className="space-y-2">
          {stats.category_breakdown.map((category, index) => (
            <div key={index} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg border border-transparent dark:border-gray-700">
              <div className="flex items-center space-x-3">
                <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                <div>
                  <div className="font-medium dark:text-gray-100">
                    {category.category_name || `カテゴリ ${category.category_id || '未分類'}`}
                  </div>
                  <div className="text-sm text-gray-500 dark:text-gray-400">
                    {category.domain_count}ドメイン
                  </div>
                </div>
              </div>
              <div className="text-right">
                <div className="font-semibold dark:text-gray-100">{formatDuration(category.total_time)}</div>
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
