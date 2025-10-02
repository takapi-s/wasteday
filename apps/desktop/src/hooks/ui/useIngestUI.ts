import { useState, useMemo } from 'react';
import { useSampling } from './useSampling';

type SessionKey = {
  category?: string;
  identifier?: string;
  user_state?: string;
};

export const useIngestUI = () => {
  const sampling = useSampling();
  const [sessionKey, setSessionKey] = useState<string>('');
  const [previousKey, setPreviousKey] = useState<string>('');
  const [liveSession, setLiveSession] = useState<string>('');

  // セッションキーの解析
  const parseSessionKey = (key: string): SessionKey => {
    const obj: Record<string, string> = {};
    for (const part of key.split(';')) {
      const [k, v] = part.split('=');
      if (k && v) obj[k] = v;
    }
    return { 
      category: obj['category'], 
      identifier: obj['identifier'], 
      user_state: obj['user_state'] 
    };
  };

  // 識別子の色を生成
  const colorForIdentifier = (identifier: string): string => {
    let hash = 0;
    for (let i = 0; i < identifier.length; i++) {
      hash = ((hash << 5) - hash) + identifier.charCodeAt(i);
      hash |= 0;
    }
    const hue = Math.abs(hash) % 360;
    const sat = 65;
    const light = 50;
    return `hsl(${hue} ${sat}% ${light}%)`;
  };

  // 現在のセッションキーを更新
  const updateSessionKey = (newKey: string) => {
    if (newKey !== sessionKey) {
      setPreviousKey(sessionKey);
      setSessionKey(newKey);
    }
  };

  // ライブセッション表示を更新
  const updateLiveSession = (event: any) => {
    if (event) {
      const display = `${event.start_time} → ${event.end_time} (${event.duration_seconds}s)`;
      setLiveSession(display);
    }
  };

  // Suppress ETA strings in UI (requested)

  // 現在のセッション情報を更新
  const updateCurrentSession = () => {
    if (sampling.currentSample) {
      const key = `category=${sampling.currentSample.category};identifier=${sampling.currentSample.identifier};user_state=${sampling.currentSample.user_state}`;
      updateSessionKey(key);
    }

    // 最新のイベントでライブセッションを更新
    if (sampling.events.length > 0) {
      updateLiveSession(sampling.events[0]);
    }
  };

  // サンプリングデータが更新されたときにセッション情報を更新
  useMemo(() => {
    updateCurrentSession();
  }, [sampling.currentSample, sampling.events]);

  // 統計情報
  const stats = useMemo(() => {
    const totalSamples = sampling.samples.length;
    const activeSamples = sampling.samples.filter(s => s.user_state === 'active').length;
    const idleSamples = totalSamples - activeSamples;
    
    return {
      totalSamples,
      activeSamples,
      idleSamples,
      activePercentage: totalSamples > 0 ? (activeSamples / totalSamples * 100).toFixed(1) : '0',
    };
  }, [sampling.samples]);

  return {
    // サンプリングデータ
    ...sampling,
    
    // UI状態
    sessionKey,
    previousKey,
    liveSession,
    
    // 計算された値
    etaText: '',
    stats,
    
    // ユーティリティ関数
    parseSessionKey,
    colorForIdentifier,
    
    // 制御関数
    updateSessionKey,
    updateLiveSession,
  };
};
