import React from 'react';
import { useIngest } from '../context/IngestContext';
import { DataPage as SharedDataPage } from '@wasteday/ui';

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
  );
};
