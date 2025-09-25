import React, { useState, useMemo, useCallback } from 'react';
import { DashboardPage as SharedDashboard } from '@wasteday/ui';
import { useLocalDbData } from '../hooks/useLocalDbData';
import { useExtensionData } from '../hooks/useExtensionData';
import { useDatabaseStatus } from '../hooks/useDatabaseStatus';
import { useLocalWeeklyData } from '../hooks/useLocalWeeklyData';
import { useLocalMonthlyData } from '../hooks/useLocalMonthlyData';
import { useWeeklyCalendarData } from '../hooks/useWeeklyCalendarData';

type DataSource = 'desktop' | 'extension';

export const UnifiedDashboardPage: React.FC = () => {
  const [dataSource, setDataSource] = useState<DataSource>('desktop');
  
  // メモ化されたオプション
  const queryOptions = useMemo(() => ({
    rangeHours: 24,
    binMinutes: 10,
  }), []);

  // デスクトップアプリのデータ（遅延読み込み）
  const desktopData = useLocalDbData(queryOptions);
  
  // Chrome拡張機能のデータ（遅延読み込み）
  const extensionData = useExtensionData(queryOptions);

  const { connected, loading: dbLoading, error: dbError } = useDatabaseStatus();
  const [weekOffset, setWeekOffset] = React.useState(0);
  const [monthOffset, setMonthOffset] = React.useState(0);
  const [selectedPeriod, setSelectedPeriod] = React.useState<'today' | 'week' | 'month'>('today');
  
  // 選択された期間に応じて必要なデータのみを取得
  const shouldFetchWeekly = selectedPeriod === 'week';
  const shouldFetchMonthly = selectedPeriod === 'month';
  
  const { weeklyData } = useLocalWeeklyData(shouldFetchWeekly ? weekOffset : undefined);
  const { monthlyData } = useLocalMonthlyData(shouldFetchMonthly ? monthOffset : undefined);
  const { weeklyData: weeklyCalendarData } = useWeeklyCalendarData(shouldFetchWeekly ? weekOffset : undefined);

  // 現在選択されているデータソースのデータを取得（メモ化）
  const currentData = useMemo(() => 
    dataSource === 'desktop' ? desktopData : extensionData,
    [dataSource, desktopData, extensionData]
  );

  // データソース切り替えのハンドラー（メモ化）
  const handleDataSourceChange = useCallback((source: DataSource) => {
    setDataSource(source);
  }, []);

  return (
    <div className="space-y-6">
      {/* データソース切り替えタブ */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
        <div className="border-b border-gray-200 dark:border-gray-700">
          <nav className="-mb-px flex space-x-8 px-6" aria-label="Tabs">
            <button
              onClick={() => handleDataSourceChange('desktop')}
              disabled={desktopData.loading}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                dataSource === 'desktop'
                  ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
              } ${desktopData.loading ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              <div className="flex items-center space-x-2">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                <span>デスクトップアプリ</span>
                {desktopData.loading && (
                  <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                )}
              </div>
            </button>
            <button
              onClick={() => handleDataSourceChange('extension')}
              disabled={extensionData.loading}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                dataSource === 'extension'
                  ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
              } ${extensionData.loading ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              <div className="flex items-center space-x-2">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9v-9m0-9v9" />
                </svg>
                <span>Chrome拡張機能</span>
                {extensionData.loading && (
                  <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                )}
              </div>
            </button>
          </nav>
        </div>
        
        {/* データソース情報 */}
        <div className="px-6 py-4 bg-gray-50 dark:bg-gray-700">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <div className={`w-2 h-2 rounded-full ${
                  dataSource === 'desktop' 
                    ? (desktopData.error ? 'bg-red-500' : desktopData.loading ? 'bg-yellow-500' : 'bg-green-500')
                    : (extensionData.error ? 'bg-red-500' : extensionData.loading ? 'bg-yellow-500' : 'bg-green-500')
                }`}></div>
                <span className="text-sm text-gray-600 dark:text-gray-300">
                  {dataSource === 'desktop' ? 'デスクトップアプリ' : 'Chrome拡張機能'}のデータ
                </span>
                {currentData.loading && (
                  <span className="text-sm text-blue-600 dark:text-blue-400">
                    読み込み中...
                  </span>
                )}
              </div>
              {currentData.error && (
                <span className="text-sm text-red-600 dark:text-red-400">
                  エラー: {currentData.error}
                </span>
              )}
            </div>
            <div className="text-sm text-gray-500 dark:text-gray-400">
              {dataSource === 'desktop' 
                ? 'アプリケーションの使用状況を追跡'
                : 'ブラウジング活動を追跡'
              }
            </div>
          </div>
        </div>
      </div>

      {/* 統合ダッシュボード */}
      <SharedDashboard
        // 基本データ
        todayActiveSeconds={currentData.todayActiveSeconds}
        todayIdleSeconds={currentData.todayIdleSeconds}
        sessionsCount={currentData.sessionsCount}
        last24hSeries={(currentData.last24hSeries && currentData.last24hSeries.length > 0)
          ? currentData.last24hSeries
          : [{ timestamp: new Date().toISOString(), activeSeconds: 0, idleSeconds: 0 }]}
        topIdentifiers={currentData.topIdentifiers}
        topWaste={currentData.topWaste}
        topProductive={currentData.topProductive}
        
        // データベース状態
        databaseConnected={connected}
        databaseLoading={dbLoading}
        databaseError={dbError}
        
        // クエリオプション
        rangeHours={queryOptions.rangeHours}
        binMinutes={queryOptions.binMinutes}
        
        // 期間データ
        weeklyData={weeklyData || undefined}
        weeklyCalendarData={weeklyCalendarData || undefined}
        monthlyData={monthlyData || undefined}
        
        // 制御された期間オフセット
        currentWeekOffset={weekOffset}
        onChangeWeekOffset={setWeekOffset}
        currentMonthOffset={monthOffset}
        onChangeMonthOffset={setMonthOffset}
        
        // 制御された選択期間
        selectedPeriod={selectedPeriod}
        onChangeSelectedPeriod={setSelectedPeriod}
      />
    </div>
  );
};
