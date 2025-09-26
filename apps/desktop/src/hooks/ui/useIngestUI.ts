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

  // ETA計算
  const etaText = useMemo(() => {
    const gapThresholdMs = 20 * 1000;
    const elapsedMs = Date.now() - sampling.lastEventTime;
    
    if (sampling.lastEventType === 'session_updated' || sampling.lastEventType === 'session_started') {
      return 'ギャップ条件では挿入されません（連続更新中）。キー変更か終了時に挿入。';
    } else {
      const remain = Math.max(0, Math.ceil((gapThresholdMs - elapsedMs) / 1000));
      return remain > 0 ? `このキーが続けば約 ${remain}s 後にギャップで insert 見込み` : '条件を満たせば直ちに insert 見込み';
    }
  }, [sampling.lastEventTime, sampling.lastEventType]);

  // アイドル状態のETA
  const idleEtaText = useMemo(() => {
    if (sampling.currentSample?.user_state === 'active') {
      const toIdle = Math.max(0, 60 - Math.floor(sampling.currentSample.idle_sec));
      return toIdle > 0 ? ` / アイドル切替まで約 ${toIdle}s` : ' / まもなく idle 切替見込み';
    }
    return '';
  }, [sampling.currentSample]);

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
    etaText: etaText + idleEtaText,
    stats,
    
    // ユーティリティ関数
    parseSessionKey,
    colorForIdentifier,
    
    // 制御関数
    updateSessionKey,
    updateLiveSession,
  };
};
