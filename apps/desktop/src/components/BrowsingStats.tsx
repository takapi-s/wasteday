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
          <div className="h-4 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="space-y-2">
            <div className="h-3 bg-gray-200 rounded"></div>
            <div className="h-3 bg-gray-200 rounded w-3/4"></div>
            <div className="h-3 bg-gray-200 rounded w-1/2"></div>
          </div>
        </div>
      </div>
    );
  }

  if (dataError || statsError) {
    return (
      <div className={`p-4 ${className}`}>
        <div className="text-red-600">
          <p>エラーが発生しました: {dataError || statsError}</p>
        </div>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className={`p-4 ${className}`}>
        <p className="text-gray-500">ブラウジングデータがありません</p>
      </div>
    );
  }

  return (
    <div className={`p-4 ${className}`}>
      <h3 className="text-lg font-semibold mb-4">ブラウジング統計</h3>
      
      {/* 総計 */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="bg-blue-50 p-4 rounded-lg">
          <div className="text-sm text-blue-600 font-medium">総ブラウジング時間</div>
          <div className="text-2xl font-bold text-blue-900">
            {formatDuration(stats.total_time)}
          </div>
        </div>
        <div className="bg-green-50 p-4 rounded-lg">
          <div className="text-sm text-green-600 font-medium">訪問ドメイン数</div>
          <div className="text-2xl font-bold text-green-900">
            {stats.domain_count}
          </div>
        </div>
      </div>

      {/* トップドメイン */}
      <div className="mb-6">
        <h4 className="text-md font-semibold mb-3">よく訪問するドメイン</h4>
        <div className="space-y-2">
          {stats.top_domains.slice(0, 5).map((domain, index) => (
            <div key={domain.domain} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center space-x-3">
                <span className="text-sm font-medium text-gray-500">#{index + 1}</span>
                <div>
                  <div className="font-medium">{domain.domain}</div>
                  <div className="text-sm text-gray-500">
                    {domain.visit_count}回訪問
                  </div>
                </div>
              </div>
              <div className="text-right">
                <div className="font-semibold">{formatDuration(domain.total_time)}</div>
                <div className="text-sm text-gray-500">
                  {((domain.total_time / stats.total_time) * 100).toFixed(1)}%
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* カテゴリ別統計 */}
      <div>
        <h4 className="text-md font-semibold mb-3">カテゴリ別統計</h4>
        <div className="space-y-2">
          {stats.category_breakdown.map((category, index) => (
            <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center space-x-3">
                <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                <div>
                  <div className="font-medium">
                    {category.category_name || `カテゴリ ${category.category_id || '未分類'}`}
                  </div>
                  <div className="text-sm text-gray-500">
                    {category.domain_count}ドメイン
                  </div>
                </div>
              </div>
              <div className="text-right">
                <div className="font-semibold">{formatDuration(category.total_time)}</div>
                <div className="text-sm text-gray-500">
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
