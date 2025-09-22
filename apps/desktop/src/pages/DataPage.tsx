import React from 'react';
import { useIngest } from '../context/IngestContext';
import { DataPage as SharedDataPage } from '@wasteday/ui';
import { BrowsingStats } from '../components/BrowsingStats';

export const DataPage: React.FC = () => {
  const {
    currentInfo,
    sessionKey,
    previousKey,
    liveSession,
    events,
    samples,
    pendingInserts,
    etaText,
    colorForIdentifier,
    parseSessionKey,
  } = useIngest();

  return (
    <div>
      <SharedDataPage
        currentInfo={currentInfo}
        sessionKey={sessionKey}
        previousKey={previousKey}
        liveSession={liveSession}
        events={events}
        samples={samples}
        pendingInserts={pendingInserts}
        etaText={etaText}
        colorForIdentifier={colorForIdentifier}
        parseSessionKey={parseSessionKey}
      />
      
      {/* ブラウジングデータセクション */}
      <div className="mt-8 p-6 bg-white dark:bg-gray-800 rounded-lg shadow">
        <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">
          Chrome拡張機能からのブラウジングデータ
        </h2>
        <BrowsingStats />
      </div>
    </div>
  );
};
