import { useEffect, useRef, useState } from 'react';
import { SamplingService, type SamplingEvent, getSamplingService } from '../../services/SamplingService';

type SampleData = {
  timestamp: string;
  category: string;
  identifier: string;
  window_title?: string;
  user_state: 'active' | 'idle';
  idle_sec: number;
};

type SessionEvent = {
  type: 'session_started' | 'session_updated' | 'session_ended';
  session_key: string;
  start_time: string;
  end_time: string;
  duration_seconds: number;
  url?: string;
  window_title?: string;
};

export const useSampling = () => {
  const [currentSample, setCurrentSample] = useState<SampleData | null>(null);
  const [samples, setSamples] = useState<SampleData[]>([]);
  const [events, setEvents] = useState<SessionEvent[]>([]);
  const [pendingInserts, setPendingInserts] = useState<Map<string, SampleData>>(new Map());
  const [isRunning, setIsRunning] = useState(false);
  const [lastEventTime, setLastEventTime] = useState<number>(Date.now());
  const [lastEventType, setLastEventType] = useState<'session_started' | 'session_updated' | 'session_ended' | null>(null);
  
  const serviceRef = useRef<SamplingService | null>(null);
  const unsubscribeRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    // サービスインスタンスを取得
    if (!serviceRef.current) {
      serviceRef.current = getSamplingService({
        samplingIntervalMs: 5000,
        idleGapThresholdSeconds: 20,
        idleThresholdSeconds: 60,
      });
    }

    const service = serviceRef.current;

    // イベントリスナーを設定
    const unsubscribe = service.onEvent((event: SamplingEvent) => {
      switch (event.type) {
        case 'sample':
          const sampleData: SampleData = {
            timestamp: event.timestamp,
            category: 'app',
            identifier: event.data.identifier || 'unknown.exe',
            window_title: event.data.window_title,
            user_state: event.data.user_state,
            idle_sec: event.data.idle_sec || 0,
          };
          
          console.log('[useSampling] サンプル受信:', sampleData);
          setCurrentSample(sampleData);
          setSamples(prev => [sampleData, ...prev.slice(0, 199)]); // 最新200件を保持
          break;

        case 'session_started':
        case 'session_updated':
        case 'session_ended':
          const sessionEvent: SessionEvent = {
            type: event.type,
            session_key: event.data.session_key,
            start_time: event.data.start_time,
            end_time: event.data.end_time,
            duration_seconds: event.data.duration_seconds,
            url: event.data.url,
            window_title: event.data.window_title,
          };
          
          console.log('[useSampling] セッションイベント受信:', sessionEvent);
          setEvents(prev => [sessionEvent, ...prev.slice(0, 199)]); // 最新200件を保持
          setLastEventTime(Date.now());
          setLastEventType(event.type);
          
          // セッション終了時にpendingInsertsから削除
          if (event.type === 'session_ended') {
            setPendingInserts(prev => {
              const newMap = new Map(prev);
              newMap.delete(event.data.session_key);
              return newMap;
            });
          }
          break;
      }
    });

    unsubscribeRef.current = unsubscribe;

    // サービスの状態を監視
    const status = service.getStatus();
    setIsRunning(status.isRunning);

    // pendingInsertsとisRunningを定期的に更新
    const updateStatus = () => {
      const pending = service.getPendingInserts();
      setPendingInserts(pending);
      
      const status = service.getStatus();
      setIsRunning(status.isRunning);
    };

    // 初期化時に一度実行
    updateStatus();

    // 5秒ごとに更新
    const statusInterval = setInterval(updateStatus, 5000);

    return () => {
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
        unsubscribeRef.current = null;
      }
      clearInterval(statusInterval);
    };
  }, []);

  const startSampling = () => {
    if (serviceRef.current) {
      serviceRef.current.start();
      setIsRunning(true);
    }
  };

  const stopSampling = () => {
    if (serviceRef.current) {
      serviceRef.current.stop();
      setIsRunning(false);
    }
  };

  const getServiceStatus = () => {
    return serviceRef.current?.getStatus() || null;
  };

  const updateConfig = (config: Partial<{ samplingIntervalMs: number; idleGapThresholdSeconds: number; idleThresholdSeconds: number }>) => {
    if (serviceRef.current) {
      serviceRef.current.updateConfig(config);
    }
  };

  return {
    // 状態
    currentSample,
    samples,
    events,
    pendingInserts,
    isRunning,
    lastEventTime,
    lastEventType,
    
    // 制御関数
    startSampling,
    stopSampling,
    getServiceStatus,
    updateConfig,
  };
};
