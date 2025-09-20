import React from 'react';
import { useIngest } from '../context/IngestContext';

export const SamplingStatus: React.FC = () => {
  const ingest = useIngest();

  return (
    <div className="p-4 border rounded-lg bg-gray-50 dark:bg-gray-800">
      <h3 className="text-lg font-semibold mb-4">サンプリング状態</h3>
      
      <div className="grid grid-cols-2 gap-4">
        <div>
          <h4 className="font-medium text-sm text-gray-600 dark:text-gray-400">状態</h4>
          <p className={`text-sm ${ingest.isRunning ? 'text-green-600' : 'text-red-600'}`}>
            {ingest.isRunning ? '実行中' : '停止中'}
          </p>
        </div>
        
        <div>
          <h4 className="font-medium text-sm text-gray-600 dark:text-gray-400">現在のアプリ</h4>
          <p className="text-sm truncate">
            {ingest.currentInfo?.exe || 'なし'}
          </p>
        </div>
        
        <div>
          <h4 className="font-medium text-sm text-gray-600 dark:text-gray-400">ユーザー状態</h4>
          <p className={`text-sm ${ingest.currentInfo?.user_state === 'active' ? 'text-blue-600' : 'text-orange-600'}`}>
            {ingest.currentInfo?.user_state === 'active' ? 'アクティブ' : 'アイドル'}
          </p>
        </div>
        
        <div>
          <h4 className="font-medium text-sm text-gray-600 dark:text-gray-400">アイドル時間</h4>
          <p className="text-sm">
            {ingest.currentInfo?.idle_sec || 0}秒
          </p>
        </div>
      </div>
      
      <div className="mt-4">
        <h4 className="font-medium text-sm text-gray-600 dark:text-gray-400 mb-2">セッションキー</h4>
        <p className="text-xs font-mono bg-gray-100 dark:bg-gray-700 p-2 rounded break-all">
          {ingest.sessionKey || 'なし'}
        </p>
      </div>
      
      <div className="mt-4">
        <h4 className="font-medium text-sm text-gray-600 dark:text-gray-400 mb-2">ETA情報</h4>
        <p className="text-xs text-gray-600 dark:text-gray-400">
          {ingest.etaText || 'なし'}
        </p>
      </div>
      
      <div className="mt-4 flex gap-2">
        <button
          onClick={ingest.startSampling}
          disabled={ingest.isRunning}
          className="px-3 py-1 bg-green-600 text-white text-sm rounded disabled:opacity-50 disabled:cursor-not-allowed"
        >
          開始
        </button>
        <button
          onClick={ingest.stopSampling}
          disabled={!ingest.isRunning}
          className="px-3 py-1 bg-red-600 text-white text-sm rounded disabled:opacity-50 disabled:cursor-not-allowed"
        >
          停止
        </button>
      </div>
      
      <div className="mt-4">
        <h4 className="font-medium text-sm text-gray-600 dark:text-gray-400 mb-2">統計</h4>
        <div className="text-xs text-gray-600 dark:text-gray-400">
          <p>サンプル数: {ingest.samples.length}</p>
          <p>イベント数: {ingest.events.length}</p>
        </div>
      </div>
    </div>
  );
};
