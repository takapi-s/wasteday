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
      
      {/* Browsing data from Chrome Extension */}
      <div className="mt-8 p-6 bg-white/70 dark:bg-neutral-900/50 backdrop-blur-md rounded-lg shadow-sm border border-gray-200/50 dark:border-white/10">
        <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-neutral-100">
          Browsing data from Chrome Extension
        </h2>
        <BrowsingStats />
      </div>
    </div>
  );
};
