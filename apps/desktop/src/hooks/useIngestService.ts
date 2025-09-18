import { useEffect, useRef, useState } from 'react';
import { invoke } from "@tauri-apps/api/core";
import { IngestService, type SampleEvent, insertSession, createInsertSessionWithConfig } from "@wasteday/ingest";
import { isEnabled, enable, disable } from "@tauri-apps/plugin-autostart";

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
};

const IDLE_THRESHOLD_SECONDS = Number((import.meta as any).env?.VITE_IDLE_THRESHOLD_SECONDS ?? 60);

export const useIngestService = () => {
  const [currentInfo, setCurrentInfo] = useState<ForegroundInfo & { user_state: 'active' | 'idle', idle_sec: number } | null>(null);
  const [sessionKey, setSessionKey] = useState<string>('');
  const [previousKey, setPreviousKey] = useState<string>('');
  const [liveSession, setLiveSession] = useState<string>('');
  const [events, setEvents] = useState<SessionEvent[]>([]);
  const [samples, setSamples] = useState<SampleData[]>([]);
  const [pendingInserts, setPendingInserts] = useState<Map<string, SampleData>>(new Map());
  const [etaText, setEtaText] = useState<string>('');
  const [autostartEnabled, setAutostartEnabled] = useState<boolean>(false);
  
  const ingestRef = useRef<IngestService | null>(null);
  const lastEventTimeRef = useRef<number>(Date.now());
  const lastEventTypeRef = useRef<'session_started' | 'session_updated' | 'session_ended' | null>(null);
  const currentKeyRef = useRef<string | null>(null);

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

  const sampleOnce = async (): Promise<ForegroundInfo & { user_state: 'active' | 'idle', idle_sec: number }> => {
    const info = await invoke<ForegroundInfo>("get_foreground_info");
    const idleSec = await invoke<number>("get_idle_seconds");
    const user_state: 'active' | 'idle' = idleSec >= IDLE_THRESHOLD_SECONDS ? 'idle' : 'active';
    return { ...info, user_state, idle_sec: idleSec };
  };

  const parseSessionKey = (key: string): { category?: string; identifier?: string; user_state?: string } => {
    const obj: Record<string, string> = {};
    for (const part of key.split(';')) {
      const [k, v] = part.split('=');
      if (k && v) obj[k] = v;
    }
    return { category: obj['category'], identifier: obj['identifier'], user_state: obj['user_state'] };
  };

  useEffect(() => {
    const url = (import.meta as any).env?.VITE_SUPABASE_URL as string | undefined;
    const key = (import.meta as any).env?.VITE_SUPABASE_KEY as string | undefined;
    const insertWithConfig = (url && key) ? createInsertSessionWithConfig({ url, key }) : insertSession;

    const ingest = new IngestService({ samplingIntervalMs: 5000, idleGapThresholdSeconds: 20 });
    ingestRef.current = ingest;

    ingest.onEvent(async (e) => {
      const event: SessionEvent = {
        type: e.type,
        session_key: e.session_key,
        start_time: e.start_time,
        end_time: e.end_time,
        duration_seconds: e.duration_seconds,
        url: e.url,
        window_title: e.window_title,
      };

      setEvents(prev => [event, ...prev.slice(0, 9)]); // Keep last 10 events

      try {
        await insertWithConfig(e);
        if (e.type === 'session_ended') {
          setPendingInserts(prev => {
            const newMap = new Map(prev);
            newMap.delete(e.session_key);
            return newMap;
          });
        }
      } catch (err) {
        console.error('[desktop][insertSession][error]', err);
      }

      lastEventTimeRef.current = Date.now();
      lastEventTypeRef.current = e.type;
      
      if (e.type === 'session_started') {
        setPreviousKey(currentKeyRef.current || '');
        currentKeyRef.current = e.session_key;
      }
      
      setLiveSession(`${e.start_time} → ${e.end_time} (${e.duration_seconds}s)`);
    });

    // Sampling interval
    const interval = setInterval(async () => {
      try {
        const s = await sampleOnce();
        setCurrentInfo(s);
        
        const sample: SampleEvent = {
          timestamp: new Date().toISOString(),
          category: 'app',
          identifier: (s.exe || 'unknown.exe').toLowerCase(),
          window_title: s.window_title,
          user_state: s.user_state,
        };
        
        ingest.handleSample(sample);
        
        const key = `category=${sample.category};identifier=${sample.identifier};user_state=${sample.user_state}`;
        setSessionKey(key);
        
        setSamples(prev => [sample, ...prev.slice(0, 199)]); // Keep last 200 samples
        
        // ETA calculation
        const gapThresholdMs = 20 * 1000;
        const elapsedMs = Date.now() - lastEventTimeRef.current;
        let etaText = '';
        
        if (lastEventTypeRef.current === 'session_updated' || lastEventTypeRef.current === 'session_started') {
          etaText = 'ギャップ条件では挿入されません（連続更新中）。キー変更か終了時に挿入。';
        } else {
          const remain = Math.max(0, Math.ceil((gapThresholdMs - elapsedMs) / 1000));
          etaText = remain > 0 ? `このキーが続けば約 ${remain}s 後にギャップで insert 見込み` : '条件を満たせば直ちに insert 見込み';
        }
        
        if (s.user_state === 'active') {
          const toIdle = Math.max(0, IDLE_THRESHOLD_SECONDS - Math.floor(s.idle_sec));
          etaText += toIdle > 0 ? ` / アイドル切替まで約 ${toIdle}s` : ' / まもなく idle 切替見込み';
        }
        
        setEtaText(etaText);
        
        // Pending inserts
        setPendingInserts(prev => {
          const newMap = new Map(prev);
          newMap.set(key, sample);
          return newMap;
        });
        
      } catch (e) {
        console.error(e);
      }
    }, 5000);

    // Load autostart status
    const loadAutostartStatus = async () => {
      try {
        const enabled = await isEnabled();
        setAutostartEnabled(enabled);
      } catch (e) {
        console.error('Failed to load autostart status:', e);
      }
    };
    
    loadAutostartStatus();

    return () => {
      clearInterval(interval);
      if (ingestRef.current) {
        ingestRef.current = null;
      }
    };
  }, []);

  const toggleAutostart = async () => {
    try {
      if (autostartEnabled) {
        await disable();
        setAutostartEnabled(false);
      } else {
        await enable();
        setAutostartEnabled(true);
      }
    } catch (e) {
      console.error('Failed to toggle autostart:', e);
    }
  };

  return {
    currentInfo,
    sessionKey,
    previousKey,
    liveSession,
    events,
    samples,
    pendingInserts,
    etaText,
    autostartEnabled,
    toggleAutostart,
    colorForIdentifier,
    parseSessionKey,
  };
};

