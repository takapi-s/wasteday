import React from 'react';

export interface DataPageProps {
  currentInfo?: {
    exe: string;
    window_title: string;
    user_state: 'active' | 'idle';
    idle_sec: number;
  } | null;
  sessionKey?: string;
  previousKey?: string;
  liveSession?: string;
  events?: Array<{
    type: 'session_started' | 'session_updated' | 'session_ended';
    session_key: string;
    start_time: string;
    end_time: string;
    duration_seconds: number;
    url?: string;
    window_title?: string;
  }>;
  samples?: Array<{
    timestamp: string;
    category: string;
    identifier: string;
    window_title?: string;
    user_state: 'active' | 'idle';
  }>;
  pendingInserts?: Map<string, {
    timestamp: string;
    category: string;
    identifier: string;
    window_title?: string;
    user_state: 'active' | 'idle';
  }>;
  etaText?: string;
  colorForIdentifier?: (identifier: string) => string;
  parseSessionKey?: (key: string) => { category?: string; identifier?: string; user_state?: string };
}

type Meta = { category?: string; identifier?: string; user_state?: string };

export const DataPage: React.FC<DataPageProps> = ({
  currentInfo,
  sessionKey,
  previousKey,
  liveSession,
  events = [],
  samples = [],
  pendingInserts = new Map(),
  etaText,
  colorForIdentifier = () => '#000000',
  parseSessionKey = ((key: string): Meta => { void key; return {} as Meta; }),
}) => {
  return (
    <div className="space-y-6">
      {/* Current Status */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-4">Now</h2>
          <div className="font-mono text-sm space-y-2">
            <div className="text-gray-900 dark:text-gray-100">
              {currentInfo ? `${currentInfo.exe} | ${currentInfo.window_title} | ${currentInfo.user_state} (idle ${currentInfo.idle_sec}s/${60}s)` : 'Loading...'}
            </div>
            <div className="text-xs text-gray-600 dark:text-gray-400">
              {sessionKey}
            </div>
            <div className="text-xs text-gray-600 dark:text-gray-400">
              {previousKey ? `prev: ${previousKey}` : ''}
            </div>
            <div className="text-xs text-green-600 dark:text-green-400">
              {liveSession}
            </div>
            <div className="text-xs text-gray-600 dark:text-gray-400">
              insert条件: キー変更 or ギャップ &gt; 20秒 or 終了時
            </div>
            <div className="text-xs text-blue-600 dark:text-blue-400">
              {etaText}
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-4">Events</h2>
          <div className="max-h-80 overflow-auto">
            <ul className="space-y-1">
              {events.map((event, index) => {
                const meta = parseSessionKey(event.session_key);
                const idPart = `${meta.identifier ?? '?'}/${meta.user_state ?? '?'}`;
                const extra = event.url ? ` | ${event.url}` : (event.window_title ? ` | ${event.window_title}` : '');
                const time = new Date(event.end_time).toLocaleTimeString();
                
                return (
                  <li
                    key={index}
                    className="border-l-4 pl-2 py-1 text-xs font-mono text-gray-900 dark:text-gray-100"
                    style={{ borderLeftColor: meta.identifier ? colorForIdentifier(meta.identifier) : undefined }}
                  >
                    {time} [{idPart}] {event.type} dur={event.duration_seconds}s{extra}
                  </li>
                );
              })}
            </ul>
          </div>
        </div>
      </div>

      {/* Samples and Pending */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-4">Samples</h2>
          <div className="max-h-80 overflow-auto">
            <ul className="space-y-1">
              {samples.map((sample, index) => (
                <li
                  key={index}
                  className="border-l-4 pl-2 py-1 text-xs font-mono text-gray-900 dark:text-gray-100"
                  style={{ borderLeftColor: colorForIdentifier(sample.identifier) }}
                >
                  {new Date(sample.timestamp).toLocaleTimeString()} {sample.category}:{sample.identifier} {sample.user_state} | {sample.window_title ?? ''}
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-4">Pending Inserts</h2>
          <div className="max-h-80 overflow-auto">
            <ul className="space-y-1">
              {Array.from(pendingInserts.entries()).map(([key, sample], index) => (
                <li
                  key={index}
                  className="border-l-4 pl-2 py-1 text-xs font-mono text-gray-900 dark:text-gray-100"
                  style={{ borderLeftColor: colorForIdentifier(sample.identifier) }}
                >
                  {new Date(sample.timestamp).toLocaleTimeString()} → end? key={key}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};
