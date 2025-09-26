import React, { useEffect, useMemo, useRef, useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { useBrowsingData } from '../hooks/data';
import { formatDurationShort } from '../utils/time';

type BarItem = {
  label: string;
  seconds: number;
};

const BarList: React.FC<{ title: string; items: BarItem[] }> = ({ title, items }) => {
  const maxSeconds = useMemo(() => Math.max(1, ...items.map(i => i.seconds)), [items]);

  // ラベルの可変省略に使う、コンテナ幅ベースの動的文字数
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [labelMaxChars, setLabelMaxChars] = useState<number>(50);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const calc = () => {
      const width = el.clientWidth || 0;
      // 時間表示やパディング等の余白分を差し引き
      const reservedPx = 140; // 右側の時間、左右余白、ギャップの概算
      const approxCharWidth = 7; // text-sm前提の概算(px/文字)
      const usable = Math.max(0, width - reservedPx);
      const chars = Math.max(10, Math.floor(usable / approxCharWidth));
      setLabelMaxChars(chars);
    };
    calc();
    const ro = new (window as any).ResizeObserver(calc);
    ro.observe(el);
    return () => {
      try { ro.disconnect(); } catch {}
    };
  }, []);

  const truncateEnd = (text: string, max: number) => {
    if (text.length <= max) return text;
    if (max <= 3) return text.slice(0, Math.max(0, max));
    return text.slice(0, max - 3) + '...';
  };

  const truncateMiddle = (text: string, max: number) => {
    if (text.length <= max) return text;
    if (max <= 3) return text.slice(0, Math.max(0, max));
    const keep = max - 3;
    const head = Math.ceil(keep * 0.6);
    const tail = keep - head;
    return text.slice(0, head) + '...' + text.slice(text.length - tail);
  };

  return (
    <div ref={containerRef} className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
      <h3 className="text-base font-semibold text-gray-800 dark:text-gray-200 mb-3">{title}</h3>
      <div className="flex flex-col gap-3">
        {items.length === 0 && (
          <div className="text-sm text-gray-500 dark:text-gray-400">データがありません</div>
        )}
        {items.map((item, idx) => {
          const widthPercent = Math.min(100, Math.max(4, Math.round((item.seconds / maxSeconds) * 100)));

          const isUrl = /^https?:\/\//i.test(item.label);
          // URLは中央省略、その他は末尾省略。余裕を持って少し小さくする
          const dynamicMax = Math.max(10, isUrl ? Math.floor(labelMaxChars * 0.9) : labelMaxChars);
          const truncatedLabel = isUrl
            ? truncateMiddle(item.label, dynamicMax)
            : truncateEnd(item.label, dynamicMax);

          return (
            <div key={`${title}-${idx}`} className="flex items-center gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1 gap-2">
                  <span 
                    className="text-sm text-gray-700 dark:text-gray-300 truncate flex-1 min-w-0" 
                    title={item.label}
                  >
                    {truncatedLabel}
                  </span>
                  <span className="text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap flex-shrink-0">
                    {formatDurationShort(item.seconds)}
                  </span>
                </div>
                <div className="h-2 bg-gray-100 dark:bg-gray-700 rounded overflow-hidden">
                  <div
                    className="h-2 bg-blue-500 dark:bg-blue-400 rounded"
                    style={{ width: `${widthPercent}%` }}
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export const ActivityPage: React.FC = () => {
  const [tab, setTab] = useState<'window' | 'browser'>('window');

  // ブラウザ（ドメイン/URL）は useBrowsingData から集計
  const { sessions: browsingSessions } = useBrowsingData();
  const browserDomains: BarItem[] = useMemo(() => {
    const map = new Map<string, number>();
    for (const s of browsingSessions) {
      const dur = Math.max(0, s.duration_seconds || 0);
      if (!s.domain) continue;
      map.set(s.domain, (map.get(s.domain) || 0) + dur);
    }
    return Array.from(map.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([label, seconds]) => ({ label, seconds }));
  }, [browsingSessions]);
  const browserUrls: BarItem[] = useMemo(() => {
    const map = new Map<string, number>();
    for (const s of browsingSessions) {
      const dur = Math.max(0, s.duration_seconds || 0);
      if (!s.url) continue;
      map.set(s.url, (map.get(s.url) || 0) + dur);
    }
    return Array.from(map.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([label, seconds]) => ({ label, seconds }));
  }, [browsingSessions]);

  // アプリ（window）はローカルセッションから 'app' カテゴリを集計
  const [windowApps, setWindowApps] = useState<BarItem[]>([]);
  const [windowTitles, setWindowTitles] = useState<BarItem[]>([]); // 取得元が未実装のため当面空
  

  useEffect(() => {
    const fetchAppUsage = async () => {
      try {
        const since = new Date();
        since.setHours(since.getHours() - 24, 0, 0, 0);
        const until = new Date();

        type LocalSession = { id: string; start_time: string; duration_seconds: number; session_key: string };
        const sessions = await invoke<LocalSession[]>('db_get_sessions', {
          query: { since: since.toISOString(), until: until.toISOString() }
        });

        const parseSessionKey = (key: string): { category?: string; identifier?: string; user_state?: string } => {
          const obj: Record<string, string> = {};
          for (const part of String(key || '').split(';')) {
            const [k, v] = part.split('=');
            if (k && v) obj[k] = v;
          }
          return { category: obj['category'], identifier: obj['identifier'], user_state: obj['user_state'] };
        };

        const appMap = new Map<string, number>();
        const titleMap = new Map<string, number>();
        
        for (const s of sessions) {
          const dur = Math.max(0, s.duration_seconds || 0);
          if (dur <= 0) continue;
          const meta = parseSessionKey(s.session_key);
          
          // アプリケーション別集計
          if ((meta.category || '').toLowerCase() === 'app') {
            const id = meta.identifier || 'Unknown Application';
            appMap.set(id, (appMap.get(id) || 0) + dur);
          }
          
          // Window Titles用の集計（appカテゴリでactive状態のみ）
          if ((meta.category || '').toLowerCase() === 'app' && (meta.user_state || '').toLowerCase() === 'active') {
            const id = meta.identifier || 'Unknown Application';
            // アプリ名からWindow Titleを生成（例: wasteday.exe -> WasteDay）
            const title = id.replace(/\.exe$/i, '').replace(/^./, (c) => c.toUpperCase());
            titleMap.set(title, (titleMap.get(title) || 0) + dur);
          }
        }

        const topApps = Array.from(appMap.entries())
          .sort((a, b) => b[1] - a[1])
          .slice(0, 10)
          .map(([label, seconds]) => ({ label, seconds }));

        const topTitles = Array.from(titleMap.entries())
          .sort((a, b) => b[1] - a[1])
          .slice(0, 10)
          .map(([label, seconds]) => ({ label, seconds }));

        setWindowApps(topApps);
        setWindowTitles(topTitles);
        
      } catch (err) {
        console.error('Failed to fetch app usage:', err);
        setWindowApps([]);
        setWindowTitles([]);
        
      }
    };

    fetchAppUsage();
    const interval = setInterval(fetchAppUsage, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="p-4">
      <h1 className="text-2xl font-semibold mb-4 text-gray-800 dark:text-gray-200">Activity</h1>

      {/* Tabs */}
      <div className="mb-4">
        <div className="inline-flex rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
          <button
            className={`px-4 py-2 text-sm font-medium ${
              tab === 'window'
                ? 'bg-blue-600 text-white'
                : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
            }`}
            onClick={() => setTab('window')}
          >
            Window
          </button>
          <button
            className={`px-4 py-2 text-sm font-medium border-l border-gray-200 dark:border-gray-700 ${
              tab === 'browser'
                ? 'bg-blue-600 text-white'
                : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
            }`}
            onClick={() => setTab('browser')}
          >
            Browser
          </button>
        </div>
      </div>

      {/* Content */}
      {tab === 'window' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <BarList title="Top Applications" items={windowApps} />
          <BarList title="Top Window Titles" items={windowTitles} />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <BarList title="Top Browser Domains" items={browserDomains} />
          <BarList title="Top Browser URLs" items={browserUrls} />
        </div>
      )}
    </div>
  );
};


