import React, { createContext, useContext, useEffect, useState } from 'react';
import { invoke } from "@tauri-apps/api/core";
import { isEnabled, enable, disable } from "@tauri-apps/plugin-autostart";
import { useIngestUI } from '../hooks/ui';
import { getSamplingService } from '../services/SamplingService';

type ForegroundInfo = {
  process_id: number;
  exe: string;
  window_title: string;
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

type SampleData = {
  timestamp: string;
  category: string;
  identifier: string;
  window_title?: string;
  user_state: 'active' | 'idle';
  idle_sec: number;
};

type IngestContextValue = {
  // サンプリングデータ
  currentInfo: (ForegroundInfo & { user_state: 'active' | 'idle', idle_sec: number }) | null;
  sessionKey: string;
  previousKey: string;
  liveSession: string;
  events: SessionEvent[];
  samples: SampleData[];
  pendingInserts: Map<string, SampleData>;
  etaText: string;
  
  // 自動起動設定
  autostartEnabled: boolean;
  toggleAutostart: () => Promise<void>;
  
  // 設定更新関数
  updateGapThreshold: (gapThreshold: number) => void;
  
  // ユーティリティ関数
  colorForIdentifier: (identifier: string) => string;
  parseSessionKey: (key: string) => { category?: string; identifier?: string; user_state?: string };
  
  // 制御関数
  startSampling: () => void;
  stopSampling: () => void;
  isRunning: boolean;
};

const IngestContext = createContext<IngestContextValue | undefined>(undefined);

export const IngestProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const ingestUI = useIngestUI();
  const [autostartEnabled, setAutostartEnabled] = useState<boolean>(false);
  const [processedEvents, setProcessedEvents] = useState<Set<string>>(new Set());

  // 自動起動設定の管理
  const toggleAutostart = async () => {
    try {
      if (autostartEnabled) {
        await disable();
        setAutostartEnabled(false);
      } else {
        await enable();
        setAutostartEnabled(true);
      }
    } catch (error) {
      console.error('自動起動設定の変更に失敗しました:', error);
    }
  };

  // 自動起動状態の初期化とサンプリング開始
  useEffect(() => {
    const initAutostartStatus = async () => {
      try {
        const enabled = await isEnabled();
        setAutostartEnabled(enabled);
      } catch (error) {
        console.error('自動起動状態の取得に失敗しました:', error);
      }
    };
    initAutostartStatus();

    // サンプリングを自動開始
    console.log('[IngestContext] サンプリングを自動開始');
    ingestUI.startSampling();
  }, []);

  // Gap Threshold設定の更新
  const updateGapThreshold = (gapThreshold: number) => {
    try {
      const samplingService = getSamplingService();
      samplingService.updateConfig({ idleGapThresholdSeconds: gapThreshold });
      console.log('[IngestContext] Gap Threshold updated:', gapThreshold);
    } catch (error) {
      console.error('[IngestContext] Failed to update gap threshold:', error);
    }
  };

  // セッション終了時のローカルDB保存処理
  useEffect(() => {
    const handleSessionEnd = async (event: SessionEvent) => {
      if (event.type === 'session_ended' && event.duration_seconds > 0) {
        try {
          const id = `${event.start_time}-${event.session_key}`;
          const session = { 
            id, 
            start_time: event.start_time, 
            duration_seconds: event.duration_seconds, 
            session_key: event.session_key 
          };
          await invoke('db_upsert_session', { session });
          console.log('[IngestContext] セッションをローカルDBに保存:', session);
        } catch (err) {
          console.error('[IngestContext] ローカルDB保存エラー:', err);
        }
      }
    };

    // 新しく追加されたセッション終了イベントのみを処理（重複防止）
    const sessionEndEvents = ingestUI.events.filter(event => 
      event.type === 'session_ended' && 
      !processedEvents.has(`${event.start_time}-${event.session_key}`)
    );
    
    console.log(`[IngestContext] 処理対象のセッション終了イベント数: ${sessionEndEvents.length}`);
    console.log(`[IngestContext] 総イベント数: ${ingestUI.events.length}, 処理済みイベント数: ${processedEvents.size}`);
    
    sessionEndEvents.forEach(event => {
      const eventKey = `${event.start_time}-${event.session_key}`;
      console.log(`[IngestContext] セッション終了イベントを処理中:`, {
        eventKey,
        duration: event.duration_seconds,
        sessionKey: event.session_key
      });
      handleSessionEnd(event);
      setProcessedEvents(prev => new Set([...prev, eventKey]));
    });
  }, [ingestUI.events, processedEvents]);

  // コンテキスト値の構築
  const contextValue: IngestContextValue = {
    // サンプリングデータ
    currentInfo: ingestUI.currentSample ? {
      process_id: 0, // SamplingServiceからは取得していないので0
      exe: ingestUI.currentSample.identifier,
      window_title: ingestUI.currentSample.window_title || '',
      user_state: ingestUI.currentSample.user_state,
      idle_sec: ingestUI.currentSample.idle_sec,
    } : null,
    sessionKey: ingestUI.sessionKey,
    previousKey: ingestUI.previousKey,
    liveSession: ingestUI.liveSession,
    events: ingestUI.events,
    samples: ingestUI.samples,
    pendingInserts: ingestUI.pendingInserts,
    etaText: ingestUI.etaText,
    
    // 自動起動設定
    autostartEnabled,
    toggleAutostart,
    
    // 設定更新関数
    updateGapThreshold,
    
    // ユーティリティ関数
    colorForIdentifier: ingestUI.colorForIdentifier,
    parseSessionKey: ingestUI.parseSessionKey,
    
    // 制御関数
    startSampling: ingestUI.startSampling,
    stopSampling: ingestUI.stopSampling,
    isRunning: ingestUI.isRunning,
  };

  return (
    <IngestContext.Provider value={contextValue}>
      {children}
    </IngestContext.Provider>
  );
};

export const useIngest = (): IngestContextValue => {
  const context = useContext(IngestContext);
  if (context === undefined) {
    throw new Error('useIngest must be used within an IngestProvider');
  }
  return context;
};